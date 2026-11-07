import React from 'react';
import { useToast } from '../../context/ToastContext';
import { ToastItem, ToastType } from '../../types/toast';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const toastConfig: Record<
  ToastType,
  {
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    borderColor: string;
    glowClass: string;
    progressBarBg: string;
    iconColor: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    accentColor: '#10B981',
    borderColor: 'border-emerald-500/40',
    glowClass: 'shadow-[0_10px_35px_rgba(16,185,129,0.22)]',
    progressBarBg: 'bg-gradient-to-r from-[#10B981] to-[#00DFFF]',
    iconColor: 'text-[#10B981]',
  },
  error: {
    icon: AlertCircle,
    accentColor: '#EF4444',
    borderColor: 'border-rose-500/45',
    glowClass: 'shadow-[0_10px_35px_rgba(239,68,68,0.22)]',
    progressBarBg: 'bg-gradient-to-r from-rose-500 to-amber-500',
    iconColor: 'text-rose-400',
  },
  info: {
    icon: Info,
    accentColor: '#00DFFF',
    borderColor: 'border-[#00DFFF]/40',
    glowClass: 'shadow-[0_10px_35px_rgba(0,223,255,0.22)]',
    progressBarBg: 'bg-gradient-to-r from-[#00DFFF] to-[#8423DA]',
    iconColor: 'text-[#00DFFF]',
  },
  warning: {
    icon: AlertTriangle,
    accentColor: '#F59E0B',
    borderColor: 'border-amber-500/40',
    glowClass: 'shadow-[0_10px_35px_rgba(245,158,11,0.22)]',
    progressBarBg: 'bg-gradient-to-r from-amber-500 to-orange-500',
    iconColor: 'text-amber-400',
  },
};

const ToastSingleItem: React.FC<{
  toast: ToastItem;
  onDismiss: (id: string) => void;
}> = ({ toast, onDismiss }) => {
  const config = toastConfig[toast.type] || toastConfig.info;
  const IconComponent = config.icon;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto relative overflow-hidden rounded-2xl bg-[#0D1022]/95 border ${config.borderColor} ${config.glowClass} backdrop-blur-xl p-3.5 sm:p-4 text-white transition-all duration-300 animate-in slide-in-from-bottom-3 fade-in flex flex-col gap-2`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Icon & Content */}
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-1 rounded-xl bg-white/5 border border-white/10 shrink-0 mt-0.5">
            <IconComponent className={`w-4 h-4 ${config.iconColor}`} />
          </div>

          <div className="min-w-0 space-y-0.5">
            <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight leading-snug break-words">
              {toast.title}
            </h4>
            {toast.message && (
              <p className="text-[11px] sm:text-xs text-[#A5A5B8] leading-relaxed break-words line-clamp-3">
                {toast.message}
              </p>
            )}
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={() => onDismiss(toast.id)}
          className="p-1 rounded-lg text-[#A5A5B8] hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
          aria-label="Fechar notificação"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Action Button if specified */}
      {toast.action && (
        <div className="pt-1 flex justify-end">
          <button
            onClick={() => {
              toast.action?.onClick();
              onDismiss(toast.id);
            }}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#8423DA] to-[#007BFF] hover:from-[#9536ee] hover:to-[#1a88ff] text-white text-[11px] font-bold tracking-wide transition-all shadow-md active:scale-95 cursor-pointer"
          >
            {toast.action.label}
          </button>
        </div>
      )}

      {/* Subtle Progress Bar */}
      {toast.durationMs && toast.durationMs > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/5 overflow-hidden">
          <div
            className={`h-full ${config.progressBarBg}`}
            style={{
              animation: `shrinkWidth ${toast.durationMs}ms linear forwards`,
            }}
          />
        </div>
      )}
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="storefront-toasts fixed bottom-5 right-4 left-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 flex flex-col-reverse gap-2.5 max-w-sm w-auto pointer-events-none"
    >
      <style>{`
        @keyframes shrinkWidth {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
      {toasts.map((item) => (
        <ToastSingleItem key={item.id} toast={item} onDismiss={dismissToast} />
      ))}
    </div>
  );
};
