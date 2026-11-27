// Rules that keep founder safe: which names can be claimed, what an approval binds to, and whether a spend fits a cap.
export const NAME = /^[a-z][a-z0-9-]{2,30}$/;
// Names of Flisk products and words people trust. A user app on <name>.flisk.si must never look like one of them.
export const RESERVED = new Set(('www app api mail email smtp mx ns dns admin root support help security status billing pay payments '
  + 'login auth sso account accounts founder cabinet chat grow fleet host jobs bot gel cilytics analytics traces pages studio '
  + 'inference ranker citable helpdock labs learn brain roadmap releases demos tools skills website docs blog news flisk polsia').split(' '));
export const KINDS = ['engineering', 'research', 'growth', 'ops'];
export const SPEND = ['llm', 'ads', 'infra', 'mail'];
export const DEFAULT_CAPS = { llm: 10, ads: 0, infra: 5, mail: 0 };
export const HOLD_MS = 30 * 864e5;

export function checkName(raw) {
  const name = String(raw || '').trim().toLowerCase();
  if (!NAME.test(name) || name.endsWith('-') || name.includes('--')) return { error: 'name_invalid' };
  if (RESERVED.has(name)) return { error: 'name_reserved' };
  return { name };
}

// The exact thing a person approves. Any change to it gives a different hash, so an old approval cannot be reused.
export async function workHash(w) {
  const canon = JSON.stringify([w.id, w.business_id, w.kind, w.title, w.body, w.spend_kind, Number(w.cost_usd)]);
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canon));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Does a spend of `cost` of `kind` fit? spent and caps are { kind: usd }.
export function fitsCap(kind, cost, spent, caps) {
  const cap = Number(caps[kind] ?? 0), used = Number(spent[kind] ?? 0);
  return { ok: cost <= 0 || used + cost <= cap + 1e-9, cap, used, left: Math.max(0, cap - used) };
}

export const monthStart = (now) => { const d = new Date(now); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1); };
