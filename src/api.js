// The cabinet API. Every query is scoped to the signed-in user; another user's business answers 404, never 403.
import { chat, onboard, runTask } from './brain.js';
import { publish, siteStats } from './site.js';
import { checkName, DEFAULT_CAPS, fitsCap, HOLD_MS, KINDS, monthStart, SPEND, workHash } from './policy.js';

const id = () => crypto.randomUUID();
export const json = (status, body, extra = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra } });
const err = (status, code) => json(status, { error: code });
const str = (v, max) => String(v ?? '').trim().slice(0, max);

async function own(env, uid, bid) {
  return env.DB.prepare('SELECT * FROM businesses WHERE id = ? AND user_id = ?').bind(bid, uid).first();
}
async function audit(env, bid, uid, action, detail, now) {
  return env.DB.prepare('INSERT INTO audit (business_id, user_id, action, detail, at) VALUES (?, ?, ?, ?, ?)').bind(bid, uid, action, detail, now).run();
}
async function caps(env, bid) {
  const rows = (await env.DB.prepare('SELECT kind, monthly_usd FROM caps WHERE business_id = ?').bind(bid).all()).results;
  return Object.fromEntries(SPEND.map((k) => [k, rows.find((r) => r.kind === k)?.monthly_usd ?? DEFAULT_CAPS[k]]));
}
async function spent(env, bid, now) {
  const rows = (await env.DB.prepare('SELECT kind, SUM(cost_usd) AS s FROM meter WHERE business_id = ? AND at >= ? GROUP BY kind').bind(bid, monthStart(now)).all()).results;
  return Object.fromEntries(SPEND.map((k) => [k, rows.find((r) => r.kind === k)?.s ?? 0]));
}

export async function api(req, env, url, me, now = Date.now()) {
  const p = url.pathname, m = req.method;
  // A change must come from this site's own page: blocks cross-site form posts even if a cookie rides along.
  if (m !== 'GET' && m !== 'HEAD') {
    if (req.headers.get('origin') !== url.origin) return err(403, 'bad_origin');
    if (!(req.headers.get('content-type') || '').startsWith('application/json')) return err(415, 'json_only');
  }
  const body = m === 'POST' || m === 'PUT' || m === 'DELETE' ? await req.json().catch(() => ({})) : {};

  if (p === '/api/me' && m === 'GET') {
    const list = (await env.DB.prepare('SELECT id, name, one_liner, status FROM businesses WHERE user_id = ? ORDER BY created').bind(me.id).all()).results;
    return json(200, { user: me, businesses: list });
  }
  if (p === '/api/onboard' && m === 'POST') {
    const idea = str(body.idea, 500);
    if (idea.length < 8) return err(400, 'idea_short');
    const count = await env.DB.prepare('SELECT COUNT(*) AS c FROM businesses WHERE user_id = ?').bind(me.id).first();
    if (count.c >= 3) return err(400, 'limit_reached');
    const d = await onboard(env, idea);
    let base = body.name ? checkName(body.name) : checkName(d.name);
    if (base.error && body.name) return err(400, base.error);
    if (body.name) {
      const taken = await env.DB.prepare('SELECT 1 FROM businesses WHERE name = ?').bind(base.name).first();
      const held = await env.DB.prepare('SELECT until FROM name_holds WHERE name = ?').bind(base.name).first();
      if (taken) return err(409, 'name_taken');
      if (held && held.until > now) return err(409, 'name_held');
    }
    if (base.error) base = { name: 'biz-' + crypto.randomUUID().slice(0, 6) };
    const bid = id();
    let name = '';
    for (const n of [base.name, ...[2, 3, 4, 5, 6, 7, 8, 9].map((i) => `${base.name.slice(0, 28)}-${i}`)]) {
      const hold = await env.DB.prepare('SELECT until FROM name_holds WHERE name = ?').bind(n).first();
      if (hold && hold.until > now) continue;
      try {
        await env.DB.prepare('INSERT INTO businesses (id, user_id, name, one_liner, north_star, vision, idea, status, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .bind(bid, me.id, n, d.one_liner, d.north_star, d.vision, idea, 'paused', now).run();
        name = n; break;
      } catch { /* taken: try the next */ }
    }
    if (!name) return err(409, 'name_taken');
    const stmts = [];
    for (const [i, t] of d.tasks.entries()) {
      const w = { id: id(), business_id: bid, ...t };
      w.hash = await workHash(w);
      stmts.push(env.DB.prepare('INSERT INTO work_items (id, business_id, kind, title, body, spend_kind, cost_usd, status, hash, created, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(w.id, bid, w.kind, w.title, w.body, w.spend_kind, w.cost_usd, 'proposed', w.hash, now + i, 'founder'));
    }
    stmts.push(env.DB.prepare('INSERT INTO drafts (business_id, data, offline, updated) VALUES (?, ?, ?, ?)').bind(bid, JSON.stringify(d.landing), d.offline ? 1 : 0, now));
    stmts.push(env.DB.prepare('INSERT INTO messages (business_id, role, content, at) VALUES (?, ?, ?, ?)').bind(bid, 'assistant',
      `Hello! I made a first plan for ${name}: a short description, a simple web page and ${d.tasks.length} first jobs.${d.offline ? ' This is a ready-made starter plan.' : ''} Nothing happens until you say yes to a job and press Start. You can ask me anything here.`, now));
    await env.DB.batch(stmts);
    await audit(env, bid, me.id, 'created', `From "${idea.slice(0, 120)}". Nothing happens until you press Start.`, now);
    return json(201, { id: bid, name, offline: d.offline });
  }
  if (p === '/api/businesses' && m === 'POST') {
    const n = checkName(body.name); if (n.error) return err(400, n.error);
    const count = await env.DB.prepare('SELECT COUNT(*) AS c FROM businesses WHERE user_id = ?').bind(me.id).first();
    if (count.c >= 3) return err(400, 'limit_reached');
    const hold = await env.DB.prepare('SELECT until FROM name_holds WHERE name = ?').bind(n.name).first();
    if (hold && hold.until > now) return err(409, 'name_held');
    const bid = id();
    try {
      await env.DB.prepare('INSERT INTO businesses (id, user_id, name, one_liner, north_star, status, created) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(bid, me.id, n.name, str(body.one_liner, 160), str(body.north_star, 80), 'paused', now).run();
    } catch { return err(409, 'name_taken'); }
    await audit(env, bid, me.id, 'created', `Made ${n.name}. Nothing happens until you press Start.`, now);
    return json(201, { id: bid, name: n.name });
  }

  let r = p.match(/^\/api\/businesses\/([\w-]+)(\/[a-z]+)?$/);
  if (r) {
    const b = await own(env, me.id, r[1]); if (!b) return err(404, 'not_found');
    const sub = r[2] || '';
    if (!sub && m === 'GET') {
      const work = (await env.DB.prepare('SELECT * FROM work_items WHERE business_id = ? ORDER BY created DESC LIMIT 100').bind(b.id).all()).results;
      const log = (await env.DB.prepare('SELECT action, detail, at FROM audit WHERE business_id = ? ORDER BY at DESC LIMIT 100').bind(b.id).all()).results;
      const draft = await env.DB.prepare('SELECT data, offline FROM drafts WHERE business_id = ?').bind(b.id).first();
      const msgs = (await env.DB.prepare('SELECT role, content, at FROM messages WHERE business_id = ? ORDER BY at DESC LIMIT 60').bind(b.id).all()).results.reverse();
      return json(200, { business: b, caps: await caps(env, b.id), spent: await spent(env, b.id, now), work, audit: log, revenue: 0, gel: null, site: await siteStats(env, b.id, now),
        draft: draft ? { ...JSON.parse(draft.data), offline: Boolean(draft.offline) } : null, messages: msgs });
    }
    if (sub === '/chat' && m === 'POST') {
      const text = str(body.text, 1000); if (!text) return err(400, 'empty');
      const tasks = (await env.DB.prepare('SELECT title, status FROM work_items WHERE business_id = ? ORDER BY created DESC LIMIT 15').bind(b.id).all()).results;
      const hist = (await env.DB.prepare('SELECT role, content FROM messages WHERE business_id = ? ORDER BY at DESC LIMIT 10').bind(b.id).all()).results.reverse();
      const out = await chat(env, b, tasks, hist, text);
      const stmts = [env.DB.prepare('INSERT INTO messages (business_id, role, content, at) VALUES (?, ?, ?, ?)').bind(b.id, 'user', text, now),
        env.DB.prepare('INSERT INTO messages (business_id, role, content, at) VALUES (?, ?, ?, ?)').bind(b.id, 'assistant', out.reply, now + 1)];
      let proposed = null;
      if (out.propose) {
        proposed = { id: id(), business_id: b.id, ...out.propose }; proposed.hash = await workHash(proposed);
        stmts.push(env.DB.prepare('INSERT INTO work_items (id, business_id, kind, title, body, spend_kind, cost_usd, status, hash, created, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .bind(proposed.id, b.id, proposed.kind, proposed.title, proposed.body, proposed.spend_kind, proposed.cost_usd, 'proposed', proposed.hash, now + 2, 'chat'));
      }
      await env.DB.batch(stmts);
      if (proposed) await audit(env, b.id, me.id, 'proposed', `${proposed.title} (from chat, up to $${proposed.cost_usd})`, now);
      return json(200, { reply: out.reply, proposed, offline: out.offline });
    }
    if ((sub === '/stop' || sub === '/start') && m === 'POST') {
      const status = sub === '/stop' ? 'stopped' : 'active';
      if (status === 'active' && !b.north_star) return err(400, 'north_star_missing');
      await env.DB.prepare('UPDATE businesses SET status = ? WHERE id = ?').bind(status, b.id).run();
      if (status === 'stopped') await env.DB.prepare("UPDATE work_items SET status = 'cancelled', decided = ? WHERE business_id = ? AND status IN ('proposed', 'approved')").bind(now, b.id).run();
      await audit(env, b.id, me.id, status === 'stopped' ? 'stopped' : 'started', status === 'stopped' ? 'STOP pressed. All queued work cancelled.' : 'Started.', now);
      return json(200, { status });
    }
    if (sub === '/caps' && m === 'PUT') {
      const stmts = [];
      for (const k of SPEND) if (body[k] !== undefined) {
        const v = Number(body[k]); if (!(v >= 0 && v <= 10000)) return err(400, 'cap_invalid');
        stmts.push(env.DB.prepare('INSERT INTO caps (business_id, kind, monthly_usd) VALUES (?, ?, ?) ON CONFLICT(business_id, kind) DO UPDATE SET monthly_usd = excluded.monthly_usd').bind(b.id, k, v));
      }
      if (stmts.length) await env.DB.batch(stmts);
      await audit(env, b.id, me.id, 'caps', SPEND.filter((k) => body[k] !== undefined).map((k) => `${k} $${Number(body[k])}`).join(', '), now);
      return json(200, { caps: await caps(env, b.id) });
    }
    if (sub === '/settings' && m === 'PUT') {
      await env.DB.prepare('UPDATE businesses SET one_liner = ?, north_star = ? WHERE id = ?').bind(str(body.one_liner, 160), str(body.north_star, 80), b.id).run();
      await audit(env, b.id, me.id, 'settings', `North star: ${str(body.north_star, 80) || '(none)'}`, now);
      return json(200, { ok: true });
    }
    if (sub === '/work' && m === 'POST') {
      const kind = KINDS.includes(body.kind) ? body.kind : null, spend = SPEND.includes(body.spend_kind) ? body.spend_kind : 'llm';
      const cost = Number(body.cost_usd ?? 0), title = str(body.title, 120);
      if (!kind || !title || !(cost >= 0 && cost <= 1000)) return err(400, 'work_invalid');
      const w = { id: id(), business_id: b.id, kind, title, body: str(body.body, 4000), spend_kind: spend, cost_usd: cost };
      w.hash = await workHash(w);
      await env.DB.prepare('INSERT INTO work_items (id, business_id, kind, title, body, spend_kind, cost_usd, status, hash, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(w.id, b.id, kind, title, w.body, spend, cost, 'proposed', w.hash, now).run();
      await audit(env, b.id, me.id, 'proposed', `${title} (${kind}, up to $${cost} ${spend})`, now);
      return json(201, w);
    }
    if (sub === '/unpublish' && m === 'POST') {
      await env.DB.prepare('DELETE FROM sites WHERE business_id = ?').bind(b.id).run();
      await audit(env, b.id, me.id, 'unpublished', 'Web page taken offline.', now);
      return json(200, { ok: true });
    }
    if (sub === '/signups' && m === 'DELETE') {
      await env.DB.prepare('DELETE FROM signups WHERE business_id = ? AND email = ?').bind(b.id, str(body.email, 254).toLowerCase()).run();
      await audit(env, b.id, me.id, 'signup_removed', 'One email removed from the list.', now);
      return json(200, { ok: true });
    }
    if (sub === '/export' && m === 'GET') {
      const all = async (sql) => (await env.DB.prepare(sql).bind(b.id).all()).results;
      const data = { format: 'founder-export.v1', exported: new Date(now).toISOString(), business: b, caps: await all('SELECT kind, monthly_usd FROM caps WHERE business_id = ?'),
        work: await all('SELECT * FROM work_items WHERE business_id = ?'), meter: await all('SELECT * FROM meter WHERE business_id = ?'), audit: await all('SELECT * FROM audit WHERE business_id = ?'),
        signups: await all('SELECT email, at FROM signups WHERE business_id = ?'), visits: await all('SELECT day, n FROM visits WHERE business_id = ?') };
      return json(200, data, { 'content-disposition': `attachment; filename="${b.name}-export.json"` });
    }
    if (!sub && m === 'DELETE') {
      if (body.confirm !== b.name) return err(400, 'confirm_name');
      await env.DB.batch(['work_items', 'meter', 'audit', 'caps', 'drafts', 'messages', 'sites', 'signups', 'visits'].map((t) => env.DB.prepare(`DELETE FROM ${t} WHERE business_id = ?`).bind(b.id))
        .concat([env.DB.prepare('DELETE FROM businesses WHERE id = ?').bind(b.id),
          env.DB.prepare('INSERT INTO name_holds (name, until) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET until = excluded.until').bind(b.name, now + HOLD_MS)]));
      return json(200, { deleted: true });
    }
  }

  r = p.match(/^\/api\/work\/([\w-]+)\/(approve|reject)$/);
  if (r && m === 'POST') {
    const w = await env.DB.prepare('SELECT w.*, b.status AS b_status FROM work_items w JOIN businesses b ON b.id = w.business_id WHERE w.id = ? AND b.user_id = ?').bind(r[1], me.id).first();
    if (!w) return err(404, 'not_found');
    if (w.status !== 'proposed') return err(409, 'already_decided');
    if (r[2] === 'reject') {
      await env.DB.prepare("UPDATE work_items SET status = 'rejected', decided = ? WHERE id = ?").bind(now, w.id).run();
      await audit(env, w.business_id, me.id, 'rejected', w.title, now);
      return json(200, { status: 'rejected' });
    }
    // The approval names the exact item it saw. If the item changed since, the hash differs and nothing runs.
    if (body.hash !== w.hash || (await workHash(w)) !== w.hash) return err(409, 'approval_mismatch');
    if (w.b_status === 'stopped') return err(409, 'business_stopped');
    const fit = fitsCap(w.spend_kind, w.cost_usd, await spent(env, w.business_id, now), await caps(env, w.business_id));
    if (!fit.ok) return json(402, { error: 'over_cap', ...fit });
    // The approved amount is reserved at once, so two approvals cannot together pass the cap.
    await env.DB.batch([env.DB.prepare("UPDATE work_items SET status = 'approved', decided = ? WHERE id = ? AND status = 'proposed'").bind(now, w.id),
      env.DB.prepare('INSERT INTO meter (business_id, kind, cost_usd, note, at) VALUES (?, ?, ?, ?, ?)').bind(w.business_id, w.spend_kind, w.cost_usd, `reserved: ${w.title}`, now)]);
    await audit(env, w.business_id, me.id, 'approved', `${w.title} (up to $${w.cost_usd} ${w.spend_kind}, hash ${w.hash.slice(0, 12)})`, now);
    if (w.b_status !== 'active') return json(200, { status: 'approved', note: 'Runs when you press Start.' });
    return json(200, await run(env, me, w.id, now));
  }
  r = p.match(/^\/api\/work\/([\w-]+)\/run$/);
  if (r && m === 'POST') {
    const w = await env.DB.prepare('SELECT w.id, b.status AS b_status FROM work_items w JOIN businesses b ON b.id = w.business_id WHERE w.id = ? AND b.user_id = ?').bind(r[1], me.id).first();
    if (!w) return err(404, 'not_found');
    if (w.b_status !== 'active') return err(409, 'not_started');
    return json(200, await run(env, me, w.id, now));
  }
  return err(404, 'not_found');
}

// Does one approved task. Claims it first (approved -> running) so two clicks never run it twice.
async function run(env, me, wid, now) {
  const claim = await env.DB.prepare("UPDATE work_items SET status = 'running' WHERE id = ? AND status = 'approved'").bind(wid).run();
  if (!(claim.changes ?? claim.meta?.changes)) return { status: 'already_running_or_done' };
  const w = await env.DB.prepare('SELECT * FROM work_items WHERE id = ?').bind(wid).first();
  const b = await env.DB.prepare('SELECT * FROM businesses WHERE id = ?').bind(w.business_id).first();
  const goesOnline = w.kind === 'engineering' && /web page online|publish/i.test(w.title);
  const out = await (goesOnline ? publish(env, b, now) : runTask(env, b, w)).catch(() => ({ ok: false, result: '', verified: 'Failed with an error. Nothing was spent.' }));
  const t = Math.max(Date.now(), now + 1);
  // The reservation is released and replaced by what was really spent: the free models cost $0.
  await env.DB.batch([
    env.DB.prepare('UPDATE work_items SET status = ?, result = ?, verified = ?, finished = ? WHERE id = ?').bind(out.ok ? 'done' : 'failed', out.result, out.verified, t, wid),
    env.DB.prepare('INSERT INTO meter (business_id, kind, cost_usd, note, at) VALUES (?, ?, ?, ?, ?)').bind(w.business_id, w.spend_kind, -w.cost_usd, `released: ${w.title}`, t),
  ]);
  await audit(env, w.business_id, me.id, out.ok ? 'done' : 'failed', `${w.title}. ${out.verified}`, t);
  return { status: out.ok ? 'done' : 'failed' };
}
