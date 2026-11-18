import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

/* v4 参考截图：梯形斜切统计卡（上下边内收）+ 底部发光台座，只能用内联样式 */
const STAT_TONE = {
  cyan: { fg: '#7fe3ff', bg: 'rgba(73, 195, 255, 0.18)', bd: 'rgba(73, 195, 255, 0.85)' },
  green: { fg: '#8ff0c8', bg: 'rgba(53, 211, 154, 0.18)', bd: 'rgba(53, 211, 154, 0.85)' },
  blue: { fg: '#9adcff', bg: 'rgba(46, 168, 255, 0.18)', bd: 'rgba(46, 168, 255, 0.85)' }
};

function StatCard({ icon, tone = 'cyan', label, value, unit }) {
  const t = STAT_TONE[tone] || STAT_TONE.cyan;
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        height: 96,
        padding: '0 28px',
        clipPath: 'polygon(18px 0, 100% 0, calc(100% - 18px) 100%, 0 100%)',
        background: 'linear-gradient(180deg, rgba(22, 74, 128, 0.95), rgba(10, 34, 62, 0.85))',
        border: '1px solid rgba(64, 158, 255, 0.55)'
      }}
    >
      <span
        style={{
          display: 'grid',
          placeItems: 'center',
          flex: 'none',
          width: 32,
          height: 32,
          color: t.fg,
          background: t.bg,
          border: `1px solid ${t.bd}`,
          borderRadius: 4
        }}
      >
        <Ic icon={icon} size={18} />
      </span>
      <span style={{ fontSize: 14, letterSpacing: '0.06em', color: '#a8cdee', whiteSpace: 'nowrap' }}>{label}</span>
      <b
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 34,
          fontWeight: 700,
          lineHeight: 1,
          color: t.fg,
          textShadow: `0 0 14px ${t.fg}66`
        }}
      >
        {value}
      </b>
      <span style={{ fontSize: 12, color: '#a8cdee' }}>{unit}</span>
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '15%',
          right: '15%',
          bottom: 0,
          height: 2,
          background: 'linear-gradient(90deg, transparent, #7fe3ff, transparent)',
          filter: 'blur(0.4px)'
        }}
      />
    </div>
  );
}

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
      <div
        className="battle-head"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
          padding: '10px 14px',
          background: 'linear-gradient(180deg, rgba(14, 46, 82, 0.92), rgba(8, 24, 44, 0.72))',
          border: '1px solid rgba(64, 158, 255, 0.35)',
          borderRadius: 'var(--r-sm)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: '1 1 auto', flexWrap: 'wrap' }}>
          <h1
            className="page-title"
            style={{
              margin: 0,
              fontSize: narrow ? 18 : 24,
              letterSpacing: '0.06em',
              lineHeight: 1.35,
              color: '#fff',
              whiteSpace: 'normal'
            }}
          >
            {year}年地矿行政管理重点任务作战图
          </h1>
          <select
            className="select"
            style={{ width: 100, height: 34, flex: 'none' }}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            aria-label="年度"
          >
            {years.map((y) => <option key={y} value={y}>{y} 年</option>)}
          </select>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginLeft: 'auto',
            minWidth: 0,
            flex: '0 1 auto',
            flexWrap: narrow ? 'wrap' : 'nowrap'
          }}
        >
          <div className="toolbar-search" style={{ flex: '0 1 220px', maxWidth: 220, minWidth: 150 }}>
            <Ic icon={Search01Icon} size={14} />
            <input
              className="input"
              style={{ height: 34 }}
              placeholder="检索重点工作内容"
              value={kwInput}
              onChange={(e) => setKwInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') search();
              }}
            />
          </div>
          <button type="button" className="btn btn-primary" style={{ height: 34 }} onClick={search}>搜索</button>
          <button type="button" className="btn btn-ghost" style={{ height: 34 }} onClick={reset}>重置</button>
          <button type="button" className="btn btn-ghost" style={{ height: 34 }} onClick={exportCsv}>
            <Ic icon={Download01Icon} size={14} /> 导出
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ width: 34, height: 34, padding: 0 }}
            onClick={close}
            aria-label="关闭"
            title="关闭并返回平台分布"
          >
            <Ic icon={Cancel01Icon} size={16} />
          </button>
        </div>
      </div>

      <div
        className="battle-cards"
        style={{ gridTemplateColumns: narrow ? 'minmax(0, 1fr)' : 'repeat(3, minmax(0, 1fr))', gap: 'var(--sp-4)' }}
      >
        <StatCard icon={Task01Icon} tone="cyan" label="重点任务" value={stats.total} unit="个" />
        <StatCard icon={Tick02Icon} tone="green" label="已完成" value={stats.done} unit="个" />
        <StatCard icon={PlayCircleIcon} tone="blue" label="进行中" value={stats.doing} unit="个" />
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
                  <th
                    rowSpan={2}
                    style={{
                      width: 40,
                      minWidth: 40,
                      textAlign: 'center',
                      writingMode: 'vertical-rl',
                      textOrientation: 'upright',
                      letterSpacing: 3
                    }}
                  >
                    任务类型
                  </th>
                  <th rowSpan={2} style={{ width: 56, textAlign: 'center' }}>序号</th>
                  <th rowSpan={2} style={{ width: '24%', minWidth: 250 }}>重点工作内容</th>
                  <th rowSpan={2} style={{ width: '30%', minWidth: 280 }}>预期成果</th>
                  <th rowSpan={2} style={{ width: 84, textAlign: 'center' }}>完成时限</th>
                  <th rowSpan={2} style={{ width: 96 }}>责任部门</th>
                  <th rowSpan={2} style={{ width: 104 }}>支撑部门</th>
                  <th colSpan={4} style={{ textAlign: 'center' }}>阶段性完成情况</th>
                </tr>
                <tr>
                  {QUARTERS.map((qq) => (
                    <th key={qq.key} style={{ width: 84, height: 34, textAlign: 'center' }}>{qq.label}</th>
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
                        <td
                          rowSpan={items.length}
                          style={{
                            width: 40,
                            minWidth: 40,
                            maxWidth: 40,
                            textAlign: 'center',
                            verticalAlign: 'middle',
                            padding: '6px 0',
                            writingMode: 'vertical-rl',
                            textOrientation: 'upright',
                            letterSpacing: 3,
                            lineHeight: 1.5
                          }}
                        >
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
