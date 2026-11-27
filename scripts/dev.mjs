// Local preview without wrangler: the Worker under Bun.serve with D1 as a local SQLite file (.dev.sqlite). Sign in at /auth/start.
// Set INFERENCE_KEY (a key from inference.flisk.si) for real model drafts; without it you get labelled offline drafts.
import worker from '../src/index.js';
import { d1 } from '../test/d1.js';

const env = { DB: d1(process.env.DB_FILE || '.dev.sqlite'), SESSION_SECRET: 'local-dev-only', DEV_LOGIN: '1', LOGIN_PUBLIC_KEY: '', INFERENCE_KEY: process.env.INFERENCE_KEY || '' };
const port = Number(process.env.PORT || 8799);
Bun.serve({
  port,
  hostname: '127.0.0.1',
  fetch: (req) => {
    const u = new URL(req.url);
    u.hostname = 'localhost';
    return worker.fetch(new Request(u, req), env);
  },
});
console.log(`founder on http://localhost:${port}  (sign in: /auth/dev?login=you)`);
