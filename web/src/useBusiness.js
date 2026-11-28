// One business as the page uses it: the loaded record plus every action on it (start, stop, say yes, change a limit).
// The buttons, the right-click menus and the command palette all call these, so each action is defined once.
import {useCallback, useEffect, useState} from 'react';
import {call, money, nJobs, SPEND_LABEL} from './client.js';

export function useBusiness(id, {say, onChange}) {
  const [d, setD] = useState(null), [busy, setBusy] = useState(false);
  const load = useCallback(() => call('/api/businesses/' + id).then(setD).catch((x) => say(x.message)), [id]);
  useEffect(() => { setD(null); load(); }, [load]);
  const refresh = async () => { await load(); onChange(); };

  // Several calls in a row, one message at the end.
  const run = async (fn, ok) => {
    setBusy(true);
    try { await fn(); say(ok); } catch (x) { say(x.message); } finally { await refresh(); setBusy(false); }
  };
  // One call. The server's note or a failed job changes what the owner is told.
  const act = async (url, method, body, ok) => {
    setBusy(true);
    try {
      const j = await call(url, method, body);
      say(j.note ? ok + '. ' + j.note : j.status === 'failed' ? 'It did not work. Open the job to see why.' : ok);
      await refresh();
      return true;
    } catch (x) { say(x.message); return false; } finally { setBusy(false); }
  };

  const base = '/api/businesses/' + id;
  return {
    d, busy, load, run, act,
    start: () => act(base + '/start', 'POST', {}, 'Started. The jobs you said yes to will now be done.'),
    stop: () => act(base + '/stop', 'POST', {}, 'Stopped. Nothing else will happen.'),
    approve: (w) => act('/api/work/' + w.id + '/approve', 'POST', {hash: w.hash}, 'You said yes'),
    yesAll: (waiting) => run(async () => { for (const w of waiting) await call('/api/work/' + w.id + '/approve', 'POST', {hash: w.hash}); }, `You said yes to ${nJobs(waiting.length)}`),
    setCap: (k, v) => act(base + '/caps', 'PUT', {...d.caps, [k]: v}, `${SPEND_LABEL[k]} limit is now ${money(v)} a month`),
  };
}
