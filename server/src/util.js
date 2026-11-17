import ExcelJS from 'exceljs';

export function ok(res, data = null, extra = {}) {
  res.json({ code: 0, msg: 'success', data, ...extra });
}
export function fail(res, msg = '操作失败', code = 500, status = 200) {
  res.status(status).json({ code, msg, data: null });
}
export function wrap(handler) {
  return (req, res, next) => {
    try {
      const r = handler(req, res, next);
      if (r && typeof r.catch === 'function') r.catch(next);
    } catch (err) {
      next(err);
    }
  };
}

export function num(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}
export function int(v, def = 0) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
}

export function pageParams(query) {
  const page = Math.max(1, int(query.page, 1));
  const pageSize = Math.min(200, Math.max(1, int(query.pageSize, 20)));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export function today(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86400000);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export function nowStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
export function pad(n, len = 4) {
  return String(n).padStart(len, '0');
}

/** 确定性伪随机，保证每次 seed 生成同一份演示数据 */
export function makeRandom(seed = 20241121) {
  let s = seed >>> 0;
  return function rnd() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function pick(rnd, arr) {
  return arr[Math.floor(rnd() * arr.length) % arr.length];
}
export function rndInt(rnd, min, max) {
  return Math.floor(rnd() * (max - min + 1)) + min;
}
export function rndFloat(rnd, min, max, digits = 2) {
  const v = rnd() * (max - min) + min;
  return Number(v.toFixed(digits));
}

/** 根据数据权限拼行政区划过滤条件 */
export function regionScope(user) {
  if (!user) return null;
  if (user.role === 'province' || user.role === 'admin') return null;
  return user.region_code || null;
}

export function whereRegion(user, alias = '') {
  const code = regionScope(user);
  if (!code) return { sql: '', params: [] };
  const col = alias ? `${alias}.region_code` : 'region_code';
  if (code.endsWith('0000')) {
    // 省级以下：按市级前缀匹配（330500 → 3305xx）
    const prefix = code.slice(0, 4);
    return { sql: ` AND ${col} LIKE ?`, params: [`${prefix}%`] };
  }
  return { sql: ` AND ${col} = ?`, params: [code] };
}

/** 通用报表导出 */
export async function exportExcel(res, { sheetName = 'Sheet1', columns, rows, filename = 'export.xlsx' }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = '绿矿智用 · 矿权管理系统';
  wb.created = new Date();
  const ws = wb.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = columns.map((c) => ({ header: c.label, key: c.key, width: c.width || 18 }));
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4E89' } };
  ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(1).height = 24;
  rows.forEach((r) => ws.addRow(r));
  ws.eachRow((row, i) => {
    if (i === 1) return;
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD9E2EC' } },
        left: { style: 'thin', color: { argb: 'FFD9E2EC' } },
        bottom: { style: 'thin', color: { argb: 'FFD9E2EC' } },
        right: { style: 'thin', color: { argb: 'FFD9E2EC' } }
      };
      cell.alignment = { vertical: 'middle' };
    });
  });
  const buf = await wb.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
  res.send(Buffer.from(buf));
}

export function percent(part, total, digits = 1) {
  if (!total) return 0;
  return Number(((part / total) * 100).toFixed(digits));
}

export function ringDistribution(list, key) {
  const map = new Map();
  list.forEach((it) => {
    const k = it[key] || '未知';
    map.set(k, (map.get(k) || 0) + 1);
  });
  return [...map.entries()].map(([name, value]) => ({ name, value }));
}

export function grow(current, previous) {
  if (!previous) return current ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}
