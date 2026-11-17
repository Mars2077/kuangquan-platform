/**
 * 把 server/data/geo-raw-sc 下的四川省行政区划 GeoJSON 简化后输出到 web/public/geo/。
 * 目的：省-市-县三级下钻用的真实边界，体积可控，首屏可用。
 *
 * 来源：阿里云 DataV 行政区划边界（geo.datav.aliyun.com/areas_v3/bound/{adcode}_full.json）
 * 覆盖：四川省 510000（21 个市州）+ 21 个市州各自的下辖区县（183 个县级区划）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const RAW = path.join(ROOT, 'server/data/geo-raw-sc');
const OUT = path.join(ROOT, 'web/public/geo');

const SHORT = (name = '') => name
  .replace(/(藏族羌族自治州|藏族自治州|彝族自治州|自治州|地区)$/, '')
  .replace(/(自治县|市辖区|新区|区|县|市|旗)$/, '');

/** Douglas-Peucker 简化 */
function simplifyRing(points, tolerance) {
  if (points.length <= 4) return points;
  const sqTolerance = tolerance * tolerance;
  const getSqSegDist = (p, p1, p2) => {
    let x = p1[0];
    let y = p1[1];
    let dx = p2[0] - x;
    let dy = p2[1] - y;
    if (dx !== 0 || dy !== 0) {
      const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) {
        x = p2[0];
        y = p2[1];
      } else if (t > 0) {
        x += dx * t;
        y += dy * t;
      }
    }
    dx = p[0] - x;
    dy = p[1] - y;
    return dx * dx + dy * dy;
  };
  const simplifyDPStep = (pts, first, last, sqTol, simplified) => {
    let maxSqDist = sqTol;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const sqDist = getSqSegDist(pts[i], pts[first], pts[last]);
      if (sqDist > maxSqDist) {
        index = i;
        maxSqDist = sqDist;
      }
    }
    if (maxSqDist > sqTol) {
      if (index - first > 1) simplifyDPStep(pts, first, index, sqTol, simplified);
      simplified.push(pts[index]);
      if (last - index > 1) simplifyDPStep(pts, index, last, sqTol, simplified);
    }
  };
  const simplified = [points[0]];
  simplifyDPStep(points, 0, points.length - 1, sqTolerance, simplified);
  simplified.push(points[points.length - 1]);
  return simplified;
}

function processGeometry(geom, tol) {
  const ring = (coords) => {
    const rounded = coords.map((c) => [Math.round(c[0] * 10000) / 10000, Math.round(c[1] * 10000) / 10000]);
    const simplified = simplifyRing(rounded, tol);
    if (simplified.length < 4) return rounded;
    return simplified;
  };
  if (geom.type === 'Polygon') {
    return { type: 'Polygon', coordinates: geom.coordinates.map(ring) };
  }
  if (geom.type === 'MultiPolygon') {
    return { type: 'MultiPolygon', coordinates: geom.coordinates.map((poly) => poly.map(ring)) };
  }
  return geom;
}

function transform(file, tol) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  return {
    type: 'FeatureCollection',
    features: raw.features.map((f) => ({
      type: 'Feature',
      properties: {
        adcode: f.properties.adcode,
        name: f.properties.name,
        short: SHORT(f.properties.name),
        level: f.properties.level,
        center: f.properties.center,
        parent: f.properties.parent && f.properties.parent.adcode
      },
      geometry: processGeometry(f.geometry, tol)
    }))
  };
}

fs.mkdirSync(OUT, { recursive: true });
for (const old of fs.readdirSync(OUT)) {
  if (old.endsWith('.json')) fs.unlinkSync(path.join(OUT, old));
}

let total = 0;
const files = fs.readdirSync(RAW).filter((f) => f.endsWith('.json'));
for (const file of files) {
  const code = path.basename(file, '.json').replace(/_full$/, '');
  const tol = code === '510000' ? 0.0012 : 0.0016;
  const geo = transform(path.join(RAW, file), tol);
  const text = JSON.stringify(geo);
  fs.writeFileSync(path.join(OUT, `${code}.json`), text);
  total += text.length;
  console.log(`geo ${code} -> ${(text.length / 1024).toFixed(1)} KB (${geo.features.length} features)`);
}
console.log(`geo done: ${files.length} files, ${(total / 1024).toFixed(1)} KB`);
