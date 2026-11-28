// Everything a model says is data. This module is the one place that knows how models misbehave: JSON with prose around it,
// nested objects where text was asked for, plain "reply: ... propose: ..." lines. It hands back clamped, typed values only.
import { firstJson } from './model.js';
import { KINDS } from './policy.js';

export const s = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
// Chat replies keep their line breaks (lists) and never print "[object Object]" when the model answers with nested JSON.
export function toText(v, depth = 0) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v !== 'object' || depth > 3) return String(v);
  if (Array.isArray(v)) return v.map((x) => (typeof x === 'object' && x ? toText(x, depth + 1) : '- ' + toText(x, depth + 1))).join('\n');
  return Object.entries(v).map(([k, x]) => (typeof x === 'object' && x ? `${k}:\n${toText(x, depth + 1)}` : `${k}: ${toText(x, depth + 1)}`)).join('\n');
}
export const replyText = (v, max) => toText(v).replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
export function cleanTask(t) {
  const title = s(t?.title, 120);
  if (!title) return null;
  const kind = KINDS.includes(t?.kind) ? t.kind : 'research';
  // A first-week task from the brain never spends on ads or mail: those need the owner to set a cap and ask.
  const spend_kind = ['llm', 'infra'].includes(t?.spend_kind) ? t.spend_kind : 'llm';
  const cost = Math.min(5, Math.max(0, Math.round(Number(t?.cost_usd) * 100) / 100 || 0.5));
  return { kind, title, body: s(t?.body, 600), spend_kind, cost_usd: cost };
}

// Some models ignore "answer with JSON" and write `reply: ... propose: kind: x title: y body: z ...` as plain text.
// Show only the reply and turn the propose part into a task, instead of printing the whole thing to the owner.
const PROPOSE = /\spropose:\s*(?=kind:|null\b|none\b)/i;
const FIELD = /\b(kind|title|body|spend_kind|cost_usd):/gi;
export function parsePlainChat(text) {
  const raw = String(text).trim();
  if (!/^reply:/i.test(raw)) return null;
  const rest = raw.slice(6);
  const cut = PROPOSE.exec(rest); // only "propose:" followed by a field or null splits; ordinary prose may use the word
  const replyText = (cut ? rest.slice(0, cut.index) : rest).trim();
  if (!replyText) return null;
  if (!cut) return { reply: replyText, propose: null };
  const tail = rest.slice(cut.index + cut[0].length);
  const marks = [...tail.matchAll(FIELD)];
  const fields = {};
  marks.forEach((m, i) => { fields[m[1].toLowerCase()] = tail.slice(m.index + m[0].length, marks[i + 1]?.index ?? tail.length).trim(); });
  return { reply: replyText, propose: marks.length ? cleanTask(fields) : null };
}


// The chat answer from raw model text: JSON first, then plain text lines, then the text itself. Null when there is no text.
export function interpretChat(text) {
  if (!text) return null;
  const j = firstJson(text);
  if (j?.reply) return { reply: replyText(j.reply, 1200), propose: j.propose ? cleanTask(j.propose) : null };
  const plain = parsePlainChat(text);
  if (plain) return { reply: replyText(plain.reply, 1200), propose: plain.propose };
  return { reply: replyText(text, 1200), propose: null };
}
