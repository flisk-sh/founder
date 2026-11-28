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
import {DropdownMenu} from '@astryxdesign/core/DropdownMenu';
import {ContextMenu} from '@astryxdesign/core/ContextMenu';
import {HoverCard} from '@astryxdesign/core/HoverCard';
import {Tooltip} from '@astryxdesign/core/Tooltip';
import {CommandPalette} from '@astryxdesign/core/CommandPalette';
import {createStaticSource} from '@astryxdesign/core/Typeahead';
import {Drawer, DrawerHeader} from '@astryxdesign/core/Drawer';
import {useToast} from '@astryxdesign/core/Toast';
import {Kbd} from '@astryxdesign/core/Kbd';
import {useHotkeys} from '@astryxdesign/core/hooks';
import {
  ArrowDownTrayIcon, ArrowRightIcon, ArrowUpIcon, BanknotesIcon, BoltIcon, BuildingStorefrontIcon, ChartBarIcon, ChatBubbleLeftRightIcon, CheckCircleIcon,
  CheckIcon, ClipboardDocumentListIcon, ClockIcon, EnvelopeIcon, ExclamationTriangleIcon, GlobeAltIcon, LightBulbIcon, LockClosedIcon, PlayIcon,
  PlusIcon, ShieldCheckIcon, SparklesIcon, StopIcon, TrashIcon, XMarkIcon, EllipsisHorizontalIcon, MagnifyingGlassIcon, PencilSquareIcon,
  ClipboardIcon, ChatBubbleOvalLeftIcon, ArrowsPointingOutIcon, InformationCircleIcon,
} from '@heroicons/react/24/outline';

// founder.flisk.si cabinet. Founder drafts and proposes; the owner approves every task and every dollar.
const ic = (I) => <Icon icon={I} size="sm" />;
const money = (n) => '$' + Number(n || 0).toFixed(2).replace(/\.00$/, '');
// Owner-facing log line: the stored record keeps the approval hash and spend kind; people only need the job.
const plain = (t) => String(t || '').replace(/\s*\(up to [^)]*\)/, '');
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
const nJobs = (n) => n + (n === 1 ? ' job' : ' jobs');
const STATUS = {active: ['success', 'Working'], paused: ['neutral', 'Not started'], stopped: ['error', 'Stopped']};
// What each logged action means, in plain words.
const siteUrl = (name) => (/\.flisk\.si$/.test(location.hostname) ? 'https://' + name + '.app.flisk.si' : '/s/' + name);
const DID = {unpublished: 'Taken offline', signup_removed: 'Email removed', created: 'Plan made', approved: 'You said yes', rejected: 'You said no', started: 'Started', stopped: 'Stopped', done: 'Done', failed: 'Did not work', running: 'Working on it', caps: 'Limits changed', settings: 'Details changed', proposed: 'New job suggested', deleted: 'Deleted'};
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
          <Text type="supporting" color="secondary">For now you sign in with a free GitHub account. Signing in with your email is coming soon.</Text>
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
function TaskRow({w, act, ask}) {
  const [open, setOpen] = useState(false);
  const st = {proposed: null, approved: ['You said yes', 'blue'], running: ['Working…', 'blue'], done: ['Done', 'green'], failed: ['Did not work', 'red'], rejected: ['You said no', 'neutral'], cancelled: ['Stopped', 'neutral']}[w.status];
  const yes = () => act('/api/work/' + w.id + '/approve', 'POST', {hash: w.hash}, 'You said yes to “' + w.title + '”');
  const no = () => act('/api/work/' + w.id + '/reject', 'POST', {}, 'You said no to “' + w.title + '”');
  const now = () => act('/api/work/' + w.id + '/run', 'POST', {}, 'Done: ' + w.title);
  const items = [
    ...(w.status === 'proposed' ? [{label: 'Yes, do this', icon: CheckIcon, onClick: yes}, {label: 'No, skip it', icon: XMarkIcon, onClick: no}, {type: 'divider'}] : []),
    ...(w.status === 'approved' ? [{label: 'Do it now', icon: PlayIcon, onClick: now}, {type: 'divider'}] : []),
    {label: 'Ask the assistant about it', icon: ChatBubbleOvalLeftIcon, onClick: () => ask('About the job “' + w.title + '”: ')},
    {label: open ? 'Hide details' : 'Show details', icon: InformationCircleIcon, onClick: () => setOpen(!open)},
    {label: 'Copy', icon: ClipboardIcon, onClick: () => navigator.clipboard?.writeText(w.title + (w.result ? '\n\n' + w.result : ''))},
  ];
  const card = <VStack gap={2} style={{maxWidth: 320, padding: 4}}>
    <Text type="emphasized">{w.title}</Text>
    {w.body && <Text type="supporting" color="secondary">{w.body}</Text>}
    <Text type="supporting">Costs at most <b>{money(w.cost_usd)}</b> · suggested by {w.source === 'owner' ? 'you' : 'your assistant'}</Text>
    <Text type="supporting" color="secondary">Right-click for more</Text>
  </VStack>;
  return (
    <ContextMenu label={'Actions for ' + w.title} items={items}>
      <div className={'task ' + w.status}>
        <div className="task-line">
          <span className="chip-ic sm"><Icon icon={KIND_ICON[w.kind] || BoltIcon} size="sm" /></span>
          <HoverCard content={card} placement="left" delay={350}>
            <button className="task-title" onClick={() => setOpen(!open)}>{w.title}</button>
          </HoverCard>
          <span className="cost">up to {money(w.cost_usd)}</span>
          {w.status === 'proposed' && <span className="task-act">
            <Button label="Yes" icon={ic(CheckIcon)} size="sm" variant="primary" onClick={yes} />
            <Button label="No" size="sm" variant="secondary" onClick={no} /></span>}
          {w.status === 'approved' && <Button label="Do it now" size="sm" variant="secondary" icon={ic(PlayIcon)} onClick={now} />}
          {st && w.status !== 'approved' && <Badge label={st[0]} variant={st[1]} />}
        </div>
        {open && <div className="task-more">
          {w.body && <Text type="supporting" color="secondary">{w.body}</Text>}
          {w.result && <div className="result"><Markdown density="compact">{w.result}</Markdown></div>}
          {w.verified && <Text type="supporting"><b>Good to know:</b> {w.verified}</Text>}
        </div>}
      </div>
    </ContextMenu>
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

function Queue({d, act, run, ask, adding, setAdding}) {
  const by = (st) => d.work.filter((w) => st.includes(w.status)).sort((x, y) => x.created - y.created);
  const waiting = by(['proposed']), queued = by(['approved', 'running']), done = by(['done', 'failed']), closed = by(['rejected', 'cancelled']);
  const sum = waiting.reduce((a, w) => a + w.cost_usd, 0);
  const [showClosed, setShowClosed] = useState(false);
  const approveAll = () => run(async () => { for (const w of waiting) await call('/api/work/' + w.id + '/approve', 'POST', {hash: w.hash}); }, `You said yes to ${nJobs(waiting.length)}`);
  return (
    <div className="queue">
      <div className="queue-head">
        <Text type="emphasized">{waiting.length ? `${nJobs(waiting.length)} ${waiting.length === 1 ? 'needs' : 'need'} your answer` : 'Nothing needs your answer'}</Text>
        {waiting.length > 1 && <Button label={`Yes to all (spend up to ${money(sum)})`} size="sm" variant="ghost" icon={ic(CheckIcon)} onClick={approveAll} />}
        <span style={{flex: 1}} />
        <Tooltip content="Add a job"><span><IconButton label="Add a job" icon={<Icon icon={PlusIcon} size="sm" />} size="sm" variant="secondary" onClick={() => setAdding(!adding)} /></span></Tooltip>
      </div>
      {adding && <ProposeForm d={d} act={act} onDone={() => setAdding(false)} />}
      {waiting.map((w) => <TaskRow key={w.id} w={w} act={act} ask={ask} />)}
      {queued.length > 0 && <div className="queue-sub">You said yes · starts when you press Start</div>}
      {queued.map((w) => <TaskRow key={w.id} w={w} act={act} ask={ask} />)}
      {done.length > 0 && <div className="queue-sub">Done</div>}
      {done.map((w) => <TaskRow key={w.id} w={w} act={act} ask={ask} />)}
      {closed.length > 0 && <button className="queue-sub link" onClick={() => setShowClosed(!showClosed)}>{showClosed ? 'Hide' : 'Show'} {closed.length} you said no to</button>}
      {showClosed && closed.map((w) => <TaskRow key={w.id} w={w} act={act} ask={ask} />)}
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

function Website({d, big}) {
  const b = d.business, [html, setHtml] = useState('');
  useEffect(() => { fetch('/app/b/' + b.id + '/preview').then((r) => (r.ok ? r.text() : '')).then(setHtml).catch(() => setHtml('')); }, [b.id, d.draft?.headline]);
  if (!d.draft) return <div className="browser empty"><Text color="secondary">No web page yet.</Text></div>;
  return (
    <div className={'browser' + (big ? ' big' : '')}><div className="browser-bar"><span /><span /><span /><em>{b.name}.app.flisk.si</em><b>{d.site?.published ? 'Online' : 'Draft · not online yet'}</b></div>
      <iframe title={'Web page draft for ' + b.name} srcDoc={html} sandbox="" referrerPolicy="no-referrer" /></div>
  );
}

// Bottom panel: collapsed to a thin bar; drag it up (or click) to see visits as a heatmap, 12 weeks by weekday.
function VisitsPanel({d}) {
  const [h, setH] = useState(34), drag = useRef(null);
  const site = d.site || {days: []}, by = Object.fromEntries((site.days || []).map((x) => [x.day, x.n]));
  const max = Math.max(1, ...Object.values(by)), today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const wd = (today.getUTCDay() + 6) % 7, start = today.getTime() - (11 * 7 + wd) * 864e5, weeks = [];
  for (let w = 0; w < 12; w++) weeks.push(Array.from({length: 7}, (_, k) => { const t = start + (w * 7 + k) * 864e5, key = new Date(t).toISOString().slice(0, 10); return {key, n: by[key] || 0, future: t > today.getTime()}; }));
  const best = Object.entries(by).sort((a, b) => b[1] - a[1])[0];
  const down = (e) => { drag.current = {y: e.clientY, h, moved: false}; e.currentTarget.setPointerCapture(e.pointerId); };
  const move = (e) => { const g = drag.current; if (!g) return; const dy = g.y - e.clientY; if (Math.abs(dy) > 3) g.moved = true; setH(Math.min(Math.round(innerHeight * 0.6), Math.max(34, g.h + dy))); };
  const up = () => { const g = drag.current; drag.current = null; if (g && !g.moved) setH((x) => (x > 40 ? 34 : 260)); };
  return (
    <section className="visits-panel" style={{height: h}} aria-label="Visitors">
      <div className="vp-bar" role="button" tabIndex={0} aria-expanded={h > 40} onPointerDown={down} onPointerMove={move} onPointerUp={up}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setH((x) => (x > 40 ? 34 : 260)))}>
        <span className="vp-grip" /> <b>Visitors</b> <span>{site.visits_week || 0} this week · {site.visits_total || 0} in total · {(site.signups || []).length} left their email</span>
        <em>{h > 40 ? 'drag down or click to close' : 'drag up or click to see the map'}</em>
      </div>
      {h > 40 && <div className="vp-body">
        <div className="heat" role="img" aria-label="Visits per day over the last 12 weeks">
          <div className="heat-days">{['Mon', '', 'Wed', '', 'Fri', '', 'Sun'].map((x, i) => <span key={i}>{x}</span>)}</div>
          {weeks.map((col, i) => <div key={i} className="heat-col">{col.map((c) => <Tooltip key={c.key} content={`${c.key}: ${c.n} visit${c.n === 1 ? '' : 's'}`}><span className={'cell' + (c.future ? ' future' : '')} style={{'--v': c.n ? 0.2 + 0.8 * c.n / max : 0}} /></Tooltip>)}</div>)}
        </div>
        <dl className="nums">
          <dt>Busiest day</dt><dd>{best ? `${best[0]} (${best[1]})` : 'no visits yet'}</dd>
          <dt>Web page</dt><dd>{site.published ? 'online' : 'not online yet'}</dd>
          <dt>Counted how</dt><dd><em>page opens per day, no cookies, no personal data</em></dd>
        </dl>
      </div>}
    </section>
  );
}

function Activity({d}) {
  return (
    <div className="acts">{d.audit.map((a, i) => <div key={i} className="act"><StatusDot variant={a.action === 'failed' || a.action === 'stopped' ? 'error' : a.action === 'done' || a.action === 'approved' ? 'success' : 'neutral'} label={a.action} />
      <span><b>{DID[a.action] || a.action}</b> {plain(a.detail)} <em>{ago(a.at)}</em></span></div>)}</div>
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

const SUGGEST = [
  ['Write a summer menu', 'Five dishes with short, tasty descriptions', 'e.g. Grilled peach salad with burrata, basil and honey', ClipboardDocumentListIcon],
  ['Ideas for a lunch deal', 'Offers that bring people in at noon', 'e.g. Pasta and a drink for $12, Monday to Friday', BanknotesIcon],
  ['Answer a bad review politely', 'Paste the review, get a calm reply', 'e.g. “Thank you for telling us. We are sorry the wait was long…”', ChatBubbleLeftRightIcon],
  ['Plan a small opening party', 'Who to invite, what to serve, the cost', 'e.g. 40 guests, prosecco and small bites, about $600', SparklesIcon],
  ['Write a post for this weekend', 'For Facebook or Instagram, ready to copy', 'e.g. “This Saturday: fresh ravioli, made by hand”', ChartBarIcon],
  ['Check my prices', 'Compare with places nearby', 'e.g. Your pizza $14, others nearby $12 to $16', LightBulbIcon],
  ['Write a sign for the door', 'Opening hours and a warm welcome', 'e.g. Open 12 to 22 · Families welcome · Ask about gluten-free', BuildingStorefrontIcon],
  ['Plan an offer for quiet days', 'Fill the tables on slow evenings', 'e.g. Tuesdays: two mains for the price of one and a half', ClockIcon],
  ['Make a staff checklist', 'Opening and closing steps', 'e.g. Fridge temperatures, bread order, chairs down, alarm on', CheckCircleIcon],
];
function Chat({d, reload, text, setText, inputRef}) {
  const [busy, setBusy] = useState(false), [pending, setPending] = useState(''), end = useRef(null);
  const timeline = [...d.messages.map((m) => ({...m, t: 'm'})), ...d.audit.filter((a) => a.action === 'done' || a.action === 'failed').map((a) => ({...a, t: 'a'}))].sort((x, y) => x.at - y.at);
  // Scroll only the chat box, never the page (on phones the page would jump past the jobs).
  useEffect(() => { const log = end.current?.parentElement; if (log) log.scrollTop = log.scrollHeight; }, [timeline.length, pending]);
  const send = async (e, t0) => {
    e?.preventDefault(); const t = (t0 ?? text).trim(); if (!t || busy) return;
    setBusy(true); setPending(t); setText('');
    try { await call('/api/businesses/' + d.business.id + '/chat', 'POST', {text: t}); await reload(); } catch (x) { setText(t); alert(x.message); } finally { setBusy(false); setPending(''); }
  };
  const asked = d.messages.filter((m) => m.role === 'user').length;
  return (
    <div className="chat">
      <div className="chat-log">
        {timeline.map((m, i) => m.t === 'a'
          ? <div key={i} className="sys"><StatusDot variant={m.action === 'failed' || m.action === 'stopped' ? 'error' : m.action === 'done' || m.action === 'approved' ? 'success' : 'neutral'} label={m.action} /><b>{DID[m.action] || m.action}</b><span>{plain(m.detail)}</span><em>{ago(m.at)}</em></div>
          : <div key={i} className={'msg ' + m.role}>{m.role === 'assistant' ? <Markdown density="compact">{m.content}</Markdown> : m.content}</div>)}
        {pending && <><div className="msg user">{pending}</div><div className="msg assistant"><Text color="secondary">Writing…</Text></div></>}
        <div ref={end} />
      </div>

      <form onSubmit={send} className="chat-in">
        <TextArea ref={inputRef} label="Message your assistant" isLabelHidden value={text} onChange={setText} rows={2} placeholder="Ask your assistant anything…" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <Button label="Send" variant="primary" type="submit" isDisabled={busy || !text.trim()} icon={ic(ArrowUpIcon)} />
      </form>
    </div>
  );
}

function Business({id, onChange, onDeleted, businesses, go}) {
  const [d, setD] = useState(null), [busy, setBusy] = useState(false), [drawer, setDrawer] = useState(''), [palette, setPalette] = useState(false);
  const [text, setText] = useState(''), [adding, setAdding] = useState(false), [doc, setDoc] = useState(null), inputRef = useRef(null), toast = useToast();
  const say = (body) => toast({body, autoHideDuration: 4000});
  const load = useCallback(() => call('/api/businesses/' + id).then(setD).catch((x) => say(x.message)), [id]);
  useEffect(() => { setD(null); load(); }, [load]);
  const run = async (fn, ok) => { setBusy(true); try { await fn(); say(ok); } catch (x) { say(x.message); } finally { await load(); onChange(); setBusy(false); } };
  const act = async (url, method, body, ok) => {
    setBusy(true);
    try { const j = await call(url, method, body); say(j.note ? ok + '. ' + j.note : j.status === 'failed' ? 'It did not work. Open the job to see why.' : ok); await load(); onChange(); return true; }
    catch (x) { say(x.message); return false; } finally { setBusy(false); }
  };
  const askNow = (t) => { navigator.clipboard?.writeText(t); say('Copied “' + t + '”. Paste it in the chat on the right.'); };
  const ask = (t) => { if (t) { navigator.clipboard?.writeText(t); say('Copied. Paste it in the chat on the right.'); } };
  useHotkeys([
    {keys: 'mod+k', allowInInputs: true, onPress: () => setPalette((x) => !x)},
    {keys: '/', onPress: () => inputRef.current?.focus?.()},
  ]);
  if (!d) return <div className="page"><Text color="secondary">Loading…</Text></div>;
  const b = d.business, [dot, label] = STATUS[b.status] || STATUS.paused;
  const waiting = d.work.filter((w) => w.status === 'proposed'), done = d.work.filter((w) => w.status === 'done').length;
  const spent = Math.max(0, Object.values(d.spent).reduce((x, c) => x + c, 0)), limit = Object.values(d.caps).reduce((x, c) => x + c, 0);
  const start = () => act('/api/businesses/' + b.id + '/start', 'POST', {}, 'Started. The jobs you said yes to will now be done.');
  const stop = () => act('/api/businesses/' + b.id + '/stop', 'POST', {}, 'Stopped. Nothing else will happen.');
  const yesAll = () => run(async () => { for (const w of waiting) await call('/api/work/' + w.id + '/approve', 'POST', {hash: w.hash}); }, `You said yes to ${nJobs(waiting.length)}`);
  const setCap = (k, v) => act('/api/businesses/' + b.id + '/caps', 'PUT', {...d.caps, [k]: v}, `${SPEND_LABEL[k]} limit is now ${money(v)} a month`);
  const copyAddr = () => { navigator.clipboard?.writeText('https://' + b.name + '.app.flisk.si'); say('Address copied'); };
  const download = () => { location.href = '/api/businesses/' + b.id + '/export'; };
  // The next useful thing to do, instead of a row of zeros.
  const next = b.status === 'stopped' ? 'Everything is stopped. Press Start when you want to go on.'
    : !b.north_star ? 'Next: tell us how you measure success (⋯ → Details).'
    : waiting.length && b.status !== 'active' ? `Next: say yes to the jobs you like, then press Start.`
    : waiting.length ? `${nJobs(waiting.length)} ${waiting.length === 1 ? 'waits' : 'wait'} for your answer.`
    : b.status !== 'active' ? 'Next: press Start.' : 'All set. Ask your assistant for the next idea.';
  const menu = [
    {label: 'Your web page', description: 'Draft, not online yet', icon: GlobeAltIcon, items: [
      {label: 'Open it big', icon: ArrowsPointingOutIcon, onClick: () => setDrawer('site')},
      {label: 'Copy its address', icon: ClipboardIcon, onClick: copyAddr},
    ]},
    {label: 'Monthly limits', description: 'The most it may spend', icon: BanknotesIcon, items: Object.keys(SPEND_LABEL).map((k) => ({
      label: SPEND_LABEL[k], description: 'Now ' + money(d.caps[k]) + ' a month', items: [0, 5, 10, 25, 50, 100].map((v) => ({label: v === 0 ? 'Off ($0)' : money(v), endContent: v === d.caps[k] ? <Icon icon={CheckIcon} size="sm" /> : null, onClick: () => setCap(k, v)})),
    }))},
    {label: 'Details', description: 'Name, sentence, how you measure success', icon: PencilSquareIcon, onClick: () => setDrawer('details')},
    {label: 'What happened', icon: ClockIcon, onClick: () => setDrawer('history')},
    {type: 'divider'},
    {label: 'Download my data', icon: ArrowDownTrayIcon, onClick: download},
    {type: 'divider'},
    {label: 'Delete this business…', icon: TrashIcon, variant: 'destructive', onClick: () => setDrawer('details')},
  ];
  const cmds = [
    waiting.length > 1 && {id: 'yes-all', label: `Say yes to all ${waiting.length} jobs`, run: yesAll},
    b.status === 'active' ? {id: 'stop', label: 'STOP everything', run: stop} : {id: 'start', label: 'Start', run: start},
    {id: 'add', label: 'Add a job', run: () => setAdding(true)},
    {id: 'ask', label: 'Ask your assistant', run: () => ask('')},
    ...waiting.map((w) => ({id: 'yes:' + w.id, label: 'Yes: ' + w.title, run: () => act('/api/work/' + w.id + '/approve', 'POST', {hash: w.hash}, 'You said yes')})),
    {id: 'site', label: 'Open your web page', run: () => setDrawer('site')},
    {id: 'details', label: 'Change details', run: () => setDrawer('details')},
    {id: 'limits', label: 'Change monthly limits', run: () => setDrawer('details')},
    {id: 'history', label: 'See what happened', run: () => setDrawer('history')},
    {id: 'download', label: 'Download my data', run: download},
    ...businesses.filter((x) => x.id !== b.id).map((x) => ({id: 'go:' + x.id, label: 'Go to ' + x.name, run: () => go('/app/b/' + x.id)})),
    businesses.length < 3 && {id: 'new', label: 'Add a business', run: () => go('/app/new')},
    {id: 'safe', label: 'How we keep you safe', run: () => go('/app/safety')},
  ].filter(Boolean);
  const source = createStaticSource(cmds.map(({id, label}) => ({id, label})));
  return (
    <div className="work">
      <header className="work-head">
        <Heading level={2}>{b.name}</Heading>
        <HoverCard placement="below" content={<VStack gap={1} style={{maxWidth: 280, padding: 4}}><Text type="emphasized">{label}</Text><Text type="supporting" color="secondary">{b.status === 'active' ? 'Jobs you said yes to are being done. Press STOP to halt everything.' : b.status === 'stopped' ? 'Nothing happens until you press Start.' : 'Nothing happens until you press Start. Say yes to jobs first.'}</Text></VStack>}>
          <span><Badge label={label} variant={b.status === 'active' ? 'green' : b.status === 'stopped' ? 'red' : 'neutral'} icon={<StatusDot variant={dot} label={label} />} /></span>
        </HoverCard>
        <Text color="secondary" className="one">{b.one_liner || ''}</Text>
        <span className="next-in"><Icon icon={LightBulbIcon} size="sm" />{next}{busy && <em> · Working…</em>}</span>
        {done > 0 && <Badge label={`${done} done`} variant="green" />}
        {spent > 0 && <Tooltip content={`Spent ${money(spent)} of your ${money(limit)} monthly limit`}><span><Badge label={done === 0 ? `Plan cost ${money(spent)} · limit ${money(limit)} a month` : `Spent ${money(spent)} of ${money(limit)} this month`} icon={ic(BanknotesIcon)} /></span></Tooltip>}
        <Tooltip content="Search and do anything"><span className="find-btn"><Button label="Search" size="sm" variant="secondary" icon={ic(MagnifyingGlassIcon)} onClick={() => setPalette(true)} endContent={<Kbd keys="mod+k" />} /></span></Tooltip>
        {b.status === 'active'
          ? <Button label="STOP everything" size="sm" variant="destructive" icon={ic(StopIcon)} isDisabled={busy} onClick={stop} />
          : <Button label="Start" size="sm" variant="primary" icon={ic(PlayIcon)} isDisabled={busy} onClick={start} />}
        <DropdownMenu button={{label: 'More', variant: 'ghost', size: 'sm', isIconOnly: true, icon: <Icon icon={EllipsisHorizontalIcon} size="sm" />}} items={menu} alignment="end" />
      </header>
      {/* Live strip: the last things that happened, like a log. Everything here is real and kept. */}
      <div className="board">
        <section className="col">
          <div className="sec-h"><h3>Your assistant</h3></div>
          <div className="agent">
            <pre className="face">{b.status === 'active' ? '( ^ ‿ ^ )' : b.status === 'stopped' ? '( - _ - )' : '( o ‿ o )'}</pre>
            <div><b>{b.status === 'active' ? 'Working' : b.status === 'stopped' ? 'Stopped' : 'Waiting for you'}</b>
              <Text type="supporting" color="secondary">{b.status === 'active' ? 'Doing the jobs you said yes to. Press STOP at the top to halt it.' : `${done} of ${nJobs(d.work.length)} done so far.`}</Text></div>
          </div>
          <div className="sec-h"><h3>Business</h3><button className="link" onClick={() => setDrawer('details')}>Change</button></div>
          <dl className="nums">
            <dt>Your goal</dt><dd>{b.north_star || 'not set'}</dd>
            <dt>Jobs done</dt><dd>{done} <em>of {d.work.length}</em></dd>
            <dt>Money in</dt><dd>$0 <em>no sales yet</em></dd>
          </dl>
          <div className="sec-h"><h3>Monthly limits</h3><span className="sub">it can never spend more</span><button className="link" onClick={() => setDrawer('details')}>Change</button></div>
          <table className="tbl"><thead><tr><th>For</th><th>Limit</th><th>Spent</th><th>Left</th></tr></thead>
            <tbody>{Object.keys(SPEND_LABEL).map((k) => <tr key={k}><td>{SPEND_LABEL[k]}</td><td>{d.caps[k] ? money(d.caps[k]) : 'off'}</td><td>{money(Math.max(0, d.spent[k]))}</td><td>{money(Math.max(0, d.caps[k] - Math.max(0, d.spent[k])))}</td></tr>)}</tbody></table>
          {/* From the businesses diagrams: scorecard verdict (keep / change / stop / grow), given addresses, guardrails. */}
          <div className="sec-h"><h3>How it is going</h3><span className="sub">checked after each batch of jobs</span></div>
          <div className="verdict"><b>{done === 0 ? 'Too early to tell' : 'Keep going'}</b>
            <Text type="supporting" color="secondary">{done === 0 ? 'After the first jobs, you get one clear answer: keep going, change course, grow, or stop.' : 'No sales yet, so the advice is to keep going. You will see "grow" once customers come.'}</Text></div>
          <div className="sec-h"><h3>Your addresses</h3><span className="sub">kept for you</span></div>
          <dl className="nums addr">
            <dt>Web page</dt><dd>{d.site?.published ? <a href={siteUrl(b.name)} target="_blank" rel="noopener">{b.name}.app.flisk.si</a> : b.name + '.app.flisk.si'} <em>{d.site?.published ? 'online' : 'not online yet'}</em></dd>
            <dt>Short link</dt><dd>{b.name}.flisk.si <em>coming soon</em></dd>
            <dt>Email</dt><dd>{b.name}@app.flisk.si <em>coming soon</em></dd>
          </dl>
          <div className="sec-h"><h3>Your safety</h3></div>
          <ul className="safe">
            <li>✓ Nothing is posted, sent or paid without your yes</li>
            <li>✓ While it works, Start becomes a red STOP button that halts everything</li>
            <li>✓ You can download or delete all your data</li>
          </ul>
          <div className="sec-h"><h3>Your plan</h3></div>
          <Text type="supporting">{b.vision || b.one_liner}</Text>
        </section>
        <section className="col">
          <Queue d={d} act={act} run={run} ask={ask} adding={adding} setAdding={setAdding} />
          <div className="sec-h"><h3>Documents</h3></div>
          <ul className="docs">
            {b.vision && <li><button onClick={() => setDoc({title: 'Your plan', body: b.vision})}><Icon icon={ClipboardDocumentListIcon} size="sm" />Your plan</button><em>{ago(b.created || Date.now())}</em></li>}
            {d.draft && <li><button onClick={() => setDoc({title: 'Your web page text', body: '## ' + d.draft.headline + '\n\n' + (d.draft.sub || '') + '\n\n' + (d.draft.bullets || []).map((x) => '- ' + x).join('\n')})}><Icon icon={GlobeAltIcon} size="sm" />Your web page text</button><em>draft</em></li>}
            {d.work.filter((w) => w.result).map((w) => <li key={w.id}><button onClick={() => setDoc({title: w.title, body: w.result + (w.verified ? '\n\n**Good to know:** ' + w.verified : '')})}><Icon icon={CheckCircleIcon} size="sm" />{w.title}</button><em>{ago(w.finished || w.created)}</em></li>)}
            {!d.work.some((w) => w.result) && <li className="muted">Finished jobs appear here as documents you can read and copy.</li>}
          </ul>
          <div className="sec-h"><h3>People who want to hear from you</h3><span className="sub">{d.site?.signups.length || 0}</span>
            {d.site?.signups.length > 0 && <button className="link" onClick={() => { navigator.clipboard?.writeText(d.site.signups.map((x) => x.email).join('\n')); say('Emails copied'); }}>Copy all</button>}</div>
          {d.site?.signups.length
            ? <table className="tbl"><tbody>{d.site.signups.slice(0, 6).map((x) => <tr key={x.email}><td>{x.email}</td><td><em>{ago(x.at)}</em></td><td><button className="link" aria-label={'Remove ' + x.email} onClick={() => call('/api/businesses/' + b.id + '/signups', 'DELETE', {email: x.email}).then(load)}>Remove</button></td></tr>)}</tbody></table>
            : <Text type="supporting" color="secondary">{d.site?.published ? 'When visitors leave their email on your page, it shows here.' : 'Once your page is online, visitors can leave their email and it shows here.'}</Text>}
          <div className="sec-h"><h3>Connections</h3><span className="sub">free ones work now</span></div>
          <table className="tbl conn"><tbody>
            <tr><td>Your web page</td><td>{d.site?.published ? <Badge label="Online" variant="green" /> : <Badge label="Ready" />}</td></tr>
            <tr><td>Email sign-up list</td><td><Badge label={d.site?.published ? 'On' : 'Ready'} variant={d.site?.published ? 'green' : undefined} /></td></tr>
            <tr><td>Visitor count</td><td><Badge label={d.site?.published ? 'On' : 'Ready'} variant={d.site?.published ? 'green' : undefined} /></td></tr>
            {['Taking payments', 'Advertising (Google, Facebook)', 'Posting to Facebook, Instagram, X', 'Sending emails', 'Short link ' + b.name + '.flisk.si'].map((x) => <tr key={x}><td>{x}</td><td><Badge label="Coming soon" /></td></tr>)}
          </tbody></table>
          <div className="sec-h"><h3>Ideas to ask for</h3><span className="sub">click one, your assistant starts on it</span></div>
          <ul className="docs ideas-list">{SUGGEST.map(([t, , ex, I]) => <li key={t}><button disabled={busy} onClick={() => askNow(t)}><Icon icon={I} size="sm" /><span><b>{t}</b><em>{ex}</em></span></button></li>)}</ul>
        </section>
        <section className="col">
          <div className="sec-h"><h3>Your web page</h3>{d.site?.published
            ? <><a className="link" href={siteUrl(b.name)} target="_blank" rel="noopener">Visit</a><button className="link" style={{marginLeft: 10}} onClick={() => confirm('Take your web page offline now? Visitors will no longer see it.') && call('/api/businesses/' + b.id + '/unpublish', 'POST', {}).then(load).then(() => say('Your web page is offline'))}>Take offline</button></>
            : <button className="link" onClick={() => setDrawer('site')}>Open big</button>}</div>
          {d.site?.published && <Text type="supporting" color="secondary">{d.site.visits_week} visits this week · {d.site.visits_total} in total</Text>}
          <button className="site-thumb" onClick={() => setDrawer('site')} aria-label="Open your web page"><Website d={d} /></button>
          <div className="sec-h"><h3>What happened</h3><button className="link" onClick={() => setDrawer('history')}>All</button></div>
          <Activity d={{...d, audit: d.audit.slice(0, 8)}} />
          <div className="sec-h"><h3>Posts</h3><span className="sub">Facebook and Instagram</span></div>
          {(() => { const w = d.work.find((x) => x.kind === 'growth'); return w?.result
            ? <button className="link" onClick={() => setDoc({title: w.title, body: w.result})}>Read the drafts: {w.title}</button>
            : <Text type="supporting" color="secondary">{w ? 'Say yes to “' + w.title + '” and the drafts appear here. You post them yourself.' : 'Ask for posts and the drafts appear here. You post them yourself.'}</Text>; })()}
        </section>
        <aside className="board-chat"><iframe className="chat-frame" title="Chat with your assistant" src="https://chat.flisk.si/embed" allow="clipboard-write; microphone" /></aside>
      </div>
      <VisitsPanel d={d} />
      <Drawer isOpen={!!doc} onOpenChange={(o) => !o && setDoc(null)} label={doc?.title || 'Document'} side="end" width={640}>
        <DrawerHeader title={doc?.title || ''} onOpenChange={(o) => !o && setDoc(null)} hasDivider
          endContent={<Button label="Copy" size="sm" variant="ghost" icon={ic(ClipboardIcon)} onClick={() => { navigator.clipboard?.writeText(doc?.body || ''); say('Copied'); }} />} />
        <div style={{padding: 20}}><Markdown>{doc?.body || ''}</Markdown></div>
      </Drawer>
      <CommandPalette isOpen={palette} onOpenChange={setPalette} label="Search and do anything" searchSource={source} value="" emptySearchText="Nothing found. Try “yes”, “limit” or “page”."
        onValueChange={(v) => { const c = cmds.find((x) => x.id === v); setPalette(false); c && c.run(); }} />
      <Drawer isOpen={drawer === 'details'} onOpenChange={(o) => !o && setDrawer('')} label="Details and limits" side="end" width={520}>
        <DrawerHeader title="Details and limits" subtitle="What you do, how you measure success, what it may spend" onOpenChange={(o) => !o && setDrawer('')} hasDivider />
        <div style={{padding: 16}}><Settings key={JSON.stringify(d.caps) + b.one_liner + b.north_star} d={d} act={act} onDeleted={onDeleted} /></div>
      </Drawer>
      <Drawer isOpen={drawer === 'site'} onOpenChange={(o) => !o && setDrawer('')} label="Your web page" side="end" width="min(1000px, 92vw)">
        <DrawerHeader title="Your web page" subtitle="A draft. It goes online only after you say yes to that job." onOpenChange={(o) => !o && setDrawer('')} hasDivider
          endContent={<Button label="Copy address" size="sm" variant="ghost" icon={ic(ClipboardIcon)} onClick={copyAddr} />} />
        <div style={{padding: 16, height: 'calc(100% - 80px)'}}><Website d={d} big /></div>
      </Drawer>
      <Drawer isOpen={drawer === 'history'} onOpenChange={(o) => !o && setDrawer('')} label="What happened" side="end" width={480}>
        <DrawerHeader title="What happened" subtitle="Every yes, no, start, stop and change. Kept until you delete the business." onOpenChange={(o) => !o && setDrawer('')} hasDivider />
        <div style={{padding: 16}}><Activity d={d} /></div>
      </Drawer>
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
    : shownId ? <Business key={shownId} id={shownId} businesses={me.businesses} go={go} onChange={loadMe} onDeleted={async () => { await loadMe(); go('/app'); }} />
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
