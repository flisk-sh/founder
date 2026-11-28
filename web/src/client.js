// The founder API as the page sees it: one fetch helper that turns error codes into plain words, plus the small formatters.
export const money = (n) => '$' + Number(n || 0).toFixed(2).replace(/\.00$/, '');
export const ERR = {
  name_invalid: 'Use only small letters, numbers and dashes, like marios-pizza.', name_reserved: 'That name is not available. Please pick another.',
  name_taken: 'Someone already uses that name. Please pick another.', name_held: 'That name is not available for 30 more days. Please pick another.', limit_reached: 'You can have up to 3 businesses for now.',
  north_star_missing: 'First fill in “How we measure success”.', over_cap: 'This costs more than your monthly limit. Raise the limit, or say no to it.',
  approval_mismatch: 'This job changed. Please look at it again.', business_stopped: 'Everything is stopped. Press Start first.', not_started: 'Press Start first.',
  confirm_name: 'Type the name exactly as shown.', cap_invalid: 'A limit can be from $0 to $10,000.', work_invalid: 'Write what the job is, and a cost from $0 to $1,000.', idea_short: 'Please write a few more words.',
};
export async function call(path, method = 'GET', body) {
  const r = await fetch(path, {method, headers: body ? {'content-type': 'application/json'} : {}, body: body ? JSON.stringify(body) : undefined});
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) { location.href = '/auth/start'; throw new Error('Please sign in.'); }
  if (!r.ok) throw new Error(ERR[j.error] || j.error || 'Something went wrong. Please try again.');
  return j;
}
export const nJobs = (n) => n + (n === 1 ? ' job' : ' jobs');
export const SPEND_LABEL = {llm: 'Assistant', ads: 'Advertising', infra: 'Web page', mail: 'Emails'};
