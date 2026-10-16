import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const Toast = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

const ToastItem = ({ toast, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, toast.duration || 4000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
    info: <Info className="w-5 h-5 text-brand-400 shrink-0" />,
  };

  const bgColors = {
    success: 'bg-slate-900/90 border-emerald-500/30 text-emerald-100 shadow-emerald-500/10',
    error: 'bg-slate-900/90 border-rose-500/30 text-rose-100 shadow-rose-500/10',
    info: 'bg-slate-900/90 border-brand-500/30 text-slate-100 shadow-brand-500/10',
  };

  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-md animate-slide-up transition-all ${
        bgColors[toast.type] || bgColors.info
      }`}
    >
      {icons[toast.type] || icons.info}
      <div className="text-sm font-medium pr-2">{toast.message}</div>
      <button
        onClick={onClose}
        className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-white/10"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
