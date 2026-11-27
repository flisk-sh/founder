import {useCallback, useEffect, useRef, useState} from 'react';
import {AppShell} from '@astryxdesign/core/AppShell';
import {MobileNav, MobileNavToggle} from '@astryxdesign/core/MobileNav';
import {SideNav, SideNavItem, SideNavSection, SideNavRenderContext} from '@astryxdesign/core/SideNav';
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
import {TabList, Tab} from '@astryxdesign/core/TabList';
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
  name_invalid: 'Use 3 to 31 lowercase letters, digits or dashes, starting with a letter.', name_reserved: 'That name is reserved for a Flisk product.',
  name_taken: 'That name is taken.', name_held: 'That name was released recently and is held for 30 days.', limit_reached: 'You can have up to 3 businesses for now.',
  north_star_missing: 'Set a north star metric first, in Settings.', over_cap: 'This would go over its monthly cap. Raise the cap in Budgets, or reject it.',
  approval_mismatch: 'The task changed since you saw it. Check it again.', business_stopped: 'The business is stopped. Press Start first.', not_started: 'Press Start first.',
  confirm_name: 'Type the exact name to confirm.', cap_invalid: 'Caps go from $0 to $10,000.', work_invalid: 'Give it a title and a cost from $0 to $1,000.', idea_short: 'Say a bit more: at least a few words.',
};
async function call(path, method = 'GET', body) {
  const r = await fetch(path, {method, headers: body ? {'content-type': 'application/json'} : {}, body: body ? JSON.stringify(body) : undefined});
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) { location.href = '/auth/start'; throw new Error('Sign in first.'); }
  if (!r.ok) throw new Error(ERR[j.error] || j.error || 'Something went wrong.');
  return j;
}
const path = () => location.pathname.replace(/\/+$/, '');
const STATUS = {active: ['success', 'Running'], paused: ['neutral', 'Paused'], stopped: ['error', 'Stopped']};
const SPEND_LABEL = {llm: 'AI models', ads: 'Ads', infra: 'Hosting', mail: 'Email'};
const KIND_ICON = {engineering: BoltIcon, research: LightBulbIcon, growth: ChartBarIcon, ops: ClipboardDocumentListIcon};

// ---------- signed out ----------
function Landing() {
  const steps = [
    [LightBulbIcon, '1. Say your idea', 'One sentence. Founder drafts the vision, a landing page and the first five tasks.'],
    [ShieldCheckIcon, '2. Approve what runs', 'Each task shows its cost. Nothing runs, spends, sends or ships until you approve it.'],
    [ChartBarIcon, '3. Watch one number', 'Every business has a north star. Every result says what was really checked and what was not.'],
  ];
  const trust = ['Starts paused', 'Hard monthly caps', 'One STOP button', 'Full activity log', 'Export or delete anytime', 'No ads or emails without you'];
  return (
    <div style={{height: '100%', overflow: 'auto'}}>
      <div className="hero">
        <VStack gap={4} align="center">
          <Badge label="Early preview · free" variant="blue" icon={ic(SparklesIcon)} />
          <h1>An AI co-founder that asks before it acts</h1>
          <Text color="secondary">Founder turns your idea into a company plan, drafts the site and does the work you approve. You keep the keys, the money and the final say.</Text>
          <Button label="Start with GitHub" variant="primary" size="lg" href="/auth/start" icon={ic(ArrowRightIcon)} />
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
const EXAMPLES = ['Invoices for freelance designers', 'A booking page for dog walkers in Utrecht', 'Weekly meal plans for busy parents', 'Uptime alerts for Shopify stores'];
function Onboard({onCreated}) {
  const [idea, setIdea] = useState(''), [name, setName] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [tick, setTick] = useState(0);
  useEffect(() => { if (!busy) return; const t = setInterval(() => setTick((x) => x + 1), 900); return () => clearInterval(t); }, [busy]);
  const STEPS = ['Reading your idea', 'Writing the vision', 'Picking the north star', 'Drafting the landing page', 'Planning the first five tasks'];
  const go = async (e) => {
    e?.preventDefault(); setBusy(true); setErr(''); setTick(0);
    try { const j = await call('/api/onboard', 'POST', {idea, ...(name.trim() ? {name: name.trim().toLowerCase()} : {})}); onCreated(j.id); } catch (x) { setErr(x.message); setBusy(false); }
  };
  if (busy) return (
    <div className="page narrow"><Card><VStack gap={4}>
      <HStack gap={2} align="center"><Avatar name="Founder" size="small" /><Heading level={2}>Drafting your company</Heading></HStack>
      <ProgressBar label="Drafting" isLabelHidden isIndeterminate />
      <VStack gap={2}>{STEPS.map((s, i) => <HStack key={s} gap={2} align="center"><Icon icon={i < Math.min(tick, STEPS.length) ? CheckCircleIcon : ClockIcon} size="sm" /><Text color={i < tick ? 'primary' : 'secondary'}>{s}</Text></HStack>)}</VStack>
      <Text type="supporting" color="secondary">Nothing is published, sent or spent. You review everything next.</Text>
    </VStack></Card></div>
  );
  return (
    <div className="page narrow"><form onSubmit={go}><VStack gap={5}>
      <VStack gap={2}><Heading level={1}>What do you want to build?</Heading><Text color="secondary">One sentence is enough. Founder drafts the company; you approve what happens next.</Text></VStack>
      {err && <Banner status="error" title={err} />}
      <Card><VStack gap={3}>
        <TextArea label="Your idea" isLabelHidden value={idea} onChange={setIdea} rows={3} placeholder="Describe it in one sentence: who it is for and what it does" />
        <HStack gap={2} wrap="wrap">{EXAMPLES.map((x) => <Button key={x} label={x} size="sm" variant="ghost" onClick={() => setIdea(x)} />)}</HStack>
        <Collapsible trigger={<Text type="supporting" color="secondary">Choose the name yourself (optional)</Text>}>
          <div style={{maxWidth: 320, paddingTop: 8}}><TextInput label="Name" value={name} onChange={setName} placeholder="acme" description="Gives name.app.flisk.si, name.flisk.si and name@app.flisk.si." /></div>
        </Collapsible>
        <HStack gap={3} align="center" wrap="wrap"><Button label="Draft my company" variant="primary" size="lg" type="submit" isDisabled={idea.trim().length < 8} icon={ic(SparklesIcon)} />
          <Text type="supporting" color="secondary">Starts paused · free models · nothing goes live</Text></HStack>
      </VStack></Card>
    </VStack></form></div>
  );
}

// ---------- business pieces ----------
function TaskRow({w, act}) {
  const [open, setOpen] = useState(false);
  const st = {proposed: null, approved: ['Approved', 'blue'], running: ['Running…', 'blue'], done: ['Done', 'success'], failed: ['Failed', 'error'], rejected: ['Rejected', 'neutral'], cancelled: ['Cancelled', 'neutral']}[w.status];
  const hasMore = w.body || w.result || w.verified;
  return (
    <div className={'task ' + w.status}>
      <div className="task-line">
        <span className="chip-ic sm"><Icon icon={KIND_ICON[w.kind] || BoltIcon} size="sm" /></span>
        <button className="task-title" onClick={() => setOpen(!open)} disabled={!hasMore}>{w.title}</button>
        <span className="cost">{money(w.cost_usd)}</span>
        {w.status === 'proposed' && <span className="task-act">
          <IconButton label="Approve" icon={<Icon icon={CheckIcon} size="sm" />} size="sm" variant="secondary" onClick={() => act('/api/work/' + w.id + '/approve', 'POST', {hash: w.hash}, 'Approved')} />
          <IconButton label="Reject" icon={<Icon icon={XMarkIcon} size="sm" />} size="sm" variant="ghost" onClick={() => act('/api/work/' + w.id + '/reject', 'POST', {}, 'Rejected')} /></span>}
        {w.status === 'approved' && <Button label="Run" size="sm" variant="secondary" icon={ic(PlayIcon)} onClick={() => act('/api/work/' + w.id + '/run', 'POST', {}, 'Done')} />}
        {st && w.status !== 'approved' && <Badge label={st[0]} variant={st[1]} />}
      </div>
      {open && <div className="task-more">
        {w.body && <Text type="supporting" color="secondary">{w.body}</Text>}
        {w.result && <div className="result"><Markdown density="compact">{w.result}</Markdown></div>}
        {w.verified && <Text type="supporting"><b>Checked:</b> {w.verified}</Text>}
        <span className="mono">{w.kind} · {SPEND_LABEL[w.spend_kind]} · {w.source === 'owner' ? 'you' : w.source === 'chat' ? 'from chat' : 'Founder'} · approval hash {w.hash.slice(0, 10)}</span>
      </div>}
    </div>
  );
}

function Overview({d, act, run}) {
  const b = d.business, total = Math.max(0, Object.values(d.spent).reduce((a, c) => a + c, 0)), capTotal = Object.values(d.caps).reduce((a, c) => a + c, 0);
  const by = (st) => d.work.filter((w) => st.includes(w.status)).sort((x, y) => x.created - y.created);
  const waiting = by(['proposed']), queued = by(['approved', 'running']), done = by(['done', 'failed']), closed = by(['rejected', 'cancelled']);
  const sum = waiting.reduce((a, w) => a + w.cost_usd, 0);
  const [adding, setAdding] = useState(false), [showClosed, setShowClosed] = useState(false);
  const approveAll = () => run(async () => { for (const w of waiting) await call('/api/work/' + w.id + '/approve', 'POST', {hash: w.hash}); }, `Approved ${waiting.length} tasks`);
  return (
    <div className="ov">
      <div className="ov-main">
        <div className="stats">
          <div><small>North star</small><b>0</b><span>{b.north_star || 'not set'}</span></div>
          <div><small>GEL score</small><b>—</b><span>after first build</span></div>
          <div><small>Done</small><b>{done.filter((w) => w.status === 'done').length}</b><span>of {d.work.length} tasks</span></div>
          <div><small>Spent</small><b>{money(total)}</b><span>of {money(capTotal)} cap</span></div>
          <div><small>Revenue</small><b>$0</b><span>no payments yet</span></div>
        </div>
        <div className="queue">
          <div className="queue-head">
            <Text type="emphasized">{waiting.length ? `${waiting.length} waiting for you` : 'Nothing waiting for you'}</Text>
            {waiting.length > 1 && <Button label={`Approve all · up to ${money(sum)}`} size="sm" variant="primary" icon={ic(CheckIcon)} onClick={approveAll} />}
            <span style={{flex: 1}} />
            <IconButton label="Add a task" icon={<Icon icon={PlusIcon} size="sm" />} size="sm" variant="ghost" onClick={() => setAdding(!adding)} />
          </div>
          {adding && <ProposeForm d={d} act={act} onDone={() => setAdding(false)} />}
          {waiting.map((w) => <TaskRow key={w.id} w={w} act={act} />)}
          {queued.length > 0 && <div className="queue-sub">Approved · runs after Start</div>}
          {queued.map((w) => <TaskRow key={w.id} w={w} act={act} />)}
          {done.length > 0 && <div className="queue-sub">Done</div>}
          {done.map((w) => <TaskRow key={w.id} w={w} act={act} />)}
          {closed.length > 0 && <button className="queue-sub link" onClick={() => setShowClosed(!showClosed)}>{showClosed ? 'Hide' : 'Show'} {closed.length} rejected or cancelled</button>}
          {showClosed && closed.map((w) => <TaskRow key={w.id} w={w} act={act} />)}
        </div>
      </div>
      <div className="ov-side">
        {b.vision && <div className="side-block"><small>Vision</small><Text type="supporting">{b.vision}</Text></div>}
        <div className="side-block"><small>Activity</small>
          {d.audit.slice(0, 8).map((a, i) => <div key={i} className="act"><StatusDot variant={a.action === 'failed' || a.action === 'stopped' ? 'error' : a.action === 'done' || a.action === 'approved' ? 'success' : 'neutral'} label={a.action} />
            <span><b>{a.action}</b> {a.detail.slice(0, 90)} <em>{ago(a.at)}</em></span></div>)}
        </div>
      </div>
    </div>
  );
}

function ProposeForm({d, act, onDone}) {
  const [title, setTitle] = useState(''), [kind, setKind] = useState('research'), [cost, setCost] = useState('1');
  const add = async (e) => { e.preventDefault(); if (await act('/api/businesses/' + d.business.id + '/work', 'POST', {title, body: '', kind, spend_kind: 'llm', cost_usd: Number(cost)}, 'Added')) onDone(); };
  return (
    <form onSubmit={add} className="add-row">
      <div style={{flex: 1, minWidth: 200}}><TextInput label="New task" isLabelHidden value={title} onChange={setTitle} placeholder="New task, e.g. Compare 3 invoicing tools" /></div>
      <select aria-label="Kind" value={kind} onChange={(e) => setKind(e.target.value)}>{Object.keys(KIND_ICON).map((k) => <option key={k}>{k}</option>)}</select>
      <div style={{width: 90}}><TextInput label="Max USD" isLabelHidden type="number" value={cost} onChange={setCost} /></div>
      <Button label="Add" size="sm" variant="primary" type="submit" isDisabled={!title.trim()} />
    </form>
  );
}

function Website({d}) {
  const b = d.business, [html, setHtml] = useState('');
  useEffect(() => { fetch('/app/b/' + b.id + '/preview').then((r) => (r.ok ? r.text() : '')).then(setHtml).catch(() => setHtml('')); }, [b.id, d.draft?.headline]);
  if (!d.draft) return <EmptyState title="No site draft" description="Businesses created from an idea get a landing page draft." icon={<Icon icon={GlobeAltIcon} size="lg" />} />;
  return (
    <VStack gap={3}>
      <div className="row"><HStack gap={2} wrap="wrap"><Badge label={b.name + '.app.flisk.si'} icon={ic(GlobeAltIcon)} /><Badge label="Draft · not published" variant="warning" />{d.draft.offline && <Badge label="Offline draft (no model)" />}</HStack>
        <Text type="supporting" color="secondary">Publishing needs an approved task and the hosting connection.</Text></div>
      <div className="browser"><div className="browser-bar"><span /><span /><span /><em>{b.name}.app.flisk.si</em></div>
        <iframe title={'Landing page draft for ' + b.name} srcDoc={html} sandbox="" referrerPolicy="no-referrer" /></div>
    </VStack>
  );
}

function Activity({d}) {
  return (
    <Card><VStack gap={3}>
      <VStack gap={1}><Heading level={3}>Everything that happened</Heading><Text type="supporting" color="secondary">Every approval, run, cap change and STOP. Kept until you delete the business.</Text></VStack>
      <div className="log">{d.audit.map((a, i) => [<Text key={i + 't'} type="supporting" color="secondary">{new Date(a.at).toLocaleString()}</Text>, <Text key={i + 'a'} type="emphasized">{a.action}</Text>, <Text key={i + 'd'}>{a.detail}</Text>])}</div>
    </VStack></Card>
  );
}

function Settings({d, act, onDeleted}) {
  const b = d.business;
  const [caps, setCaps] = useState(Object.fromEntries(Object.entries(d.caps).map(([k, v]) => [k, String(v)])));
  const [oneLiner, setOneLiner] = useState(b.one_liner), [ns, setNs] = useState(b.north_star), [confirm, setConfirm] = useState(''), [err, setErr] = useState('');
  const del = async () => { setErr(''); try { await call('/api/businesses/' + b.id, 'DELETE', {confirm}); onDeleted(); } catch (x) { setErr(x.message); } };
  return (
    <VStack gap={4}>
      <Card><VStack gap={3}>
        <Heading level={3}>About</Heading>
        <TextInput label="What it does, in one line" value={oneLiner} onChange={setOneLiner} />
        <TextInput label="North star metric" value={ns} onChange={setNs} description="Required before Start." />
        <div><Button label="Save" variant="primary" onClick={() => act('/api/businesses/' + b.id + '/settings', 'PUT', {one_liner: oneLiner, north_star: ns}, 'Saved')} /></div>
      </VStack></Card>
      <Card><VStack gap={3}>
        <Heading level={3}>Monthly caps</Heading>
        <Text type="supporting" color="secondary">A task over its cap is refused even after approval. $0 turns that spend off.</Text>
        <div className="caps">{Object.keys(SPEND_LABEL).map((k) => <div key={k}><TextInput label={SPEND_LABEL[k] + ' $'} type="number" value={caps[k]} onChange={(v) => setCaps({...caps, [k]: v})} />
          <ProgressBar label={'used ' + money(Math.max(0, d.spent[k]))} value={Math.max(0, d.spent[k])} max={Number(caps[k]) || 1} /></div>)}</div>
        <div><Button label="Save caps" size="sm" variant="primary" onClick={() => act('/api/businesses/' + b.id + '/caps', 'PUT', Object.fromEntries(Object.entries(caps).map(([k, v]) => [k, Number(v)])), 'Caps saved')} /></div>
      </VStack></Card>
      <Activity d={d} />
      <Card><VStack gap={3}>
        <Heading level={3}>Your data</Heading>
        <Text color="secondary">Everything Founder keeps about this business, as one JSON file.</Text>
        <div><Button label="Export" variant="secondary" icon={ic(ArrowDownTrayIcon)} href={'/api/businesses/' + b.id + '/export'} /></div>
      </VStack></Card>
      <Card><VStack gap={3}>
        <Heading level={3}>Delete this business</Heading>
        <Text color="secondary">Removes its tasks, chat, site draft, spend log, activity and caps. The name {b.name} is held for 30 days so nobody can take over its links or mail.</Text>
        {err && <Banner status="error" title={err} />}
        <HStack gap={2} align="end" wrap="wrap"><div style={{width: 240}}><TextInput label={'Type ' + b.name + ' to confirm'} value={confirm} onChange={setConfirm} /></div>
          <Button label="Delete forever" variant="destructive" icon={ic(TrashIcon)} isDisabled={confirm !== b.name} onClick={del} /></HStack>
      </VStack></Card>
    </VStack>
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
      <HStack gap={2} align="center" style={{padding: '12px 14px', borderBottom: '1px solid var(--color-border, #8883)'}}><Avatar name="Founder" size="small" /><VStack gap={0}><Text type="emphasized">Founder</Text><Text type="supporting" color="secondary">Proposes, never acts on its own</Text></VStack></HStack>
      <div className="chat-log">
        {d.messages.map((m, i) => <div key={i} className={'msg ' + m.role}>{m.role === 'assistant' ? <Markdown density="compact">{m.content}</Markdown> : m.content}</div>)}
        {pending && <><div className="msg user">{pending}</div><div className="msg assistant"><Text color="secondary">Thinking…</Text></div></>}
        <div ref={end} />
      </div>
      <form onSubmit={send} className="chat-in">
        <TextArea label="Message Founder" isLabelHidden value={text} onChange={setText} rows={2} placeholder="Ask, or say “research our top 3 competitors”" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <Button label="Send" variant="primary" type="submit" isDisabled={busy || !text.trim()} icon={ic(ArrowUpIcon)} />
      </form>
    </div>
  );
}

function Business({id, onChange, onDeleted}) {
  const [d, setD] = useState(null), [tab, setTab] = useState('overview'), [msg, setMsg] = useState(null), [busy, setBusy] = useState(false);
  const [narrow, setNarrow] = useState(() => matchMedia('(max-width: 1100px)').matches);
  useEffect(() => { const m = matchMedia('(max-width: 1100px)'), f = () => setNarrow(m.matches); m.addEventListener('change', f); return () => m.removeEventListener('change', f); }, []);
  const load = useCallback(() => call('/api/businesses/' + id).then(setD).catch((x) => setMsg({status: 'error', title: x.message})), [id]);
  useEffect(() => { setD(null); setTab('overview'); load(); }, [load]);
  const run = async (fn, ok) => { setMsg(null); setBusy(true); try { await fn(); setMsg({status: 'success', title: ok}); await load(); onChange(); } catch (x) { setMsg({status: 'error', title: x.message}); await load(); } finally { setBusy(false); } };
  const act = async (url, method, body, ok) => {
    setMsg(null); setBusy(true);
    try { const j = await call(url, method, body); setMsg({status: 'success', title: j.note ? ok + '. ' + j.note : j.status === 'failed' ? 'It ran but failed. See the task.' : ok}); await load(); onChange(); return true; }
    catch (x) { setMsg({status: 'error', title: x.message}); return false; } finally { setBusy(false); }
  };
  if (!d) return <div className="page">{msg ? <Banner {...msg} /> : <Text color="secondary">Loading…</Text>}</div>;
  const b = d.business, [dot, label] = STATUS[b.status] || STATUS.paused, waiting = d.work.filter((w) => w.status === 'proposed').length;
  return (
    <div className="biz">
      <div className="biz-main"><div className="page wide"><VStack gap={3}>
        <div className="row">
          <VStack gap={1}>
            <HStack gap={2} align="center"><Heading level={1}>{b.name}</Heading><Badge label={label} variant={b.status === 'active' ? 'success' : b.status === 'stopped' ? 'error' : 'neutral'} icon={<StatusDot variant={dot} label={label} />} /></HStack>
            <Text color="secondary">{b.one_liner || 'No one-liner yet.'}</Text>
            <HStack gap={2} wrap="wrap"><Badge label={b.name + '.app.flisk.si'} icon={ic(GlobeAltIcon)} /><Badge label={b.name + '@app.flisk.si'} icon={ic(EnvelopeIcon)} /></HStack>
          </VStack>
          {b.status === 'active'
            ? <Button label="STOP everything" variant="destructive" icon={ic(StopIcon)} isDisabled={busy} onClick={() => act('/api/businesses/' + b.id + '/stop', 'POST', {}, 'Stopped. Everything queued was cancelled.')} />
            : <Button label={waiting ? 'Start' : 'Start'} variant="primary" icon={ic(PlayIcon)} isDisabled={busy} onClick={() => act('/api/businesses/' + b.id + '/start', 'POST', {}, 'Started. Approved tasks can run now.')} />}
        </div>
        {busy && <ProgressBar label="Working" isLabelHidden isIndeterminate />}
        {msg && <Banner {...msg} isDismissable onDismiss={() => setMsg(null)} />}
        <TabList value={tab} onChange={setTab} hasDivider>
          <Tab value="overview" label="Work" /><Tab value="site" label="Website" />{narrow && <Tab value="chat-m" label="Chat" />}<Tab value="settings" label="Settings" />
        </TabList>
        {tab === 'overview' && <Overview d={d} act={act} run={run} />}
        {tab === 'site' && <Website d={d} />}
        {tab === 'chat-m' && <div className="chat-inline"><Chat d={d} reload={load} /></div>}
        {tab === 'settings' && <Settings key={JSON.stringify(d.caps)} d={d} act={act} onDeleted={onDeleted} />}
      </VStack></div></div>
      <aside className="biz-chat"><Chat d={d} reload={load} /></aside>
    </div>
  );
}

// ---------- shell ----------
function Nav({me, current, go}) {
  return (
    <SideNav collapsible
      header={<HStack gap={2} align="center"><span className="brand"><Icon icon={ShieldCheckIcon} size="sm" /></span><VStack gap={0}><Text type="emphasized">Founder</Text><Text type="supporting" color="secondary">by Flisk</Text></VStack></HStack>}
      topContent={<Button label="New business" variant="primary" icon={ic(PlusIcon)} isFullWidth onClick={() => go('/app/new')} />}
      footer={<HStack gap={2} align="center"><Avatar name={me.user.login} size="small" /><VStack gap={0}><span data-flisk-login="">{me.user.login}</span><a className="muted-link" href="/auth/out">Sign out</a></VStack></HStack>}>
      <SideNavSection title="Businesses">
        {me.businesses.map((b) => <SideNavItem key={b.id} label={b.name} icon={BuildingStorefrontIcon} isSelected={current === b.id} onClick={() => go('/app/b/' + b.id)}
          endContent={<StatusDot variant={(STATUS[b.status] || STATUS.paused)[0]} label={(STATUS[b.status] || STATUS.paused)[1]} />} />)}
        {!me.businesses.length && <Text type="supporting" color="secondary">None yet.</Text>}
      </SideNavSection>
      <SideNavSection title="Trust">
        <SideNavItem label="How Founder stays safe" icon={LockClosedIcon} onClick={() => go('/app/safety')} isSelected={current === 'safety'} />
      </SideNavSection>
    </SideNav>
  );
}

function Safety() {
  const rules = [
    [ShieldCheckIcon, 'Approval for everything', 'Founder drafts and proposes. You approve each task, email, ad and deploy. An approval covers one exact item and its cost, once; if the item changes, it needs a new approval.'],
    [BanknotesIcon, 'Hard caps', 'Monthly caps for AI models, ads, hosting and email. Approved amounts are held at once, so two approvals cannot pass a cap together. Ads and email start at $0.'],
    [StopIcon, 'One STOP button', 'Stops the business and cancels everything queued.'],
    [ExclamationTriangleIcon, 'Honest results', 'Every finished task says what was really checked and what was not. Nothing is called done that was not done.'],
    [LockClosedIcon, 'Private cabinet', 'GitHub sign-in through login.flisk.si. Anyone else asking for your business gets "not found". The page cannot be framed by other sites and loads scripts only from Flisk. Site drafts render in a sandbox with no scripts.'],
    [GlobeAltIcon, 'Names cannot be hijacked', 'Product names like login or chat are reserved. A deleted name is held 30 days before anyone can claim it.'],
    [ArrowDownTrayIcon, 'Your data, your call', 'Export everything as JSON or delete it from Settings.'],
  ];
  return <div className="page narrow"><VStack gap={4}><Heading level={1}>How Founder stays safe</Heading>{rules.map(([I, t, d]) => <Card key={t}><HStack gap={3} align="start"><span className="chip-ic"><Icon icon={I} size="md" /></span><VStack gap={1}><Heading level={3}>{t}</Heading><Text color="secondary">{d}</Text></VStack></HStack></Card>)}</VStack></div>;
}

export default function App() {
  const [me, setMe] = useState(undefined), [p, setP] = useState(path()), [navOpen, setNavOpen] = useState(false);
  const loadMe = useCallback(() => fetch('/api/me').then((r) => (r.ok ? r.json() : null)).then(setMe).catch(() => setMe(null)), []);
  useEffect(() => { loadMe(); const f = () => setP(path()); addEventListener('popstate', f); return () => removeEventListener('popstate', f); }, [loadMe]);
  const go = (to) => { history.pushState(null, '', to); setP(to); setNavOpen(false); };
  if (me === undefined) return <div className="page"><Text color="secondary">Loading…</Text></div>;
  if (!me) return <Landing />;
  const bid = (p.match(/^\/app\/b\/([\w-]+)$/) || [])[1];
  const firstId = me.businesses[0]?.id;
  const shownId = bid || (p !== '/app/new' && p !== '/app/safety' ? firstId : '');
  const view = p === '/app/safety' ? <Safety />
    : shownId ? <Business key={shownId} id={shownId} onChange={loadMe} onDeleted={async () => { await loadMe(); go('/app'); }} />
    : <Onboard onCreated={async (id) => { await loadMe(); go('/app/b/' + id); }} />;
  const nav = <Nav me={me} current={p === '/app/safety' ? 'safety' : shownId} go={go} />;
  return (
    <AppShell height="fill" mobileNav={{hasToggle: false, isOpen: navOpen, onOpenChange: setNavOpen, content: <MobileNav header="Founder"><SideNavRenderContext value="drawer-content">{nav}</SideNavRenderContext></MobileNav>}}
      topNav={<HStack gap={2} align="center" style={{padding: 'var(--spacing-2) var(--spacing-3)'}}><MobileNavToggle /><Icon icon={LockClosedIcon} size="sm" /><Text type="supporting" color="secondary">Private cabinet · only you can see this</Text></HStack>}
      sideNav={nav}>
      <div style={{height: '100%', overflow: 'auto'}}>{view}</div>
    </AppShell>
  );
}
