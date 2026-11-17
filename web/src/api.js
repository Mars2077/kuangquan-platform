const TOKEN_KEY = 'kq_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}
export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

function qs(params = {}) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '' || v === 'all') return;
    sp.append(k, v);
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

async function request(path, { method = 'GET', body, raw } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (raw) return res;
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`接口返回格式异常（${res.status}）`);
  }
  if (res.status === 401) {
    setToken('');
    if (onUnauthorized) onUnauthorized();
    throw new Error(json.msg || '登录已过期，请重新登录');
  }
  if (json.code !== 0) throw new Error(json.msg || '请求失败');
  return json;
}

export const api = {
  get: (p, params) => request(`${p}${qs(params)}`),
  post: (p, body) => request(p, { method: 'POST', body }),
  put: (p, body) => request(p, { method: 'PUT', body }),
  del: (p) => request(p, { method: 'DELETE' }),
  download: async (p, params, filename) => {
    const res = await request(`${p}${qs(params)}`, { raw: true });
    if (!res.ok) throw new Error('导出失败');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
};

export const auth = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  me: () => api.get('/auth/me')
};

export const meta = {
  bootstrap: () => api.get('/meta/bootstrap'),
  regions: () => api.get('/meta/regions'),
  dict: (type) => api.get(`/meta/dict/${type}`)
};

export const screen = {
  get: (scene, params) => api.get(`/screen/${scene}`, params),
  layers: (theme, params) => api.get(`/screen/map/${theme}`, params),
  battle: (params) => api.get('/screen/task/battle', params)
};

export const biz = {
  list: (module, feature, params) => api.get(`/biz/${module}/${feature}`, params),
  detail: (module, feature, id) => api.get(`/biz/${module}/${feature}/${id}`),
  create: (module, feature, body) => api.post(`/biz/${module}/${feature}`, body),
  update: (module, feature, id, body) => api.put(`/biz/${module}/${feature}/${id}`, body),
  remove: (module, feature, id) => api.del(`/biz/${module}/${feature}/${id}`),
  action: (module, feature, id, body) => api.post(`/biz/${module}/${feature}/${id}/action`, body),
  export: (module, feature, params, filename) => api.download(`/biz/${module}/${feature}/export`, params, filename),
  workflow: (module, feature) => api.get(`/biz/${module}/${feature}/workflow`)
};

export const tools = {
  reserveCalc: (body) => api.post('/tools/reserve-calc', body),
  overlay: (body) => api.post('/tools/overlay', body),
  precheck: (body) => api.post('/tools/precheck', body),
  greenScore: (body) => api.post('/tools/green-score', body),
  quota: (params) => api.get('/tools/quota', params),
  developCheck: (body) => api.post('/tools/develop-check', body),
  creditScore: (body) => api.post('/tools/credit-score', body),
  overdue: () => api.get('/tools/order/overdue')
};

export const sys = {
  bootstrap: () => meta.bootstrap(),
  users: () => api.get('/auth/users'),
  createUser: (b) => api.post('/auth/users', b),
  updateUser: (id, b) => api.put(`/auth/users/${id}`, b),
  audit: (params) => api.get('/system/audit', params),
  health: () => api.get('/system/health'),
  indicator: () => api.get('/monitor/indicator'),
  problem: () => api.get('/monitor/problem'),
  warehouse: () => api.get('/warehouse/overview'),
  uploadAsset: async (formData) => {
    const headers = {};
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch('/api/warehouse/upload', { method: 'POST', headers, body: formData });
    const json = await res.json().catch(() => ({ code: 1, msg: '上传失败' }));
    if (json.code !== 0) throw new Error(json.msg || '上传失败');
    return json;
  },
  qr: (text, size) => api.get('/qr', { text, size }),
  archive: (id) => api.get(`/archive/${id}`),
  mobileHome: () => api.get('/mobile/home'),
  mobileList: (type) => api.get(`/mobile/list/${type}`),
  mobilePatrol: (b) => api.post('/mobile/patrol', b)
};
