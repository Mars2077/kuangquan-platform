// QA measurement module for v3 full re-test.
// Exported function is serialized into the page, so it must be fully self-contained.

export function measurePage() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const main = document.querySelector('main.app-main');
  const cs = (el) => getComputedStyle(el);
  const vis = (el) => {
    const s = cs(el);
    if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const cls = (el) => (typeof el.className === 'string' ? el.className : (el.getAttribute && el.getAttribute('class')) || '');
  const desc = (el) => ({
    tag: el.tagName.toLowerCase(),
    cls: cls(el).split(/\s+/).filter(Boolean).slice(0, 4).join('.'),
    id: el.id || '',
    text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 70)
  });
  const skipTags = new Set(['svg', 'rect', 'path', 'g', 'use', 'canvas', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'defs', 'clippath', 'lineargradient', 'radialgradient', 'stop', 'circle', 'ellipse', 'line', 'polygon', 'polyline',
    'text', 'tspan', 'foreignobject', 'symbol', 'mask', 'pattern', 'filter', 'image', 'script', 'style', 'link', 'meta', 'head', 'title']);
  const inScrollBox = (el) => {
    let p = el.parentElement;
    while (p && p !== document.body) {
      const s = cs(p);
      if (/(auto|scroll)/.test(s.overflowX) || /(auto|scroll)/.test(s.overflowY)) return true;
      p = p.parentElement;
    }
    return false;
  };
  const inAmap = (el) => !!(el.closest && el.closest('.amap-container, .amap-maps, .amap-marker, .amap-overlay, .map-wrap'));

  // ---- reset scroll to top for screenshot-consistent state ----
  if (main) main.scrollTop = 0;
  window.scrollTo(0, 0);

  // ---------- 1. horizontal overflow ----------
  const docEl = document.documentElement;
  const overflow = {
    docSW: docEl.scrollWidth,
    bodySW: document.body.scrollWidth,
    innerW: vw,
    docDelta: docEl.scrollWidth - vw,
    bodyDelta: document.body.scrollWidth - vw
  };

  // ---------- 2. out-of-bounds - the page body ----------
  const oobAll = [];
  const oobAmap = [];
  const all = document.body.querySelectorAll('*');
  for (const el of all) {
    const tag = el.tagName.toLowerCase();
    if (skipTags.has(tag)) continue;
    if (el.closest('svg')) continue;
    if (!vis(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 || r.left < -1) {
      if (inScrollBox(el)) continue;
      const item = { ...desc(el), left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width) };
      if (inAmap(el)) oobAmap.push(item); else oobAll.push(item);
    }
  }
  const uniq = (arr) => {
    const seen = new Set(); const out = [];
    for (const it of arr) { const k = it.tag + '|' + it.cls + '|' + it.text.slice(0, 30); if (!seen.has(k)) { seen.add(k); out.push(it); } }
    return out;
  };
  const oob = { count: oobAll.length, uniqCount: uniq(oobAll).length, samples: uniq(oobAll).slice(0, 12), amapCount: oobAmap.length };

  // ---------- 3. text truncation ----------
  const sel = ['.page-title', '.page-desc', '.card-title', '.panel-title', '.tile', '.kpi-label', '.kpi-value',
    '.tag', '.btn', '.list-main', '.list-title', '.list-meta', '.battle-head h2', '.card-note', '.m-tile',
    '.desc-list dt', '.desc-list dd', 'h1', 'h2', 'h3'];
  const textSuspicious = [];
  let textChecked = 0, textIntentional = 0;
  const seenEls = new Set();
  for (const s of sel) {
    let nodes = [];
    try { nodes = document.querySelectorAll(s); } catch (e) { continue; }
    for (const el of nodes) {
      if (seenEls.has(el)) continue; seenEls.add(el);
      if (!vis(el)) continue;
      const txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!txt) continue;
      textChecked++;
      if (el.scrollWidth > el.clientWidth + 1) {
        const st = cs(el);
        const ellipsis = st.textOverflow === 'ellipsis' && /nowrap|pre/.test(st.whiteSpace);
        const clamp = st.webkitLineClamp && st.webkitLineClamp !== 'none';
        if (ellipsis || clamp) { textIntentional++; }
        else textSuspicious.push({ ...desc(el), cw: el.clientWidth, sw: el.scrollWidth, ws: st.whiteSpace, ov: st.overflow, to: st.textOverflow });
      }
    }
  }
  const text = { checked: textChecked, intentional: textIntentional, suspiciousCount: textSuspicious.length, samples: textSuspicious.slice(0, 10) };

  // ---------- 4a. bottom whitespace (scroll to bottom first) ----------
  const mainScrollH = main ? main.scrollHeight : 0;
  const mainClientH = main ? main.clientHeight : 0;
  if (main) main.scrollTop = main.scrollHeight;
  window.scrollTo(0, docEl.scrollHeight);
  // visible rect clipped by every overflow ancestor and the viewport
  const clipRect = (el) => {
    const r = el.getBoundingClientRect();
    let top = r.top, bottom = r.bottom, left = r.left, right = r.right;
    let p = el.parentElement;
    while (p && p !== document.documentElement) {
      const s = cs(p);
      if (/(auto|scroll|hidden|clip)/.test(s.overflowX) || /(auto|scroll|hidden|clip)/.test(s.overflowY)) {
        const pr = p.getBoundingClientRect();
        top = Math.max(top, pr.top); bottom = Math.min(bottom, pr.bottom);
        left = Math.max(left, pr.left); right = Math.min(right, pr.right);
      }
      p = p.parentElement;
    }
    top = Math.max(top, 0); left = Math.max(left, 0);
    bottom = Math.min(bottom, vh); right = Math.min(right, vw);
    return { top, bottom, left, right, w: right - left, h: bottom - top };
  };
  const candidates = [];
  if (main) {
    for (const el of main.querySelectorAll('*')) {
      const tag = el.tagName.toLowerCase();
      if (skipTags.has(tag) && !['table', 'tr', 'td', 'th', 'canvas'].includes(tag)) continue;
      if (!vis(el)) continue;
      if (el.closest('svg')) continue;
      if (el.classList.contains('sr-only')) continue;
      if (el.getAttribute('aria-hidden') === 'true') continue;
      const st = cs(el);
      if (st.position === 'fixed') continue;
      const hasOwnText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
      const media = ['img', 'canvas', 'table', 'tr', 'td', 'th', 'button', 'input', 'select', 'textarea', 'video'].includes(tag);
      if (!hasOwnText && !media) continue;
      const cr = clipRect(el);
      if (cr.h <= 0 || cr.w <= 0) continue;
      candidates.push({
        el,
        bottom: cr.bottom,
        item: { ...desc(el), bottom: Math.round(cr.bottom), top: Math.round(cr.top), h: Math.round(cr.h), rawBottom: Math.round(el.getBoundingClientRect().bottom) }
      });
    }
  }
  candidates.sort((a, b) => b.bottom - a.bottom);
  const lastCand = candidates[0];
  const gap = lastCand ? Math.round(vh - lastCand.bottom) : null;
  const whitespace = {
    gap,
    lastEl: lastCand ? lastCand.item : null,
    mainScrollH, mainClientH,
    mainScrollable: mainScrollH > mainClientH + 1,
    mainScrollTop: main ? Math.round(main.scrollTop) : null,
    docScrollH: docEl.scrollHeight, docScrollable: docEl.scrollHeight > vh + 1,
    topGap: (() => { // gap with content at initial top scroll (informational)
      const mc = main ? main.getBoundingClientRect() : null;
      return mc ? Math.round(vh - mc.bottom) : null;
    })()
  };

  // ---------- 4b. card padding / inner slack ----------
  const padSel = ['.card', '.panel', '.kpi-card', '.portal-section', '.battle-cards', '.card-body', '.panel-body', '.content-grid'];
  const padOver = [];
  const padAll = [];
  const slackOver = [];
  const cardNodes = new Set();
  for (const s of padSel) {
    let nodes = [];
    try { nodes = document.querySelectorAll(s); } catch (e) { continue; }
    for (const el of nodes) {
      if (!vis(el)) continue;
      cardNodes.add(el);
      const st = cs(el);
      const pt = parseFloat(st.paddingTop) || 0, pb = parseFloat(st.paddingBottom) || 0;
      const sum = Math.round(pt + pb);
      const item = { ...desc(el), pt: Math.round(pt), pb: Math.round(pb), sum, h: Math.round(el.getBoundingClientRect().height) };
      padAll.push(item);
      if (sum > 80) padOver.push(item);
      // inner slack: distance between last in-flow child bottom and card content bottom
      if (['card', 'panel', 'kpi-card', 'portal-section', 'card-body', 'panel-body'].some((c) => el.classList.contains(c))) {
        const cr = el.getBoundingClientRect();
        let lastB = cr.top + pt;
        let childCount = 0;
        for (const ch of el.children) {
          const chs = cs(ch);
          if (chs.position === 'absolute' || chs.position === 'fixed') continue;
          const rr = ch.getBoundingClientRect();
          if (rr.height <= 0) continue;
          childCount++;
          lastB = Math.max(lastB, rr.bottom);
        }
        const slack = Math.round(cr.bottom - pb - lastB);
        if (childCount > 0 && slack > 80) {
          slackOver.push({ ...desc(el), h: Math.round(cr.height), slack, children: childCount });
        }
      }
    }
  }
  padAll.sort((a, b) => b.sum - a.sum);

  // ---------- 5. card/panel body content overflow ----------
  const ovf = [];
  for (const s of ['.card-body', '.panel-body', '.card', '.panel']) {
    let nodes = [];
    try { nodes = document.querySelectorAll(s); } catch (e) { continue; }
    for (const el of nodes) {
      if (!vis(el)) continue;
      const d = el.scrollHeight - el.clientHeight;
      if (d > 1) ovf.push({ ...desc(el), sh: el.scrollHeight, ch: el.clientHeight, delta: d, ov: cs(el).overflowY });
    }
  }
  ovf.sort((a, b) => b.delta - a.delta);
  const panelOverflow = { count: ovf.length, top: ovf.slice(0, 10) };

  // ---------- 6. structure ----------
  const h1s = Array.from(document.querySelectorAll('h1'));
  let mainScrollWorks = null;
  if (main) {
    if (main.scrollHeight > main.clientHeight + 1) {
      main.scrollTop = 0; const before = main.scrollTop;
      main.scrollTop = 120; mainScrollWorks = main.scrollTop > before + 50;
      main.scrollTop = 0;
    } else mainScrollWorks = 'n/a';
  }
  const structure = {
    h1Count: h1s.length,
    h1Text: h1s.map((h) => (h.textContent || '').replace(/\s+/g, ' ').trim()).slice(0, 3),
    mainScrollWorks,
    docScrollable: docEl.scrollHeight > vh + 1
  };

  // ---------- 7. interaction targets ----------
  const small = [];
  let targetTotal = 0;
  for (const el of document.querySelectorAll('button, a')) {
    if (el.closest('.amap-logo')) continue;
    if (!vis(el)) continue;
    targetTotal++;
    const r = el.getBoundingClientRect();
    if (r.height < 24 || r.width < 24) small.push({ ...desc(el), w: Math.round(r.width), h: Math.round(r.height) });
  }
  const targets = { total: targetTotal, smallCount: small.length, samples: small.slice(0, 10) };

  // ---------- 8. canvas / charts ----------
  const canvases = Array.from(document.querySelectorAll('canvas')).map((c) => {
    const r = c.getBoundingClientRect();
    const roleNode = c.closest('[role="img"]');
    return {
      w: Math.round(r.width), h: Math.round(r.height),
      aria: (c.getAttribute('aria-label') || '').slice(0, 80),
      roleImg: !!roleNode,
      roleAria: roleNode ? (roleNode.getAttribute('aria-label') || '').slice(0, 80) : '',
      parentCls: cls(c.parentElement).split(/\s+/).filter(Boolean).slice(0, 3).join('.'),
      visible: r.width > 0 && r.height > 0
    };
  });
  const chart = { canvasCount: canvases.length, withRoleImg: canvases.filter((c) => c.roleImg).length, detail: canvases.slice(0, 8) };

  // ---------- extras ----------
  const skeletonVisible = Array.from(document.querySelectorAll('.skeleton')).filter(vis).length;
  const empties = Array.from(document.querySelectorAll('.empty')).filter(vis).map((e) => ({ txt: (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60), cls: cls(e) })).slice(0, 6);
  const extras = {
    skeletonVisible,
    empties,
    cards: document.querySelectorAll('.card').length,
    kpis: document.querySelectorAll('.kpi-card').length,
    rows: document.querySelectorAll('.data-table tbody tr, .battle-table tbody tr').length,
    tags: document.querySelectorAll('.tag').length,
    tiles: document.querySelectorAll('.tile').length,
    bodyTextLen: (document.body.innerText || '').length,
    bodyTextHead: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 120)
  };

  // restore to top for the next screenshot
  if (main) main.scrollTop = 0;
  window.scrollTo(0, 0);

  return {
    viewport: { w: vw, h: vh, dpr: window.devicePixelRatio },
    overflow, oob, text, whitespace,
    cardPad: { over80: padOver, max: padAll.slice(0, 6) },
    cardSlack: { over80: slackOver.slice(0, 10) },
    panelOverflow, structure, targets, chart, extras
  };
}

export const ROUTES = [
  { slug: 'portal', path: '/portal' },
  { slug: 'dashboard', path: '/dashboard' },
  { slug: 'scene-plan', path: '/scene/plan' },
  { slug: 'scene-green', path: '/scene/green' },
  { slug: 'scene-rights', path: '/scene/rights' },
  { slug: 'battle', path: '/battle' },
  { slug: 'biz-deposit', path: '/biz/deposit' },
  { slug: 'biz-rights-rights-clean-sale', path: '/biz/rights/rights-clean-sale' },
  { slug: 'archive-1', path: '/archive/1' },
  { slug: 'warehouse', path: '/warehouse' },
  { slug: 'mobile', path: '/mobile' },
  { slug: 'system', path: '/system' }
];
