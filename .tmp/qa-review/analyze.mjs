import fs from 'node:fs';
const files = process.argv.slice(2);
const rows = [];
for (const f of files) {
  const arr = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const r of arr) {
    const ws = r.whitespace || {};
    const tg = r.targets || {};
    const ch = r.chart || {};
    const textSus = (r.text && r.text.samples || []).filter((s) => !/sr-only/.test(s.cls || ''));
    const slack = (r.cardSlack && r.cardSlack.over80) || [];
    const po = (r.panelOverflow && r.panelOverflow.top) || [];
    rows.push({
      vp: r.vpName || r.viewport.w + 'x' + r.viewport.h,
      slug: r.slug,
      doc: r.overflow.docDelta,
      oob: r.oob.count,
      amapOob: r.oob.amapCount,
      gap: ws.gap,
      main: [ws.mainScrollH, ws.mainClientH, ws.mainScrollable, r.structure.mainScrollWorks, ws.mainScrollTop],
      h1: r.structure.h1Count,
      textSus: textSus.length,
      textSusDetail: textSus.slice(0, 3),
      small: tg.smallCount,
      total: tg.total,
      smallKinds: Array.from(new Set((tg.samples || []).map((s) => s.tag + '.' + (s.cls || '') + ':' + s.text + ':' + s.w + 'x' + s.h))).slice(0, 5),
      canvas: [ch.canvasCount, ch.withRoleImg],
      slack: slack.map((s) => ({ cls: s.cls, h: s.h, slack: s.slack, text: s.text.slice(0, 26) })),
      padMax: r.cardPad.max && r.cardPad.max[0] && r.cardPad.max[0].sum,
      padOver: (r.cardPad.over80 || []).length,
      panelOv: po.map((p) => ({ cls: p.cls, delta: p.delta, ov: p.ov, text: p.text.slice(0, 22) })),
      rows: r.extras.rows,
      tiles: r.extras.tiles,
      kpis: r.extras.kpis,
      head: r.textLen,
    });
  }
}
for (const r of rows) console.log(JSON.stringify(r));
console.log('TOTAL ' + rows.length + ' records; files=' + files.length);
