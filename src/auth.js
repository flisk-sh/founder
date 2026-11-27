// Sign-in through login.flisk.si (only its public key is needed) and a signed session cookie.
import { verifyLoginToken } from './login-token.js';

const COOKIE = 'fdr_s', STATE = 'fdr_state', DAYS = 14;
const enc = new TextEncoder();
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const rand = (n) => b64u(crypto.getRandomValues(new Uint8Array(n)));
async function mac(secret, v) {
  const k = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u(await crypto.subtle.sign('HMAC', k, enc.encode(v)));
}
const eq = (a, b) => { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };
export const cookieOf = (req, n) => (req.headers.get('cookie') || '').split(/;\s*/).find((c) => c.startsWith(n + '='))?.slice(n.length + 1) || '';
const cookie = (n, v, maxAge) => `${n}=${v}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

// { id, login } of the signed-in person, or null.
export async function session(req, env, now = Date.now()) {
  const [id, login, exp, sig] = decodeURIComponent(cookieOf(req, COOKIE)).split('|');
  if (!id || !sig || !env.SESSION_SECRET || !(Number(exp) > now)) return null;
  return eq(sig, await mac(env.SESSION_SECRET, `${id}|${login}|${exp}`)) ? { id, login } : null;
}
export async function sessionCookie(env, who, now = Date.now()) {
  const exp = now + DAYS * 864e5, v = `${who.id}|${who.login}|${exp}`;
  return cookie(COOKIE, encodeURIComponent(`${v}|${await mac(env.SESSION_SECRET, v)}`), DAYS * 86400);
}

export async function authRoute(req, env, url, now = Date.now()) {
  const origin = url.origin, p = url.pathname;
  if (p === '/auth/start') {
    const s = rand(16), back = new URL('/auth/done', origin); back.searchParams.set('s', s);
    return new Response(null, { status: 302, headers: { location: `${env.LOGIN_ORIGIN || 'https://login.flisk.si'}/start?return=${encodeURIComponent(back.href)}`, 'set-cookie': cookie(STATE, s, 600) } });
  }
  if (p === '/auth/done') {
    const s = url.searchParams.get('s') || '', st = cookieOf(req, STATE);
    const who = st && eq(s, st) ? await verifyLoginToken(url.searchParams.get('flisk_token'), env.LOGIN_PUBLIC_KEY, origin, now) : null;
    if (!who) return new Response(null, { status: 302, headers: { location: '/?signin=failed' } });
    return finish(env, { id: `gh_${who.id}`, login: who.login }, now);
  }
  // Local development only: never on a real host, and only when DEV_LOGIN is set.
  if (p === '/auth/dev' && env.DEV_LOGIN === '1' && ['localhost', '127.0.0.1'].includes(url.hostname)) {
    const login = (url.searchParams.get('login') || 'dev').replace(/[^A-Za-z0-9-]/g, '').slice(0, 39) || 'dev';
    return finish(env, { id: `dev_${login}`, login }, now);
  }
  if (p === '/auth/out') return new Response(null, { status: 302, headers: { location: '/', 'set-cookie': cookie(COOKIE, '', 0) } });
  return null;
}
async function finish(env, who, now) {
  await env.DB.prepare('INSERT INTO users (id, login, created) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET login = excluded.login').bind(who.id, who.login, now).run();
  const h = new Headers({ location: '/app' });
  h.append('set-cookie', await sessionCookie(env, who, now)); h.append('set-cookie', cookie(STATE, '', 0));
  return new Response(null, { status: 302, headers: h });
}
