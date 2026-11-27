// The owner's public web page: <name>.app.flisk.si (and /s/<name> on any host, for local dev).
// Only a page the owner put online (a finished "Put your web page online" job) is served. Free: it runs in this Worker.
// Visitors can leave an email ("tell me when it opens"); page views are counted per day, with no cookies and no IP stored.
import { landingHtml } from './preview.js';

const MAX_SIGNUPS = 2000;
const EMAIL = /^[^\s@<>"']{1,64}@[^\s@<>"']{1,190}\.[a-z]{2,24}$/i;
const PUBLIC_CSP = "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'";
const page = (body, status = 200) => new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'content-security-policy': PUBLIC_CSP, 'x-frame-options': 'DENY' } });
const day = (now) => new Date(now).toISOString().slice(0, 10);

// Which published name this request is for, and the path to post the form back to.
export function siteTarget(url) {
  const h = url.hostname.match(/^([a-z0-9-]{3,40})\.app\.flisk\.si$/);
  if (h) return { name: h[1], base: '' , rest: url.pathname };
  const p = url.pathname.match(/^\/s\/([a-z0-9-]{3,40})(\/.*)?$/);
  return p ? { name: p[1], base: `/s/${p[1]}`, rest: p[2] || '/' } : null;
}

export async function publish(env, b, now) {
  const d = await env.DB.prepare('SELECT data FROM drafts WHERE business_id = ?').bind(b.id).first();
  if (!d) return { ok: false, result: '', verified: 'There was no web page draft to put online. Nothing changed.' };
  await env.DB.prepare('INSERT INTO sites (business_id, data, published) VALUES (?, ?, ?) ON CONFLICT(business_id) DO UPDATE SET data = excluded.data, published = excluded.published').bind(b.id, d.data, now).run();
  return { ok: true, result: `Your web page is online at https://${b.name}.app.flisk.si. Visitors can leave their email there.`, verified: 'Online now. You can take it offline at any time.' };
}

export async function siteRoute(req, env, url, t, now = Date.now()) {
  const row = await env.DB.prepare('SELECT b.id, b.name, s.data FROM businesses b JOIN sites s ON s.business_id = b.id WHERE b.name = ?').bind(t.name).first();
  if (!row) return page('<!doctype html><meta charset="utf-8"><title>Not here yet</title><p style="font:18px system-ui;text-align:center;margin-top:20vh">This page is not online yet.</p>', 404);
  const data = JSON.parse(row.data), form = `${t.base}/signup`;
  if (t.rest === '/signup' && req.method === 'POST') {
    // No origin check: the page sends no referrer, so browsers post with Origin: null, and a public sign-up form has nothing to protect.
    const f = await req.formData().catch(() => null);
    if (!f || f.get('website')) return Response.redirect(`${url.origin}${t.base || '/'}?thanks=1`, 303); // honeypot: quietly ignore bots
    const email = String(f.get('email') || '').trim().toLowerCase();
    if (!EMAIL.test(email)) return page(landingHtml(row.name, data, { form, note: 'Please check your email address and try again.' }), 400);
    const n = (await env.DB.prepare('SELECT COUNT(*) AS n FROM signups WHERE business_id = ?').bind(row.id).first()).n;
    if (n < MAX_SIGNUPS) await env.DB.prepare('INSERT OR IGNORE INTO signups (business_id, email, at) VALUES (?, ?, ?)').bind(row.id, email, now).run();
    return Response.redirect(`${url.origin}${t.base || '/'}?thanks=1`, 303);
  }
  if (t.rest !== '/' || req.method !== 'GET') return page('Not found', 404);
  await env.DB.prepare('INSERT INTO visits (business_id, day, n) VALUES (?, ?, 1) ON CONFLICT(business_id, day) DO UPDATE SET n = n + 1').bind(row.id, day(now)).run();
  return page(landingHtml(row.name, data, { form, note: url.searchParams.get('thanks') ? 'Thank you! We will tell you when we open.' : '' }));
}

export async function siteStats(env, bid, now) {
  const s = await env.DB.prepare('SELECT published FROM sites WHERE business_id = ?').bind(bid).first();
  const since = day(now - 6 * 864e5);
  const v = await env.DB.prepare('SELECT SUM(n) AS week FROM visits WHERE business_id = ? AND day >= ?').bind(bid, since).first();
  const all = await env.DB.prepare('SELECT SUM(n) AS total FROM visits WHERE business_id = ?').bind(bid).first();
  const signups = (await env.DB.prepare('SELECT email, at FROM signups WHERE business_id = ? ORDER BY at DESC LIMIT 200').bind(bid).all()).results;
  return { published: s?.published || null, visits_week: v?.week || 0, visits_total: all?.total || 0, signups };
}
