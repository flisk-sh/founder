// Run in the page: share of 16x16 tiles with no content (text, field, button, icon, image, frame), plus a coarse map
// of where the blank tiles are. Flat backgrounds, card fills and borders count as empty. Used by dogfood checks.
(() => {
  const T = 16, W = innerWidth, H = innerHeight, cols = Math.ceil(W / T), rows = Math.ceil(H / T);
  const hit = new Uint8Array(cols * rows);
  const mark = (r) => {
    if (r.width < 1 || r.height < 1 || r.right < 0 || r.bottom < 0 || r.left > W || r.top > H) return;
    for (let y = Math.max(0, Math.floor(r.top / T)); y <= Math.min(rows - 1, Math.floor((r.bottom - 1) / T)); y++)
      for (let x = Math.max(0, Math.floor(r.left / T)); x <= Math.min(cols - 1, Math.floor((r.right - 1) / T)); x++) hit[y * cols + x] = 1;
  };
  const visible = (el) => { const s = getComputedStyle(el); return s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05; };
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) {
    if (!n.textContent.trim() || !n.parentElement || !visible(n.parentElement)) continue;
    const rg = document.createRange(); rg.selectNodeContents(n);
    for (const r of rg.getClientRects()) mark(r);
  }
  for (const el of document.querySelectorAll('img,svg,iframe,input,textarea,select,button,progress,[role=progressbar],canvas,video')) if (visible(el)) mark(el.getBoundingClientRect());
  const empty = hit.reduce((a, v) => a + (v ? 0 : 1), 0) / hit.length;
  // 8x6 map of blank share per region, to show where the space goes.
  const MX = 8, MY = 6, map = [];
  for (let my = 0; my < MY; my++) { const row = [];
    for (let mx = 0; mx < MX; mx++) { let e = 0, t = 0;
      for (let y = Math.floor(my * rows / MY); y < Math.floor((my + 1) * rows / MY); y++)
        for (let x = Math.floor(mx * cols / MX); x < Math.floor((mx + 1) * cols / MX); x++) { t++; if (!hit[y * cols + x]) e++; }
      row.push(Math.round(100 * e / t)); }
    map.push(row.map((v) => String(v).padStart(3)).join(' ')); }
  return {viewport: W + 'x' + H, emptyPct: Math.round(empty * 1000) / 10, map};
})();
