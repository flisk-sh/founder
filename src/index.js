// founder.flisk.si: the private cabinet. Sign-in through login.flisk.si, data in D1, the page built from web/ with Astryx.
import { authRoute, session } from './auth.js';
import { api, json } from './api.js';
import { APP_CSS_PATH, APP_JS_PATH, appAsset } from './app.js';

const CSP = "default-src 'self'; script-src 'self' https://flisk.si; style-src 'self' 'unsafe-inline' https://flisk.si; font-src 'self'; img-src 'self' data: https://flisk.si; connect-src 'self' https://flisk.si; form-action 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'";
const SECURE = { 'x-content-type-options': 'nosniff', 'x-frame-options': 'DENY', 'referrer-policy': 'no-referrer', 'strict-transport-security': 'max-age=31536000; includeSubDomains', 'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()', 'cross-origin-opener-policy': 'same-origin', 'content-security-policy': CSP };
const withSecure = (res) => { const out = new Response(res.body, res); for (const [k, v] of Object.entries(SECURE)) if (!out.headers.has(k)) out.headers.set(k, v); return out; };

export const shell = (signedIn) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Founder · Flisk</title><meta name="description" content="A private cabinet that runs a small app business. Nothing spends, sends or ships without your approval.">
<meta name="robots" content="${signedIn ? 'noindex, nofollow' : 'index, follow'}"><link rel="stylesheet" href="${APP_CSS_PATH}"></head><body>
<script src="https://flisk.si/assets/bar.js" data-product="Founder" data-icon="founder" data-accent="#2563eb" data-siblings="Grow,Chat,Fleet" defer></script>
<div id="root"></div><script type="module" src="${APP_JS_PATH}"></script></body></html>`;
const html = (body) => new Response(body, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });

export default {
  async fetch(req, env) {
    const url = new URL(req.url), p = url.pathname;
    const res = await route(req, env, url, p).catch(() => json(500, { error: 'server_error' }));
    return withSecure(res);
  },
};

async function route(req, env, url, p) {
  const asset = appAsset(p); if (asset) return asset;
  const a = await authRoute(req, env, url); if (a) return a;
  if (p === '/robots.txt') return new Response('User-agent: *\nAllow: /$\nDisallow: /app\nDisallow: /api/\nDisallow: /auth/\n', { headers: { 'content-type': 'text/plain' } });
  const me = await session(req, env);
  if (p.startsWith('/api/')) return me ? api(req, env, url, me) : json(401, { error: 'sign_in' });
  if (p === '/' || p === '/app' || p.startsWith('/app/')) {
    if (p !== '/' && !me) return new Response(null, { status: 302, headers: { location: '/auth/start' } });
    return html(shell(Boolean(me)));
  }
  return new Response('Not found', { status: 404 });
}
