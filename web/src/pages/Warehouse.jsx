import React, { useEffect, useRef, useState } from 'react';
import { Ic } from '../components/Icon';
import { useApp, useFetch } from '../store.jsx';
import { sys } from '../api';
import {
  Add01Icon, CloudServerIcon, Database01Icon, File01Icon, Refresh01Icon, Upload01Icon
} from '@hugeicons/core-free-icons';

const TOPICS = ['地质勘查专题库', '储量评审备案范围专题库', '矿山开发利用统计年报专题库', '在采矿山专题库'];

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
  const narrow = useNarrow(620);
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
                  <div className="tabs" role="tablist" aria-label="专题库切换">
                    {topics.map((t, i) => (
                      <button
                        key={t.topic}
                        type="button"
                        role="tab"
                        aria-selected={i === tab}
                        className={`tab${i === tab ? ' is-on' : ''}`}
                        onClick={() => setTab(i)}
                      >
                        {t.topic.replace('专题库', '')}
                      </button>
                    ))}
                  </div>
                </div>
                {!current ? (
                  <div className="card-body">
                    <div className="empty">
                      <span className="empty-icon"><Ic icon={Database01Icon} size={18} /></span>
                      <p className="empty-text">暂无编目数据。</p>
                    </div>
                  </div>
                ) : (
                  <div className="table-wrap" style={{ border: 0, borderRadius: 0, marginTop: 8 }}>
                    <table className="data-table is-dense" style={{ minWidth: 760 }}>
                      <thead>
                        <tr>
                          <th style={{ width: 220 }}>数据表</th>
                          <th style={{ width: 110 }}>分类</th>
                          <th style={{ width: 130 }}>来源</th>
                          <th className="num" style={{ width: 90 }}>记录数</th>
                          <th>字段</th>
                          <th style={{ width: 110 }}>更新时间</th>
                        </tr>
                      </thead>
                      <tbody>
                        {current.items.map((it) => (
                          <tr key={it.id}>
                            <td style={narrow ? { whiteSpace: 'nowrap' } : undefined}>{it.name}</td>
                            <td><span className="tag tag--blue" style={{ whiteSpace: 'nowrap' }}>{it.category}</span></td>
                            <td style={narrow ? { color: 'var(--text-3)', whiteSpace: 'nowrap' } : { color: 'var(--text-3)' }}>{it.source}</td>
                            <td className="num">{nf(it.rows)}</td>
                            <td>
                              {narrow ? (
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
                                  {(it.fields || []).slice(0, 2).map((f) => (
                                    <span className="tag tag--grey" key={f} style={{ flex: 'none' }}>{f}</span>
                                  ))}
                                  {(it.fields || []).length > 2 && (
                                    <span className="tag tag--grey" style={{ flex: 'none' }}>+{it.fields.length - 2}</span>
                                  )}
                                </div>
                              ) : (
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                  {(it.fields || []).slice(0, 5).map((f) => (
                                    <span className="tag tag--grey" key={f}>{f}</span>
                                  ))}
                                  {(it.fields || []).length > 5 && <span className="tag tag--grey">+{it.fields.length - 5}</span>}
                                </div>
                              )}
                            </td>
                            <td style={{ color: 'var(--text-4)', whiteSpace: 'nowrap' }}>{it.updated_at}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                    <div className="table-wrap" style={{ border: 0, borderRadius: 0, maxHeight: 380, overflowY: 'auto' }}>
                      <table className="data-table is-dense" style={{ minWidth: narrow ? 900 : 700 }}>
                        <thead>
                          <tr>
                            <th>文件</th>
                            <th style={{ width: 170 }}>所属专题库</th>
                            <th style={{ width: 70 }}>类型</th>
                            <th className="num" style={{ width: 90 }}>大小</th>
                            <th style={{ width: 70 }}>年度</th>
                            <th style={{ width: 150 }}>入库时间</th>
                          </tr>
                        </thead>
                        <tbody>
                          {assets.slice(0, 40).map((a) => (
                            <tr key={a.id}>
                              <td title={a.name} style={narrow ? { whiteSpace: 'nowrap' } : undefined}>{a.name}</td>
                              <td
                                title={a.topic}
                                style={narrow
                                  ? { color: 'var(--text-3)', whiteSpace: 'nowrap' }
                                  : { color: 'var(--text-3)' }}
                              >
                                {a.topic}
                              </td>
                              <td><span className="tag tag--blue" style={{ whiteSpace: 'nowrap' }}>{a.file_type}</span></td>
                              <td className="num" style={{ whiteSpace: 'nowrap' }}>{nf(a.size_kb)} KB</td>
                              <td style={{ whiteSpace: 'nowrap' }}>{a.year}</td>
                              <td style={{ color: 'var(--text-4)', whiteSpace: 'nowrap' }}>{a.uploaded_at}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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
    </>
  );
}
