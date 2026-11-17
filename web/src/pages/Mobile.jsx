import React, { useState } from 'react';
import { Ic } from '../components/Icon';
import { useApp, useFetch } from '../store.jsx';
import { sys } from '../api';
import {
  Alert02Icon, ArrowLeft01Icon, Camera01Icon, Leaf01Icon, Location01Icon, Task01Icon
} from '@hugeicons/core-free-icons';

const ICONS = { patrol: Camera01Icon, order: Task01Icon, green: Leaf01Icon, alert: Alert02Icon };
const TYPE_LABEL = { patrol: '巡查记录', order: '待整改工单', green: '绿色申报', alert: '待核实预警' };

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
      toast(e.message, 'err');
    } finally {
      setSaving(false);
    }
  };

  const cards = home.data?.cards || [];

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>政务移动端（掌上应用）</h1>
          <p className="sub">面向监管人员、矿山企业与公众的轻量化入口：巡查打卡、整改上报、绿色申报、预警核实与政策科普。</p>
        </div>
      </header>

      <div className="grid-side">
        <div className="stack">
          <section className="card">
            <h3>巡查打卡</h3>
            <div className="form-grid">
              <label>
                <span>矿山名称</span>
                <input className="input" value={form.mine_name} onChange={(e) => setForm({ ...form, mine_name: e.target.value })} placeholder="如：浙江省长兴县长兴白象硅灰石矿有限公司" />
              </label>
              <label>
                <span>巡查结论</span>
                <select className="select" value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })}>
                  {['正常', '发现隐患', '疑似违法', '停产'].map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
              <label>
                <span>现场情况</span>
                <textarea className="textarea" rows={3} value={form.finding} onChange={(e) => setForm({ ...form, finding: e.target.value })} placeholder="记录现场发现、界桩与敏感目标情况" />
              </label>
              <label>
                <span>现场照片（张）</span>
                <input className="input" type="number" min={0} value={form.photos} onChange={(e) => setForm({ ...form, photos: e.target.value })} />
              </label>
            </div>
            <div className="actions" style={{ marginTop: 12 }}>
              <button type="button" className="btn btn-primary" onClick={checkIn} disabled={saving}>
                <Ic icon={Location01Icon} size={14} /> {saving ? '提交中 …' : '定位并打卡'}
              </button>
              <span className="muted tiny">演示环境使用固定坐标（119.9000, 30.9000），生产对接北斗/GPS 定位。</span>
            </div>
          </section>

          <section className="card">
            <h3>移动端台账</h3>
            <div className="tabs">
              {Object.keys(TYPE_LABEL).map((k) => (
                <button key={k} type="button" className={`tab${type === k ? ' on' : ''}`} onClick={() => setType(k)}>
                  {TYPE_LABEL[k]}
                </button>
              ))}
            </div>
            {!type && <p className="muted small">选择上方分类查看移动端同步的待办与记录。</p>}
            {type && list.loading && <div className="loading"><span className="spinner" />加载中 …</div>}
            {type && list.data && (
              <div className="mobile-list">
                {(list.data.list || []).map((it) => (
                  <div className="ml-item" key={it.id}>
                    <div className="t">{it.title}</div>
                    <div className="m">
                      {it.mine_name || it.region_name || '—'}｜{it.time}
                    </div>
                    <span className="tag tone-blue">{it.status}</span>
                  </div>
                ))}
                {(list.data.list || []).length === 0 && <p className="muted small">暂无记录。</p>}
              </div>
            )}
          </section>
        </div>

        <div className="stack">
          <div className="mobile-frame">
            <div className="mf-top">
              <span>{home.data?.user?.region || '浙江省'}</span>
              <span className="mf-time">掌上绿矿</span>
            </div>
            <div className="mf-user">
              <div className="avatar">{home.data?.user?.name?.[0] || '浙'}</div>
              <div>
                <div className="n">{home.data?.user?.name || bootMeta?.user?.name}</div>
                <div className="o">{home.data?.user?.org || bootMeta?.user?.org}</div>
              </div>
            </div>
            <div className="mf-grid">
              {(cards.length ? cards : [{ key: 'patrol', label: '巡查打卡', value: 0, unit: '次' }]).map((c) => (
                <button key={c.key} type="button" className="mf-card" onClick={() => setType(c.key)}>
                  <Ic icon={ICONS[c.key] || Task01Icon} size={18} />
                  <span className="v">{c.value}<small>{c.unit}</small></span>
                  <span className="k">{c.label}</span>
                </button>
              ))}
            </div>
            <div className="mf-block">
              <div className="mf-h">办事服务</div>
              {['绿色矿山申报', '整改情况上报', '企业信用公示', '地矿政策法规', '地质科普知识', '办事服务指南'].map((s) => (
                <div className="mf-row" key={s} onClick={() => toast(`「${s}」为移动端演示入口，桌面端见对应业务模块`)}>
                  <span>{s}</span>
                  <Ic icon={ArrowLeft01Icon} size={12} style={{ transform: 'rotate(180deg)', opacity: 0.5 }} />
                </div>
              ))}
            </div>
          </div>
          <p className="muted tiny" style={{ lineHeight: 1.8 }}>
            掌上应用以同一套接口驱动，演示环境用网页内的手机外框模拟；生产可打包为浙政钉/微信小程序并复用 /api/mobile/* 接口。
          </p>
        </div>
      </div>
    </div>
  );
}
