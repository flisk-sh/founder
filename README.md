# founder

**founder.flisk.si**: a private cabinet that runs a small app business. Founder proposes the work; you approve every task and every dollar.

## What the MVP does

- Sign in with GitHub through [login.flisk.si](https://login.flisk.si). Each person sees only their own businesses; anyone else gets 404.
- Start a business: claim a name (`<name>.app.flisk.si`, `<name>.flisk.si`, `<name>@app.flisk.si` are reserved; not live yet). It starts **paused**.
- Scorecard: north star, GEL score, revenue, spend against caps.
- Tasks: proposed → approved or rejected. An approval covers one exact item (SHA-256 of its text, kind and cost) once.
- Budgets: monthly caps for AI models, ads, hosting and email. An approved amount is reserved at once, so two approvals cannot pass a cap together. Ads start at $0 (off).
- **STOP** cancels everything queued. Start needs a north star.
- Activity log of every decision. Export everything as JSON; delete with the name typed (the name is held 30 days).

Not yet: the AI planner, builds, deploys, mail, payments, ads. Those are the open issues.

## Safety

- Strict CSP (scripts only from this site and flisk.si), `frame-ancestors 'none'`, `X-Frame-Options: DENY`, no referrer.
- Changes need a same-origin `Origin` header and a JSON body, so a cross-site form cannot act with your cookie.
- Session cookie is HMAC-signed, `HttpOnly`, `Secure`, 14 days. `/auth/dev` works only on localhost with `DEV_LOGIN=1`.
- Reserved names (product names like `login`, `chat`, `www`) can never be claimed.

## Run it

```bash
cd web && bun install && bun run build   # Astryx page -> src/app.generated.js (committed)
bun test
bun run dev                              # http://localhost:8799, sign in at /auth/dev?login=you
```

## Deploy (the owner's call)

Create the D1 database `founder`, put its id in `wrangler.toml`, apply `schema.sql`, set `SESSION_SECRET`, then `bunx wrangler@4 deploy`. Add `https://founder.flisk.si` to login.flisk.si's allowed origins.
