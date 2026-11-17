import express from 'express';
import { all, get, run, db, insertRow } from '../db.js';
import { findFeature, FIELDS } from '../features.js';
import { ok, fail, wrap, pageParams, whereRegion, exportExcel, nowStr, num } from '../util.js';
import { authRequired, audit } from '../auth.js';

const router = express.Router();
router.use(authRequired);

/* ---------------------------------------------------------------- 工具 */
const colCache = new Map();
function columnsOf(table) {
  if (colCache.has(table)) return colCache.get(table);
  const cols = all(`PRAGMA table_info(${table})`).map((c) => c.name);
  colCache.set(table, cols);
  return cols;
}

function resolve(req) {
  const found = findFeature(req.params.module, req.params.feature);
  if (!found) return null;
  return found.feature;
}

function scopeWhere(feature, query, user) {
  const conds = [];
  const params = [];
  if (feature.table === 'biz_record') {
    conds.push('feature = ?');
    params.push(feature.key);
  }
  const cols = columnsOf(feature.table);
  const rs = whereRegion(user);
  if (rs.sql && cols.includes('region_code')) {
    conds.push(rs.sql.replace(/^\s*AND\s*/, ''));
    params.push(...rs.params);
  }
  const push = (col, val) => {
    if (val === undefined || val === null || val === '' || val === 'all') return;
    if (!cols.includes(col)) return;
    conds.push(`${col} = ?`);
    params.push(val);
  };
  push('region_code', query.region);
  push('mineral', query.mineral);
  push('status', query.status);
  push('stage', query.stage);
  push('level', query.level);
  push('kind', query.kind);
  push('category', query.category);
  push('result', query.result);
  push('list_type', query.listType);
  push('zone_type', query.zoneType);
  push('right_type', query.rightType);
  push('green_level', query.greenLevel);
  push('unit_type', query.unitType);
  push('type', query.type);
  push('device_type', query.deviceType);
  if (query.year && query.year !== 'all') {
    if (cols.includes('year')) {
      conds.push('year = ?');
      params.push(Number(query.year));
    } else if (cols.includes('occur_at')) {
      conds.push('occur_at LIKE ?');
      params.push(`${query.year}%`);
    }
  }
  if (query.kw) {
    const kwCols = ['title', 'name', 'mine_name', 'code', 'license_no', 'order_no', 'alert_no', 'review_no', 'applicant', 'holder'].filter((c) => cols.includes(c));
    if (kwCols.length) {
      conds.push(`(${kwCols.map((c) => `${c} LIKE ?`).join(' OR ')})`);
      kwCols.forEach(() => params.push(`%${query.kw}%`));
    }
  }
  if (query.start && query.end) {
    const dateCol = cols.includes('occur_at') ? 'occur_at' : cols.includes('submit_at') ? 'submit_at' : cols.includes('created_at') ? 'created_at' : null;
    if (dateCol) {
      conds.push(`${dateCol} >= ? AND ${dateCol} <= ?`);
      params.push(query.start, query.end);
    }
  }
  return { sql: conds.length ? `WHERE ${conds.join(' AND ')}` : '', params };
}

function listCounts(feature, whereSql, params) {
  const cols = columnsOf(feature.table);
  const statusCol = cols.includes('status') ? 'status' : cols.includes('stage') ? 'stage' : null;
  const out = { total: 0, byStatus: [] };
  out.total = Number(get(`SELECT COUNT(*) AS c FROM ${feature.table} ${whereSql}`, params)?.c || 0);
  if (statusCol) {
    out.byStatus = all(`SELECT ${statusCol} AS name, COUNT(*) AS value FROM ${feature.table} ${whereSql} GROUP BY ${statusCol} ORDER BY value DESC`, params);
  }
  const sumCols = ['amount', 'qty', 'reserve_t', 'area', 'target', 'actual', 'total_score', 'progress', 'budget'];
  out.sums = {};
  sumCols.forEach((c) => {
    if (!cols.includes(c)) return;
    const v = get(`SELECT SUM(${c}) AS s FROM ${feature.table} ${whereSql}`, params);
    if (v && v.s !== null && v.s !== undefined) out.sums[c] = Number(Number(v.s).toFixed(2));
  });
  return out;
}

function filterOptions(feature) {
  const cols = columnsOf(feature.table);
  const mk = (col) => {
    if (!cols.includes(col)) return [];
    const where = [`${col} IS NOT NULL`, `${col} != ''`];
    if (feature.table === 'biz_record') where.unshift(`feature = '${feature.key}'`);
    return all(`SELECT DISTINCT ${col} AS value FROM ${feature.table} WHERE ${where.join(' AND ')} ORDER BY ${col} LIMIT 40`).map((r) => r.value);
  };
  return {
    status: mk('status'),
    stage: mk('stage'),
    mineral: mk('mineral'),
    level: mk('level'),
    kind: mk('kind'),
    category: mk('category'),
    year: mk('year'),
    zoneType: mk('zone_type'),
    rightType: mk('right_type'),
    greenLevel: mk('green_level'),
    unitType: mk('unit_type'),
    type: mk('type'),
    result: mk('result'),
    listType: mk('list_type'),
    deviceType: mk('device_type')
  };
}

/* ---------------------------------------------------------------- 专项列表 */
const specialListers = {
  'plan-stats'(q, feature) {
    const rs = whereRegion(q.user);
    const cond = rs.sql ? `WHERE 1=1 ${rs.sql}` : '';
    const params = [...rs.params];
    let extra = '';
    if (q.query.mineral) {
      extra += ' AND mineral = ?';
      params.push(q.query.mineral);
    }
    if (q.query.zoneType) {
      extra += ' AND zone_type = ?';
      params.push(q.query.zoneType);
    }
    const rows = all(
      `SELECT region_name, zone_type, mineral, COUNT(*) AS cnt, ROUND(SUM(area),2) AS area, ROUND(SUM(reserve_t),2) AS reserve_t
       FROM plan_zone ${cond} ${extra} GROUP BY region_name, zone_type, mineral ORDER BY cnt DESC LIMIT 500`,
      params
    );
    const totalArea = rows.reduce((s, r) => s + (r.area || 0), 0);
    const implRate = Number(((rows.filter((r) => r.cnt > 0).length / Math.max(1, rows.length)) * 100).toFixed(1));
    return {
      list: rows,
      total: rows.length,
      stats: { total: rows.length, sums: { area: Number(totalArea.toFixed(2)) }, implRate, byStatus: [] }
    };
  },
  'rights-stats'(q, feature) {
    const rs = whereRegion(q.user);
    const cond = rs.sql ? `WHERE 1=1 ${rs.sql}` : '';
    const params = [...rs.params];
    const rows = all(
      `SELECT mine_name, right_type, mineral, scale, gdp_type, region_name, status, issue_date, price
       FROM mining_right ${cond} ORDER BY issue_date DESC LIMIT 500`,
      params
    );
    const byMineral = all(`SELECT mineral AS name, COUNT(*) AS value FROM mining_right ${cond} GROUP BY mineral ORDER BY value DESC LIMIT 12`, params);
    const byScale = all(`SELECT scale AS name, COUNT(*) AS value FROM mining_right ${cond} GROUP BY scale`, params);
    const byGdp = all(`SELECT gdp_type AS name, COUNT(*) AS value FROM mining_right ${cond} GROUP BY gdp_type`, params);
    const byType = all(`SELECT right_type AS name, COUNT(*) AS value FROM mining_right ${cond} GROUP BY right_type`, params);
    return {
      list: rows,
      total: rows.length,
      stats: {
        total: rows.length,
        byMineral,
        byScale,
        byGdp,
        byType,
        sums: { price: Number((rows.reduce((s, r) => s + (r.price || 0), 0)).toFixed(2)) },
        byStatus: []
      }
    };
  },
  'green-dynamic'(q, feature) {
    const rs = whereRegion(q.user);
    const cond = rs.sql ? `WHERE green_level != '未入库' ${rs.sql}` : `WHERE green_level != '未入库'`;
    const params = [...rs.params];
    if (q.query.region) {
      // already applied via whereRegion for city scope; explicit region filter
    }
    const rows = all(
      `SELECT m.id, m.name, m.region_name, m.green_level, m.digital_level, m.smart_level, m.valid_to,
              (SELECT COUNT(*) FROM patrol_log p WHERE p.mine_id = m.id) AS patrol_count,
              (SELECT COUNT(*) FROM work_order w WHERE w.mine_id = m.id AND w.status != '复核销号') AS rectify,
              (SELECT MIN(submit_at) FROM green_apply g WHERE g.mine_id = m.id AND g.stage = '已入库') AS green_since
       FROM mine m ${cond} ORDER BY m.green_level, m.name LIMIT 500`,
      params
    );
    return {
      list: rows,
      total: rows.length,
      stats: {
        total: rows.length,
        byStatus: all(`SELECT green_level AS name, COUNT(*) AS value FROM mine WHERE green_level != '未入库' GROUP BY green_level ORDER BY value DESC`),
        byStatusLabel: '绿色矿山分级',
        sums: {}
      }
    };
  }
};

/* ---------------------------------------------------------------- 列表 */
router.get('/:module/:feature', wrap((req, res) => {
  const feature = resolve(req);
  if (!feature) return fail(res, '功能不存在', 404);
  const q = { ...req.query, user: req.user };
  if (specialListers[feature.special]) {
    const r = specialListers[feature.special](q, feature);
    return ok(res, r);
  }
  const { page, pageSize, offset } = pageParams(req.query);
  const { sql, params } = scopeWhere(feature, req.query, req.user);
  const orderCol = columnsOf(feature.table).includes('id') ? 'id' : 'rowid';
  const list = all(`SELECT * FROM ${feature.table} ${sql} ORDER BY ${orderCol} DESC LIMIT ? OFFSET ?`, [...params, pageSize, offset]);
  const stats = listCounts(feature, sql, params);
  ok(res, { list, total: stats.total, page, pageSize, stats, options: filterOptions(feature) });
}));

/* ---------------------------------------------------------------- 详情 */
router.get('/:module/:feature/:id', wrap((req, res) => {
  const feature = resolve(req);
  if (!feature) return fail(res, '功能不存在', 404);
  const row = get(`SELECT * FROM ${feature.table} WHERE id = ?`, [Number(req.params.id)]);
  if (!row) return fail(res, '记录不存在', 404);
  let extra = {};
  if (feature.table === 'biz_record') {
    try { extra.payload = row.payload ? JSON.parse(row.payload) : {}; } catch { extra.payload = {}; }
    try { extra.history = row.history ? JSON.parse(row.history) : []; } catch { extra.history = []; }
  }
  if (feature.table === 'green_apply') {
    extra.scores = [
      { name: '矿区环境', value: row.score_env },
      { name: '资源开发方式', value: row.score_develop },
      { name: '资源综合利用', value: row.score_utilize },
      { name: '节能减排', value: row.score_energy },
      { name: '科技创新与智能矿山', value: row.score_tech },
      { name: '企业管理与形象', value: row.score_manage }
    ];
  }
  ok(res, { ...row, ...extra });
}));

/* ---------------------------------------------------------------- 新增 */
router.post('/:module/:feature', wrap((req, res) => {
  const feature = resolve(req);
  if (!feature) return fail(res, '功能不存在', 404);
  if (feature.readonly) return fail(res, '该功能为统计视图，不支持新增', 400);
  const body = req.body || {};
  const cols = columnsOf(feature.table);
  const row = {};
  const payload = {};
  const extras = feature.extras || {};
  Object.entries(body).forEach(([k, v]) => {
    if (cols.includes(k) && k !== 'id') row[k] = v;
    else if (extras[k]) payload[k] = v;
  });
  if (feature.table === 'biz_record') {
    row.feature = feature.key;
    row.payload = JSON.stringify(payload);
    row.created_by = req.user.name;
    row.created_at = nowStr();
    row.updated_at = nowStr();
    if (feature.workflow) {
      row.stage = feature.workflow.steps[0].key;
      row.history = JSON.stringify([{ step: feature.workflow.steps[0].key, at: nowStr().slice(0, 10), by: req.user.name }]);
    }
    if (!row.code) row.code = `${feature.key.split('-')[0].toUpperCase()}${Date.now().toString().slice(-8)}`;
    if (!row.status) row.status = '办理中';
  } else {
    if (cols.includes('created_at') && !row.created_at) row.created_at = nowStr();
    if (cols.includes('updated_at') && !row.updated_at) row.updated_at = nowStr();
    if (cols.includes('payload')) row.payload = JSON.stringify(payload);
  }
  const info = insertRow(feature.table, row);
  audit(req, '新增', `${feature.name}#${info.lastInsertRowid}`, JSON.stringify(body).slice(0, 400));
  ok(res, { id: Number(info.lastInsertRowid) }, { msg: '已提交，数据已入库' });
}));

/* ---------------------------------------------------------------- 修改 */
router.put('/:module/:feature/:id', wrap((req, res) => {
  const feature = resolve(req);
  if (!feature) return fail(res, '功能不存在', 404);
  if (feature.readonly) return fail(res, '该功能为统计视图，不支持修改', 400);
  const id = Number(req.params.id);
  const cols = columnsOf(feature.table);
  const body = req.body || {};
  const sets = [];
  const params = [];
  const extras = feature.extras || {};
  let payloadPatch = null;
  if (feature.table === 'biz_record' && body.payload === undefined) {
    const cur = get(`SELECT payload FROM biz_record WHERE id = ?`, [id]);
    try { payloadPatch = cur?.payload ? JSON.parse(cur.payload) : {}; } catch { payloadPatch = {}; }
  }
  Object.entries(body).forEach(([k, v]) => {
    if (cols.includes(k) && k !== 'id') {
      sets.push(`${k} = ?`);
      params.push(v);
    } else if (extras[k]) {
      if (!payloadPatch) payloadPatch = {};
      payloadPatch[k] = v;
    }
  });
  if (payloadPatch && cols.includes('payload')) {
    sets.push('payload = ?');
    params.push(JSON.stringify(payloadPatch));
  }
  if (!sets.length) return fail(res, '没有可更新的字段', 400);
  if (cols.includes('updated_at')) {
    sets.push('updated_at = ?');
    params.push(nowStr());
  }
  params.push(id);
  run(`UPDATE ${feature.table} SET ${sets.join(', ')} WHERE id = ?`, params);
  audit(req, '修改', `${feature.name}#${id}`, JSON.stringify(body).slice(0, 400));
  ok(res, null, { msg: '已保存' });
}));

/* ---------------------------------------------------------------- 删除 */
router.delete('/:module/:feature/:id', wrap((req, res) => {
  const feature = resolve(req);
  if (!feature) return fail(res, '功能不存在', 404);
  if (feature.readonly) return fail(res, '该功能为统计视图，不支持删除', 400);
  run(`DELETE FROM ${feature.table} WHERE id = ?`, [Number(req.params.id)]);
  audit(req, '删除', `${feature.name}#${req.params.id}`, '');
  ok(res, null, { msg: '已删除' });
}));

/* ---------------------------------------------------------------- 流程流转 */
router.post('/:module/:feature/:id/action', wrap((req, res) => {
  const feature = resolve(req);
  if (!feature) return fail(res, '功能不存在', 404);
  const wf = feature.workflow;
  if (!wf) return fail(res, '该功能未配置审批流程', 400);
  const id = Number(req.params.id);
  const cols = columnsOf(feature.table);
  const row = get(`SELECT * FROM ${feature.table} WHERE id = ?`, [id]);
  if (!row) return fail(res, '记录不存在', 404);
  const field = cols.includes(wf.field) ? wf.field : cols.includes('stage') ? 'stage' : 'status';
  const cur = row[field];
  const { action = 'next', comment = '' } = req.body || {};
  const idx = wf.steps.findIndex((s) => s.key === cur);
  let nextStep;
  if (action === 'reject' || action === 'return') {
    nextStep = wf.rejectTo || wf.steps[0].key;
  } else {
    if (idx < 0) return fail(res, '当前状态不在流程节点中', 400);
    if (idx >= wf.steps.length - 1) return fail(res, '流程已到终态', 400);
    nextStep = wf.steps[idx + 1].key;
  }
  const terminal = wf.steps.find((s) => s.key === nextStep)?.terminal;
  const sets = [`${field} = ?`];
  const params = [nextStep];
  if (cols.includes('status')) {
    sets.push('status = ?');
    params.push(action === 'next' ? (terminal ? '已办结' : '办理中') : '已退回');
  }
  if (cols.includes('updated_at')) {
    sets.push('updated_at = ?');
    params.push(nowStr());
  }
  let history = [];
  try { history = row.history ? JSON.parse(row.history) : []; } catch { history = []; }
  history.push({ step: nextStep, at: nowStr().slice(0, 10), by: req.user.name, action, comment });
  if (cols.includes('history')) {
    sets.push('history = ?');
    params.push(JSON.stringify(history));
  }
  if (terminal && wf.onTerminal === 'genReviewNo' && cols.includes('review_no')) {
    const no = `川储备〔${new Date().getFullYear()}〕${String(Math.floor(Math.random() * 900) + 100)}号`;
    sets.push('review_no = ?');
    params.push(no);
    if (cols.includes('record_at')) {
      sets.push('record_at = ?');
      params.push(nowStr().slice(0, 10));
    }
  }
  if (terminal && cols.includes('audit_at')) {
    sets.push('audit_at = ?');
    params.push(nowStr().slice(0, 10));
  }
  if (cols.includes('auditor')) {
    sets.push('auditor = ?');
    params.push(req.user.name);
  }
  params.push(id);
  run(`UPDATE ${feature.table} SET ${sets.join(', ')} WHERE id = ?`, params);
  audit(req, action === 'next' ? '流程推进' : '流程退回', `${feature.name}#${id}`, `${cur} → ${nextStep} ${comment}`);
  ok(res, { stage: nextStep, terminal: !!terminal }, { msg: action === 'next' ? `已流转至「${nextStep}」` : `已退回至「${nextStep}」` });
}));

/* ---------------------------------------------------------------- 导出 */
router.get('/:module/:feature/export', wrap(async (req, res) => {
  const feature = resolve(req);
  if (!feature) return fail(res, '功能不存在', 404);
  const { sql, params } = scopeWhere(feature, req.query, req.user);
  const cols = columnsOf(feature.table);
  const orderCol = cols.includes('id') ? 'id' : 'rowid';
  const rows = all(`SELECT * FROM ${feature.table} ${sql} ORDER BY ${orderCol} DESC LIMIT 5000`, params);
  const columns = feature.columns.map((k) => ({
    key: k,
    label: FIELDS[k]?.label || (feature.extras?.[k]?.[0]) || k,
    width: Math.max(12, Math.min(32, (FIELDS[k]?.width || 120) / 8))
  }));
  await exportExcel(res, {
    sheetName: feature.name,
    columns,
    rows: rows.map((r) => {
      const o = {};
      feature.columns.forEach((k) => { o[k] = r[k] ?? ''; });
      return o;
    }),
    filename: `${feature.name}_${nowStr().slice(0, 10)}.xlsx`
  });
  audit(req, '导出', feature.name, `${rows.length} 行`);
}));

/* ---------------------------------------------------------------- 流程说明 */
router.get('/:module/:feature/workflow', wrap((req, res) => {
  const feature = resolve(req);
  if (!feature) return fail(res, '功能不存在', 404);
  ok(res, { workflow: feature.workflow || null });
}));

export default router;
