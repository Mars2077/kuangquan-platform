import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, useFetch } from '../store.jsx';
import { hub } from '../api.js';
import { Button, Segmented, Tag } from 'antd';
import { Ic } from '../components/Icon';
import { DataTable } from '../components/DataTable.jsx';
import {
  Search01Icon, ArrowRight01Icon, Task01Icon, Database01Icon, CheckmarkCircle02Icon
} from '@hugeicons/core-free-icons';

/* 业务中枢：所有模块的「详情」统一收进这里，按 模块 → 功能点 的两级结构组织。
   流程图与台账表二选一呈现（默认流程图），避免两屏内容互相抢空间、卡内双滚动。 */

const VIEW_OPTIONS = [
  { label: '流程图', value: 'flow' },
  { label: '台账表', value: 'table' }
];

/* 流程图区最大高度：56vh 与 560px 取小，超出在区内滚动 */
const FLOW_BOX = { height: 'min(56vh, 560px)', maxHeight: 'none', flex: '0 0 auto', overflow: 'auto' };

export default function Hub() {
  const nav = useNavigate();
  const { user } = useApp();
  const [active, setActive] = useState('all');
  const [kw, setKw] = useState('');
  const [picked, setPicked] = useState(null);
  const [view, setView] = useState('flow');
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 900px)').matches);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const on = (e) => setNarrow(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  const { data, loading } = useFetch(() => hub.overview({ code: user?.region_code }), [user?.region_code]);
  const modules = data?.modules || [];
  const totals = data?.totals || { features: 0, workflowFeatures: 0, tables: 0, records: 0 };

  const match = (m, f) => !kw.trim() || `${m.name}${f.name}${f.table}${f.desc || ''}`.includes(kw.trim());

  const rows = useMemo(() => {
    const list = [];
    modules.forEach((m) => {
      if (active !== 'all' && m.key !== active) return;
      m.features.forEach((f) => {
        if (!match(m, f)) return;
        list.push({ ...f, moduleKey: m.key, moduleName: m.name });
      });
    });
    return list;
  }, [modules, active, kw]);

  /* 按模块出「业务流程图」——每条泳道是一个业务域，节点是功能点，点击进入详情 */
  const lanes = useMemo(() => modules
    .filter((m) => active === 'all' || m.key === active)
    .map((m) => ({
      key: m.key,
      name: m.name,
      intro: m.intro,
      features: m.features.filter((f) => match(m, f))
    }))
    .filter((m) => m.features.length), [modules, active, kw]);

  const isFlow = view === 'flow';
  const nodeTotal = lanes.reduce((s, m) => s + m.features.length, 0);
  const current = picked || rows.find((r) => r.steps?.length) || null;
  const stepTotal = current?.steps?.reduce((s, x) => s + x.count, 0) || 0;

  return (
    <div className="content">
      <header className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <nav className="breadcrumb" aria-label="面包屑">
            <span>业务中枢</span>
          </nav>
          <h1 className="page-title" style={{ marginTop: 6 }}>业务中枢 · 统一详情</h1>
          <p className="page-desc">
            6 个业务域、{totals.features} 个功能点的详情视图统一收口于此；带流程的功能点可直接看到所处环节与上下游。
          </p>
        </div>
        <div className="page-actions">
          <Button onClick={() => nav('/dashboard')}>返回驾驶舱</Button>
        </div>
      </header>

      <div className="kpi-row">
        <div className="kpi-card">
          <span className="kpi-label">纳管功能点</span>
          <b className="kpi-value">{totals.features}</b>
          <span className="kpi-delta flat">6 个业务域</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">流程型功能点</span>
          <b className="kpi-value">{totals.workflowFeatures}</b>
          <span className="kpi-delta flat">具备环节与状态</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">承载数据表</span>
          <b className="kpi-value">{totals.tables}</b>
          <span className="kpi-delta flat">台账 / 业务表</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">台账记录</span>
          <b className="kpi-value">{totals.records.toLocaleString('zh-CN')}</b>
          <span className="kpi-delta flat">当前区划权限内</span>
        </div>
      </div>

      <div className="hub-body">
        <section className="card hub-list" style={{ height: 'auto', minHeight: 0 }}>
          <div className="hub-bar">
            <div className="tabs" role="tablist">
              <button type="button" className={`tab${active === 'all' ? ' on' : ''}`} onClick={() => setActive('all')}>
                全部
              </button>
              {modules.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  className={`tab${active === m.key ? ' on' : ''}`}
                  onClick={() => setActive(m.key)}
                >
                  {m.name}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginLeft: 'auto' }}>
              <label className="input-icon hub-search">
                <Ic icon={Search01Icon} size={14} />
                <input
                  className="input"
                  value={kw}
                  onChange={(e) => setKw(e.target.value)}
                  placeholder="搜索功能点 / 数据表"
                  aria-label="搜索功能点"
                />
              </label>
              <Segmented
                size="small"
                value={view}
                onChange={setView}
                options={VIEW_OPTIONS}
                aria-label="切换视图"
              />
            </div>
          </div>

          {isFlow ? (
            <div className="flow-map" style={FLOW_BOX} aria-label="业务流程图">
              <div className="row" style={{ gap: 8, justifyContent: 'flex-end', marginBottom: 6 }}>
                <span className="tiny muted">
                  {lanes.length} 条泳道 · {nodeTotal} 个功能点 · 点击节点进入详情
                </span>
              </div>
              {lanes.map((m) => (
                <div className="flow-lane" key={m.key}>
                  <div className="flow-lane-head">
                    <b>{m.name}</b>
                    <span className="muted tiny">{m.features.length} 个功能点</span>
                  </div>
                  <div className="flow-track">
                    {m.features.map((f, i) => (
                      <button
                        key={f.key}
                        type="button"
                        className={`flow-node${f.steps?.length ? ' is-workflow' : ''}`}
                        title={`${f.name}｜${f.table}｜${f.count} 条${f.steps?.length ? `｜${f.steps.length} 个环节` : ''}`}
                        onClick={() => {
                          setPicked(f);
                          nav(`/hub/${m.key}/${f.key}`);
                        }}
                      >
                        <span className="flow-node-no">{String(i + 1).padStart(2, '0')}</span>
                        <b className="flow-node-name">{f.name}</b>
                        <span className="flow-node-meta">
                          {f.count.toLocaleString('zh-CN')} 条{f.steps?.length ? ` · ${f.steps.length} 环节` : ''}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {!lanes.length && <p className="muted small" style={{ padding: '6px 2px' }}>没有匹配的功能点</p>}
            </div>
          ) : (
            <div className="hub-table-wrap" style={{ flex: '0 0 auto', maxHeight: 'none', overflow: 'visible' }}>
              <DataTable
                dense
                scrollX={narrow ? 860 : undefined}
                rowKey={(r) => `${r.moduleKey}/${r.key}`}
                selectedKey={current ? `${current.moduleKey}/${current.key}` : undefined}
                loading={loading}
                empty="没有匹配的功能点"
                onRowClick={(r) => setPicked(r)}
                rows={rows}
                columns={[
                  { key: 'moduleName', label: '所属模块', width: 160, render: (r) => <span className="muted">{r.moduleName}</span> },
                  {
                    key: 'name',
                    label: '功能点',
                    render: (r) => (
                      <span>
                        <b>{r.name}</b>
                        {r.special ? <Tag color="cyan" style={{ marginLeft: 8 }}>分析工具</Tag> : null}
                        {r.readonly ? <Tag style={{ marginLeft: 8 }}>只读</Tag> : null}
                      </span>
                    )
                  },
                  { key: 'table', label: '承载数据表', width: 160, render: (r) => <span className="mono tiny">{r.table}</span> },
                  { key: 'count', label: '记录数', width: 90, align: 'right', render: (r) => r.count.toLocaleString('zh-CN') },
                  {
                    key: 'steps',
                    label: '流程环节',
                    width: 220,
                    render: (r) => (r.steps.length
                      ? <span className="muted small">{r.steps.map((s) => s.key).join(' → ')}</span>
                      : <span className="muted">—</span>)
                  },
                  {
                    key: '__op',
                    label: '操作',
                    width: 92,
                    render: (r) => (
                      <Button
                        size="small"
                        type="link"
                        onClick={(e) => {
                          e.stopPropagation();
                          nav(`/hub/${r.moduleKey}/${r.key}`);
                        }}
                      >
                        详情
                      </Button>
                    )
                  }
                ]}
              />
            </div>
          )}
        </section>

        <aside className="card hub-flow">
          <header className="hub-flow-head">
            <h2>业务流程</h2>
            <span className="muted small">{current ? `${current.moduleName} › ${current.name}` : '选择一个功能点'}</span>
          </header>

          {!current && <p className="muted small">左侧选择一个功能点，查看它的环节与当前分布。</p>}

          {current && current.steps.length === 0 && (
            <p className="muted small">该功能点为台账/分析类，没有办理环节；记录数 {current.count} 条。</p>
          )}

          {current && current.steps.length > 0 && (
            <>
              <ol className="flow-list">
                {current.steps.map((s, i) => {
                  const maxCount = Math.max(...current.steps.map((x) => x.count));
                  const maxIdx = current.steps.findIndex((x) => x.count === maxCount);
                  const on = s.count > 0 && i === maxIdx;
                  return (
                    <li key={s.key} className={`flow-step${on ? ' is-on' : ''}`}>
                      <span className="flow-idx">{i + 1}</span>
                      <span className="flow-name">{s.key}</span>
                      <span className="flow-count">{s.count}</span>
                      {on ? <span className="tag tag--blue">当前集中环节</span> : null}
                    </li>
                  );
                })}
              </ol>
              <dl className="hub-facts">
                <div>
                  <dt>流程记录</dt>
                  <dd>{stepTotal.toLocaleString('zh-CN')}</dd>
                </div>
                <div>
                  <dt>未落环节</dt>
                  <dd>{current.other || 0}</dd>
                </div>
                <div>
                  <dt>承载数据表</dt>
                  <dd className="mono tiny">{current.table}</dd>
                </div>
              </dl>
              <Button
                type="primary"
                block
                onClick={() => nav(`/hub/${current.moduleKey}/${current.key}`)}
              >
                进入详情视图 <Ic icon={ArrowRight01Icon} size={12} />
              </Button>
            </>
          )}

          <div className="hub-legend">
            <span><Ic icon={Task01Icon} size={12} /> 共 {totals.workflowFeatures} 个流程型功能点</span>
            <span><Ic icon={Database01Icon} size={12} /> {totals.tables} 张数据表</span>
            <span><Ic icon={CheckmarkCircle02Icon} size={12} /> 记录数与区划权限一致</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
