import { describe, expect, test } from 'bun:test';
import worker from '../src/index.js';
import { d1 } from './d1.js';
import { checkName, fitsCap } from '../src/policy.js';

const O = 'http://localhost';
function env() { return { DB: d1(), SESSION_SECRET: 'test-secret', DEV_LOGIN: '1' }; }
async function signIn(e, login) {
  const r = await worker.fetch(new Request(`${O}/auth/dev?login=${login}`), e);
  return r.headers.getSetCookie().find((c) => c.startsWith('fdr_s=')).split(';')[0];
}
const req = (e, c, path, method = 'GET', body, origin = O) => worker.fetch(new Request(O + path, { method, headers: { cookie: c, origin, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined }), e);
async function setup() {
  const e = env(), a = await signIn(e, 'alice'), b = await signIn(e, 'bob');
  const r = await req(e, a, '/api/businesses', 'POST', { name: 'acme', one_liner: 'x', north_star: 'Paying customers' });
  return { e, a, b, id: (await r.json()).id };
}

describe('names', () => {
  test('valid, reserved, invalid', () => {
    expect(checkName('Acme')).toEqual({ name: 'acme' });
    expect(checkName('login').error).toBe('name_reserved');
    expect(checkName('ab').error).toBe('name_invalid');
    expect(checkName('a--b').error).toBe('name_invalid');
    expect(checkName('chat.flisk.si').error).toBe('name_invalid');
  });
  test('duplicate and held names are refused', async () => {
    const { e, a, b, id } = await setup();
    expect((await (await req(e, b, '/api/businesses', 'POST', { name: 'acme' })).json()).error).toBe('name_taken');
    await req(e, a, `/api/businesses/${id}`, 'DELETE', { confirm: 'acme' });
    expect((await (await req(e, b, '/api/businesses', 'POST', { name: 'acme' })).json()).error).toBe('name_held');
  });
});

describe('privacy', () => {
  test('another user gets 404 for my business and my work', async () => {
    const { e, b, id, a } = await setup();
    expect((await req(e, b, `/api/businesses/${id}`)).status).toBe(404);
    const w = await (await req(e, a, `/api/businesses/${id}/work`, 'POST', { kind: 'research', title: 't', cost_usd: 1 })).json();
    expect((await req(e, b, `/api/work/${w.id}/approve`, 'POST', { hash: w.hash })).status).toBe(404);
  });
  test('no session means 401, cross-site post means 403, form post means 415', async () => {
    const { e, a, id } = await setup();
    expect((await req(e, '', '/api/me')).status).toBe(401);
    expect((await req(e, a, `/api/businesses/${id}/stop`, 'POST', {}, 'https://evil.example')).status).toBe(403);
    const r = await worker.fetch(new Request(`${O}/api/businesses/${id}/stop`, { method: 'POST', headers: { cookie: a, origin: O, 'content-type': 'application/x-www-form-urlencoded' }, body: 'x=1' }), e);
    expect(r.status).toBe(415);
  });
  test('a forged session cookie is ignored', async () => {
    const { e } = await setup();
    expect((await req(e, 'fdr_s=gh_1%7Calice%7C99999999999999%7Cforged', '/api/me')).status).toBe(401);
  });
  test('dev login only on localhost', async () => {
    const r = await worker.fetch(new Request('https://founder.flisk.si/auth/dev?login=x'), env());
    expect(r.status).toBe(404); expect(r.headers.getSetCookie().length).toBe(0);
  });
});

describe('approvals and caps', () => {
  test('approval must match the exact item', async () => {
    const { e, a, id } = await setup();
    const w = await (await req(e, a, `/api/businesses/${id}/work`, 'POST', { kind: 'engineering', title: 'pricing page', cost_usd: 2 })).json();
    expect((await req(e, a, `/api/work/${w.id}/approve`, 'POST', { hash: 'nope' })).status).toBe(409);
    e.DB.raw.query('UPDATE work_items SET cost_usd = 900 WHERE id = ?').run(w.id); // changed behind the owner's back
    expect((await (await req(e, a, `/api/work/${w.id}/approve`, 'POST', { hash: w.hash })).json()).error).toBe('approval_mismatch');
  });
  test('approved spend is reserved and the cap holds', async () => {
    const { e, a, id } = await setup();
    const mk = async (c) => (await req(e, a, `/api/businesses/${id}/work`, 'POST', { kind: 'research', title: 't' + c, cost_usd: c })).json();
    const w1 = await mk(6), w2 = await mk(6); // default llm cap is $10
    expect((await req(e, a, `/api/work/${w1.id}/approve`, 'POST', { hash: w1.hash })).status).toBe(200);
    expect((await req(e, a, `/api/work/${w2.id}/approve`, 'POST', { hash: w2.hash })).status).toBe(402);
    expect((await req(e, a, `/api/work/${w1.id}/approve`, 'POST', { hash: w1.hash })).status).toBe(409);
  });
  test('ads are off until a cap is set', () => {
    expect(fitsCap('ads', 1, {}, { ads: 0 }).ok).toBe(false);
    expect(fitsCap('ads', 0, {}, { ads: 0 }).ok).toBe(true);
  });
  test('STOP cancels queued work and blocks approval; start needs a north star', async () => {
    const { e, a, id } = await setup();
    const w = await (await req(e, a, `/api/businesses/${id}/work`, 'POST', { kind: 'ops', title: 't', cost_usd: 1 })).json();
    await req(e, a, `/api/businesses/${id}/stop`, 'POST', {});
    expect((await req(e, a, `/api/work/${w.id}/approve`, 'POST', { hash: w.hash })).status).toBe(409);
    await req(e, a, `/api/businesses/${id}/settings`, 'PUT', { north_star: '' });
    expect((await (await req(e, a, `/api/businesses/${id}/start`, 'POST', {})).json()).error).toBe('north_star_missing');
  });
});

describe('data', () => {
  test('export has everything, delete needs the name', async () => {
    const { e, a, id } = await setup();
    const ex = await (await req(e, a, `/api/businesses/${id}/export`)).json();
    expect(ex.format).toBe('founder-export.v1'); expect(ex.audit.length).toBeGreaterThan(0);
    expect((await req(e, a, `/api/businesses/${id}`, 'DELETE', { confirm: 'nope' })).status).toBe(400);
    expect((await req(e, a, `/api/businesses/${id}`, 'DELETE', { confirm: 'acme' })).status).toBe(200);
    expect(e.DB.raw.query('SELECT COUNT(*) c FROM audit').get().c).toBe(0);
  });
  test('pages carry strict security headers', async () => {
    const r = await worker.fetch(new Request(`${O}/`), env());
    expect(r.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
    expect(r.headers.get('x-frame-options')).toBe('DENY');
  });
});

describe('web page online', () => {
  const form = (e, path, data, origin = O) => worker.fetch(new Request(O + path, { method: 'POST', redirect: 'manual', headers: { origin, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(data) }), e);
  async function online() {
    const e = env(), a = await signIn(e, 'alice');
    const ob = await (await req(e, a, '/api/onboard', 'POST', { idea: 'A small bakery that delivers bread', name: 'bakery' })).json();
    const id = ob.id || ob.business?.id;
    await req(e, a, `/api/businesses/${id}/start`, 'POST', {});
    const d = await (await req(e, a, `/api/businesses/${id}`)).json();
    const w = d.work.find((x) => /web page online/i.test(x.title));
    return { e, a, id, w };
  }
  test('nothing is public until the owner approves the job', async () => {
    const { e, a, w } = await online();
    expect((await worker.fetch(new Request(`${O}/s/bakery`), e)).status).toBe(404);
    expect((await (await req(e, a, `/api/work/${w.id}/approve`, 'POST', { hash: w.hash })).json()).status).toBe('done');
    const r = await worker.fetch(new Request(`${O}/s/bakery`), e);
    expect(r.status).toBe(200);
    expect(await r.text()).toContain('name="email"');
  });
  test('sign-ups are saved once, bots and bad emails are not', async () => {
    const { e, a, id, w } = await online();
    await req(e, a, `/api/work/${w.id}/approve`, 'POST', { hash: w.hash });
    expect((await form(e, '/s/bakery/signup', { email: 'Ann@Example.com' })).status).toBe(303);
    await form(e, '/s/bakery/signup', { email: 'ann@example.com' });
    await form(e, '/s/bakery/signup', { email: 'bot@example.com', website: 'x' });
    expect((await form(e, '/s/bakery/signup', { email: 'nope' })).status).toBe(400);
    await worker.fetch(new Request(`${O}/s/bakery`), e);
    const d = await (await req(e, a, `/api/businesses/${id}`)).json();
    expect(d.site.signups.map((s) => s.email)).toEqual(['ann@example.com']);
    expect(d.site.visits_week).toBeGreaterThan(0);
  });
  test('owner can take it offline, and delete removes everything', async () => {
    const { e, a, id, w } = await online();
    await req(e, a, `/api/work/${w.id}/approve`, 'POST', { hash: w.hash });
    await req(e, a, `/api/businesses/${id}/unpublish`, 'POST', {});
    expect((await worker.fetch(new Request(`${O}/s/bakery`), e)).status).toBe(404);
    await req(e, a, `/api/businesses/${id}`, 'DELETE', { confirm: 'bakery' });
    expect((await req(e, a, `/api/businesses/${id}`)).status).toBe(404);
  });
});
