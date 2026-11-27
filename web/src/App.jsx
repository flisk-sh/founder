import {useCallback, useEffect, useRef, useState} from 'react';
import {HStack, VStack} from '@astryxdesign/core/Layout';
import {Card} from '@astryxdesign/core/Card';
import {Badge} from '@astryxdesign/core/Badge';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Icon} from '@astryxdesign/core/Icon';
import {Text, Heading} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {TextArea} from '@astryxdesign/core/TextArea';
import {ProgressBar} from '@astryxdesign/core/ProgressBar';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Markdown} from '@astryxdesign/core/Markdown';
import {Collapsible} from '@astryxdesign/core/Collapsible';
import {Avatar} from '@astryxdesign/core/Avatar';
import {IconButton} from '@astryxdesign/core/IconButton';
import {
  ArrowDownTrayIcon, ArrowRightIcon, ArrowUpIcon, BanknotesIcon, BoltIcon, BuildingStorefrontIcon, ChartBarIcon, ChatBubbleLeftRightIcon, CheckCircleIcon,
  CheckIcon, ClipboardDocumentListIcon, ClockIcon, EnvelopeIcon, ExclamationTriangleIcon, GlobeAltIcon, LightBulbIcon, LockClosedIcon, PlayIcon,
  PlusIcon, ShieldCheckIcon, SparklesIcon, StopIcon, TrashIcon, XMarkIcon,
} from '@heroicons/react/24/outline';

// founder.flisk.si cabinet. Founder drafts and proposes; the owner approves every task and every dollar.
const ic = (I) => <Icon icon={I} size="sm" />;
const money = (n) => '$' + Number(n || 0).toFixed(2).replace(/\.00$/, '');
const ago = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };
const ERR = {
  name_invalid: 'Use only small letters, numbers and dashes, like marios-pizza.', name_reserved: 'That name is not available. Please pick another.',
  name_taken: 'Someone already uses that name. Please pick another.', name_held: 'That name is not available for 30 more days. Please pick another.', limit_reached: 'You can have up to 3 businesses for now.',
  north_star_missing: 'First fill in “How we measure success”.', over_cap: 'This costs more than your monthly limit. Raise the limit, or say no to it.',
  approval_mismatch: 'This job changed. Please look at it again.', business_stopped: 'Everything is stopped. Press Start first.', not_started: 'Press Start first.',
  confirm_name: 'Type the name exactly as shown.', cap_invalid: 'A limit can be from $0 to $10,000.', work_invalid: 'Write what the job is, and a cost from $0 to $1,000.', idea_short: 'Please write a few more words.',
};
async function call(path, method = 'GET', body) {
  const r = await fetch(path, {method, headers: body ? {'content-type': 'application/json'} : {}, body: body ? JSON.stringify(body) : undefined});
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) { location.href = '/auth/start'; throw new Error('Please sign in.'); }
  if (!r.ok) throw new Error(ERR[j.error] || j.error || 'Something went wrong. Please try again.');
  return j;
}
const path = () => location.pathname.replace(/\/+$/, '');
const STATUS = {active: ['success', 'Working'], paused: ['neutral', 'Not started'], stopped: ['error', 'Stopped']};
// What each logged action means, in plain words.
const DID = {created: 'Plan made', approved: 'You said yes', rejected: 'You said no', started: 'Started', stopped: 'Stopped', done: 'Done', failed: 'Did not work', running: 'Working on it', caps: 'Limits changed', settings: 'Details changed', proposed: 'New job suggested', deleted: 'Deleted'};
const SPEND_LABEL = {llm: 'Assistant', ads: 'Advertising', infra: 'Web page', mail: 'Emails'};
const KIND_ICON = {engineering: BoltIcon, research: LightBulbIcon, growth: ChartBarIcon, ops: ClipboardDocumentListIcon};

// ---------- signed out ----------
function Landing() {
  const steps = [
    [LightBulbIcon, '1. Tell us about your business', 'A sentence is enough, like “a family pizzeria near the station”. You get a plan, a simple web page and the first jobs.'],
    [ShieldCheckIcon, '2. Say yes or no', 'Every job shows what it costs. Nothing is done, paid, sent or put online until you say yes.'],
    [ChartBarIcon, '3. See how it goes', 'One simple number shows if it is working, like tables booked each week.'],
  ];
  const trust = ['Nothing happens without your yes', 'You set a monthly limit', 'One big STOP button', 'See everything it did', 'Never posts or emails on its own'];
  return (
    <div style={{height: '100%', overflow: 'auto'}}>
      <div className="hero">
        <VStack gap={4} align="center">
          <Badge label="Free to try" variant="blue" icon={ic(SparklesIcon)} />
          <h1>A helper for your business that always asks first</h1>
          <Text color="secondary">For restaurants, cafés, shops and new ideas. It writes a plan, makes a simple web page and does only the jobs you say yes to. You stay in charge of every step and every dollar.</Text>
          <Button label="Sign in to start" variant="primary" size="lg" href="/auth/start" icon={ic(ArrowRightIcon)} />
          <HStack gap={2} wrap="wrap" hAlign="center">{trust.map((t) => <Badge key={t} label={t} icon={ic(CheckIcon)} />)}</HStack>
        </VStack>
      </div>
      <div className="promise">
        {steps.map(([I, t, d]) => <Card key={t}><VStack gap={2}><span className="chip-ic"><Icon icon={I} size="md" /></span><Heading level={3}>{t}</Heading><Text color="secondary">{d}</Text></VStack></Card>)}
      </div>
    </div>
  );
}

// ---------- onboarding ----------
const EXAMPLES = ['A family Italian restaurant in the old town', 'A bakery that delivers fresh bread every morning', 'Lunch boxes for offices nearby', 'A small café with live music on Fridays'];
function Onboard({onCreated}) {
  const [idea, setIdea] = useState(''), [name, setName] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [tick, setTick] = useState(0);
  useEffect(() => { if (!busy) return; const t = setInterval(() => setTick((x) => x + 1), 900); return () => clearInterval(t); }, [busy]);
  const STEPS = ['Reading what you wrote', 'Writing a short description', 'Choosing how to measure success', 'Making a simple web page', 'Planning the first jobs'];
  const go = async (e) => {
    e?.preventDefault(); setBusy(true); setErr(''); setTick(0);
    try { const j = await call('/api/onboard', 'POST', {idea, ...(name.trim() ? {name: name.trim().toLowerCase()} : {})}); onCreated(j.id); } catch (x) { setErr(x.message); setBusy(false); }
  };
  if (busy) return (
    <div className="page narrow"><Card><VStack gap={4}>
      <HStack gap={2} align="center"><Avatar name="Founder" size="small" /><Heading level={2}>Making your plan</Heading></HStack>
      <ProgressBar label="Making your plan" isLabelHidden isIndeterminate />
      <VStack gap={2}>{STEPS.map((s, i) => <HStack key={s} gap={2} align="center"><Icon icon={i < Math.min(tick, STEPS.length) ? CheckCircleIcon : ClockIcon} size="sm" /><Text color={i < tick ? 'primary' : 'secondary'}>{s}</Text></HStack>)}</VStack>
      <Text type="supporting" color="secondary">Nothing is put online, sent or paid. You check everything next.</Text>
    </VStack></Card></div>
  );
  return (
    <div className="page narrow"><form onSubmit={go}><VStack gap={5}>
      <VStack gap={2}><Heading level={1}>Tell us about your business</Heading><Text color="secondary">A sentence or two is enough. You will check everything before anything happens.</Text></VStack>
      {err && <Banner status="error" title={err} />}
      <Card><VStack gap={3}>
        <TextArea label="Your business" isLabelHidden value={idea} onChange={setIdea} rows={3} placeholder="For example: a family pizzeria near the train station" />
        <HStack gap={2} wrap="wrap">{EXAMPLES.map((x) => <Button key={x} label={x} size="sm" variant="secondary" onClick={() => setIdea(x)} />)}</HStack>
        <Collapsible trigger={<Text type="supporting" color="secondary">Choose a short name yourself (you can skip this)</Text>}>
          <div style={{maxWidth: 320, paddingTop: 8}}><TextInput label="Name" value={name} onChange={setName} placeholder="marios-pizza" description="Used for your web address, like marios-pizza.app.flisk.si" /></div>
        </Collapsible>
        <HStack gap={3} align="center" wrap="wrap"><Button label="Make my plan" variant="primary" size="lg" type="submit" isDisabled={idea.trim().length < 8} icon={ic(SparklesIcon)} />
          <Text type="supporting" color="secondary">Free · nothing goes online · nothing is paid</Text></HStack>
      </VStack></Card>
    </VStack></form></div>
  );
}

// ---------- business pieces ----------
function TaskRow({w, act}) {
  const [open, setOpen] = useState(false);
  const st = {proposed: null, approved: ['You said yes', 'blue'], running: ['Working…', 'blue'], done: ['Done', 'success'], failed: ['Did not work', 'error'], rejected: ['You said no', 'neutral'], cancelled: ['Stopped', 'neutral']}[w.status];
  const hasMore = w.body || w.result || w.verified;
  return (
    <div className={'task ' + w.status}>
      <div className="task-line">
        <span className="chip-ic sm"><Icon icon={KIND_ICON[w.kind] || BoltIcon} size="sm" /></span>
        <button className="task-title" onClick={() => setOpen(!open)} disabled={!hasMore}>{w.title}</button>
        <span className="cost">{money(w.cost_usd)}</span>
        {w.status === 'proposed' && <span className="task-act">
          <Button label="Yes" icon={ic(CheckIcon)} size="sm" variant="primary" onClick={() => act('/api/work/' + w.id + '/approve', 'POST', {hash: w.hash}, 'You said yes')} />
          <Button label="No" size="sm" variant="secondary" onClick={() => act('/api/work/' + w.id + '/reject', 'POST', {}, 'You said no')} /></span>}
        {w.status === 'approved' && <Button label="Do it now" size="sm" variant="secondary" icon={ic(PlayIcon)} onClick={() => act('/api/work/' + w.id + '/run', 'POST', {}, 'Done')} />}
        {st && w.status !== 'approved' && <Badge label={st[0]} variant={st[1]} />}
      </div>
      {open && <div className="task-more">
        {w.body && <Text type="supporting" color="secondary">{w.body}</Text>}
        {w.result && <div className="result"><Markdown density="compact">{w.result}</Markdown></div>}
        {w.verified && <Text type="supporting"><b>Good to know:</b> {w.verified}</Text>}
        <Text type="supporting" color="secondary">Suggested by {w.source === 'owner' ? 'you' : 'your assistant'} · costs at most {money(w.cost_usd)}</Text>
      </div>}
    </div>
  );
}

function Stats({d}) {
  const b = d.business, total = Math.max(0, Object.values(d.spent).reduce((a, c) => a + c, 0)), capTotal = Object.values(d.caps).reduce((a, c) => a + c, 0);
  const done = d.work.filter((w) => w.status === 'done').length;
  return (
    <div className="stats">
      <div><small>Your goal</small><b>0</b><span>{b.north_star || 'not set yet'}</span></div>
      <div><small>Jobs done</small><b>{done}</b><span>of {d.work.length}</span></div>
      <div><small>Spent this month</small><b>{money(total)}</b><span>limit {money(capTotal)}</span></div>
      <div><small>Money in</small><b>$0</b><span>no sales yet</span></div>
    </div>
  );
}

function Queue({d, act, run}) {
  const by = (st) => d.work.filter((w) => st.includes(w.status)).sort((x, y) => x.created - y.created);
  const waiting = by(['proposed']), queued = by(['approved', 'running']), done = by(['done', 'failed']), closed = by(['rejected', 'cancelled']);
  const sum = waiting.reduce((a, w) => a + w.cost_usd, 0);
  const [adding, setAdding] = useState(false), [showClosed, setShowClosed] = useState(false);
  const approveAll = () => run(async () => { for (const w of waiting) await call('/api/work/' + w.id + '/approve', 'POST', {hash: w.hash}); }, `You said yes to ${waiting.length} jobs`);
  return (
    <div className="queue">
      <div className="queue-head">
        <Text type="emphasized">{waiting.length ? `${waiting.length} jobs need your answer` : 'Nothing needs your answer'}</Text>
        {waiting.length > 1 && <Button label="Yes to all" size="sm" variant="primary" icon={ic(CheckIcon)} onClick={approveAll} />}
        <span style={{flex: 1}} />
        <Button label="Add a job" icon={ic(PlusIcon)} size="sm" variant="ghost" onClick={() => setAdding(!adding)} />
      </div>
      {adding && <ProposeForm d={d} act={act} onDone={() => setAdding(false)} />}
      {waiting.map((w) => <TaskRow key={w.id} w={w} act={act} />)}
      {queued.length > 0 && <div className="queue-sub">You said yes · starts when you press Start</div>}
      {queued.map((w) => <TaskRow key={w.id} w={w} act={act} />)}
      {done.length > 0 && <div className="queue-sub">Done</div>}
      {done.map((w) => <TaskRow key={w.id} w={w} act={act} />)}
      {closed.length > 0 && <button className="queue-sub link" onClick={() => setShowClosed(!showClosed)}>{showClosed ? 'Hide' : 'Show'} {closed.length} you said no to</button>}
      {showClosed && closed.map((w) => <TaskRow key={w.id} w={w} act={act} />)}
    </div>
  );
}

function ProposeForm({d, act, onDone}) {
  const [title, setTitle] = useState(''), [cost, setCost] = useState('1'), kind = 'research';
  const add = async (e) => { e.preventDefault(); if (await act('/api/businesses/' + d.business.id + '/work', 'POST', {title, body: '', kind, spend_kind: 'llm', cost_usd: Number(cost)}, 'Added')) onDone(); };
  return (
    <form onSubmit={add} className="add-row">
      <div style={{flex: 1, minWidth: 200}}><TextInput label="New job" value={title} onChange={setTitle} placeholder="For example: write a summer menu" /></div>
      <div style={{width: 110}}><TextInput label="Up to $" type="number" value={cost} onChange={setCost} /></div>
      <Button label="Add" size="sm" variant="primary" type="submit" isDisabled={!title.trim()} />
    </form>
  );
}

function Website({d}) {
  const b = d.business, [html, setHtml] = useState('');
  useEffect(() => { fetch('/app/b/' + b.id + '/preview').then((r) => (r.ok ? r.text() : '')).then(setHtml).catch(() => setHtml('')); }, [b.id, d.draft?.headline]);
  if (!d.draft) return <div className="browser empty"><Text color="secondary">No web page yet.</Text></div>;
  return (
    <div className="browser"><div className="browser-bar"><span /><span /><span /><em>{b.name}.app.flisk.si</em><b>Draft · not online yet</b></div>
      <iframe title={'Landing page draft for ' + b.name} srcDoc={html} sandbox="" referrerPolicy="no-referrer" /></div>
  );
}

function Activity({d}) {
  return (
    <div className="acts">{d.audit.map((a, i) => <div key={i} className="act"><StatusDot variant={a.action === 'failed' || a.action === 'stopped' ? 'error' : a.action === 'done' || a.action === 'approved' ? 'success' : 'neutral'} label={a.action} />
      <span><b>{DID[a.action] || a.action}</b> {a.detail} <em>{ago(a.at)}</em></span></div>)}</div>
  );
}

function Settings({d, act, onDeleted}) {
  const b = d.business;
  const [caps, setCaps] = useState(Object.fromEntries(Object.entries(d.caps).map(([k, v]) => [k, String(v)])));
  const [oneLiner, setOneLiner] = useState(b.one_liner), [ns, setNs] = useState(b.north_star), [confirm, setConfirm] = useState(''), [err, setErr] = useState(''), [deleting, setDeleting] = useState(false);
  const del = async () => { setErr(''); try { await call('/api/businesses/' + b.id, 'DELETE', {confirm}); onDeleted(); } catch (x) { setErr(x.message); } };
  const dirty = oneLiner !== b.one_liner || ns !== b.north_star || Object.keys(caps).some((k) => Number(caps[k]) !== d.caps[k]);
  const save = async () => {
    if (oneLiner !== b.one_liner || ns !== b.north_star) await act('/api/businesses/' + b.id + '/settings', 'PUT', {one_liner: oneLiner, north_star: ns}, 'Saved');
    if (Object.keys(caps).some((k) => Number(caps[k]) !== d.caps[k])) await act('/api/businesses/' + b.id + '/caps', 'PUT', Object.fromEntries(Object.entries(caps).map(([k, v]) => [k, Number(v)])), 'Saved');
  };
  return (
    <div className="controls">
      <div className="ctl-row two">
        <TextInput label="What you do, in one sentence" value={oneLiner} onChange={setOneLiner} size="sm" />
        <TextInput label="How we measure success" placeholder="Tables booked each week" value={ns} onChange={setNs} size="sm" />
      </div>
      <div className="ctl-row caps">{Object.keys(SPEND_LABEL).map((k) => <div key={k}><TextInput label={SPEND_LABEL[k] + ' · limit $'} type="number" value={caps[k]} onChange={(v) => setCaps({...caps, [k]: v})} size="sm" />
        <ProgressBar label={'used ' + money(Math.max(0, d.spent[k]))} isLabelHidden value={Math.max(0, d.spent[k])} max={Number(caps[k]) || 1} /></div>)}</div>
      <div className="ctl-foot">
        <Button label="Save" size="sm" variant="primary" isDisabled={!dirty} onClick={save} />
        <Text type="supporting" color="secondary">It never spends more than these monthly limits. 0 means never.</Text>
        <span style={{flex: 1}} />
        <Button label="Download my data" size="sm" variant="ghost" icon={ic(ArrowDownTrayIcon)} href={'/api/businesses/' + b.id + '/export'} />
        <Button label="Delete" size="sm" variant="ghost" icon={ic(TrashIcon)} onClick={() => setDeleting(!deleting)} />
      </div>
      {deleting && <div className="ctl-foot danger">
        <div style={{flex: 1}}><TextInput label={'To delete everything for good, type ' + b.name} value={confirm} onChange={setConfirm} size="sm" /></div>
        <Button label="Delete forever" size="sm" variant="destructive" isDisabled={confirm !== b.name} onClick={del} />
        {err && <Text color="error">{err}</Text>}
      </div>}
    </div>
  );
}

function Chat({d, reload}) {
  const [text, setText] = useState(''), [busy, setBusy] = useState(false), [pending, setPending] = useState(''), end = useRef(null);
  useEffect(() => { end.current?.scrollIntoView({block: 'end'}); }, [d.messages.length, pending]);
  const send = async (e) => {
    e?.preventDefault(); const t = text.trim(); if (!t || busy) return;
    setBusy(true); setPending(t); setText('');
    try { await call('/api/businesses/' + d.business.id + '/chat', 'POST', {text: t}); await reload(); } catch (x) { setText(t); alert(x.message); } finally { setBusy(false); setPending(''); }
  };
  return (
    <div className="chat">
      <HStack gap={2} align="center" style={{padding: '12px 14px', borderBottom: '1px solid var(--color-border, #8883)'}}><Avatar name="Assistant" size="small" /><VStack gap={0}><Text type="emphasized">Your assistant</Text><Text type="supporting" color="secondary">Suggests jobs, never acts on its own</Text></VStack></HStack>
      <div className="chat-log">
        {d.messages.map((m, i) => <div key={i} className={'msg ' + m.role}>{m.role === 'assistant' ? <Markdown density="compact">{m.content}</Markdown> : m.content}</div>)}
        {pending && <><div className="msg user">{pending}</div><div className="msg assistant"><Text color="secondary">Writing…</Text></div></>}
        <div ref={end} />
      </div>
      <form onSubmit={send} className="chat-in">
        <TextArea label="Message your assistant" isLabelHidden value={text} onChange={setText} rows={2} placeholder="Ask a question, or say “write a summer menu”" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <Button label="Send" variant="primary" type="submit" isDisabled={busy || !text.trim()} icon={ic(ArrowUpIcon)} />
      </form>
    </div>
  );
}

function Business({id, onChange, onDeleted}) {
  const [d, setD] = useState(null), [msg, setMsg] = useState(null), [busy, setBusy] = useState(false);
  const load = useCallback(() => call('/api/businesses/' + id).then(setD).catch((x) => setMsg({status: 'error', title: x.message})), [id]);
  useEffect(() => { setD(null); load(); }, [load]);
  const run = async (fn, ok) => { setMsg(null); setBusy(true); try { await fn(); setMsg({status: 'success', title: ok}); await load(); onChange(); } catch (x) { setMsg({status: 'error', title: x.message}); await load(); } finally { setBusy(false); } };
  const act = async (url, method, body, ok) => {
    setMsg(null); setBusy(true);
    try { const j = await call(url, method, body); setMsg({status: 'success', title: j.note ? ok + '. ' + j.note : j.status === 'failed' ? 'It did not work. Open the job to see why.' : ok}); await load(); onChange(); return true; }
    catch (x) { setMsg({status: 'error', title: x.message}); return false; } finally { setBusy(false); }
  };
  if (!d) return <div className="page">{msg ? <Banner {...msg} /> : <Text color="secondary">Loading…</Text>}</div>;
  const b = d.business, [dot, label] = STATUS[b.status] || STATUS.paused, waiting = d.work.filter((w) => w.status === 'proposed').length;
  return (
    <div className="desk">
      <div className="desk-head">
        <Heading level={2}>{b.name}</Heading>
        <Badge label={label} variant={b.status === 'active' ? 'success' : b.status === 'stopped' ? 'error' : 'neutral'} icon={<StatusDot variant={dot} label={label} />} />
        <Text color="secondary" className="one">{b.one_liner || ''}</Text>
        <span style={{flex: 1}} />
        {b.status === 'active'
          ? <Button label="STOP everything" size="sm" variant="destructive" icon={ic(StopIcon)} isDisabled={busy} onClick={() => act('/api/businesses/' + b.id + '/stop', 'POST', {}, 'Stopped. Nothing else will happen.')} />
          : <Button label={waiting ? 'Start' : 'Start'} size="sm" variant="primary" icon={ic(PlayIcon)} isDisabled={busy} onClick={() => act('/api/businesses/' + b.id + '/start', 'POST', {}, 'Started. The jobs you said yes to will now be done.')} />}
      </div>
      {msg && <Banner {...msg} isDismissable onDismiss={() => setMsg(null)} />}
      {busy && <ProgressBar label="Working" isLabelHidden isIndeterminate />}
      <Stats d={d} />
      {/* Everything on one screen: tasks | site, settings, activity | chat. Only a pane scrolls, never the page. */}
      <div className="desk-grid">
        <section className="pane left"><Queue d={d} act={act} run={run} /><div className="pane-sub"><small>What happened</small><Activity d={d} /></div></section>
        <section className="pane mid">
          <Website d={d} />
          <Settings key={JSON.stringify(d.caps) + b.one_liner + b.north_star} d={d} act={act} onDeleted={onDeleted} />
        </section>
        <aside className="pane chat-pane"><Chat d={d} reload={load} /></aside>
      </div>
    </div>
  );
}

// ---------- shell ----------
function Safety() {
  const rules = [
    [ShieldCheckIcon, 'Nothing without your yes', 'Your assistant only suggests. You say yes to each job, email, advert and web page. If a job changes, it asks you again.'],
    [BanknotesIcon, 'Monthly limits', 'You choose the most it may spend each month. It can never go over. Advertising and emails start at $0, so they are off until you turn them on.'],
    [StopIcon, 'One big STOP button', 'Press it and everything stops at once.'],
    [ExclamationTriangleIcon, 'Honest answers', 'Every finished job tells you what it could not check. Nothing is called done when it is not.'],
    [LockClosedIcon, 'Only you can see it', 'Your business is private. Nobody else can open it.'],
    [GlobeAltIcon, 'Your name stays yours', 'If you delete a business, nobody else can take its name for 30 days.'],
    [ArrowDownTrayIcon, 'Your data, your choice', 'Download everything or delete it at any time.'],
  ];
  return <div className="page narrow"><VStack gap={4}><Heading level={1}>How we keep you safe</Heading>{rules.map(([I, t, d]) => <Card key={t}><HStack gap={3} align="start"><span className="chip-ic"><Icon icon={I} size="md" /></span><VStack gap={1}><Heading level={3}>{t}</Heading><Text color="secondary">{d}</Text></VStack></HStack></Card>)}</VStack></div>;
}

export default function App() {
  const [me, setMe] = useState(undefined), [p, setP] = useState(path());
  const loadMe = useCallback(() => fetch('/api/me').then((r) => (r.ok ? r.json() : null)).then(setMe).catch(() => setMe(null)), []);
  useEffect(() => { loadMe(); const f = () => setP(path()); addEventListener('popstate', f); return () => removeEventListener('popstate', f); }, [loadMe]);
  const go = (to) => { history.pushState(null, '', to); setP(to); };
  if (me === undefined) return <div className="page"><Text color="secondary">Loading…</Text></div>;
  if (!me) return <Landing />;
  const bid = (p.match(/^\/app\/b\/([\w-]+)$/) || [])[1];
  const firstId = me.businesses[0]?.id;
  const shownId = bid || (p !== '/app/new' && p !== '/app/safety' ? firstId : '');
  const view = p === '/app/safety' ? <Safety />
    : shownId ? <Business key={shownId} id={shownId} onChange={loadMe} onDeleted={async () => { await loadMe(); go('/app'); }} />
    : <Onboard onCreated={async (id) => { await loadMe(); go('/app/b/' + id); }} />;
  // One thin bar instead of a side nav: with up to 3 businesses a sidebar is mostly empty space.
  const current = me.businesses.find((b) => b.id === shownId);
  return (
    <div className="app">
      <header className="topbar">
        <span className="brand"><Icon icon={ShieldCheckIcon} size="sm" /></span>
        <b className="topbar-name">Founder</b>
        {me.businesses.length > 0 && <label className="switch" title="Switch business">
          {current && <StatusDot variant={(STATUS[current.status] || STATUS.paused)[0]} label={(STATUS[current.status] || STATUS.paused)[1]} />}
          <select aria-label="Business" value={shownId || ''} onChange={(e) => go('/app/b/' + e.target.value)}>
            {!shownId && <option value="">Your businesses</option>}
            {me.businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select></label>}
        {me.businesses.length < 3 && <Button label="Add a business" size="sm" variant={p === '/app/new' ? 'primary' : 'ghost'} icon={ic(PlusIcon)} onClick={() => go('/app/new')} />}
        <span style={{flex: 1}} />
        <button className="topbar-link" onClick={() => go('/app/safety')}><Icon icon={LockClosedIcon} size="sm" /><span>How we keep you safe</span></button>
        <span className="topbar-user"><Avatar name={me.user.login} size="small" /><span data-flisk-login="">{me.user.login}</span><a href="/auth/out">Sign out</a></span>
      </header>
      <main className="app-main">{view}</main>
    </div>
  );
}
