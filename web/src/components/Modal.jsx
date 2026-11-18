import React from 'react';
import { Modal as AntModal } from 'antd';

/** 统一弹窗：尺寸语义沿用 size='wide'|'narrow'，内部交给 antd Modal。 */
export function Modal({ open, title, subtitle, children, footer, onClose, size = '', headExtra }) {
  const width = size === 'wide' ? 1040 : size === 'narrow' ? 460 : 720;
  return (
    <AntModal
      open={!!open}
      title={
        <div className="dlg-title">
          <span>{title}</span>
          {subtitle && <em>{subtitle}</em>}
          {headExtra}
        </div>
      }
      footer={footer || null}
      onCancel={onClose}
      width={width}
      centered
      maskClosable
      destroyOnHidden
      className="kq-modal"
    >
      {children}
    </AntModal>
  );
}

/** 全屏浮层（作战图等）：也用 antd Modal，只是宽度铺满、无圆角。 */
export function FullOverlay({ open, title, extra, children, onClose }) {
  return (
    <AntModal
      open={!!open}
      title={
        <div className="dlg-title">
          <span>{title}</span>
          {extra}
        </div>
      }
      footer={null}
      onCancel={onClose}
      width="100vw"
      style={{ top: 0, maxWidth: '100vw', paddingBottom: 0 }}
      styles={{ body: { height: 'calc(100vh - 120px)', overflow: 'auto' } }}
      className="kq-modal kq-modal-full"
      destroyOnHidden
    >
      {children}
    </AntModal>
  );
}
