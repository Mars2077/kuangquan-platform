import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Drawer from '../components/Drawer.jsx';
import { Ic } from '../components/Icon';
import { useApp, useFetch } from '../store.jsx';
import { biz } from '../api';
import SpecialPanel from './SpecialPanel.jsx';
import {
  Add01Icon, Cancel01Icon, ChartHistogramIcon, Download01Icon, InboxIcon, QrCodeIcon,
  Refresh01Icon, Search01Icon, Tick02Icon
} from '@hugeicons/core-free-icons';

/**
 * 功能点通用页（40 个功能点共用）。
 * 版式：页头 → KPI → 工具条（状态胶囊 / 筛选 / 关键词 / 重置 / 导出 / 新增）→ 台账表 → 分页。
 * 详情、编辑、流程办理、删除确认、分析工具统一收敛到右侧抽屉，页面内不再并行多个弹层。
 */

const FILTER_LABEL = {
  region: '行政区划', mineral: '矿种', stage: '办理环节', status: '状态', level: '级别',
  kind: '类型', category: '类别', result: '结果', listType: '名单类型', zoneType: '规划分区',
  rightType: '权类', greenLevel: '绿色等级', unitType: '单位类型', type: '类型',
  dept: '责任部门', year: '年度', dateRange: '时间区间', kw: '关键词'
};
const FILTER_PARAM = {
  region: 'region', mineral: 'mineral', stage: 'stage', status: 'status', level: 'level',
  kind: 'kind', category: 'category', result: 'result', listType: 'listType', zoneType: 'zoneType',
  rightType: 'rightType', greenLevel: 'greenLevel', unitType: 'unitType', type: 'type',
  dept: 'dept', year: 'year'
};

const PAGE_SIZE = 20;

/** 窄屏判定：<620px 时筛选区改为两列换行，避免落进横向滚动区。 */
function useNarrow(px) {
  const query = `(max-width: ${px}px)`;
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia(query).matches
      : false
  );
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia(query);
    const onChange = (e) => setNarrow(e.matches);
    setNarrow(mq.matches);
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  }, [query]);
  return narrow;
}

const nf = (v, d = 2) =>
  Number.isFinite(Number(v))
    ? Number(v).toLocaleString('zh-CN', { minimumFractionDigits: d, maximumFractionDigits: d })
    : v;

const text = (v) => (v === null || v === undefined || v === '' ? '—' : String(v));

function fmtCell(value, meta) {
  if (value === null || value === undefined || value === '') return '—';
  if (!meta) return String(value);
  if (meta.type === 'money' || meta.type === 'number') return nf(value, 2);
  return String(value);
}

const ROW_ACTIONS = { display: 'flex', justifyContent: 'flex-end', gap: 2, whiteSpace: 'nowrap' };
const ACTION_COL_W = 168;

/* 列宽提示：编号/日期定宽，名称类自适应（保底 320），其余按语义定宽 */
function colWidthOf(key, meta) {
  if (/^(title|name|mine_name|plan_name)$/.test(key)) return null;
  if (key === 'license_no') return 200;
  if (/^(code|order_no|review_no|alert_no)$/.test(key)) return 150;
  if (key === 'region_name') return 108;
  if (/^(mineral|category|kind|type|zone_type|out_type|unit_type|right_type|gdp_type|device_type)$/.test(key)) return 108;
  if (/^(stage|progress)$/.test(key)) return 120;
  if (/^(status|online|warn)$/.test(key)) return 96;
  if (/^(level|result|risk|degree|apply_level|list_type)$/.test(key)) return 100;
  if (/(_at|_from|_to|_date|_since)$/.test(key)) return 118;
  if (meta.type === 'money') return 116;
  if (meta.type === 'number') return 104;
  return 120;
}
const FORM_GRID = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 'var(--sp-3)'
};
const FORM_FULL = { gridColumn: '1 / -1' };

export default function FeaturePage() {
  const { module, feature } = useParams();
  const nav = useNavigate();
  const { bootMeta, toast } = useApp();
  const narrow = useNarrow(620);
  const [filters, setFilters] = useState({});
  const [kw, setKw] = useState('');
  const [page, setPage] = useState(1);
  const [panel, setPanel] = useState(null);
  const [detailTab, setDetailTab] = useState('info');
  const [form, setForm] = useState({});
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const mod = useMemo(() => (bootMeta?.modules || []).find((m) => m.key === module), [bootMeta, module]);
  const spec = useMemo(() => mod?.features.find((f) => f.key === feature), [mod, feature]);
  const fields = bootMeta?.fields || {};
  const metaOf = (k) => fields[k] || { label: k, type: 'text' };

  useEffect(() => {
    setFilters({});
    setKw('');
    setPage(1);
    setPanel(null);
  }, [module, feature]);

  const query = useMemo(() => {
    const q = { page, pageSize: PAGE_SIZE };
    Object.entries(filters).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '' || v === 'all') return;
      const p = FILTER_PARAM[k];
      if (p) q[p] = v;
    });
    if (filters.start) q.start = filters.start;
    if (filters.end) q.end = filters.end;
    if (kw.trim()) q.kw = kw.trim();
    return q;
  }, [filters, kw, page]);

  const listQ = useFetch(
    () => (spec ? biz.list(module, feature, query) : Promise.resolve(null)),
    [module, feature, JSON.stringify(query), spec?.key]
  );

  if (!bootMeta) {
    return (
      <div className="skeleton">
        <i className="skeleton-line" />
        <i className="skeleton-line" />
        <i className="skeleton-line" />
      </div>
    );
  }

  if (!spec) {
    return (
      <div className="content">
        <div className="card">
          <div className="card-body">
            <div className="empty is-error">
              <span className="empty-icon">!</span>
              <p className="empty-text">未找到功能「{module}/{feature}」，请从业务导航重新进入。</p>
              <div className="empty-action">
                <button type="button" className="btn btn-ghost" onClick={() => nav(`/biz/${module}`)}>
                  返回业务首页
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const data = listQ.data;
  const rows = data?.list || [];
  const options = data?.options || {};
  const stats = data?.stats || { total: 0, byStatus: [], sums: {} };
  const total = Number(stats.total || 0);
  const reload = () => listQ.reload();

  const wf = spec.workflow;
  const formFields = spec.form || [];
  const hasDate = spec.filters.includes('dateRange');
  const filterKeys = spec.filters.filter((f) => f !== 'kw' && f !== 'dateRange');
  const byStatus = stats.byStatus || [];

  const setF = (k, v) => {
    setFilters((s) => ({ ...s, [k]: v }));
    setPage(1);
  };
  const resetFilters = () => {
    setFilters({});
    setKw('');
    setPage(1);
  };

  const optionFor = (k) => {
    if (k === 'region') return (bootMeta.regions || []).map((r) => ({ value: r.value ?? r.code, label: r.label ?? r.name }));
    const src = options[FILTER_PARAM[k] || k] || [];
    return src.map((v) => ({ value: v, label: v }));
  };

  const openDetail = (row) => {
    setDetailTab('info');
    setComment('');
    setPanel({ mode: 'detail', row });
    biz
      .detail(module, feature, row.id)
      .then((r) => {
        const full = r?.data || r;
        if (!full || typeof full !== 'object') return;
        setPanel((p) => (p && p.mode === 'detail' && p.row?.id === row.id ? { ...p, row: { ...p.row, ...full } } : p));
      })
      .catch(() => {});
  };
  const openForm = (row) => {
    setForm(row ? { ...row } : {});
    setPanel({ mode: 'form', row: row || null });
  };
  const closePanel = () => setPanel(null);

  const doExport = async () => {
    try {
      await biz.export(module, feature, query, `${spec.name}.xlsx`);
      toast('导出已开始');
    } catch (e) {
      toast(e.message || '导出失败', 'err');
    }
  };

  const submitForm = async () => {
    const body = {};
    formFields.forEach((k) => {
      const v = form[k];
      if (v !== undefined && v !== '') body[k] = v;
    });
    if (Object.keys(body).length === 0) {
      toast('请至少填写一个字段', 'err');
      return;
    }
    setBusy(true);
    try {
      if (form.id) {
        await biz.update(module, feature, form.id, body);
        toast('已保存修改');
      } else {
        await biz.create(module, feature, body);
        toast('已新增记录');
      }
      closePanel();
      reload();
    } catch (e) {
      toast(e.message || '保存失败', 'err');
    } finally {
      setBusy(false);
    }
  };

  const removeRow = async (row) => {
    setBusy(true);
    try {
      await biz.remove(module, feature, row.id);
      toast('已删除');
      closePanel();
      reload();
    } catch (e) {
      toast(e.message || '删除失败', 'err');
    } finally {
      setBusy(false);
    }
  };

  const doAction = async (kind) => {
    const row = panel?.row;
    if (!row) return;
    setBusy(true);
    try {
      await biz.action(module, feature, row.id, { action: kind, comment });
      toast(kind === 'reject' ? '已退回补正' : '已提交下一环节');
      closePanel();
      reload();
    } catch (e) {
      toast(e.message || '流转失败', 'err');
    } finally {
      setBusy(false);
    }
  };

  const stepIndex = (row) => {
    if (!wf || !row) return 0;
    const i = wf.steps.findIndex((s) => s.key === row[wf.field]);
    return i < 0 ? 0 : i;
  };

  const curStep = panel?.row ? wf?.steps[stepIndex(panel.row)] : null;

  /* KPI：记录总数 + 状态分布（不足 4 张时用流程/合计信息补齐） */
  const kpis = [{ label: '记录总数', value: total.toLocaleString('zh-CN'), unit: '条', delta: '按行政区划权限隔离' }];
  byStatus.slice(0, 3).forEach((s) => {
    const pct = total ? Math.round((Number(s.value) / total) * 100) : 0;
    kpis.push({ label: s.name || '未分类', value: Number(s.value || 0).toLocaleString('zh-CN'), unit: '条', delta: `占全部 ${pct}%` });
  });
  Object.entries(stats.sums || {}).slice(0, 2).forEach(([k, v]) => {
    kpis.push({ label: `${metaOf(k).label}合计`, value: nf(v, 2), unit: '', delta: '当前筛选口径' });
  });
  if (kpis.length < 4) {
    kpis.push({
      label: '办理环节',
      value: wf ? String(wf.steps.length) : '—',
      unit: wf ? '个' : '',
      delta: wf ? '可在线流转' : '台账只读'
    });
  }
  if (kpis.length < 4) {
    kpis.push({ label: '本页记录', value: rows.length.toLocaleString('zh-CN'), unit: '条', delta: `第 ${page} 页` });
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageNums = [];
  {
    const from = Math.max(1, Math.min(page - 2, pages - 4));
    const to = Math.min(pages, from + 4);
    for (let i = from; i <= to; i += 1) pageNums.push(i);
  }

  const colCount = spec.columns.length + 1;
  const colWidths = spec.columns.map((k) => colWidthOf(k, metaOf(k)));
  /* 固定列宽合计 + 名称保底 320 + 单元格内距，窄屏走容器横向滚动，不挤压文字 */
  const fixedSum = colWidths.reduce((s, w) => s + (w || 0), 0) + ACTION_COL_W;
  const tableMin = Math.max(900, fixedSum + 340);

  const detailKeys = [];
  {
    const seen = new Set();
    spec.columns.concat(['status', 'stage', 'remark']).forEach((k) => {
      if (seen.has(k)) return;
      seen.add(k);
      detailKeys.push(k);
    });
  }

  const renderField = (k) => {
    const m = metaOf(k);
    const val = form[k] ?? '';
    const set = (v) => setForm((s) => ({ ...s, [k]: v }));
    const id = `f-${k}`;
    let input;
    if (k === 'region_name') {
      input = (
        <select id={id} className="select" value={val} onChange={(e) => set(e.target.value)}>
          <option value="">请选择</option>
          {(bootMeta.regions || []).map((r) => (
            <option key={r.value ?? r.code} value={r.name ?? r.label}>{r.label ?? r.name}</option>
          ))}
        </select>
      );
    } else if (k === 'mineral') {
      input = (
        <select id={id} className="select" value={val} onChange={(e) => set(e.target.value)}>
          <option value="">请选择</option>
          {(bootMeta.minerals || []).map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      );
    } else if (m.type === 'status' && options.status?.length) {
      input = (
        <select id={id} className="select" value={val} onChange={(e) => set(e.target.value)}>
          <option value="">请选择</option>
          {options.status.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      );
    } else if (m.type === 'longtext') {
      input = <textarea id={id} className="textarea" rows={2} value={val} onChange={(e) => set(e.target.value)} />;
    } else {
      input = (
        <input
          id={id}
          className="input"
          type={m.type === 'date' ? 'date' : m.type === 'number' || m.type === 'money' ? 'number' : 'text'}
          value={val}
          onChange={(e) => set(e.target.value)}
        />
      );
    }
    return (
      <div className="field" key={k} style={m.type === 'longtext' ? FORM_FULL : undefined}>
        <label className="field-label" htmlFor={id}>{m.label}</label>
        {input}
      </div>
    );
  };

  const panelTitle =
    panel?.mode === 'form'
      ? `${form.id ? '编辑' : '新增'}：${spec.name}`
      : panel?.mode === 'del'
        ? '确认删除'
        : panel?.mode === 'special'
          ? '分析工具'
          : panel?.row?.name || panel?.row?.title || panel?.row?.mine_name || panel?.row?.review_no || `${spec.name}详情`;

  const panelSubtitle =
    panel?.mode === 'form'
      ? '提交后写入业务台账，并按当前账号的行政区划权限校验'
      : panel?.mode === 'special'
        ? spec.desc
        : panel?.row
          ? `记录编号 #${panel.row.id}`
          : '';

  const panelFooter = () => {
    if (panel?.mode === 'form') {
      return (
        <>
          <button type="button" className="btn btn-ghost" onClick={closePanel}>取消</button>
          <button type="button" className="btn btn-primary" onClick={submitForm} disabled={busy}>
            <Ic icon={Tick02Icon} size={14} /> 保存
          </button>
        </>
      );
    }
    if (panel?.mode === 'del') {
      return (
        <>
          <button type="button" className="btn btn-ghost" onClick={closePanel}>取消</button>
          <button type="button" className="btn btn-danger" onClick={() => removeRow(panel.row)} disabled={busy}>
            确认删除
          </button>
        </>
      );
    }
    if (panel?.mode === 'detail') {
      return (
        <>
          <button type="button" className="btn btn-ghost" onClick={closePanel}>关闭</button>
          {spec.archive && panel.row && (
            <button type="button" className="btn btn-ghost" onClick={() => nav(`/archive/${panel.row.id}`)}>一矿一档</button>
          )}
          {formFields.length > 0 && panel.row && (
            <button type="button" className="btn btn-ghost" onClick={() => openForm(panel.row)}>编辑</button>
          )}
        </>
      );
    }
    return <button type="button" className="btn btn-ghost" onClick={closePanel}>关闭</button>;
  };

  return (
    <>
      <header className="page-head">
        <div>
          <nav className="breadcrumb" aria-label="面包屑">
            <a
              href={`/biz/${module}`}
              onClick={(e) => {
                e.preventDefault();
                nav(`/biz/${module}`);
              }}
            >
              {mod?.name || module}
            </a>
            <span className="sep">/</span>
            <span>{spec.name}</span>
          </nav>
          <h1 className="page-title" style={{ marginTop: 6 }}>{spec.name}</h1>
          <p className="page-desc">{spec.desc}</p>
        </div>
        <div className="page-actions">
          {spec.special && (
            <button type="button" className="btn btn-ghost" onClick={() => setPanel({ mode: 'special' })}>
              <Ic icon={ChartHistogramIcon} size={14} /> 分析工具
            </button>
          )}
          {(spec.qr || spec.archive) && (
            <button type="button" className="btn btn-ghost" onClick={() => nav(`/archive/${rows[0]?.id ?? 1}`)}>
              <Ic icon={QrCodeIcon} size={14} /> 一矿一档
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={reload}>
            <Ic icon={Refresh01Icon} size={14} /> 刷新
          </button>
        </div>
      </header>

      <div className="content">
        <div className="kpi-row">
        {kpis.slice(0, 4).map((k, i) => (
          <div className="kpi-card" key={`${k.label}-${i}`}>
            <span className="kpi-label">{k.label}</span>
            <b className="kpi-value">
              {k.value}
              {k.unit ? <i className="kpi-unit">{k.unit}</i> : null}
            </b>
            <span className="kpi-delta flat">{k.delta}</span>
          </div>
        ))}
      </div>

      <div className="toolbar">
        <div
          className="toolbar-filters"
          style={{
            minWidth: 0,
            maxWidth: '100%',
            flexWrap: narrow ? 'wrap' : undefined,
            overflowX: narrow ? 'visible' : undefined
          }}
        >
          {byStatus.length > 0 && (
            <button
              type="button"
              className={`chip${!filters.status ? ' is-on' : ''}`}
              onClick={() => setF('status', '')}
            >
              全部
            </button>
          )}
          {byStatus.map((s) => (
            <button
              type="button"
              key={s.name || 'none'}
              className={`chip${filters.status === s.name ? ' is-on' : ''}`}
              onClick={() => setF('status', filters.status === s.name ? '' : s.name)}
            >
              {s.name || '未分类'} {s.value}
            </button>
          ))}
          {filterKeys.map((k) => (
            <select
              key={k}
              className="select"
              style={narrow ? { width: 'auto', flex: '1 1 46%', minWidth: 0 } : { width: 'auto', minWidth: 120 }}
              value={filters[k] || ''}
              onChange={(e) => setF(k, e.target.value)}
              aria-label={FILTER_LABEL[k] || k}
            >
              <option value="">{FILTER_LABEL[k] || k}（全部）</option>
              {optionFor(k).map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          ))}
          {hasDate && (
            <>
              <input
                type="date"
                className="input"
                style={narrow ? { width: 'auto', flex: '1 1 46%', minWidth: 0 } : { width: 'auto' }}
                value={filters.start || ''}
                onChange={(e) => setF('start', e.target.value)}
                aria-label="开始日期"
              />
              <input
                type="date"
                className="input"
                style={narrow ? { width: 'auto', flex: '1 1 46%', minWidth: 0 } : { width: 'auto' }}
                value={filters.end || ''}
                onChange={(e) => setF('end', e.target.value)}
                aria-label="结束日期"
              />
            </>
          )}
        </div>
        <div className="toolbar-search">
          <Ic icon={Search01Icon} size={14} />
          <input
            className="input"
            style={{ width: 'auto', flex: 1, minWidth: 0 }}
            placeholder="按名称 / 编号检索"
            value={kw}
            onChange={(e) => {
              setKw(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="toolbar-actions" style={{ minWidth: 0, maxWidth: '100%' }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={resetFilters}>重置</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={doExport}>
            <Ic icon={Download01Icon} size={14} /> 导出
          </button>
          {formFields.length > 0 && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => openForm(null)}>
              <Ic icon={Add01Icon} size={14} /> 新增
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3 className="card-title">
            {spec.name}台账
            <span className="card-sub">共 {total.toLocaleString('zh-CN')} 条</span>
          </h3>
          <span className="card-sub">点击行查看详情</span>
        </div>
        <div style={{ padding: 0 }}>
          <div className="table-wrap" style={{ border: 0, borderRadius: 0 }}>
            <table className="data-table" style={{ minWidth: tableMin, tableLayout: 'fixed' }}>
              <colgroup>
                {spec.columns.map((k, i) => (
                  <col key={k} style={colWidths[i] ? { width: colWidths[i] } : undefined} />
                ))}
                <col style={{ width: ACTION_COL_W }} />
              </colgroup>
              <thead>
                <tr>
                  {spec.columns.map((k) => {
                    const m = metaOf(k);
                    const right = ['money', 'number'].includes(m.type);
                    return (
                      <th key={k} align={right ? 'right' : undefined} className={right ? 'num' : undefined}>
                        {m.label}
                      </th>
                    );
                  })}
                  <th className="col-actions">操作</th>
                </tr>
              </thead>
              <tbody>
                {listQ.loading && (
                  <tr>
                    <td colSpan={colCount}>
                      <div className="skeleton">
                        <i className="skeleton-line" />
                        <i className="skeleton-line" />
                        <i className="skeleton-line" />
                      </div>
                    </td>
                  </tr>
                )}
                {!listQ.loading && listQ.error && (
                  <tr>
                    <td colSpan={colCount}>
                      <div className="empty is-error">
                        <span className="empty-icon">!</span>
                        <p className="empty-text">{listQ.error.message || '数据加载失败，请重试'}</p>
                        <div className="empty-action">
                          <button type="button" className="btn btn-ghost btn-sm" onClick={reload}>重新加载</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                {!listQ.loading && !listQ.error && rows.length === 0 && (
                  <tr>
                    <td colSpan={colCount}>
                      <div className="empty">
                        <span className="empty-icon"><Ic icon={InboxIcon} size={20} /></span>
                        <p className="empty-text">当前筛选条件下没有记录</p>
                        <div className="empty-action">
                          <button type="button" className="btn btn-ghost btn-sm" onClick={resetFilters}>清除筛选</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                {!listQ.loading && !listQ.error && rows.map((row) => (
                  <tr key={row.id} onClick={() => openDetail(row)} style={{ cursor: 'pointer' }}>
                    {spec.columns.map((k) => {
                      const m = metaOf(k);
                      const right = ['money', 'number'].includes(m.type);
                      return (
                        <td
                          key={k}
                          align={right ? 'right' : undefined}
                          className={right ? 'num' : undefined}
                          style={/^(code|license_no|order_no|review_no|alert_no)$/.test(k) ? { overflowWrap: 'anywhere' } : undefined}
                        >
                          {m.type === 'status' && row[k] ? (
                            <span className="tag tag--blue">{row[k]}</span>
                          ) : (
                            fmtCell(row[k], m)
                          )}
                        </td>
                      );
                    })}
                    <td className="col-actions">
                      <div style={ROW_ACTIONS}>
                        <button
                          type="button"
                          className="btn btn-text btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetail(row);
                          }}
                        >
                          详情
                        </button>
                        {formFields.length > 0 && (
                          <button
                            type="button"
                            className="btn btn-text btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openForm(row);
                            }}
                          >
                            编辑
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-text btn-sm"
                          style={{ color: 'var(--red)' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPanel({ mode: 'del', row });
                          }}
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card-body" style={{ paddingTop: 10, paddingBottom: 12 }}>
          <div className="pager">
            <span className="pager-info">
              共 {total.toLocaleString('zh-CN')} 条 · 第 {page}/{pages} 页
            </span>
            <button type="button" className="pager-btn" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              上一页
            </button>
            {pageNums.map((n) => (
              <button
                type="button"
                key={n}
                className={`pager-btn${n === page ? ' is-on' : ''}`}
                onClick={() => setPage(n)}
              >
                {n}
              </button>
            ))}
            <button type="button" className="pager-btn" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>
              下一页
            </button>
          </div>
        </div>
      </div>

      <Drawer
        open={!!panel}
        title={panelTitle}
        subtitle={panelSubtitle}
        onClose={closePanel}
        footer={panelFooter()}
        width={panel?.mode === 'special' ? 720 : 560}
        className={panel?.mode === 'special' ? 'drawer--lg' : ''}
      >
        {panel?.mode === 'detail' && panel.row && (
          <>
            <div className="tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={detailTab === 'info'}
                className={`tab${detailTab === 'info' ? ' is-on' : ''}`}
                onClick={() => setDetailTab('info')}
              >
                基本信息
              </button>
              {wf && (
                <button
                  type="button"
                  role="tab"
                  aria-selected={detailTab === 'flow'}
                  className={`tab${detailTab === 'flow' ? ' is-on' : ''}`}
                  onClick={() => setDetailTab('flow')}
                >
                  办理流程
                </button>
              )}
            </div>

            {detailTab === 'info' && (
              <div className="desc-list" style={{ marginTop: 12 }}>
                {detailKeys.map((k) => {
                  const v = panel.row[k];
                  if (v === undefined || v === null || v === '') return null;
                  return (
                    <div className="desc-row" key={k}>
                      <span className="desc-key">{metaOf(k).label}</span>
                      <span className="desc-value">{fmtCell(v, metaOf(k))}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {detailTab === 'flow' && wf && (
              <div style={{ marginTop: 12 }}>
                <div className="steps">
                  {wf.steps.map((s, i) => {
                    const idx = stepIndex(panel.row);
                    return (
                      <div className={`step${i < idx ? ' is-done' : ''}${i === idx ? ' is-on' : ''}`} key={s.key}>
                        <b>{s.key}</b>
                        <small>{s.role || '—'}</small>
                      </div>
                    );
                  })}
                </div>
                <div className="alert-line" style={{ marginTop: 12 }}>
                  当前环节：{curStep?.key || '—'}；承办角色：{curStep?.role || '不限'}。提交后进入下一环节，终态自动置为「已办结」。
                </div>
                <div className="field" style={{ marginTop: 12 }}>
                  <label className="field-label" htmlFor="wf-comment">办理意见</label>
                  <textarea
                    id="wf-comment"
                    className="textarea"
                    rows={3}
                    placeholder="填写审核意见、补正要求或备案说明"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 12, flexWrap: 'wrap' }}>
                  {wf.rejectTo && (
                    <button type="button" className="btn btn-danger" onClick={() => doAction('reject')} disabled={busy}>
                      <Ic icon={Cancel01Icon} size={14} /> 退回补正
                    </button>
                  )}
                  <button type="button" className="btn btn-primary" onClick={() => doAction('next')} disabled={busy}>
                    <Ic icon={Tick02Icon} size={14} /> 提交下一环节
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {panel?.mode === 'form' && (
          <div style={FORM_GRID}>
            {formFields.map((k) => renderField(k))}
            {formFields.length === 0 && (
              <p className="page-desc" style={{ gridColumn: '1 / -1', margin: 0 }}>该功能为只读台账，不支持新增或编辑。</p>
            )}
          </div>
        )}

        {panel?.mode === 'del' && panel.row && (
          <div>
            <div className="alert-line err">
              将删除记录「{text(panel.row.name || panel.row.title || panel.row.mine_name || `#${panel.row.id}`)}」，该操作不可撤销，相关流程记录一并清除。
            </div>
            <p className="page-desc" style={{ marginTop: 12 }}>
              记录编号 #{panel.row.id}；删除后如需恢复，请通过数据仓的历史备份导入。
            </p>
          </div>
        )}

        {panel?.mode === 'special' && (
          <SpecialPanel kind={spec.special} spec={spec} onChanged={reload} />
        )}
      </Drawer>
      </div>
    </>
  );
}
