import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button, Card, Col, Descriptions, Empty, Row, Skeleton, Statistic, Tag, Timeline
} from 'antd';
import { Ic } from '../components/Icon';
import { DataTable } from '../components/DataTable.jsx';
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

/** 窄屏判定：<620px 时各档案表改为定宽列 + 卡片内横向滚动，行高保持单行。 */
function useNarrow(px) {
  const query = `(max-width: ${px}px)`;
  const [narrow, setNarrow] = useState(
    () => (typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia(query).matches
      : false)
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

/* 卡片标题栏右侧的小字说明 */
const subText = (text) => <span className="tiny muted">{text}</span>;

export default function Archive() {
  const { id } = useParams();
  const nav = useNavigate();
  const { toast } = useApp();
  const q = useFetch(() => sys.archive(id), [id]);
  const [qr, setQr] = useState('');
  const narrow = useNarrow(620);

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
          <Card size="small"><Skeleton active paragraph={{ rows: 6 }} /></Card>
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
          <Card size="small">
            <Empty
              description={(
                <span className="muted">
                  该编号可能属于矿产地或矿业权台账，一矿一档以矿山主体归档。{q.error ? `（${q.error}）` : ''}
                </span>
              )}
            >
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button onClick={() => nav(-1)}>返回上一页</Button>
                <Button type="primary" onClick={() => nav('/biz/deposit/deposit-archive')}>进入矿产地一本账</Button>
                <Button icon={<Ic icon={Refresh01Icon} size={13} />} onClick={() => q.reload()}>重试</Button>
              </div>
            </Empty>
          </Card>
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

  const basicItems = [
    { key: 'name', label: '矿山名称', children: mine.name },
    { key: 'region', label: '所在区划', children: `${mine.region_name}（${mine.region_code}）` },
    { key: 'holder', label: '采矿权人', children: mine.right_holder || '—' },
    { key: 'econ', label: '经济类型', children: mine.econ_type || '—' },
    { key: 'mineral', label: '开采矿种', children: mine.mineral || '—' },
    { key: 'area', label: '矿区面积', children: `${mine.area_km2 ?? '—'} 平方千米` },
    { key: 'method', label: '开采方式', children: mine.method || '—' },
    { key: 'scale', label: '设计规模', children: mine.scale || '—' },
    { key: 'valid', label: '有效期', children: `${mine.valid_from || '—'} 至 ${mine.valid_to || '—'}` },
    { key: 'address', label: '矿山地址', children: mine.address || '—' },
    { key: 'pos', label: '中心坐标', children: pos }
  ];

  const rightItems = rights.map((r) => ({
    key: r.id,
    color: /有效|在产/.test(r.status || '') ? 'green' : 'gray',
    children: (
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <b style={{ fontWeight: 600, color: 'var(--text-1)' }}>{r.right_type || '采矿权'}</b>
          <Tag color={/有效|在产/.test(r.status || '') ? 'green' : 'default'}>{r.status || '—'}</Tag>
          <span className="tiny muted">{r.valid_from || '—'} 至 {r.valid_to || '—'}</span>
        </div>
        <div className="tiny muted" style={{ marginTop: 2 }}>
          许可证号 {r.license_no || '—'} · 权利人 {r.holder || '—'} · 矿种 {r.mineral || '—'} · 面积 {r.area ?? '—'} km²
        </div>
      </div>
    )
  }));

  const creditRows = credit
    ? [
        { key: 'score', name: '信用评分', value: `${credit.score ?? '—'} 分` },
        { key: 'level', name: '信用等级', value: credit.level || '—' },
        { key: 'list', name: '名单类型', value: credit.list_type || '—' },
        { key: 'punish', name: '行政处罚次数', value: `${credit.punish_count ?? 0} 次` },
        {
          key: 'abnormal',
          name: '异常名录',
          value: credit.abnormal ? <Tag color="red">已列入</Tag> : <Tag color="green">未列入</Tag>
        }
      ]
    : [];

  const patrolRows = [
    ...patrols.slice(0, 8).map((p) => ({
      key: `p-${p.id}`,
      source: '巡查',
      subject: p.plan_name || '—',
      result: <Tag color={p.result === '正常' ? 'green' : 'orange'}>{p.result || '—'}</Tag>,
      at: p.sign_at || '—',
      who: p.inspector || '—'
    })),
    ...orders.slice(0, 8).map((o) => ({
      key: `o-${o.id}`,
      source: '工单',
      subject: `${o.order_no} · ${o.title || '—'}`,
      result: <Tag color="gold">{o.status || '—'}</Tag>,
      at: o.due_at || '—',
      who: o.source || '—'
    }))
  ];

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
          <Button icon={<Ic icon={ArrowLeft01Icon} size={13} />} onClick={() => nav(-1)}>返回</Button>
          <Button icon={<Ic icon={Refresh01Icon} size={13} />} onClick={() => q.reload()}>刷新</Button>
          <Button type="primary" onClick={() => nav('/biz/deposit/deposit-archive')}>矿产地一本账</Button>
        </div>
      </header>

      <div className="content">
        <Row gutter={[12, 12]}>
          <Col xs={12} md={6}>
            <Card size="small" style={{ height: '100%' }}>
              <Statistic title="采矿权沿革" value={rights.length} suffix="条" valueStyle={{ color: '#49c3ff' }} />
              <div className="tiny muted" style={{ marginTop: 2 }}>含延续、变更、抵押记录</div>
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small" style={{ height: '100%' }}>
              <Statistic title="储量评审备案" value={reviews.length} suffix="次" valueStyle={{ color: '#9adcff' }} />
              <div className="tiny muted" style={{ marginTop: 2 }}>
                最近 {reviews[0]?.record_at || reviews[0]?.accept_at || reviews[0]?.submit_at || '—'} · {reviews[0]?.status || '—'}
              </div>
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small" style={{ height: '100%' }}>
              <Statistic title="感知设备在线" value={devicesOnline} suffix={`/ ${devices.length} 台`} valueStyle={{ color: '#8ff0c8' }} />
              <div className="tiny muted" style={{ marginTop: 2 }}>
                视频 {mine.video_connected ? '已接入' : '未接入'} · 监测 {mine.monitor_connected ? '已接入' : '未接入'}
              </div>
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small" style={{ height: '100%' }}>
              <Statistic
                title="信用评分"
                value={credit ? credit.score ?? '—' : '—'}
                suffix="分"
                valueStyle={{ color: credit && Number(credit.score) < 60 ? '#ff5f57' : '#cfe4ff' }}
              />
              <div className="tiny muted" style={{ marginTop: 2 }}>
                {credit ? `${credit.level || '—'} · ${credit.list_type || '—'}` : '暂无信用记录'}
              </div>
            </Card>
          </Col>
        </Row>

        <div className="content-grid">
          <div className="span-9 content-col">
            <Card size="small" title="基础信息" extra={subText('矿山主体与采矿权基本信息')}>
              <Descriptions
                column={{ xs: 1, sm: 1, md: 2 }}
                size="small"
                bordered
                styles={{ label: { width: 96, whiteSpace: 'nowrap', color: 'var(--text-3)' } }}
                items={basicItems}
              />
            </Card>

            <Card size="small" title="采矿权沿革" extra={subText(`${rights.length} 条 · 含延续、变更、抵押`)}>
              {rightItems.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无采矿权沿革记录。" />
              ) : (
                <Timeline items={rightItems} style={{ marginTop: 4 }} />
              )}
            </Card>

            <Card size="small" title="储量评审备案" extra={subText(`${reviews.length} 次`)}>
              <DataTable
                dense
                empty="暂无储量评审备案记录。"
                rows={reviews}
                scrollX={narrow ? 760 : undefined}
                columns={[
                  { key: 'review_no', label: '备案文号', width: 150, ellipsis: narrow || undefined },
                  { key: 'report_name', label: '报告名称', ellipsis: narrow || undefined, render: (r) => <span title={r.report_name}>{r.report_name || '—'}</span> },
                  { key: 'reserve_t', label: '备案资源量(万吨)', width: 140, align: 'right', render: (r) => nf(r.reserve_t) },
                  { key: 'record_at', label: '备案日期', width: 120 },
                  { key: 'status', label: '状态', width: 90, render: (r) => <Tag color="blue">{r.status || '—'}</Tag> }
                ]}
              />
            </Card>

            <Card size="small" title="感知设备" extra={subText(`${devicesOnline} / ${devices.length} 台在线 · 物联感知接入`)}>
              <DataTable
                dense
                empty="该矿山尚未接入物联感知设备。"
                rows={devices.slice(0, 12)}
                scrollX={narrow ? 620 : undefined}
                columns={[
                  { key: 'name', label: '设备名称', ellipsis: narrow || undefined, render: (d) => <span title={d.name || d.device_type}>{d.name || d.device_type || '—'}</span> },
                  { key: 'device_type', label: '类型', width: 130, ellipsis: narrow || undefined },
                  { key: 'value', label: '实时读数', width: 130, align: 'right', render: (d) => `${d.value ?? '—'} ${d.unit || ''}` },
                  {
                    key: 'online',
                    label: '接入状态',
                    width: 100,
                    render: (d) => <Tag color={online(d.online) ? 'green' : 'default'}>{online(d.online) ? '在线' : '离线'}</Tag>
                  }
                ]}
              />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                <Tag color={mine.video_connected ? 'green' : 'default'}>
                  <Ic icon={Camera01Icon} size={11} /> 视频监控 {mine.video_connected ? '已接入' : '未接入'}
                </Tag>
                <Tag color={mine.monitor_connected ? 'green' : 'default'}>
                  <Ic icon={Wifi01Icon} size={11} /> 监测设备 {mine.monitor_connected ? '已接入' : '未接入'}
                </Tag>
                <Tag color={mine.warn_connected ? 'green' : 'default'}>
                  <Ic icon={Location01Icon} size={11} /> 监测预警 {mine.warn_connected ? '已接入' : '未接入'}
                </Tag>
              </div>
            </Card>

            <Card size="small" title="预警处置" extra={subText(`${alertOpen} 条待处置 / 共 ${alerts.length} 条`)}>
              <DataTable
                dense
                empty="暂无预警记录。"
                rows={alerts.slice(0, 10)}
                scrollX={narrow ? 760 : undefined}
                columns={[
                  { key: 'kind', label: '预警类型', width: 140, ellipsis: narrow || undefined },
                  {
                    key: 'level',
                    label: '等级',
                    width: 90,
                    render: (a) => {
                      const color = a.level === '一级' || a.level === '二级' ? 'red' : a.level === '三级' ? 'gold' : 'default';
                      return <Tag color={color}>{a.level || '—'}</Tag>;
                    }
                  },
                  { key: 'status', label: '状态', width: 100, ellipsis: narrow || undefined },
                  { key: 'occurred_at', label: '发生时间', width: 160, ellipsis: narrow || undefined },
                  { key: 'content', label: '内容', ellipsis: narrow || undefined, render: (a) => <span title={a.content}>{a.content || '—'}</span> }
                ]}
              />
            </Card>

            <Card size="small" title="信用监管" extra={subText(credit ? `${credit.level || '—'} · ${credit.list_type || '—'}` : '暂无信用记录')}>
              <DataTable
                dense
                empty="暂无信用记录。"
                rowKey="key"
                rows={creditRows}
                scrollX={narrow ? 420 : undefined}
                columns={[
                  { key: 'name', label: '监管指标', width: 180, ellipsis: narrow || undefined },
                  { key: 'value', label: '结果', ellipsis: narrow || undefined, render: (r) => <span title={r.value}>{r.value ?? '—'}</span> }
                ]}
              />
            </Card>

            <Card size="small" title="巡查与工单处置" extra={subText(`巡查 ${patrols.length} 条 · 工单 ${orders.length} 条`)}>
              <DataTable
                dense
                empty="暂无巡查与工单记录。"
                rowKey="key"
                rows={patrolRows}
                scrollX={narrow ? 660 : undefined}
                columns={[
                  { key: 'source', label: '来源', width: 80 },
                  { key: 'subject', label: '事项', ellipsis: narrow || undefined, render: (r) => <span title={r.subject}>{r.subject || '—'}</span> },
                  { key: 'result', label: '结果/状态', width: 110, ellipsis: narrow || undefined },
                  { key: 'at', label: '时间', width: 120, ellipsis: narrow || undefined },
                  { key: 'who', label: '责任人', width: 110, ellipsis: narrow || undefined }
                ]}
              />
            </Card>
          </div>

          <div className="span-3 content-col">
            <Card size="small" title="档案二维码" extra={subText('扫码查看全息档案')}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                {qr ? (
                  <img
                    src={qr}
                    alt="矿山档案二维码"
                    width={148}
                    height={148}
                    style={{ display: 'block', borderRadius: 6, background: '#fff', padding: 4 }}
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    style={{ width: 148, height: 148, borderRadius: 6, background: 'rgba(46, 168, 255, 0.08)' }}
                  />
                )}
                <span className="tiny muted" style={{ textAlign: 'center' }}>演示环境二维码内容为档案标识串</span>
                <Button
                  size="small"
                  icon={<Ic icon={QrCodeIcon} size={13} />}
                  onClick={() => toast('手机扫描二维码即可打开同一份矿山全息档案')}
                >
                  扫码说明
                </Button>
              </div>
            </Card>

            <Card size="small" title="绿色矿山创建" extra={subText(`${greens.length} 条申报`)}>
              <DataTable
                dense
                empty="暂无绿色矿山申报记录。"
                rows={greens.slice(0, 6)}
                scrollX={narrow ? 420 : undefined}
                columns={[
                  { key: 'apply_level', label: '申报级别', width: 92, ellipsis: narrow || undefined },
                  { key: 'stage', label: '阶段', ellipsis: narrow || undefined },
                  { key: 'year', label: '年度', width: 72 },
                  { key: 'total_score', label: '得分', width: 68, align: 'right', render: (g) => g.total_score ?? '—' }
                ]}
              />
            </Card>

            <Card size="small" title="同区矿产地" extra={subText(`${deposits.length} 处`)}>
              <DataTable
                dense
                empty="该区划暂无矿产地台账。"
                rows={deposits.slice(0, 8)}
                scrollX={narrow ? 480 : undefined}
                columns={[
                  { key: 'name', label: '矿产地', ellipsis: narrow || undefined, render: (d) => <span title={d.name}>{d.name}</span> },
                  { key: 'mineral', label: '矿种', width: 90, ellipsis: narrow || undefined },
                  { key: 'stage', label: '阶段', width: 100, ellipsis: narrow || undefined }
                ]}
              />
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
