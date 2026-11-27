// The founder brain: turns an idea into a company draft, answers chat about the business, and does approved tasks.
// Everything it makes is a proposal or a draft. Model output is data: clamped, typed, and never run or served as HTML.
import { ask, firstJson } from './model.js';
import { KINDS, SPEND } from './policy.js';

const s = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const words = (t) => s(t, 400).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(' ').filter((w) => w.length > 2);
const STOP = new Set(['the', 'and', 'for', 'with', 'that', 'app', 'tool', 'who', 'your', 'from', 'want', 'make', 'build', 'help', 'helps', 'into', 'their', 'small', 'simple', 'online']);

// A name to suggest from the idea: two strong words, ascii, 3-31 chars.
export function suggestName(idea) {
  const w = words(idea).filter((x) => !STOP.has(x)).slice(0, 2);
  const n = (w.join('-') || 'my-business').replace(/[^a-z0-9-]/g, '').slice(0, 31).replace(/-+$/, '');
  return /^[a-z]/.test(n) && n.length >= 3 ? n : 'biz-' + n.slice(0, 26);
}

function cleanTask(t) {
  const title = s(t?.title, 120);
  if (!title) return null;
  const kind = KINDS.includes(t?.kind) ? t.kind : 'research';
  // A first-week task from the brain never spends on ads or mail: those need the owner to set a cap and ask.
  const spend_kind = ['llm', 'infra'].includes(t?.spend_kind) ? t.spend_kind : 'llm';
  const cost = Math.min(5, Math.max(0, Math.round(Number(t?.cost_usd) * 100) / 100 || 0.5));
  return { kind, title, body: s(t?.body, 600), spend_kind, cost_usd: cost };
}
function cleanLanding(l, fallbackName) {
  const bullets = (Array.isArray(l?.bullets) ? l.bullets : []).map((b) => s(b, 120)).filter(Boolean).slice(0, 3);
  return { headline: s(l?.headline, 90) || fallbackName, sub: s(l?.sub, 200), bullets, cta: s(l?.cta, 30) || 'Join the waitlist' };
}

const ONBOARD_SYSTEM = `You are the co-founder of a tiny new internet business. From the founder's idea, answer ONLY with JSON:
{"one_liner": "<=100 chars, what it does for whom", "vision": "3 short sentences: mission, what we build, where we head",
"north_star": "<=40 chars, ONE number that proves people want it, e.g. Paying customers",
"landing": {"headline": "<=70 chars", "sub": "<=160 chars", "bullets": ["3 concrete benefits"], "cta": "<=24 chars"},
"tasks": [5 items {"kind": "engineering|research|growth|ops", "title": "<=90 chars, verb first", "body": "2 lines: what done looks like", "spend_kind": "llm|infra", "cost_usd": 0.1-3}]}
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

// No model reachable: a fixed playbook filled from the idea. The page says it is an offline draft.
export function offlineOnboard(idea, name = suggestName(idea)) {
  const what = s(idea, 100);
  return {
    offline: true, model: null, name, one_liner: what, north_star: 'Paying customers',
    vision: `We exist to make "${what}" simple and dependable. We start with one narrow group of buyers and learn from every one of them. We grow only on what customers prove they want.`,
    landing: { headline: what.charAt(0).toUpperCase() + what.slice(1), sub: 'Be first to try it. We are building it in the open and will write when it is ready.', bullets: ['Made for one job, done well', 'Your data stays yours', 'Talk to the people who build it'], cta: 'Join the waitlist' },
    tasks: [
      { kind: 'research', title: 'Name the first 50 buyers and where they talk', body: 'One narrow group, its job title, and 5 real places online they discuss this problem.', spend_kind: 'llm', cost_usd: 0.5 },
      { kind: 'research', title: 'Compare 4 alternatives people use today', body: 'What each costs, what users praise and complain about, and our one clear difference.', spend_kind: 'llm', cost_usd: 0.5 },
      { kind: 'engineering', title: 'Publish the landing page with a waitlist', body: 'The draft page live on the app address, with a form that stores emails with consent.', spend_kind: 'infra', cost_usd: 1 },
      { kind: 'growth', title: 'Draft 3 posts for the places buyers talk', body: 'Drafts only. You read and post them yourself.', spend_kind: 'llm', cost_usd: 0.3 },
      { kind: 'ops', title: 'Set the price to test first', body: 'One price, one plan, and the reason. No payment setup yet.', spend_kind: 'llm', cost_usd: 0.2 },
    ],
  };
}

const CHAT_SYSTEM = (b, tasks) => `You are the AI co-founder of "${b.name}": ${b.one_liner}. North star: ${b.north_star || 'not set'}.
Vision: ${b.vision || '-'}
Open tasks: ${tasks.map((t) => `[${t.status}] ${t.title}`).join('; ') || 'none'}.
You cannot spend, send, post or deploy anything: you can only PROPOSE a task, which the founder approves. Be short, concrete and honest; say when you do not know.
Answer ONLY with JSON: {"reply": "your answer, under 120 words", "propose": null or {"kind": "engineering|research|growth|ops", "title": "...", "body": "...", "spend_kind": "llm|infra", "cost_usd": 0.1-3}}`;

export async function chat(env, b, tasks, history, text) {
  const msgs = [{ role: 'system', content: CHAT_SYSTEM(b, tasks) }, ...history.slice(-10).map((m) => ({ role: m.role, content: m.content })), { role: 'user', content: s(text, 1000) }];
  const ans = await ask(env, msgs, { maxTokens: 500 });
  const j = ans ? firstJson(ans.text) : null;
  if (j?.reply) return { reply: s(j.reply, 1200), propose: j.propose ? cleanTask(j.propose) : null, offline: false };
  if (ans?.text) return { reply: s(ans.text, 1200), propose: null, offline: false };
  // Offline: the one useful thing without a model is turning the request into a proposed task.
  const want = /^(please |can you |could you |pls )?(add|build|make|write|create|research|find|draft|fix|set up)\b/i.test(s(text, 200));
  return {
    offline: true,
    reply: want ? 'No model is connected right now, so I turned your message into a proposed task. Approve it in Tasks when you are ready.' : 'No model is connected right now, so I cannot answer questions yet. Start a message with a verb (add, research, draft…) and I will turn it into a proposed task.',
    propose: want ? cleanTask({ kind: /research|find|compare/i.test(text) ? 'research' : 'engineering', title: s(text, 90), body: 'From chat.', spend_kind: 'llm', cost_usd: 0.5 }) : null,
  };
}

// Doing an approved task. Research and drafts are done by the model now; building and deploying needs fleet (not wired yet),
// so those come back as a plan plus an honest note of what was not done. `verified` always says what was really checked.
const RUN_SYSTEM = (b) => `You work for "${b.name}" (${b.one_liner}). Do the task below as well as you can in text: a research memo, a plan, copy or a spec.
Use short headings and lists. Say clearly what you could not check (you have no web access) instead of making facts up. Under 350 words.`;

export async function runTask(env, b, w) {
  const builds = w.kind === 'engineering';
  const ans = await ask(env, [{ role: 'system', content: RUN_SYSTEM(b) }, { role: 'user', content: `${w.title}\n\n${w.body}` }], { maxTokens: 700 });
  if (!ans) return { ok: false, result: '', verified: 'Not run: no model is connected. Nothing was spent; the reserved amount is released.' };
  const verified = [
    `Written by ${ans.model}. No web access: names, prices and numbers in it are not checked.`,
    builds ? 'Not built or deployed: building needs the fleet connection, which is not set up yet. This is the plan for it.' : null,
  ].filter(Boolean).join(' ');
  return { ok: true, result: String(ans.text).slice(0, 6000), verified };
}

export { SPEND };
