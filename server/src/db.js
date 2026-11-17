import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.resolve(__dirname, '../data');
export const DB_FILE = process.env.KQ_DB || path.join(DATA_DIR, 'kuangquan.db');

fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(DB_FILE);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = OFF;');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS region (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  level INTEGER NOT NULL,
  parent TEXT,
  short TEXT,
  center_lon REAL,
  center_lat REAL
);

CREATE TABLE IF NOT EXISTS sys_user (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  org TEXT NOT NULL,
  role TEXT NOT NULL,
  title TEXT,
  region_code TEXT,
  region_name TEXT,
  phone TEXT,
  email TEXT,
  status TEXT DEFAULT '正常',
  last_login TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS mine (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  enterprise TEXT,
  right_holder TEXT,
  econ_type TEXT,
  area_km2 REAL,
  license_no TEXT,
  mineral TEXT,
  valid_from TEXT,
  valid_to TEXT,
  region_code TEXT,
  region_name TEXT,
  city_code TEXT,
  city_name TEXT,
  status TEXT,
  scale TEXT,
  green_level TEXT,
  digital_level TEXT,
  smart_level TEXT,
  mine_type TEXT,
  devices_total INTEGER DEFAULT 0,
  devices_online INTEGER DEFAULT 0,
  video_connected INTEGER DEFAULT 0,
  monitor_connected INTEGER DEFAULT 0,
  warn_connected INTEGER DEFAULT 0,
  lon REAL,
  lat REAL,
  address TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS mineral_deposit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT,
  name TEXT NOT NULL,
  region_code TEXT,
  region_name TEXT,
  city_code TEXT,
  mineral TEXT,
  stage TEXT,
  scale TEXT,
  area REAL,
  reserve_t REAL,
  degree TEXT,
  coord TEXT,
  lon REAL,
  lat REAL,
  owner TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS mining_right (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  license_no TEXT NOT NULL,
  right_type TEXT NOT NULL,
  mine_name TEXT,
  holder TEXT,
  mineral TEXT,
  area REAL,
  region_code TEXT,
  region_name TEXT,
  city_code TEXT,
  valid_from TEXT,
  valid_to TEXT,
  issue_date TEXT,
  status TEXT,
  method TEXT,
  price REAL,
  gdp_type TEXT,
  scale TEXT,
  lon REAL,
  lat REAL,
  mine_id INTEGER,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS plan_zone (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT,
  name TEXT,
  zone_type TEXT,
  region_code TEXT,
  region_name TEXT,
  mineral TEXT,
  area REAL,
  reserve_t REAL,
  level TEXT,
  version TEXT,
  status TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS plan_indicator (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  region_code TEXT,
  region_name TEXT,
  level TEXT,
  name TEXT,
  category TEXT,
  unit TEXT,
  target REAL,
  actual REAL,
  year INTEGER,
  warn TEXT
);

CREATE TABLE IF NOT EXISTS reserve_review (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  review_no TEXT,
  mine_name TEXT,
  applicant TEXT,
  mineral TEXT,
  region_code TEXT,
  region_name TEXT,
  report_name TEXT,
  reserve_t REAL,
  grade TEXT,
  submit_at TEXT,
  accept_at TEXT,
  record_at TEXT,
  status TEXT,
  expert TEXT,
  opinion TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS green_apply (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mine_id INTEGER,
  mine_name TEXT,
  region_code TEXT,
  region_name TEXT,
  apply_level TEXT,
  year INTEGER,
  stage TEXT,
  score_env REAL,
  score_develop REAL,
  score_utilize REAL,
  score_energy REAL,
  score_tech REAL,
  score_manage REAL,
  total_score REAL,
  weak_items TEXT,
  submit_at TEXT,
  audit_at TEXT,
  auditor TEXT,
  remark TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS green_out (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mine_id INTEGER,
  mine_name TEXT,
  out_type TEXT,
  reason TEXT,
  trigger_rule TEXT,
  apply_by TEXT,
  verify_by TEXT,
  status TEXT,
  occurred_at TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS device (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT,
  name TEXT,
  device_type TEXT,
  category TEXT,
  mine_id INTEGER,
  mine_name TEXT,
  region_code TEXT,
  lon REAL,
  lat REAL,
  status TEXT,
  online INTEGER DEFAULT 1,
  last_heartbeat TEXT,
  threshold TEXT,
  unit TEXT,
  value REAL,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS alert (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alert_no TEXT,
  kind TEXT,
  level TEXT,
  source TEXT,
  mine_id INTEGER,
  mine_name TEXT,
  region_code TEXT,
  region_name TEXT,
  content TEXT,
  value REAL,
  threshold REAL,
  status TEXT,
  occurred_at TEXT,
  handled_at TEXT,
  handler TEXT,
  order_id INTEGER
);

CREATE TABLE IF NOT EXISTS work_order (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no TEXT,
  source TEXT,
  category TEXT,
  title TEXT,
  mine_id INTEGER,
  mine_name TEXT,
  region_code TEXT,
  region_name TEXT,
  level TEXT,
  status TEXT,
  assignee TEXT,
  dept TEXT,
  found_at TEXT,
  due_at TEXT,
  closed_at TEXT,
  overdue INTEGER DEFAULT 0,
  timeline TEXT,
  content TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS patrol_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_name TEXT,
  grid TEXT,
  mine_id INTEGER,
  mine_name TEXT,
  region_code TEXT,
  inspector TEXT,
  sign_at TEXT,
  lon REAL,
  lat REAL,
  photos INTEGER DEFAULT 0,
  finding TEXT,
  result TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS credit_record (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mine_id INTEGER,
  mine_name TEXT,
  region_code TEXT,
  region_name TEXT,
  score REAL,
  level TEXT,
  punish_count INTEGER,
  abnormal INTEGER,
  year INTEGER,
  list_type TEXT,
  detail TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS gov_project (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT,
  name TEXT,
  category TEXT,
  region_code TEXT,
  region_name TEXT,
  owner TEXT,
  budget REAL,
  paid REAL,
  start_at TEXT,
  end_at TEXT,
  status TEXT,
  progress INTEGER,
  nodes TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS geo_project (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT,
  name TEXT,
  category TEXT,
  region_code TEXT,
  region_name TEXT,
  unit TEXT,
  leader TEXT,
  budget REAL,
  start_at TEXT,
  end_at TEXT,
  status TEXT,
  progress INTEGER,
  target TEXT,
  reserve_add REAL,
  drill_holes INTEGER,
  drill_meters REAL,
  anomaly TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS hazard_point (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT,
  name TEXT,
  type TEXT,
  region_code TEXT,
  region_name TEXT,
  level TEXT,
  threat_people INTEGER,
  threat_asset REAL,
  monitor_device INTEGER,
  device_online INTEGER,
  status TEXT,
  lon REAL,
  lat REAL,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS agri_plot (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT,
  name TEXT,
  region_code TEXT,
  region_name TEXT,
  area REAL,
  selenium REAL,
  zinc REAL,
  ph REAL,
  cadmium REAL,
  level TEXT,
  crop TEXT,
  risk TEXT,
  lon REAL,
  lat REAL
);

CREATE TABLE IF NOT EXISTS geo_culture (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT,
  name TEXT,
  type TEXT,
  region_code TEXT,
  region_name TEXT,
  level TEXT,
  status TEXT,
  progress INTEGER,
  points INTEGER,
  route TEXT,
  lon REAL,
  lat REAL,
  intro TEXT
);

CREATE TABLE IF NOT EXISTS org_unit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT,
  name TEXT,
  unit_type TEXT,
  region_code TEXT,
  region_name TEXT,
  qualification TEXT,
  staff INTEGER,
  senior INTEGER,
  equipment INTEGER,
  credit_score REAL,
  project_count INTEGER,
  status TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS battle_task (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER,
  category TEXT,
  seq INTEGER,
  content TEXT,
  outcome TEXT,
  deadline TEXT,
  dept TEXT,
  support_dept TEXT,
  q1 TEXT,
  q2 TEXT,
  q3 TEXT,
  q4 TEXT,
  status TEXT
);

CREATE TABLE IF NOT EXISTS biz_record (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feature TEXT NOT NULL,
  code TEXT,
  title TEXT,
  status TEXT,
  stage TEXT,
  region_code TEXT,
  region_name TEXT,
  mineral TEXT,
  applicant TEXT,
  dept TEXT,
  amount REAL,
  qty REAL,
  occur_at TEXT,
  due_at TEXT,
  level TEXT,
  remark TEXT,
  payload TEXT,
  history TEXT,
  created_by TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT,
  name TEXT,
  action TEXT,
  target TEXT,
  detail TEXT,
  ip TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS data_catalog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic TEXT,
  name TEXT,
  category TEXT,
  source TEXT,
  rows INTEGER,
  unit TEXT,
  updated_at TEXT,
  fields TEXT
);

CREATE TABLE IF NOT EXISTS sys_dict (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT,
  code TEXT,
  name TEXT,
  sort INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS data_asset (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic TEXT,
  name TEXT,
  file_type TEXT,
  size_kb INTEGER,
  source TEXT,
  year INTEGER,
  region_name TEXT,
  uploaded_at TEXT,
  meta TEXT
);
`;

export function initSchema() {
  db.exec(SCHEMA);
}

export function all(sql, params = []) {
  return db.prepare(sql).all(...params);
}
export function get(sql, params = []) {
  return db.prepare(sql).get(...params);
}
export function run(sql, params = []) {
  return db.prepare(sql).run(...params);
}

/** 用对象插入，避免手写占位符数量出错 */
export function insertRow(table, obj) {
  const keys = Object.keys(obj);
  const sql = `INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`;
  return db.prepare(sql).run(...keys.map((k) => obj[k]));
}

export function tableCount(table) {
  const r = db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get();
  return r ? Number(r.c) : 0;
}

export function resetDatabase() {
  const tables = all(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`);
  db.exec('PRAGMA writable_schema = ON;');
  for (const t of tables) {
    db.exec(`DROP TABLE IF EXISTS ${t.name};`);
  }
  db.exec('PRAGMA writable_schema = OFF;');
  initSchema();
}
