// Reads and writes every module shares: who owns a business, the audit trail, the monthly caps and what has been spent.
import { DEFAULT_CAPS, monthStart, SPEND } from './policy.js';

export async function own(env, uid, bid) {
  return env.DB.prepare('SELECT * FROM businesses WHERE id = ? AND user_id = ?').bind(bid, uid).first();
}
export async function audit(env, bid, uid, action, detail, now) {
  return env.DB.prepare('INSERT INTO audit (business_id, user_id, action, detail, at) VALUES (?, ?, ?, ?, ?)').bind(bid, uid, action, detail, now).run();
}
export async function caps(env, bid) {
  const rows = (await env.DB.prepare('SELECT kind, monthly_usd FROM caps WHERE business_id = ?').bind(bid).all()).results;
  return Object.fromEntries(SPEND.map((k) => [k, rows.find((r) => r.kind === k)?.monthly_usd ?? DEFAULT_CAPS[k]]));
}
export async function spent(env, bid, now) {
  const rows = (await env.DB.prepare('SELECT kind, SUM(cost_usd) AS s FROM meter WHERE business_id = ? AND at >= ? GROUP BY kind').bind(bid, monthStart(now)).all()).results;
  return Object.fromEntries(SPEND.map((k) => [k, rows.find((r) => r.kind === k)?.s ?? 0]));
}
