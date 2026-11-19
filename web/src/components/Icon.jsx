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

/** 平台标志（上传 logo 的白色单色透明版，适配近黑界面） */
export function BrandMark({ size = 34 }) {
  /* logo-mark-128.png 由上传图裁白边 + 去水印 + 转白色单色透明生成（scripts 说明见 docs/26 §十） */
  return (
    <img
      className="brand-logo"
      src="/brand/logo-mark-128.png"
      width={size}
      height={size}
      alt="绿矿智用"
      draggable="false"
      style={{ width: size, height: size, objectFit: 'contain' }}
    />
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
