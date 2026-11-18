/**
 * 浏览器端数据层（静态部署版）
 * ------------------------------------------------
 * 作用：把「Express + SQLite」后端的接口契约搬到浏览器里实现，使系统可以
 * 作为纯静态站点部署（IGA Pages / 任意 CDN），页面代码无需修改。
 *
 * 做法：
 *   1. 安装一个 window.fetch 拦截器，命中 /api/* 时交给本地路由处理；
 *   2. 数据来自 public/demo/data.json（由 scripts/export-snapshot.mjs 从真实库导出）；
 *   3. 增删改与流程流转写入 localStorage 日志，刷新后依旧生效；
 *   4. 只读聚合（7 个驾驶舱场景、6 个专题图层、5 个年度作战图、数据仓等）直接用导出快照。
 *
 * 本地开发（真实后端）不会加载本模块；仅当 VITE_DEMO=1 时由 main.jsx 加载。
 */
import { MODULES, SCENES, FIELDS } from './spec.js';

const JOURNAL_KEY = 'kq_demo_journal_v1';
const ROLE_LABEL = {
  admin: '系统管理员',
  province: '省级管理员',
  city: '市级管理员',
  county: '县级管理员',
  enterprise: '矿山企业',
  public: '社会公众'
};
const DATE_COLS = ['occur_at', 'submit_at', 'created_at', 'issue_date', 'due_at', 'valid_from', 'valid_to'];
const SUM_COLS = ['amount', 'qty', 'reserve_t', 'area', 'target', 'actual', 'total_score', 'progress', 'budget'];
const KW_COLS = ['title', 'name', 'mine_name', 'code', 'license_no', 'order_no', 'alert_no', 'review_no', 'applicant', 'holder'];
const OPTION_COLS = [
  ['status', 'status'], ['stage', 'stage'], ['mineral', 'mineral'], ['level', 'level'],
  ['kind', 'kind'], ['category', 'category'], ['year', 'year'], ['zoneType', 'zone_type'],
  ['rightType', 'right_type'], ['greenLevel', 'green_level'], ['unitType', 'unit_type'],
  ['type', 'type'], ['result', 'result'], ['listType', 'list_type'], ['deviceType', 'device_type']
];
const FILTER_MAP = [
  ['region', 'region_code'], ['mineral', 'mineral'], ['status', 'status'], ['stage', 'stage'],
  ['level', 'level'], ['kind', 'kind'], ['category', 'category'], ['result', 'result'],
  ['listType', 'list_type'], ['zoneType', 'zone_type'], ['rightType', 'right_type'],
  ['greenLevel', 'green_level'], ['unitType', 'unit_type'], ['type', 'type'],
  ['deviceType', 'device_type']
];

const state = { tables: {}, views: {}, regionMap: new Map(), mineMap: new Map() };
let journal = { ins: {}, upd: {}, del: {} };
let loadPromise = null;
let nativeFetch = null;

/* ---------------------------------------------------------------- 基础工具 */
const num = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Number(n.toFixed(d)) : 0;
};
const pad = (n) => String(n).padStart(2, '0');
function nowStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function pick(obj, keys) {
  const out = {};
  keys.forEach((k) => {
    if (obj[k] !== undefined) out[k] = obj[k];
  });
  return out;
}

/* ---------------------------------------------------------------- 数据加载 */
function readJournal() {
  try {
    const raw = localStorage.getItem(JOURNAL_KEY);
    if (!raw) return { ins: {}, upd: {}, del: {} };
    const j = JSON.parse(raw);
    return { ins: j.ins || {}, upd: j.upd || {}, del: j.del || {} };
  } catch {
    return { ins: {}, upd: {}, del: {} };
  }
}
function saveJournal() {
  try {
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(journal));
  } catch {
    /* 存储满时忽略：仅本次会话有效 */
  }
}

export function demoReady() {
  if (!loadPromise) {
    loadPromise = (async () => {
      // no-cache：每次带 ETag 重新校验，避免快照更新后浏览器仍用旧副本
      const res = await nativeFetch('demo/data.json', { cache: 'no-cache' });
      const data = await res.json();
      state.tables = data.tables || {};
      state.views = data.views || {};
      (state.tables.region || []).forEach((r) => state.regionMap.set(String(r.code), r));
      (state.tables.mine || []).forEach((m) => state.mineMap.set(Number(m.id), m));
      journal = readJournal();
    })();
  }
  return loadPromise;
}

/* ---------------------------------------------------------------- 行访问 */
function baseRows(t) {
  return state.tables[t] || [];
}
function rowsOf(t) {
  const base = baseRows(t);
  const ins = journal.ins[t] || [];
  const upd = journal.upd[t] || {};
  const del = new Set((journal.del[t] || []).map((x) => String(x)));
  const out = [];
  for (const r of base) {
    if (del.has(String(r.id))) continue;
    const p = upd[String(r.id)];
    out.push(p ? { ...r, ...p } : r);
  }
  for (const r of ins) {
    if (del.has(String(r.id))) continue;
    const p = upd[String(r.id)];
    out.push(p ? { ...r, ...p } : r);
  }
  return out;
}
function nextId(t) {
  let max = 0;
  baseRows(t).forEach((r) => { if (Number(r.id) > max) max = Number(r.id); });
  (journal.ins[t] || []).forEach((r) => { if (Number(r.id) > max) max = Number(r.id); });
  return max + 1;
}
function insertRow(t, row) {
  if (!journal.ins[t]) journal.ins[t] = [];
  journal.ins[t].push(row);
  saveJournal();
  return row;
}
function patchRow(t, id, patch) {
  if (!journal.upd[t]) journal.upd[t] = {};
  journal.upd[t][String(id)] = { ...(journal.upd[t][String(id)] || {}), ...patch };
  saveJournal();
}
function removeRow(t, id) {
  if (!journal.del[t]) journal.del[t] = [];
  journal.del[t].push(String(id));
  saveJournal();
}
function columnsOf(t) {
  const rows = baseRows(t);
  return rows.length ? Object.keys(rows[0]) : [];
}
function regionName(code) {
  return state.regionMap.get(String(code))?.name || '';
}
function regionPrefix(code) {
  const c = String(code || '');
  if (!c) return '';
  if (c === '510000') return '';
  if (c.endsWith('0000')) return c.slice(0, 2);
  if (c.endsWith('00')) return c.slice(0, 4);
  return c;
}

/* ---------------------------------------------------------------- 用户与会话 */
function tokenOf(req) {
  const h = req.headers.get('Authorization') || '';
  return h.startsWith('Bearer ') ? h.slice(7) : '';
}
function userOf(req) {
  const t = tokenOf(req);
  if (!t.startsWith('demo.')) return null;
  const username = t.slice(5);
  const u = rowsOf('sys_user').find((x) => x.username === username);
  if (!u) return null;
  return { ...u, roleLabel: ROLE_LABEL[u.role] || u.role };
}
function requireUser(req) {
  const u = userOf(req);
  if (!u) throw { status: 401, msg: '登录已过期，请重新登录' };
  return u;
}
function scopeRows(rows, user, cols) {
  if (!usz(user)) return rows;
  const prefix = regionPrefix(user.region_code);
  if (!prefix || !cols.includes('region_code')) return rows;
  return rows.filter((r) => String(r.region_code || '').startsWith(prefix));
}
function usz(user) {
  return user && user.role !== 'province' && user.role !== 'admin' && user.region_code;
}

/* ---------------------------------------------------------------- 功能规格 */
function specOf(moduleKey, featureKey) {
  const m = MODULES.find((x) => x.key === moduleKey);
  if (!m) return null;
  const f = m.features.find((x) => x.key === featureKey);
  if (!f) return null;
  return { module: m, feature: f };
}
function featureRows(feature) {
  let rows = rowsOf(feature.table);
  if (feature.table === 'biz_record') rows = rows.filter((r) => r.feature === feature.key);
  return rows;
}

/* ---------------------------------------------------------------- 列表查询 */
function specialRows(feature, rows) {
  if (feature.special === 'planStats') {
    const map = new Map();
    rows.forEach((r) => {
      const key = `${r.region_name}|${r.zone_type}|${r.mineral}`;
      const cur = map.get(key) || { region_name: r.region_name, zone_type: r.zone_type, mineral: r.mineral, cnt: 0, area: 0, reserve_t: 0 };
      cur.cnt += 1;
      cur.area = num(cur.area + num(r.area, 2), 2);
      cur.reserve_t = num(cur.reserve_t + num(r.reserve_t, 2), 2);
      map.set(key, cur);
    });
    return [...map.values()].sort((a, b) => b.cnt - a.cnt).slice(0, 300);
  }
  if (feature.special === 'rightsStats') {
    const map = new Map();
    rows.forEach((r) => {
      const key = `${r.mine_name}|${r.right_type}`;
      const cur = map.get(key) || {
        mine_name: r.mine_name, right_type: r.right_type, mineral: r.mineral, scale: r.scale,
        gdp_type: r.gdp_type, region_name: r.region_name, status: r.status, issue_date: r.issue_date, price: r.price
      };
      map.set(key, cur);
    });
    return [...map.values()].slice(0, 300);
  }
  if (feature.special === 'greenDynamic') {
    const patrols = rowsOf('patrol_log');
    const orders = rowsOf('work_order');
    return rows.map((r) => ({
      ...r,
      patrol_count: patrols.filter((p) => p.mine_name === r.name).length,
      rectify: orders.filter((o) => o.mine_name === r.name && o.status !== '复核销号').length
    }));
  }
  return rows;
}
function listHandler(moduleKey, featureKey, q, user) {
  const found = specOf(moduleKey, featureKey);
  if (!found) throw { status: 404, msg: '功能点不存在' };
  const feature = found.feature;
  const cols = columnsOf(feature.table);
  let rows = featureRows(feature);
  rows = scopeRows(rows, user, cols);

  const conds = [];
  FILTER_MAP.forEach(([qk, col]) => {
    const v = q.get(qk);
    if (v === null || v === '' || v === 'all') return;
    if (!cols.includes(col)) return;
    conds.push((r) => String(r[col] ?? '') === String(v));
  });
  const year = q.get('year');
  if (year && year !== 'all') {
    if (cols.includes('year')) conds.push((r) => String(r.year) === String(year));
    else if (cols.includes('occur_at')) conds.push((r) => String(r.occur_at || '').startsWith(String(year)));
  }
  const kw = (q.get('kw') || '').trim();
  if (kw) {
    const kwCols = KW_COLS.filter((c) => cols.includes(c));
    if (kwCols.length) conds.push((r) => kwCols.some((c) => String(r[c] || '').includes(kw)));
  }
  const start = q.get('start');
  const end = q.get('end');
  if (start && end) {
    const dateCol = ['occur_at', 'submit_at', 'created_at'].find((c) => cols.includes(c));
    if (dateCol) conds.push((r) => String(r[dateCol] || '') >= start && String(r[dateCol] || '') <= end);
  }
  if (conds.length) rows = rows.filter((r) => conds.every((fn) => fn(r)));

  const statusCol = cols.includes('status') ? 'status' : cols.includes('stage') ? 'stage' : null;
  const byStatus = statusCol
    ? Object.entries(rows.reduce((acc, r) => {
      const k = r[statusCol] ?? '未填写';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {})).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
    : [];
  const sums = {};
  SUM_COLS.forEach((c) => {
    if (!cols.includes(c)) return;
    const s = rows.reduce((acc, r) => acc + (Number(r[c]) || 0), 0);
    if (s) sums[c] = num(s, 2);
  });

  const options = {};
  OPTION_COLS.forEach(([key, col]) => {
    if (!cols.includes(col)) { options[key] = []; return; }
    const set = new Set();
    rows.forEach((r) => { if (r[col] !== null && r[col] !== '') set.add(r[col]); });
    options[key] = [...set].sort().slice(0, 40);
  });

  const stat = { total: rows.length, byStatus, sums };
  const page = Math.max(1, Number(q.get('page') || 1));
  const pageSize = Math.min(200, Math.max(1, Number(q.get('pageSize') || 20)));

  const view = specialRows(feature, rows);
  const sortCol = cols.includes('occur_at') ? 'occur_at' : cols.includes('created_at') ? 'created_at' : 'id';
  const sorted = view.slice().sort((a, b) => String(b[sortCol] ?? '').localeCompare(String(a[sortCol] ?? '')) || Number(b.id) - Number(a.id));
  const list = sorted.slice((page - 1) * pageSize, page * pageSize);
  return { list, total: stat.total, page, pageSize, stats: stat, options };
}

/* ---------------------------------------------------------------- 业务写操作 */
function firstStep(feature) {
  const wf = feature.workflow;
  if (!wf || !wf.steps || !wf.steps.length) return null;
  return wf.steps[0].key;
}
function createHandler(moduleKey, featureKey, body, user) {
  const found = specOf(moduleKey, featureKey);
  if (!found) throw { status: 404, msg: '功能点不存在' };
  const feature = found.feature;
  if (feature.readonly) throw { status: 400, msg: '该功能点为只读统计，不支持新增' };
  const cols = columnsOf(feature.table);
  const id = nextId(feature.table);
  const row = { id, feature: feature.key, created_at: nowStr() };
  Object.entries(body || {}).forEach(([k, v]) => {
    if (cols.includes(k) && v !== undefined) row[k] = v === '' ? null : v;
  });
  if (cols.includes('region_code') && !row.region_code) row.region_code = user.region_code;
  if (cols.includes('region_name') && !row.region_name) row.region_name = regionName(user.region_code);
  const step = firstStep(feature);
  if (step && cols.includes(feature.workflow.field)) row[feature.workflow.field] = step;
  if (cols.includes('status')) row.status = feature.workflow ? '办理中' : (row.status || '有效');
  insertRow(feature.table, row);
  return { id, ...row };
}
function updateHandler(moduleKey, featureKey, id, body) {
  const found = specOf(moduleKey, featureKey);
  if (!found) throw { status: 404, msg: '功能点不存在' };
  const feature = found.feature;
  const cols = columnsOf(feature.table);
  const row = featureRows(feature).find((r) => String(r.id) === String(id));
  if (!row) throw { status: 404, msg: '记录不存在' };
  const patch = {};
  Object.entries(body || {}).forEach(([k, v]) => {
    if (cols.includes(k) && k !== 'id') patch[k] = v === '' ? null : v;
  });
  patchRow(feature.table, row.id, patch);
  return { ...row, ...patch };
}
function deleteHandler(moduleKey, featureKey, id) {
  const found = specOf(moduleKey, featureKey);
  if (!found) throw { status: 404, msg: '功能点不存在' };
  const feature = found.feature;
  const row = featureRows(feature).find((r) => String(r.id) === String(id));
  if (!row) throw { status: 404, msg: '记录不存在' };
  removeRow(feature.table, row.id);
  return { id: row.id };
}
function actionHandler(moduleKey, featureKey, id, body) {
  const found = specOf(moduleKey, featureKey);
  if (!found) throw { status: 404, msg: '功能点不存在' };
  const feature = found.feature;
  const wf = feature.workflow;
  if (!wf) throw { status: 400, msg: '该功能点没有配置流程' };
  const row = featureRows(feature).find((r) => String(r.id) === String(id));
  if (!row) throw { status: 404, msg: '记录不存在' };
  const steps = wf.steps.map((s) => s.key);
  const cur = row[wf.field] || steps[0];
  const idx = Math.max(0, steps.indexOf(cur));
  const patch = {};
  let done = false;
  if (body && body.action === 'reject') {
    const to = wf.rejectTo && steps.includes(wf.rejectTo) ? wf.rejectTo : steps[0];
    patch[wf.field] = to;
    patch.status = '已退回';
  } else {
    const nextIdx = idx + 1;
    if (nextIdx >= steps.length) {
      patch[wf.field] = steps[steps.length - 1];
      patch.status = '已办结';
      done = true;
    } else {
      patch[wf.field] = steps[nextIdx];
      patch.status = '办理中';
      const stepDef = wf.steps[nextIdx];
      if (wf.onTerminal && (done || stepDef.terminal)) {
        patch.status = '已办结';
        done = true;
      }
    }
  }
  if (body && body.comment) {
    patch.remark = `${row.remark ? row.remark + ' / ' : ''}${nowStr().slice(0, 10)} ${body.comment}`;
  }
  if (done && feature.key === 'reserve-review') {
    const y = new Date().getFullYear();
    const seq = rowsOf('reserve_review').length + 1;
    patch.review_no = `川储备〔${y}〕${String(seq).padStart(3, '0')}号`;
    patch.status = '已办结';
  }
  patchRow(feature.table, row.id, patch);
  return { ...row, ...patch };
}

/* ---------------------------------------------------------------- 导出 */
function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function exportCsv(moduleKey, featureKey, q, user) {
  const data = listHandler(moduleKey, featureKey, (() => { const p = new URLSearchParams(q); p.set('page', '1'); p.set('pageSize', '200'); return p; })(), user);
  const found = specOf(moduleKey, featureKey);
  const cols = found.feature.columns || [];
  const head = cols.map((c) => FIELDS[c]?.label || c);
  const lines = [head.map(csvCell).join(',')];
  data.list.forEach((row) => lines.push(cols.map((c) => csvCell(row[c])).join(',')));
  return '\uFEFF' + lines.join('\r\n');
}

/* ---------------------------------------------------------------- 空间与算法 */
const R_EARTH = 6371.0088;
const D2R = Math.PI / 180;
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
  return { area: num(area, 4), ratio: num(area / Math.max(polyArea, 0.0001), 4) };
}

function reserveCalc(b) {
  const areaKm2 = Number(b.areaKm2 || 0);
  const thickness = Number(b.thickness || 0);
  const density = Number(b.density || 2.7);
  const resource = b.resourceTotal !== undefined && b.resourceTotal !== '' ? Number(b.resourceTotal) : areaKm2 * 1e6 * thickness * density;
  const mined = Number(b.mined || 0);
  const loss = Number(b.loss || 0);
  const recovery = Number(b.recovery || 0);
  const dilution = Number(b.dilution || 0);
  const utilization = Number(b.utilization || 0);
  const remaining = Math.max(0, resource - mined - loss);
  const totalT = resource / 1e4;
  const remainingT = remaining / 1e4;
  const checks = [
    { key: 'recovery', label: '开采回采率', value: recovery, standard: '≥ 90%（地下） / ≥ 95%（露天）', ok: recovery >= 90 },
    { key: 'dilution', label: '矿石贫化率', value: dilution, standard: '≤ 10%', ok: dilution <= 10 },
    { key: 'utilization', label: '选矿回收率', value: utilization, standard: '≥ 80%', ok: utilization >= 80 }
  ];
  const failed = checks.filter((c) => !c.ok);
  return {
    input: { areaKm2, thickness, density, mined, loss, recovery, dilution, utilization },
    result: {
      resourceTotal: num(totalT, 2),
      remaining: num(remainingT, 2),
      mined: num(mined / 1e4, 2),
      loss: num(loss / 1e4, 2),
      unit: '万吨',
      serviceYears: recovery ? num((remainingT * (recovery / 100)) / Math.max(1, Number(b.annualOutput || 100)), 1) : null
    },
    checks,
    conclusion: failed.length
      ? `三率指标中 ${failed.map((f) => f.label).join('、')} 未达行业标准，需说明原因。`
      : '三率指标均达到行业标准要求。'
  };
}
function overlay(body) {
  const points = body.points || [];
  const bufferKm = Number(body.bufferKm || 0);
  if (!Array.isArray(points) || points.length < 3) throw { status: 400, msg: '请至少绘制 3 个顶点' };
  const poly = points.map((p) => [Number(p[0]), Number(p[1])]);
  const area = polygonAreaKm2(poly);
  const center = [poly.reduce((s, p) => s + p[0], 0) / poly.length, poly.reduce((s, p) => s + p[1], 0) / poly.length];
  const candidates = [
    ...rowsOf('mineral_deposit').filter((r) => r.lon).map((r) => ({ id: r.id, name: r.name, kind: '矿产地', area_km2: r.area, reserve_t: r.reserve_t, lon: r.lon, lat: r.lat })),
    ...rowsOf('mining_right').filter((r) => r.lon).map((r) => ({ id: r.id, name: r.mine_name, kind: r.right_type, area_km2: r.area, reserve_t: r.price, lon: r.lon, lat: r.lat }))
  ];
  const hits = [];
  let totalOverlap = 0, reserveOverlap = 0;
  candidates.forEach((c) => {
    if (distanceKm(center, [c.lon, c.lat]) > 60) return;
    const r = circleRadiusKm(Math.max(0.05, c.area_km2 || 1)) + bufferKm;
    const o = overlapWithCircle(poly, [c.lon, c.lat], r);
    if (o.area > 0.0005) {
      hits.push({ id: c.id, name: c.name, kind: c.kind, overlapArea: o.area, overlapRatio: o.ratio, reserve: c.reserve_t });
      totalOverlap += o.area;
      reserveOverlap += (c.reserve_t || 0) * o.ratio;
    }
  });
  hits.sort((a, b) => b.overlapArea - a.overlapArea);
  return {
    query: { points: poly, area: num(area, 4), center, bufferKm },
    summary: {
      area: num(area, 4),
      overlapArea: num(totalOverlap, 4),
      overlapRatio: area ? num((totalOverlap / area) * 100, 2) : 0,
      reserveOverlap: num(reserveOverlap, 2),
      hitCount: hits.length
    },
    hits: hits.slice(0, 50),
    conclusion: hits.length
      ? `范围内共重叠 ${hits.length} 个空间对象，累计重叠面积 ${totalOverlap.toFixed(4)} km²，估算压覆资源量 ${reserveOverlap.toFixed(2)} 万吨。`
      : '范围内未发现与现有矿产地、矿业权的空间重叠。'
  };
}
function precheck(body) {
  const lon = Number(body.lon || 0);
  const lat = Number(body.lat || 0);
  const areaKm2 = Number(body.areaKm2 || 0);
  if (!lon || !lat) throw { status: 400, msg: '请提供有效的坐标位置' };
  const pt = [lon, lat];
  const radiusKm = circleRadiusKm(Math.max(0.05, areaKm2 || 1));
  const rights = rowsOf('mining_right')
    .filter((r) => r.lon)
    .filter((r) => distanceKm(pt, [r.lon, r.lat]) < radiusKm + circleRadiusKm(r.area));
  const hazards = rowsOf('hazard_point')
    .filter((h) => h.lon)
    .filter((h) => distanceKm(pt, [h.lon, h.lat]) < radiusKm + 1);
  const zones = rowsOf('plan_zone').filter((z) => {
    const reg = state.regionMap.get(String(z.region_code || ''));
    const row = reg || [...state.regionMap.values()].find((x) => x.name === z.region_name);
    if (!row) return false;
    return distanceKm(pt, [row.center_lon, row.center_lat]) < Math.max(8, circleRadiusKm(z.area || 10) + radiusKm);
  });
  const blocking = [];
  const limiting = [];
  if (rights.length) blocking.push(`与 ${rights.length} 宗已设矿业权重叠（${rights.slice(0, 3).map((r) => r.mine_name).join('、')}）`);
  const highHazard = hazards.filter((h) => ['一级', '二级'].includes(h.level));
  if (highHazard.length) limiting.push(`距离 ${highHazard.length} 处一级/二级地质灾害隐患点不足 1 公里`);
  if (!zones.length) limiting.push('未落入任何已批复规划区块，需先开展规划区块调整论证');
  return {
    query: { lon, lat, areaKm2, radiusKm: num(radiusKm, 3) },
    rights, hazards, zones: zones.slice(0, 10),
    rules: [
      { rule: '生态保护红线', result: '未相交（该红线图层按省级底图判定）', ok: true },
      { rule: '永久基本农田', result: '未相交（该图层按省级底图判定）', ok: true },
      { rule: '自然保护地', result: '未相交（该图层按省级底图判定）', ok: true },
      { rule: '已设矿业权', result: rights.length ? `重叠 ${rights.length} 宗` : '无重叠', ok: rights.length === 0 },
      { rule: '地质灾害隐患点', result: hazards.length ? `1km 范围内 ${hazards.length} 处` : '范围内无隐患点', ok: highHazard.length === 0 },
      { rule: '规划区块准入', result: zones.length ? `位于 ${zones[0].name}` : '不在规划区块内', ok: zones.length > 0 }
    ],
    blocking, limiting,
    conclusion: blocking.length ? '不通过：存在禁止性情形' : limiting.length ? '限制通过：需落实避让或补充论证' : '通过：未发现禁止性、限制性情形'
  };
}
const GREEN_DIMENSIONS = [
  { key: 'env', name: '矿区环境', weight: 0.18 },
  { key: 'develop', name: '资源开发方式', weight: 0.2 },
  { key: 'utilize', name: '资源综合利用', weight: 0.18 },
  { key: 'energy', name: '节能减排', weight: 0.16 },
  { key: 'tech', name: '科技创新与智能矿山', weight: 0.16 },
  { key: 'manage', name: '企业管理与形象', weight: 0.12 }
];
function greenScore(body) {
  const scores = GREEN_DIMENSIONS.map((d) => ({ ...d, score: Number(body[d.key] ?? 0) }));
  const total = num(scores.reduce((s, d) => s + d.score * d.weight, 0), 1);
  const weak = scores.filter((d) => d.score < 80);
  const grade = total >= 90 ? '优秀' : total >= 85 ? '良好' : total >= 75 ? '合格' : '不合格';
  return {
    scores, total, grade, weakItems: weak,
    suggestions: weak.length
      ? weak.map((w) => `${w.name}（${w.score} 分）低于 80 分，建议对标评价指标补齐台账与现场措施。`)
      : ['六大维度均达到 80 分以上，可按程序申报入库。']
  };
}
function quotaList() {
  const rows = rowsOf('biz_record').filter((r) => r.feature === 'rights-protect-mineral');
  const map = new Map();
  rows.forEach((r) => {
    const cur = map.get(r.mineral) || { mineral: r.mineral, mines: 0, quota: 0 };
    cur.mines += 1;
    cur.quota = num(cur.quota + (Number(r.qty) || 0), 2);
    map.set(r.mineral, cur);
  });
  const list = [...map.values()]
    .map((r) => ({
      ...r,
      issued: num(r.quota * 0.72, 2),
      actual: num(r.quota * 0.68, 2),
      balance: num(r.quota - r.quota * 0.68, 2),
      warn: '正常'
    }))
    .sort((a, b) => b.quota - a.quota);
  return { year: 2024, list };
}
function developCheck(body) {
  const scale = Number(body.scale || 0);
  const years = Number(body.years || 0);
  const recovery = Number(body.recovery || 0);
  const dilution = Number(body.dilution || 0);
  const utilization = Number(body.utilization || 0);
  const reserve = Number(body.reserve || 0);
  const items = [
    { name: '设计生产规模', value: `${scale} 万吨/年`, ok: scale > 0, note: scale > 0 ? '符合要求' : '未填写设计生产规模' },
    { name: '服务年限', value: `${years} 年`, ok: years >= 5, note: years >= 5 ? '符合要求' : '大型矿山服务年限一般不低于 20 年，需说明' },
    { name: '开采回采率', value: `${recovery}%`, ok: recovery >= 90, note: recovery >= 90 ? '达到行业标准' : '低于 90% 行业标准' },
    { name: '矿石贫化率', value: `${dilution}%`, ok: dilution <= 10, note: dilution <= 10 ? '达到行业标准' : '高于 10% 行业标准' },
    { name: '选矿回收率', value: `${utilization}%`, ok: utilization >= 80, note: utilization >= 80 ? '达到行业标准' : '低于 80% 行业标准' },
    { name: '资源匹配性', value: reserve ? `${(reserve / Math.max(scale, 1)).toFixed(1)} 年` : '—', ok: reserve && scale ? reserve / scale >= years * 0.9 : false, note: '设计服务年限应与剩余可采储量匹配' }
  ];
  return { items, pass: items.every((i) => i.ok), failed: items.filter((i) => !i.ok) };
}
function creditScore(body) {
  const punish = Number(body.punishCount || 0);
  const abnormal = Number(body.abnormal || 0);
  const greenLevel = body.greenLevel || '未入库';
  const annualOk = body.annualOk === true || body.annualOk === 'true' || body.annualOk === 1;
  const base = 100;
  const punishPenalty = Math.min(30, punish * 8);
  const abnormalPenalty = abnormal ? 15 : 0;
  const greenBonus = greenLevel === '国家级' ? 6 : greenLevel === '省级' ? 4 : greenLevel === '市级' ? 2 : 0;
  const annualPenalty = annualOk ? 0 : 5;
  const score = Math.max(0, Math.min(100, base - punishPenalty - abnormalPenalty - annualPenalty + greenBonus));
  const level = score >= 90 ? 'A' : score >= 78 ? 'B' : score >= 65 ? 'C' : 'D';
  return {
    score: num(score, 1), level,
    listType: score >= 90 ? '红名单' : level === 'D' ? '黑名单' : '一般',
    breakdown: [
      { name: '基础分', value: base },
      { name: '行政处罚扣分', value: -punishPenalty },
      { name: '异常名录扣分', value: -abnormalPenalty },
      { name: '年报公示扣分', value: -annualPenalty },
      { name: '绿色矿山加分', value: greenBonus }
    ],
    measure: level === 'A' ? '减少检查频次，优先支持政策试点' : level === 'B' ? '常规监管' : level === 'C' ? '提高检查频次，重点帮扶' : '列入黑名单，联合惩戒'
  };
}
function overdueOrders() {
  const now = today();
  const list = rowsOf('work_order')
    .filter((r) => r.status !== '复核销号' && String(r.due_at || '') < now)
    .map((r) => ({
      id: r.id, order_no: r.order_no, title: r.title, mine_name: r.mine_name,
      region_name: r.region_name, status: r.status, due_at: r.due_at,
      overdue: r.overdue,
      overdueDays: Math.max(0, Math.round((new Date(now) - new Date(r.due_at)) / 86400000))
    }))
    .sort((a, b) => b.overdueDays - a.overdueDays)
    .slice(0, 100);
  return { list, total: list.length };
}

/* ---------------------------------------------------------------- 驾驶舱与图层 */
function filterByCode(rows, code, cols) {
  const prefix = regionPrefix(code);
  if (!prefix) return rows;
  if (!cols.includes('region_code')) return rows;
  return rows.filter((r) => String(r.region_code || '').startsWith(prefix));
}
function bubblesOf(code) {
  const prefix = regionPrefix(code);
  const mines = rowsOf('mine').filter((m) => m.lon && m.lat);
  const pool = prefix ? mines.filter((m) => String(m.region_code || '').startsWith(prefix)) : mines;
  const isCity = prefix && prefix.length === 4;
  const buckets = new Map();
  pool.forEach((m) => {
    const c = String(m.region_code || '');
    const key = isCity ? c : prefix ? c : c.slice(0, 4) + '00';
    const reg = state.regionMap.get(key) || state.regionMap.get(c);
    const b = buckets.get(key) || { code: key, name: reg?.name || regionName(key) || key, value: 0, lon: reg?.center_lon || m.lon, lat: reg?.center_lat || m.lat };
    b.value += 1;
    buckets.set(key, b);
  });
  return [...buckets.values()].filter((b) => b.name);
}
function sceneHandler(scene, q) {
  const base = state.views.scenes?.[scene];
  if (!base) throw { status: 404, msg: '场景不存在' };
  const code = q.get('code') || '510000';
  const out = { ...base, map: { ...(base.map || {}) } };
  out.map = { ...out.map, bubbles: bubblesOf(code), themes: base.map?.themes || [] };
  const listObj = base.list || {};
  if (listObj && !Array.isArray(listObj)) {
    const next = {};
    Object.entries(listObj).forEach(([k, arr]) => {
      next[k] = Array.isArray(arr) ? filterByCode(arr, code, ['region_code']) : arr;
    });
    out.list = next;
  } else if (Array.isArray(listObj)) {
    out.list = filterByCode(listObj, code, ['region_code']);
  }
  return out;
}
function layersHandler(theme, q) {
  const base = state.views.maps?.[theme]?.list || [];
  const code = q.get('code') || '510000';
  return { list: filterByCode(base, code, ['region_code']) };
}
function battleHandler(q) {
  const year = Number(q.get('year') || 2024);
  const base = state.views.battles?.[year] || state.views.battles?.[2024] || { list: [], groups: [], stats: { total: 0, done: 0, doing: 0, years: [] } };
  const kw = (q.get('kw') || '').trim();
  if (!kw) return base;
  const list = (base.list || []).filter((r) => `${r.category}${r.content}${r.outcome}`.includes(kw));
  const ids = new Set(list.map((r) => r.id));
  const groups = (base.groups || [])
    .map((g) => ({ ...g, items: (g.items || []).filter((it) => ids.has(it.id)) }))
    .filter((g) => g.items.length);
  const done = list.filter((r) => r.status === '已完成').length;
  return { list, groups, stats: { ...base.stats, total: list.length, done, doing: list.length - done } };
}

/* ---------------------------------------------------------------- 一矿一档 */
function archiveHandler(id) {
  const mine = rowsOf('mine').find((m) => String(m.id) === String(id));
  if (!mine) throw { status: 404, msg: '未找到该矿山档案' };
  const rights = rowsOf('mining_right').filter((r) => r.mine_name === mine.name);
  const reviews = rowsOf('reserve_review').filter((r) => r.mine_name === mine.name);
  const greens = rowsOf('green_apply').filter((g) => g.mine_name === mine.name);
  const patrols = rowsOf('patrol_log').filter((p) => p.mine_name === mine.name);
  const orders = rowsOf('work_order').filter((o) => o.mine_name === mine.name);
  const devices = rowsOf('device').filter((d) => d.mine_name === mine.name);
  const alerts = rowsOf('alert').filter((a) => a.mine_name === mine.name);
  const credit = rowsOf('credit_record').find((c) => c.mine_name === mine.name) || null;
  const deposits = rowsOf('mineral_deposit').filter((d) => d.region_code === mine.region_code).slice(0, 10);
  return { mine, rights, reviews, greens, patrols, orders, devices, alerts, credit, deposits };
}

/* ---------------------------------------------------------------- 移动端/数据仓/系统 */
function mobileList(type) {
  const map = {
    patrol: () => rowsOf('patrol_log').map((r) => ({ id: r.id, title: r.plan_name || r.title || '巡查记录', mine_name: r.mine_name, time: r.patrol_at || r.created_at, status: r.result || '已提交' })),
    order: () => rowsOf('work_order').map((r) => ({ id: r.id, title: r.title, mine_name: r.mine_name, time: r.created_at, status: r.status })),
    green: () => rowsOf('green_apply').map((r) => ({ id: r.id, title: `${r.mine_name} 绿色矿山申报`, mine_name: r.mine_name, time: r.submit_at || r.created_at, status: r.status })),
    alert: () => rowsOf('alert').map((r) => ({ id: r.id, title: r.content, mine_name: r.mine_name, time: r.occurred_at, status: r.status }))
  };
  const fn = map[type];
  if (!fn) throw { status: 404, msg: '未知的台账类型' };
  return { list: fn().slice(0, 200) };
}
function warehouseOverview() {
  const topics = state.views.warehouse?.topics || [];
  const assets = rowsOf('data_asset');
  return { topics, assets };
}
function auditList() {
  const fromOrders = rowsOf('work_order').slice(0, 25).map((r, i) => ({
    id: `o${i}`, created_at: r.created_at, username: 'admin', name: '赵丹蕾',
    action: '流程办理', target: r.title, detail: `${r.mine_name || ''} · ${r.status || ''}`
  }));
  const fromBiz = rowsOf('biz_record').slice(0, 25).map((r, i) => ({
    id: `b${i}`, created_at: r.created_at || r.occur_at, username: 'admin', name: '赵丹蕾',
    action: '台账维护', target: r.title, detail: `${r.region_name || ''} · ${r.status || ''}`
  }));
  const list = [...fromOrders, ...fromBiz]
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
    .slice(0, 50);
  return { list, total: list.length, page: 1, pageSize: 50 };
}

/* ---------------------------------------------------------------- 路由分发 */
function answer(data, status = 200) {
  return new Response(JSON.stringify({ code: 0, msg: 'ok', data }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}
function answerErr(msg, status = 400) {
  return new Response(JSON.stringify({ code: 1, msg }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

/* ---------------- 业务中枢（统一详情纳管） ---------------- */
function hubScope(user) {
  const role = user?.role || 'admin';
  const rc = String(user?.region_code || '510000');
  return (row) => {
    if (role === 'admin' || role === 'province') return true;
    const code = String(row.region_code || '');
    if (!code) return false;
    if (role === 'city') return code.slice(0, 4) === rc.slice(0, 4);
    return code === rc;
  };
}

function hubRows(feature, user) {
  let list = rowsOf(feature.table);
  if (feature.table === 'biz_record') list = list.filter((r) => r.feature === feature.key);
  const scope = hubScope(user);
  return list.filter(scope);
}

function stageOf(row) {
  if (!row) return '';
  if (row.stage !== undefined && row.stage !== null && row.stage !== '') return row.stage;
  return row.status || '';
}

function hubHandler(req) {
  const user = userOf(req) || {};
  const modules = MODULES.map((m) => ({
    key: m.key,
    name: m.name,
    route: m.route,
    intro: m.intro,
    features: (m.features || []).map((f) => {
      const list = hubRows(f, user);
      const steps = (f.workflow?.steps || []).map((s) => ({
        key: s.key,
        role: s.role || '',
        count: list.filter((r) => stageOf(r) === s.key).length
      }));
      const keys = new Set(steps.map((s) => s.key));
      const other = steps.length ? list.filter((r) => !keys.has(stageOf(r))).length : 0;
      return {
        key: f.key,
        name: f.name,
        table: f.table,
        desc: f.desc || '',
        special: f.special || '',
        readonly: !!f.readonly,
        count: list.length,
        steps,
        other
      };
    })
  }));
  const tables = new Set(MODULES.flatMap((m) => (m.features || []).map((f) => f.table)));
  const totals = {
    features: modules.reduce((s, m) => s + m.features.length, 0),
    workflowFeatures: modules.reduce((s, m) => s + m.features.filter((f) => f.steps.length).length, 0),
    tables: tables.size,
    records: modules.reduce((s, m) => s + m.features.reduce((a, f) => a + f.count, 0), 0)
  };
  return { code: user.region_code || '510000', modules, totals };
}

async function route(req, url) {
  const p = url.pathname.replace(/^\/api/, '');
  const q = url.searchParams;
  const method = req.method.toUpperCase();
  let m;

  /* 登录与用户 */
  if (p === '/auth/login' && method === 'POST') {
    const body = await req.json().catch(() => ({}));
    const u = rowsOf('sys_user').find((x) => x.username === body.username);
    if (!u) return answerErr('账号不存在，请使用演示账号登录', 401);
    const okPwd = body.password === 'admin123' || body.password === '123456';
    if (!okPwd) return answerErr('密码不正确（演示环境：admin/admin123，其余账号 123456）', 401);
    const user = { ...u, roleLabel: ROLE_LABEL[u.role] || u.role };
    return answer({ token: `demo.${u.username}`, user });
  }
  if (p === '/auth/me') {
    const u = requireUser(req);
    return answer(u);
  }
  if (p === '/auth/logout') return answer({ ok: true });
  if (p === '/auth/users' && method === 'GET') {
    const list = rowsOf('sys_user').map((u) => ({ ...u, roleLabel: ROLE_LABEL[u.role] || u.role }));
    return answer({ list, total: list.length });
  }
  if (p === '/auth/users' && method === 'POST') {
    const body = await req.json().catch(() => ({}));
    if (!body.username) return answerErr('请填写登录账号', 400);
    const row = insertRow('sys_user', {
      id: nextId('sys_user'), username: body.username, name: body.name || body.username,
      role: body.role || 'county', org: body.org || '四川省自然资源厅',
      region_code: body.region_code || '510000', status: '启用', created_at: nowStr(),
      password: '123456'
    });
    return answer(row);
  }
  if ((m = p.match(/^\/auth\/users\/(\d+)$/)) && method === 'PUT') {
    const body = await req.json().catch(() => ({}));
    patchRow('sys_user', m[1], body);
    return answer({ id: Number(m[1]), ...body });
  }

  /* 元数据 */
  if (p === '/meta/bootstrap') {
    const u = userOf(req);
    return answer({ ...state.views.bootstrap, user: u });
  }
  if (p === '/meta/regions') return answer({ list: rowsOf('region') });
  if ((m = p.match(/^\/meta\/dict\/(.+)$/))) return answer({ list: [] });

  /* 业务中枢 */
  if (p === '/hub/overview') return answer(hubHandler(req));

  /* 驾驶舱与图层 */
  if ((m = p.match(/^\/screen\/map\/([^/]+)$/))) return answer(layersHandler(m[1], q));
  if (p === '/screen/task/battle') return answer(battleHandler(q));
  if ((m = p.match(/^\/screen\/([^/]+)$/))) return answer(sceneHandler(m[1], q));

  /* 算法工具 */
  if (p === '/tools/reserve-calc' && method === 'POST') return answer(reserveCalc(await req.json().catch(() => ({}))));
  if (p === '/tools/overlay' && method === 'POST') return answer(overlay(await req.json().catch(() => ({}))));
  if (p === '/tools/precheck' && method === 'POST') return answer(precheck(await req.json().catch(() => ({}))));
  if (p === '/tools/green-score' && method === 'POST') return answer(greenScore(await req.json().catch(() => ({}))));
  if (p === '/tools/develop-check' && method === 'POST') return answer(developCheck(await req.json().catch(() => ({}))));
  if (p === '/tools/credit-score' && method === 'POST') return answer(creditScore(await req.json().catch(() => ({}))));
  if (p === '/tools/quota') return answer(quotaList());
  if (p === '/tools/order/overdue') return answer(overdueOrders());

  /* 一矿一档与二维码 */
  if ((m = p.match(/^\/archive\/(\d+)$/))) return answer(archiveHandler(m[1]));
  if (p === '/qr') {
    const text = q.get('text') || '绿矿智用';
    const size = Math.min(600, Math.max(120, Number(q.get('size') || 220)));
    try {
      const mod = await import('qrcode');
      const QR = mod.default || mod;
      const dataUrl = await QR.toDataURL(text, { width: size, margin: 1, color: { dark: '#0a1a33', light: '#ffffff' } });
      return answer({ dataUrl, text });
    } catch {
      return answer({ dataUrl: '', text });
    }
  }

  /* 数据仓 */
  if (p === '/warehouse/overview') return answer(warehouseOverview());
  if (p === '/warehouse/upload' && method === 'POST') {
    const form = await req.formData().catch(() => null);
    const file = form?.get('file');
    const row = insertRow('data_asset', {
      id: nextId('data_asset'), topic: form?.get('topic') || '其他', name: file?.name || '未命名文件',
      file_type: (file?.name || '').split('.').pop() || 'file',
      size_kb: file ? Math.round(file.size / 1024) : 0, source: '在线入库',
      year: Number(form?.get('year') || new Date().getFullYear()), region_name: '四川省',
      uploaded_at: nowStr(), meta: JSON.stringify({ note: form?.get('note') || '', demo: true })
    });
    return answer({ id: row.id, name: row.name });
  }

  /* 移动端 */
  if (p === '/mobile/home') {
    const u = requireUser(req);
    const cards = state.views.mobileHome?.cards || [];
    return answer({ user: { name: u.name, org: u.org, role: u.roleLabel || u.role, region: regionName(u.region_code) }, cards });
  }
  if ((m = p.match(/^\/mobile\/list\/([^/]+)$/))) return answer(mobileList(m[1]));
  if (p === '/mobile/patrol' && method === 'POST') {
    const b = await req.json().catch(() => ({}));
    const row = insertRow('patrol_log', {
      id: nextId('patrol_log'), plan_name: '移动端巡查打卡', mine_id: b.mine_id || null,
      mine_name: b.mine_name || '', region_code: b.region_code || '510100',
      region_name: b.region_name || '成都市', lon: b.lon || 119.9, lat: b.lat || 30.9,
      finding: b.finding || '', photos: b.photos || 0, result: b.result || '正常',
      patrol_at: nowStr(), created_at: nowStr()
    });
    return answer(row);
  }

  /* 系统与监测 */
  if (p === '/system/audit') return answer(auditList());
  if (p === '/system/health') {
    const counts = {};
    Object.keys(state.tables).forEach((t) => { counts[t] = rowsOf(t).length; });
    return answer({ time: nowStr(), db: '浏览器端 JSON 数据快照（静态部署模式）', tables: Object.keys(state.tables).length, counts });
  }
  if (p === '/monitor/indicator') {
    const inds = rowsOf('plan_indicator');
    const red = inds.filter((i) => i.warn === '红牌').length;
    const yellow = inds.filter((i) => i.warn === '黄牌').length;
    const base = state.views.indicator || {};
    return answer({ ...base, totals: { red, yellow, normal: Math.max(0, inds.length - red - yellow) }, indicators: inds });
  }
  if (p === '/monitor/problem') return answer(state.views.problem || { list: [], items: [], totals: {}, openAlertCount: 0 });

  /* 业务通用 CRUD */
  if ((m = p.match(/^\/biz\/([^/]+)\/([^/]+)\/export$/)) && method === 'GET') {
    const u = requireUser(req);
    const csv = exportCsv(m[1], m[2], q, u);
    return new Response(csv, { status: 200, headers: { 'Content-Type': 'text/csv; charset=utf-8' } });
  }
  if ((m = p.match(/^\/biz\/([^/]+)\/([^/]+)\/workflow$/))) {
    const found = specOf(m[1], m[2]);
    return answer({ workflow: found?.feature?.workflow || null });
  }
  if ((m = p.match(/^\/biz\/([^/]+)\/([^/]+)\/([\w-]+)\/action$/)) && method === 'POST') {
    requireUser(req);
    return answer(actionHandler(m[1], m[2], m[3], await req.json().catch(() => ({}))));
  }
  if ((m = p.match(/^\/biz\/([^/]+)\/([^/]+)$/))) {
    const u = requireUser(req);
    if (method === 'GET') return answer(listHandler(m[1], m[2], q, u));
    if (method === 'POST') return answer(createHandler(m[1], m[2], await req.json().catch(() => ({})), u));
  }
  if ((m = p.match(/^\/biz\/([^/]+)\/([^/]+)\/(\d+)$/))) {
    requireUser(req);
    if (method === 'GET') {
      const found = specOf(m[1], m[2]);
      const row = featureRows(found.feature).find((r) => String(r.id) === String(m[3]));
      if (!row) return answerErr('记录不存在', 404);
      return answer(row);
    }
    if (method === 'PUT') return answer(updateHandler(m[1], m[2], m[3], await req.json().catch(() => ({}))));
    if (method === 'DELETE') return answer(deleteHandler(m[1], m[2], m[3]));
  }

  return answerErr(`演示数据层未实现该接口：${method} ${p}`, 404);
}

/* ---------------------------------------------------------------- 安装拦截器 */
export default function installDemoApi() {
  if (typeof window === 'undefined') return;
  if (window.__KQ_DEMO__) return;
  window.__KQ_DEMO__ = true;
  nativeFetch = window.fetch.bind(window);

  window.fetch = async function demoFetch(input, init) {
    const rawUrl = typeof input === 'string' ? input : input?.url || '';
    const abs = new URL(rawUrl, window.location.origin);
    const isApi = abs.pathname.startsWith('/api/');
    if (!isApi) return nativeFetch(input, init);

    await demoReady();
    const req = new Request(abs.toString(), init);
    try {
      return await route(req, abs);
    } catch (e) {
      if (e && e.status && e.msg) return answerErr(e.msg, e.status);
      console.error('[demo-api]', e);
      return answerErr(e?.message || '演示数据层内部错误', 500);
    }
  };

  // 预热：首屏加载数据快照
  demoReady().catch((e) => console.error('[demo-api] 快照加载失败', e));
}
