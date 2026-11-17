import React, { useEffect } from 'react';

export function Modal({ open, title, subtitle, children, footer, onClose, size = '', headExtra }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="mask" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => {
      if (e.target === e.currentTarget) onClose?.();
    }}>
      <div className={`dialog ${size}`}>
        <header className="dialog-head">
          <h3>{title}</h3>
          {subtitle && <span className="muted tiny">{subtitle}</span>}
          {headExtra}
          <button type="button" className="close" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </header>
        <div className="dialog-body">{children}</div>
        {footer && <footer className="dialog-foot">{footer}</footer>}
      </div>
    </div>
  );
}

export function FullOverlay({ open, title, extra, children, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="overlay-full" role="dialog" aria-modal="true" aria-label={title}>
      <div className="overlay-head">
        <h2>{title}</h2>
        {extra}
        <button type="button" className="overlay-close" onClick={onClose} aria-label="关闭全屏浮层">
          ✕
        </button>
      </div>
      <div className="overlay-body">{children}</div>
    </div>
  );
}
