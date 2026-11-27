import {useCallback, useEffect, useState} from 'react';
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
import {
  ArrowDownTrayIcon, ArrowRightIcon, BuildingStorefrontIcon, CheckIcon, ClipboardDocumentListIcon, EnvelopeIcon, GlobeAltIcon,
  LockClosedIcon, PlayIcon, PlusIcon, ShieldCheckIcon, StopIcon, TrashIcon, XMarkIcon, BanknotesIcon, ChartBarIcon,
} from '@heroicons/react/24/outline';

// founder.flisk.si cabinet. Nothing here spends, sends or ships on its own: every item waits for the owner's approval.
const ic = (I) => <Icon icon={I} size="sm" />;
const money = (n) => '$' + Number(n || 0).toFixed(2).replace(/\.00$/, '');
const when = (t) => new Date(t).toLocaleString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'});
const ERR = {
  name_invalid: 'Use 3 to 31 lowercase letters, digits or dashes, starting with a letter.', name_reserved: 'That name is reserved for a Flisk product.',
  name_taken: 'Someone already has that name.', name_held: 'That name was released recently and is held for 30 days.', limit_reached: 'You can have up to 3 businesses for now.',
  north_star_missing: 'Set a north star metric first, in Settings.', over_cap: 'This would go over the monthly cap. Raise the cap in Budgets or reject it.',
  approval_mismatch: 'The item changed since you saw it. Reload and check it again.', business_stopped: 'The business is stopped. Start it first.',
  confirm_name: 'Type the exact name to confirm.', cap_invalid: 'Caps go from $0 to $10,000.', work_invalid: 'Give it a title and a cost from $0 to $1,000.',
};
async function call(path, method = 'GET', body) {
  const r = await fetch(path, {method, headers: body ? {'content-type': 'application/json'} : {}, body: body ? JSON.stringify(body) : undefined});
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) { location.href = '/auth/start'; throw new Error('Sign in first.'); }
  if (!r.ok) throw new Error(ERR[j.error] || j.error || 'Something went wrong.');
  return j;
}
const path = () => location.pathname.replace(/\/+$/, '');

// ---------- signed out ----------
function Landing() {
  const promises = [
    [LockClosedIcon, 'Private by default', 'Your cabinet is behind GitHub sign-in. Nobody else sees your businesses, mail or numbers.'],
    [ShieldCheckIcon, 'Nothing runs without you', 'Every task, email, ad and deploy waits for your approval. One STOP button cancels everything.'],
    [BanknotesIcon, 'Hard spending caps', 'You set a monthly cap for AI, ads, hosting and mail. Founder cannot go over it, ever.'],
  ];
  return (
    <div style={{height: '100%', overflow: 'auto'}}>
      <div className="hero">
        <VStack gap={4} align="center">
          <Badge label="Early preview" variant="blue" />
          <h1>Run a small business with an AI co-founder you can trust</h1>
          <Text color="secondary">Founder plans the work, builds your app and finds customers. You approve every step and every dollar.</Text>
          <HStack gap={2}><Button label="Sign in with GitHub" variant="primary" size="lg" href="/auth/start" icon={ic(ArrowRightIcon)} /></HStack>
          <Text type="supporting" color="secondary">No card. Starts paused. Export or delete everything at any time.</Text>
        </VStack>
      </div>
      <div className="promise">
        {promises.map(([I, t, d]) => <Card key={t}><VStack gap={2}><Icon icon={I} size="md" /><Heading level={3}>{t}</Heading><Text color="secondary">{d}</Text></VStack></Card>)}
      </div>
    </div>
  );
}

// ---------- create ----------
function NewBusiness({onCreated}) {
  const [name, setName] = useState(''), [oneLiner, setOneLiner] = useState(''), [ns, setNs] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const n = name.trim().toLowerCase();
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { const j = await call('/api/businesses', 'POST', {name: n, one_liner: oneLiner, north_star: ns}); onCreated(j.id); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <div className="page"><form onSubmit={submit}><VStack gap={4}>
      <VStack gap={1}><Heading level={1}>Start a business</Heading><Text color="secondary">It starts paused. Nothing runs until you press Start.</Text></VStack>
      {err && <Banner status="error" title={err} />}
      <Card><VStack gap={3}>
        <TextInput label="Name" value={name} onChange={setName} placeholder="acme" description="Lowercase letters, digits and dashes." startIcon={ic(BuildingStorefrontIcon)} />
        {n && <VStack gap={1}><Text type="supporting" color="secondary">You will get (reserved now, live after the first deploy):</Text>
          <HStack gap={2} wrap="wrap"><Badge label={n + '.app.flisk.si'} icon={ic(GlobeAltIcon)} /><Badge label={n + '.flisk.si'} icon={ic(GlobeAltIcon)} /><Badge label={n + '@app.flisk.si'} icon={ic(EnvelopeIcon)} /></HStack></VStack>}
        <TextInput label="What it does, in one line" value={oneLiner} onChange={setOneLiner} placeholder="Invoices for freelance designers" />
        <TextInput label="North star metric" value={ns} onChange={setNs} placeholder="Paying customers" description="The one number that says it works. Every cycle is judged by it." />
        <div><Button label={busy ? 'Creating…' : 'Create, paused'} variant="primary" type="submit" isDisabled={busy || !n} icon={ic(PlusIcon)} /></div>
      </VStack></Card>
    </VStack></form></div>
  );
}

// ---------- business ----------
function Tile({label, value, sub, children}) {
  return <Card><VStack gap={1}><Text type="supporting" color="secondary">{label}</Text><div className="big">{value}</div>{sub && <Text type="supporting" color="secondary">{sub}</Text>}{children}</VStack></Card>;
}
const STATUS = {active: ['success', 'Running'], paused: ['neutral', 'Paused'], stopped: ['error', 'Stopped']};
const SPEND_LABEL = {llm: 'AI models', ads: 'Ads', infra: 'Hosting', mail: 'Email'};

function Overview({d, act}) {
  const b = d.business, total = Object.values(d.spent).reduce((a, c) => a + c, 0), capTotal = Object.values(d.caps).reduce((a, c) => a + c, 0);
  const waiting = d.work.filter((w) => w.status === 'proposed');
  return (
    <VStack gap={4}>
      <div className="tiles">
        <Tile label="North star" value={b.north_star ? '0' : '—'} sub={b.north_star || 'Not set yet'} />
        <Tile label="GEL score" value={d.gel ?? '—'} sub="Code health, after the first build" />
        <Tile label="Revenue this month" value={money(d.revenue)} sub="Payments not connected" />
        <Tile label="Spent this month" value={money(total)} sub={'of ' + money(capTotal) + ' cap'}><ProgressBar label="Spent of cap" isLabelHidden value={total} max={capTotal || 1} /></Tile>
      </div>
      <div className="two">
        <Card><VStack gap={3}>
          <HStack gap={2} align="center"><Icon icon={ClipboardDocumentListIcon} size="md" /><Heading level={3}>Waiting for you</Heading>{waiting.length > 0 && <Badge label={String(waiting.length)} variant="blue" />}</HStack>
          {waiting.length ? waiting.slice(0, 3).map((w) => <WorkRow key={w.id} w={w} act={act} />) : <Text color="secondary">Nothing to approve.</Text>}
        </VStack></Card>
        <Card><VStack gap={3}>
          <HStack gap={2} align="center"><Icon icon={ShieldCheckIcon} size="md" /><Heading level={3}>What Founder may do</Heading></HStack>
          <Text color="secondary">Without your approval: nothing. Each approval covers one item, its exact text and its cost, once.</Text>
          {Object.keys(d.caps).map((k) => <ProgressBar key={k} label={SPEND_LABEL[k] + ': ' + money(d.spent[k]) + ' of ' + money(d.caps[k])} value={d.spent[k]} max={d.caps[k] || 1} />)}
        </VStack></Card>
      </div>
    </VStack>
  );
}

function WorkRow({w, act}) {
  return (
    <Card variant="subtle"><VStack gap={2}>
      <div className="row">
        <VStack gap={1}><Text type="emphasized">{w.title}</Text><HStack gap={2} wrap="wrap"><Badge label={w.kind} /><Badge label={'up to ' + money(w.cost_usd) + ' ' + SPEND_LABEL[w.spend_kind]} variant="warning" /></HStack></VStack>
        {w.status === 'proposed'
          ? <HStack gap={2}><Button label="Approve" size="sm" variant="primary" icon={ic(CheckIcon)} onClick={() => act('/api/work/' + w.id + '/approve', 'POST', {hash: w.hash}, 'Approved')} /><Button label="Reject" size="sm" variant="secondary" icon={ic(XMarkIcon)} onClick={() => act('/api/work/' + w.id + '/reject', 'POST', {}, 'Rejected')} /></HStack>
          : <Badge label={w.status} variant={w.status === 'approved' ? 'success' : 'neutral'} />}
      </div>
      {w.body && <Text color="secondary">{w.body}</Text>}
      <span className="mono">approval binds to {w.hash.slice(0, 16)}…</span>
    </VStack></Card>
  );
}

function Work({d, act}) {
  const [title, setTitle] = useState(''), [body, setBody] = useState(''), [kind, setKind] = useState('engineering'), [spend, setSpend] = useState('llm'), [cost, setCost] = useState('1');
  const add = async (e) => { e.preventDefault(); if (await act('/api/businesses/' + d.business.id + '/work', 'POST', {title, body, kind, spend_kind: spend, cost_usd: Number(cost)}, 'Proposed')) { setTitle(''); setBody(''); } };
  return (
    <VStack gap={4}>
      <Card><form onSubmit={add}><VStack gap={3}>
        <Heading level={3}>Propose a task</Heading>
        <Text type="supporting" color="secondary">The AI planner will propose tasks here too. Every one waits for approval.</Text>
        <TextInput label="Title" value={title} onChange={setTitle} placeholder="Add a pricing page" />
        <TextArea label="Details" value={body} onChange={setBody} rows={3} placeholder="What done looks like" />
        <HStack gap={3} wrap="wrap" align="end">
          <label className="field"><Text type="supporting">Kind</Text><select value={kind} onChange={(e) => setKind(e.target.value)}>{['engineering', 'research', 'growth', 'ops'].map((k) => <option key={k}>{k}</option>)}</select></label>
          <label className="field"><Text type="supporting">Spends on</Text><select value={spend} onChange={(e) => setSpend(e.target.value)}>{Object.entries(SPEND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <div style={{width: 140}}><TextInput label="Max cost, USD" type="number" value={cost} onChange={setCost} /></div>
          <Button label="Propose" variant="primary" type="submit" isDisabled={!title.trim()} icon={ic(PlusIcon)} />
        </HStack>
      </VStack></form></Card>
      {d.work.length ? d.work.map((w) => <WorkRow key={w.id} w={w} act={act} />) : <EmptyState title="No tasks yet" description="Propose the first one above." icon={<Icon icon={ClipboardDocumentListIcon} size="lg" />} />}
    </VStack>
  );
}

function Budgets({d, act}) {
  const [caps, setCaps] = useState(Object.fromEntries(Object.entries(d.caps).map(([k, v]) => [k, String(v)])));
  return (
    <Card><VStack gap={3}>
      <Heading level={3}>Monthly caps</Heading>
      <Text color="secondary">A task that would go over its cap is refused, even after you approve it. $0 turns that kind of spend off.</Text>
      {Object.keys(SPEND_LABEL).map((k) => (
        <HStack key={k} gap={3} align="end" wrap="wrap">
          <div style={{width: 180}}><TextInput label={SPEND_LABEL[k] + ', USD a month'} type="number" value={caps[k]} onChange={(v) => setCaps({...caps, [k]: v})} /></div>
          <div style={{flex: 1, minWidth: 200}}><ProgressBar label={'Spent ' + money(d.spent[k])} value={d.spent[k]} max={Number(caps[k]) || 1} /></div>
        </HStack>
      ))}
      <div><Button label="Save caps" variant="primary" onClick={() => act('/api/businesses/' + d.business.id + '/caps', 'PUT', Object.fromEntries(Object.entries(caps).map(([k, v]) => [k, Number(v)])), 'Caps saved')} /></div>
    </VStack></Card>
  );
}

function Activity({d}) {
  return (
    <Card><VStack gap={3}>
      <Heading level={3}>Everything that happened</Heading>
      <Text type="supporting" color="secondary">Every approval, cap change and STOP is recorded here. Nothing is ever removed from it except when you delete the business.</Text>
      <div className="log">{d.audit.map((a, i) => [<Text key={i + 't'} type="supporting" color="secondary">{when(a.at)}</Text>, <Text key={i + 'a'} type="emphasized">{a.action}</Text>, <Text key={i + 'd'}>{a.detail}</Text>])}</div>
    </VStack></Card>
  );
}

function Settings({d, act, onDeleted}) {
  const b = d.business;
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
        <Heading level={3}>Your data</Heading>
        <Text color="secondary">Download everything Founder keeps about this business as one JSON file.</Text>
        <div><Button label="Export" variant="secondary" icon={ic(ArrowDownTrayIcon)} href={'/api/businesses/' + b.id + '/export'} /></div>
      </VStack></Card>
      <Card><VStack gap={3}>
        <Heading level={3}>Delete this business</Heading>
        <Text color="secondary">Removes its tasks, spend log, activity and caps. The name {b.name} is held for 30 days so nobody can take over its links or mail.</Text>
        {err && <Banner status="error" title={err} />}
        <HStack gap={2} align="end" wrap="wrap"><div style={{width: 240}}><TextInput label={'Type ' + b.name + ' to confirm'} value={confirm} onChange={setConfirm} /></div>
          <Button label="Delete forever" variant="destructive" icon={ic(TrashIcon)} isDisabled={confirm !== b.name} onClick={del} /></HStack>
      </VStack></Card>
    </VStack>
  );
}

function Business({id, onChange}) {
  const [d, setD] = useState(null), [tab, setTab] = useState('overview'), [msg, setMsg] = useState(null);
  const load = useCallback(() => call('/api/businesses/' + id).then(setD).catch((x) => setMsg({status: 'error', title: x.message})), [id]);
  useEffect(() => { setD(null); setTab('overview'); load(); }, [load]);
  const act = async (url, method, body, ok) => {
    setMsg(null);
    try { await call(url, method, body); setMsg({status: 'success', title: ok}); await load(); onChange(); return true; } catch (x) { setMsg({status: 'error', title: x.message}); return false; }
  };
  if (!d) return <div className="page">{msg ? <Banner {...msg} /> : <Text color="secondary">Loading…</Text>}</div>;
  const b = d.business, [dot, label] = STATUS[b.status] || STATUS.paused;
  return (
    <div className="page"><VStack gap={4}>
      <div className="row">
        <VStack gap={1}>
          <HStack gap={2} align="center"><Heading level={1}>{b.name}</Heading><StatusDot variant={dot} label={label} /><Text color="secondary">{label}</Text></HStack>
          <Text color="secondary">{b.one_liner || 'No one-liner yet.'}</Text>
          <HStack gap={2} wrap="wrap"><Badge label={b.name + '.app.flisk.si'} icon={ic(GlobeAltIcon)} /><Badge label={b.name + '@app.flisk.si'} icon={ic(EnvelopeIcon)} /><Badge label="Not live yet" variant="warning" /></HStack>
        </VStack>
        <HStack gap={2}>
          {b.status === 'active'
            ? <Button label="STOP everything" variant="destructive" icon={ic(StopIcon)} onClick={() => act('/api/businesses/' + b.id + '/stop', 'POST', {}, 'Stopped. Queued work was cancelled.')} />
            : <Button label="Start" variant="primary" icon={ic(PlayIcon)} onClick={() => act('/api/businesses/' + b.id + '/start', 'POST', {}, 'Started')} />}
        </HStack>
      </div>
      {msg && <Banner {...msg} isDismissable onDismiss={() => setMsg(null)} />}
      <TabList value={tab} onChange={setTab} hasDivider>
        <Tab value="overview" label="Overview" /><Tab value="work" label="Tasks" /><Tab value="budgets" label="Budgets" /><Tab value="activity" label="Activity" /><Tab value="settings" label="Settings" />
      </TabList>
      {tab === 'overview' && <Overview d={d} act={act} />}
      {tab === 'work' && <Work d={d} act={act} />}
      {tab === 'budgets' && <Budgets key={JSON.stringify(d.caps)} d={d} act={act} />}
      {tab === 'activity' && <Activity d={d} />}
      {tab === 'settings' && <Settings d={d} act={act} onDeleted={() => { onChange(); history.pushState(null, '', '/app'); dispatchEvent(new PopStateEvent('popstate')); }} />}
    </VStack></div>
  );
}

// ---------- shell ----------
function Nav({me, current, go}) {
  return (
    <SideNav collapsible
      header={<HStack gap={2} align="center"><span className="brand"><Icon icon={ShieldCheckIcon} size="sm" /></span><Text type="emphasized">Founder</Text></HStack>}
      topContent={<Button label="New business" variant="secondary" icon={ic(PlusIcon)} isFullWidth onClick={() => go('/app/new')} />}
      footer={<VStack gap={1}><Text type="supporting" color="secondary">Signed in as <span data-flisk-login="">{me.user.login}</span></Text><Button label="Sign out" size="sm" variant="ghost" href="/auth/out" /></VStack>}>
      <SideNavSection title="Businesses">
        {me.businesses.map((b) => <SideNavItem key={b.id} label={b.name} icon={BuildingStorefrontIcon} isSelected={current === b.id} onClick={() => go('/app/b/' + b.id)}
          endContent={<StatusDot variant={(STATUS[b.status] || STATUS.paused)[0]} label={(STATUS[b.status] || STATUS.paused)[1]} />} />)}
        {!me.businesses.length && <Text type="supporting" color="secondary">None yet.</Text>}
      </SideNavSection>
      <SideNavSection title="Flisk">
        <SideNavItem label="How it stays safe" icon={LockClosedIcon} onClick={() => go('/app/safety')} isSelected={current === 'safety'} />
        <SideNavItem label="Grow" icon={ChartBarIcon} href="https://grow.flisk.si" target="_blank" />
      </SideNavSection>
    </SideNav>
  );
}

function Safety() {
  const rules = [
    ['Approval for everything', 'Founder proposes. You approve each task, email, ad and deploy. An approval covers one exact item and its cost, once; if the item changes, it needs a new approval.'],
    ['Hard caps', 'Monthly caps for AI models, ads, hosting and email. An approved amount is reserved at once, so two approvals cannot pass a cap together.'],
    ['One STOP button', 'Stops the business and cancels everything queued.'],
    ['Private cabinet', 'GitHub sign-in through login.flisk.si. Another person asking for your business gets "not found". The page cannot be framed by other sites and loads scripts only from Flisk.'],
    ['Names cannot be hijacked', 'Product names like login or chat are reserved. A deleted name is held 30 days before anyone else can claim it.'],
    ['Your data, your call', 'Export everything as JSON, or delete it, from Settings. Founder never stores your provider keys in plain text and never in logs.'],
  ];
  return <div className="page"><VStack gap={4}><Heading level={1}>How Founder stays safe</Heading>{rules.map(([t, d]) => <Card key={t}><VStack gap={1}><Heading level={3}>{t}</Heading><Text color="secondary">{d}</Text></VStack></Card>)}</VStack></div>;
}

export default function App() {
  const [me, setMe] = useState(undefined), [p, setP] = useState(path()), [navOpen, setNavOpen] = useState(false);
  const loadMe = useCallback(() => fetch('/api/me').then((r) => (r.ok ? r.json() : null)).then(setMe).catch(() => setMe(null)), []);
  useEffect(() => { loadMe(); const f = () => setP(path()); addEventListener('popstate', f); return () => removeEventListener('popstate', f); }, [loadMe]);
  const go = (to) => { history.pushState(null, '', to); setP(to); setNavOpen(false); };
  if (me === undefined) return <div className="page"><Text color="secondary">Loading…</Text></div>;
  if (!me) return <Landing />;
  const bid = (p.match(/^\/app\/b\/([\w-]+)$/) || [])[1];
  const current = bid || (p === '/app/safety' ? 'safety' : '');
  const firstId = me.businesses[0]?.id;
  const view = p === '/app/safety' ? <Safety />
    : bid ? <Business key={bid} id={bid} onChange={loadMe} />
    : p === '/app/new' || !firstId ? <NewBusiness onCreated={async (id) => { await loadMe(); go('/app/b/' + id); }} />
    : <Business key={firstId} id={firstId} onChange={loadMe} />;
  const nav = <Nav me={me} current={current || (!bid && p !== '/app/new' ? firstId : '')} go={go} />;
  return (
    <AppShell height="fill" mobileNav={{hasToggle: false, isOpen: navOpen, onOpenChange: setNavOpen, content: <MobileNav header="Founder"><SideNavRenderContext value="drawer-content">{nav}</SideNavRenderContext></MobileNav>}}
      topNav={<HStack gap={2} align="center" style={{padding: 'var(--spacing-2) var(--spacing-3)'}}><MobileNavToggle /><Icon icon={LockClosedIcon} size="sm" /><Text type="supporting" color="secondary">Private cabinet · only you can see this</Text></HStack>}
      sideNav={nav}>
      <div style={{height: '100%', overflow: 'auto'}}>{view}</div>
    </AppShell>
  );
}
