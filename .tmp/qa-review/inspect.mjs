import fs from 'node:fs';
const files = process.argv.slice(2);
for (const f of files) {
  if (!fs.existsSync(f)) { console.log('MISSING', f); continue; }
  const arr = JSON.parse(fs.readFileSync(f, 'utf8'));
  console.log('##### ' + f + ' n=' + arr.length);
  for (const r of arr) {
    const t = r.text || {};
    const tg = r.targets || {};
    const ws = r.whitespace || {};
    const ch = r.chart || {};
    const ex = r.extras || {};
    const slack = (r.cardSlack && r.cardSlack.over80) || [];
    console.log(JSON.stringify({
      slug: r.slug,
      vp: r.viewport,
      ready: r.ready,
      textLen: r.textLen,
      docDelta: r.overflow && r.overflow.docDelta,
      oob: r.oob && r.oob.count,
      oobAmap: r.oob && r.oob.amapCount,
      h1: r.structure && r.structure.h1Count,
      h1sr: r.structure && r.structure.h1Text,
      mainScroll: [ws.mainScrollH, ws.mainClientH, ws.mainScrollable, ws.mainScrollTop],
      gap: ws.gap,
      lastEl: ws.lastEl && (ws.lastEl.tag + '.' + ws.lastEl.cls + ' b=' + ws.lastEl.bottom),
      textChecked: t.checked,
      textIntentional: t.intentional,
      textSus: t.suspiciousCount,
      textSamples: (t.samples || []).slice(0, 6),
      targets: [tg.total, tg.smallCount],
      smallSamples: (tg.samples || []).slice(0, 8),
      canvas: ch.canvasCount,
      canvasRole: ch.withRoleImg,
      echartsNoRole: (ch.detail || []).filter((d) => !d.roleImg && d.parentCls !== 'amap-layers' && d.visible),
      amapCanvas: (ch.detail || []).filter((d) => d.parentCls === 'amap-layers' || d.w > 1000).length,
      panelOverflow: r.panelOverflow,
      slack,
      cardPad: r.cardPad && r.cardPad.over80,
      extras: ex
    }));
  }
}
