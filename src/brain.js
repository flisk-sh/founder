// The founder brain: turns an idea into a company draft, answers chat about the business, and does approved tasks.
// Everything it makes is a proposal or a draft. Model output is data: clamped, typed, and never run or served as HTML.
import { ask, firstJson } from './model.js';
import { SPEND } from './policy.js';
import { cleanTask, interpretChat, s } from './reply.js';

export { parsePlainChat, toText } from './reply.js';

const words = (t) => s(t, 400).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(' ').filter((w) => w.length > 2);
const STOP = new Set(['the', 'and', 'for', 'with', 'that', 'app', 'tool', 'who', 'your', 'from', 'want', 'make', 'build', 'help', 'helps', 'into', 'their', 'small', 'simple', 'online']);

// A name to suggest from the idea: two strong words, ascii, 3-31 chars.
export function suggestName(idea) {
  const w = words(idea).filter((x) => !STOP.has(x)).slice(0, 2);
  const n = (w.join('-') || 'my-business').replace(/[^a-z0-9-]/g, '').slice(0, 31).replace(/-+$/, '');
  return /^[a-z]/.test(n) && n.length >= 3 ? n : 'biz-' + n.slice(0, 26);
}

function cleanLanding(l, fallbackName) {
  const bullets = (Array.isArray(l?.bullets) ? l.bullets : []).map((b) => s(b, 120)).filter(Boolean).slice(0, 3);
  return { headline: s(l?.headline, 90) || fallbackName, sub: s(l?.sub, 200), bullets, cta: s(l?.cta, 30) || 'Join the waitlist' };
}

const ONBOARD_SYSTEM = `The owner is not technical (think a restaurant, café or shop owner). Write everything in plain everyday words, short sentences, no tech or marketing jargon.
You help the owner of a small business (new or existing). From what the owner wrote, answer ONLY with JSON:
{"one_liner": "<=100 chars, what it does for whom", "vision": "3 short sentences: mission, what we build, where we head",
"north_star": "<=40 chars, ONE number the owner can count each week, e.g. Tables booked each week",
"landing": {"headline": "<=70 chars", "sub": "<=160 chars", "bullets": ["3 concrete benefits"], "cta": "<=24 chars"},
"tasks": [5 items {"kind": "engineering|research|growth|ops", "title": "<=70 chars, verb first, everyday words", "body": "2 lines: what done looks like", "spend_kind": "llm|infra", "cost_usd": 0.1-3}]}
Task 1 must be research on who exactly buys. Never propose paid ads, cold email or posting without the founder. Plain words.`;

export async function onboard(env, idea) {
  const ans = await ask(env, [{ role: 'system', content: ONBOARD_SYSTEM }, { role: 'user', content: s(idea, 500) }], { maxTokens: 1100 });
  const j = ans ? firstJson(ans.text) : null;
  const name = suggestName(idea);
  if (j && Array.isArray(j.tasks)) {
    const tasks = j.tasks.map(cleanTask).filter(Boolean).slice(0, 6);
    if (tasks.length >= 3) return { offline: false, model: ans.model, one_liner: s(j.one_liner, 160), vision: s(j.vision, 600), north_star: s(j.north_star, 80) || 'Paying customers', landing: cleanLanding(j.landing, name), tasks, name };
  }
  return offlineOnboard(idea, name);
}

// "Rosa's taquería & café — tacos near the market" -> brand "Rosa's taquería & café", headline "Tacos near the market".
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
export function splitIdea(idea, name) {
  const parts = String(idea).split(/\s+[—–-]\s+|:\s+/);
  const humanName = String(name || '').replace(/-\d+$/, '').split('-').map(cap).join(' ');
  if (parts.length > 1 && parts[0].length <= 40) return { brand: cap(parts[0].trim()), headline: cap(s(parts.slice(1).join(' — '), 70)) };
  return { brand: humanName, headline: cap(s(idea, 70)) };
}
// No model reachable: a fixed playbook filled from the idea. The page says it is an offline draft.
export function offlineOnboard(idea, name = suggestName(idea)) {
  const what = s(idea, 100);
  return {
    offline: true, model: null, name, one_liner: what, north_star: 'Customers each week',
    vision: `${what.charAt(0).toUpperCase() + what.slice(1)}. We start small, with the people closest to us, and listen to every guest. We grow only when people keep coming back.`,
    landing: { ...splitIdea(what, name), sub: 'Opening soon. Leave your email and we will tell you first.', bullets: ['Made with care', 'Fair prices', 'Friendly and local'], cta: 'Tell me when it opens' },
    tasks: [
      { kind: 'research', title: 'Describe your best customers', body: 'Who they are, when they come, and where they hear about places like yours.', spend_kind: 'llm', cost_usd: 0.5 },
      { kind: 'research', title: 'Look at 4 places people compare you with', body: 'Their prices, what guests praise and complain about, and what makes you different.', spend_kind: 'llm', cost_usd: 0.5 },
      { kind: 'engineering', title: 'Put your web page online', body: 'Your page goes online with a form where people can leave their email.', spend_kind: 'infra', cost_usd: 1 },
      { kind: 'growth', title: 'Write 3 posts for Facebook and Instagram', body: 'Only written for you. You read them and post them yourself.', spend_kind: 'llm', cost_usd: 0.3 },
      { kind: 'ops', title: 'Choose your first prices', body: 'A simple price list to start with, and why. Nothing is charged.', spend_kind: 'llm', cost_usd: 0.2 },
    ],
  };
}

const CHAT_SYSTEM = (b, tasks) => `You are the AI co-founder of "${b.name}": ${b.one_liner}. North star: ${b.north_star || 'not set'}.
Vision: ${b.vision || '-'}
Open tasks: ${tasks.map((t) => `[${t.status}] ${t.title}`).join('; ') || 'none'}.
You cannot spend, send, post or deploy anything: you can only PROPOSE a task, which the founder approves. The owner is not technical (think a restaurant or shop owner): use plain everyday words, no tech or marketing jargon, short sentences. Be concrete and honest; say when you do not know.
Answer ONLY with JSON: {"reply": "your answer, under 120 words", "propose": null or {"kind": "engineering|research|growth|ops", "title": "...", "body": "...", "spend_kind": "llm|infra", "cost_usd": 0.1-3}}`;

export async function chat(env, b, tasks, history, text) {
  const msgs = [{ role: 'system', content: CHAT_SYSTEM(b, tasks) }, ...history.slice(-10).map((m) => ({ role: m.role, content: m.content })), { role: 'user', content: s(text, 1000) }];
  const ans = await ask(env, msgs, { maxTokens: 500 });
  const said = interpretChat(ans?.text);
  if (said) return { ...said, offline: false };
  // Offline: the one useful thing without a model is turning the request into a proposed task.
  const want = /^(please |can you |could you |pls )?(add|build|make|write|create|research|find|draft|fix|set up|plan|check|list|suggest|prepare)\b/i.test(s(text, 200));
  return {
    offline: true,
    reply: want ? 'I wrote that down as a new job. Say yes to it in your job list when you are ready.' : 'I cannot answer questions right now. Tell me a job instead, like “write a summer menu”, and I will add it for you to say yes to.',
    propose: want ? cleanTask({ kind: /research|find|compare/i.test(text) ? 'research' : 'engineering', title: cap(s(text, 90).replace(/^(please |pls )?(can|could|would) you (please )?/i, '').replace(/[?.!]+$/, '')), body: 'You asked for this in the chat.', spend_kind: 'llm', cost_usd: 0.5 }) : null,
  };
}

// Doing an approved task. Research and drafts are done by the model now; building and deploying needs fleet (not wired yet),
// so those come back as a plan plus an honest note of what was not done. `verified` always says what was really checked.
const RUN_SYSTEM = (b) => `You work for "${b.name}" (${b.one_liner}). Do the task below as well as you can in text: a research memo, a plan, copy or a spec.
Write for a non-technical owner in plain everyday words. Use short headings and lists. Say clearly what you could not check (you have no web access) instead of making facts up. Under 350 words.`;

export async function runTask(env, b, w) {
  const builds = w.kind === 'engineering';
  const ans = await ask(env, [{ role: 'system', content: RUN_SYSTEM(b) }, { role: 'user', content: `${w.title}\n\n${w.body}` }], { maxTokens: 700 });
  if (!ans) return { ok: false, result: '', verified: 'Not done: the assistant is not connected right now. Nothing was spent.' };
  const verified = [
    'Written by the assistant. It cannot look things up online, so please check names, prices and numbers yourself.',
    builds ? 'Not put online yet: this is the plan for it.' : null,
  ].filter(Boolean).join(' ');
  return { ok: true, result: String(ans.text).slice(0, 6000), verified };
}

export { SPEND };
