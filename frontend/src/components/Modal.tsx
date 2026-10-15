import type { ReactNode } from 'react';
import { X } from '@phosphor-icons/react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}

export function Modal({ title, onClose, children, maxWidth = 'max-w-lg' }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        className={`relative bg-white rounded-2xl border border-zinc-200/80 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] w-full ${maxWidth} max-h-[90vh] flex flex-col z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-150`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
          <h2 className="text-base font-semibold text-zinc-900 tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
            aria-label="Close dialog"
          >
            <X size={18} weight="bold" />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
