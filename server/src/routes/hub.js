import express from 'express';
import { all, get } from '../db.js';
import { ok, wrap } from '../util.js';
import { authRequired } from '../auth.js';
import { MODULES } from '../features.js';

/**
 * 业务中枢（统一详情纳管）数据接口
 *
 * 只做聚合，不新增业务字段：
 *  - 每个功能点承载的记录数（biz_record 按 feature 过滤，其余按业务表）
 *  - 流程型功能点各环节的记录数（取表里真实的 stage/status 字段）
 *  - 承载数据表、是否流程型、是否只读
 */
const router = express.Router();
router.use(authRequired);

const STATUS_COLUMNS = ['stage', 'status'];

function columnsOf(table) {
  try {
    return all(`PRAGMA table_info(${table})`).map((c) => c.name);
  } catch {
    return [];
  }
}

const colCache = new Map();
function stageColumn(table) {
  if (!colCache.has(table)) {
    const cols = columnsOf(table);
    colCache.set(table, STATUS_COLUMNS.find((c) => cols.includes(c)) || null);
  }
  return colCache.get(table);
}

/** 行政区划视角过滤：省=全部、市/县=按 region_code 前缀或精确匹配 */
function scope(table, code) {
  if (!code || code === '510000' || code === 'all') return { sql: '', params: [] };
  const cols = columnsOf(table);
  const col = cols.includes('region_code') ? 'region_code' : cols.includes('city_code') ? 'city_code' : null;
  if (!col) return { sql: '', params: [] };
  if (code.endsWith('0000') || code.endsWith('00')) return { sql: ` AND ${col} LIKE ?`, params: [`${code.slice(0, 4)}%`] };
  return { sql: ` AND ${col} = ?`, params: [code] };
}

function countRows(table, feature, code) {
  const parts = [];
  const params = [];
  if (table === 'biz_record') {
    parts.push('feature = ?');
    params.push(feature);
  }
  const s = scope(table, code);
  const where = parts.length ? ` WHERE ${parts.join(' AND ')}${s.sql}` : s.sql ? ` WHERE 1=1${s.sql}` : '';
  const row = get(`SELECT COUNT(*) AS c FROM ${table}${where}`, [...params, ...s.params]);
  return Number(row?.c || 0);
}

function stageCounts(table, feature, code) {
  const col = stageColumn(table);
  if (!col) return {};
  const parts = [];
  const params = [];
  if (table === 'biz_record') {
    parts.push('feature = ?');
    params.push(feature);
  }
  const s = scope(table, code);
  const where = parts.length ? ` WHERE ${parts.join(' AND ')}${s.sql}` : s.sql ? ` WHERE 1=1${s.sql}` : '';
  const rows = all(`SELECT ${col} AS k, COUNT(*) AS c FROM ${table}${where} GROUP BY ${col}`, [...params, ...s.params]);
  return rows.reduce((acc, r) => {
    if (r.k) acc[r.k] = Number(r.c);
    return acc;
  }, {});
}

router.get(
  '/overview',
  wrap((req, res) => {
    const code = req.query.code || req.user.region_code || '510000';
    const tables = new Set();
    let records = 0;
    let workflowFeatures = 0;

    const modules = MODULES.map((m) => ({
      key: m.key,
      name: m.name,
      route: m.route,
      intro: m.intro,
      features: m.features.map((f) => {
        const count = countRows(f.table, f.key, code);
        const byStage = stageCounts(f.table, f.key, code);
        const steps = f.workflow
          ? f.workflow.steps.map((s) => ({ key: s.key, role: s.role || '', count: byStage[s.key] || 0 }))
          : [];
        if (f.workflow) workflowFeatures += 1;
        tables.add(f.table);
        records += count;
        const unknown = steps.length
          ? Object.keys(byStage)
              .filter((k) => !f.workflow.steps.some((s) => s.key === k))
              .reduce((s, k) => s + byStage[k], 0)
          : 0;
        return {
          key: f.key,
          name: f.name,
          table: f.table,
          desc: f.desc,
          special: f.special || null,
          readonly: !!f.readonly,
          count,
          steps,
          other: unknown
        };
      })
    }));

    ok(res, {
      code,
      modules,
      totals: {
        features: modules.reduce((s, m) => s + m.features.length, 0),
        workflowFeatures,
        tables: tables.size,
        records
      }
    });
  })
);

export default router;
