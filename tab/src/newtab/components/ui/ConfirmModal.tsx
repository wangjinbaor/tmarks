/**
 * iOS 风格确认弹窗组件
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Z_INDEX } from '../../constants/z-index';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  confirmVariant = 'default',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    setIsVisible(false);
    setTimeout(onConfirm, 150);
  };

  const handleCancel = () => {
    setIsVisible(false);
    setTimeout(onCancel, 150);
  };

  return createPortal(
    <div
      className={`fixed inset-0 flex items-center justify-center p-4 transition-all duration-200 ${
        isVisible ? 'bg-black/60 backdrop-blur-md opacity-100' : 'opacity-0'
      }`}
      style={{ zIndex: Z_INDEX.MODAL_BACKDROP + 10 }}
      onClick={handleCancel}
    >
      <div
        role="alertdialog"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        className={`relative w-full max-w-[280px] rounded-[14px] overflow-hidden transition-all duration-200 ease-out ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        style={{ zIndex: Z_INDEX.MODAL_CONTENT + 10 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* iOS 风格毛玻璃背景 */}
        <div
          className="backdrop-blur-xl"
          style={{ backgroundColor: 'var(--ios-sheet-bg)' }}
        >
          {/* 标题和消息 */}
          <div className="px-4 pt-5 pb-4 text-center">
            <h3
              id="confirm-title"
              className="text-[17px] font-semibold mb-1"
              style={{ color: 'var(--ios-text-primary)' }}
            >
              {title}
            </h3>
            <p
              id="confirm-message"
              className="text-[13px] leading-relaxed"
              style={{ color: 'var(--ios-text-secondary)' }}
            >
              {message}
            </p>
          </div>

          {/* 分隔线 */}
          <div className="h-px" style={{ backgroundColor: 'var(--ios-divider)' }} />

          {/* 按钮区域 - iOS 风格水平排列 */}
          <div className="flex">
            <button
              type="button"
              onClick={handleCancel}
              aria-label={cancelText}
              className="flex-1 py-[11px] text-[17px] font-normal transition-colors focus:outline-none"
              style={{ color: 'var(--ios-action-primary)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--ios-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              {cancelText}
            </button>
            <div className="w-px" style={{ backgroundColor: 'var(--ios-divider)' }} />
            <button
              type="button"
              onClick={handleConfirm}
              aria-label={confirmText}
              className="flex-1 py-[11px] text-[17px] font-semibold transition-colors focus:outline-none"
              style={{
                color: confirmVariant === 'danger' ? 'var(--ios-action-danger)' : 'var(--ios-action-primary)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--ios-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
