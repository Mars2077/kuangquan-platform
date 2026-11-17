import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DataTable, Pager } from '../components/DataTable.jsx';
import { Modal } from '../components/Modal.jsx';
import { Ic } from '../components/Icon';
import { useApp, useFetch } from '../store.jsx';
import { biz } from '../api';
import SpecialPanel from './SpecialPanel.jsx';
import {
  Add01Icon, ArrowLeft01Icon, ChevronRightIcon, Download01Icon, FilterIcon,
  More01Icon, QrCodeIcon, Refresh01Icon, Search01Icon, Tick02Icon, Cancel01Icon
} from '@hugeicons/core-free-icons';

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

const nf = (v, d = 2) =>
  Number.isFinite(Number(v))
    ? Number(v).toLocaleString('zh-CN', { minimumFractionDigits: d, maximumFractionDigits: d })
    : v;

function fmtCell(value, meta) {
  if (value === null || value === undefined || value === '') return '—';
  if (!meta) return String(value);
  if (meta.type === 'money') return nf(value, 2);
  if (meta.type === 'number') return nf(value, 2);
  return String(value);
}

export default function FeaturePage() {
  const { module, feature } = useParams();
  const nav = useNavigate();
  const { bootMeta, toast } = useApp();
  const [filters, setFilters] = useState({});
  const [kw, setKw] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [acting, setActing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const mod = useMemo(() => (bootMeta?.modules || []).find((m) => m.key === module), [bootMeta, module]);
  const spec = useMemo(() => mod?.features.find((f) => f.key === feature), [mod, feature]);
  const fields = bootMeta?.fields || {};
  const metaOf = (k) => fields[k] || { label: k, type: 'text' };

  useEffect(() => {
    setFilters({});
    setKw('');
    setPage(1);
    setDetail(null);
  }, [module, feature]);

  const query = useMemo(() => {
    const q = { page, pageSize };
    Object.entries(filters).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '' || v === 'all') return;
      const p = FILTER_PARAM[k];
      if (p) q[p] = v;
    });
    if (kw.trim()) q.kw = kw.trim();
    return q;
  }, [filters, kw, page, pageSize]);

  const listQ = useFetch(
    () => (spec ? biz.list(module, feature, query) : Promise.resolve(null)),
    [module, feature, JSON.stringify(query), spec?.key]
  );

  if (!bootMeta) return <div className="loading"><span className="spinner" />正在加载业务规格 …</div>;
  if (!spec) {
    return (
      <div className="page">
        <div className="card">未找到功能「{module}/{feature}」。</div>
      </div>
    );
  }

  const data = listQ.data;
  const rows = data?.list || [];
  const options = data?.options || {};
  const stats = data?.stats || { total: 0, byStatus: [], sums: {} };
  const reload = () => listQ.reload();

  const columns = spec.columns.map((k) => {
    const m = metaOf(k);
    return {
      key: k,
      label: m.label,
      align: ['money', 'number'].includes(m.type) ? 'right' : 'left',
      width: m.type === 'longtext' ? 200 : undefined,
      render: (row) => (
        <span className={m.type === 'longtext' ? 'ellipsis' : ''} title={m.type === 'longtext' ? row[k] : undefined}>
          {m.type === 'status' && row[k] ? <em className="tag tone-blue">{row[k]}</em> : fmtCell(row[k], m)}
        </span>
      )
    };
  });

  const filterKeys = spec.filters.filter((f) => f !== 'kw' && f !== 'dateRange');
  const hasDate = spec.filters.includes('dateRange');

  const setF = (k, v) => {
    setFilters((s) => ({ ...s, [k]: v }));
    setPage(1);
  };

  const optionFor = (k) => {
    if (k === 'region') return (bootMeta.regions || []).map((r) => ({ value: r.code, label: r.name }));
    const src = options[FILTER_PARAM[k] || k] || [];
    return src.map((v) => ({ value: v, label: v }));
  };

  const doExport = async () => {
    try {
      await biz.export(module, feature, query);
      toast('导出已开始');
    } catch (e) {
      toast(e.message || '导出失败', 'err');
    }
  };

  /* ------------------------------ 表单 */
  const formFields = spec.form || [];
  const editingValues = editing || {};

  const submitForm = async () => {
    const body = {};
    formFields.forEach((k) => {
      const v = editingValues[k];
      if (v !== undefined && v !== '') body[k] = v;
    });
    if (Object.keys(body).length === 0) {
      toast('请至少填写一个字段', 'err');
      return;
    }
    try {
      if (editing.id) {
        await biz.update(module, feature, editing.id, body);
        toast('已保存修改');
      } else {
        await biz.create(module, feature, body);
        toast('已新增记录');
      }
      setEditing(null);
      reload();
    } catch (e) {
      toast(e.message || '保存失败', 'err');
    }
  };

  const removeRow = async (row) => {
    try {
      await biz.remove(module, feature, row.id);
      toast('已删除');
      setConfirmDel(null);
      setDetail(null);
      reload();
    } catch (e) {
      toast(e.message || '删除失败', 'err');
    }
  };

  const doAction = async (kind) => {
    if (!acting) return;
    const comment = acting.__comment || '';
    try {
      await biz.action(module, feature, acting.row.id, { action: kind, comment });
      toast(kind === 'reject' ? '已退回补正' : '已提交下一环节');
      setActing(null);
      setDetail(null);
      reload();
    } catch (e) {
      toast(e.message || '流转失败', 'err');
    }
  };

  const wf = spec.workflow;
  const curStepIndex = useMemo(() => {
    if (!wf) return 0;
    const v = acting?.row?.[wf.field];
    const i = wf.steps.findIndex((s) => s.key === v);
    return i < 0 ? 0 : i;
  }, [wf, acting]);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <div className="crumb muted tiny" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <button type="button" className="btn-link" onClick={() => nav(`/biz/${module}`)}>
              <Ic icon={ArrowLeft01Icon} size={12} /> {mod.name}
            </button>
            <Ic icon={ChevronRightIcon} size={11} />
            <span>{spec.name}</span>
          </div>
          <h1>{spec.name}</h1>
          <p className="desc">{spec.desc}</p>
        </div>
        <div className="actions">
          {spec.qr || spec.archive ? (
            <button type="button" className="btn btn-ghost" onClick={() => nav(`/archive/${rows[0]?.id ?? 1}`)}>
              <Ic icon={QrCodeIcon} size={14} /> 一矿一档
            </button>
          ) : null}
          <button type="button" className="btn btn-ghost" onClick={reload}>
            <Ic icon={Refresh01Icon} size={14} /> 刷新
          </button>
          <button type="button" className="btn btn-ghost" onClick={doExport}>
            <Ic icon={Download01Icon} size={14} /> 导出 Excel
          </button>
          {formFields.length > 0 && (
            <button type="button" className="btn" onClick={() => setEditing({})}>
              <Ic icon={Add01Icon} size={14} /> 新增记录
            </button>
          )}
        </div>
      </header>

      {spec.special && <SpecialPanel kind={spec.special} spec={spec} module={module} feature={feature} onChanged={reload} />}

      <div className="grid-4" style={{ marginBottom: 14 }}>
        <div className="kpi">
          <div className="k">当前筛选记录</div>
          <div className="v">{Number(stats.total || 0).toLocaleString('zh-CN')}<small>条</small></div>
          <div className="s">按行政区划权限自动隔离</div>
        </div>
        {Object.entries(stats.sums || {}).slice(0, 3).map(([k, v]) => (
          <div className="kpi" key={k}>
            <div className="k">{metaOf(k).label} 合计</div>
            <div className="v">{nf(v, 2)}</div>
            <div className="s">当前筛选口径汇总</div>
          </div>
        ))}
        {Object.keys(stats.sums || {}).length === 0 && (
          <div className="kpi">
            <div className="k">办理环节</div>
            <div className="v" style={{ fontSize: 18 }}>
              {wf ? wf.steps[curStepIndex]?.key || wf.steps[0]?.key : '台账登记'}
            </div>
            <div className="s">{wf ? `${wf.steps.length} 个环节，可在线流转` : '无需流程审批'}</div>
          </div>
        )}
      </div>

      {stats.byStatus?.length > 0 && (
        <div className="tag-list" style={{ marginBottom: 12 }}>
          {stats.byStatus.map((s) => (
            <button
              type="button"
              key={s.name}
              className={`tag tone-${filters.status === s.name ? 'cyan' : 'grey'}`}
              onClick={() => setF('status', filters.status === s.name ? '' : s.name)}
              style={{ cursor: 'pointer' }}
            >
              {s.name || '未分类'} · {s.value}
            </button>
          ))}
        </div>
      )}

      <div className="filter-bar">
        <span className="filter-label"><Ic icon={FilterIcon} size={13} /> 筛选</span>
        {filterKeys.map((k) => (
          <select key={k} className="select" value={filters[k] || ''} onChange={(e) => setF(k, e.target.value)} aria-label={FILTER_LABEL[k] || k}>
            <option value="">{FILTER_LABEL[k] || k}（全部）</option>
            {optionFor(k).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ))}
        {hasDate && (
          <>
            <input type="date" className="input" value={filters.start || ''} onChange={(e) => setF('start', e.target.value)} aria-label="开始日期" />
            <input type="date" className="input" value={filters.end || ''} onChange={(e) => setF('end', e.target.value)} aria-label="结束日期" />
          </>
        )}
        <div className="input-icon" style={{ width: 230 }}>
          <Ic icon={Search01Icon} size={14} />
          <input
            className="input"
            style={{ paddingLeft: 34 }}
            placeholder="按名称 / 编号检索"
            value={kw}
            onChange={(e) => {
              setKw(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            setFilters({});
            setKw('');
            setPage(1);
          }}
        >
          重置
        </button>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={listQ.loading}
        onRowClick={(row) => setDetail(row)}
        actions={(row) => (
          <>
            {wf && (
              <button type="button" className="btn-link" onClick={() => setActing({ row })}>
                办理
              </button>
            )}
            <button type="button" className="btn-link" onClick={() => setDetail(row)}>详情</button>
            {formFields.length > 0 && (
              <button type="button" className="btn-link" onClick={() => setEditing(row)}>编辑</button>
            )}
            <button type="button" className="btn-link danger" onClick={() => setConfirmDel(row)}>删除</button>
          </>
        )}
      />

      <Pager page={page} pageSize={pageSize} total={stats.total} onChange={setPage} />

      {/* 新增 / 编辑 */}
      <Modal
        open={!!editing}
        title={editing?.id ? `编辑：${spec.name}` : `新增：${spec.name}`}
        subtitle="提交后写入业务台账，并按当前账号的行政区划权限校验"
        onClose={() => setEditing(null)}
        footer={(
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>取消</button>
            <button type="button" className="btn" onClick={submitForm}>
              <Ic icon={Tick02Icon} size={14} /> 保存
            </button>
          </>
        )}
      >
        <div className="form-grid">
          {formFields.map((k) => {
            const m = metaOf(k);
            const val = editingValues[k] ?? '';
            const set = (v) => setEditing((s) => ({ ...s, [k]: v }));
            let input;
            if (k === 'region_name') {
              input = (
                <select className="select" value={val} onChange={(e) => set(e.target.value)}>
                  <option value="">请选择</option>
                  {(bootMeta.regions || []).map((r) => (
                    <option key={r.code} value={r.name}>{r.name}</option>
                  ))}
                </select>
              );
            } else if (k === 'mineral') {
              input = (
                <select className="select" value={val} onChange={(e) => set(e.target.value)}>
                  <option value="">请选择</option>
                  {(bootMeta.minerals || []).map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              );
            } else if (m.type === 'status' && options.status?.length) {
              input = (
                <select className="select" value={val} onChange={(e) => set(e.target.value)}>
                  <option value="">请选择</option>
                  {options.status.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              );
            } else if (m.type === 'longtext') {
              input = <textarea className="textarea" rows={2} value={val} onChange={(e) => set(e.target.value)} />;
            } else {
              input = (
                <input
                  className="input"
                  type={m.type === 'date' ? 'date' : m.type === 'number' || m.type === 'money' ? 'number' : 'text'}
                  value={val}
                  onChange={(e) => set(e.target.value)}
                />
              );
            }
            return (
              <div className={`fld${m.type === 'longtext' ? ' full' : ''}`} key={k}>
                <label htmlFor={`f-${k}`}>{m.label}</label>
                {input}
              </div>
            );
          })}
          {formFields.length === 0 && <p className="muted">该功能为只读台账，不支持新增。</p>}
        </div>
      </Modal>

      {/* 详情 */}
      <Modal
        open={!!detail}
        title={detail?.name || detail?.title || detail?.mine_name || detail?.review_no || `${spec.name}详情`}
        subtitle={detail ? `记录编号 #${detail.id}` : ''}
        onClose={() => setDetail(null)}
        size="wide"
        footer={(
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setDetail(null)}>关闭</button>
            {wf && detail && (
              <button type="button" className="btn" onClick={() => setActing({ row: detail })}>办理流转</button>
            )}
            {spec.archive && detail && (
              <button type="button" className="btn" onClick={() => nav(`/archive/${detail.id}`)}>打开一矿一档</button>
            )}
          </>
        )}
      >
        {detail && (
          <>
            <dl className="desc-list">
              {spec.columns.concat(['status', 'stage', 'remark']).filter((k, i, a) => a.indexOf(k) === i).map((k) => (
                detail[k] === undefined || detail[k] === null || detail[k] === '' ? null : (
                  <React.Fragment key={k}>
                    <dt>{metaOf(k).label}</dt>
                    <dd>{fmtCell(detail[k], metaOf(k))}</dd>
                  </React.Fragment>
                )
              ))}
            </dl>
            {wf && (
              <div style={{ marginTop: 18 }}>
                <div className="block-label">办理流程</div>
                <div className="workflow">
                  {wf.steps.map((s, i) => {
                    const idx = wf.steps.findIndex((x) => x.key === detail[wf.field]);
                    return (
                      <React.Fragment key={s.key}>
                        {i > 0 && <span className="wf-line" />}
                        <span className={`wf-step${i < idx ? ' done' : ''}${i === idx ? ' now' : ''}`}>
                          <i>{i < idx ? '✓' : i + 1}</i>
                          <span>{s.key}</span>
                        </span>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </Modal>

      {/* 流程办理 */}
      <Modal
        open={!!acting}
        title="办理流转"
        subtitle={acting ? `${acting.row.name || acting.row.title || acting.row.mine_name || `#${acting.row.id}`}` : ''}
        onClose={() => setActing(null)}
        footer={(
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setActing(null)}>取消</button>
            {wf?.rejectTo && (
              <button type="button" className="btn btn-danger" onClick={() => doAction('reject')}>
                <Ic icon={Cancel01Icon} size={14} /> 退回补正
              </button>
            )}
            <button type="button" className="btn" onClick={() => doAction('next')}>
              <Ic icon={Tick02Icon} size={14} /> 提交下一环节
            </button>
          </>
        )}
      >
        {wf && acting && (
          <>
            <div className="workflow" style={{ marginBottom: 16 }}>
              {wf.steps.map((s, i) => (
                <React.Fragment key={s.key}>
                  {i > 0 && <span className="wf-line" />}
                  <span className={`wf-step${i < curStepIndex ? ' done' : ''}${i === curStepIndex ? ' now' : ''}`}>
                    <i>{i < curStepIndex ? '✓' : i + 1}</i>
                    <span>{s.key}</span>
                  </span>
                </React.Fragment>
              ))}
            </div>
            <div className="fld">
              <label htmlFor="wf-comment">办理意见</label>
              <textarea
                id="wf-comment"
                className="textarea"
                rows={3}
                placeholder="填写审核意见、补正要求或备案说明"
                value={acting.__comment || ''}
                onChange={(e) => setActing((s) => ({ ...s, __comment: e.target.value }))}
              />
            </div>
            <p className="muted tiny" style={{ marginTop: 8, lineHeight: 1.7 }}>
              当前环节：{wf.steps[curStepIndex]?.key}；承办角色：{wf.steps[curStepIndex]?.role || '不限'}。
              提交后进入下一环节，终态将自动置为「已办结」。
            </p>
          </>
        )}
      </Modal>

      {/* 删除确认 */}
      <Modal
        open={!!confirmDel}
        title="确认删除"
        onClose={() => setConfirmDel(null)}
        footer={(
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmDel(null)}>取消</button>
            <button type="button" className="btn btn-danger" onClick={() => removeRow(confirmDel)}>确认删除</button>
          </>
        )}
      >
        <p>将删除记录「{confirmDel?.name || confirmDel?.title || confirmDel?.mine_name || `#${confirmDel?.id}`}」，该操作不可撤销，相关流程记录一并清除。</p>
      </Modal>
    </div>
  );
}
