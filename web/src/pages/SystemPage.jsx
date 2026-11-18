import React, { useMemo, useState } from 'react';
import { Alert, Button, Descriptions, Drawer, Form, Input, Select, Space, Switch, Tabs, Tag } from 'antd';
import { Ic } from '../components/Icon';
import { DataTable } from '../components/DataTable.jsx';
import { useApp, useFetch } from '../store.jsx';
import { sys } from '../api';
import {
  Add01Icon, CheckmarkBadge02Icon, CloudServerIcon, Database01Icon, Refresh01Icon, Shield01Icon, UserIcon
} from '@hugeicons/core-free-icons';

const ROLES = [
  ['admin', '系统管理员'],
  ['province', '省级管理员'],
  ['city', '市级管理员'],
  ['county', '县级管理员'],
  ['enterprise', '矿山企业'],
  ['public', '公众用户']
];

const EMPTY_USER = { username: '', password: '', name: '', org: '', role: 'county' };

/* 统一的面板外壳：沿用设计系统的卡片容器，内部表格交给 antd Table */
function Section({ icon, title, sub, children }) {
  return (
    <section className="card">
      <div className="card-head">
        <h3 className="card-title">
          {icon ? <Ic icon={icon} size={15} /> : null}
          {title}
        </h3>
        {sub ? <span className="card-sub">{sub}</span> : null}
      </div>
      <div style={{ padding: 0 }}>{children}</div>
    </section>
  );
}

/* 加载失败时的重试条：保留原有「重试」能力 */
function ErrorBar({ error, onRetry }) {
  if (!error) return null;
  return (
    <Alert
      type="error"
      showIcon
      style={{ margin: 12 }}
      message={`加载失败：${error}`}
      action={<Button size="small" onClick={onRetry}>重试</Button>}
    />
  );
}

export default function SystemPage() {
  const { bootMeta, toast, user } = useApp();
  const [tab, setTab] = useState('user');
  const users = useFetch(() => sys.users(), []);
  const audit = useFetch(() => sys.audit({ page: 1, pageSize: 50 }), []);
  const health = useFetch(() => sys.health(), []);
  const indicator = useFetch(() => sys.indicator(), []);
  const [drawer, setDrawer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form] = Form.useForm();

  /* 新增用户默认区划：沿用当前登录账号的区划（省本级账号即 510000 四川省），不再写死成都 */
  const defaultRegion = useMemo(() => {
    const code = String(user?.region_code || '');
    const hit = (bootMeta?.regions || []).find((r) => String(r.value ?? r.code) === code);
    return {
      region_code: code,
      region_name: hit?.label ?? hit?.name ?? user?.region_name ?? ''
    };
  }, [user, bootMeta]);

  const emptyUser = { ...EMPTY_USER, ...defaultRegion };
  const watchRegionCode = Form.useWatch('region_code', form);
  const watchRegionName = Form.useWatch('region_name', form);

  const openDrawer = () => {
    form.resetFields();
    form.setFieldsValue(emptyUser);
    setDrawer(true);
  };

  const closeDrawer = () => {
    setDrawer(false);
    form.resetFields();
  };

  /* 提交逻辑与字段均保持不变，仅由 antd Form 收集值 */
  const createUser = async (values) => {
    setBusy(true);
    try {
      await sys.createUser({ ...values });
      toast('用户已创建');
      form.resetFields();
      setDrawer(false);
      users.reload();
    } catch (e) {
      toast(e.message || '创建失败', 'err');
    } finally {
      setBusy(false);
    }
  };

  const toggleUser = async (u) => {
    try {
      await sys.updateUser(u.id, { status: u.status === '正常' ? '停用' : '正常' });
      toast(`已${u.status === '正常' ? '停用' : '启用'} ${u.name}`);
      users.reload();
    } catch (e) {
      toast(e.message || '操作失败', 'err');
    }
  };

  const reloadAll = () => {
    users.reload();
    audit.reload();
    health.reload();
    indicator.reload();
  };

  const h = health.data || {};
  const userList = users.data?.list || [];
  const stopped = userList.filter((u) => u.status !== '正常').length;
  const roleLabel = bootMeta?.roles?.[user?.role] || user?.role || '—';

  const userColumns = [
    { key: 'username', label: '账号', width: 110 },
    { key: 'name', label: '姓名', width: 90 },
    { key: 'role', label: '角色', width: 120, render: (u) => <Tag color="blue">{u.roleLabel || u.role}</Tag> },
    { key: 'org', label: '所属单位', render: (u) => <span style={{ color: 'var(--text-3)' }}>{u.org || '—'}</span> },
    { key: 'region_name', label: '行政区划', width: 110, render: (u) => <span style={{ color: 'var(--text-3)' }}>{u.region_name || '—'}</span> },
    { key: 'last_login', label: '最近登录', width: 150, render: (u) => <span style={{ color: 'var(--text-4)', whiteSpace: 'nowrap' }}>{u.last_login || '—'}</span> },
    { key: 'status', label: '状态', width: 80, render: (u) => <Tag color={u.status === '正常' ? 'green' : 'default'}>{u.status}</Tag> },
    {
      key: '__op',
      label: '启用 / 停用',
      width: 116,
      render: (u) => (
        <Space size={6}>
          <Switch size="small" checked={u.status === '正常'} onChange={() => toggleUser(u)} />
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{u.status === '正常' ? '启用' : '停用'}</span>
        </Space>
      )
    }
  ];

  const indicatorColumns = [
    { key: 'name', label: '指标名称' },
    { key: 'level', label: '层级', width: 120, render: (it) => <span style={{ color: 'var(--text-3)' }}>{it.level || it.region_name || '—'}</span> },
    { key: 'target', label: '目标值', width: 110, align: 'right' },
    { key: 'actual', label: '执行值', width: 110, align: 'right' },
    { key: 'unit', label: '单位', width: 90, render: (it) => <span style={{ color: 'var(--text-3)' }}>{it.unit || '—'}</span> },
    {
      key: 'warn',
      label: '预警',
      width: 90,
      render: (it) => (
        <Tag color={it.warn === '红牌' ? 'red' : it.warn === '黄牌' ? 'gold' : 'green'}>{it.warn || '正常'}</Tag>
      )
    }
  ];

  const auditColumns = [
    { key: 'created_at', label: '时间', width: 160, render: (a) => <span style={{ color: 'var(--text-4)', whiteSpace: 'nowrap' }}>{a.created_at}</span> },
    { key: 'name', label: '账号', width: 110, render: (a) => a.name || a.username },
    { key: 'action', label: '操作', width: 100, render: (a) => <Tag color="blue">{a.action}</Tag> },
    { key: 'target', label: '对象', width: 170, render: (a) => <span style={{ color: 'var(--text-3)' }}>{a.target}</span> },
    { key: 'detail', label: '详情', render: (a) => <span style={{ color: 'var(--text-3)' }}>{a.detail}</span> }
  ];

  const counts = Object.entries(h.counts || {});
  const countRows = counts.map(([k, v]) => ({ id: k, table: k, rows: v }));

  const tabItems = [
    {
      key: 'user',
      label: '用户与分权',
      children: (
        <Section icon={UserIcon} title="用户与分权" sub={`${userList.length} 个账号 · 停用 ${stopped} 个`}>
          <ErrorBar error={users.error} onRetry={() => users.reload()} />
          <DataTable
            dense
            rowKey="id"
            columns={userColumns}
            rows={userList}
            loading={users.loading && !users.data}
            scrollX={980}
            empty="暂无用户数据。"
          />
        </Section>
      )
    },
    {
      key: 'indicator',
      label: '指标监测',
      children: (
        <div className="content">
          <section className="card">
            <div className="card-head">
              <h3 className="card-title">规划指标预警口径</h3>
              <span className="card-sub">实际值 / 目标值 ≥ 90% 黄牌、≥ 100% 红牌</span>
            </div>
            <div className="card-body" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 12, paddingBottom: 12 }}>
              <Tag color="red">红牌 {indicator.data?.totals?.red ?? 0}</Tag>
              <Tag color="gold">黄牌 {indicator.data?.totals?.yellow ?? 0}</Tag>
              <Tag color="green">正常 {indicator.data?.totals?.normal ?? 0}</Tag>
            </div>
          </section>
          <Section title="规划指标监测" sub={`${(indicator.data?.indicators || []).length} 项指标`}>
            <ErrorBar error={indicator.error} onRetry={() => indicator.reload()} />
            <DataTable
              dense
              rowKey="id"
              columns={indicatorColumns}
              rows={indicator.data?.indicators || []}
              loading={indicator.loading && !indicator.data}
              scrollX={680}
              empty="暂无规划指标数据。"
            />
          </Section>
        </div>
      )
    },
    {
      key: 'audit',
      label: '操作审计',
      children: (
        <Section icon={CheckmarkBadge02Icon} title="操作审计" sub="最近 50 条操作留痕">
          <ErrorBar error={audit.error} onRetry={() => audit.reload()} />
          <DataTable
            dense
            rowKey="id"
            columns={auditColumns}
            rows={audit.data?.list || []}
            loading={audit.loading && !audit.data}
            scrollX={760}
            empty="暂无审计记录。"
          />
        </Section>
      )
    },
    {
      key: 'health',
      label: '运行健康',
      children: (
        <div className="content-grid">
          <div className="span-6">
            <section className="card">
              <div className="card-head">
                <h3 className="card-title"><Ic icon={CloudServerIcon} size={15} /> 运行健康</h3>
                <Tag color={health.error ? 'gold' : 'green'}>{health.error ? '异常' : '正常'}</Tag>
              </div>
              <div className="card-body">
                <Descriptions
                  column={1}
                  size="small"
                  items={[
                    { key: 'time', label: '服务时间', children: h.time || '—' },
                    { key: 'db', label: '数据库', children: h.db || '—' },
                    { key: 'tables', label: '数据表数量', children: `${h.tables ?? '—'} 张` },
                    {
                      key: 'note',
                      label: '备注',
                      children: '演示环境使用单进程 Express + SQLite（WAL），生产建议容器化并挂载持久卷。'
                    }
                  ]}
                />
              </div>
            </section>
          </div>
          <div className="span-6">
            <Section icon={Database01Icon} title="数据规模" sub={`${counts.length} 张业务表`}>
              <ErrorBar error={health.error} onRetry={() => health.reload()} />
              <DataTable
                dense
                rowKey="id"
                columns={[
                  { key: 'table', label: '数据表' },
                  {
                    key: 'rows',
                    label: '记录数',
                    width: 120,
                    align: 'right',
                    render: (r) => Number(r.rows).toLocaleString('zh-CN')
                  }
                ]}
                rows={countRows}
                loading={health.loading && !health.data}
                scrollX={320}
                empty="暂无数据规模统计。"
              />
            </Section>
          </div>
        </div>
      )
    }
  ];

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">系统管理</h1>
          <p className="page-desc">统一用户与省市县三级分权、操作审计、运行健康与规划指标监测。</p>
        </div>
        <div className="page-actions">
          <Button icon={<Ic icon={Refresh01Icon} size={14} />} onClick={reloadAll}>刷新全部</Button>
          <Button type="primary" icon={<Ic icon={Add01Icon} size={14} />} onClick={openDrawer}>新增用户</Button>
        </div>
      </header>

      <div className="content">
        <div className="kpi-row">
          <div className="kpi-card" style={{ boxShadow: 'none' }}>
            <span className="kpi-label">当前账号</span>
            <b className="kpi-value" style={{ fontSize: 16, fontFamily: 'var(--font-sans)' }}>{user?.name || '—'}</b>
            <span className="kpi-delta flat">{roleLabel} · {user?.org || '—'}</span>
          </div>
          <div className="kpi-card" style={{ boxShadow: 'none' }}>
            <span className="kpi-label">账号总数</span>
            <b className="kpi-value">{userList.length || '—'}<i className="kpi-unit">个</i></b>
            <span className="kpi-delta flat">停用 {stopped} 个 · 按行政区划可见范围统计</span>
          </div>
          <div className="kpi-card" style={{ boxShadow: 'none' }}>
            <span className="kpi-label">数据表</span>
            <b className="kpi-value">{h.tables ?? '—'}<i className="kpi-unit">张</i></b>
            <span className="kpi-delta flat">SQLite（node:sqlite）</span>
          </div>
          <div className="kpi-card" style={{ boxShadow: 'none' }}>
            <span className="kpi-label">服务时间</span>
            <b className="kpi-value" style={{ fontSize: 15, fontFamily: 'var(--font-sans)' }}>
              {h.time ? String(h.time).slice(0, 16).replace('T', ' ') : '—'}
            </b>
            <span className={`kpi-delta ${health.error ? 'down' : 'up'}`}>{health.error ? '健康检查异常' : '接口健康检查通过'}</span>
          </div>
        </div>

        <Tabs activeKey={tab} onChange={setTab} items={tabItems} />
      </div>

      <Drawer
        open={drawer}
        title="新增用户"
        width={520}
        onClose={closeDrawer}
        footer={(
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={closeDrawer}>取消</Button>
            <Button type="primary" loading={busy} icon={<Ic icon={Add01Icon} size={14} />} onClick={() => form.submit()}>
              创建账号
            </Button>
          </div>
        )}
      >
        <div className="alert-line" style={{ marginBottom: 16 }}>
          <Ic icon={Shield01Icon} size={13} /> 县级账号仅能管理本级及下级；角色决定数据可见范围。
        </div>
        <p className="card-sub" style={{ margin: '0 0 8px' }}>账号、密码、姓名为必填项；新增/停用用户需市级及以上权限。</p>
        <p className="card-sub" style={{ margin: '0 0 16px' }}>
          默认区划：{watchRegionCode || emptyUser.region_code} {watchRegionName || emptyUser.region_name}
        </p>
        <Form form={form} layout="vertical" initialValues={emptyUser} onFinish={createUser} requiredMark>
          <Form.Item name="username" label="账号" rules={[{ required: true, message: '请输入账号' }]}>
            <Input autoComplete="off" placeholder="如：su-pengzhou-01" />
          </Form.Item>
          <Form.Item name="password" label="初始密码" rules={[{ required: true, message: '请输入初始密码' }]}>
            <Input.Password autoComplete="new-password" placeholder="首次登录后建议修改" />
          </Form.Item>
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="如：张伟" />
          </Form.Item>
          <Form.Item name="role" label="角色">
            <Select options={ROLES.map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          <Form.Item name="org" label="所属单位">
            <Input placeholder="如：彭州市自然资源和规划局" />
          </Form.Item>
          <Form.Item name="region_code" label="行政区划代码">
            <Input />
          </Form.Item>
          <Form.Item name="region_name" label="行政区划名称">
            <Input />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  );
}
