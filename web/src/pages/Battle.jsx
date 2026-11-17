import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ic } from '../components/Icon';
import { useApp, useFetch } from '../store.jsx';
import { screen } from '../api';
import { Download01Icon, Refresh01Icon, Search01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';

const FLAG_COLOR = {
  已完成: '#ff5f57',
  推进中: '#35d39a',
  延后: '#ffcc44',
  未完成: '#6c8aa8'
};

function Flag({ status }) {
  const color = FLAG_COLOR[status] || FLAG_COLOR['未完成'];
  return (
    <span className="flag-cell" title={status || '未完成'} style={{ color }}>
      <svg width="17" height="19" viewBox="0 0 17 19" aria-hidden="true">
        <rect x="0.5" y="0.5" width="1.6" height="18" fill="currentColor" />
        <path d="M2.1 1.6h13.4l-3 3.9 3 3.9H2.1z" fill="currentColor" />
      </svg>
    </span>
  );
}

const QUARTERS = [
  { key: 'q1', label: '第一季度' },
  { key: 'q2', label: '第二季度' },
  { key: 'q3', label: '第三季度' },
  { key: 'q4', label: '第四季度' }
];

export default function Battle() {
  const nav = useNavigate();
  const { bootMeta, toast } = useApp();
  const [year, setYear] = useState(2024);
  const [kwInput, setKwInput] = useState('');
  const [kw, setKw] = useState('');

  const q = useFetch(() => screen.battle({ year, kw }), [year, kw]);
  const data = q.data;
  const groups = useMemo(() => data?.groups || [], [data]);
  const stats = data?.stats || { total: 0, done: 0, doing: 0, years: [] };
  const years = stats.years?.length ? stats.years : [2022, 2023, 2024, 2025, 2026];

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
    <div className="battle">
      <div className="battle-toolbar">
        <h1>{year}年地矿行政管理重点任务作战图</h1>
        <div className="battle-tools">
          <select className="select" value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="年度">
            {years.map((y) => <option key={y} value={y}>{y} ▾</option>)}
          </select>
          <div className="input-icon" style={{ width: 240 }}>
            <Ic icon={Search01Icon} size={14} />
            <input
              className="input"
              style={{ paddingLeft: 34 }}
              placeholder="检索重点工作内容"
              value={kwInput}
              onChange={(e) => setKwInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setKw(kwInput.trim());
              }}
            />
          </div>
          <button type="button" className="btn btn-primary" onClick={() => setKw(kwInput.trim())}>搜索</button>
          <button type="button" className="btn btn-ghost" onClick={() => { setKwInput(''); setKw(''); }}>重置</button>
          <button type="button" className="btn btn-ghost" onClick={exportCsv}>
            <Ic icon={Download01Icon} size={14} /> 导出
          </button>
          <button type="button" className="icon-btn" onClick={() => nav(-1)} aria-label="关闭">
            <Ic icon={Cancel01Icon} size={16} />
          </button>
        </div>
      </div>

      <div className="stat-cards">
        <div className="sc">
          <span className="label">任务数</span>
          <span className="num">{stats.total}<small>个</small></span>
        </div>
        <div className="sc done">
          <span className="label">已完成</span>
          <span className="num">{stats.done}<small>个</small></span>
        </div>
        <div className="sc doing">
          <span className="label">进行中</span>
          <span className="num">{stats.doing}<small>个</small></span>
        </div>
      </div>

      {q.loading && !data && <div className="loading"><span className="spinner" />正在加载任务台账 …</div>}

      {data && (
        <>
          <div style={{ maxHeight: 'calc(100vh - 430px)', overflow: 'auto', border: '1px solid rgba(64,158,255,0.2)', borderRadius: 8 }}>
            <table className="battle-table">
              <thead>
                <tr>
                  <th rowSpan={2} style={{ width: 40 }}>任务类型</th>
                  <th rowSpan={2} style={{ width: 62 }}>序号</th>
                  <th rowSpan={2} style={{ width: 250 }}>重点工作内容</th>
                  <th rowSpan={2} style={{ minWidth: 300 }}>预期成果</th>
                  <th rowSpan={2} style={{ width: 90 }}>完成时限</th>
                  <th rowSpan={2} style={{ width: 96 }}>责任部门</th>
                  <th rowSpan={2} style={{ width: 110 }}>支撑部门</th>
                  <th colSpan={4}>阶段性完成情况</th>
                </tr>
                <tr>
                  {QUARTERS.map((qq) => <th key={qq.key} style={{ width: 76 }}>{qq.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => {
                  const items = g.items || [];
                  /* 计算「重点工作内容」列的纵向合并 */
                  const spans = [];
                  items.forEach((it, i) => {
                    const prev = items[i - 1];
                    spans.push(prev && prev.content === it.content ? 0 : items.filter((x) => x.content === it.content).length);
                  });
                  const merged = new Set();
                  return items.map((it, i) => (
                    <tr key={it.id}>
                      {i === 0 && (
                        <td className="merge" rowSpan={items.length} style={{ width: 96 }}>
                          {g.category.split('').map((ch, ci) => <div key={ci}>{ch}</div>)}
                        </td>
                      )}
                      <td>{it.seq}</td>
                      {!merged.has(it.content) && (() => {
                        merged.add(it.content);
                        return <td className="left" rowSpan={spans[i]}>{it.content}</td>;
                      })()}
                      <td className="left">{it.outcome}</td>
                      <td>{it.deadline}</td>
                      <td>{it.dept}</td>
                      <td>{it.support_dept}</td>
                      {QUARTERS.map((qq) => <td key={qq.key}><Flag status={it[qq.key]} /></td>)}
                    </tr>
                  ));
                })}
                {groups.length === 0 && (
                  <tr>
                    <td colSpan={11}>
                      <div className="table-empty">该年度下没有匹配的重点任务</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="battle-legend">
            <span><Flag status="已完成" /> 已完成</span>
            <span><Flag status="推进中" /> 推进中</span>
            <span><Flag status="延后" /> 延后</span>
            <span><Flag status="未完成" /> 未完成</span>
          </div>
        </>
      )}

      {q.error && (
        <div className="alert-line err" style={{ marginTop: 14 }}>
          加载失败：{q.error}
          <button type="button" className="btn-link" style={{ marginLeft: 10 }} onClick={q.reload}>
            <Ic icon={Refresh01Icon} size={12} /> 重试
          </button>
        </div>
      )}

      <p className="muted tiny" style={{ marginTop: 14, lineHeight: 1.8 }}>
        说明：任务类型、责任部门与季度推进状态取自年度重点任务台账；旗帜颜色对应截图口径（红=已完成、绿=推进中、黄=延后、灰=未完成）。
      </p>
      {bootMeta && (
        <p className="muted tiny" style={{ lineHeight: 1.8 }}>
          当前账号：{bootMeta.user?.name}（{bootMeta.user?.org}），可见范围为{bootMeta.user?.region_code === '330000' ? '全省' : '本级及下级'}任务。
        </p>
      )}
    </div>
  );
}
