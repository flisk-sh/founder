import { describe, expect, test } from 'bun:test';
import worker from '../src/index.js';
import { d1 } from './d1.js';
import { firstJson } from '../src/model.js';
import { suggestName } from '../src/brain.js';

const O = 'http://localhost';
// A fake Workers AI that answers with whatever `reply(messages)` returns.
const fakeAI = (reply) => ({ run: async (_m, { messages }) => ({ response: reply(messages) }) });
const env = (ai) => ({ DB: d1(), SESSION_SECRET: 's', DEV_LOGIN: '1', ...(ai ? { AI: ai } : {}) });
async function signIn(e, login = 'alice') {
  const r = await worker.fetch(new Request(`${O}/auth/dev?login=${login}`), e);
  return r.headers.getSetCookie().find((c) => c.startsWith('fdr_s=')).split(';')[0];
}
const req = (e, c, path, method = 'GET', body) => worker.fetch(new Request(O + path, { method, headers: { cookie: c, origin: O, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined }), e);

const PLAN = JSON.stringify({
  one_liner: 'Invoices for freelance designers', vision: 'A. B. C.', north_star: 'Paying customers',
  landing: { headline: 'Get paid <script>alert(1)</script>', sub: 'Fast invoices', bullets: ['One', 'Two', 'Three'], cta: 'Join' },
  tasks: [
    { kind: 'research', title: 'Who buys', body: 'x', spend_kind: 'llm', cost_usd: 1 },
    { kind: 'growth', title: 'Run Meta ads', body: 'x', spend_kind: 'ads', cost_usd: 900 },
    { kind: 'engineering', title: 'Landing page', body: 'x', spend_kind: 'infra', cost_usd: 1 },
  ],
});

describe('onboarding', () => {
  test('idea becomes a paused business with proposed tasks, a draft and a first message', async () => {
    const e = env(fakeAI(() => 'Sure! ```json\n' + PLAN + '\n```')), c = await signIn(e);
    const r = await (await req(e, c, '/api/onboard', 'POST', { idea: 'invoices for freelance designers' })).json();
    expect(r.name).toBe('invoices-freelance'); expect(r.offline).toBe(false);
    const d = await (await req(e, c, `/api/businesses/${r.id}`)).json();
    expect(d.business.status).toBe('paused');
    expect(d.work.every((w) => w.status === 'proposed')).toBe(true);
    // The brain may not propose ad spend or big costs: ads become llm, cost is clamped to $5.
    const ads = d.work.find((w) => w.title === 'Run Meta ads');
    expect(ads.spend_kind).toBe('llm'); expect(ads.cost_usd).toBe(5);
    expect(d.draft.headline).toContain('<script>');
    expect(d.messages[0].role).toBe('assistant');
  });
  test('with no model it makes an offline draft and says so', async () => {
    const e = env(), c = await signIn(e);
    const r = await (await req(e, c, '/api/onboard', 'POST', { idea: 'dog walking in Utrecht' })).json();
    expect(r.offline).toBe(true);
    const d = await (await req(e, c, `/api/businesses/${r.id}`)).json();
    expect(d.work.length).toBe(5); expect(d.draft.offline).toBe(true);
  });
  test('a taken name gets a number', async () => {
    const e = env(), a = await signIn(e, 'a'), b = await signIn(e, 'b');
    await req(e, a, '/api/onboard', 'POST', { idea: 'dog walking in Utrecht' });
    expect((await (await req(e, b, '/api/onboard', 'POST', { idea: 'dog walking in Utrecht' })).json()).name).toBe('dog-walking-2');
  });
});

describe('preview', () => {
  test('is escaped, sandboxed and private', async () => {
    const e = env(fakeAI(() => PLAN)), c = await signIn(e), other = await signIn(e, 'mallory');
    const { id } = await (await req(e, c, '/api/onboard', 'POST', { idea: 'invoices for freelance designers' })).json();
    const r = await req(e, c, `/app/b/${id}/preview`);
    const html = await r.text();
    expect(html).not.toContain('<script>'); expect(html).toContain('&#60;script&#62;');
    expect(r.headers.get('content-security-policy')).toContain('sandbox');
    expect(r.headers.get('content-security-policy')).toContain("default-src 'none'");
    expect((await req(e, other, `/app/b/${id}/preview`)).status).toBe(404);
  });
});

describe('chat', () => {
  test('a reply can propose a task, which waits for approval', async () => {
    let n = 0;
    const e = env(fakeAI(() => (n++ === 0 ? PLAN : JSON.stringify({ reply: 'Good idea.', propose: { kind: 'research', title: 'Price check', body: 'b', spend_kind: 'llm', cost_usd: 0.5 } })))), c = await signIn(e);
    const { id } = await (await req(e, c, '/api/onboard', 'POST', { idea: 'invoices for freelance designers' })).json();
    const r = await (await req(e, c, `/api/businesses/${id}/chat`, 'POST', { text: 'check our price' })).json();
    expect(r.reply).toBe('Good idea.'); expect(r.proposed.title).toBe('Price check');
    const d = await (await req(e, c, `/api/businesses/${id}`)).json();
    expect(d.work.find((w) => w.title === 'Price check').status).toBe('proposed');
    expect(d.messages.slice(-2).map((m) => m.role)).toEqual(['user', 'assistant']);
  });
  test('offline chat turns a request into a task and says it cannot answer', async () => {
    const e = env(), c = await signIn(e);
    const { id } = await (await req(e, c, '/api/onboard', 'POST', { idea: 'dog walking in Utrecht' })).json();
    expect((await (await req(e, c, `/api/businesses/${id}/chat`, 'POST', { text: 'research dog parks' })).json()).proposed.kind).toBe('research');
    expect((await (await req(e, c, `/api/businesses/${id}/chat`, 'POST', { text: 'how are we doing?' })).json()).proposed).toBe(null);
  });
});

describe('running tasks', () => {
  test('approve on a started business runs it once, records what was verified, releases the reservation', async () => {
    let n = 0;
    const e = env(fakeAI(() => (n++ === 0 ? PLAN : '## Buyers\n- Freelance designers'))), c = await signIn(e);
    const { id } = await (await req(e, c, '/api/onboard', 'POST', { idea: 'invoices for freelance designers' })).json();
    await req(e, c, `/api/businesses/${id}/start`, 'POST', {});
    const d = await (await req(e, c, `/api/businesses/${id}`)).json();
    const w = d.work.find((x) => x.title === 'Landing page');
    expect((await (await req(e, c, `/api/work/${w.id}/approve`, 'POST', { hash: w.hash })).json()).status).toBe('done');
    const d2 = await (await req(e, c, `/api/businesses/${id}`)).json();
    const done = d2.work.find((x) => x.id === w.id);
    expect(done.result).toContain('Buyers');
    expect(done.verified).toContain('Not built or deployed');
    expect(d2.spent.infra).toBe(0);
    expect((await (await req(e, c, `/api/work/${w.id}/run`, 'POST', {})).json()).status).toBe('already_running_or_done');
  });
  test('approve on a paused business waits for Start', async () => {
    const e = env(fakeAI(() => PLAN)), c = await signIn(e);
    const { id } = await (await req(e, c, '/api/onboard', 'POST', { idea: 'invoices for freelance designers' })).json();
    const w = (await (await req(e, c, `/api/businesses/${id}`)).json()).work[0];
    expect((await (await req(e, c, `/api/work/${w.id}/approve`, 'POST', { hash: w.hash })).json()).status).toBe('approved');
    expect((await req(e, c, `/api/work/${w.id}/run`, 'POST', {})).status).toBe(409);
  });
});

describe('helpers', () => {
  test('firstJson survives fences and trailing commas', () => {
    expect(firstJson('x ```json\n{"a": [1,2,],}\n``` y')).toEqual({ a: [1, 2] });
    expect(firstJson('no json')).toBe(null);
  });
  test('suggestName', () => {
    expect(suggestName('A simple app that helps dog owners find walkers')).toBe('dog-owners');
    expect(suggestName('!!')).toBe('my-business');
  });
});
