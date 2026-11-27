// The landing page draft, rendered from data with every field escaped. Served sandboxed: no script, no form, no network.
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const human = (n) => String(n).replace(/-\d+$/, '').split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
export function landingHtml(name, d, live = null) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(d.brand || human(name))}</title>
<style>body{margin:0;font:16px/1.5 system-ui,sans-serif;color:#0f172a;background:#fff}header{display:flex;justify-content:space-between;align-items:center;padding:16px 28px;border-bottom:1px solid #e2e8f0}
b{font-size:18px}main{max-width:720px;margin:0 auto;padding:64px 28px;text-align:center}h1{font-size:44px;line-height:1.1;margin:0 0 16px;letter-spacing:-.02em}
p{color:#475569;font-size:18px;margin:0 0 28px}ul{list-style:none;padding:0;display:grid;gap:10px;margin:32px 0;text-align:left}li{padding:14px 16px;border:1px solid #e2e8f0;border-radius:12px}
li:before{content:"✓  ";color:#2563eb;font-weight:700}.cta{display:inline-block;background:#2563eb;color:#fff;padding:12px 22px;border-radius:10px;font-weight:600}
footer{color:#94a3b8;font-size:13px;text-align:center;padding:24px}@media (prefers-color-scheme:dark){body{background:#0b1220;color:#e2e8f0}header,li{border-color:#1e293b}p{color:#94a3b8}}</style></head>
<body><header><b>${esc(d.brand || human(name))}</b><span class="cta" style="padding:8px 14px;font-size:14px">${esc(d.cta)}</span></header>
<main><h1>${esc(d.headline)}</h1><p>${esc(d.sub)}</p>${live ? `<form method="post" action="${esc(live.form)}" style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><input type="email" name="email" required maxlength="254" placeholder="Your email" aria-label="Your email" style="font:inherit;padding:11px 14px;border:1px solid #cbd5e1;border-radius:10px;min-width:240px"><input name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px"><button class="cta" style="border:0;font:inherit;font-weight:600;cursor:pointer">${esc(d.cta)}</button></form>${live.note ? `<p style="margin-top:14px;font-size:16px">${esc(live.note)}</p>` : ''}<p style="font-size:13px;margin-top:10px">We only use your email to tell you when we open. Ask us to remove it at any time.</p>` : `<span class="cta">${esc(d.cta)}</span>`}<ul>${(d.bullets || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></main>
<footer>${esc(name)}.app.flisk.si${live ? '' : ' · draft, not published'}</footer></body></html>`;
}
export const PREVIEW_HEADERS = {
  'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-frame-options': 'SAMEORIGIN',
  'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'self'; sandbox",
};
