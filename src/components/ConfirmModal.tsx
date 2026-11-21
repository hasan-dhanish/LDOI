import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  tone = 'danger',
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      onClick={onCancel}
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm paper-card rounded-2xl overflow-hidden shadow-2xl"
      >
        <div className="px-5 pt-5 pb-4 flex items-start gap-3.5">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              tone === 'danger'
                ? 'bg-[#8B1E1E]/12 text-[#DC2626]'
                : 'bg-[#0A5386]/12 text-[#0A5386]'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[#18181B]">{title}</h3>
              <button
                type="button"
                onClick={onCancel}
                className="p-0.5 text-[#71717A] hover:text-[#18181B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="mt-1.5 text-xs text-[#52525B] leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-[#E4E2DC] flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 text-xs font-medium text-[#52525B] hover:text-[#18181B] rounded-lg"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`ios-press px-4 py-1.5 text-xs font-semibold text-white rounded-lg ${
              tone === 'danger'
                ? 'bg-[#8B1E1E] hover:bg-[#991B1B]'
                : 'bg-[#0A5386] hover:bg-[#0C64A1]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
