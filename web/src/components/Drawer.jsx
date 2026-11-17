import React, { useEffect, useRef } from 'react';
import { Ic } from './Icon';
import { Cancel01Icon } from '@hugeicons/core-free-icons';

/**
 * v3 唯一详情容器（契约 §4 .drawer）。
 * 用法：<Drawer open title onClose>{…}</Drawer>
 * 右侧 520px；<=900 全屏；Esc / 遮罩点击关闭；打开时锁滚动并把焦点移入。
 */
export default function Drawer({
  open,
  title,
  subtitle,
  footer,
  width = 520,
  onClose,
  children,
  className = ''
}) {
  const panelRef = useRef(null);
  const lastFocus = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    lastFocus.current = document.activeElement;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
      }
      if (e.key === 'Tab' && panelRef.current) {
        const list = panelRef.current.querySelectorAll(
          'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
        );
        if (!list.length) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => {
      const el = panelRef.current?.querySelector('[data-autofocus]') || panelRef.current;
      el?.focus?.();
    }, 30);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      clearTimeout(t);
      lastFocus.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={`drawer-mask${open ? ' is-open' : ''}`} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <section
        ref={panelRef}
        className={`drawer ${className}`.trim()}
        style={{ width }}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : '详情'}
        tabIndex={-1}
      >
        <header className="drawer-head">
          <div className="drawer-heading">
            <h2 className="drawer-title">{title}</h2>
            {subtitle && <p className="drawer-sub">{subtitle}</p>}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="关闭">
            <Ic icon={Cancel01Icon} size={16} />
          </button>
        </header>
        <div className="drawer-body">{children}</div>
        {footer && <footer className="drawer-foot">{footer}</footer>}
      </section>
    </div>
  );
}
