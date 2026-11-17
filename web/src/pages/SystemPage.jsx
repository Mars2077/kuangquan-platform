import React, { useState } from 'react';
import { Ic } from '../components/Icon';
import Drawer from '../components/Drawer';
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

const TABS = [
  ['user', '用户与分权'],
  ['indicator', '指标监测'],
  ['audit', '操作审计'],
  ['health', '运行健康']
];

const EMPTY_FORM = { username: '', password: '', name: '', org: '', role: 'county', region_code: '510100', region_name: '成都市' };

function TableCard({ title, sub, head, rows, loading, error, onRetry, minWidth, empty = '暂无数据。' }) {
  return (
    <div className="card">
      <div className="card-head">
        <h3 className="card-title">{title}</h3>
        {sub ? <span className="card-sub">{sub}</span> : null}
      </div>
      <div className="card-body" style={{ padding: loading || error || rows.length === 0 ? 16 : 0 }}>
        {loading && (
          <div className="skeleton">
            <span className="skeleton-line" /><span className="skeleton-line" /><span className="skeleton-line" />
          </div>
        )}
        {error && (
          <div className="alert-line err">
            加载失败：{error}
            <button type="button" className="btn btn-text btn-sm" style={{ marginLeft: 8 }} onClick={onRetry}>重试</button>
          </div>
        )}
        {!loading && !error && rows.length === 0 && (
          <div className="empty" style={{ minHeight: 96 }}>
            <span className="empty-icon">{head.icon || <Ic icon={Database01Icon} size={18} />}</span>
            <p className="empty-text">{empty}</p>
          </div>
        )}
        {!loading && !error && rows.length > 0 && (
          <div className="table-wrap" style={{ border: 0, borderRadius: 0 }}>
            <table className="data-table is-dense" style={{ minWidth: minWidth || 720 }}>
              <thead>
                <tr>
                  {head.columns.map((h) => (
                    <th key={h.label} align={h.right ? 'right' : undefined} className={h.right ? 'num' : undefined} style={h.width ? { width: h.width } : undefined}>
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>{rows}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SystemPage() {
  const { bootMeta, toast, user } = useApp();
  const [tab, setTab] = useState('user');
  const users = useFetch(() => sys.users(), []);
  const audit = useFetch(() => sys.audit({ page: 1, pageSize: 50 }), []);
  const health = useFetch(() => sys.health(), []);
  const indicator = useFetch(() => sys.indicator(), []);
  const [form, setForm] = useState(EMPTY_FORM);
  const [drawer, setDrawer] = useState(false);
  const [busy, setBusy] = useState(false);

  const openDrawer = () => {
    setForm(EMPTY_FORM);
    setDrawer(true);
  };

  const createUser = async () => {
    if (!form.username || !form.password || !form.name) {
      toast('账号、密码、姓名均为必填', 'err');
      return;
    }
    setBusy(true);
    try {
      await sys.createUser(form);
      toast('用户已创建');
      setForm(EMPTY_FORM);
      setDrawer(false);
      users.reload();
    } catch (e) {
      toast(e.message || '创建失败', 'err');
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
      toast(e.message || '操作失败', 'err');
    }
  };

  const h = health.data || {};
  const userList = users.data?.list || [];
  const stopped = userList.filter((u) => u.status !== '正常').length;
  const roleLabel = bootMeta?.roles?.[user?.role] || user?.role || '—';

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">系统管理</h1>
          <p className="page-desc">统一用户与省市县三级分权、操作审计、运行健康与规划指标监测。</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-ghost" onClick={() => { users.reload(); audit.reload(); health.reload(); indicator.reload(); }}>
            <Ic icon={Refresh01Icon} size={14} /> 刷新全部
          </button>
          <button type="button" className="btn btn-primary" onClick={openDrawer}>
            <Ic icon={Add01Icon} size={14} /> 新增用户
          </button>
        </div>
      </header>

      <div className="content">
        <div className="kpi-row">
        <div className="kpi-card">
          <span className="kpi-label">当前账号</span>
          <b className="kpi-value" style={{ fontSize: 16, fontFamily: 'var(--font-sans)' }}>{user?.name || '—'}</b>
          <span className="kpi-delta flat">{roleLabel} · {user?.org || '—'}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">账号总数</span>
          <b className="kpi-value">{userList.length || '—'}<i className="kpi-unit">个</i></b>
          <span className="kpi-delta flat">停用 {stopped} 个 · 按行政区划可见范围统计</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">数据表</span>
          <b className="kpi-value">{h.tables ?? '—'}<i className="kpi-unit">张</i></b>
          <span className="kpi-delta flat">SQLite（node:sqlite）</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">服务时间</span>
          <b className="kpi-value" style={{ fontSize: 15, fontFamily: 'var(--font-sans)' }}>
            {h.time ? String(h.time).slice(0, 16).replace('T', ' ') : '—'}
          </b>
          <span className={`kpi-delta ${health.error ? 'down' : 'up'}`}>{health.error ? '健康检查异常' : '接口健康检查通过'}</span>
        </div>
      </div>

        <div className="tabs" role="tablist" aria-label="系统管理分区">
          {TABS.map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              className={`tab${tab === k ? ' is-on' : ''}`}
              onClick={() => setTab(k)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'user' && (
          <TableCard
            title={<><Ic icon={UserIcon} size={15} /> 用户与分权</>}
            sub={`${userList.length} 个账号 · 停用 ${stopped} 个`}
            head={{
              columns: [
                { label: '账号', width: 110 },
                { label: '姓名', width: 100 },
                { label: '角色', width: 120 },
                { label: '所属单位' },
                { label: '行政区划', width: 120 },
                { label: '最近登录', width: 150 },
                { label: '状态', width: 80 },
                { label: '操作', width: 76 }
              ]
            }}
            loading={users.loading && !users.data}
            error={users.error}
            onRetry={() => users.reload()}
            minWidth={980}
            rows={userList.map((u) => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td>{u.name}</td>
                <td><span className="tag tag--blue">{u.roleLabel || u.role}</span></td>
                <td style={{ color: 'var(--text-3)' }}>{u.org || '—'}</td>
                <td style={{ color: 'var(--text-3)' }}>{u.region_name || '—'}</td>
                <td style={{ color: 'var(--text-4)', whiteSpace: 'nowrap' }}>{u.last_login || '—'}</td>
                <td><span className={`tag ${u.status === '正常' ? 'tag--green' : 'tag--grey'}`}>{u.status}</span></td>
                <td className="col-actions">
                  <button type="button" className="btn btn-text btn-sm" onClick={() => toggleUser(u)}>
                    {u.status === '正常' ? '停用' : '启用'}
                  </button>
                </td>
              </tr>
            ))}
          />
        )}

        {tab === 'indicator' && (
          <>
            <div className="card">
              <div className="card-body" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 12, paddingBottom: 12 }}>
                <span className="tag tag--red">红牌 {indicator.data?.totals?.red ?? 0}</span>
                <span className="tag tag--yellow">黄牌 {indicator.data?.totals?.yellow ?? 0}</span>
                <span className="tag tag--green">正常 {indicator.data?.totals?.normal ?? 0}</span>
                <span className="card-sub" style={{ margin: 0 }}>实际值 / 目标值 ≥ 90% 黄牌、≥ 100% 红牌</span>
              </div>
            </div>
            <TableCard
              title="规划指标监测"
              sub={`${(indicator.data?.indicators || []).length} 项指标`}
              head={{
                columns: [
                  { label: '指标名称' },
                  { label: '层级', width: 120 },
                  { label: '目标值', right: true, width: 110 },
                  { label: '执行值', right: true, width: 110 },
                  { label: '单位', width: 90 },
                  { label: '预警', width: 90 }
                ]
              }}
              loading={indicator.loading && !indicator.data}
              error={indicator.error}
              onRetry={() => indicator.reload()}
              minWidth={680}
              empty="暂无规划指标数据。"
              rows={(indicator.data?.indicators || []).map((it) => (
                <tr key={it.id}>
                  <td>{it.name}</td>
                  <td style={{ color: 'var(--text-3)' }}>{it.level || it.region_name || '—'}</td>
                  <td align="right" className="num">{it.target}</td>
                  <td align="right" className="num">{it.actual}</td>
                  <td style={{ color: 'var(--text-3)' }}>{it.unit || '—'}</td>
                  <td>
                    <span className={`tag ${it.warn === '红牌' ? 'tag--red' : it.warn === '黄牌' ? 'tag--yellow' : 'tag--green'}`}>{it.warn || '正常'}</span>
                  </td>
                </tr>
              ))}
            />
          </>
        )}

        {tab === 'audit' && (
          <TableCard
            title={<><Ic icon={CheckmarkBadge02Icon} size={15} /> 操作审计</>}
            sub="最近 50 条操作留痕"
            head={{
              columns: [
                { label: '时间', width: 160 },
                { label: '账号', width: 110 },
                { label: '操作', width: 100 },
                { label: '对象', width: 170 },
                { label: '详情' }
              ]
            }}
            loading={audit.loading && !audit.data}
            error={audit.error}
            onRetry={() => audit.reload()}
            minWidth={760}
            empty="暂无审计记录。"
            rows={(audit.data?.list || []).map((a) => (
              <tr key={a.id}>
                <td style={{ color: 'var(--text-4)', whiteSpace: 'nowrap' }}>{a.created_at}</td>
                <td>{a.name || a.username}</td>
                <td><span className="tag tag--blue">{a.action}</span></td>
                <td style={{ color: 'var(--text-3)' }}>{a.target}</td>
                <td style={{ color: 'var(--text-3)' }}>{a.detail}</td>
              </tr>
            ))}
          />
        )}

        {tab === 'health' && (
          <div className="content-grid">
            <div className="span-6">
              <div className="card">
                <div className="card-head">
                  <h3 className="card-title"><Ic icon={CloudServerIcon} size={15} /> 运行健康</h3>
                  <span className={`badge ${health.error ? 'badge--warn' : 'badge--ok'}`}>{health.error ? '异常' : '正常'}</span>
                </div>
                <div className="card-body">
                  <div className="desc-list">
                    <div className="desc-row"><span className="desc-key">服务时间</span><span className="desc-value">{h.time || '—'}</span></div>
                    <div className="desc-row"><span className="desc-key">数据库</span><span className="desc-value">{h.db || '—'}</span></div>
                    <div className="desc-row"><span className="desc-key">数据表数量</span><span className="desc-value">{h.tables ?? '—'} 张</span></div>
                    <div className="desc-row"><span className="desc-key">备注</span><span className="desc-value">演示环境使用单进程 Express + SQLite（WAL），生产建议容器化并挂载持久卷。</span></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="span-6">
              <div className="card">
                <div className="card-head">
                  <h3 className="card-title"><Ic icon={Database01Icon} size={15} /> 数据规模</h3>
                  <span className="card-sub">{Object.keys(h.counts || {}).length} 张业务表</span>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  {Object.keys(h.counts || {}).length === 0 ? (
                    <div className="empty" style={{ minHeight: 120 }}>
                      <span className="empty-icon"><Ic icon={Database01Icon} size={18} /></span>
                      <p className="empty-text">暂无数据规模统计。</p>
                    </div>
                  ) : (
                    <div className="table-wrap" style={{ border: 0, borderRadius: 0 }}>
                      <table className="data-table is-dense" style={{ minWidth: 320 }}>
                        <thead><tr><th>数据表</th><th className="num" align="right" style={{ width: 110 }}>记录数</th></tr></thead>
                        <tbody>
                          {Object.entries(h.counts || {}).map(([k, v]) => (
                            <tr key={k}><td>{k}</td><td align="right" className="num">{Number(v).toLocaleString('zh-CN')}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Drawer
        open={drawer}
        title="新增用户"
        subtitle="账号、密码、姓名为必填项；新增/停用用户需市级及以上权限"
        onClose={() => setDrawer(false)}
        footer={(
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setDrawer(false)}>取消</button>
            <button type="button" className="btn btn-primary" onClick={createUser} disabled={busy}>
              <Ic icon={Add01Icon} size={14} /> {busy ? '创建中 …' : '创建账号'}
            </button>
          </>
        )}
      >
        <div className="content">
          <div className="alert-line">
            <Ic icon={Shield01Icon} size={13} /> 县级账号仅能管理本级及下级；角色决定数据可见范围。
          </div>
          <div className="card">
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 'var(--sp-3)' }}>
                <div className="field">
                  <label className="field-label" htmlFor="su-username">账号</label>
                  <input id="su-username" className="input" autoComplete="off" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="su-password">初始密码</label>
                  <input id="su-password" className="input" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="su-name">姓名</label>
                  <input id="su-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="su-role">角色</label>
                  <select id="su-role" className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                    {ROLES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label className="field-label" htmlFor="su-org">所属单位</label>
                  <input id="su-org" className="input" value={form.org} onChange={(e) => setForm({ ...form, org: e.target.value })} placeholder="如：彭州市自然资源和规划局" />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="su-rcode">行政区划代码</label>
                  <input id="su-rcode" className="input" value={form.region_code} onChange={(e) => setForm({ ...form, region_code: e.target.value })} />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="su-rname">行政区划名称</label>
                  <input id="su-rname" className="input" value={form.region_name} onChange={(e) => setForm({ ...form, region_name: e.target.value })} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Drawer>
    </>
  );
}
