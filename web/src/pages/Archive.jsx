import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Ic } from '../components/Icon';
import { useApp, useFetch } from '../store.jsx';
import { sys } from '../api';
import {
  ArrowLeft01Icon, Camera01Icon, CpuIcon, File01Icon, Location01Icon, QrCodeIcon, Refresh01Icon, Wifi01Icon
} from '@hugeicons/core-free-icons';

const nf = (v, d = 2) =>
  Number.isFinite(Number(v))
    ? Number(v).toLocaleString('zh-CN', { minimumFractionDigits: d, maximumFractionDigits: d })
    : '—';

const online = (v) => v === '在线' || v === '是' || v === 1;

function Card({ title, sub, children, actions }) {
  return (
    <div className="card">
      <div className="card-head">
        <h3 className="card-title">{title}</h3>
        {sub ? <span className="card-sub">{sub}</span> : null}
        {actions}
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}

function MiniTable({ head, rows, empty, minWidth }) {
  if (!rows || rows.length === 0) return <p className="card-sub" style={{ margin: 0 }}>{empty || '暂无记录。'}</p>;
  return (
    <div className="table-wrap" style={{ border: 0, borderRadius: 0 }}>
      <table className="data-table is-dense" style={{ minWidth: minWidth || 420 }}>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h.label} align={h.right ? 'right' : undefined} className={h.right ? 'num' : undefined}>{h.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
}

export default function Archive() {
  const { id } = useParams();
  const nav = useNavigate();
  const { toast } = useApp();
  const q = useFetch(() => sys.archive(id), [id]);
  const [qr, setQr] = useState('');

  const data = q.data;
  const mine = data?.mine;

  useEffect(() => {
    if (!mine) return undefined;
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

  if (q.loading && !data) {
    return (
      <>
        <header className="page-head">
          <div>
            <h1 className="page-title">一矿一档 · 全息数字档案</h1>
            <p className="page-desc">正在读取矿山主体、采矿权沿革、储量备案与感知设备数据 …</p>
          </div>
        </header>
        <div className="content">
          <div className="card"><div className="card-body"><div className="skeleton">
            <span className="skeleton-line" /><span className="skeleton-line" /><span className="skeleton-line" />
          </div></div></div>
        </div>
      </>
    );
  }

  if (q.error || !mine) {
    return (
      <>
        <header className="page-head">
          <div>
            <h1 className="page-title">一矿一档 · 全息数字档案</h1>
            <p className="page-desc">未找到编号 #{id} 对应的矿山主体档案。</p>
          </div>
        </header>
        <div className="content">
          <div className="card">
            <div className="card-body">
              <div className="empty is-error">
                <span className="empty-icon"><Ic icon={File01Icon} size={18} /></span>
                <p className="empty-text">该编号可能属于矿产地或矿业权台账，一矿一档以矿山主体归档。{q.error ? `（${q.error}）` : ''}</p>
                <div className="empty-action">
                  <button type="button" className="btn btn-ghost" onClick={() => nav(-1)}>返回上一页</button>
                  <button type="button" className="btn btn-primary" onClick={() => nav('/biz/deposit/deposit-archive')}>进入矿产地一本账</button>
                  <button type="button" className="btn" onClick={() => q.reload()}>
                    <Ic icon={Refresh01Icon} size={14} /> 重试
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  const rights = data.rights || [];
  const greens = data.greens || [];
  const devices = data.devices || [];
  const alerts = data.alerts || [];
  const patrols = data.patrols || [];
  const orders = data.orders || [];
  const reviews = data.reviews || [];
  const deposits = data.deposits || [];
  const credit = data.credit;
  const devicesOnline = devices.filter((d) => online(d.online)).length;
  const alertOpen = alerts.filter((a) => a.status !== '已处置' && a.status !== '已办结').length;
  const pos = mine.lon && mine.lat ? `${nf(mine.lon, 4)}, ${nf(mine.lat, 4)}` : '—';

  const statusTone = /有效|在产|生产/.test(mine.status || '') ? 'tag--green' : /过期|注销|停产/.test(mine.status || '') ? 'tag--red' : 'tag--grey';

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {mine.name}
            <span className={`tag ${statusTone}`}>{mine.status || '状态未标注'}</span>
            <span className="tag tag--green">{mine.green_level ? `${mine.green_level}绿色矿山` : '绿色矿山未入库'}</span>
          </h1>
          <p className="page-desc">
            {mine.region_name}（{mine.region_code}）· 许可证号 {mine.license_no || '—'} · 开采矿种 {mine.mineral || '—'} · 有效期 {mine.valid_from || '—'} 至 {mine.valid_to || '—'}
          </p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-ghost" onClick={() => nav(-1)}>
            <Ic icon={ArrowLeft01Icon} size={14} /> 返回
          </button>
          <button type="button" className="btn" onClick={() => q.reload()}>
            <Ic icon={Refresh01Icon} size={14} /> 刷新
          </button>
          <button type="button" className="btn btn-primary" onClick={() => nav('/biz/deposit/deposit-archive')}>矿产地一本账</button>
        </div>
      </header>

      <div className="content">
        <div className="kpi-row">
        <div className="kpi-card">
          <span className="kpi-label">采矿权沿革</span>
          <b className="kpi-value">{rights.length}<i className="kpi-unit">条</i></b>
          <span className="kpi-delta flat">含延续、变更、抵押记录</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">储量评审备案</span>
          <b className="kpi-value">{reviews.length}<i className="kpi-unit">次</i></b>
          <span className="kpi-delta flat">最近 {reviews[0]?.record_at || reviews[0]?.accept_at || reviews[0]?.submit_at || '—'} · {reviews[0]?.status || '—'}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">感知设备在线</span>
          <b className="kpi-value">{devicesOnline}<i className="kpi-unit">/ {devices.length} 台</i></b>
          <span className={`kpi-delta ${devicesOnline === devices.length && devices.length > 0 ? 'up' : 'flat'}`}>
            视频 {mine.video_connected ? '已接入' : '未接入'} · 监测 {mine.monitor_connected ? '已接入' : '未接入'}
          </span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">信用评分</span>
          <b className={`kpi-value${credit && Number(credit.score) < 60 ? ' is-warn' : ''}`}>{credit ? credit.score ?? '—' : '—'}<i className="kpi-unit">分</i></b>
          <span className="kpi-delta flat">{credit ? `${credit.level || '—'} · ${credit.list_type || '—'}` : '暂无信用记录'}</span>
        </div>
      </div>

        <div className="content-grid">
          <div className="span-9 content-col" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            <Card title="基础信息" sub="矿山主体与采矿权基本信息">
              <div className="desc-list">
                <div className="desc-row"><span className="desc-key">矿山名称</span><span className="desc-value">{mine.name}</span></div>
                <div className="desc-row"><span className="desc-key">所在区划</span><span className="desc-value">{mine.region_name}（{mine.region_code}）</span></div>
                <div className="desc-row"><span className="desc-key">采矿权人</span><span className="desc-value">{mine.right_holder || '—'}</span></div>
                <div className="desc-row"><span className="desc-key">经济类型</span><span className="desc-value">{mine.econ_type || '—'}</span></div>
                <div className="desc-row"><span className="desc-key">开采矿种</span><span className="desc-value">{mine.mineral || '—'}</span></div>
                <div className="desc-row"><span className="desc-key">矿区面积</span><span className="desc-value">{mine.area_km2 ?? '—'} 平方千米</span></div>
                <div className="desc-row"><span className="desc-key">开采方式</span><span className="desc-value">{mine.method || '—'}</span></div>
                <div className="desc-row"><span className="desc-key">设计规模</span><span className="desc-value">{mine.scale || '—'}</span></div>
                <div className="desc-row"><span className="desc-key">有效期</span><span className="desc-value">{mine.valid_from || '—'} 至 {mine.valid_to || '—'}</span></div>
                <div className="desc-row"><span className="desc-key">矿山地址</span><span className="desc-value">{mine.address || '—'}</span></div>
                <div className="desc-row"><span className="desc-key">中心坐标</span><span className="desc-value">{pos}</span></div>
              </div>
            </Card>

            <Card title="采矿权沿革" sub={`${rights.length} 条`} actions={<span className="card-sub"><Ic icon={File01Icon} size={12} /> 含延续、变更、抵押</span>}>
              <MiniTable
                minWidth={780}
                head={[
                  { label: '类型' }, { label: '许可证号' }, { label: '权利人' }, { label: '矿种' },
                  { label: '面积(km²)', right: true }, { label: '有效期' }, { label: '状态' }
                ]}
                rows={rights.map((r) => (
                  <tr key={r.id}>
                    <td>{r.right_type || '—'}</td>
                    <td>{r.license_no || '—'}</td>
                    <td>{r.holder || '—'}</td>
                    <td>{r.mineral || '—'}</td>
                    <td align="right" className="num">{r.area ?? '—'}</td>
                    <td>{r.valid_from || '—'} 至 {r.valid_to || '—'}</td>
                    <td><span className={`tag ${/有效|在产/.test(r.status || '') ? 'tag--green' : 'tag--grey'}`}>{r.status || '—'}</span></td>
                  </tr>
                ))}
                empty="暂无采矿权沿革记录。"
              />
            </Card>

            <Card title="储量评审备案" sub={`${reviews.length} 次`}>
              <MiniTable
                minWidth={680}
                head={[
                  { label: '备案文号' }, { label: '报告名称' },
                  { label: '备案资源量(万吨)', right: true }, { label: '备案日期' }, { label: '状态' }
                ]}
                rows={reviews.map((r) => (
                  <tr key={r.id}>
                    <td>{r.review_no || '—'}</td>
                    <td>{r.report_name || '—'}</td>
                    <td align="right" className="num">{nf(r.reserve_t)}</td>
                    <td>{r.record_at || '—'}</td>
                    <td><span className="tag tag--blue">{r.status || '—'}</span></td>
                  </tr>
                ))}
                empty="暂无储量评审备案记录。"
              />
            </Card>

            <Card
              title="感知设备"
              sub={`${devicesOnline} / ${devices.length} 台在线`}
              actions={<span className="card-sub"><Ic icon={CpuIcon} size={12} /> 物联感知接入</span>}
            >
              <MiniTable
                minWidth={620}
                head={[{ label: '设备名称' }, { label: '类型' }, { label: '实时读数', right: true }, { label: '接入状态' }]}
                rows={devices.slice(0, 12).map((d) => (
                  <tr key={d.id}>
                    <td>{d.name || d.device_type}</td>
                    <td>{d.device_type || '—'}</td>
                    <td align="right" className="num">{d.value ?? '—'} {d.unit || ''}</td>
                    <td>
                      <span className={`tag ${online(d.online) ? 'tag--green' : 'tag--grey'}`}>{online(d.online) ? '在线' : '离线'}</span>
                    </td>
                  </tr>
                ))}
                empty="该矿山尚未接入物联感知设备。"
              />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                <span className={`tag ${mine.video_connected ? 'tag--green' : 'tag--grey'}`}>
                  <Ic icon={Camera01Icon} size={11} /> 视频监控 {mine.video_connected ? '已接入' : '未接入'}
                </span>
                <span className={`tag ${mine.monitor_connected ? 'tag--green' : 'tag--grey'}`}>
                  <Ic icon={Wifi01Icon} size={11} /> 监测设备 {mine.monitor_connected ? '已接入' : '未接入'}
                </span>
                <span className={`tag ${mine.warn_connected ? 'tag--green' : 'tag--grey'}`}>
                  <Ic icon={Location01Icon} size={11} /> 监测预警 {mine.warn_connected ? '已接入' : '未接入'}
                </span>
              </div>
            </Card>

            <Card title="预警处置" sub={`${alertOpen} 条待处置 / 共 ${alerts.length} 条`}>
              <MiniTable
                minWidth={720}
                head={[{ label: '预警类型' }, { label: '等级' }, { label: '状态' }, { label: '发生时间' }, { label: '内容' }]}
                rows={alerts.slice(0, 10).map((a) => (
                  <tr key={a.id}>
                    <td>{a.kind || '—'}</td>
                    <td>
                      <span className={`tag ${a.level === '一级' || a.level === '二级' ? 'tag--red' : a.level === '三级' ? 'tag--yellow' : 'tag--grey'}`}>{a.level || '—'}</span>
                    </td>
                    <td>{a.status || '—'}</td>
                    <td>{a.occurred_at || '—'}</td>
                    <td>{a.content || '—'}</td>
                  </tr>
                ))}
                empty="暂无预警记录。"
              />
            </Card>

            <Card title="信用监管" sub={credit ? `${credit.level || '—'} · ${credit.list_type || '—'}` : '暂无信用记录'}>
              <MiniTable
                minWidth={420}
                head={[{ label: '监管指标' }, { label: '结果' }]}
                rows={credit ? (
                  <>
                    <tr><td>信用评分</td><td className="num">{credit.score ?? '—'} 分</td></tr>
                    <tr><td>信用等级</td><td>{credit.level || '—'}</td></tr>
                    <tr><td>名单类型</td><td>{credit.list_type || '—'}</td></tr>
                    <tr><td>行政处罚次数</td><td className="num">{credit.punish_count ?? 0} 次</td></tr>
                    <tr><td>异常名录</td><td>{credit.abnormal ? <span className="tag tag--red">已列入</span> : <span className="tag tag--green">未列入</span>}</td></tr>
                  </>
                ) : null}
                empty="暂无信用记录。"
              />
            </Card>

            <Card title="巡查与工单处置" sub={`巡查 ${patrols.length} 条 · 工单 ${orders.length} 条`}>
              <MiniTable
                minWidth={720}
                head={[{ label: '来源' }, { label: '事项' }, { label: '结果/状态' }, { label: '时间' }, { label: '责任人' }]}
                rows={[
                  ...patrols.slice(0, 8).map((p) => (
                    <tr key={`p-${p.id}`}>
                      <td>巡查</td>
                      <td>{p.plan_name || '—'}</td>
                      <td><span className={`tag ${p.result === '正常' ? 'tag--green' : 'tag--orange'}`}>{p.result || '—'}</span></td>
                      <td>{p.sign_at || '—'}</td>
                      <td>{p.inspector || '—'}</td>
                    </tr>
                  )),
                  ...orders.slice(0, 8).map((o) => (
                    <tr key={`o-${o.id}`}>
                      <td>工单</td>
                      <td>{o.order_no} · {o.title || '—'}</td>
                      <td><span className="tag tag--yellow">{o.status || '—'}</span></td>
                      <td>{o.due_at || '—'}</td>
                      <td>{o.source || '—'}</td>
                    </tr>
                  ))
                ]}
                empty="暂无巡查与工单记录。"
              />
            </Card>
          </div>

          <div className="span-3 content-col" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            <Card title="档案二维码" sub="扫码查看全息档案">
              <div className="qr">
                {qr ? <img className="qr-img" src={qr} alt="矿山档案二维码" /> : <span className="qr-img" aria-hidden="true" />}
                <span className="qr-cap">演示环境二维码内容为档案标识串</span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => toast('手机扫描二维码即可打开同一份矿山全息档案')}>
                  <Ic icon={QrCodeIcon} size={13} /> 扫码说明
                </button>
              </div>
            </Card>

            <Card title="绿色矿山创建" sub={`${greens.length} 条申报`}>
              {greens.length === 0 ? (
                <p className="card-sub" style={{ margin: 0 }}>暂无绿色矿山申报记录。</p>
              ) : (
                <div className="list">
                  {greens.slice(0, 6).map((g) => (
                    <div className="list-item" key={g.id}>
                      <span className="list-main">{g.apply_level} 申报 · {g.stage}</span>
                      <span className="list-meta">{g.year} / {g.total_score ?? '—'} 分</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="同区矿产地" sub={`${deposits.length} 处`}>
              {deposits.length === 0 ? (
                <p className="card-sub" style={{ margin: 0 }}>该区划暂无矿产地台账。</p>
              ) : (
                <div className="list">
                  {deposits.slice(0, 8).map((d) => (
                    <div className="list-item" key={d.id}>
                      <span className="list-main">{d.name}</span>
                      <span className="list-meta">{d.mineral || '—'} / {d.stage || '—'}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
