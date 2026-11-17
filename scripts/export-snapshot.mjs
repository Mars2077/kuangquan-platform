/**
 * 导出演示快照：把 server 的运行数据导出为静态前端可直接消费的 JSON。
 *
 * 产物：web/public/demo/data.json
 *   - tables: 26 张业务表的全量行（用于前端本地查询 / 增删改）
 *   - views:  只读聚合视图（bootstrap / 7 驾驶舱场景 / 6 专题图层 / 作战图 / 数据仓 / 移动端 / 系统）
 *
 * 前置：先启动 API（默认 http://127.0.0.1:8787），或设置 API 环境变量。
 * 用法：node scripts/export-snapshot.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DB_FILE = path.join(ROOT, 'server', 'data', 'kuangquan.db');
const OUT = path.join(ROOT, 'web', 'public', 'demo', 'data.json');
const API = process.env.API || 'http://127.0.0.1:8787';

const SKIP = new Set(['sqlite_sequence', 'audit_log']);
const SCENES = ['dashboard', 'deposit', 'plan', 'rights', 'green', 'supervise', 'geology'];
const THEMES = ['online', 'green', 'deposit', 'right', 'hazard', 'topo'];
const YEARS = [2022, 2023, 2024, 2025, 2026];

/* ---------- 1. 数据表 ---------- */
const db = new DatabaseSync(DB_FILE, { readOnly: true });
const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  .all()
  .map((r) => r.name)
  .filter((t) => !SKIP.has(t));

const out = { generatedAt: new Date().toISOString(), tables: {}, views: {} };
let rowsTotal = 0;
for (const t of tables) {
  const rows = db.prepare(`SELECT * FROM ${t}`).all();
  out.tables[t] = rows;
  rowsTotal += rows.length;
}
db.close();

/* ---------- 2. 只读聚合视图 ---------- */
const say = (s) => console.log('  ' + s);
let token = '';
async function call(p, opt = {}) {
  const res = await fetch(API + p, {
    ...opt,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opt.headers || {}) },
  });
  const json = await res.json();
  if (json.code !== 0) throw new Error(`${p} -> ${json.msg || res.status}`);
  return json.data;
}

// 用省级账号导出聚合视图：省级视角数据不按地市隔离，快照里的驾驶舱列表才是全省口径
const login = await call('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: 'province', password: '123456' }) });
token = login.token;

const bootstrap = await call('/api/meta/bootstrap');
delete bootstrap.user;
out.views.bootstrap = bootstrap;
say(`bootstrap: ${bootstrap.modules.length} modules`);

out.views.scenes = {};
for (const s of SCENES) {
  out.views.scenes[s] = await call(`/api/screen/${s}`);
  const v = out.views.scenes[s];
  say(`scene ${s}: L${(v.left || []).length}/R${(v.right || []).length}`);
}

out.views.maps = {};
for (const t of THEMES) {
  out.views.maps[t] = await call(`/api/screen/map/${t}`);
  say(`map ${t}: ${(out.views.maps[t].list || []).length} rows`);
}

out.views.battles = {};
for (const y of YEARS) {
  out.views.battles[y] = await call(`/api/screen/task/battle?year=${y}`);
  say(`battle ${y}: ${(out.views.battles[y].list || []).length} rows`);
}

for (const [k, p] of [
  ['warehouse', '/api/warehouse/overview'],
  ['mobileHome', '/api/mobile/home'],
  ['health', '/api/system/health'],
  ['indicator', '/api/monitor/indicator'],
  ['problem', '/api/monitor/problem'],
]) {
  out.views[k] = await call(p);
  say(`${k} ok`);
}
delete out.views.mobileHome.user;
delete out.views.health.db;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
const json = JSON.stringify(out);
fs.writeFileSync(OUT, json, 'utf8');

/* ---------- 3. 同步功能规格（同一份定义，避免前后端两套口径） ---------- */
const SPEC_SRC = path.join(ROOT, 'server', 'src', 'features.js');
const SPEC_OUT = path.join(ROOT, 'web', 'src', 'demo', 'spec.js');
fs.writeFileSync(
  SPEC_OUT,
  '/* 此文件由 scripts/export-snapshot.mjs 从 server/src/features.js 自动复制，请勿手工修改 */\n' +
    fs.readFileSync(SPEC_SRC, 'utf8'),
  'utf8'
);

console.log(`tables=${tables.length} rows=${rowsTotal} size=${(json.length / 1024 / 1024).toFixed(2)}MB -> ${OUT}`);
