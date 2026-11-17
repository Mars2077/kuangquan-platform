/* 从下载的四川边界 GeoJSON 生成行政区划清单
 * 输出：server/data/regions-sc.json
 *   [{ code, name, short, level, parent, lon, lat }]
 * level: 1=省 2=市州 3=区县
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const RAW = path.join(ROOT, 'server', 'data', 'geo-raw-sc');
const OUT = path.join(ROOT, 'server', 'data', 'regions-sc.json');

const strip = (name = '') => name
  .replace(/(藏族羌族自治州|藏族自治州|彝族自治州|苗族侗族自治州|自治州|地区)$/, '')
  .replace(/(自治县|自治旗)$/, '')
  .replace(/(市辖区|新区|区|县|市|旗)$/, '')
  .replace(/,$/, '');

const read = (code) => {
  const file = path.join(RAW, `${code}_full.json`);
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8')).features || [];
};

const point = (f) => {
  const c = f.properties.center || f.properties.centroid;
  if (Array.isArray(c) && c.length === 2) return c;
  return null;
};

const rows = [];
rows.push({ code: '510000', name: '四川省', short: '四川', level: 1, parent: null, lon: 104.0657, lat: 30.6595 });

const cities = read(510000).map((f) => ({
  code: String(f.properties.adcode),
  name: f.properties.name,
  lon: point(f)?.[0] ?? null,
  lat: point(f)?.[1] ?? null
})).sort((a, b) => a.code.localeCompare(b.code));

let countyCount = 0;
for (const c of cities) {
  rows.push({ code: c.code, name: c.name, short: strip(c.name), level: 2, parent: '510000', lon: c.lon, lat: c.lat });
  const kids = read(c.code).map((f) => ({
    code: String(f.properties.adcode),
    name: f.properties.name,
    lon: point(f)?.[0] ?? null,
    lat: point(f)?.[1] ?? null
  })).sort((a, b) => a.code.localeCompare(b.code));
  for (const k of kids) {
    rows.push({ code: k.code, name: k.name, short: strip(k.name), level: 3, parent: c.code, lon: k.lon, lat: k.lat });
    countyCount += 1;
  }
}

fs.writeFileSync(OUT, JSON.stringify(rows));
const byLevel = rows.reduce((m, r) => ({ ...m, [r.level]: (m[r.level] || 0) + 1 }), {});
console.log(`regions=${rows.length} cities=${cities.length} counties=${countyCount} -> ${OUT}`);
console.log('levels', JSON.stringify(byLevel));
console.log('cities:', cities.map((c) => `${c.code}${strip(c.name)}`).join(' '));
