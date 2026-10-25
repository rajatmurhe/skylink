import React from 'react';
import { Info, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { clsx } from 'clsx';

export type ToastType = 'info' | 'warning' | 'success';

export interface ToastProps {
  type: ToastType;
  title: string;
  message?: string;
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ type, title, message, onClose }) => {
  const configs: Record<ToastType, { bg: string; border: string; text: string; IconComp: React.ElementType }> = {
    info: {
      bg: 'bg-slate-900/90',
      border: 'border-cyan-500/50',
      text: 'text-cyan-400',
      IconComp: Info,
    },
    warning: {
      bg: 'bg-slate-900/90',
      border: 'border-yellow-500/50',
      text: 'text-yellow-400',
      IconComp: AlertTriangle,
    },
    success: {
      bg: 'bg-slate-900/90',
      border: 'border-teal-500/50',
      text: 'text-teal-400',
      IconComp: CheckCircle2,
    },
  };

  const config = configs[type];
  const IconComponent = config.IconComp;

  return (
    <div
      className={clsx(
        'flex items-start gap-3 p-4 rounded-control border shadow-lg backdrop-blur-md max-w-sm w-full transition-all duration-300',
        config.bg,
        config.border
      )}
    >
      <IconComponent className={clsx('w-5 h-5 shrink-0 mt-0.5', config.text)} />
      <div className="flex-1">
        <div className="text-xs font-semibold text-slate-100">{title}</div>
        {message && <div className="text-[11px] text-slate-400 mt-0.5">{message}</div>}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
