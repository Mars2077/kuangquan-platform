import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ic } from '../components/Icon';
import { useApp, useFetch } from '../store.jsx';
import { screen } from '../api';
import { Download01Icon, Refresh01Icon, Search01Icon } from '@hugeicons/core-free-icons';

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

export default function Battle() {
  const { bootMeta, toast } = useApp();
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
      <div className="battle-head">
        <div style={{ minWidth: 0 }}>
          <nav className="breadcrumb" aria-label="位置">
            <Link to="/portal">平台分布</Link>
            <span className="sep">/</span>
            <span>重点任务作战图</span>
          </nav>
          <h1 className="page-title" style={{ fontSize: 16, marginTop: 6 }}>{year}年地矿行政管理重点任务作战图</h1>
          <p>年度重点任务台账 · 按任务类型归集，四季度推进状态与整体成果一屏盯办</p>
        </div>
        <span className="badge badge--ok">按行政区划授权可见</span>
      </div>

      <div
        className="battle-cards"
        style={{ gridTemplateColumns: narrow ? 'minmax(0, 1fr)' : 'repeat(3, minmax(0, 1fr))' }}
      >
        <div className="battle-card">
          <span>重点任务</span>
          <b>{stats.total}<i className="kpi-unit">个</i></b>
          <span className="kpi-delta">{groups.length} 个任务类型</span>
        </div>
        <div className="battle-card">
          <span>已完成</span>
          <b>{stats.done}<i className="kpi-unit">个</i></b>
          <span className="kpi-delta">整体状态为已完成</span>
        </div>
        <div className="battle-card">
          <span>进行中</span>
          <b>{stats.doing}<i className="kpi-unit">个</i></b>
          <span className="kpi-delta">跨季度持续推进</span>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar-filters">
          <select
            className="select"
            style={{ width: 108 }}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            aria-label="年度"
          >
            {years.map((y) => <option key={y} value={y}>{y} 年</option>)}
          </select>
        </div>
        <div className="toolbar-search">
          <Ic icon={Search01Icon} size={14} />
          <input
            className="input"
            placeholder="检索重点工作内容 / 预期成果"
            value={kwInput}
            onChange={(e) => setKwInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') search();
            }}
          />
        </div>
        <div className="toolbar-actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={search}>搜索</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={reset}>重置</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={exportCsv}>
            <Ic icon={Download01Icon} size={14} /> 导出
          </button>
        </div>
      </div>

      {q.loading && !data && (
        <div className="battle-table" style={{ padding: 16 }}>
          <div className="skeleton">
            <div className="skeleton-line" />
            <div className="skeleton-line" />
            <div className="skeleton-line" />
          </div>
        </div>
      )}

      {q.error && (
        <div className="battle-table" style={{ padding: 16 }}>
          <div className="empty is-error">
            <div className="empty-icon"><Ic icon={Refresh01Icon} size={26} /></div>
            <p className="empty-text">加载失败：{q.error}</p>
            <div className="empty-action">
              <button type="button" className="btn btn-ghost btn-sm" onClick={q.reload}>
                <Ic icon={Refresh01Icon} size={13} /> 重试
              </button>
            </div>
          </div>
        </div>
      )}

      {data && !q.error && groups.length === 0 && (
        <div className="battle-table" style={{ padding: 16 }}>
          <div className="empty">
            <div className="empty-icon"><Ic icon={Search01Icon} size={26} /></div>
            <p className="empty-text">{year} 年没有匹配的重点任务</p>
            <div className="empty-action">
              <button type="button" className="btn btn-ghost btn-sm" onClick={reset}>清空检索条件</button>
            </div>
          </div>
        </div>
      )}

      {groups.length > 0 && (
        <>
          <div className="battle-table">
            <table className="data-table is-dense" style={{ minWidth: 1180 }}>
              <thead>
                <tr>
                  <th rowSpan={2} style={{ width: 92, textAlign: 'center' }}>任务类型</th>
                  <th rowSpan={2} style={{ width: 56, textAlign: 'center' }}>序号</th>
                  <th rowSpan={2} style={{ width: 250 }}>重点工作内容</th>
                  <th rowSpan={2} style={{ minWidth: 280 }}>预期成果</th>
                  <th rowSpan={2} style={{ width: 84, textAlign: 'center' }}>完成时限</th>
                  <th rowSpan={2} style={{ width: 96 }}>责任部门</th>
                  <th rowSpan={2} style={{ width: 104 }}>支撑部门</th>
                  <th colSpan={4} style={{ textAlign: 'center' }}>阶段性完成情况</th>
                </tr>
                <tr>
                  {QUARTERS.map((qq) => (
                    <th key={qq.key} style={{ width: 84, textAlign: 'center' }}>{qq.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => {
                  const items = g.items || [];
                  /* 重点工作内容：仅合并「连续」同值单元格 */
                  const spans = items.map((it, i) => {
                    if (i > 0 && items[i - 1].content === it.content) return 0;
                    let n = 1;
                    while (items[i + n] && items[i + n].content === it.content) n += 1;
                    return n;
                  });
                  return items.map((it, i) => (
                    <tr key={it.id}>
                      {i === 0 && (
                        <td rowSpan={items.length} style={{ width: 92, textAlign: 'center', verticalAlign: 'middle', lineHeight: 1.5 }}>
                          {g.category}
                        </td>
                      )}
                      <td style={{ textAlign: 'center' }}>{it.seq}</td>
                      {spans[i] > 0 && <td rowSpan={spans[i]}>{it.content}</td>}
                      <td>{it.outcome}</td>
                      <td style={{ textAlign: 'center' }}>{it.deadline}</td>
                      <td>{it.dept}</td>
                      <td>{it.support_dept}</td>
                      {QUARTERS.map((qq) => (
                        <td key={qq.key} style={{ textAlign: 'center' }}>
                          <Flag status={it[qq.key]} />
                        </td>
                      ))}
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>

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
        </>
      )}
    </div>
  );
}
