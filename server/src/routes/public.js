import express from 'express';
import multer from 'multer';
import QRCode from 'qrcode';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { all, get, run, insertRow, tableCount } from '../db.js';
import { MODULES, SCENES, FIELDS, REGION_OPTIONS, MINERAL_OPTIONS } from '../features.js';
import { ok, fail, wrap, nowStr, pageParams, whereRegion } from '../util.js';
import { authRequired, signToken, verifyPassword, hashPassword, loadUser, touchLogin, audit, ROLE_LABEL, can } from '../auth.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.resolve(__dirname, '../../data/uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

/* ------------------------------------------------------------------ 登录 */
router.post('/auth/login', wrap((req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return fail(res, '请输入账号和密码', 400);
  const user = loadUser(username);
  if (!user) return fail(res, '账号不存在', 401);
  if (user.status !== '正常') return fail(res, '账号已被停用，请联系管理员', 403);
  if (!verifyPassword(password, user.password)) return fail(res, '密码错误', 401);
  touchLogin(user.id);
  const token = signToken(user);
  try {
    run(`INSERT INTO audit_log (username,name,action,target,detail,ip,created_at) VALUES (?,?,?,?,?,?,?)`,
      [user.username, user.name, '登录', '系统', `${ROLE_LABEL[user.role] || user.role}`, req.ip || '', nowStr()]);
  } catch { /* ignore */ }
  ok(res, {
    token,
    user: {
      id: user.id, username: user.username, name: user.name, org: user.org, role: user.role,
      roleLabel: ROLE_LABEL[user.role] || user.role, title: user.title,
      region_code: user.region_code, region_name: user.region_name, last_login: user.last_login
    }
  }, { msg: '登录成功' });
}));

router.get('/auth/me', authRequired, wrap((req, res) => {
  const u = get(`SELECT id,username,name,org,role,title,region_code,region_name,phone,email,last_login FROM sys_user WHERE id = ?`, [req.user.id]);
  if (!u) return fail(res, '账号不存在', 401);
  ok(res, { ...u, roleLabel: ROLE_LABEL[u.role] || u.role });
}));

router.post('/auth/logout', authRequired, wrap((req, res) => {
  audit(req, '退出登录', '系统', '');
  ok(res, null, { msg: '已退出登录' });
}));

/* 用户管理（省市县三级分权） */
router.get('/auth/users', authRequired, wrap((req, res) => {
  const rs = whereRegion(req.user);
  const rows = all(
    `SELECT id,username,name,org,role,title,region_code,region_name,phone,email,status,last_login,created_at
     FROM sys_user WHERE 1=1 ${rs.sql} ORDER BY id`,
    rs.params
  );
  ok(res, { list: rows.map((u) => ({ ...u, roleLabel: ROLE_LABEL[u.role] || u.role })) });
}));

router.post('/auth/users', authRequired, wrap((req, res) => {
  if (!can(req.user, 'city_approve')) return fail(res, '无新增用户权限', 403);
  const { username, password, name, org, role, title, region_code, region_name } = req.body || {};
  if (!username || !password || !name) return fail(res, '账号、密码、姓名不能为空', 400);
  if (get(`SELECT id FROM sys_user WHERE username = ?`, [username])) return fail(res, '账号已存在', 400);
  const info = insertRow('sys_user', {
    username, password: hashPassword(password), name, org: org || '', role: role || 'county', title: title || '',
    region_code: region_code || req.user.region_code, region_name: region_name || '', phone: '', email: '',
    status: '正常', created_at: nowStr()
  });
  audit(req, '新增用户', username, role);
  ok(res, { id: Number(info.lastInsertRowid) }, { msg: '用户已创建' });
}));

router.put('/auth/users/:id', authRequired, wrap((req, res) => {
  if (!can(req.user, 'city_approve')) return fail(res, '无修改用户权限', 403);
  const id = Number(req.params.id);
  const fields = ['name', 'org', 'role', 'title', 'region_code', 'region_name', 'phone', 'email', 'status'];
  const sets = [];
  const params = [];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) {
      sets.push(`${f} = ?`);
      params.push(req.body[f]);
    }
  });
  if (req.body.password) {
    sets.push('password = ?');
    params.push(hashPassword(req.body.password));
  }
  if (!sets.length) return fail(res, '没有需要更新的内容', 400);
  params.push(id);
  run(`UPDATE sys_user SET ${sets.join(', ')} WHERE id = ?`, params);
  audit(req, '修改用户', `#${id}`, '');
  ok(res, null, { msg: '已保存' });
}));

/* ------------------------------------------------------------------ 元数据 */
router.get('/meta/bootstrap', authRequired, wrap((req, res) => {
  ok(res, {
    user: req.user,
    scenes: SCENES,
    modules: MODULES.map((m) => ({
      key: m.key, name: m.name, route: m.route, intro: m.intro,
      features: m.features.map((f) => ({
        key: f.key, name: f.name, desc: f.desc, columns: f.columns, filters: f.filters, form: f.form,
        workflow: f.workflow || null, extras: f.extras || {}, readonly: !!f.readonly,
        special: f.special || null, qr: !!f.qr, archive: !!f.archive, mobile: !!f.mobile, score: !!f.score, table: f.table
      }))
    })),
    fields: FIELDS,
    regions: REGION_OPTIONS,
    minerals: MINERAL_OPTIONS,
    roles: ROLE_LABEL,
    stats: {
      mine: tableCount('mine'),
      deposit: tableCount('mineral_deposit'),
      right: tableCount('mining_right'),
      device: tableCount('device'),
      alert: tableCount('alert'),
      order: tableCount('work_order'),
      biz: tableCount('biz_record')
    }
  });
}));

router.get('/meta/regions', wrap((req, res) => {
  ok(res, { list: all(`SELECT * FROM region ORDER BY level, code`) });
}));

router.get('/meta/dict/:type', wrap((req, res) => {
  ok(res, { list: all(`SELECT * FROM sys_dict WHERE type = ? ORDER BY sort`, [req.params.type]) });
}));

/* ------------------------------------------------------------------ 二维码（一矿一档） */
router.get('/qr', wrap(async (req, res) => {
  const text = String(req.query.text || '绿矿智用 · 矿权管理系统');
  const size = Math.min(600, Math.max(120, Number(req.query.size || 220)));
  const dataUrl = await QRCode.toDataURL(text, { width: size, margin: 1, color: { dark: '#0a1a33', light: '#ffffff' } });
  ok(res, { dataUrl, text });
}));

/* 矿山全息档案（一矿一档） */
router.get('/archive/:id', authRequired, wrap((req, res) => {
  const mine = get(`SELECT * FROM mine WHERE id = ?`, [Number(req.params.id)]);
  if (!mine) return fail(res, '矿山不存在', 404);
  const rights = all(`SELECT * FROM mining_right WHERE mine_id = ? ORDER BY valid_from`, [mine.id]);
  const reviews = all(`SELECT * FROM reserve_review WHERE mine_name = ? ORDER BY submit_at DESC`, [mine.name]);
  const greens = all(`SELECT * FROM green_apply WHERE mine_id = ? ORDER BY submit_at DESC`, [mine.id]);
  const patrols = all(`SELECT * FROM patrol_log WHERE mine_id = ? ORDER BY sign_at DESC LIMIT 20`, [mine.id]);
  const orders = all(`SELECT * FROM work_order WHERE mine_id = ? ORDER BY found_at DESC LIMIT 20`, [mine.id]);
  const devices = all(`SELECT * FROM device WHERE mine_id = ?`, [mine.id]);
  const alerts = all(`SELECT * FROM alert WHERE mine_id = ? ORDER BY occurred_at DESC LIMIT 20`, [mine.id]);
  const credit = get(`SELECT * FROM credit_record WHERE mine_id = ?`, [mine.id]);
  const deposits = all(`SELECT * FROM mineral_deposit WHERE region_code = ? LIMIT 10`, [mine.region_code]);
  ok(res, { mine, rights, reviews, greens, patrols, orders, devices, alerts, credit, deposits });
}));

/* ------------------------------------------------------------------ 数据仓 */
router.get('/warehouse/overview', authRequired, wrap((req, res) => {
  const catalogs = all(`SELECT * FROM data_catalog ORDER BY topic, id`);
  const assets = all(`SELECT * FROM data_asset ORDER BY topic, year DESC, id DESC LIMIT 300`);
  const topics = [...new Set(catalogs.map((c) => c.topic))].map((topic) => ({
    topic,
    items: catalogs.filter((c) => c.topic === topic).map((c) => ({ ...c, fields: JSON.parse(c.fields || '[]') })),
    totalRows: catalogs.filter((c) => c.topic === topic).reduce((s, c) => s + c.rows, 0),
    assetCount: assets.filter((a) => a.topic === topic).length
  }));
  ok(res, { topics, assets });
}));

router.post('/warehouse/upload', authRequired, upload.single('file'), wrap((req, res) => {
  if (!req.file) return fail(res, '请选择要上传的文件', 400);
  const safeName = `asset_${Date.now()}${path.extname(req.file.originalname) || '.dat'}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, safeName), req.file.buffer);
  const info = insertRow('data_asset', {
    topic: req.body.topic || '地质勘查专题库',
    name: req.file.originalname,
    file_type: (path.extname(req.file.originalname) || '').replace('.', '').toUpperCase() || 'FILE',
    size_kb: Math.round(req.file.size / 1024),
    source: req.user.org || '',
    year: Number(req.body.year || new Date().getFullYear()),
    region_name: req.user.region_name || '浙江省',
    uploaded_at: nowStr(),
    meta: JSON.stringify({ storedAs: safeName, uploader: req.user.name, note: req.body.note || '' })
  });
  audit(req, '上传数据', req.file.originalname, `${Math.round(req.file.size / 1024)} KB`);
  ok(res, { id: Number(info.lastInsertRowid), file: safeName }, { msg: '上传成功' });
}));

/* ------------------------------------------------------------------ 移动端 */
router.get('/mobile/home', authRequired, wrap((req, res) => {
  const rs = whereRegion(req.user);
  const stat = (sql) => Number(get(sql, rs.params)?.c || 0);
  ok(res, {
    user: { name: req.user.name, org: req.user.org, role: ROLE_LABEL[req.user.role], region: req.user.region_name },
    cards: [
      { key: 'patrol', label: '巡查打卡', value: stat(`SELECT COUNT(*) AS c FROM patrol_log WHERE 1=1 ${rs.sql}`), unit: '次', route: '/mobile/patrol' },
      { key: 'order', label: '待整改', value: stat(`SELECT COUNT(*) AS c FROM work_order WHERE status != '复核销号' ${rs.sql}`), unit: '件', route: '/mobile/order' },
      { key: 'green', label: '绿色申报', value: stat(`SELECT COUNT(*) AS c FROM green_apply WHERE stage != '已入库' ${rs.sql}`), unit: '家', route: '/mobile/green' },
      { key: 'alert', label: '待核实预警', value: stat(`SELECT COUNT(*) AS c FROM alert WHERE status = '待核实' ${rs.sql}`), unit: '条', route: '/mobile/alert' }
    ]
  });
}));

router.get('/mobile/list/:type', authRequired, wrap((req, res) => {
  const rs = whereRegion(req.user);
  const type = req.params.type;
  const map = {
    patrol: `SELECT id, plan_name AS title, mine_name, inspector, sign_at AS time, result AS status FROM patrol_log WHERE 1=1 ${rs.sql} ORDER BY sign_at DESC LIMIT 50`,
    order: `SELECT id, title, mine_name, dept, due_at AS time, status FROM work_order WHERE status != '复核销号' ${rs.sql} ORDER BY found_at DESC LIMIT 50`,
    green: `SELECT id, mine_name AS title, region_name, stage AS status, submit_at AS time FROM green_apply WHERE stage != '已入库' ${rs.sql} ORDER BY submit_at DESC LIMIT 50`,
    alert: `SELECT id, content AS title, mine_name, occurred_at AS time, status FROM alert WHERE status = '待核实' ${rs.sql} ORDER BY occurred_at DESC LIMIT 50`
  };
  const sql = map[type];
  if (!sql) return fail(res, '类型不存在', 404);
  ok(res, { list: all(sql, rs.params) });
}));

/* 移动端巡查打卡 */
router.post('/mobile/patrol', authRequired, wrap((req, res) => {
  const { mine_id, mine_name, lon, lat, finding, photos = 0, result = '正常' } = req.body || {};
  const info = insertRow('patrol_log', {
    plan_name: '移动端现场巡查', grid: `${req.user.region_name}移动网格`, mine_id: mine_id || null,
    mine_name: mine_name || '', region_code: req.user.region_code, inspector: req.user.name,
    sign_at: nowStr().slice(0, 16).replace('T', ' '), lon: lon || null, lat: lat || null,
    photos: Number(photos) || 0, finding: finding || '现场巡查，无异常。', result, created_at: nowStr()
  });
  audit(req, '移动端巡查打卡', mine_name || '-', finding || '');
  ok(res, { id: Number(info.lastInsertRowid) }, { msg: '打卡成功，已计入巡查台账' });
}));

/* ------------------------------------------------------------------ 系统 */
router.get('/system/audit', authRequired, wrap((req, res) => {
  const { page, pageSize, offset } = pageParams(req.query);
  const list = all(`SELECT * FROM audit_log ORDER BY id DESC LIMIT ? OFFSET ?`, [pageSize, offset]);
  ok(res, { list, total: Number(get(`SELECT COUNT(*) AS c FROM audit_log`)?.c || 0), page, pageSize });
}));

router.get('/system/health', wrap((req, res) => {
  ok(res, {
    time: nowStr(),
    db: 'SQLite (node:sqlite)',
    tables: all(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`).length,
    counts: {
      mine: tableCount('mine'), deposit: tableCount('mineral_deposit'), right: tableCount('mining_right'),
      device: tableCount('device'), alert: tableCount('alert'), biz: tableCount('biz_record')
    }
  });
}));

/* ------------------------------------------------------------------ 指标监测 / 问题监测 */
router.get('/monitor/indicator', authRequired, wrap((req, res) => {
  const rs = whereRegion(req.user);
  ok(res, {
    indicators: all(`SELECT * FROM plan_indicator WHERE 1=1 ${rs.sql} ORDER BY warn DESC`, rs.params),
    totals: {
      red: Number(get(`SELECT COUNT(*) AS c FROM plan_indicator WHERE warn='红牌' ${rs.sql}`, rs.params)?.c || 0),
      yellow: Number(get(`SELECT COUNT(*) AS c FROM plan_indicator WHERE warn='黄牌' ${rs.sql}`, rs.params)?.c || 0),
      normal: Number(get(`SELECT COUNT(*) AS c FROM plan_indicator WHERE warn='正常' ${rs.sql}`, rs.params)?.c || 0)
    }
  });
}));

router.get('/monitor/problem', authRequired, wrap((req, res) => {
  const rs = whereRegion(req.user);
  const list = all(
    `SELECT id, order_no AS code, title, mine_name, region_name, level, status, found_at, due_at, overdue
     FROM work_order WHERE status != '复核销号' ${rs.sql} ORDER BY overdue DESC, found_at DESC LIMIT 60`,
    rs.params
  );
  const openAlerts = all(
    `SELECT id, alert_no, kind, level, mine_name, content, status, occurred_at
     FROM alert WHERE status != '已销号' ${rs.sql} ORDER BY occurred_at DESC LIMIT 40`,
    rs.params
  );
  const warnIndicators = all(
    `SELECT id, name, target, actual, unit, warn, region_name FROM plan_indicator WHERE warn IN ('红牌','黄牌') ${rs.sql} LIMIT 40`,
    rs.params
  );
  const items = [
    ...list.filter((x) => x.overdue).slice(0, 6).map((x) => ({ type: '超期工单', title: `${x.title}（${x.mine_name || x.region_name}）`, at: x.due_at, tone: 'tone-red' })),
    ...openAlerts.slice(0, 6).map((x) => ({ type: '预警待处置', title: `${x.kind}：${x.content}`, at: x.occurred_at, tone: 'tone-orange' })),
    ...warnIndicators.slice(0, 6).map((x) => ({ type: `${x.warn}指标`, title: `${x.name} 执行 ${x.actual}${x.unit || ''} / 目标 ${x.target}${x.unit || ''}`, at: x.region_name, tone: x.warn === '红牌' ? 'tone-red' : 'tone-yellow' }))
  ];
  ok(res, {
    list,
    alerts: openAlerts,
    indicators: warnIndicators,
    items,
    totals: {
      total: list.length,
      overdue: list.filter((x) => x.overdue).length,
      pending: list.filter((x) => x.status === '待分派').length,
      doing: list.filter((x) => ['现场核实', '整改落实'].includes(x.status)).length
    },
    orders: {
      pending: list.filter((x) => x.status === '待分派').length,
      overdue: list.filter((x) => x.overdue).length
    },
    openAlertCount: openAlerts.length
  });
}));

export default router;
