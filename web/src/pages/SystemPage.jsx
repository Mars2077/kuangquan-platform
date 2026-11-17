import React, { useState } from 'react';
import { Ic } from '../components/Icon';
import { useApp, useFetch } from '../store.jsx';
import { sys } from '../api';
import {
  Add01Icon, CheckmarkBadge02Icon, CloudServerIcon, Database01Icon, Refresh01Icon, Shield01Icon, UserIcon
} from '@hugeicons/core-free-icons';

const ROLES = [
  ['admin', '系统管理员'],
  ['province', '省级管理员'],
  ['city', '市级管理员'],
  ['county', '县级管理员'],
  ['enterprise', '矿山企业'],
  ['public', '公众用户']
];

export default function SystemPage() {
  const { bootMeta, toast, user } = useApp();
  const [tab, setTab] = useState('user');
  const users = useFetch(() => sys.users(), []);
  const audit = useFetch(() => sys.audit({ page: 1, pageSize: 50 }), []);
  const health = useFetch(() => sys.health(), []);
  const indicator = useFetch(() => sys.indicator(), []);
  const [form, setForm] = useState({ username: '', password: '', name: '', org: '', role: 'county', region_code: '510100', region_name: '成都市' });
  const [busy, setBusy] = useState(false);

  const createUser = async () => {
    if (!form.username || !form.password || !form.name) {
      toast('账号、密码、姓名均为必填', 'err');
      return;
    }
    setBusy(true);
    try {
      await sys.createUser(form);
      toast('用户已创建');
      setForm({ ...form, username: '', password: '', name: '' });
      users.reload();
    } catch (e) {
      toast(e.message, 'err');
    } finally {
      setBusy(false);
    }
  };

  const toggleUser = async (u) => {
    try {
      await sys.updateUser(u.id, { status: u.status === '正常' ? '停用' : '正常' });
      toast(`已${u.status === '正常' ? '停用' : '启用'} ${u.name}`);
      users.reload();
    } catch (e) {
      toast(e.message, 'err');
    }
  };

  const h = health.data || {};

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>系统管理</h1>
          <p className="sub">统一用户与省市县三级分权、操作审计、运行健康与规划指标监测。</p>
        </div>
        <div className="actions">
          <button type="button" className="btn btn-ghost" onClick={() => { users.reload(); audit.reload(); health.reload(); indicator.reload(); }}>
            <Ic icon={Refresh01Icon} size={14} /> 刷新全部
          </button>
        </div>
      </header>

      <div className="grid-4" style={{ marginBottom: 18 }}>
        <div className="kpi">
          <div className="k"><Ic icon={UserIcon} size={12} /> 当前账号</div>
          <div className="v" style={{ fontSize: 18 }}>{user?.name}</div>
          <div className="s">{user?.org}｜{bootMeta?.roles?.[user?.role] || user?.role}</div>
        </div>
        <div className="kpi">
          <div className="k"><Ic icon={Shield01Icon} size={12} /> 账号总数</div>
          <div className="v">{users.data?.list?.length ?? '—'}<small>个</small></div>
          <div className="s">按行政区划可见范围内统计</div>
        </div>
        <div className="kpi">
          <div className="k"><Ic icon={Database01Icon} size={12} /> 数据表</div>
          <div className="v">{h.tables ?? '—'}<small>张</small></div>
          <div className="s">SQLite（node:sqlite）</div>
        </div>
        <div className="kpi">
          <div className="k"><Ic icon={CloudServerIcon} size={12} /> 服务时间</div>
          <div className="v" style={{ fontSize: 15 }}>{h.time ? String(h.time).slice(0, 16).replace('T', ' ') : '—'}</div>
          <div className="s">接口健康检查通过</div>
        </div>
      </div>

      <div className="tabs">
        {[['user', '用户与分权'], ['indicator', '指标监测'], ['audit', '操作审计'], ['health', '运行健康']].map(([k, label]) => (
          <button key={k} type="button" className={`tab${tab === k ? ' on' : ''}`} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {tab === 'user' && (
        <div className="grid-side">
          <section className="card">
            <h3>用户列表（{users.data?.list?.length || 0}）</h3>
            {users.loading && !users.data ? <div className="loading"><span className="spinner" />加载中 …</div> : (
              <table className="data-table dense">
                <thead>
                  <tr><th>账号</th><th>姓名</th><th>角色</th><th>所属单位</th><th>行政区划</th><th>最近登录</th><th style={{ width: 90 }}>状态</th><th style={{ width: 80 }}>操作</th></tr>
                </thead>
                <tbody>
                  {(users.data?.list || []).map((u) => (
                    <tr key={u.id}>
                      <td>{u.username}</td>
                      <td>{u.name}</td>
                      <td><span className="tag tone-blue">{u.roleLabel}</span></td>
                      <td className="muted">{u.org}</td>
                      <td className="muted">{u.region_name}</td>
                      <td className="muted tiny">{u.last_login || '—'}</td>
                      <td><span className={`tag tone-${u.status === '正常' ? 'green' : 'grey'}`}>{u.status}</span></td>
                      <td>
                        <button type="button" className="btn-link" onClick={() => toggleUser(u)}>
                          {u.status === '正常' ? '停用' : '启用'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
          <section className="card">
            <h3><Ic icon={Add01Icon} size={14} /> 新增用户</h3>
            <div className="form-grid">
              <label><span>账号</span><input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></label>
              <label><span>初始密码</span><input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
              <label><span>姓名</span><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
              <label><span>角色</span>
                <select className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {ROLES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label><span>所属单位</span><input className="input" value={form.org} onChange={(e) => setForm({ ...form, org: e.target.value })} placeholder="如：彭州市自然资源和规划局" /></label>
              <label><span>行政区划名称</span><input className="input" value={form.region_name} onChange={(e) => setForm({ ...form, region_name: e.target.value })} /></label>
            </div>
            <div className="actions" style={{ marginTop: 12 }}>
              <button type="button" className="btn btn-primary" onClick={createUser} disabled={busy}>
                <Ic icon={Add01Icon} size={14} /> {busy ? '创建中 …' : '创建账号'}
              </button>
            </div>
            <p className="muted tiny" style={{ marginTop: 10 }}>新增/停用用户需市级及以上权限；县级账号仅能管理本级及下级。</p>
          </section>
        </div>
      )}

      {tab === 'indicator' && (
        <section className="card">
          <h3>规划指标监测（红黄牌预警）</h3>
          <div className="tag-list" style={{ marginBottom: 12 }}>
            <span className="tag tone-red">红牌 {indicator.data?.totals?.red ?? 0}</span>
            <span className="tag tone-yellow">黄牌 {indicator.data?.totals?.yellow ?? 0}</span>
            <span className="tag tone-green">正常 {indicator.data?.totals?.normal ?? 0}</span>
          </div>
          {indicator.loading && !indicator.data ? <div className="loading"><span className="spinner" />加载中 …</div> : (
            <table className="data-table dense">
              <thead>
                <tr><th>指标名称</th><th>层级</th><th className="num">目标值</th><th className="num">执行值</th><th style={{ width: 80 }}>单位</th><th style={{ width: 80 }}>预警</th></tr>
              </thead>
              <tbody>
                {(indicator.data?.indicators || []).map((it) => (
                  <tr key={it.id}>
                    <td>{it.name}</td>
                    <td className="muted">{it.level || it.region_name}</td>
                    <td className="num">{it.target}</td>
                    <td className="num">{it.actual}</td>
                    <td className="muted">{it.unit}</td>
                    <td><span className={`tag tone-${it.warn === '红牌' ? 'red' : it.warn === '黄牌' ? 'yellow' : 'green'}`}>{it.warn}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {tab === 'audit' && (
        <section className="card">
          <h3><Ic icon={CheckmarkBadge02Icon} size={14} /> 操作审计（最近 50 条）</h3>
          <table className="data-table dense">
            <thead>
              <tr><th style={{ width: 150 }}>时间</th><th style={{ width: 110 }}>账号</th><th style={{ width: 100 }}>操作</th><th style={{ width: 160 }}>对象</th><th>详情</th></tr>
            </thead>
            <tbody>
              {(audit.data?.list || []).map((a) => (
                <tr key={a.id}>
                  <td className="muted tiny">{a.created_at}</td>
                  <td>{a.name || a.username}</td>
                  <td><span className="tag tone-cyan">{a.action}</span></td>
                  <td className="muted">{a.target}</td>
                  <td className="muted small">{a.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === 'health' && (
        <div className="grid-2">
          <section className="card">
            <h3>运行健康</h3>
            <dl className="desc-list">
              <dt>服务时间</dt><dd>{h.time}</dd>
              <dt>数据库</dt><dd>{h.db}</dd>
              <dt>数据表数量</dt><dd>{h.tables}</dd>
              <dt>备注</dt><dd className="muted small">演示环境使用单进程 Express + SQLite（WAL），生产建议容器化并挂载持久卷。</dd>
            </dl>
          </section>
          <section className="card">
            <h3>数据规模</h3>
            <table className="data-table dense">
              <tbody>
                {Object.entries(h.counts || {}).map(([k, v]) => (
                  <tr key={k}><td className="muted">{k}</td><td className="num">{v}</td></tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}
    </div>
  );
}
