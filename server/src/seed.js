/**
 * 演示数据生成器。
 * 说明：本项目不含真实业务数据，以下数据均为按行业口径构造的演示数据，
 * 用于验证功能设计文档中每个功能点的完整操作链路。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, resetDatabase, run, insertRow, tableCount } from './db.js';
import { hashPassword } from './auth.js';
import { ALL_FEATURES } from './features.js';
import { makeRandom, rndInt, rndFloat, pick, nowStr, today } from './util.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW = path.resolve(__dirname, '../data/geo-raw-sc');
const rnd = makeRandom(20241121);

/* ------------------------------------------------------------------ 行政区划 */
function loadRegions() {
  const provinceGeo = JSON.parse(fs.readFileSync(path.join(RAW, '510000_full.json'), 'utf8'));
  const cities = provinceGeo.features.map((f) => ({ code: String(f.properties.adcode), name: f.properties.name, center: f.properties.center }));
  const counties = {};
  for (const c of cities) {
    const file = path.join(RAW, `${c.code}_full.json`);
    if (!fs.existsSync(file)) continue;
    const geo = JSON.parse(fs.readFileSync(file, 'utf8'));
    counties[c.code] = geo.features.map((f) => ({ code: String(f.properties.adcode), name: f.properties.name, center: f.properties.center || c.center }));
  }
  return { cities, counties };
}
const { cities, counties } = loadRegions();
const shortName = (n) => n.replace(/(市|县|区|自治县|自治州)$/u, '');

/* ------------------------------------------------------------------ 词典 */
const MINERALS = ['石灰岩', '溶剂用灰岩', '方解石', '萤石', '叶蜡石', '建筑用石料', '建筑用砂', '花岗岩', '玄武岩', '膨润土', '高岭土', '硅灰石', '石英砂岩', '地热', '矿泉水', '金', '银', '铜', '铅', '锌', '钼'];
const ECON_TYPES = ['有限责任公司', '股份有限公司', '国有企业', '集体企业', '私营企业', '外商投资企业'];
const SCALES = ['大型', '中型', '小型'];
const STAGES = ['待查', '在查', '查明', '规划'];
const DEGREES = ['普查', '详查', '勘探'];
const PLACE_WORDS = ['白象', '梅溪', '石淙', '大岗山', '老虎塘', '冷山', '石门', '凤凰', '龙溪', '青山', '金鸡', '双溪', '南湖', '杨岭', '里岙', '高桥', '沙蟹岭', '万山', '云顶', '龙潭', '石塘', '尖山', '杨梅', '百丈', '鹤顶', '宝岭', '乌石', '花桥', '黄阳'];
const ORG_SUFFIX = ['矿有限公司', '矿业有限公司', '石矿有限公司', '建材有限公司', '矿业开发有限公司', '采石场', '新材料有限公司'];
const CITY_DEPT = {
  510100: '成都市自然资源和规划局',
  510300: '自贡市自然资源和规划局',
  510400: '攀枝花市自然资源和规划局',
  510500: '泸州市自然资源和规划局',
  510600: '德阳市自然资源和规划局',
  510700: '绵阳市自然资源和规划局',
  510800: '广元市自然资源和规划局',
  510900: '遂宁市自然资源和规划局',
  511000: '内江市自然资源和规划局',
  511100: '乐山市自然资源和规划局',
  511300: '南充市自然资源和规划局',
  511400: '眉山市自然资源和规划局',
  511500: '宜宾市自然资源和规划局',
  511600: '广安市自然资源和规划局',
  511700: '达州市自然资源和规划局',
  511800: '雅安市自然资源和规划局',
  511900: '巴中市自然资源和规划局',
  512000: '资阳市自然资源和规划局',
  513200: '阿坝藏族羌族自治州自然资源和规划局',
  513300: '甘孜藏族自治州自然资源和规划局',
  513400: '凉山彝族自治州自然资源和规划局'
};

/* ------------------------------------------------------------------ 工具 */
function licenseNo(date, idx) {
  return `C510000${date.replace(/-/g, '')}${String(20000 + idx).slice(-5)}`;
}
function randDate(y1, y2) {
  const y = rndInt(rnd, y1, y2);
  return `${y}-${String(rndInt(rnd, 1, 12)).padStart(2, '0')}-${String(rndInt(rnd, 1, 28)).padStart(2, '0')}`;
}
function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function jitter(center, scale = 0.35) {
  const [lon, lat] = center || [PROVINCE.lon, PROVINCE.lat];
  return [Number((lon + (rnd() - 0.5) * scale).toFixed(5)), Number((lat + (rnd() - 0.5) * scale).toFixed(5))];
}
const PROVINCE = { code: '510000', name: '四川省', short: '四川', lon: 104.0657, lat: 30.6595 };

/* ------------------------------------------------------------------ 各类数据 */
function seedRegions() {
  insertRow('region', { code: PROVINCE.code, name: PROVINCE.name, level: 1, parent: null, short: '四川', center_lon: PROVINCE.lon, center_lat: PROVINCE.lat });
  for (const c of cities) {
    insertRow('region', { code: c.code, name: c.name, level: 2, parent: PROVINCE.code, short: shortName(c.name), center_lon: c.center?.[0] ?? PROVINCE.lon, center_lat: c.center?.[1] ?? PROVINCE.lat });
    for (const t of counties[c.code] || []) {
      insertRow('region', { code: t.code, name: t.name, level: 3, parent: c.code, short: shortName(t.name), center_lon: t.center?.[0] ?? c.center?.[0], center_lat: t.center?.[1] ?? c.center?.[1] });
    }
  }
}

function seedUsers() {
  const users = [
    { username: 'admin', password: 'admin123', name: '赵丹蕾', org: '成都市规划和自然资源局', role: 'admin', title: '系统管理员', region_code: '510100', region_name: '成都市' },
    { username: 'province', password: '123456', name: '陈嘉禾', org: '四川省自然资源厅', role: 'province', title: '矿业权管理处处长', region_code: '510000', region_name: '四川省' },
    { username: 'city', password: '123456', name: '沈立群', org: '成都市规划和自然资源局', role: 'city', title: '地质勘查与矿产资源管理科科长', region_code: '510100', region_name: '成都市' },
    { username: 'county', password: '123456', name: '王永祥', org: '彭州市自然资源和规划局', role: 'county', title: '矿产资源管理科科员', region_code: '510182', region_name: '彭州市' },
    { username: 'enterprise', password: '123456', name: '李国强', org: '四川省彭州市白象硅灰石矿有限公司', role: 'enterprise', title: '矿长', region_code: '510182', region_name: '彭州市' },
    { username: 'public', password: '123456', name: '社会公众', org: '公众访问', role: 'public', title: '访客', region_code: '510000', region_name: '四川省' }
  ];
  for (const u of users) {
    insertRow('sys_user', {
      username: u.username, password: hashPassword(u.password), name: u.name, org: u.org, role: u.role, title: u.title,
      region_code: u.region_code, region_name: u.region_name, phone: `13${rndInt(rnd, 100000000, 999999999)}`,
      email: `${u.username}@sc.gov.example`, status: '正常', created_at: nowStr()
    });
  }
  const names = ['周敏', '吴建平', '徐红梅', '郑海涛', '钱伟民', '孙丽华', '刘海峰', '张建国', '黄文斌', '许志强', '何晓东'];
  cities.forEach((c, i) => {
    insertRow('sys_user', {
      username: `city${c.code.slice(2, 4)}`, password: hashPassword('123456'), name: names[i] || '管理员',
      org: CITY_DEPT[c.code] || `${c.name}自然资源和规划局`, role: 'city', title: '矿产资源管理科科长',
      region_code: c.code, region_name: c.name, phone: `13${rndInt(rnd, 100000000, 999999999)}`,
      email: `city${c.code.slice(2, 4)}@sc.gov.example`, status: '正常', created_at: nowStr()
    });
  });
}

function seedMines() {
  const rows = [];
  let idx = 0;
  const push = (t, c) => {
    idx += 1;
    const mineral = pick(rnd, MINERALS);
    const short = shortName(t.name);
    const name = `四川省${shortName(c.name)}${short}${pick(rnd, PLACE_WORDS)}${mineral.replace(/用|岩$/, '')}${pick(rnd, ORG_SUFFIX)}`;
    const [lon, lat] = jitter(t.center, 0.22);
    const gr = rnd();
    const greenLevel = gr < 0.18 ? '国家级' : gr < 0.4 ? '省级' : gr < 0.55 ? '市级' : '未入库';
    const totalDev = rndInt(rnd, 3, 18);
    const validFrom = randDate(2015, 2023);
    rows.push({
      id: idx, name, enterprise: name, right_holder: name, econ_type: pick(rnd, ECON_TYPES),
      area_km2: rndFloat(rnd, 0.08, 3.6, 4), license_no: licenseNo(validFrom, idx), mineral,
      valid_from: validFrom, valid_to: addDays(validFrom, rndInt(rnd, 1095, 4380)),
      region_code: t.code, region_name: t.name, city_code: c.code, city_name: c.name,
      status: rnd() < 0.06 ? '停产' : rnd() < 0.04 ? '关闭' : rnd() < 0.05 ? '在建' : '生产中',
      scale: pick(rnd, SCALES), green_level: greenLevel,
      digital_level: greenLevel !== '未入库' && rnd() < 0.55 ? pick(rnd, ['数字矿山', '数字矿山试点']) : '—',
      smart_level: greenLevel === '国家级' && rnd() < 0.5 ? '智能矿山' : rnd() < 0.15 ? '智能矿山试点' : '—',
      mine_type: pick(rnd, ['露天开采', '地下开采', '露天/地下联合开采']),
      devices_total: totalDev, devices_online: Math.max(0, totalDev - rndInt(rnd, 0, 4)),
      video_connected: rnd() < 0.85 ? 1 : 0, monitor_connected: rnd() < 0.78 ? 1 : 0, warn_connected: rnd() < 0.6 ? 1 : 0,
      lon, lat, address: `${c.name}${t.name}${pick(rnd, PLACE_WORDS)}村`, created_at: nowStr()
    });
  };
  for (const c of cities) for (const t of counties[c.code] || []) { const n = rndInt(rnd, 1, 4); for (let i = 0; i < n; i++) push(t, c); }
  rows.forEach((r) => insertRow('mine', r));
  return rows;
}

function seedDeposits() {
  let id = 0;
  const push = (t, c) => {
    id += 1;
    const mineral = pick(rnd, MINERALS);
    const [lon, lat] = jitter(t.center, 0.3);
    insertRow('mineral_deposit', {
      code: `KC${c.code}${String(id).padStart(4, '0')}`, name: `${t.name}${pick(rnd, PLACE_WORDS)}${mineral}矿区`,
      region_code: t.code, region_name: t.name, city_code: c.code, mineral,
      stage: rnd() < 0.12 ? '待查' : rnd() < 0.34 ? '在查' : rnd() < 0.88 ? '查明' : '规划',
      scale: pick(rnd, SCALES), area: rndFloat(rnd, 0.2, 12, 4), reserve_t: rndFloat(rnd, 55, 26000, 2),
      degree: pick(rnd, DEGREES), coord: null, lon, lat, owner: `${t.name}自然资源和规划局`, updated_at: randDate(2020, 2024)
    });
  };
  for (const c of cities) for (const t of counties[c.code] || []) { const n = rndInt(rnd, 1, 3); for (let i = 0; i < n; i++) push(t, c); }
  while (id < 260) { const c = pick(rnd, cities); push(pick(rnd, counties[c.code] || []), c); }
}

function seedRights(mines) {
  const methods = ['招标出让', '拍卖出让', '挂牌出让', '协议出让', '探矿权转采矿权', '新立申请', '延续登记'];
  for (const m of mines) {
    insertRow('mining_right', {
      license_no: m.license_no, right_type: '采矿权', mine_name: m.name, holder: m.right_holder, mineral: m.mineral,
      area: m.area_km2, region_code: m.region_code, region_name: m.region_name, city_code: m.city_code,
      valid_from: m.valid_from, valid_to: m.valid_to, issue_date: m.valid_from,
      status: m.status === '关闭' ? '已注销' : m.valid_to < today() ? '已过期' : '有效',
      method: pick(rnd, methods), price: rndFloat(rnd, 300, 46000, 2), gdp_type: m.econ_type, scale: m.scale,
      lon: m.lon, lat: m.lat, mine_id: m.id, created_at: nowStr()
    });
    if (rnd() < 0.32) {
      insertRow('mining_right', {
        license_no: `T${m.license_no.slice(1)}`, right_type: '探矿权',
        mine_name: `${m.region_name}${pick(rnd, PLACE_WORDS)}${m.mineral}勘查区`, holder: `${m.region_name}地质勘查院`,
        mineral: m.mineral, area: rndFloat(rnd, 1, 24, 3), region_code: m.region_code, region_name: m.region_name,
        city_code: m.city_code, valid_from: m.valid_from, valid_to: m.valid_to, issue_date: m.valid_from,
        status: m.valid_to < today() ? '已过期' : '有效', method: pick(rnd, methods), price: rndFloat(rnd, 60, 8600, 2),
        gdp_type: m.econ_type, scale: m.scale, lon: m.lon, lat: m.lat, mine_id: null, created_at: nowStr()
      });
    }
  }
}

function seedPlan() {
  const zoneTypes = ['重点勘查区', '重点开采区', '砂石土料集中开采区'];
  let id = 0;
  for (const lv of ['省', '市', '县']) {
    const pool = lv === '省' ? cities : cities.flatMap((c) => (counties[c.code] || []).map((t) => ({ ...t, cityName: c.name })));
    for (const r of pool) {
      const n = lv === '省' ? 4 : lv === '市' ? 2 : 1;
      for (let i = 0; i < n; i++) {
        id += 1;
        const type = pick(rnd, zoneTypes);
        insertRow('plan_zone', {
          code: `GH${lv}${String(id).padStart(4, '0')}`, name: `${r.name}${pick(rnd, PLACE_WORDS)}${type}`, zone_type: type,
          region_code: r.code, region_name: r.name, mineral: pick(rnd, MINERALS), area: rndFloat(rnd, 1, 68, 2),
          reserve_t: rndFloat(rnd, 400, 42000, 2), level: lv, version: pick(rnd, ['2021-2025', '2021-2025（调整版）']),
          status: rnd() < 0.9 ? '现行有效' : '已废止', updated_at: randDate(2022, 2024)
        });
      }
    }
  }
  const indicators = [
    { name: '矿山总数控制上限', category: '约束性', unit: '个', base: 900 },
    { name: '大中型矿山比例', category: '约束性', unit: '%', base: 45 },
    { name: '绿色矿山建成率', category: '预期性', unit: '%', base: 70 },
    { name: '砂石土料产能控制指标', category: '约束性', unit: '万吨/年', base: 26000 },
    { name: '采矿权出让收益', category: '预期性', unit: '亿元', base: 42 },
    { name: '矿山生态修复治理率', category: '约束性', unit: '%', base: 92 }
  ];
  for (const r of [PROVINCE, ...cities]) {
    for (const ind of indicators) {
      const target = Number((ind.base * (r.code === '510000' ? 1 : rndFloat(rnd, 0.06, 0.16, 3))).toFixed(1));
      const actual = Number((target * rndFloat(rnd, 0.72, 1.06, 3)).toFixed(1));
      const p = target ? actual / target : 0;
      insertRow('plan_indicator', {
        region_code: r.code, region_name: r.name, level: r.code === '510000' ? '省' : '市', name: ind.name,
        category: ind.category, unit: ind.unit, target, actual, year: 2024,
        warn: p >= 1.02 ? '红牌' : p >= 0.95 ? '黄牌' : '正常'
      });
    }
  }
}

function seedReviews(mines) {
  mines.slice(0, 90).forEach((m, i) => {
    const submit = randDate(2023, 2024);
    const status = pick(rnd, ['待受理', '已受理', '专家评审', '已备案', '已备案', '已备案']);
    insertRow('reserve_review', {
      review_no: `川储备〔${submit.slice(0, 4)}〕${String(100 + i).padStart(3, '0')}号`, mine_name: m.name,
      applicant: m.enterprise, mineral: m.mineral, region_code: m.region_code, region_name: m.region_name,
      report_name: `${m.name}储量核实报告`, reserve_t: rndFloat(rnd, 120, 8600, 2),
      grade: rnd() < 0.5 ? '大型' : rnd() < 0.8 ? '中型' : '小型', submit_at: submit,
      accept_at: status === '待受理' ? null : addDays(submit, rndInt(rnd, 2, 15)),
      record_at: status === '已备案' ? addDays(submit, rndInt(rnd, 20, 120)) : null, status,
      expert: pick(rnd, ['张工', '李工', '王工', '陈工']),
      opinion: status === '已备案' ? '报告符合规范要求，同意备案。' : '评审中', created_at: nowStr()
    });
  });
}

function seedGreen(mines) {
  mines.filter((m) => m.green_level !== '未入库').slice(0, 70).forEach((m) => {
    const submit = randDate(2022, 2024);
    const stage = pick(rnd, ['企业自评', '县级初审', '市级核查', '省级公示', '已入库', '已入库', '已入库']);
    const s = () => rndFloat(rnd, 62, 98, 1);
    const scores = [s(), s(), s(), s(), s(), s()];
    const total = Number((scores.reduce((a, b) => a + b, 0) / 6).toFixed(1));
    const names = ['矿区环境', '资源开发方式', '资源综合利用', '节能减排', '科技创新与智能矿山', '企业管理与形象'];
    const weak = scores.map((v, k) => ({ v, k })).filter((x) => x.v < 78).map((x) => names[x.k]);
    insertRow('green_apply', {
      mine_id: m.id, mine_name: m.name, region_code: m.region_code, region_name: m.region_name,
      apply_level: m.green_level, year: 2024, stage,
      score_env: scores[0], score_develop: scores[1], score_utilize: scores[2], score_energy: scores[3],
      score_tech: scores[4], score_manage: scores[5], total_score: total, weak_items: weak.join('、') || '无',
      submit_at: submit, audit_at: stage === '已入库' ? addDays(submit, rndInt(rnd, 30, 150)) : null,
      auditor: '省自然资源厅矿业权处',
      remark: total >= 85 ? '各项指标达标，建议入库。' : '存在短板项，建议整改后复核。', created_at: nowStr()
    });
  });
  const rules = ['发生较大以上生产安全事件', '采矿许可证过期注销', '整改逾期未达标', '严重违法违规被行政处罚', '突发环境事件'];
  for (let i = 0; i < 18; i++) {
    const m = pick(rnd, mines);
    const type = rnd() < 0.6 ? '自动出库' : '手动出库';
    insertRow('green_out', {
      mine_id: m.id, mine_name: m.name, out_type: type, reason: pick(rnd, rules),
      trigger_rule: type === '自动出库' ? pick(rnd, rules) : '依规核查后移出',
      apply_by: `${m.region_name}自然资源和规划局`, verify_by: '省自然资源厅',
      status: pick(rnd, ['出库预警', '核查中', '已出库', '已出库']), occurred_at: randDate(2023, 2024), created_at: nowStr()
    });
  }
}

function seedDevices(mines) {
  const types = [
    ['视频监控', '视频监控', '路'], ['粉尘在线监测', '环境监测', 'mg/m³'], ['噪声在线监测', '环境监测', 'dB'],
    ['边坡位移监测', '安全监测', 'mm'], ['钻机GPS定位', '位置监测', '-'], ['地磅产量计量', '产量监测', 't'],
    ['GNSS位移', '安全监测', 'mm'], ['雨量计', '环境监测', 'mm'], ['地下水位计', '水文监测', 'm'], ['倾角传感器', '安全监测', '°']
  ];
  let id = 0;
  for (const m of mines) {
    const n = Math.max(2, Math.min(6, Math.round(m.devices_total / 3)));
    for (let i = 0; i < n; i++) {
      id += 1;
      const [type, category, unit] = pick(rnd, types);
      const online = rnd() < 0.86 ? 1 : 0;
      insertRow('device', {
        code: `SB${String(id).padStart(6, '0')}`, name: `${m.region_name}${type}${String(i + 1).padStart(2, '0')}`,
        device_type: type, category, mine_id: m.id, mine_name: m.name, region_code: m.region_code,
        lon: m.lon, lat: m.lat, status: online ? '在线' : '离线', online, last_heartbeat: nowStr(),
        threshold: type === '粉尘在线监测' ? '1.0' : '—', unit,
        value: type === '粉尘在线监测' ? rndFloat(rnd, 0.2, 3.6, 2) : rndFloat(rnd, 1, 240, 2), updated_at: nowStr()
      });
    }
  }
  for (let i = 0; i < 12; i++) {
    const m = pick(rnd, mines);
    id += 1;
    insertRow('device', {
      code: `SB${String(id).padStart(6, '0')}`,
      name: `${m.region_name}${i % 2 === 0 ? '地热水位水质监测' : '矿泉水水量水温监测'}`,
      device_type: i % 2 === 0 ? '地热水位计' : '矿泉水监测仪', category: '地热矿泉监测',
      mine_id: m.id, mine_name: m.name, region_code: m.region_code, lon: m.lon, lat: m.lat,
      status: '在线', online: 1, last_heartbeat: nowStr(), threshold: '—',
      unit: i % 2 === 0 ? 'm' : '℃', value: rndFloat(rnd, 8, 62, 1), updated_at: nowStr()
    });
  }
}

function seedAlerts(mines) {
  const kinds = [
    ['卫星遥感变化图斑', '卫星遥感'], ['越界开采电子围栏', '电子围栏'], ['视频AI-未佩戴安全帽', '视频AI'],
    ['视频AI-违规作业', '视频AI'], ['视频AI-夜间盗采', '视频AI'], ['设备离线超时', '状态报警'],
    ['粉尘浓度超标', '监测指标'], ['噪声超标', '监测指标'], ['边坡位移超限', '监测指标'], ['地热水位超采', '监测指标']
  ];
  for (let i = 0; i < 120; i++) {
    const m = pick(rnd, mines);
    const [kind, source] = pick(rnd, kinds);
    const status = pick(rnd, ['待核实', '已派单', '整改中', '已销号', '已销号']);
    const occurred = randDate(2024, 2024);
    insertRow('alert', {
      alert_no: `YJ${String(20240000 + i).padStart(8, '0')}`, kind, level: pick(rnd, ['一级', '二级', '三级']), source,
      mine_id: m.id, mine_name: m.name, region_code: m.region_code, region_name: m.region_name,
      content: `${m.name}触发${kind}预警`, value: rndFloat(rnd, 1, 200, 2), threshold: rndFloat(rnd, 0.5, 120, 2),
      status, occurred_at: occurred, handled_at: status === '已销号' ? addDays(occurred, rndInt(rnd, 1, 20)) : null,
      handler: status === '已销号' ? '执法队' : null, order_id: null
    });
  }
}

function seedOrders(mines) {
  const cats = ['疑似越界开采', '疑似夜间盗采', '粉尘排放异常', '设备离线超时', '未戴安全帽作业', '边坡位移异常', '生态修复滞后', '越界堆放'];
  for (let i = 0; i < 90; i++) {
    const m = pick(rnd, mines);
    const found = randDate(2024, 2024);
    const due = addDays(found, rndInt(rnd, 15, 60));
    const status = pick(rnd, ['待分派', '现场核实', '整改落实', '复核销号', '复核销号']);
    const cat = pick(rnd, cats);
    insertRow('work_order', {
      order_no: `GD${String(20240000 + i).padStart(8, '0')}`,
      source: pick(rnd, ['智能巡查', '日常巡查', '群众举报', '上级交办']), category: cat,
      title: `${m.name}${cat}核查工单`, mine_id: m.id, mine_name: m.name, region_code: m.region_code,
      region_name: m.region_name, level: pick(rnd, ['一级', '二级', '三级']), status,
      assignee: pick(rnd, ['王队', '李队', '张队', '陈队']), dept: `${m.region_name}自然资源行政执法队`,
      found_at: found, due_at: due, closed_at: status === '复核销号' ? addDays(found, rndInt(rnd, 5, 40)) : null,
      overdue: status !== '复核销号' && due < today() ? 1 : 0,
      timeline: JSON.stringify([{ step: '发现', at: found }, { step: '分派', at: addDays(found, 1) }]),
      content: `${m.name}存在${cat}情形，需现场核实。`, created_at: nowStr()
    });
  }
}

function seedPatrol(mines) {
  for (let i = 0; i < 200; i++) {
    const m = pick(rnd, mines);
    const sign = randDate(2024, 2024);
    insertRow('patrol_log', {
      plan_name: `${m.city_name}${['一季度', '二季度', '三季度', '四季度'][rndInt(rnd, 0, 3)]}网格化巡查计划`,
      grid: `${m.region_name}第${rndInt(rnd, 1, 6)}网格`, mine_id: m.id, mine_name: m.name, region_code: m.region_code,
      inspector: pick(rnd, ['王永祥', '沈立群', '李国强', '陈嘉禾', '赵丹蕾']),
      sign_at: `${sign} 09:${String(rndInt(rnd, 10, 59)).padStart(2, '0')}`,
      lon: m.lon, lat: m.lat, photos: rndInt(rnd, 2, 9),
      finding: pick(rnd, ['现场规范开采，无异常。', '发现堆料场覆盖不到位，已现场督促整改。', '界桩完好，无越界迹象。', '运输道路扬尘较大，要求增加洒水频次。']),
      result: pick(rnd, ['正常', '正常', '发现问题已整改', '待复查']), created_at: nowStr()
    });
  }
}

function seedCredit(mines) {
  mines.slice(0, 120).forEach((m) => {
    const punish = rnd() < 0.25 ? rndInt(rnd, 1, 3) : 0;
    const abnormal = rnd() < 0.12 ? 1 : 0;
    const score = Math.max(45, Math.min(100, 100 - punish * 8 - abnormal * 15 + rndFloat(rnd, -6, 6, 1)));
    const level = score >= 90 ? 'A' : score >= 78 ? 'B' : score >= 65 ? 'C' : 'D';
    insertRow('credit_record', {
      mine_id: m.id, mine_name: m.name, region_code: m.region_code, region_name: m.region_name,
      score: Number(score.toFixed(1)), level, punish_count: punish, abnormal, year: 2024,
      list_type: score >= 90 ? '红名单' : level === 'D' ? '黑名单' : '一般',
      detail: `行政处罚 ${punish} 次；异常名录 ${abnormal ? '在列' : '未列入'}；绿色矿山评价：${m.green_level}。`, updated_at: nowStr()
    });
  });
}

function seedProjects(mines) {
  const cats = ['矿山生态修复工程', '地质灾害治理工程', '绿色矿山重点建设项目'];
  for (let i = 0; i < 60; i++) {
    const m = pick(rnd, mines);
    const budget = rndFloat(rnd, 80, 6800, 2);
    const progress = rndInt(rnd, 5, 100);
    insertRow('gov_project', {
      code: `GC${String(2024000 + i)}`, name: `${m.region_name}${pick(rnd, PLACE_WORDS)}${pick(rnd, cats)}`,
      category: pick(rnd, cats), region_code: m.region_code, region_name: m.region_name,
      owner: `${m.region_name}自然资源和规划局`, budget, paid: Number(((budget * progress) / 100).toFixed(2)),
      start_at: randDate(2022, 2024), end_at: randDate(2024, 2026),
      status: progress >= 100 ? '已验收' : progress > 60 ? '施工中' : progress > 5 ? '在建' : '立项', progress,
      nodes: JSON.stringify([{ node: '立项批复', done: true }, { node: '施工进度', done: progress > 30 }, { node: '资金拨付', done: progress > 50 }, { node: '竣工验收', done: progress >= 100 }]),
      created_at: nowStr()
    });
  }
}

function seedGeo() {
  const cats = ['攻深找盲扩能', '农业地质调查', '地质灾害防治', '基础地质调查'];
  const units = ['四川省地质调查研究院', '四川省地质矿产勘查开发局', '四川省煤田地质局', '四川省核工业地质局'];
  for (let i = 0; i < 48; i++) {
    const c = pick(rnd, cities);
    const t = pick(rnd, counties[c.code] || [{ code: c.code, name: c.name }]);
    const progress = rndInt(rnd, 10, 100);
    insertRow('geo_project', {
      code: `DK${String(2024000 + i)}`,
      name: `${t.name}${pick(rnd, PLACE_WORDS)}${pick(rnd, ['深部找矿', '外围找矿', '成矿带勘查', '富硒土地调查'])}`,
      category: pick(rnd, cats), region_code: t.code, region_name: t.name, unit: pick(rnd, units),
      leader: pick(rnd, ['张工', '李工', '王工']), budget: rndFloat(rnd, 120, 3600, 2),
      start_at: randDate(2022, 2024), end_at: randDate(2024, 2026),
      status: progress >= 100 ? '已完成' : progress > 30 ? '实施中' : '已立项', progress,
      target: `${t.name}${pick(rnd, ['A', 'B', 'C'])}靶区`, reserve_add: rndFloat(rnd, 20, 1800, 2),
      drill_holes: rndInt(rnd, 1, 24), drill_meters: rndFloat(rnd, 500, 22000, 1),
      anomaly: pick(rnd, ['Cu-Pb-Zn 组合异常', 'Au-As 组合异常', 'Ag 单元素异常', '磁异常', '土壤 Se 富集区']),
      created_at: nowStr()
    });
  }
  for (let i = 0; i < 90; i++) {
    const c = pick(rnd, cities);
    const t = pick(rnd, counties[c.code] || [{ code: c.code, name: c.name }]);
    const se = rndFloat(rnd, 0.08, 1.2, 3);
    const cd = rndFloat(rnd, 0.02, 0.62, 3);
    const [lon, lat] = jitter(t.center, 0.25);
    insertRow('agri_plot', {
      code: `NY${String(i + 1).padStart(5, '0')}`, name: `${t.name}${pick(rnd, PLACE_WORDS)}富硒地块`,
      region_code: t.code, region_name: t.name, area: rndFloat(rnd, 120, 5200, 1), selenium: se,
      zinc: rndFloat(rnd, 60, 160, 1), ph: rndFloat(rnd, 4.6, 7.6, 2), cadmium: cd,
      level: se >= 0.4 ? '富硒' : se >= 0.175 ? '含硒' : '一般',
      crop: pick(rnd, ['水稻', '茶叶', '杨梅', '竹笋', '蔬菜', '柑橘']),
      risk: cd > 0.3 ? '中风险' : '低风险', lon, lat
    });
  }
  for (let i = 0; i < 36; i++) {
    const c = pick(rnd, cities);
    const t = pick(rnd, counties[c.code] || [{ code: c.code, name: c.name }]);
    const [lon, lat] = jitter(t.center, 0.2);
    insertRow('geo_culture', {
      code: `WH${String(i + 1).padStart(4, '0')}`, name: `${t.name}${pick(rnd, PLACE_WORDS)}地质文化村`,
      type: pick(rnd, ['地质文化村', '地质遗迹保护区', '地质公园']), region_code: t.code, region_name: t.name,
      level: pick(rnd, ['国家级', '省级', '市级']), status: pick(rnd, ['已命名', '创建中', '申报中']),
      progress: rndInt(rnd, 20, 100), points: rndInt(rnd, 3, 18),
      route: JSON.stringify([{ name: '游客中心', lon: lon + 0.01, lat: lat + 0.01 }, { name: '核心遗迹点', lon, lat }, { name: '研学基地', lon: lon - 0.01, lat: lat - 0.005 }]),
      lon, lat, intro: '以典型地质遗迹与地质文化融合展示为核心，配套科普研学与乡村共富业态。'
    });
  }
  const orgs = ['四川省地质调查研究院', '四川省地质矿产勘查开发局', '四川省煤田地质局', '四川省核工业地质局', '四川省地质环境监测总站', '四川省国土科学技术研究院', '四川省地质工程勘察院', '四川省地球物理调查研究所', '四川省地质测绘院', '四川省自然资源厅', '四川省储量评审中心', '四川省地质学会'];
  orgs.forEach((o, i) => {
    const c = pick(rnd, cities);
    insertRow('org_unit', {
      code: `DW${String(i + 1).padStart(3, '0')}`, name: o,
      unit_type: pick(rnd, ['公益一类事业单位', '国有企业', '民营企业']), region_code: c.code, region_name: c.name,
      qualification: pick(rnd, ['地质勘查甲级', '地质灾害治理工程甲级', '地质勘查乙级']),
      staff: rndInt(rnd, 60, 860), senior: rndInt(rnd, 10, 180), equipment: rndInt(rnd, 8, 96),
      credit_score: rndFloat(rnd, 78, 98, 1), project_count: rndInt(rnd, 2, 26), status: '正常备案', updated_at: randDate(2024, 2024)
    });
  });
  for (let i = 0; i < 140; i++) {
    const c = pick(rnd, cities);
    const t = pick(rnd, counties[c.code] || [{ code: c.code, name: c.name }]);
    const [lon, lat] = jitter(t.center, 0.3);
    const nDev = rndInt(rnd, 0, 6);
    const type = pick(rnd, ['滑坡', '崩塌', '泥石流', '地面沉降']);
    insertRow('hazard_point', {
      code: `DZ${String(i + 1).padStart(5, '0')}`, name: `${t.name}${pick(rnd, PLACE_WORDS)}${type}隐患点`, type,
      region_code: t.code, region_name: t.name, level: pick(rnd, ['一级', '二级', '三级', '四级']),
      threat_people: rndInt(rnd, 3, 260), threat_asset: rndFloat(rnd, 20, 8600, 1),
      monitor_device: nDev, device_online: nDev ? rndInt(rnd, 0, nDev) : 0,
      status: pick(rnd, ['监测中', '监测中', '已治理', '群测群防']), lon, lat, updated_at: randDate(2024, 2024)
    });
  }
}

function seedBattle() {
  const cats = [
    { name: '地矿共富提质助推行动', dept: '地勘处', support: ['地矿所', '生态修复所'], works: [
      { work: '地质文化传播工程', items: [['做好年度全国地质文化村申报和创建。', '四季度'], ['建立地质文化村联盟。', '四季度'], ['开展“四川地质奇观”评选。', '三季度'], ['编制全省地质文化资源“一张图”。', '四季度']] },
      { work: '富硒土地资源详查', items: [['编制《四川省富硒土地资源详查工作方案》。', '二季度'], ['起草《土地质量地球化学档案建设规范》。', '四季度'], ['实施百镇千村富硒土地资源详查，建成富硒地块数据库。', '四季度']] }
    ] },
    { name: '矿产资源保供攻坚行动', dept: '矿业权处', support: ['地矿所', '评审中心'], works: [
      { work: '净矿出让', items: [['完成年度净矿出让区块储备库建设。', '二季度'], ['推动 20 宗砂石土料采矿权净矿出让。', '四季度'], ['建立净矿出让联合踏勘工作机制。', '三季度']] },
      { work: '储量评审备案', items: [['优化储量评审备案线上办理流程。', '二季度'], ['完成年度储量评审备案 120 宗。', '四季度'], ['开展储量估算范围矢量图斑入库。', '三季度']] }
    ] },
    { name: '绿色矿山建设提升行动', dept: '生态修复处', support: ['生态修复所', '地环站'], works: [
      { work: '绿色矿山创建', items: [['新建成省级以上绿色矿山 30 家。', '四季度'], ['完成绿色矿山年度复核抽查。', '三季度'], ['推动 10 家绿色矿山向智能矿山升级。', '四季度']] },
      { work: '废弃矿山生态修复', items: [['完成废弃矿山生态修复 100 处。', '四季度'], ['建立废弃矿山生态修复项目库。', '二季度']] }
    ] },
    { name: '智慧监管数字赋能行动', dept: '执法处', support: ['信息中心', '地矿所'], works: [
      { work: '绿矿智用平台建设', items: [['完成矿权管理系统上线运行。', '三季度'], ['接入在线矿山物联感知设备 2000 台套。', '四季度'], ['建成矿产资源智慧监管一张图。', '四季度']] },
      { work: '智能巡查', items: [['建立卫星遥感变化图斑月度推送机制。', '二季度'], ['视频 AI 识别算法覆盖 60% 在生产矿山。', '四季度']] }
    ] },
    { name: '地质安全防线固本行动', dept: '地环处', support: ['地环站', '地灾中心'], works: [
      { work: '地质灾害隐患点治理', items: [['完成重大地质灾害隐患点治理 50 处。', '四季度'], ['建成地质灾害监测预警一张图。', '三季度']] },
      { work: '地质环境监测', items: [['接入 GNSS 位移监测点 300 处。', '四季度'], ['完成地下水位监测网优化。', '三季度']] }
    ] }
  ];
  for (const year of [2022, 2023, 2024, 2025, 2026]) {
    let seq = 0;
    for (const cat of cats) {
      for (const w of cat.works) {
        for (const [content, deadline] of w.items) {
          seq += 1;
          const mk = () => {
            if (year < 2024) return '已完成';
            if (year > 2024) return '未完成';
            const r = rnd();
            return r < 0.55 ? '已完成' : r < 0.9 ? '推进中' : r < 0.96 ? '延后' : '未完成';
          };
          const q = [mk(), mk(), mk(), mk()];
          insertRow('battle_task', {
            year, category: cat.name, seq, content, outcome: content.replace(/。$/, '，形成年度成果。'),
            deadline, dept: cat.dept, support_dept: pick(rnd, cat.support),
            q1: q[0], q2: q[1], q3: q[2], q4: q[3],
            status: year < 2024 ? '已完成' : year > 2024 ? '未开始' : q.every((x) => x === '已完成') ? '已完成' : '进行中'
          });
        }
      }
    }
  }
}

function seedBizRecords() {
  const bizFeatures = ALL_FEATURES.filter((f) => f.table === 'biz_record');
  const statusPool = ['待处理', '办理中', '已办结', '已退回'];
  bizFeatures.forEach((f) => {
    const n = rndInt(rnd, 26, 52);
    for (let i = 0; i < n; i++) {
      const c = pick(rnd, cities);
      const t = pick(rnd, counties[c.code] || [{ code: c.code, name: c.name }]);
      const steps = f.workflow?.steps || [];
      const stage = steps.length ? steps[Math.min(steps.length - 1, rndInt(rnd, 0, steps.length - 1))].key : '已完成';
      const miner = pick(rnd, MINERALS);
      const occur = randDate(2023, 2024);
      const payload = {};
      Object.entries(f.extras || {}).forEach(([k, [label, type]]) => {
        payload[k] = type === 'number' ? rndFloat(rnd, 1, 8600, 2) : `${miner}${label}`;
      });
      const idx = steps.findIndex((s) => s.key === stage);
      insertRow('biz_record', {
        feature: f.key, code: `${f.key.split('-')[0].toUpperCase()}${String(20240000 + i + 1).slice(-8)}`,
        title: `${t.name}${pick(rnd, PLACE_WORDS)}${miner}${f.name}事项`,
        status: steps.length ? (idx === steps.length - 1 ? '已办结' : rnd() < 0.1 ? '已退回' : '办理中') : pick(rnd, statusPool),
        stage, region_code: t.code, region_name: t.name, mineral: miner,
        applicant: `${t.name}${pick(rnd, ORG_SUFFIX)}`, dept: pick(rnd, ['矿业权处', '地勘处', '生态修复处', '执法处']),
        amount: rndFloat(rnd, 10, 9800, 2), qty: rndFloat(rnd, 1, 500, 2), occur_at: occur,
        due_at: addDays(occur, rndInt(rnd, 15, 90)), level: pick(rnd, ['一级', '二级', '三级']),
        remark: `${f.name}演示记录，可按流程推进。`, payload: JSON.stringify(payload),
        history: JSON.stringify(steps.slice(0, Math.max(1, idx + 1)).map((s, k) => ({ step: s.key, at: addDays(occur, k * 3) }))),
        created_by: '系统初始化', created_at: nowStr(), updated_at: nowStr()
      });
    }
  });
}

function seedCatalog() {
  const topics = [
    { topic: '地质勘查专题库', items: [
      ['历年地勘项目报告', '文档', '四川省地质调查研究院', 1862, '份', ['项目编号', '项目名称', '承担单位', '提交时间', '评审意见']],
      ['钻孔柱状图', '矢量', '四川省地质调查研究院', 42860, '孔', ['孔号', '孔深', '坐标', '地层', '岩性']],
      ['物化探成果', '栅格', '四川省地球物理调查研究所', 3260, '幅', ['图幅号', '比例尺', '元素', '异常下限']],
      ['财政/社会资金投入明细', '结构化', '四川省自然资源厅', 1240, '条', ['年度', '资金来源', '项目', '金额']]
    ] },
    { topic: '储量评审备案范围专题库', items: [
      ['评审备案矢量边界', '矢量', '四川省自然资源厅', 3120, '个', ['备案文号', '矿山名称', '面积', '拐点坐标']],
      ['块段储量台账', '结构化', '四川省储量评审中心', 26400, '块段', ['块段号', '矿石量', '品位', '储量级别']],
      ['历史储量增减序列', '结构化', '四川省自然资源厅', 8600, '条', ['年度', '矿山', '增减量', '原因']]
    ] },
    { topic: '矿山开发利用统计年报专题库', items: [
      ['年度开发利用统计', '结构化', '四川省自然资源厅', 5400, '条', ['矿山', '产量', '产值', '三率']],
      ['季度快报', '结构化', '各市自然资源局', 21600, '条', ['矿山', '季度', '产量', '销量']],
      ['三率考核结果', '结构化', '四川省自然资源厅', 5400, '条', ['矿山', '回采率', '贫化率', '选矿回收率']]
    ] },
    { topic: '在采矿山专题库', items: [
      ['有效采矿权台账', '结构化', '四川省自然资源厅', 1280, '宗', ['许可证号', '采矿权人', '矿种', '有效期']],
      ['物联网感知设备', '时序', '各市自然资源局', 4260, '台套', ['设备编号', '类型', '状态', '监测值']],
      ['三维矿山模型底座', '三维', '四川省地质调查研究院', 260, '个', ['模型编号', '矿山', '分辨率', '更新时间']]
    ] }
  ];
  topics.forEach((t) => {
    t.items.forEach((it) => {
      insertRow('data_catalog', {
        topic: t.topic, name: it[0], category: it[1], source: it[2], rows: it[3], unit: it[4],
        updated_at: randDate(2024, 2024), fields: JSON.stringify(it[5])
      });
      for (let i = 0; i < 6; i++) {
        insertRow('data_asset', {
          topic: t.topic, name: `${it[0]}（${2024 - i}年度）`, file_type: it[1], size_kb: rndInt(rnd, 200, 96000),
          source: it[2], year: 2024 - i, region_name: pick(rnd, cities).name, uploaded_at: randDate(2024, 2024),
          meta: JSON.stringify({ rows: rndInt(rnd, 100, 9000), note: '演示数据' })
        });
      }
    });
  });
  [
    ['mine_status', '生产中', 1], ['mine_status', '停产', 2], ['mine_status', '在建', 3], ['mine_status', '关闭', 4],
    ['green_level', '国家级', 1], ['green_level', '省级', 2], ['green_level', '市级', 3], ['green_level', '未入库', 4],
    ['right_type', '采矿权', 1], ['right_type', '探矿权', 2],
    ['deposit_stage', '待查', 1], ['deposit_stage', '在查', 2], ['deposit_stage', '查明', 3], ['deposit_stage', '规划', 4],
    ['plan_zone', '重点勘查区', 1], ['plan_zone', '重点开采区', 2], ['plan_zone', '砂石土料集中开采区', 3]
  ].forEach(([type, name, sort]) => insertRow('sys_dict', { type, code: name, name, sort }));
}

/* ------------------------------------------------------------------ 主流程 */
export function seed({ force = false } = {}) {
  if (!force && tableCount('mine') > 0) {
    console.log('数据库已有数据，跳过 seed（使用 --force 重建）');
    return;
  }
  console.log('开始初始化演示数据 …');
  resetDatabase();
  db.exec('BEGIN');
  try {
    seedRegions();
    seedUsers();
    const mines = seedMines();
    seedDeposits();
    seedRights(mines);
    seedPlan();
    seedReviews(mines);
    seedGreen(mines);
    seedDevices(mines);
    seedAlerts(mines);
    seedOrders(mines);
    seedPatrol(mines);
    seedCredit(mines);
    seedProjects(mines);
    seedGeo();
    seedBattle();
    seedBizRecords();
    seedCatalog();
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  const tables = ['region', 'sys_user', 'mine', 'mineral_deposit', 'mining_right', 'plan_zone', 'plan_indicator',
    'reserve_review', 'green_apply', 'green_out', 'device', 'alert', 'work_order', 'patrol_log', 'credit_record',
    'gov_project', 'geo_project', 'hazard_point', 'agri_plot', 'geo_culture', 'org_unit', 'battle_task', 'biz_record',
    'data_catalog', 'data_asset', 'sys_dict'];
  console.log('演示数据初始化完成：');
  tables.forEach((t) => console.log(`  ${t.padEnd(16)} ${tableCount(t)}`));
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seed({ force: process.argv.includes('--force') });
}
