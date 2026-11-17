import React, { useState } from 'react';
import { Ic } from '../components/Icon';
import { useApp, useFetch } from '../store.jsx';
import { sys } from '../api';
import {
  Alert02Icon, ArrowRight01Icon, Camera01Icon, Leaf01Icon, Location01Icon, Refresh01Icon, Task01Icon
} from '@hugeicons/core-free-icons';

const ICONS = { patrol: Camera01Icon, order: Task01Icon, green: Leaf01Icon, alert: Alert02Icon };
const TYPE_LABEL = { patrol: '巡查记录', order: '待整改工单', green: '绿色申报', alert: '待核实预警' };
const SERVICES = ['绿色矿山申报', '整改情况上报', '企业信用公示', '地矿政策法规', '地质科普知识', '办事服务指南'];

const FIELD = { display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' };

export default function Mobile() {
  const { bootMeta, toast } = useApp();
  const home = useFetch(() => sys.mobileHome(), []);
  /* 默认展示巡查台账，避免首屏空白 */
  const [type, setType] = useState('patrol');
  const list = useFetch(() => sys.mobileList(type), [type], { immediate: !!type });
  const [form, setForm] = useState({ mine_name: '', finding: '', result: '正常', photos: 0 });
  const [saving, setSaving] = useState(false);

  const pickLocation = () => {
    if (!navigator.geolocation) {
      toast('当前浏览器不支持定位，已使用演示坐标', 'err');
      return { lon: 119.9, lat: 30.9 };
    }
    return { lon: 119.9, lat: 30.9 };
  };

  const checkIn = async () => {
    if (!form.mine_name.trim()) {
      toast('请填写巡查矿山名称', 'err');
      return;
    }
    setSaving(true);
    try {
      const loc = pickLocation();
      await sys.mobilePatrol({ mine_name: form.mine_name.trim(), finding: form.finding, result: form.result, photos: form.photos, ...loc });
      toast('打卡成功，已写入巡查台账');
      setForm({ mine_name: '', finding: '', result: '正常', photos: 0 });
      if (type === 'patrol') list.reload();
    } catch (e) {
      toast(e.message || '打卡失败', 'err');
    } finally {
      setSaving(false);
    }
  };

  const cards = home.data?.cards || [];
  const user = home.data?.user || bootMeta?.user || {};
  const rows = list.data?.list || [];

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">政务移动端（掌上应用）</h1>
          <p className="page-desc">面向监管人员、矿山企业与公众的轻量化入口：巡查打卡、整改上报、绿色申报、预警核实与政策科普。</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-ghost" onClick={() => { home.reload(); list.reload(); }}>
            <Ic icon={Refresh01Icon} size={14} /> 刷新
          </button>
        </div>
      </header>

      <div className="content">
        <div className="content-grid">
          <div className="span-7 content-col" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            <div className="card">
              <div className="card-head">
                <h3 className="card-title"><Ic icon={Location01Icon} size={15} /> 巡查打卡</h3>
                <span className="card-sub">现场记录实时回写巡查台账</span>
              </div>
              <div className="card-body">
                <div style={FIELD}>
                  <div className="field">
                    <label className="field-label" htmlFor="mb-mine">矿山名称</label>
                    <input
                      id="mb-mine"
                      className="input"
                      value={form.mine_name}
                      onChange={(e) => setForm({ ...form, mine_name: e.target.value })}
                      placeholder="如：四川省彭州市白象硅灰石矿有限公司"
                    />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="mb-result">巡查结论</label>
                    <select id="mb-result" className="select" value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })}>
                      {['正常', '发现隐患', '疑似违法', '停产'].map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="mb-finding">现场情况</label>
                    <textarea
                      id="mb-finding"
                      className="textarea"
                      rows={3}
                      value={form.finding}
                      onChange={(e) => setForm({ ...form, finding: e.target.value })}
                      placeholder="记录现场发现、界桩与敏感目标情况"
                    />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="mb-photos">现场照片（张）</label>
                    <input
                      id="mb-photos"
                      className="input"
                      type="number"
                      min={0}
                      value={form.photos}
                      onChange={(e) => setForm({ ...form, photos: e.target.value })}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
                    <button type="button" className="btn btn-primary" onClick={checkIn} disabled={saving}>
                      <Ic icon={Location01Icon} size={14} /> {saving ? '提交中 …' : '定位并打卡'}
                    </button>
                    <span className="card-sub" style={{ margin: 0 }}>演示环境使用固定坐标（119.9000, 30.9000），生产对接北斗/GPS 定位。</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <h3 className="card-title">移动端台账</h3>
                <span className="card-sub">共 {rows.length} 条 · 列表内滚动</span>
              </div>
              <div style={{ padding: '0 16px' }}>
                <div className="tabs" role="tablist" aria-label="台账分类">
                  {Object.keys(TYPE_LABEL).map((k) => (
                    <button
                      key={k}
                      type="button"
                      role="tab"
                      aria-selected={type === k}
                      className={`tab${type === k ? ' is-on' : ''}`}
                      onClick={() => setType(k)}
                    >
                      {TYPE_LABEL[k]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="card-body">
                {list.loading && (
                  <div className="skeleton">
                    <span className="skeleton-line" /><span className="skeleton-line" /><span className="skeleton-line" />
                  </div>
                )}
                {list.error && (
                  <div className="alert-line err">
                    加载失败：{list.error}
                    <button type="button" className="btn btn-text btn-sm" style={{ marginLeft: 8 }} onClick={() => list.reload()}>重试</button>
                  </div>
                )}
                {!list.loading && !list.error && rows.length === 0 && (
                  <div className="empty" style={{ minHeight: 96 }}>
                    <span className="empty-icon"><Ic icon={Task01Icon} size={18} /></span>
                    <p className="empty-text">该分类下暂无移动端记录。</p>
                  </div>
                )}
                {!list.loading && rows.length > 0 && (
                  <div className="list" style={{ maxHeight: 420, overflowY: 'auto' }}>
                    {rows.map((it) => (
                      <div className="list-item" key={it.id} style={{ flexWrap: 'wrap', rowGap: 2 }}>
                        <span className="list-main" style={{ flexBasis: '100%' }}>{it.title}</span>
                        <span
                          className="list-meta"
                          style={{ flex: '1 1 auto', minWidth: 0, whiteSpace: 'normal', lineHeight: 1.5 }}
                        >
                          {it.mine_name || it.region_name || '—'} · {it.time}
                        </span>
                        <span className="tag tag--blue">{it.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="span-5 content-col" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)', height: '100%' }}>
            <div className="m-phone" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '0 2px 10px' }}>
                <span className="card-sub" style={{ margin: 0 }}>{user.region || '四川省'}</span>
                <span className="card-sub" style={{ margin: 0 }}>掌上绿矿</span>
              </div>

              <div className="m-user">
                <span className="avatar">{user.name?.[0] || '川'}</span>
                <div style={{ minWidth: 0 }}>
                  <b>{user.name || '演示用户'}</b>
                  <small>{user.org || '四川省自然资源厅'}</small>
                </div>
              </div>

              <div className="m-grid" style={{ marginTop: 10 }}>
                {(cards.length ? cards : [{ key: 'patrol', label: '巡查打卡', value: 0, unit: '次' }]).map((c) => (
                  <button key={c.key} type="button" className="m-tile" onClick={() => setType(c.key)}>
                    <Ic icon={ICONS[c.key] || Task01Icon} size={18} />
                    <b>{c.value}<i className="kpi-unit">{c.unit}</i></b>
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="card-sub" style={{ margin: 0, fontWeight: 600 }}>最近动态</div>
                <div className="m-list">
                  {(rows.length ? rows.slice(0, 5) : [{ id: 'demo', title: '暂无动态', time: '' }]).map((it) => (
                    <div className="m-item" key={it.id}>
                      <span>{it.title}</span>
                      <span className="card-sub" style={{ margin: 0 }}>{it.time || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="card-sub" style={{ margin: '0 0 6px', fontWeight: 600 }}>办事服务</div>
                <div className="m-list">
                  {SERVICES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="m-item"
                      onClick={() => toast(`「${s}」为移动端演示入口，桌面端见对应业务模块`)}
                      style={{ width: '100%', background: 'none', border: 0, cursor: 'pointer', color: 'inherit', textAlign: 'left' }}
                    >
                      <span>{s}</span>
                      <span className="tag tag--grey">进入</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <h3 className="card-title">接入说明</h3>
              </div>
              <div className="card-body">
                <p className="card-sub" style={{ margin: 0, lineHeight: 1.8 }}>
                  掌上应用以同一套接口驱动，演示环境用网页内的手机外框模拟；生产可打包为天府通办/微信小程序并复用 /api/mobile/* 接口。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
