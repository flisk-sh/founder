// The business lifecycle: start, stop, approve, reject and run. Every rule about when a job may run, what it reserves and what is
// written to the audit trail lives here, so a route handler only parses the request and calls one of these.
// Each returns a plain result, or { http, error } when the request must be refused.
import { runTask } from './brain.js';
import { publish } from './site.js';
import { audit, caps, spent } from './store.js';
import { fitsCap, workHash } from './policy.js';

const refuse = (http, error, extra = {}) => ({ http, error, ...extra });

// Does one approved task. Claims it first (approved -> running) so two clicks never run it twice.
export async function runApproved(env, me, wid, now) {
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

// Run one job the owner asked for by hand: only while the business is started.
export async function runNow(env, me, w, now) {
  if (w.b_status !== 'active') return refuse(409, 'not_started');
  return runApproved(env, me, w.id, now);
}

export async function start(env, me, b, now) {
  if (!b.north_star) return refuse(400, 'north_star_missing');
  await env.DB.prepare("UPDATE businesses SET status = 'active' WHERE id = ?").bind(b.id).run();
  await audit(env, b.id, me.id, 'started', 'Started.', now);
  // Jobs the owner already said yes to run now: Start promises it, and approving while stopped only queues them.
  const { results } = await env.DB.prepare("SELECT id FROM work_items WHERE business_id = ? AND status = 'approved' ORDER BY decided").bind(b.id).all();
  let ran = 0;
  for (const w of results || []) { await runApproved(env, me, w.id, now); ran++; }
  return { status: 'active', ran };
}

export async function stop(env, me, b, now) {
  await env.DB.prepare("UPDATE businesses SET status = 'stopped' WHERE id = ?").bind(b.id).run();
  await env.DB.prepare("UPDATE work_items SET status = 'cancelled', decided = ? WHERE business_id = ? AND status IN ('proposed', 'approved')").bind(now, b.id).run();
  await audit(env, b.id, me.id, 'stopped', 'STOP pressed. All queued work cancelled.', now);
  return { status: 'stopped', ran: 0 };
}

// A job that did not work goes back to "waiting for your answer", so the owner can say yes to it again.
export async function retry(env, me, w, now) {
  const back = await env.DB.prepare("UPDATE work_items SET status = 'proposed', result = '', verified = '', decided = NULL, finished = NULL WHERE id = ? AND status = 'failed'").bind(w.id).run();
  if (!(back.changes ?? back.meta?.changes)) return refuse(409, 'not_failed');
  await audit(env, w.business_id, me.id, 'retry', w.title, now);
  return { status: 'proposed' };
}

export async function reject(env, me, w, now) {
  if (w.status !== 'proposed') return refuse(409, 'already_decided');
  await env.DB.prepare("UPDATE work_items SET status = 'rejected', decided = ? WHERE id = ?").bind(now, w.id).run();
  await audit(env, w.business_id, me.id, 'rejected', w.title, now);
  return { status: 'rejected' };
}

export async function approve(env, me, w, hash, now) {
  if (w.status !== 'proposed') return refuse(409, 'already_decided');
  // The approval names the exact item it saw. If the item changed since, the hash differs and nothing runs.
  if (hash !== w.hash || (await workHash(w)) !== w.hash) return refuse(409, 'approval_mismatch');
  if (w.b_status === 'stopped') return refuse(409, 'business_stopped');
  const fit = fitsCap(w.spend_kind, w.cost_usd, await spent(env, w.business_id, now), await caps(env, w.business_id));
  if (!fit.ok) return refuse(402, 'over_cap', fit);
  // The approved amount is reserved at once, so two approvals cannot together pass the cap.
  await env.DB.batch([env.DB.prepare("UPDATE work_items SET status = 'approved', decided = ? WHERE id = ? AND status = 'proposed'").bind(now, w.id),
    env.DB.prepare('INSERT INTO meter (business_id, kind, cost_usd, note, at) VALUES (?, ?, ?, ?, ?)').bind(w.business_id, w.spend_kind, w.cost_usd, `reserved: ${w.title}`, now)]);
  await audit(env, w.business_id, me.id, 'approved', `${w.title} (up to $${w.cost_usd} ${w.spend_kind}, hash ${w.hash.slice(0, 12)})`, now);
  if (w.b_status !== 'active') return { status: 'approved', note: 'Runs when you press Start.' };
  return runApproved(env, me, w.id, now);
}
