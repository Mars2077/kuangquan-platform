import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Ic } from '../components/Icon';
import { useApp, useFetch } from '../store.jsx';
import { sys } from '../api';
import {
  ArrowLeft01Icon, Camera01Icon, CpuIcon, File01Icon, Location01Icon, QrCodeIcon, Wifi01Icon
} from '@hugeicons/core-free-icons';

const nf = (v, d = 2) =>
  Number.isFinite(Number(v))
    ? Number(v).toLocaleString('zh-CN', { minimumFractionDigits: d, maximumFractionDigits: d })
    : '—';

export default function Archive() {
  const { id } = useParams();
  const nav = useNavigate();
  const { toast } = useApp();
  const q = useFetch(() => sys.archive(id), [id]);
  const [qr, setQr] = useState('');

  const data = q.data;
  const mine = data?.mine;

  useEffect(() => {
    if (!mine) return;
    let alive = true;
    sys
      .qr(`绿矿智用·一矿一档|矿山:${mine.name}|许可证:${mine.license_no || '—'}|区划:${mine.region_code}`)
      .then((r) => {
        if (alive) setQr(r?.data?.dataUrl || '');
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [mine]);

  if (q.loading && !data) return <div className="loading"><span className="spinner" />正在读取矿山全息档案 …</div>;
  if (q.error || !mine) {
    return (
      <div className="page">
        <div className="card">
          <h3>未找到该矿山档案</h3>
          <p className="muted small" style={{ lineHeight: 1.8 }}>
            编号 #{id} 可能属于矿产地或矿业权台账，其一矿一档以矿山主体归档。
            {q.error ? `（${q.error}）` : ''}
          </p>
          <div className="actions" style={{ marginTop: 12 }}>
            <button type="button" className="btn btn-ghost" onClick={() => nav(-1)}>返回上一页</button>
            <button type="button" className="btn" onClick={() => nav('/biz/deposit/deposit-archive')}>进入矿产地一本账</button>
          </div>
        </div>
      </div>
    );
  }

  const rights = data.rights || [];
  const greens = data.greens || [];
  const devices = data.devices || [];
  const alerts = data.alerts || [];
  const patrols = data.patrols || [];
  const orders = data.orders || [];
  const reviews = data.reviews || [];

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <button type="button" className="btn-link" onClick={() => nav(-1)} style={{ marginBottom: 8 }}>
            <Ic icon={ArrowLeft01Icon} size={12} /> 返回
          </button>
          <h1>一矿一档 · 全息数字档案</h1>
        </div>
        <div className="actions">
          <button type="button" className="btn btn-ghost" onClick={() => toast('档案已支持扫码查看：手机扫描右侧二维码即可打开同一档案')}>
            <Ic icon={QrCodeIcon} size={14} /> 扫码说明
          </button>
        </div>
      </header>

      <section className="archive-hero" style={{ marginBottom: 16 }}>
        <div>
          <h2>{mine.name}</h2>
          <div className="sub">
            <span>{mine.region_name}</span>
            <span>许可证号：{mine.license_no || '—'}</span>
            <span>开采矿种：{mine.mineral || '—'}</span>
            <span>有效期：{mine.valid_from || '—'} 至 {mine.valid_to || '—'}</span>
            <span>绿色矿山：{mine.green_level || '未入库'}</span>
          </div>
          <div className="tag-list" style={{ marginTop: 12 }}>
            <span className="tag tone-cyan">行政区划 {mine.region_code}</span>
            <span className="tag tone-blue">生产状态 {mine.status || '—'}</span>
            <span className="tag tone-green">接入设备 {devices.length} 台 / 在线 {devices.filter((d) => d.online === '在线' || d.online === '是' || d.online === 1).length}</span>
            <span className="tag tone-grey">矿区面积 {mine.area_km2 ?? '—'} km²</span>
          </div>
          <div className="grid-3" style={{ marginTop: 16 }}>
            <div className="kpi">
              <div className="k">采矿权沿革</div>
              <div className="v">{rights.length}<small>条</small></div>
              <div className="s">含延续、变更、抵押记录</div>
            </div>
            <div className="kpi">
              <div className="k">储量备案</div>
              <div className="v">{reviews.length}<small>次</small></div>
              <div className="s">最近一次 {reviews[0]?.record_at || '—'}</div>
            </div>
            <div className="kpi">
              <div className="k">监管记录</div>
              <div className="v">{patrols.length + orders.length + alerts.length}<small>条</small></div>
              <div className="s">巡查 {patrols.length} / 工单 {orders.length} / 预警 {alerts.length}</div>
            </div>
          </div>
        </div>
        <div className="qr">
          {qr ? <img src={qr} alt="矿山档案二维码" /> : <div style={{ width: 150, height: 150, background: 'rgba(255,255,255,0.1)', borderRadius: 8 }} />}
          <p>扫码查看该矿山全息档案<br />（演示环境二维码内容为档案标识串）</p>
        </div>
      </section>

      <div className="grid-side">
        <div className="stack">
          <section className="card">
            <h3>基础信息</h3>
            <dl className="desc-list">
              <dt>矿山名称</dt><dd>{mine.name}</dd>
              <dt>所在区划</dt><dd>{mine.region_name}（{mine.region_code}）</dd>
              <dt>采矿权人</dt><dd>{mine.right_holder || '—'}</dd>
              <dt>经济类型</dt><dd>{mine.econ_type || '—'}</dd>
              <dt>开采矿种</dt><dd>{mine.mineral || '—'}</dd>
              <dt>矿区面积</dt><dd>{mine.area_km2 ?? '—'} 平方千米</dd>
              <dt>开采方式</dt><dd>{mine.method || '—'}</dd>
              <dt>设计规模</dt><dd>{mine.scale || '—'}</dd>
              <dt>有效期</dt><dd>{mine.valid_from || '—'} 至 {mine.valid_to || '—'}</dd>
              <dt>地址</dt><dd>{mine.address || '—'}</dd>
              <dt>坐标</dt><dd>{mine.lon ? `${nf(mine.lon, 4)}, ${nf(mine.lat, 4)}` : '—'}</dd>
            </dl>
          </section>

          <section className="card">
            <h3><Ic icon={File01Icon} size={14} /> 采矿权沿革</h3>
            {rights.length === 0 ? <p className="muted small">暂无沿革记录。</p> : (
              <div className="timeline">
                {rights.map((r) => (
                  <div className="tl-item" key={r.id}>
                    <div className="t">{r.right_type} · {r.license_no}</div>
                    <div className="m">
                      权利人 {r.holder}｜{r.mineral}｜面积 {r.area ?? '—'} km²｜有效期 {r.valid_from} 至 {r.valid_to}｜状态 {r.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card">
            <h3>储量评审备案</h3>
            {reviews.length === 0 ? <p className="muted small">暂无备案记录。</p> : (
              <table className="data-table dense">
                <thead><tr><th>备案文号</th><th>报告名称</th><th className="num">备案资源量(万吨)</th><th>备案日期</th><th>状态</th></tr></thead>
                <tbody>
                  {reviews.map((r) => (
                    <tr key={r.id}>
                      <td>{r.review_no || '—'}</td>
                      <td>{r.report_name || '—'}</td>
                      <td className="num">{nf(r.reserve_t)}</td>
                      <td>{r.record_at || '—'}</td>
                      <td>{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="card">
            <h3>绿色矿山创建</h3>
            {greens.length === 0 ? <p className="muted small">暂无绿色矿山申报记录。</p> : (
              <div className="timeline">
                {greens.map((g) => (
                  <div className="tl-item" key={g.id}>
                    <div className="t">{g.apply_level} 申报 · {g.stage}</div>
                    <div className="m">年度 {g.year}｜综合得分 {g.total_score ?? '—'}｜提交 {g.submit_at || '—'}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card">
            <h3><Ic icon={Camera01Icon} size={14} /> 巡查与问题处置</h3>
            {patrols.length === 0 && orders.length === 0 ? <p className="muted small">暂无巡查记录。</p> : (
              <div className="timeline">
                {patrols.slice(0, 8).map((p) => (
                  <div className="tl-item" key={`p-${p.id}`}>
                    <div className="t">巡查 · {p.plan_name}（{p.result}）</div>
                    <div className="m">{p.sign_at}｜巡查人 {p.inspector}｜{p.finding || '无异常'}</div>
                  </div>
                ))}
                {orders.slice(0, 6).map((o) => (
                  <div className="tl-item" key={`o-${o.id}`}>
                    <div className="t">工单 · {o.order_no}（{o.status}）</div>
                    <div className="m">{o.title}｜来源 {o.source}｜期限 {o.due_at}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="stack">
          <section className="card">
            <h3><Ic icon={CpuIcon} size={14} /> 感知设备（{devices.length}）</h3>
            {devices.length === 0 ? <p className="muted small">该矿山尚未接入物联感知设备。</p> : (
              <div className="stack-sm">
                {devices.slice(0, 10).map((d) => (
                  <div className="stat-row" key={d.id} style={{ padding: '5px 0' }}>
                    <span className="k" style={{ flex: 1 }}>{d.name || d.device_type}</span>
                    <span className="v" style={{ fontSize: 12 }}>{d.value ?? '—'} {d.unit || ''}</span>
                    <span className={`tag tone-${d.online === '在线' || d.online === '是' || d.online === 1 ? 'green' : 'grey'}`}>
                      {d.online === '在线' || d.online === '是' || d.online === 1 ? '在线' : '离线'}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="tag-list" style={{ marginTop: 12 }}>
              <span className={`tag tone-${mine.video_connected ? 'green' : 'grey'}`}>
                <Ic icon={Camera01Icon} size={11} /> 视频监控 {mine.video_connected ? '已接入' : '未接入'}
              </span>
              <span className={`tag tone-${mine.monitor_connected ? 'green' : 'grey'}`}>
                <Ic icon={Wifi01Icon} size={11} /> 监测设备 {mine.monitor_connected ? '已接入' : '未接入'}
              </span>
              <span className={`tag tone-${mine.warn_connected ? 'green' : 'grey'}`}>
                <Ic icon={Location01Icon} size={11} /> 监测预警 {mine.warn_connected ? '已接入' : '未接入'}
              </span>
            </div>
          </section>

          <section className="card">
            <h3>预警处置</h3>
            {alerts.length === 0 ? <p className="muted small">暂无预警记录。</p> : (
              <div className="stack-sm">
                {alerts.slice(0, 8).map((a) => (
                  <div key={a.id}>
                    <div className="stat-row" style={{ padding: '4px 0' }}>
                      <span className="k" style={{ flex: 1 }}>{a.kind}</span>
                      <span className={`tag tone-${a.level === '一级' || a.level === '二级' ? 'red' : a.level === '三级' ? 'yellow' : 'grey'}`}>{a.level}</span>
                      <span className="muted tiny">{a.status}</span>
                    </div>
                    <div className="muted tiny">{a.occurred_at}｜{a.content}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card">
            <h3>信用监管</h3>
            {data.credit ? (
              <dl className="desc-list">
                <dt>信用评分</dt><dd>{data.credit.score ?? '—'}</dd>
                <dt>等级</dt><dd>{data.credit.level || '—'}</dd>
                <dt>名单类型</dt><dd>{data.credit.list_type || '—'}</dd>
                <dt>处罚次数</dt><dd>{data.credit.punish_count ?? 0}</dd>
                <dt>异常名录</dt><dd>{data.credit.abnormal ? '已列入' : '未列入'}</dd>
              </dl>
            ) : <p className="muted small">暂无信用记录。</p>}
          </section>

          <section className="card">
            <h3>同区矿产地</h3>
            {(data.deposits || []).length === 0 ? <p className="muted small">该区划暂无矿产地台账。</p> : (
              <div className="stack-sm">
                {data.deposits.slice(0, 6).map((d) => (
                  <div className="stat-row" key={d.id} style={{ padding: '4px 0' }}>
                    <span className="k" style={{ flex: 1 }}>{d.name}</span>
                    <span className="muted tiny">{d.mineral}｜{d.stage}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
