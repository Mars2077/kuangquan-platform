import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Col, Empty, Input, Row, Select, Statistic, Table, Tooltip } from 'antd';
import { Ic } from '../components/Icon';
import { useApp, useFetch } from '../store.jsx';
import { screen } from '../api';
import {
  Cancel01Icon,
  Download01Icon,
  PlayCircleIcon,
  Refresh01Icon,
  Search01Icon,
  Task01Icon,
  Tick02Icon
} from '@hugeicons/core-free-icons';

const DEFAULT_YEAR = 2024;

const QUARTERS = [
  { key: 'q1', label: '一季度' },
  { key: 'q2', label: '二季度' },
  { key: 'q3', label: '三季度' },
  { key: 'q4', label: '四季度' }
];

/* 旗形图标：旗杆 + 燕尾旗面，颜色取 tokens；.flag + 兼容修饰类用于隐去圆点并锁定尺寸 */
const FLAG_TONE = {
  已完成: { cls: 'done', color: 'var(--red)' },
  推进中: { cls: 'doing', color: 'var(--green)' },
  延后: { cls: 'delay', color: 'var(--yellow)' },
  未完成: { cls: 'none', color: 'var(--text-4)' }
};

const FLAG_GLYPH = (
  <>
    <rect x="1.4" y="0.6" width="2" height="18" rx="1" fill="currentColor" opacity="0.5" />
    <path d="M4.2 1.4h11.6l-3.1 4.3 3.1 4.3H4.2z" fill="currentColor" />
  </>
);

function Flag({ status }) {
  const label = FLAG_TONE[status] ? status : '未完成';
  const tone = FLAG_TONE[status] || FLAG_TONE.未完成;
  return (
    <span
      className={`flag ${tone.cls}`}
      role="img"
      title={label}
      aria-label={label}
      style={{ color: tone.color, lineHeight: 0, verticalAlign: 'middle' }}
    >
      <svg width="17" height="19" viewBox="0 0 17 19" fill="none" aria-hidden="true" focusable="false">
        {FLAG_GLYPH}
      </svg>
    </span>
  );
}

/* 任务类型竖排单字 */
const VERTICAL = {
  writingMode: 'vertical-rl',
  textOrientation: 'upright',
  letterSpacing: 3,
  lineHeight: 1.5
};

export default function Battle() {
  const { bootMeta, toast } = useApp();
  const nav = useNavigate();
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 620px)').matches);
  const [year, setYear] = useState(DEFAULT_YEAR);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 620px)');
    const onChange = (e) => setNarrow(e.matches);
    mq.addEventListener('change', onChange);
    setNarrow(mq.matches);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const [kwInput, setKwInput] = useState('');
  const [kw, setKw] = useState('');

  const q = useFetch(() => screen.battle({ year, kw }), [year, kw]);
  const data = q.data;
  const groups = useMemo(() => data?.groups || [], [data]);
  const stats = data?.stats || { total: 0, done: 0, doing: 0, years: [] };
  const years = stats.years?.length ? stats.years : [2022, 2023, 2024, 2025, 2026];
  const scope = bootMeta?.user?.region_code === '510000' ? '全省' : '本级及下级';

  const search = () => setKw(kwInput.trim());
  const reset = () => {
    setYear(DEFAULT_YEAR);
    setKwInput('');
    setKw('');
  };
  const close = () => nav('/dashboard');

  /* 分组拍平：每行带上「任务类型」「重点工作内容」的合并行数，交给 columns.onCell 返回 rowSpan */
  const tableRows = useMemo(() => {
    const out = [];
    groups.forEach((g) => {
      const items = g.items || [];
      /* 重点工作内容：仅合并「连续」同值单元格 */
      const spans = items.map((it, i) => {
        if (i > 0 && items[i - 1].content === it.content) return 0;
        let n = 1;
        while (items[i + n] && items[i + n].content === it.content) n += 1;
        return n;
      });
      items.forEach((it, i) => {
        out.push({
          ...it,
          __cat: g.category,
          __catSpan: i === 0 ? items.length : 0,
          __contentSpan: spans[i]
        });
      });
    });
    return out;
  }, [groups]);

  const columns = useMemo(
    () => [
      {
        title: '任务类型',
        dataIndex: '__cat',
        key: '__cat',
        width: 48,
        align: 'center',
        onCell: (row) => ({ rowSpan: row.__catSpan }),
        render: (v) => <span style={VERTICAL}>{v}</span>
      },
      { title: '序号', dataIndex: 'seq', key: 'seq', width: 56, align: 'center' },
      {
        title: '重点工作内容',
        dataIndex: 'content',
        key: 'content',
        width: '24%',
        onCell: (row) => ({ rowSpan: row.__contentSpan })
      },
      { title: '预期成果', dataIndex: 'outcome', key: 'outcome', width: '30%' },
      { title: '完成时限', dataIndex: 'deadline', key: 'deadline', width: 84, align: 'center' },
      { title: '责任部门', dataIndex: 'dept', key: 'dept', width: 96 },
      { title: '支撑部门', dataIndex: 'support_dept', key: 'support_dept', width: 104 },
      {
        title: '阶段性完成情况',
        key: 'quarters',
        align: 'center',
        children: QUARTERS.map((qq) => ({
          title: qq.label,
          dataIndex: qq.key,
          key: qq.key,
          width: 84,
          align: 'center',
          render: (v) => <Flag status={v} />
        }))
      }
    ],
    []
  );

  const exportCsv = () => {
    const rows = [['任务类型', '序号', '重点工作内容', '预期成果', '完成时限', '责任部门', '支撑部门', '第一季度', '第二季度', '第三季度', '第四季度', '整体状态']];
    (data?.list || []).forEach((r) => {
      rows.push([r.category, r.seq, r.content, r.outcome, r.deadline, r.dept, r.support_dept, r.q1, r.q2, r.q3, r.q4, r.status]);
    });
    if (rows.length === 1) {
      toast('当前没有可导出的任务', 'err');
      return;
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${year}年地矿行政管理重点任务作战图.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    toast(`已导出 ${rows.length - 1} 条任务`);
  };

  return (
    <div className="battle" style={{ padding: 12 }}>
      <Card size="small" styles={{ body: { padding: '12px 16px' } }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h1
            style={{
              margin: 0,
              fontSize: narrow ? 18 : 22,
              fontWeight: 600,
              letterSpacing: '0.04em',
              lineHeight: 1.35,
              color: 'var(--text-1)',
              whiteSpace: 'normal'
            }}
          >
            {year}年地矿行政管理重点任务作战图
          </h1>
          <Select
            value={year}
            onChange={(v) => setYear(v)}
            options={years.map((y) => ({ value: y, label: `${y} 年` }))}
            style={{ width: 108 }}
            aria-label="年度"
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginLeft: 'auto',
              flexWrap: 'wrap',
              minWidth: 0
            }}
          >
            <Input
              allowClear
              prefix={<Ic icon={Search01Icon} size={14} />}
              placeholder="检索重点工作内容"
              value={kwInput}
              onChange={(e) => setKwInput(e.target.value)}
              onPressEnter={search}
              style={{ width: narrow ? '100%' : 240 }}
              aria-label="关键词"
            />
            <Button type="primary" onClick={search}>搜索</Button>
            <Button onClick={reset}>重置</Button>
            <Button icon={<Ic icon={Download01Icon} size={14} />} onClick={exportCsv}>导出</Button>
            <Tooltip title="关闭并返回驾驶舱">
              <Button
                icon={<Ic icon={Cancel01Icon} size={15} />}
                onClick={close}
                aria-label="关闭"
              />
            </Tooltip>
          </div>
        </div>
      </Card>

      <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
        <Col xs={24} md={8}>
          <Card size="small">
            <Statistic
              title="重点任务"
              value={stats.total}
              suffix="个"
              prefix={<Ic icon={Task01Icon} size={16} />}
              valueStyle={{ color: '#49c3ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card size="small">
            <Statistic
              title="已完成"
              value={stats.done}
              suffix="个"
              prefix={<Ic icon={Tick02Icon} size={16} />}
              valueStyle={{ color: '#35d39a' }}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card size="small">
            <Statistic
              title="进行中"
              value={stats.doing}
              suffix="个"
              prefix={<Ic icon={PlayCircleIcon} size={16} />}
              valueStyle={{ color: '#9adcff' }}
            />
          </Card>
        </Col>
      </Row>

      {q.error ? (
        <Alert
          style={{ marginTop: 12 }}
          type="error"
          showIcon
          message={`任务数据加载失败：${q.error}`}
          action={(
            <Button size="small" icon={<Ic icon={Refresh01Icon} size={13} />} onClick={q.reload}>
              重试
            </Button>
          )}
        />
      ) : (
        <Card size="small" style={{ marginTop: 12 }} styles={{ body: { padding: 0 } }}>
          <Table
            rowKey="id"
            size="small"
            bordered
            loading={q.loading && !data}
            columns={columns}
            dataSource={tableRows}
            pagination={false}
            scroll={narrow ? { x: 1180 } : undefined}
            locale={{
              emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`${year} 年没有匹配的重点任务`} />
            }}
          />
        </Card>
      )}

      <div className="battle-legend">
        {['已完成', '推进中', '延后', '未完成'].map((s) => (
          <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Flag status={s} />
            {s}
          </span>
        ))}
        <span className="page-desc" style={{ marginLeft: 'auto' }}>
          当前账号：{bootMeta?.user?.name || '—'}（{bootMeta?.user?.org || '—'}），可见范围{scope}任务
        </span>
      </div>
    </div>
  );
}
