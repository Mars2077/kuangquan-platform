import React, { useState } from 'react';
import { Alert, Button, Empty, Form, Input, InputNumber, List, Select, Spin, Tabs, Tag } from 'antd';
import { Ic } from '../components/Icon';
import { useApp, useFetch } from '../store.jsx';
import { sys } from '../api';
import {
  Alert02Icon, Camera01Icon, Leaf01Icon, Location01Icon, Refresh01Icon, Task01Icon
} from '@hugeicons/core-free-icons';

const ICONS = { patrol: Camera01Icon, order: Task01Icon, green: Leaf01Icon, alert: Alert02Icon };
const TYPE_LABEL = { patrol: '巡查记录', order: '待整改工单', green: '绿色申报', alert: '待核实预警' };
const RESULTS = ['正常', '发现隐患', '疑似违法', '停产'];
const SERVICES = ['绿色矿山申报', '整改情况上报', '企业信用公示', '地矿政策法规', '地质科普知识', '办事服务指南'];

export default function Mobile() {
  const { bootMeta, toast } = useApp();
  const home = useFetch(() => sys.mobileHome(), []);
  /* 默认展示巡查台账，避免首屏空白 */
  const [type, setType] = useState('patrol');
  const list = useFetch(() => sys.mobileList(type), [type], { immediate: !!type });
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const pickLocation = () => {
    if (!navigator.geolocation) {
      toast('当前浏览器不支持定位，已使用演示坐标', 'err');
      return { lon: 119.9, lat: 30.9 };
    }
    return { lon: 119.9, lat: 30.9 };
  };

  /* 字段与接口调用保持不变，仅由 antd Form 收集值 */
  const checkIn = async (values) => {
    setSaving(true);
    try {
      const loc = pickLocation();
      await sys.mobilePatrol({
        mine_name: String(values.mine_name || '').trim(),
        finding: values.finding || '',
        result: values.result,
        photos: values.photos ?? 0,
        ...loc
      });
      toast('打卡成功，已写入巡查台账');
      form.resetFields();
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

  const ledger = (
    <div style={{ maxHeight: 420, overflowY: 'auto' }}>
      {list.loading && (
        <div className="loading"><Spin size="small" /><span>正在加载数据 …</span></div>
      )}
      {!list.loading && list.error && (
        <Alert
          type="error"
          showIcon
          message={`加载失败：${list.error}`}
          action={<Button size="small" onClick={() => list.reload()}>重试</Button>}
        />
      )}
      {!list.loading && !list.error && rows.length === 0 && (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="该分类下暂无移动端记录。" />
      )}
      {!list.loading && !list.error && rows.length > 0 && (
        <List
          size="small"
          dataSource={rows}
          split
          rowKey="id"
          renderItem={(it) => (
            <List.Item>
              <List.Item.Meta
                title={it.title}
                description={`${it.mine_name || it.region_name || '—'} · ${it.time}`}
              />
              <Tag color="blue">{it.status}</Tag>
            </List.Item>
          )}
        />
      )}
    </div>
  );

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">政务移动端（掌上应用）</h1>
          <p className="page-desc">面向监管人员、矿山企业与公众的轻量化入口：巡查打卡、整改上报、绿色申报、预警核实与政策科普。</p>
        </div>
        <div className="page-actions">
          <Button icon={<Ic icon={Refresh01Icon} size={14} />} onClick={() => { home.reload(); list.reload(); }}>刷新</Button>
        </div>
      </header>

      <div className="content">
        <div className="content-grid">
          <div className="span-7 content-col" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            <section className="card">
              <div className="card-head">
                <h3 className="card-title"><Ic icon={Location01Icon} size={15} /> 巡查打卡</h3>
                <span className="card-sub">现场记录实时回写巡查台账</span>
              </div>
              <div className="card-body">
                <Form
                  form={form}
                  layout="vertical"
                  initialValues={{ mine_name: '', finding: '', result: '正常', photos: 0 }}
                  onFinish={checkIn}
                >
                  <Form.Item
                    name="mine_name"
                    label="矿山名称"
                    rules={[{ required: true, message: '请填写巡查矿山名称' }]}
                  >
                    <Input placeholder="如：四川省彭州市白象硅灰石矿有限公司" />
                  </Form.Item>
                  <Form.Item name="result" label="巡查结论">
                    <Select options={RESULTS.map((v) => ({ value: v, label: v }))} />
                  </Form.Item>
                  <Form.Item name="finding" label="现场情况">
                    <Input.TextArea rows={3} placeholder="记录现场发现、界桩与敏感目标情况" />
                  </Form.Item>
                  <Form.Item name="photos" label="现场照片（张）">
                    <InputNumber min={0} style={{ width: 160 }} />
                  </Form.Item>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
                    <Button type="primary" htmlType="submit" loading={saving} icon={<Ic icon={Location01Icon} size={14} />}>
                      {saving ? '提交中 …' : '定位并打卡'}
                    </Button>
                    <span className="card-sub" style={{ margin: 0 }}>演示环境使用固定坐标（119.9000, 30.9000），生产对接北斗/GPS 定位。</span>
                  </div>
                </Form>
              </div>
            </section>

            <section className="card">
              <div className="card-head">
                <h3 className="card-title">移动端台账</h3>
                <span className="card-sub">共 {rows.length} 条 · 列表内滚动</span>
              </div>
              <div className="card-body">
                <Tabs
                  activeKey={type}
                  onChange={setType}
                  items={Object.keys(TYPE_LABEL).map((k) => ({
                    key: k,
                    label: TYPE_LABEL[k],
                    /* 仅活动页挂载台账，避免切换分类时各页共享同一份列表数据 */
                    children: k === type ? ledger : null
                  }))}
                />
              </div>
            </section>
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
                    <Button
                      key={c.key}
                      type="text"
                      block
                      className="m-tile"
                      onClick={() => setType(c.key)}
                      style={{ height: 'auto', padding: 0, textAlign: 'left' }}
                    >
                      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, width: '100%', padding: 12 }}>
                        <Ic icon={ICONS[c.key] || Task01Icon} size={18} />
                        <b>{c.value}<i className="kpi-unit">{c.unit}</i></b>
                        <span>{c.label}</span>
                      </span>
                    </Button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="card-sub" style={{ margin: 0, fontWeight: 600 }}>最近动态</div>
                <div className="m-list" style={{ padding: 0 }}>
                  <List
                    size="small"
                    split={false}
                    dataSource={rows.length ? rows.slice(0, 5) : [{ id: 'demo', title: '暂无动态', time: '' }]}
                    rowKey="id"
                    renderItem={(it) => (
                      <List.Item style={{ padding: '8px 12px', minHeight: 38 }}>
                        <span className="list-main" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</span>
                        <span className="list-meta" style={{ marginLeft: 8, flex: 'none' }}>{it.time || '—'}</span>
                      </List.Item>
                    )}
                  />
                </div>
              </div>

              <div>
                <div className="card-sub" style={{ margin: '0 0 6px', fontWeight: 600 }}>办事服务</div>
                <div className="m-list" style={{ padding: 0 }}>
                  <List
                    size="small"
                    split={false}
                    dataSource={SERVICES}
                    renderItem={(s) => (
                      <List.Item style={{ padding: 0 }}>
                        <Button
                          type="text"
                          block
                          onClick={() => toast(`「${s}」为移动端演示入口，桌面端见对应业务模块`)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, height: 'auto', padding: '8px 12px', textAlign: 'left', color: 'inherit' }}
                        >
                          <span>{s}</span>
                          <Tag color="default" style={{ marginRight: 0 }}>进入</Tag>
                        </Button>
                      </List.Item>
                    )}
                  />
                </div>
              </div>
            </div>

            <section className="card">
              <div className="card-head">
                <h3 className="card-title">接入说明</h3>
              </div>
              <div className="card-body">
                <p className="card-sub" style={{ margin: 0, lineHeight: 1.8 }}>
                  掌上应用以同一套接口驱动，演示环境用网页内的手机外框模拟；生产可打包为天府通办/微信小程序并复用 /api/mobile/* 接口。
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
