import React from 'react';

/**
 * 深色数据表：列定义 { key, label, width, align, render(row), className }
 */
export function DataTable({ columns, rows = [], loading, empty = '暂无数据', onRowClick, rowKey = 'id', selectedKey, className = '', dense }) {
  if (loading) {
    return (
      <div className="loading">
        <span className="spinner" />
        正在加载数据 …
      </div>
    );
  }
  return (
    <div className={`table-wrap ${className}`}>
      <table className={`data-table${dense ? ' dense' : ''}`}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={{ width: c.width }} className={c.align === 'right' ? 'num' : ''}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length}>
                <div className="table-empty">{empty}</div>
              </td>
            </tr>
          )}
          {rows.map((row, i) => {
            const key = row[rowKey] ?? i;
            return (
              <tr
                key={key}
                className={selectedKey !== undefined && selectedKey === row[rowKey] ? 'selected' : ''}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                style={onRowClick ? { cursor: 'pointer' } : undefined}
              >
                {columns.map((c) => (
                  <td key={c.key} className={c.align === 'right' ? 'num' : ''}>
                    {c.render ? c.render(row, i) : row[c.key] ?? '—'}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function Pager({ page, pageSize, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return <div className="pager">共 {total} 条</div>;
  const nums = [];
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  for (let i = start; i <= Math.min(pages, start + 4); i += 1) nums.push(i);
  return (
    <div className="pager">
      <span>
        共 {total} 条 / {pages} 页
      </span>
      <button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="上一页">
        ‹
      </button>
      {nums.map((n) => (
        <button key={n} type="button" className={n === page ? 'on' : ''} onClick={() => onChange(n)}>
          {n}
        </button>
      ))}
      <button type="button" onClick={() => onChange(page + 1)} disabled={page >= pages} aria-label="下一页">
        ›
      </button>
    </div>
  );
}
