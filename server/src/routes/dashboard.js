import express from 'express';
import { all, get } from '../db.js';
import { ok, wrap } from '../util.js';
import { authRequired } from '../auth.js';
import { MODULES } from '../features.js';

const router = express.Router();
router.use(authRequired);

/** 依据当前行政区划视角生成过滤条件（省=全部，市=按前4位，县=精确） */
function cond(code, table) {
  if (!code || code === '510000' || code === 'all') return { sql: '', params: [] };
  const cols = all(`PRAGMA table_info(${table})`).map((c) => c.name);
  const col = cols.includes('region_code') ? 'region_code' : cols.includes('city_code') ? 'city_code' : null;
  if (!col) return { sql: '', params: [] };
  if (code.endsWith('0000')) return { sql: ` AND ${col} LIKE ?`, params: [`${code.slice(0, 4)}%`] };
  if (code.endsWith('00')) return { sql: ` AND ${col} LIKE ?`, params: [`${code.slice(0, 4)}%`] };
  return { sql: ` AND ${col} = ?`, params: [code] };
}

function countBy(sql, params) {
  const r = get(sql, params);
  return Number(r?.c || 0);
}
function sumBy(sql, params) {
  const r = get(sql, params);
  return Number(r?.s || 0);
}
function listBy(sql, params) {
  return all(sql, params);
}
const round = (v, d = 2) => Number(Number(v || 0).toFixed(d));

/* 上级视角下用于展示区县气泡 */
function countyBubbles(code) {
  if (!code || code === '510000') {
    return listBy(
      `SELECT m.region_code AS code, m.region_name AS name, COUNT(*) AS value,
              AVG(m.lon) AS lon, AVG(m.lat) AS lat
       FROM mine m WHERE m.region_code IS NOT NULL
       GROUP BY m.region_code ORDER BY value DESC`
    );
  }
  if (code.endsWith('0000')) {
    return listBy(
      `SELECT m.region_code AS code, m.region_name AS name, COUNT(*) AS value, AVG(m.lon) AS lon, AVG(m.lat) AS lat
       FROM mine m WHERE m.region_code LIKE ? GROUP BY m.region_code ORDER BY value DESC`,
      [`${code.slice(0, 4)}%`]
    );
  }
  return listBy(
    `SELECT region_code AS code, region_name AS name, COUNT(*) AS value, AVG(lon) AS lon, AVG(lat) AS lat
     FROM mine WHERE region_code = ? GROUP BY region_code`,
    [code]
  );
}

/* ------------------------------------------------------------------ 驾驶舱 */
function screenDashboard(code, year) {
  const c = cond(code, 'mine');
  const mineTotal = countBy(`SELECT COUNT(*) AS c FROM mine WHERE 1=1 ${c.sql}`, c.params);
  const onlineMine = countBy(`SELECT COUNT(*) AS c FROM mine WHERE status = '生产中' ${c.sql}`, c.params);

  const d = cond(code, 'mineral_deposit');
  const depositTotal = countBy(`SELECT COUNT(*) AS c FROM mineral_deposit WHERE 1=1 ${d.sql}`, d.params);
  const depositReserve = round(sumBy(`SELECT SUM(reserve_t) AS s FROM mineral_deposit WHERE 1=1 ${d.sql}`, d.params));
  const minerals = listBy(`SELECT mineral AS name, COUNT(*) AS value FROM mineral_deposit WHERE 1=1 ${d.sql} GROUP BY mineral ORDER BY value DESC LIMIT 12`, d.params);

  const z = cond(code, 'plan_zone');
  const zoneCount = (type) => countBy(`SELECT COUNT(*) AS c FROM plan_zone WHERE zone_type = ? ${z.sql}`, [type, ...z.params]);
  const zoneGroups = listBy(`SELECT zone_type AS name, COUNT(*) AS value FROM plan_zone WHERE 1=1 ${z.sql} GROUP BY zone_type`, z.params);

  const r = cond(code, 'mining_right');
  const rightByType = listBy(`SELECT right_type AS name, COUNT(*) AS value FROM mining_right WHERE 1=1 ${r.sql} GROUP BY right_type`, r.params);
  const validMining = countBy(`SELECT COUNT(*) AS c FROM mining_right WHERE right_type='采矿权' AND status='有效' ${r.sql}`, r.params);
  const validExplore = countBy(`SELECT COUNT(*) AS c FROM mining_right WHERE right_type='探矿权' AND status='有效' ${r.sql}`, r.params);
  const newThisYear = (type) => countBy(`SELECT COUNT(*) AS c FROM mining_right WHERE right_type=? AND issue_date LIKE ? ${r.sql}`, [type, `${year}%`, ...r.params]);
  const saleCount = countBy(`SELECT COUNT(*) AS c FROM mining_right WHERE right_type='采矿权' AND method LIKE '%出让%' AND issue_date LIKE ? ${r.sql}`, [`${year}%`, ...r.params]);
  const saleAmount = round(sumBy(`SELECT SUM(price) AS s FROM mining_right WHERE right_type='采矿权' AND method LIKE '%出让%' AND issue_date LIKE ? ${r.sql}`, [`${year}%`, ...r.params]), 2);

  const g = cond(code, 'green_apply');
  const greenBys = listBy(`SELECT apply_level AS name, COUNT(*) AS value FROM green_apply WHERE stage='已入库' ${g.sql} GROUP BY apply_level`, g.params);
  const greenTotal = greenBys.reduce((s, x) => s + x.value, 0);
  const digital = countBy(`SELECT COUNT(*) AS c FROM mine WHERE digital_level != '—' ${c.sql}`, c.params);
  const smart = countBy(`SELECT COUNT(*) AS c FROM mine WHERE smart_level != '—' ${c.sql}`, c.params);

  const dv = cond(code, 'device');
  const deviceTotal = countBy(`SELECT COUNT(*) AS c FROM device WHERE 1=1 ${dv.sql}`, dv.params);
  const deviceOnline = countBy(`SELECT COUNT(*) AS c FROM device WHERE online=1 ${dv.sql}`, dv.params);
  const deviceCats = listBy(`SELECT category AS name, COUNT(*) AS value FROM device WHERE 1=1 ${dv.sql} GROUP BY category ORDER BY value DESC`, dv.params);
  const a = cond(code, 'alert');
  const statusAlerts = countBy(`SELECT COUNT(*) AS c FROM alert WHERE source='状态报警' AND status != '已销号' ${a.sql}`, a.params);
  const metricAlerts = countBy(`SELECT COUNT(*) AS c FROM alert WHERE source='监测指标' AND status != '已销号' ${a.sql}`, a.params);

  return {
    left: [
      {
        key: 'reserve', title: '矿产资源储量', type: 'stat-list',
        rows: [
          { label: '纳入统计矿产种数', value: minerals.length || 100, unit: '种' },
          { label: '增减率TOP1', suffix: '溶剂用灰岩', value: '125.5', unit: '%' },
          { label: '保护储量', value: depositReserve || 148029.26, unit: '万吨', decimals: 2 }
        ]
      },
      {
        key: 'plan', title: '规划与保护', type: 'stat-list',
        rows: [
          { label: '勘查规划区', value: zoneCount('重点勘查区'), unit: '个', delta: -2.4 },
          { label: '开采规划区', value: zoneCount('重点开采区'), unit: '个', delta: 0 },
          { label: '建筑石料开采区', value: zoneCount('砂石土料集中开采区'), unit: '个', delta: 4.8 }
        ]
      },
      {
        key: 'rights', title: '矿业权', type: 'tabbed',
        tabs: [
          {
            key: 'mining', label: '采矿权',
            groups: [
              { title: '有效采矿权', rows: [{ label: '数量', value: validMining, unit: '座', delta: -3.1 }] },
              { title: '其中年度新设', rows: [{ label: '新设', value: newThisYear('采矿权'), unit: '座', delta: 12.5 }] },
              { title: `今年采矿权出让`, rows: [{ label: '数量', value: saleCount, unit: '座' }, { label: '金额', value: round(saleAmount / 10000, 2), unit: '亿元', decimals: 2 }] }
            ]
          },
          {
            key: 'explore', label: '探矿权',
            groups: [
              { title: '有效探矿权', rows: [{ label: '数量', value: validExplore, unit: '宗', delta: -1.2 }] },
              { title: '其中年度新设', rows: [{ label: '新设', value: newThisYear('探矿权'), unit: '宗', delta: 6.4 }] }
            ]
          }
        ]
      }
    ],
    right: [
      {
        key: 'geo', title: '地质勘查', type: 'ring-split',
        ring: { total: 2.63, unit: '亿元', center: '2.63', label: '地质勘查投入' },
        rows: [
          { name: '中央财政', value: 0.84, unit: '亿元', delta: 121.0 },
          { name: '地方财政', value: 1.43, unit: '亿元', delta: 37.3 },
          { name: '社会资金', value: 0.36, unit: '亿元', delta: 60.0 }
        ]
      },
      {
        key: 'green', title: '绿色矿山', type: 'tabbed-ring',
        tabs: [
          { key: 'green', label: '绿色矿山', total: greenTotal, unit: '家', parts: greenBys.map((x) => ({ name: x.name, value: x.value })) },
          { key: 'digital', label: '数字矿山', total: digital, unit: '家', parts: [{ name: '已接入', value: digital }, { name: '待建设', value: Math.max(0, mineTotal - digital) }] },
          { key: 'smart', label: '智能矿山', total: smart, unit: '家', parts: [{ name: '已建成', value: smart }, { name: '待建设', value: Math.max(0, mineTotal - smart) }] }
        ]
      },
      {
        key: 'supervise', title: '智慧监管', type: 'stat-grid',
        blocks: [
          {
            title: '设备预警', icon: 'alert',
            items: [
              { label: '状态报警', value: statusAlerts, sub: '超时报警', tone: 'warn' },
              { label: '监测指标报警', value: metricAlerts, sub: '粉尘报警', tone: 'warn' }
            ]
          },
          {
            title: '感知监测', icon: 'sensor',
            items: [
              { label: '矿山数', value: onlineMine, unit: '座' },
              { label: '设备数', value: deviceTotal, unit: '个' },
              { label: '设备分类', value: deviceCats.length, unit: '个' }
            ]
          }
        ]
      }
    ],
    map: {
      bubbles: countyBubbles(code),
      themes: [
        { key: 'online', label: '在线矿山', count: onlineMine },
        { key: 'green', label: '绿色矿山', count: greenTotal },
        { key: 'right', label: '矿业权', count: validMining + validExplore },
        { key: 'deposit', label: '矿产地', count: depositTotal }
      ]
    },
    list: {
      online: listBy(
        `SELECT m.id, m.region_name, m.name, m.devices_total, m.devices_online, m.lon, m.lat, m.valid_to, m.right_holder, m.green_level
         FROM mine m WHERE 1=1 ${c.sql} ORDER BY m.devices_total DESC LIMIT 100`, c.params
      )
    },
    stats: { mineTotal, onlineMine, depositTotal, greenTotal, deviceTotal, deviceOnline }
  };
}

/* ------------------------------------------------------------------ 矿产地 */
function screenDeposit(code) {
  const d = cond(code, 'mineral_deposit');
  const stageRows = listBy(`SELECT stage AS name, COUNT(*) AS value FROM mineral_deposit WHERE 1=1 ${d.sql} GROUP BY stage`, d.params);
  const degreeRows = listBy(`SELECT degree AS name, COUNT(*) AS value FROM mineral_deposit WHERE 1=1 ${d.sql} GROUP BY degree`, d.params);
  const mineralRows = listBy(`SELECT mineral AS name, COUNT(*) AS value FROM mineral_deposit WHERE 1=1 ${d.sql} GROUP BY mineral ORDER BY value DESC LIMIT 12`, d.params);
  const scaleRows = listBy(`SELECT scale AS name, COUNT(*) AS value FROM mineral_deposit WHERE 1=1 ${d.sql} GROUP BY scale ORDER BY value DESC`, d.params);
  const topRows = listBy(`SELECT name, reserve_t FROM mineral_deposit WHERE reserve_t > 0 ${d.sql} ORDER BY reserve_t DESC LIMIT 5`, d.params);
  const total = stageRows.reduce((s, x) => s + x.value, 0);
  const reserve = round(sumBy(`SELECT SUM(reserve_t) AS s FROM mineral_deposit WHERE 1=1 ${d.sql}`, d.params));
  return {
    left: [
      { key: 'stage', title: '勘查程度', type: 'ring-split', ring: { total, unit: '个', center: String(total) }, rows: stageRows.map((x) => ({ name: x.name, value: x.value, unit: '个' })) },
      { key: 'mineral', title: '矿种分布', type: 'bars', rows: mineralRows.slice(0, 6) },
      {
        key: 'scale',
        title: '规模结构',
        type: 'stat-list',
        rows: scaleRows.map((x) => ({
          label: x.name,
          value: x.value,
          unit: '处',
          suffix: total ? `占比 ${round((x.value / total) * 100, 1)}%` : ''
        }))
      }
    ],
    right: [
      { key: 'degree', title: '勘查阶段', type: 'stat-list', rows: degreeRows.map((x) => ({ label: x.name, value: x.value, unit: '个' })) },
      {
        key: 'reserve',
        title: '资源家底',
        type: 'stat-list',
        rows: [
          { label: '矿产地总数', value: total, unit: '处' },
          { label: '保有资源量', value: reserve, unit: '万吨', decimals: 2 },
          { label: '单矿平均资源量', value: total ? round(reserve / total, 2) : 0, unit: '万吨', decimals: 2 },
          { label: '富硒/优势矿产', value: mineralRows.filter((m) => ['萤石', '叶蜡石', '膨润土'].includes(m.name)).reduce((s, m) => s + m.value, 0), unit: '处' }
        ]
      },
      { key: 'top', title: '资源量 Top5', type: 'bars', unit: '万吨', rows: topRows.map((x) => ({ name: x.name, value: round(x.reserve_t) })) }
    ],
    map: { bubbles: countyBubbles(code) },
    list: listBy(`SELECT id, code, name, region_name, mineral, stage, reserve_t, lon, lat FROM mineral_deposit WHERE 1=1 ${d.sql} ORDER BY reserve_t DESC LIMIT 100`, d.params)
  };
}

/* ------------------------------------------------------------------ 保护与规划 */
function screenPlan(code) {
  const z = cond(code, 'plan_zone');
  const i = cond(code, 'plan_indicator');
  const zoneGroups = listBy(`SELECT zone_type AS name, COUNT(*) AS value, ROUND(SUM(area),2) AS area FROM plan_zone WHERE 1=1 ${z.sql} GROUP BY zone_type`, z.params);
  const indicators = listBy(`SELECT name, target, actual, unit, warn FROM plan_indicator WHERE 1=1 ${i.sql} ORDER BY warn DESC LIMIT 8`, i.params);
  const levelRows = listBy(`SELECT level AS name, COUNT(*) AS value FROM plan_zone WHERE 1=1 ${z.sql} GROUP BY level`, z.params);
  const warnCount = indicators.filter((x) => x.warn !== '正常').length;
  const zoneTotal = zoneGroups.reduce((s, x) => s + x.value, 0);
  const areaTotal = round(zoneGroups.reduce((s, x) => s + Number(x.area || 0), 0));
  const rateRows = indicators
    .filter((x) => Number(x.target) > 0)
    .slice(0, 6)
    .map((x) => ({ name: x.name, value: round((Number(x.actual) / Number(x.target)) * 100, 1) }));
  const zoneTop = listBy(
    `SELECT region_name AS name, COUNT(*) AS value FROM plan_zone WHERE 1=1 ${z.sql} GROUP BY region_name ORDER BY value DESC LIMIT 6`,
    z.params
  );
  return {
    left: [
      { key: 'zones', title: '规划分区', type: 'ring-split', ring: { total: zoneTotal, unit: '个' }, rows: zoneGroups.map((x) => ({ name: x.name, value: x.value, unit: '个' })) },
      { key: 'zoneArea', title: '分区面积', type: 'bars', unit: 'km²', rows: zoneGroups.map((x) => ({ name: x.name, value: round(x.area), unit: 'km²' })) },
      {
        key: 'level',
        title: '规划层级',
        type: 'stat-list',
        rows: levelRows.map((x) => ({
          label: x.name,
          value: x.value,
          unit: '个',
          suffix: zoneTotal ? `占比 ${round((x.value / zoneTotal) * 100, 1)}%` : ''
        }))
      }
    ],
    right: [
      { key: 'rate', title: '指标达成率', type: 'bars', unit: '%', rows: rateRows },
      { key: 'zoneTop', title: '区块 Top6 区县', type: 'bars', rows: zoneTop },
      { key: 'warn', title: '指标预警', type: 'stat-list', rows: [
        { label: '红牌指标', value: indicators.filter((x) => x.warn === '红牌').length, unit: '项' },
        { label: '黄牌指标', value: indicators.filter((x) => x.warn === '黄牌').length, unit: '项' },
        { label: '达标指标', value: indicators.filter((x) => x.warn === '正常').length, unit: '项' },
        { label: '规划区总面积', value: areaTotal, unit: 'km²', decimals: 2 }
      ] }
    ],
    map: { bubbles: countyBubbles(code) },
    list: listBy(`SELECT id, code, name, zone_type, region_name, mineral, area, reserve_t, level FROM plan_zone WHERE 1=1 ${z.sql} ORDER BY area DESC LIMIT 100`, z.params),
    extra: { indicators, warnCount }
  };
}

/* ------------------------------------------------------------------ 矿业权 */
function screenRights(code) {
  const r = cond(code, 'mining_right');
  const byType = listBy(`SELECT right_type AS name, COUNT(*) AS value FROM mining_right WHERE 1=1 ${r.sql} GROUP BY right_type`, r.params);
  const byStatus = listBy(`SELECT status AS name, COUNT(*) AS value FROM mining_right WHERE 1=1 ${r.sql} GROUP BY status`, r.params);
  const byMethod = listBy(`SELECT method AS name, COUNT(*) AS value FROM mining_right WHERE 1=1 ${r.sql} GROUP BY method ORDER BY value DESC LIMIT 6`, r.params);
  const byScale = listBy(`SELECT scale AS name, COUNT(*) AS value FROM mining_right WHERE 1=1 ${r.sql} GROUP BY scale ORDER BY value DESC`, r.params);
  const byMineral = listBy(`SELECT mineral AS name, COUNT(*) AS value FROM mining_right WHERE 1=1 ${r.sql} GROUP BY mineral ORDER BY value DESC LIMIT 6`, r.params);
  const amount = round(sumBy(`SELECT SUM(price) AS s FROM mining_right WHERE 1=1 ${r.sql}`, r.params));
  const total = byType.reduce((s, x) => s + x.value, 0);
  return {
    left: [
      { key: 'type', title: '矿业权结构', type: 'ring-split', ring: { total, unit: '宗' }, rows: byType.map((x) => ({ name: x.name, value: x.value, unit: '宗' })) },
      { key: 'status', title: '登记状态', type: 'stat-list', rows: byStatus.map((x) => ({ label: x.name, value: x.value, unit: '宗' })) },
      {
        key: 'scale',
        title: '规模结构',
        type: 'stat-list',
        rows: byScale.map((x) => ({
          label: x.name,
          value: x.value,
          unit: '宗',
          suffix: total ? `占比 ${round((x.value / total) * 100, 1)}%` : ''
        }))
      }
    ],
    right: [
      { key: 'method', title: '出让方式', type: 'bars', rows: byMethod },
      { key: 'mineral', title: '矿种 Top6', type: 'bars', rows: byMineral },
      {
        key: 'amount',
        title: '出让收益',
        type: 'stat-list',
        rows: [
          { label: '累计价款', value: amount, unit: '万元', decimals: 2 },
          { label: '单宗平均价款', value: total ? round(amount / total, 2) : 0, unit: '万元', decimals: 2 },
          { label: '有效矿业权', value: total, unit: '宗' }
        ]
      }
    ],
    map: { bubbles: countyBubbles(code) },
    list: listBy(`SELECT id, license_no, right_type, mine_name, holder, mineral, area, region_name, valid_from, valid_to, status, lon, lat FROM mining_right WHERE 1=1 ${r.sql} ORDER BY id DESC LIMIT 100`, r.params)
  };
}

/* ------------------------------------------------------------------ 绿色矿山 */
function screenGreen(code) {
  const c = cond(code, 'mine');
  const g = cond(code, 'green_apply');
  const byLevel = listBy(`SELECT green_level AS name, COUNT(*) AS value FROM mine WHERE green_level != '未入库' ${c.sql} GROUP BY green_level`, c.params);
  const byStage = listBy(`SELECT stage AS name, COUNT(*) AS value FROM green_apply WHERE 1=1 ${g.sql} GROUP BY stage`, g.params);
  const total = byLevel.reduce((s, x) => s + x.value, 0);
  const score = round(get(`SELECT AVG(total_score) AS s FROM green_apply WHERE stage='已入库' ${g.sql}`, g.params)?.s || 0, 1);
  const dims = get(
    `SELECT AVG(score_env) AS env, AVG(score_develop) AS develop, AVG(score_utilize) AS utilize,
            AVG(score_energy) AS energy, AVG(score_tech) AS tech, AVG(score_manage) AS manage
     FROM green_apply WHERE 1=1 ${g.sql}`,
    g.params
  ) || {};
  const dimRows = [
    { name: '矿区环境', value: round(dims.env, 1) },
    { name: '开发方式', value: round(dims.develop, 1) },
    { name: '综合利用', value: round(dims.utilize, 1) },
    { name: '节能减排', value: round(dims.energy, 1) },
    { name: '智能矿山', value: round(dims.tech, 1) },
    { name: '企业管理', value: round(dims.manage, 1) }
  ];
  const digital = countBy(`SELECT COUNT(*) AS c FROM mine WHERE digital_level != '—' ${c.sql}`, c.params);
  const smart = countBy(`SELECT COUNT(*) AS c FROM mine WHERE smart_level != '—' ${c.sql}`, c.params);
  const o = cond(code, 'green_out');
  const byOut = listBy(`SELECT out_type AS name, COUNT(*) AS value FROM green_out WHERE 1=1 ${o.sql} GROUP BY out_type`, o.params);
  const outTotal = byOut.reduce((s, x) => s + x.value, 0);
  return {
    left: [
      { key: 'level', title: '绿色矿山分级', type: 'ring-split', ring: { total, unit: '家', center: String(total) }, rows: byLevel.map((x) => ({ name: x.name, value: x.value, unit: '家' })) },
      { key: 'digital', title: '名录结构', type: 'stat-list', rows: [
        { label: '绿色矿山', value: total, unit: '家' },
        { label: '数字矿山', value: digital, unit: '家', suffix: total ? `占比 ${round((digital / total) * 100, 1)}%` : '' },
        { label: '智能矿山', value: smart, unit: '家', suffix: total ? `占比 ${round((smart / total) * 100, 1)}%` : '' }
      ] },
      { key: 'dims', title: '六维平均得分', type: 'pie', unit: '分', rows: dimRows }
    ],
    right: [
      { key: 'stage', title: '申报进度', type: 'bars', rows: byStage },
      {
        key: 'out',
        title: '出库情况',
        type: 'stat-list',
        rows: byOut.map((x) => ({
          label: x.name,
          value: x.value,
          unit: '家',
          suffix: outTotal ? `占比 ${round((x.value / outTotal) * 100, 1)}%` : ''
        }))
      },
      { key: 'score', title: '评价结果', type: 'stat-list', rows: [
        { label: '已入库平均得分', value: score, unit: '分' },
        { label: '申报总数', value: byStage.reduce((s, x) => s + x.value, 0), unit: '件' },
        { label: '已入库数', value: byStage.find((x) => x.name === '已入库')?.value || 0, unit: '件' },
        { label: '入库率', value: byStage.reduce((s, x) => s + x.value, 0) ? round(((byStage.find((x) => x.name === '已入库')?.value || 0) / byStage.reduce((s, x) => s + x.value, 0)) * 100, 1) : 0, unit: '%' }
      ] }
    ],
    map: { bubbles: countyBubbles(code) },
    list: listBy(
      `SELECT id, name, region_name, valid_to, right_holder, green_level, valid_from, lon, lat
       FROM mine WHERE green_level != '未入库' ${c.sql} ORDER BY id LIMIT 100`, c.params
    )
  };
}

/* ------------------------------------------------------------------ 智慧监管 */
function screenSupervise(code) {
  const a = cond(code, 'alert');
  const dv = cond(code, 'device');
  const w = cond(code, 'work_order');
  const byKind = listBy(`SELECT kind AS name, COUNT(*) AS value FROM alert WHERE 1=1 ${a.sql} GROUP BY kind ORDER BY value DESC LIMIT 8`, a.params);
  const byStatus = listBy(`SELECT status AS name, COUNT(*) AS value FROM work_order WHERE 1=1 ${w.sql} GROUP BY status`, w.params);
  const online = countBy(`SELECT COUNT(*) AS c FROM device WHERE online=1 ${dv.sql}`, dv.params);
  const total = countBy(`SELECT COUNT(*) AS c FROM device WHERE 1=1 ${dv.sql}`, dv.params);
  const overdue = countBy(`SELECT COUNT(*) AS c FROM work_order WHERE overdue=1 AND status != '复核销号' ${w.sql}`, w.params);
  const byDevice = listBy(`SELECT category AS name, COUNT(*) AS value FROM device WHERE 1=1 ${dv.sql} GROUP BY category ORDER BY value DESC LIMIT 6`, dv.params);
  const byLevelAlert = listBy(`SELECT level AS name, COUNT(*) AS value FROM alert WHERE 1=1 ${a.sql} GROUP BY level`, a.params);
  const orderTotal = byStatus.reduce((s, x) => s + x.value, 0);
  const closed = countBy(`SELECT COUNT(*) AS c FROM work_order WHERE status = '复核销号' ${w.sql}`, w.params);
  return {
    left: [
      { key: 'alert', title: '预警类型', type: 'ring-split', ring: { total: byKind.reduce((s, x) => s + x.value, 0), unit: '条' }, rows: byKind.slice(0, 4).map((x) => ({ name: x.name, value: x.value, unit: '条' })) },
      { key: 'device', title: '感知设备', type: 'stat-list', rows: [
        { label: '设备总数', value: total, unit: '台套' },
        { label: '在线设备', value: online, unit: '台套' },
        { label: '在线率', value: total ? round((online / total) * 100, 1) : 0, unit: '%' },
        { label: '设备分类', value: byDevice.length, unit: '类' }
      ] },
      { key: 'deviceType', title: '设备类型 Top6', type: 'bars', rows: byDevice }
    ],
    right: [
      { key: 'order', title: '问题处置', type: 'bars', rows: byStatus },
      {
        key: 'overdue',
        title: '督办与处置',
        type: 'stat-list',
        rows: [
          { label: '超时未处置', value: overdue, unit: '件' },
          { label: '待核实', value: byStatus.find((x) => x.name === '现场核实')?.value || 0, unit: '件' },
          { label: '已销号', value: closed, unit: '件' },
          { label: '销号率', value: orderTotal ? round((closed / orderTotal) * 100, 1) : 0, unit: '%' }
        ]
      },
      { key: 'alertLevel', title: '预警等级', type: 'bars', rows: byLevelAlert }
    ],
    map: { bubbles: countyBubbles(code) },
    list: listBy(`SELECT id, alert_no, kind, level, mine_name, region_name, content, status, occurred_at FROM alert WHERE 1=1 ${a.sql} ORDER BY id DESC LIMIT 100`, a.params)
  };
}

/* ------------------------------------------------------------------ 数智地勘 */
function screenGeology(code) {
  const gp = cond(code, 'geo_project');
  const hz = cond(code, 'hazard_point');
  const ag = cond(code, 'agri_plot');
  const byCat = listBy(`SELECT category AS name, COUNT(*) AS value FROM geo_project WHERE 1=1 ${gp.sql} GROUP BY category`, gp.params);
  const byHazard = listBy(`SELECT type AS name, COUNT(*) AS value FROM hazard_point WHERE 1=1 ${hz.sql} GROUP BY type`, hz.params);
  const reserveAdd = round(sumBy(`SELECT SUM(reserve_add) AS s FROM geo_project WHERE 1=1 ${gp.sql}`, gp.params));
  const threat = countBy(`SELECT COUNT(*) AS c FROM hazard_point WHERE level IN ('一级','二级') ${hz.sql}`, hz.params);
  const byStatus = listBy(`SELECT status AS name, COUNT(*) AS value FROM geo_project WHERE 1=1 ${gp.sql} GROUP BY status`, gp.params);
  const byHzLevel = listBy(`SELECT level AS name, COUNT(*) AS value FROM hazard_point WHERE 1=1 ${hz.sql} GROUP BY level`, hz.params);
  const agriArea = round(sumBy(`SELECT SUM(area) AS s FROM agri_plot WHERE 1=1 ${ag.sql}`, ag.params));
  const projectTotal = byCat.reduce((s, x) => s + x.value, 0);
  return {
    left: [
      { key: 'cat', title: '地勘项目', type: 'ring-split', ring: { total: projectTotal, unit: '个' }, rows: byCat.map((x) => ({ name: x.name, value: x.value, unit: '个' })) },
      {
        key: 'reserve',
        title: '找矿成果',
        type: 'stat-list',
        rows: [
          { label: '新增资源量', value: reserveAdd, unit: '万吨', decimals: 2 },
          { label: '项目总数', value: projectTotal, unit: '个' },
          { label: '单项目均增', value: projectTotal ? round(reserveAdd / projectTotal, 2) : 0, unit: '万吨', decimals: 2 }
        ]
      },
      { key: 'status', title: '项目状态', type: 'bars', rows: byStatus }
    ],
    right: [
      { key: 'hazard', title: '地灾隐患点', type: 'bars', rows: byHazard },
      { key: 'level', title: '隐患等级', type: 'bars', rows: byHzLevel },
      {
        key: 'agri',
        title: '农业地质',
        type: 'stat-list',
        rows: [
          { label: '富硒地块', value: countBy(`SELECT COUNT(*) AS c FROM agri_plot WHERE level='富硒' ${ag.sql}`, ag.params), unit: '宗' },
          { label: '调查面积', value: agriArea, unit: 'km²', decimals: 2 },
          { label: '重点隐患', value: threat, unit: '处' }
        ]
      }
    ],
    map: { bubbles: countyBubbles(code) },
    list: listBy(`SELECT id, code, name, category, region_name, unit, progress, reserve_add, status FROM geo_project WHERE 1=1 ${gp.sql} ORDER BY id DESC LIMIT 100`, gp.params)
  };
}

const SCREENS = {
  dashboard: screenDashboard,
  deposit: screenDeposit,
  plan: screenPlan,
  rights: screenRights,
  green: screenGreen,
  supervise: screenSupervise,
  geology: screenGeology
};

router.get('/:scene', wrap((req, res) => {
  const fn = SCREENS[req.params.scene];
  if (!fn) return res.status(404).json({ code: 404, msg: '场景不存在', data: null });
  const code = req.query.code || req.user.region_code || '510000';
  const year = Number(req.query.year || 2024);
  ok(res, fn(code, year));
}));

/* 地图要素：按当前视角返回矿山 / 矿产地 / 矿业权点 */
router.get('/map/:theme', wrap((req, res) => {
  const theme = req.params.theme;
  const code = req.query.code || '510000';
  const map = {
    online: () => {
      const c = cond(code, 'mine');
      return listBy(`SELECT id, name, region_name, lon, lat, status, mineral, license_no, area_km2, valid_from, valid_to, right_holder, econ_type, region_code, video_connected, monitor_connected, warn_connected, green_level, devices_total, devices_online FROM mine WHERE 1=1 ${c.sql} LIMIT 800`, c.params);
    },
    green: () => {
      const c = cond(code, 'mine');
      return listBy(`SELECT id, name, region_name, lon, lat, green_level, valid_to, right_holder FROM mine WHERE green_level != '未入库' ${c.sql} LIMIT 800`, c.params);
    },
    deposit: () => {
      const c = cond(code, 'mineral_deposit');
      return listBy(`SELECT id, name, region_name, lon, lat, mineral, stage, reserve_t FROM mineral_deposit WHERE 1=1 ${c.sql} LIMIT 800`, c.params);
    },
    right: () => {
      const c = cond(code, 'mining_right');
      return listBy(`SELECT id, mine_name AS name, region_name, lon, lat, right_type, mineral, status, valid_to FROM mining_right WHERE 1=1 ${c.sql} LIMIT 800`, c.params);
    },
    hazard: () => {
      const c = cond(code, 'hazard_point');
      return listBy(`SELECT id, name, region_name, lon, lat, type, level, status FROM hazard_point WHERE 1=1 ${c.sql} LIMIT 800`, c.params);
    },
    topo: () => {
      const c = cond(code, 'plan_zone');
      /* plan_zone 是行政区面数据、没有坐标列：按 region_name 关联 region 中心点，
         再用 id 做有序小抖动避免同类区块完全重叠；只影响展示落点，不改变业务属性。 */
      return listBy(
        `SELECT p.id, p.name, p.region_name, p.zone_type, p.area,
                ROUND(r.center_lon + ((p.id % 17) - 8) * 0.028, 5) AS lon,
                ROUND(r.center_lat + ((p.id % 13) - 6) * 0.022, 5) AS lat
           FROM plan_zone p LEFT JOIN region r ON r.name = p.region_name
          WHERE 1=1 ${c.sql} LIMIT 400`,
        c.params
      ).filter((x) => x.lon != null && x.lat != null);
    }
  };
  const fn = map[theme];
  if (!fn) return res.status(404).json({ code: 404, msg: '图层不存在', data: null });
  ok(res, { list: fn() });
}));

/* 重点任务作战图 */
router.get('/task/battle', wrap((req, res) => {
  const year = Number(req.query.year || 2024);
  const kw = req.query.kw || '';
  const params = [year];
  let sql = `SELECT * FROM battle_task WHERE year = ?`;
  if (kw) {
    sql += ` AND (content LIKE ? OR outcome LIKE ? OR category LIKE ?)`;
    params.push(`%${kw}%`, `%${kw}%`, `%${kw}%`);
  }
  sql += ` ORDER BY category, seq`;
  const rows = all(sql, params);
  const stats = {
    total: rows.length,
    done: rows.filter((r) => r.status === '已完成').length,
    doing: rows.filter((r) => r.status === '进行中').length,
    years: all(`SELECT DISTINCT year FROM battle_task ORDER BY year`).map((r) => r.year)
  };
  const groups = [];
  const map = new Map();
  rows.forEach((r) => {
    const key = `${r.category}||${r.content}`;
    if (!map.has(r.category)) {
      const g = { category: r.category, dept: r.dept, support: r.support_dept, items: [] };
      map.set(r.category, g);
      groups.push(g);
    }
    map.get(r.category).items.push(r);
  });
  // 组内按序号升序、组间按组内最小序号升序，保证表格里「序号」视觉连续（1..N）
  groups.forEach((g) => g.items.sort((a, b) => a.seq - b.seq));
  groups.sort((a, b) => a.items[0].seq - b.items[0].seq);
  const ordered = groups.flatMap((g) => g.items);
  ok(res, { list: ordered, groups, stats });
}));

export default router;
