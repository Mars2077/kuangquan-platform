import React, { useRef, useState } from 'react';
import { Ic } from '../components/Icon';
import { useApp, useFetch } from '../store.jsx';
import { sys } from '../api';
import {
  Add01Icon, CloudServerIcon, Database01Icon, File01Icon, Refresh01Icon, Upload01Icon
} from '@hugeicons/core-free-icons';

const TOPICS = ['地质勘查专题库', '储量评审备案范围专题库', '矿山开发利用统计年报专题库', '在采矿山专题库'];

const nf = (v) => Number(v || 0).toLocaleString('zh-CN');

export default function Warehouse() {
  const { bootMeta, toast } = useApp();
  const q = useFetch(() => sys.warehouse(), []);
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState({ topic: TOPICS[0], year: new Date().getFullYear(), note: '' });
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const data = q.data;
  const topics = data?.topics || [];
  const assets = data?.assets || [];
  const current = topics[tab];

  const totalRows = topics.reduce((s, t) => s + (t.totalRows || 0), 0);
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
      setForm((f) => ({ ...f, note: '' }));
      q.reload();
    } catch (e) {
      toast(e.message, 'err');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>绿矿智用数据仓</h1>
          <p className="sub">四大专题库统一编目、资产台账与文件入库，支撑驾驶舱与各业务场景的数据供给。</p>
        </div>
        <div className="actions">
          <button type="button" className="btn btn-ghost" onClick={q.reload}>
            <Ic icon={Refresh01Icon} size={14} /> 刷新
          </button>
        </div>
      </header>

      <div className="grid-4" style={{ marginBottom: 18 }}>
        <div className="kpi">
          <div className="k"><Ic icon={Database01Icon} size={12} /> 专题库</div>
          <div className="v">{topics.length || 4}<small>个</small></div>
          <div className="s">覆盖勘查、储量、年报、在采矿山</div>
        </div>
        <div className="kpi">
          <div className="k"><Ic icon={File01Icon} size={12} /> 数据表</div>
          <div className="v">{(data?.topics || []).reduce((s, t) => s + t.items.length, 0) || 0}<small>张</small></div>
          <div className="s">按业务主题编目的结构化表</div>
        </div>
        <div className="kpi">
          <div className="k">记录总量</div>
          <div className="v">{nf(totalRows)}<small>行</small></div>
          <div className="s">演示数据规模</div>
        </div>
        <div className="kpi">
          <div className="k"><Ic icon={CloudServerIcon} size={12} /> 入库资产</div>
          <div className="v">{totalAssets}<small>份</small></div>
          <div className="s">报告、图件、报表与空间数据</div>
        </div>
      </div>

      {q.loading && !data && <div className="loading"><span className="spinner" />正在读取数据仓编目 …</div>}

      {data && (
        <div className="grid-side">
          <div className="stack">
            <section className="card">
              <div className="tabs">
                {topics.map((t, i) => (
                  <button key={t.topic} type="button" className={`tab${i === tab ? ' on' : ''}`} onClick={() => setTab(i)}>
                    {t.topic.replace('专题库', '')}
                  </button>
                ))}
              </div>
              {!current ? <p className="muted small">暂无编目数据。</p> : (
                <>
                  <div className="table-caption">
                    <span>{current.topic}</span>
                    <span className="muted tiny">{current.items.length} 张表 · {nf(current.totalRows)} 行 · {current.assetCount} 份资产</span>
                  </div>
                  <table className="data-table dense">
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
                          <td>{it.name}</td>
                          <td><span className="tag tone-blue">{it.category}</span></td>
                          <td className="muted">{it.source}</td>
                          <td className="num">{nf(it.rows)}</td>
                          <td>
                            <div className="tag-list">
                              {(it.fields || []).slice(0, 6).map((f) => (
                                <span className="tag tone-grey" key={f}>{f}</span>
                              ))}
                              {(it.fields || []).length > 6 && <span className="tag tone-grey">+{(it.fields || []).length - 6}</span>}
                            </div>
                          </td>
                          <td className="muted tiny">{it.updated_at}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </section>

            <section className="card">
              <h3>资产台账（最近入库 300 条）</h3>
              {assets.length === 0 ? (
                <p className="muted small">暂无入库资产，可在右侧表单上传首个文件。</p>
              ) : (
                <div className="table-wrap tall">
                <table className="data-table dense">
                  <thead>
                    <tr>
                      <th>文件</th><th style={{ width: 170 }}>所属专题库</th><th style={{ width: 70 }}>类型</th>
                      <th className="num" style={{ width: 80 }}>大小</th><th style={{ width: 70 }}>年度</th><th style={{ width: 150 }}>入库时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.slice(0, 40).map((a) => (
                      <tr key={a.id}>
                        <td>{a.name}</td>
                        <td className="muted">{a.topic}</td>
                        <td><span className="tag tone-cyan">{a.file_type}</span></td>
                        <td className="num">{nf(a.size_kb)} KB</td>
                        <td>{a.year}</td>
                        <td className="muted tiny">{a.uploaded_at}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </section>
          </div>

          <div className="stack">
            <section className="card">
              <h3><Ic icon={Upload01Icon} size={14} /> 文件入库</h3>
              <div className="form-grid">
                <label>
                  <span>所属专题库</span>
                  <select className="select" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })}>
                    {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
                <label>
                  <span>数据年度</span>
                  <input className="input" type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
                </label>
                <label>
                  <span>文件</span>
                  <input ref={fileRef} className="input" type="file" />
                </label>
                <label>
                  <span>备注</span>
                  <textarea className="textarea" rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="如：2024 年度储量核实报告（含估算范围矢量）" />
                </label>
              </div>
              <div className="actions" style={{ marginTop: 12 }}>
                <button type="button" className="btn btn-primary" onClick={upload} disabled={uploading}>
                  <Ic icon={Add01Icon} size={14} /> {uploading ? '上传中 …' : '上传并入库'}
                </button>
              </div>
              <p className="muted tiny" style={{ marginTop: 10, lineHeight: 1.8 }}>
                文件保存在服务端 server/data/uploads/，台账写入 data_asset 表；演示环境未接入对象存储与病毒扫描。
              </p>
            </section>

            <section className="card">
              <h3>数据口径说明</h3>
              <dl className="desc-list">
                <dt>地质勘查专题库</dt><dd>历年地勘项目报告、钻孔柱状图、物化探成果及财政/社会资金投入明细。</dd>
                <dt>储量评审备案库</dt><dd>全量储量评审备案矢量边界、块段储量台账及历史储量增减序列。</dd>
                <dt>开发利用年报库</dt><dd>历年开采量、选矿回收率、综合利用率、产值及三率考核结构化数据。</dd>
                <dt>在采矿山专题库</dt><dd>动态关联有效采矿权、在建/生产状态、接入的物联网感知设备及三维矿山模型底座。</dd>
                <dt>当前账号</dt><dd>{bootMeta?.user?.name}（{bootMeta?.user?.org}）</dd>
              </dl>
            </section>
          </div>
        </div>
      )}

      {q.error && <div className="alert-line err">加载失败：{q.error}</div>}
    </div>
  );
}
