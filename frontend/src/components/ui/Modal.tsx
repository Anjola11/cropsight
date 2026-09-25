import React, { useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { IconButton } from './IconButton';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-[400px] bg-card border border-line rounded-[20px] p-6 shadow-2xl relative"
      >
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <h3 id="modal-title" className="text-[16px] leading-[22px] font-semibold text-primary m-0">
              {title}
            </h3>
            {description && (
              <p className="text-[13px] leading-[18px] text-muted mt-1 m-0">
                {description}
              </p>
            )}
          </div>
          <IconButton
            icon={<FontAwesomeIcon icon={faXmark} fixedWidth />}
            aria-label="Close modal"
            onClick={onClose}
            className="w-8 h-8 md:w-8 md:h-8 text-[14px] shrink-0"
          />
        </div>

        {children && <div className="mt-4">{children}</div>}

        {footer && <div className="mt-6 flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
};
