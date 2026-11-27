// Serves the built page (src/app.generated.js, made from web/ by scripts/embed-web.mjs) at /_app/<name>.<hash>.<ext>.
import { APP_CSS, APP_CSS_PATH, APP_FONTS, APP_JS, APP_JS_PATH } from './app.generated.js';
export { APP_CSS_PATH, APP_JS_PATH };
const YEAR = 'public, max-age=31536000, immutable';
export function appAsset(path) {
  if (path === APP_JS_PATH) return new Response(APP_JS, { headers: { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': YEAR } });
  if (path === APP_CSS_PATH) return new Response(APP_CSS, { headers: { 'content-type': 'text/css; charset=utf-8', 'cache-control': YEAR } });
  const f = APP_FONTS[path];
  return f ? new Response(Uint8Array.from(atob(f), (c) => c.charCodeAt(0)), { headers: { 'content-type': 'font/woff2', 'cache-control': YEAR } }) : null;
}
