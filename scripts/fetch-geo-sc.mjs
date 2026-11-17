/* 下载四川省及 21 个市州的行政边界 GeoJSON（阿里云 DataV 公开边界服务）
 * 输出：server/data/geo-raw-sc/<adcode>_full.json（省 + 各市州，含下辖区县）
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'server', 'data', 'geo-raw-sc');
const BASE = 'https://geo.datav.aliyun.com/areas_v3/bound';

const CITY_CODES = [
  510100, 510300, 510400, 510500, 510600, 510700,
  510800, 510900, 511000, 511100, 511300, 511400,
  511500, 511600, 511700, 511800, 511900, 512000,
  513200, 513300, 513400
];

async function get(url, retry = 3) {
  for (let i = 0; i < retry; i += 1) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'kuangquan-platform/1.1' } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const txt = await r.text();
      if (!txt || txt.length < 100) throw new Error('empty body');
      return txt;
    } catch (e) {
      if (i === retry - 1) throw e;
      await new Promise((s) => setTimeout(s, 800));
    }
  }
  return '';
}

fs.mkdirSync(OUT, { recursive: true });

const jobs = [510000, ...CITY_CODES];
let ok = 0;
for (const code of jobs) {
  const file = path.join(OUT, `${code}_full.json`);
  if (fs.existsSync(file) && fs.statSync(file).size > 1000) {
    ok += 1;
    console.log(`skip ${code}`);
    continue;
  }
  const txt = await get(`${BASE}/${code}_full.json`);
  fs.writeFileSync(file, txt);
  ok += 1;
  console.log(`ok ${code} ${(txt.length / 1024).toFixed(1)} KB`);
}
console.log(`done ${ok}/${jobs.length} -> ${OUT}`);
