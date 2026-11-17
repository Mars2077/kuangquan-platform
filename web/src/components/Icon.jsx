import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';

/**
 * 统一图标封装：全部使用 @hugeicons/core-free-icons 的真实图标集，
 * 不用手绘近似图形替代既有图标语义。
 */
export function Ic({ icon, size = 16, strokeWidth = 1.7, className = '', color = 'currentColor', style }) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      strokeWidth={strokeWidth}
      color={color}
      className={className}
      style={{ display: 'block', flex: '0 0 auto', ...style }}
    />
  );
}

/** 平台六边形标志（本产品自有标识） */
export function BrandMark({ size = 34 }) {
  return (
    <svg className="brand-logo" viewBox="0 0 40 46" width={size} height={size * 1.15} aria-hidden="true">
      <defs>
        <linearGradient id="bmStroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#9be6ff" />
          <stop offset="100%" stopColor="#2d8ee0" />
        </linearGradient>
        <linearGradient id="bmFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5fd0ff" />
          <stop offset="100%" stopColor="#1c6fd6" />
        </linearGradient>
      </defs>
      <path d="M20 2 36.5 11.5v21L20 43 3.5 32.5v-21z" fill="none" stroke="url(#bmStroke)" strokeWidth="1.6" />
      <path d="M20 9.5 30 15v10.5L20 31l-10-5.5V15z" fill="url(#bmFill)" opacity="0.9" />
      <path d="M20 15.5 25.5 18.5v6L20 27.5 14.5 24.5v-6z" fill="#eaf9ff" opacity="0.92" />
    </svg>
  );
}

/** 小旗帜（作战图季度状态） */
export function QuarterFlag({ status }) {
  const map = {
    已完成: { cls: 'done', label: '已完成', color: '#ff5f57' },
    推进中: { cls: 'doing', label: '推进中', color: '#35d39a' },
    延后: { cls: 'delay', label: '延后', color: '#ffcc44' },
    未完成: { cls: 'none', label: '未完成', color: '#6c8aa8' }
  };
  const s = map[status] || map['未完成'];
  return (
    <span className={`flag ${s.cls}`} title={s.label}>
      <svg width="17" height="19" viewBox="0 0 17 19" aria-hidden="true">
        <rect x="0.5" y="0.5" width="1.6" height="18" fill="currentColor" />
        <path d="M2.1 1.6h13.4l-3 3.9 3 3.9H2.1z" fill="currentColor" />
      </svg>
      <span style={{ fontSize: '10px', opacity: 0.75 }}>{s.label}</span>
    </span>
  );
}
