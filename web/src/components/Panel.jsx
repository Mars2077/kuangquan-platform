import React from 'react';
import { Ic } from './Icon';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';

export function Panel({ title, more, onMore, children, className = '', style, bodyClass = '', actions }) {
  return (
    <section className={`panel ${className}`} style={style}>
      <header className="panel-head">
        <h2>{title}</h2>
        {actions}
        {more !== false && (
          <button type="button" className="panel-more" onClick={onMore} aria-label={`查看${title}详情`}>
            {more || '详情'}
            <Ic icon={ArrowRight01Icon} size={11} />
          </button>
        )}
      </header>
      <div className={`panel-body ${bodyClass}`}>{children}</div>
    </section>
  );
}

export function StatRows({ rows }) {
  return (
    <div className="stat-list">
      {rows.map((r, i) => (
        <div className="stat-row" key={r.label + i}>
          <span className="k">{r.label}</span>
          <span className={`v${r.tone === 'warm' ? ' warm' : ''}`}>{r.display ?? r.value}</span>
          {r.unit && <span className="u">{r.unit}</span>}
          {r.suffix && <span className="sfx">{r.suffix}</span>}
          {r.delta !== undefined && r.delta !== null && (
            <span className={`d ${r.delta >= 0 ? 'up' : 'down'}`}>
              {r.delta >= 0 ? '▲' : '▼'} {Math.abs(r.delta).toFixed(1)}%
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export function Tabs({ items, value, onChange, className = '' }) {
  return (
    <div className={`tabs ${className}`} role="tablist">
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          role="tab"
          aria-selected={value === it.key}
          className={`tab${value === it.key ? ' on' : ''}`}
          onClick={() => onChange(it.key)}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
