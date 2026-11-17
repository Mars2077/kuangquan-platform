import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Ic } from '../components/Icon';
import { useApp } from '../store.jsx';
import { biz } from '../api';
import {
  Add01Icon, ArrowRight01Icon, ChartHistogramIcon, CheckmarkBadge02Icon, Database01Icon,
  File01Icon, InboxIcon, QrCodeIcon, StarIcon, Task01Icon
} from '@hugeicons/core-free-icons';

const MODULE_ICON = {
  deposit: Database01Icon,
  plan: Task01Icon,
  rights: File01Icon,
  green: StarIcon,
  supervise: CheckmarkBadge02Icon,
  geology: ChartHistogramIcon
};

function badgeOf(f) {
  if (f.special) return { text: '分析工具', tone: 'blue' };
  if (f.score) return { text: '辅助评价', tone: 'green' };
  if (f.qr || f.archive) return { text: '一矿一档', tone: 'blue' };
  if (f.readonly) return { text: '台账查询', tone: 'grey' };
  if (f.workflow) return { text: '流程办理', tone: 'orange' };
  return { text: '登记台账', tone: 'blue' };
}

function ToneTag({ tone, children }) {
  if (tone === 'green') return <span className="tag tag--green">{children}</span>;
  if (tone === 'grey') return <span className="tag tag--grey">{children}</span>;
  if (tone === 'orange') return <span className="tag tag--orange">{children}</span>;
  if (tone === 'yellow') return <span className="tag tag--yellow">{children}</span>;
  if (tone === 'red') return <span className="tag tag--red">{children}</span>;
  return <span className="tag tag--blue">{children}</span>;
}

/* 各域台账字段不统一（流程类有 title/status，评分类只有 mine_name/stage），这里做兜底 */
function rowTitle(r) {
  return r.title || r.mine_name || r.name || r.code || `记录 #${r.id}`;
}
function rowStatus(r) {
  return r.status || r.stage || '';
}
function rowDate(r) {
  const d = r.occur_at || r.submit_at || r.audit_at || r.created_at || '';
  return String(d).slice(0, 10);
}
function toneOfStatus(s = '') {
  if (/办结|入库|完成|归档|通过/.test(s)) return 'green';
  if (/退回|驳回|逾期|预警/.test(s)) return 'red';
  if (/办理中|审核|核查|公示|初审|自评|在办/.test(s)) return 'blue';
  return 'grey';
}

export default function ModuleHome() {
  const { module } = useParams();
  const nav = useNavigate();
  const { bootMeta } = useApp();
  const [counts, setCounts] = useState({});
  const [narrow, setNarrow] = useState(false);

  const mod = useMemo(
    () => (bootMeta?.modules || []).find((m) => m.key === module),
    [bootMeta, module]
  );

  useEffect(() => {
    let alive = true;
    const features = mod?.features || [];
    if (!features.length) return undefined;
    Promise.all(
      features.map((f) =>
        biz
          .list(module, f.key, { page: 1, pageSize: 1 })
          .then((r) => [f.key, r?.data?.total ?? r?.total ?? 0])
          .catch(() => [f.key, null])
      )
    ).then((pairs) => {
      if (!alive) return;
      const next = {};
      pairs.forEach(([k, v]) => {
        next[k] = v;
      });
      setCounts(next);
    });
    return () => {
      alive = false;
    };
  }, [module, mod]);

  /* 窄屏（<620）两列：契约断点在该宽度回落为单列，这里按交互规范补两列 */
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(max-width: 620px)');
    const apply = () => setNarrow(mq.matches);
    apply();
    if (mq.addEventListener) mq.addEventListener('change', apply);
    else mq.addListener(apply);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', apply);
      else mq.removeListener(apply);
    };
  }, []);

  const total = useMemo(() => {
    const seen = new Set();
    let sum = 0;
    (mod?.features || []).forEach((f) => {
      const cnt = Number(counts[f.key]);
      if (!Number.isFinite(cnt) || cnt <= 0) return;
      /* 同一张物理表被多个功能点引用时只计一次（如 矿业权一张图 / 统计分析） */
      const key = f.table && f.table !== 'biz_record' ? f.table : `f:${f.key}`;
      if (seen.has(key)) return;
      seen.add(key);
      sum += cnt;
    });
    return sum;
  }, [counts, mod]);

  /* 本域「最近办理」：取第一个流程类功能点的最新 6 条 */
  const wf = useMemo(() => (mod?.features || []).find((f) => f.workflow) || null, [mod]);
  const [recent, setRecent] = useState(null); /* null = 加载中 */

  useEffect(() => {
    let alive = true;
    if (!mod || !wf) {
      setRecent([]);
      return undefined;
    }
    setRecent(null);
    biz
      .list(mod.key, wf.key, { page: 1, pageSize: 6 })
      .then((r) => {
        if (alive) setRecent((r?.data?.list || []).slice(0, 6));
      })
      .catch(() => {
        if (alive) setRecent([]);
      });
    return () => {
      alive = false;
    };
  }, [mod, wf]);

  if (!bootMeta) return <div className="loading"><span className="spinner" />正在加载业务规格 …</div>;
  if (!mod) {
    return (
      <div className="content">
        <div className="card">
          <div className="card-body">
            <div className="empty">
              <div className="empty-icon"><Ic icon={InboxIcon} size={26} /></div>
              <p className="empty-text">未找到业务域「{module}」</p>
              <div className="empty-action">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => nav('/portal')}>
                  返回平台分布
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const Icon = MODULE_ICON[mod.key] || InboxIcon;
  const workflowCount = mod.features.filter((f) => f.workflow).length;
  const toolCount = mod.features.filter((f) => f.special || f.score).length;
  const firstKey = mod.features[0]?.key;

  return (
    <div
      className="content"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--sp-4)',
        /* 148 = header 64 + nav 44 + .app-page padding 20×2，与 Portal 一致，铺满一屏 */
        minHeight: 'calc(100vh - 148px)'
      }}
    >
      <header className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <nav className="breadcrumb" aria-label="位置">
            <Link to="/portal">平台分布</Link>
            <span className="sep">/</span>
            <span>{mod.name}</span>
          </nav>
          <h1 className="page-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
            <Ic icon={Icon} size={22} />
            {mod.name}
          </h1>
          <p className="page-desc">{mod.intro}</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => nav('/dashboard')}>打开驾驶舱</button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => nav(`/biz/${mod.key}/${firstKey}`)}
            disabled={!firstKey}
          >
            进入首个功能
            <Ic icon={ArrowRight01Icon} size={14} />
          </button>
        </div>
      </header>

      <div className="kpi-row">
        <div className="kpi-card">
          <span className="kpi-label">业务功能点</span>
          <b className="kpi-value">{mod.features.length}<i className="kpi-unit">项</i></b>
          <span className="kpi-delta">覆盖功能设计对应章节</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">台账记录</span>
          <b className="kpi-value">{total.toLocaleString('zh-CN')}<i className="kpi-unit">条</i></b>
          <span className="kpi-delta">演示数据集，可按流程新增与流转</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">流程办理</span>
          <b className="kpi-value">{workflowCount}<i className="kpi-unit">个</i></b>
          <span className="kpi-delta">支持审核、退回补正与归档</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">统计与工具</span>
          <b className="kpi-value">{toolCount}<i className="kpi-unit">个</i></b>
          <span className="kpi-delta">实时聚合、评分类辅助决策</span>
        </div>
      </div>

      <div
        className="content-grid"
        style={{
          flex: '1 1 auto',
          alignItems: 'stretch',
          alignContent: 'start',
          ...(narrow
            ? { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }
            : {
                /* 单行模块（≤3 个功能点）拉伸上限 260，避免卡片被拉成高条 */
                gridAutoRows:
                  mod.features.length <= 3 ? 'minmax(168px, 260px)' : 'minmax(168px, 1fr)'
              })
        }}
      >
        {mod.features.map((f) => {
          const badge = badgeOf(f);
          const cnt = counts[f.key];
          const fIcon = f.special ? ChartHistogramIcon : (f.qr || f.archive ? QrCodeIcon : Add01Icon);
          return (
            <button
              key={f.key}
              type="button"
              className="card span-4"
              title={`${f.name} · ${f.desc}`}
              onClick={() => nav(`/biz/${mod.key}/${f.key}`)}
              style={narrow ? { gridColumn: 'auto', textAlign: 'left' } : { textAlign: 'left' }}
            >
              <div
                className="card-head"
                style={narrow ? { flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 6, padding: '10px 12px' } : undefined}
              >
                <h3 className="card-title">
                  <Ic icon={fIcon} size={14} />
                  {f.name}
                </h3>
                <ToneTag tone={badge.tone}>{badge.text}</ToneTag>
              </div>
              <div
                className="card-body"
                style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
              >
                <p className="tiny muted" style={{ lineHeight: 1.7 }}>{f.desc}</p>
                <p className="tiny" style={{ marginTop: 8, color: 'var(--text-2)' }}>
                  {cnt === undefined ? '统计中 …' : cnt === null ? '暂无统计' : `${cnt.toLocaleString('zh-CN')} 条记录`}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="card" style={{ marginTop: 'auto' }}>
        <div className="card-head">
          <h3 className="card-title">
            最近办理
            <span className="card-sub">
              {wf
                ? `${wf.name} · ${recent === null ? '加载中' : `最新 ${recent.length} 条`}`
                : '本域暂无流程类功能点'}
            </span>
          </h3>
          <button
            type="button"
            className="btn btn-text btn-sm"
            onClick={() => nav(`/biz/${mod.key}/${wf ? wf.key : firstKey}`)}
            disabled={!wf && !firstKey}
          >
            查看全部
            <Ic icon={ArrowRight01Icon} size={14} />
          </button>
        </div>
        <div className="card-body" style={{ padding: '2px var(--sp-4) 8px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: narrow ? 'minmax(0, 1fr)' : 'minmax(0, 2fr) minmax(0, 1fr)',
              gap: 'var(--sp-5)',
              alignItems: 'start'
            }}
          >
            <div>
              {recent === null ? (
                <div className="skeleton" style={{ padding: '10px 0' }}>
                  <span className="skeleton-line" />
                  <span className="skeleton-line" />
                  <span className="skeleton-line" />
                </div>
              ) : recent.length === 0 ? (
                <div className="empty" style={{ minHeight: 96, padding: 'var(--sp-4) 0' }}>
                  <div className="empty-icon"><Ic icon={InboxIcon} size={22} /></div>
                  <p className="empty-text">暂无办理记录</p>
                </div>
              ) : (
                <ul
                  className="list"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: narrow ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))',
                    columnGap: 'var(--sp-4)',
                    margin: 0
                  }}
                >
                  {recent.map((r, i) => {
                    const st = rowStatus(r);
                    const open = () => nav(`/biz/${mod.key}/${wf.key}`);
                    return (
                      <li
                        key={r.id ?? i}
                        className="list-item"
                        role="button"
                        tabIndex={0}
                        title={rowTitle(r)}
                        onClick={open}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            open();
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <span
                          className="list-main"
                          style={{ whiteSpace: 'normal', overflow: 'visible', textOverflow: 'clip', lineHeight: 1.5 }}
                        >
                          {rowTitle(r)}
                        </span>
                        <span className="list-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          {st ? <ToneTag tone={toneOfStatus(st)}>{st}</ToneTag> : null}
                          <span>{rowDate(r)}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                ...(narrow
                  ? null
                  : { borderLeft: '1px solid var(--line-faint)', paddingLeft: 'var(--sp-4)' })
              }}
            >
              <p className="tiny muted" style={{ lineHeight: 1.8 }}>{mod.intro}</p>
              <p className="tiny" style={{ color: 'var(--text-2)' }}>
                台账 <span className="num">{total.toLocaleString('zh-CN')}</span> 条 · 流程{' '}
                <span className="num">{workflowCount}</span> 项 · 功能{' '}
                <span className="num">{mod.features.length}</span> 个
              </p>
            </div>
          </div>
        </div>
      </div>

      <p className="tiny muted" style={{ lineHeight: 1.8 }}>
        说明：本页功能点与《功能设计文档》章节一一对应；演示数据由 seed 生成，仅用于功能验证，不代表真实统计口径。
      </p>
    </div>
  );
}
