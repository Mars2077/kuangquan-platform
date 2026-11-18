import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Tag, Select, DatePicker, Input, Pagination } from 'antd';
import dayjs from 'dayjs';
import Drawer from '../components/Drawer.jsx';
import { DataTable } from '../components/DataTable.jsx';
import { Ic } from '../components/Icon';
import { useApp, useFetch } from '../store.jsx';
import { biz, hub as hubApi } from '../api';
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

/* 环节责任角色的中文口径（features.js 里 role 存的是 county/city/province/enterprise） */
const ROLE_LABEL = { county: '县级', city: '市级', province: '省级', enterprise: '企业' };
const roleText = (r) => ROLE_LABEL[r] || r || '';

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

export default function FeaturePage({ hub: isHub = false }) {
  const { module, feature } = useParams();
  const nav = useNavigate();
  const { bootMeta, toast, user } = useApp();
  const narrow = useNarrow(620);
  const [filters, setFilters] = useState({});
  const [kw, setKw] = useState('');
  const [page, setPage] = useState(1);
  const [panel, setPanel] = useState(null);
  const [detailTab, setDetailTab] = useState('info');
  const [form, setForm] = useState({});
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  /* 状态分布快照：按状态筛选后接口只返回被选状态，胶囊需保留完整分布才能再次点击取消 */
  const statusSnap = useRef([]);

  /* 统一纳管视图下，需要每个环节的记录数（来自 /api/hub/overview 的真实聚合） */
  const hubQ = useFetch(
    () => (isHub ? hubApi.overview({ code: user?.region_code }) : Promise.resolve(null)),
    [isHub, user?.region_code]
  );
  const flowInfo = useMemo(() => {
    const mm = (hubQ.data?.modules || []).find((x) => x.key === module);
    return (mm?.features || []).find((f) => f.key === feature) || null;
  }, [hubQ.data, module, feature]);

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

  /* 未按状态筛选时刷新快照；筛选状态时继续用快照渲染胶囊，保证分布不塌缩 */
  useEffect(() => {
    const list = listQ.data?.stats?.byStatus;
    if (!filters.status && Array.isArray(list) && list.length) statusSnap.current = list;
  }, [filters.status, listQ.data]);

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
  const filterKeys = spec.filters.filter((f) => f !== 'kw' && f !== 'dateRange' && f !== 'status');
  const byStatus = stats.byStatus || [];
  /* 状态分布：胶囊与 KPI 共用同一份概览，避免「chips / 下拉 / KPI」三处重复入口 */
  const statusOverview = filters.status && statusSnap.current.length ? statusSnap.current : byStatus;
  const statusTotal = statusOverview.reduce((s, x) => s + Number(x.value || 0), 0);

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

  /* KPI：记录总数 + 状态分布（概览，只读展示；筛选入口统一在工具条胶囊） */
  const kpis = [{ label: '记录总数', value: total.toLocaleString('zh-CN'), unit: '条', delta: '按行政区划权限隔离' }];
  statusOverview.slice(0, 3).forEach((s) => {
    const base = statusTotal || total;
    const pct = base ? Math.round((Number(s.value) / base) * 100) : 0;
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
            {isHub ? (
              <>
                <a
                  href="/hub"
                  onClick={(e) => {
                    e.preventDefault();
                    nav('/hub');
                  }}
                >
                  业务中枢
                </a>
                <span className="sep">/</span>
              </>
            ) : null}
            <a
              href={isHub ? `/hub?module=${module}` : `/biz/${module}`}
              onClick={(e) => {
                e.preventDefault();
                nav(isHub ? '/hub' : `/biz/${module}`);
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

      {isHub && spec.workflow ? (
        <section className="card flow-strip" aria-label="业务流程环节">
          <header className="flow-strip-head">
            <b>业务流程</b>
            <span className="muted small">
              {mod?.name} › {spec.name} · 共 {spec.workflow.steps.length} 个环节
            </span>
          </header>
          <ol className="flow-line">
            {spec.workflow.steps.map((s, i) => {
              const info = flowInfo?.steps?.find((x) => x.key === s.key);
              const counts = (flowInfo?.steps || []).map((x) => x.count);
              const max = counts.length ? Math.max(...counts) : 0;
              const on = (info?.count || 0) > 0 && info.count === max;
              return (
                <li key={s.key} className={`flow-node${on ? ' is-on' : ''}`}>
                  <span className="flow-node-idx">{i + 1}</span>
                  <span className="flow-node-name">{s.key}</span>
                  <span className="flow-node-count">{info ? info.count : '—'}</span>
                  {s.role ? <span className="flow-node-role">{roleText(s.role)}</span> : null}
                </li>
              );
            })}
            {flowInfo?.other ? (
              <li className="flow-node is-other">
                <span className="flow-node-idx">·</span>
                <span className="flow-node-name">未落环节</span>
                <span className="flow-node-count">{flowInfo.other}</span>
              </li>
            ) : null}
          </ol>
          <p className="muted tiny" style={{ margin: '6px 0 0' }}>
            环节顺序取自功能设计文档的功能定义；数量为当前区划权限内该环节的记录数，最多者标为「当前集中环节」。
          </p>
        </section>
      ) : null}

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
          {statusOverview.length > 0 && (
            <button
              type="button"
              className={`chip${!filters.status ? ' is-on' : ''}`}
              onClick={() => setF('status', '')}
            >
              全部
            </button>
          )}
          {statusOverview.map((s) => (
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
            <Select
              key={k}
              size="small"
              style={narrow ? { flex: '1 1 46%', minWidth: 0 } : { minWidth: 128 }}
              value={filters[k] || ''}
              onChange={(v) => setF(k, v)}
              placeholder={`${FILTER_LABEL[k] || k}（全部）`}
              options={[{ value: '', label: `${FILTER_LABEL[k] || k}（全部）` },
                ...optionFor(k).map((o) => ({ value: o.value, label: o.label }))]}
              popupMatchSelectWidth={220}
            />
          ))}
          {hasDate && (
            <>
              <DatePicker
                size="small"
                placeholder="开始日期"
                style={narrow ? { flex: '1 1 46%', minWidth: 0 } : undefined}
                value={filters.start ? dayjs(filters.start) : null}
                onChange={(d, s) => setF('start', s || '')}
                allowClear
              />
              <DatePicker
                size="small"
                placeholder="结束日期"
                style={narrow ? { flex: '1 1 46%', minWidth: 0 } : undefined}
                value={filters.end ? dayjs(filters.end) : null}
                onChange={(d, s) => setF('end', s || '')}
                allowClear
              />
            </>
          )}
        </div>
        <div className="toolbar-search">
          <Input
            size="small"
            allowClear
            prefix={<Ic icon={Search01Icon} size={14} />}
            placeholder="按名称 / 编号检索"
            value={kw}
            onChange={(e) => {
              setKw(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="toolbar-actions" style={{ minWidth: 0, maxWidth: '100%' }}>
          <Button size="small" onClick={resetFilters}>重置</Button>
          <Button size="small" icon={<Ic icon={Download01Icon} size={14} />} onClick={doExport}>
            导出
          </Button>
          {formFields.length > 0 && (
            <Button size="small" type="primary" icon={<Ic icon={Add01Icon} size={14} />} onClick={() => openForm(null)}>
              新增
            </Button>
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
          <DataTable
            dense
            scrollX={narrow ? tableMin : undefined}
            columns={[
              ...spec.columns.map((k, idx) => {
                const m = metaOf(k);
                const right = ['money', 'number'].includes(m.type);
                return {
                  key: k,
                  label: m.label,
                  align: right ? 'right' : undefined,
                  /* 窄屏：定宽 + 单行省略，避免长文本把行高堆到 300px+ */
                  width: narrow ? (colWidths[idx] || 140) : undefined,
                  ellipsis: narrow && m.type !== 'status' ? true : undefined,
                  render: (row) => (m.type === 'status' && row[k]
                    ? <Tag color="blue">{row[k]}</Tag>
                    : (
                      <span title={row[k] == null ? '' : String(row[k])}>
                        {fmtCell(row[k], m)}
                      </span>
                    ))
                };
              }),
              {
                key: '__op',
                label: '操作',
                width: ACTION_COL_W,
                render: (row) => (
                  <div style={ROW_ACTIONS}>
                    <Button type="link" size="small" onClick={(e) => { e.stopPropagation(); openDetail(row); }}>
                      详情
                    </Button>
                    {formFields.length > 0 && (
                      <Button type="link" size="small" onClick={(e) => { e.stopPropagation(); openForm(row); }}>
                        编辑
                      </Button>
                    )}
                    <Button
                      type="link"
                      size="small"
                      danger
                      onClick={(e) => { e.stopPropagation(); setPanel({ mode: 'del', row }); }}
                    >
                      删除
                    </Button>
                  </div>
                )
              }
            ]}
            rows={listQ.error ? [] : rows}
            loading={listQ.loading}
            empty={listQ.error ? (listQ.error.message || '数据加载失败，请重试') : '当前筛选条件下没有记录'}
            onRowClick={openDetail}
          />
        </div>
        <div className="card-body" style={{ paddingTop: 10, paddingBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span className="muted small">
              共 {total.toLocaleString('zh-CN')} 条 · 第 {page}/{pages} 页
            </span>
            <Pagination
              size="small"
              current={page}
              pageSize={PAGE_SIZE}
              total={total}
              showSizeChanger={false}
              showQuickJumper={false}
              onChange={(p) => setPage(p)}
            />
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
                        <small>{roleText(s.role) || '—'}</small>
                      </div>
                    );
                  })}
                </div>
                <div className="alert-line" style={{ marginTop: 12 }}>
                  当前环节：{curStep?.key || '—'}；承办角色：{roleText(curStep?.role) || '不限'}。提交后进入下一环节，终态自动置为「已办结」。
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
