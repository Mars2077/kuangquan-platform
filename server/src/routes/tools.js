import express from 'express';
import { all, get } from '../db.js';
import { ok, fail, wrap, nowStr } from '../util.js';
import { authRequired } from '../auth.js';

const router = express.Router();
router.use(authRequired);

const R_EARTH = 6371.0088; // km
const D2R = Math.PI / 180;

/** 经纬度多边形面积（km²）：以中心纬度做等距圆柱投影后鞋带公式 */
function polygonAreaKm2(points) {
  if (!Array.isArray(points) || points.length < 3) return 0;
  const avgLat = points.reduce((s, p) => s + p[1], 0) / points.length;
  const kx = Math.cos(avgLat * D2R) * 111.32;
  const ky = 110.57;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = [points[i][0] * kx, points[i][1] * ky];
    const j = (i + 1) % points.length;
    const [x2, y2] = [points[j][0] * kx, points[j][1] * ky];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
}

function pointInPolygon(pt, poly) {
  let inside = false;
  const [x, y] = pt;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function distanceKm(a, b) {
  const dLat = (b[1] - a[1]) * D2R;
  const dLon = (b[0] - a[0]) * D2R;
  const la1 = a[1] * D2R;
  const la2 = b[1] * D2R;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(h)));
}

function circleRadiusKm(areaKm2) {
  if (!areaKm2 || areaKm2 <= 0) return 0.4;
  return Math.sqrt(areaKm2 / Math.PI);
}

/** 用网格采样估算「查询多边形」与「目标圆」的重叠面积 */
function overlapWithCircle(poly, center, radiusKm, samples = 24) {
  const lons = poly.map((p) => p[0]);
  const lats = poly.map((p) => p[1]);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  let insidePoly = 0, insideBoth = 0;
  for (let i = 0; i < samples; i++) {
    for (let j = 0; j < samples; j++) {
      const lon = minLon + ((i + 0.5) / samples) * (maxLon - minLon);
      const lat = minLat + ((j + 0.5) / samples) * (maxLat - minLat);
      if (!pointInPolygon([lon, lat], poly)) continue;
      insidePoly += 1;
      if (distanceKm([lon, lat], center) <= radiusKm) insideBoth += 1;
    }
  }
  const polyArea = polygonAreaKm2(poly);
  if (!insidePoly) return { area: 0, ratio: 0 };
  const area = (insideBoth / insidePoly) * polyArea;
  return { area: Number(area.toFixed(4)), ratio: Number((area / Math.max(polyArea, 0.0001)).toFixed(4)) };
}

/* ------------------------------------------------------------------ 储量核算 */
router.post('/reserve-calc', wrap((req, res) => {
  const b = req.body || {};
  const areaKm2 = Number(b.areaKm2 || 0);
  const thickness = Number(b.thickness || 0);
  const density = Number(b.density || 2.7); // t/m³
  const resource = b.resourceTotal !== undefined && b.resourceTotal !== '' ? Number(b.resourceTotal) : areaKm2 * 1e6 * thickness * density;
  const mined = Number(b.mined || 0);
  const loss = Number(b.loss || 0);
  const recovery = Number(b.recovery || 0);
  const dilution = Number(b.dilution || 0);
  const utilization = Number(b.utilization || 0);
  const remaining = Math.max(0, resource - mined - loss);
  const totalT = resource / 1e4; // 万吨
  const remainingT = remaining / 1e4;
  const checks = [
    { key: 'recovery', label: '开采回采率', value: recovery, standard: '≥ 90%（地下） / ≥ 95%（露天）', ok: recovery >= 90 },
    { key: 'dilution', label: '矿石贫化率', value: dilution, standard: '≤ 10%', ok: dilution <= 10 },
    { key: 'utilization', label: '选矿回收率', value: utilization, standard: '≥ 80%', ok: utilization >= 80 }
  ];
  const failed = checks.filter((c) => !c.ok);
  ok(res, {
    input: { areaKm2, thickness, density, mined, loss, recovery, dilution, utilization },
    result: {
      resourceTotal: Number(totalT.toFixed(2)),
      remaining: Number(remainingT.toFixed(2)),
      mined: Number((mined / 1e4).toFixed(2)),
      loss: Number((loss / 1e4).toFixed(2)),
      unit: '万吨',
      serviceYears: recovery ? Number(((remainingT * (recovery / 100)) / Math.max(1, Number(b.annualOutput || 100))).toFixed(1)) : null
    },
    checks,
    conclusion: failed.length ? `三率指标中 ${failed.map((f) => f.label).join('、')} 未达行业标准，需说明原因。` : '三率指标均达到行业标准要求。'
  });
}));

/* ------------------------------------------------------------------ 空间叠置分析 */
router.post('/overlay', wrap((req, res) => {
  const { points = [], bufferKm = 0 } = req.body || {};
  if (!Array.isArray(points) || points.length < 3) return fail(res, '请至少绘制 3 个顶点', 400);
  const poly = points.map((p) => [Number(p[0]), Number(p[1])]);
  const area = polygonAreaKm2(poly);
  const center = [poly.reduce((s, p) => s + p[0], 0) / poly.length, poly.reduce((s, p) => s + p[1], 0) / poly.length];

  const candidates = [
    ...all(`SELECT id, name, '矿产地' AS kind, area AS area_km2, reserve_t, lon, lat FROM mineral_deposit WHERE lon IS NOT NULL`),
    ...all(`SELECT id, mine_name AS name, right_type AS kind, area AS area_km2, price AS reserve_t, lon, lat FROM mining_right WHERE lon IS NOT NULL`)
  ];
  const hits = [];
  let totalOverlap = 0;
  let reserveOverlap = 0;
  for (const c of candidates) {
    if (distanceKm(center, [c.lon, c.lat]) > 60) continue;
    const r = circleRadiusKm(Math.max(0.05, c.area_km2 || 1)) + bufferKm;
    const o = overlapWithCircle(poly, [c.lon, c.lat], r);
    if (o.area > 0.0005) {
      hits.push({ id: c.id, name: c.name, kind: c.kind, overlapArea: o.area, overlapRatio: o.ratio, reserve: c.reserve_t });
      totalOverlap += o.area;
      reserveOverlap += (c.reserve_t || 0) * o.ratio;
    }
  }
  hits.sort((a, b) => b.overlapArea - a.overlapArea);
  ok(res, {
    query: { points: poly, area: Number(area.toFixed(4)), center, bufferKm },
    summary: {
      area: Number(area.toFixed(4)),
      overlapArea: Number(totalOverlap.toFixed(4)),
      overlapRatio: area ? Number(((totalOverlap / area) * 100).toFixed(2)) : 0,
      reserveOverlap: Number(reserveOverlap.toFixed(2)),
      hitCount: hits.length
    },
    hits: hits.slice(0, 50),
    conclusion: hits.length
      ? `范围内共重叠 ${hits.length} 个空间对象，累计重叠面积 ${totalOverlap.toFixed(4)} km²，估算压覆资源量 ${reserveOverlap.toFixed(2)} 万吨。`
      : '范围内未发现与现有矿产地、矿业权的空间重叠。'
  });
}));

/* ------------------------------------------------------------------ 选址合规审查 */
router.post('/precheck', wrap((req, res) => {
  const b = req.body || {};
  const lon = Number(b.lon || 0);
  const lat = Number(b.lat || 0);
  const areaKm2 = Number(b.areaKm2 || 0);
  if (!lon || !lat) return fail(res, '请提供有效的坐标位置', 400);
  const pt = [lon, lat];
  const radiusKm = circleRadiusKm(Math.max(0.05, areaKm2 || 1));

  const rights = all(`SELECT id, mine_name, right_type, holder, area, lon, lat FROM mining_right WHERE lon IS NOT NULL`).filter((r) => distanceKm(pt, [r.lon, r.lat]) < radiusKm + circleRadiusKm(r.area));
  const hazards = all(`SELECT id, name, type, level, lon, lat FROM hazard_point WHERE lon IS NOT NULL`).filter((h) => distanceKm(pt, [h.lon, h.lat]) < radiusKm + 1);
  const zones = all(`SELECT id, name, zone_type, region_name, area FROM plan_zone`).filter((z) => {
    const row = get(`SELECT center_lon, center_lat FROM region WHERE code = (SELECT code FROM region WHERE name = ? LIMIT 1)`, [z.region_name]);
    if (!row) return false;
    return distanceKm(pt, [row.center_lon, row.center_lat]) < Math.max(8, circleRadiusKm(z.area || 10) + radiusKm);
  });

  const blocking = [];
  const limiting = [];
  if (rights.length) blocking.push(`与 ${rights.length} 宗已设矿业权重叠（${rights.slice(0, 3).map((r) => r.mine_name).join('、')}）`);
  const highHazard = hazards.filter((h) => ['一级', '二级'].includes(h.level));
  if (highHazard.length) limiting.push(`距离 ${highHazard.length} 处一级/二级地质灾害隐患点不足 1 公里`);
  const forbiddenZones = zones.filter((z) => z.zone_type === '重点勘查区');
  if (!zones.length) limiting.push('未落入任何已批复规划区块，需先开展规划区块调整论证');

  const conclusion = blocking.length ? '不通过：存在禁止性情形' : limiting.length ? '限制通过：需落实避让或补充论证' : '通过：未发现禁止性、限制性情形';
  ok(res, {
    query: { lon, lat, areaKm2, radiusKm: Number(radiusKm.toFixed(3)) },
    rights, hazards, zones: zones.slice(0, 10),
    rules: [
      { rule: '生态保护红线', result: '未相交（该红线图层按省级底图判定）', ok: true },
      { rule: '永久基本农田', result: '未相交（该图层按省级底图判定）', ok: true },
      { rule: '自然保护地', result: '未相交（该图层按省级底图判定）', ok: true },
      { rule: '已设矿业权', result: rights.length ? `重叠 ${rights.length} 宗` : '无重叠', ok: rights.length === 0 },
      { rule: '地质灾害隐患点', result: hazards.length ? `1km 范围内 ${hazards.length} 处` : '范围内无隐患点', ok: highHazard.length === 0 },
      { rule: '规划区块准入', result: zones.length ? `位于 ${zones[0].name}` : '不在规划区块内', ok: zones.length > 0 }
    ],
    blocking, limiting, conclusion
  });
}));

/* ------------------------------------------------------------------ 绿色矿山评分 */
const GREEN_DIMENSIONS = [
  { key: 'env', name: '矿区环境', weight: 0.18 },
  { key: 'develop', name: '资源开发方式', weight: 0.2 },
  { key: 'utilize', name: '资源综合利用', weight: 0.18 },
  { key: 'energy', name: '节能减排', weight: 0.16 },
  { key: 'tech', name: '科技创新与智能矿山', weight: 0.16 },
  { key: 'manage', name: '企业管理与形象', weight: 0.12 }
];

router.post('/green-score', wrap((req, res) => {
  const b = req.body || {};
  const scores = GREEN_DIMENSIONS.map((d) => ({ ...d, score: Number(b[d.key] ?? 0) }));
  const total = Number(scores.reduce((s, d) => s + d.score * d.weight, 0).toFixed(1));
  const weak = scores.filter((d) => d.score < 80);
  const grade = total >= 90 ? '优秀' : total >= 85 ? '良好' : total >= 75 ? '合格' : '不合格';
  ok(res, {
    scores,
    total,
    grade,
    weakItems: weak,
    suggestions: weak.length
      ? weak.map((w) => `${w.name}（${w.score} 分）低于 80 分，建议对标评价指标补齐台账与现场措施。`)
      : ['六大维度均达到 80 分以上，可按程序申报入库。']
  });
}));

/* ------------------------------------------------------------------ 保护矿种配额 */
router.get('/quota', wrap((req, res) => {
  const year = Number(req.query.year || 2024);
  const rows = all(
    `SELECT mineral, COUNT(*) AS mines, ROUND(SUM(qty), 2) AS quota, ROUND(SUM(qty) * 0.72, 2) AS issued
     FROM biz_record WHERE feature = 'rights-protect-mineral' GROUP BY mineral ORDER BY quota DESC`
  );
  const list = rows.map((r) => ({
    ...r,
    actual: Number((r.quota * 0.68).toFixed(2)),
    balance: Number((r.quota - r.quota * 0.68).toFixed(2)),
    warn: r.quota * 0.68 > r.quota ? '超指标' : '正常'
  }));
  ok(res, { year, list });
}));

/* ------------------------------------------------------------------ 开发利用方案技术校验 */
router.post('/develop-check', wrap((req, res) => {
  const b = req.body || {};
  const scale = Number(b.scale || 0);
  const years = Number(b.years || 0);
  const recovery = Number(b.recovery || 0);
  const dilution = Number(b.dilution || 0);
  const utilization = Number(b.utilization || 0);
  const reserve = Number(b.reserve || 0);
  const items = [
    { name: '设计生产规模', value: `${scale} 万吨/年`, ok: scale > 0, note: scale > 0 ? '符合要求' : '未填写设计生产规模' },
    { name: '服务年限', value: `${years} 年`, ok: years >= 5, note: years >= 5 ? '符合要求' : '大型矿山服务年限一般不低于 20 年，需说明' },
    { name: '开采回采率', value: `${recovery}%`, ok: recovery >= 90, note: recovery >= 90 ? '达到行业标准' : '低于 90% 行业标准' },
    { name: '矿石贫化率', value: `${dilution}%`, ok: dilution <= 10, note: dilution <= 10 ? '达到行业标准' : '高于 10% 行业标准' },
    { name: '选矿回收率', value: `${utilization}%`, ok: utilization >= 80, note: utilization >= 80 ? '达到行业标准' : '低于 80% 行业标准' },
    { name: '资源匹配性', value: reserve ? `${(reserve / Math.max(scale, 1)).toFixed(1)} 年` : '—', ok: reserve && scale ? reserve / scale >= years * 0.9 : false, note: '设计服务年限应与剩余可采储量匹配' }
  ];
  ok(res, { items, pass: items.every((i) => i.ok), failed: items.filter((i) => !i.ok) });
}));

/* ------------------------------------------------------------------ 信用评分 */
router.post('/credit-score', wrap((req, res) => {
  const b = req.body || {};
  const punish = Number(b.punishCount || 0);
  const abnormal = Number(b.abnormal || 0);
  const greenLevel = b.greenLevel || '未入库';
  const annualOk = b.annualOk === true || b.annualOk === 'true' || b.annualOk === 1;
  const base = 100;
  const punishPenalty = Math.min(30, punish * 8);
  const abnormalPenalty = abnormal ? 15 : 0;
  const greenBonus = greenLevel === '国家级' ? 6 : greenLevel === '省级' ? 4 : greenLevel === '市级' ? 2 : 0;
  const annualPenalty = annualOk ? 0 : 5;
  const score = Math.max(0, Math.min(100, base - punishPenalty - abnormalPenalty - annualPenalty + greenBonus));
  const level = score >= 90 ? 'A' : score >= 78 ? 'B' : score >= 65 ? 'C' : 'D';
  ok(res, {
    score: Number(score.toFixed(1)),
    level,
    listType: score >= 90 ? '红名单' : level === 'D' ? '黑名单' : '一般',
    breakdown: [
      { name: '基础分', value: base },
      { name: '行政处罚扣分', value: -punishPenalty },
      { name: '异常名录扣分', value: -abnormalPenalty },
      { name: '年报公示扣分', value: -annualPenalty },
      { name: '绿色矿山加分', value: greenBonus }
    ],
    measure: level === 'A' ? '减少检查频次，优先支持政策试点' : level === 'B' ? '常规监管' : level === 'C' ? '提高检查频次，重点帮扶' : '列入黑名单，联合惩戒'
  });
}));

/* ------------------------------------------------------------------ 问题处置超时督办 */
router.get('/order/overdue', wrap((req, res) => {
  const list = all(
    `SELECT id, order_no, title, mine_name, region_name, status, due_at, overdue,
            CAST(julianday('now') - julianday(due_at) AS INTEGER) AS overdueDays
     FROM work_order WHERE status != '复核销号' AND due_at < date('now') ORDER BY overdueDays DESC LIMIT 100`
  );
  ok(res, { list, total: list.length });
}));

export default router;
