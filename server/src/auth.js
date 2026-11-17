import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { get, run } from './db.js';
import { nowStr } from './util.js';

const SECRET = process.env.KQ_JWT_SECRET || 'kuangquan-platform-demo-secret-2024';
const TOKEN_TTL = '12h';

export const ROLE_LABEL = {
  province: '省级管理员',
  city: '市级管理员',
  county: '县级管理员',
  enterprise: '矿山企业',
  public: '社会公众',
  admin: '系统管理员'
};

export function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      region_code: user.region_code,
      region_name: user.region_name,
      org: user.org
    },
    SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

export function verifyPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}
export function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}

export function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : req.query.token;
  if (!token) {
    return res.status(401).json({ code: 401, msg: '未登录或登录已过期', data: null });
  }
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ code: 401, msg: '登录状态已失效，请重新登录', data: null });
  }
}

/** 角色能力位：用于前端按钮级权限与后端校验 */
export const PERMISSIONS = {
  province: ['*'],
  admin: ['*'],
  city: ['read', 'review', 'city_approve', 'export', 'patrol', 'order'],
  county: ['read', 'report', 'county_fill', 'patrol', 'order', 'export'],
  enterprise: ['read_own', 'report', 'self_eval'],
  public: ['read_public']
};

export function can(user, perm) {
  const perms = PERMISSIONS[user?.role] || [];
  return perms.includes('*') || perms.includes(perm);
}

export function requirePerm(perm) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ code: 401, msg: '未登录', data: null });
    if (!can(req.user, perm)) {
      return res.status(403).json({ code: 403, msg: '当前账号无此操作权限', data: null });
    }
    next();
  };
}

export function audit(req, action, target, detail) {
  try {
    run(
      `INSERT INTO audit_log (username, name, action, target, detail, ip, created_at) VALUES (?,?,?,?,?,?,?)`,
      [req.user?.username || '-', req.user?.name || '-', action, target || '', detail || '', req.ip || '', nowStr()]
    );
  } catch (e) {
    /* 审计失败不影响主流程 */
  }
}

export function touchLogin(userId) {
  run(`UPDATE sys_user SET last_login = ? WHERE id = ?`, [nowStr(), userId]);
}

export function loadUser(username) {
  return get(`SELECT * FROM sys_user WHERE username = ?`, [username]);
}
