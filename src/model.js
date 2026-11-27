// One way to ask a model: Workers AI first (env.AI), then inference.flisk.si (service binding or fetch with INFERENCE_KEY).
// Returns { text, model } or null when no model is reachable. Callers then fall back to an offline draft and say so.
export const FAST_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';
export const FLISK_MODEL = 'flisk-wolf-chat';

export async function ask(env, messages, { maxTokens = 900, temperature = 0.6 } = {}) {
  if (env.AI) {
    try {
      const r = await env.AI.run(FAST_MODEL, { messages, max_tokens: maxTokens, temperature });
      if (r?.response) return { text: r.response, model: FAST_MODEL };
    } catch { /* daily allowance used up or model down: try the next one */ }
  }
  if (env.INFERENCE_KEY) {
    const call = env.INFERENCE ? (u, o) => env.INFERENCE.fetch(u, o) : fetch;
    try {
      const res = await call('https://inference.flisk.si/v1/chat/completions', {
        method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${env.INFERENCE_KEY}` },
        body: JSON.stringify({ model: FLISK_MODEL, messages, max_tokens: maxTokens, temperature }), signal: AbortSignal.timeout(85000),
      });
      if (res.ok) { const j = await res.json(); const t = j?.choices?.[0]?.message?.content; if (t) return { text: t, model: FLISK_MODEL }; }
    } catch { /* fall through */ }
  }
  return null;
}

// The first JSON object in a model answer. Small models add prose, code fences, trailing commas and raw newlines.
export function firstJson(text) {
  const s = String(text || ''), a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  const raw = s.slice(a, b + 1);
  for (const t of [raw, raw.replace(/,\s*([}\]])/g, '$1').replace(/[\u0000-\u001f]+/g, ' ')]) { try { return JSON.parse(t); } catch { /* next */ } }
  return null;
}
