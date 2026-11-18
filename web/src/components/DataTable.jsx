import React from 'react';
import { Table, Pagination, Empty, Spin } from 'antd';

/**
 * 数据表：列定义沿用 { key, label, width, align, render(row, i) }，
 * 渲染交给 antd Table（统一表头、行高、hover、空状态与响应式滚动）。
 */
export function DataTable({
  columns = [], rows = [], loading, empty = '暂无数据',
  onRowClick, rowKey = 'id', selectedKey, className = '', dense, scrollX
}) {
  const cols = columns.map((c) => ({
    key: c.key,
    dataIndex: c.key,
    title: c.label,
    width: c.width,
    align: c.align === 'right' ? 'right' : 'left',
    ellipsis: c.ellipsis,
    render: (_, row, i) => (c.render ? c.render(row, i) : row[c.key] ?? '—')
  }));

  if (loading) {
    return (
      <div className="loading">
        <Spin size="small" />
        <span>正在加载数据 …</span>
      </div>
    );
  }

  const keyOf = (r, i) => (typeof rowKey === 'function' ? rowKey(r) : r[rowKey] ?? i);

  return (
    <div className={`table-wrap ${className}`}>
      <Table
        size={dense ? 'small' : 'middle'}
        bordered={false}
        columns={cols}
        dataSource={rows.map((r, i) => ({ ...r, __k: keyOf(r, i) }))}
        rowKey="__k"
        pagination={false}
        scroll={scrollX ? { x: scrollX } : undefined}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={empty} /> }}
        rowClassName={(row) => (selectedKey !== undefined && selectedKey === keyOf(row) ? 'row-selected' : '')}
        onRow={onRowClick ? (row) => ({ onClick: () => onRowClick(row) }) : undefined}
      />
    </div>
  );
}

export function Pager({ page = 1, pageSize = 20, total = 0, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="pager">
      <span className="pager-total">共 {total} 条 / {pages} 页</span>
      <Pagination
        size="small"
        current={page}
        pageSize={pageSize}
        total={total}
        showSizeChanger={false}
        onChange={onChange}
      />
    </div>
  );
}
