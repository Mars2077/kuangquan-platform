import fs from 'node:fs';
const BASE = 'http://127.0.0.1:8787/';
const SHOT = 'E:/矿权管理/kuangquan-platform/docs/shots/review/v5/';
const TMP = 'E:/矿权管理/kuangquan-platform/.tmp/qa-review/';

export async function runBatch({ page, cdp, vw, vh, name, mobile = false, dsf = 1, routes, settle = 800 }) {
  await cdp('Emulation.setDeviceMetricsOverride', {
    width: vw, height: vh, deviceScaleFactor: dsf, mobile,
  });
  await page.waitForTimeout(500);
  const mod = await import('file:///E:/矿权管理/kuangquan-platform/.tmp/qa-review/measure.mjs');
  const out = [];
  for (const [slug, path] of routes) {
    await page.goto(BASE + '?r=' + Date.now() + '#' + path);
    let len = 0;
    let ok = false;
    let waitMs = 0;
    for (let i = 0; i < 60; i++) {
      await page.waitForTimeout(250);
      waitMs += 250;
      len = await page.evaluate(() => document.body.innerText.trim().length);
      if (len > 200) { ok = true; break; }
    }
    await page.waitForTimeout(settle);
    let m;
    try {
      m = await page.evaluate(mod.measurePage);
    } catch (e) {
      m = { error: String(e).slice(0, 300) };
    }
    let shotErr = null;
    try {
      await page.screenshot({ path: SHOT + name + '-' + slug + '.png' });
    } catch (e) {
      shotErr = String(e).slice(0, 200);
    }
    m.slug = slug;
    m.path = path;
    m.textLen = len;
    m.ready = ok;
    m.waitMs = waitMs;
    m.shotErr = shotErr;
    m.vpName = name;
    out.push(m);
    process.stdout.write('DONE ' + name + ' ' + slug + ' len=' + len + ' gap=' + (m.whitespace && m.whitespace.gap) + ' doc=' + (m.overflow && m.overflow.docDelta) + '\n');
  }
  fs.writeFileSync(TMP + 'measure-' + name + '.json', JSON.stringify(out, null, 2));
  const summary = out.map((o) => ({
    slug: o.slug,
    ready: o.ready,
    len: o.textLen,
    vp: o.viewport,
    gap: o.whitespace && o.whitespace.gap,
    doc: o.overflow && o.overflow.docDelta,
    h1: o.structure && o.structure.h1Count,
    oob: o.oob && o.oob.count,
    txt: o.text && o.text.suspiciousCount,
    small: o.targets && o.targets.smallCount,
    canvas: o.chart && o.chart.canvasCount,
    slack: o.cardSlack && (o.cardSlack.over80 || []).length,
    panelOv: o.panelOverflow && o.panelOverflow.count,
    shotErr: !!o.shotErr,
    err: o.error || null,
  }));
  return { name, n: out.length, rows: summary };
}
