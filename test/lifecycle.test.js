import { describe, expect, test } from 'bun:test';
import { d1 } from './d1.js';
import { approve, reject, start, stop } from '../src/lifecycle.js';
import { workHash } from '../src/policy.js';

async function world(north_star = 'Customers') {
  const env = { DB: d1() }, me = { id: 'u1' }, now = Date.now();
  await env.DB.prepare('INSERT INTO businesses (id, user_id, name, one_liner, north_star, status, created) VALUES (?, ?, ?, ?, ?, ?, ?)').bind('b1', 'u1', 'acme', 'x', north_star, 'paused', now).run();
  const w = { id: 'w1', business_id: 'b1', kind: 'research', title: 'Look around', body: '', spend_kind: 'llm', cost_usd: 0.2 };
  w.hash = await workHash(w);
  await env.DB.prepare('INSERT INTO work_items (id, business_id, kind, title, body, spend_kind, cost_usd, status, hash, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(w.id, 'b1', w.kind, w.title, '', w.spend_kind, w.cost_usd, 'proposed', w.hash, now).run();
  return { env, me, now, b: { id: 'b1', north_star }, w: { ...w, status: 'proposed', b_status: 'paused' } };
}
const status = async (env) => (await env.DB.prepare('SELECT status FROM work_items WHERE id = ?').bind('w1').first()).status;

describe('lifecycle', () => {
  test('start needs a north star', async () => {
    const { env, me, now, b } = await world('');
    expect((await start(env, me, b, now)).error).toBe('north_star_missing');
  });
  test('approve while paused queues the job; start runs it', async () => {
    const { env, me, now, b, w } = await world();
    expect((await approve(env, me, w, w.hash, now)).status).toBe('approved');
    expect(await status(env)).toBe('approved');
    expect((await start(env, me, b, now)).ran).toBe(1);
    expect(['done', 'failed']).toContain(await status(env));
  });
  test('stop cancels queued work and approvals are then refused', async () => {
    const { env, me, now, b, w } = await world();
    await stop(env, me, b, now);
    expect(await status(env)).toBe('cancelled');
    expect((await approve(env, me, { ...w, status: 'proposed', b_status: 'stopped' }, w.hash, now)).error).toBe('business_stopped');
  });
  test('a changed job cannot be approved with the old hash; a decided job cannot be rejected', async () => {
    const { env, me, now, w } = await world();
    expect((await approve(env, me, w, 'stale', now)).error).toBe('approval_mismatch');
    expect((await reject(env, me, w, now)).status).toBe('rejected');
    expect((await reject(env, me, { ...w, status: 'rejected' }, now)).error).toBe('already_decided');
  });
});
