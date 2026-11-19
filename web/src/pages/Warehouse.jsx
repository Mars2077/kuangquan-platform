import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, Tag } from 'antd';
import { Ic } from '../components/Icon';
import { DataTable } from '../components/DataTable.jsx';
import { Modal } from '../components/Modal.jsx';
import { useApp, useFetch } from '../store.jsx';
import { sys } from '../api';
import {
  Add01Icon, CloudServerIcon, CubeIcon, Database01Icon, File01Icon, MapsLocation01Icon, Refresh01Icon,
  Upload01Icon
} from '@hugeicons/core-free-icons';

const TOPICS = ['地质勘查专题库', '储量评审备案范围专题库', '矿山开发利用统计年报专题库', '在采矿山专题库'];

/* 专题库 → 地图载体：矢量/栅格/三维类资产可直接在驾驶舱对应图层定位查看。
 * 只映射到系统里已经存在的专题图层（online 在线矿山 / deposit 矿产地），不虚构图层。 */
const SPATIAL = {
  地质勘查专题库: { scene: 'geology', layer: 'deposit', note: '矿产地载体图层' },
  储量评审备案范围专题库: { scene: 'deposit', layer: 'deposit', note: '矿产地载体图层' },
  矿山开发利用统计年报专题库: { scene: 'dashboard', layer: 'online', note: '在线矿山图层' },
  在采矿山专题库: { scene: 'dashboard', layer: 'online', note: '在线矿山图层' }
};
const SPATIAL_TYPES = ['矢量', '栅格', '三维'];
const spatialOf = (asset) => (
  asset && SPATIAL_TYPES.includes(asset.file_type) && SPATIAL[asset.topic] ? SPATIAL[asset.topic] : null
);

const nf = (v) => Number(v || 0).toLocaleString('zh-CN');

/** 窄屏判定：<620px 时资产台账改为定宽列 + 容器内横向滚动，行高保持单行。 */
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

export default function Warehouse() {
  const { bootMeta, toast } = useApp();
  const nav = useNavigate();
  const narrow = useNarrow(620);
  /* 「三维示意」弹窗：仅对 三维 类资产开放，内容全部取自台账字段，标注为演示示意 */
  const [model, setModel] = useState(null);
  const q = useFetch(() => sys.warehouse(), []);
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState({ topic: TOPICS[0], year: new Date().getFullYear(), note: '' });
  const fileRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);

  const data = q.data;
  const topics = data?.topics || [];
  const assets = data?.assets || [];
  const current = topics[tab];

  const totalRows = topics.reduce((s, t) => s + (t.totalRows || 0), 0);
  const totalTables = topics.reduce((s, t) => s + (t.items || []).length, 0);
  const totalAssets = topics.reduce((s, t) => s + (t.assetCount || 0), 0);

  const upload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast('请先选择要入库的文件', 'err');
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    fd.append('topic', form.topic);
    fd.append('year', String(form.year));
    fd.append('note', form.note);
    setUploading(true);
    try {
      await sys.uploadAsset(fd);
      toast('文件已入库，账面资产与目录同步更新');
      if (fileRef.current) fileRef.current.value = '';
      setFileName('');
      setForm((f) => ({ ...f, note: '' }));
      q.reload();
    } catch (e) {
      toast(e.message || '上传失败', 'err');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">绿矿智用数据仓</h1>
          <p className="page-desc">四大专题库统一编目、资产台账与文件入库，支撑驾驶舱与各业务场景的数据供给。</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-ghost" onClick={() => q.reload()}>
            <Ic icon={Refresh01Icon} size={14} /> 刷新
          </button>
          <button type="button" className="btn btn-primary" onClick={() => fileRef.current?.click()}>
            <Ic icon={Upload01Icon} size={14} /> 上传入库
          </button>
        </div>
      </header>

      <div className="content">
        <div className="kpi-row">
        <div className="kpi-card">
          <span className="kpi-label">专题库</span>
          <b className="kpi-value">{topics.length || 4}<i className="kpi-unit">个</i></b>
          <span className="kpi-delta flat">勘查 / 储量 / 年报 / 在采矿山</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">数据表</span>
          <b className="kpi-value">{totalTables}<i className="kpi-unit">张</i></b>
          <span className="kpi-delta flat">按业务主题编目的结构化表</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">记录总量</span>
          <b className="kpi-value">{nf(totalRows)}<i className="kpi-unit">行</i></b>
          <span className="kpi-delta flat">演示数据规模</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">入库资产</span>
          <b className="kpi-value">{totalAssets}<i className="kpi-unit">份</i></b>
          <span className="kpi-delta flat">报告、图件、报表与空间数据</span>
        </div>
      </div>

        {q.loading && !data && (
          <div className="card">
            <div className="card-body">
              <div className="skeleton">
                <span className="skeleton-line" /><span className="skeleton-line" /><span className="skeleton-line" />
              </div>
            </div>
          </div>
        )}

        {q.error && (
          <div className="alert-line err">
            数据仓编目加载失败：{q.error}
            <button type="button" className="btn btn-text btn-sm" style={{ marginLeft: 8 }} onClick={() => q.reload()}>重试</button>
          </div>
        )}

        {data && (
          <div className="content-grid">
            <div className="span-8 content-col" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
              <div className="card">
                <div className="card-head">
                  <h3 className="card-title"><Ic icon={Database01Icon} size={15} /> 专题库数据表</h3>
                  <span className="card-sub">{current ? `${current.items.length} 张表 · ${nf(current.totalRows)} 行 · ${current.assetCount} 份资产` : '暂无编目'}</span>
                </div>
                <div style={{ padding: '0 16px' }}>
                  <Tabs
                    size="small"
                    activeKey={String(tab)}
                    onChange={(k) => setTab(Number(k))}
                    items={topics.map((t, i) => ({ key: String(i), label: t.topic.replace('专题库', '') }))}
                  />
                </div>
                {!current ? (
                  <div className="card-body">
                    <div className="empty">
                      <span className="empty-icon"><Ic icon={Database01Icon} size={18} /></span>
                      <p className="empty-text">暂无编目数据。</p>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 4 }}>
                    <DataTable
                      dense
                      rows={current.items}
                      empty="暂无编目数据"
                      scrollX={narrow ? 900 : undefined}
                      columns={[
                        { key: 'name', label: '数据表', width: 220, ellipsis: narrow || undefined },
                        { key: 'category', label: '分类', width: 110, render: (it) => <Tag color="blue">{it.category}</Tag> },
                        { key: 'source', label: '来源', width: 130, ellipsis: narrow || undefined, render: (it) => <span className="muted" title={it.source}>{it.source}</span> },
                        { key: 'rows', label: '记录数', width: 90, align: 'right', render: (it) => nf(it.rows) },
                        {
                          key: 'fields',
                          label: '字段',
                          render: (it) => (
                            <span style={{ display: 'inline-flex', gap: 4, flexWrap: narrow ? 'nowrap' : 'wrap', whiteSpace: 'nowrap' }}>
                              {(it.fields || []).slice(0, narrow ? 2 : 5).map((f) => <Tag key={f}>{f}</Tag>)}
                              {(it.fields || []).length > (narrow ? 2 : 5) && (
                                <Tag>+{(it.fields || []).length - (narrow ? 2 : 5)}</Tag>
                              )}
                            </span>
                          )
                        },
                        { key: 'updated_at', label: '更新时间', width: 130, ellipsis: narrow || undefined, render: (it) => <span className="muted" title={it.updated_at}>{it.updated_at}</span> }
                      ]}
                    />
                  </div>
                )}
              </div>

              <div className="card">
                <div className="card-head">
                  <h3 className="card-title"><Ic icon={File01Icon} size={15} /> 资产台账</h3>
                  <span className="card-sub">最近入库 {Math.min(assets.length, 40)} 条 / 共 {nf(assets.length)} 条</span>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  {assets.length === 0 ? (
                    <div className="empty" style={{ minHeight: 140 }}>
                      <span className="empty-icon"><Ic icon={CloudServerIcon} size={18} /></span>
                      <p className="empty-text">暂无入库资产，可在右侧上传首个文件。</p>
                    </div>
                  ) : (
                    <DataTable
                      dense
                      rows={assets.slice(0, 40)}
                      empty="暂无入库资产"
                      scrollX={narrow ? 720 : undefined}
                      columns={[
                        { key: 'name', label: '文件', ellipsis: narrow || undefined, render: (a) => <span title={a.name}>{a.name}</span> },
                        { key: 'topic', label: '所属专题库', width: 170, ellipsis: narrow || undefined, render: (a) => <span className="muted" title={a.topic}>{a.topic}</span> },
                        { key: 'file_type', label: '类型', width: 80, render: (a) => <Tag color="blue">{a.file_type}</Tag> },
                        { key: 'size_kb', label: '大小', width: 100, align: 'right', render: (a) => `${nf(a.size_kb)} KB` },
                        { key: 'year', label: '年度', width: 80 },
                        { key: 'uploaded_at', label: '入库时间', width: 150, ellipsis: narrow || undefined, render: (a) => <span className="muted" title={a.uploaded_at}>{a.uploaded_at}</span> },
                        {
                          key: '__map',
                          label: '地图',
                          width: narrow ? 92 : 150,
                          render: (a) => {
                            const s = spatialOf(a);
                            if (!s) return <span className="muted small">—</span>;
                            return (
                              <span style={{ display: 'inline-flex', gap: 4 }}>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm"
                                  title={`在驾驶舱「${s.note}」定位查看（聚焦 ${a.region_name || '全省'}）`}
                                  onClick={() => nav(`/scene/${s.scene}?layer=${s.layer}&focus=${encodeURIComponent(a.region_name || '')}`)}
                                >
                                  <Ic icon={MapsLocation01Icon} size={12} /> 地图查看
                                </button>
                                {a.file_type === '三维' && (
                                  <button type="button" className="btn btn-ghost btn-sm" title="查看三维示意" onClick={() => setModel(a)}>
                                    <Ic icon={CubeIcon} size={12} />
                                  </button>
                                )}
                              </span>
                            );
                          }
                        }
                      ]}
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="span-4 content-col" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
              <div className="card">
                <div className="card-head">
                  <h3 className="card-title"><Ic icon={Upload01Icon} size={15} /> 文件入库</h3>
                  <span className="card-sub">随台账同步编目</span>
                </div>
                <div className="card-body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                    <div className="field">
                      <label className="field-label" htmlFor="wh-topic">所属专题库</label>
                      <select id="wh-topic" className="select" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })}>
                        {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label className="field-label" htmlFor="wh-year">数据年度</label>
                      <input id="wh-year" className="input" type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
                    </div>
                    <div className="upload">
                      <input
                        ref={fileRef}
                        type="file"
                        hidden
                        aria-label="选择入库文件"
                        onChange={(e) => setFileName(e.target.files?.[0]?.name || '')}
                      />
                      <button type="button" className="upload-box" onClick={() => fileRef.current?.click()}>
                        <Ic icon={Upload01Icon} size={20} />
                        <span style={{ fontSize: 13 }}>{fileName || '点击选择文件'}</span>
                      </button>
                      <span className="upload-hint">报告、图件、报表与空间数据，单文件不超过 50 MB</span>
                    </div>
                    <div className="field">
                      <label className="field-label" htmlFor="wh-note">备注</label>
                      <textarea
                        id="wh-note"
                        className="textarea"
                        rows={3}
                        value={form.note}
                        onChange={(e) => setForm({ ...form, note: e.target.value })}
                        placeholder="如：2024 年度储量核实报告（含估算范围矢量）"
                      />
                    </div>
                    <button type="button" className="btn btn-primary" onClick={upload} disabled={uploading} style={{ width: '100%' }}>
                      <Ic icon={Add01Icon} size={14} /> {uploading ? '上传中 …' : '上传并入库'}
                    </button>
                    <p className="card-sub" style={{ margin: 0, lineHeight: 1.7 }}>
                      文件保存在服务端 server/data/uploads/，台账写入 data_asset 表；演示环境未接入对象存储与病毒扫描。
                    </p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-head">
                  <h3 className="card-title">数据口径说明</h3>
                </div>
                <div className="card-body">
                  <div className="desc-list">
                    <div className="desc-row"><span className="desc-key">地质勘查专题库</span><span className="desc-value">历年地勘项目报告、钻孔柱状图、物化探成果及财政/社会资金投入明细。</span></div>
                    <div className="desc-row"><span className="desc-key">储量评审备案库</span><span className="desc-value">全量储量评审备案矢量边界、块段储量台账及历史储量增减序列。</span></div>
                    <div className="desc-row"><span className="desc-key">开发利用年报库</span><span className="desc-value">历年开采量、选矿回收率、综合利用率、产值及三率考核结构化数据。</span></div>
                    <div className="desc-row"><span className="desc-key">在采矿山专题库</span><span className="desc-value">动态关联有效采矿权、在建/生产状态、接入的物联网感知设备及三维矿山模型底座。</span></div>
                    <div className="desc-row"><span className="desc-key">当前账号</span><span className="desc-value">{bootMeta?.user?.name || '—'}（{bootMeta?.user?.org || '—'}）</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 三维模型示意：字段全部取自 data_asset 台账，图中标注为演示示意 */}
      <Modal
        open={!!model}
        title="三维矿山模型示意"
        subtitle={model ? `${model.name} · ${model.topic}` : ''}
        onClose={() => setModel(null)}
        footer={(
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setModel(null)}>关闭</button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                const s = model && SPATIAL[model.topic];
                setModel(null);
                if (s) nav(`/scene/${s.scene}?layer=${s.layer}&focus=${encodeURIComponent(model.region_name || '')}`);
              }}
            >
              <Ic icon={MapsLocation01Icon} size={13} /> 在地图中定位
            </button>
          </>
        )}
      >
        {model ? (
          <div className="model-demo">
            <div className="model-demo-stage" aria-hidden="true">
              <svg viewBox="0 0 320 180" width="100%" height="100%">
                <defs>
                  <linearGradient id="md-top" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#12456f" stopOpacity="0.95" />
                    <stop offset="1" stopColor="#0d3055" stopOpacity="0.95" />
                  </linearGradient>
                  <linearGradient id="md-side" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#0b2b4c" stopOpacity="0.95" />
                    <stop offset="1" stopColor="#061a30" stopOpacity="0.95" />
                  </linearGradient>
                </defs>
                <polygon points="160,18 300,78 160,138 20,78" fill="url(#md-top)" stroke="rgba(73,195,255,.5)" />
                <polygon points="20,78 160,138 160,170 20,110" fill="url(#md-side)" stroke="rgba(73,195,255,.28)" />
                <polygon points="300,78 160,138 160,170 300,110" fill="url(#md-side)" stroke="rgba(73,195,255,.28)" />
                <path d="M60 84 L160 126 L262 84" fill="none" stroke="rgba(73,195,255,.55)" strokeDasharray="4 4" />
                <circle cx="112" cy="76" r="3.2" fill="#49c3ff" />
                <circle cx="196" cy="96" r="3.2" fill="#35d39a" />
                <circle cx="150" cy="54" r="3.2" fill="#ffcc44" />
                <text x="112" y="66" fill="#9db3cc" fontSize="8" textAnchor="middle">GNSS</text>
                <text x="196" y="86" fill="#9db3cc" fontSize="8" textAnchor="middle">雨量</text>
                <text x="150" y="44" fill="#9db3cc" fontSize="8" textAnchor="middle">摄像头</text>
              </svg>
            </div>
            <div className="desc-list" style={{ marginTop: 12 }}>
              <div className="desc-row"><span className="desc-key">资产名称</span><span className="desc-value">{model.name}</span></div>
              <div className="desc-row"><span className="desc-key">所属专题库</span><span className="desc-value">{model.topic}</span></div>
              <div className="desc-row"><span className="desc-key">数据类型</span><span className="desc-value">{model.file_type} · {nf(model.size_kb)} KB · {model.year} 年度</span></div>
              <div className="desc-row"><span className="desc-key">空间范围</span><span className="desc-value">{model.region_name || '全省'}</span></div>
              <div className="desc-row"><span className="desc-key">入库时间</span><span className="desc-value">{model.uploaded_at || '—'}</span></div>
              <div className="desc-row">
                <span className="desc-key">说明</span>
                <span className="desc-value">
                  演示环境无三维引擎，上图按台账字段生成矿山模型示意（含钻孔/设备点位），不代表真实几何精度；
                  真实部署需接入三维引擎后加载原始模型文件。
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
