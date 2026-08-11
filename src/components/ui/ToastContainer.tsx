import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { useAppStore, type ToastNotification } from '../../store/useAppStore';
import { toastVariants } from '../../lib/motion';

const ToastItem: React.FC<{ toast: ToastNotification }> = ({ toast }) => {
  const { removeToast } = useAppStore();
  const duration = toast.duration || 4500;

  useEffect(() => {
    const timer = setTimeout(() => {
      removeToast(toast.id);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.id, duration, removeToast]);

  const getIconAndStyle = () => {
    switch (toast.type) {
      case 'success':
        return {
          icon: <CheckCircle2 className="h-5 w-5 text-[var(--status-success-text)] dark:text-[var(--status-success-text)] shrink-0 mt-0.5" />,
          bgColor: 'bg-emerald-50 dark:bg-emerald-950/95 border-[var(--status-success-text)]/30 dark:border-[var(--status-success-text)]',
          textColor: 'text-emerald-900 dark:text-emerald-100',
          badgeColor: 'bg-emerald-500',
          progressTrack: 'bg-emerald-200/50 dark:bg-emerald-800/40',
        };
      case 'error':
        return {
          icon: <AlertTriangle className="h-5 w-5 text-[var(--status-error-text)] dark:text-[var(--status-error-text)] shrink-0 mt-0.5" />,
          bgColor: 'bg-rose-50 dark:bg-rose-950/95 border-[var(--status-error-text)]/30 dark:border-[var(--status-error-text)]',
          textColor: 'text-rose-900 dark:text-rose-100',
          badgeColor: 'bg-rose-500',
          progressTrack: 'bg-rose-200/50 dark:bg-rose-800/40',
        };
      case 'warning':
        return {
          icon: <AlertCircle className="h-5 w-5 text-[var(--status-warning-text)] dark:text-[var(--status-warning-text)] shrink-0 mt-0.5" />,
          bgColor: 'bg-amber-50 dark:bg-amber-950/95 border-[var(--status-warning-text)]/30 dark:border-[var(--status-warning-text)]',
          textColor: 'text-[var(--status-warning-text)] dark:text-amber-100',
          badgeColor: 'bg-amber-500',
          progressTrack: 'bg-amber-200/50 dark:bg-amber-800/40',
        };
      case 'info':
      default:
        return {
          icon: <Info className="h-5 w-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />,
          bgColor: 'bg-sky-50 dark:bg-sky-950/95 border-sky-200 dark:border-sky-800/90',
          textColor: 'text-sky-900 dark:text-sky-100',
          badgeColor: 'bg-sky-500',
          progressTrack: 'bg-sky-200/50 dark:bg-sky-800/40',
        };
    }
  };

  const style = getIconAndStyle();

  return (
    <motion.div
      layout
      variants={toastVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      role={toast.type === 'error' ? 'alert' : 'status'}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      className={`relative w-full max-w-sm p-3.5 pt-4 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-start gap-3 pointer-events-auto transition-colors dir-rtl overflow-hidden z-[99999] ${style.bgColor}`}
    >
      {/* Timer progress bar line */}
      <div className={`absolute top-0 right-0 left-0 h-1 overflow-hidden ${style.progressTrack}`}>
        <motion.div
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: duration / 1000, ease: 'linear' }}
          className={`h-full w-full origin-right ${style.badgeColor}`}
        />
      </div>

      {style.icon}
      <div className="flex-1 min-w-0 pr-0.5">
        <h4 className={`text-xs font-black leading-tight ${style.textColor}`}>{toast.title}</h4>
        {toast.message && (
          <p className="text-[11px] font-medium opacity-90 mt-1 leading-relaxed text-[var(--text-primary)] dark:text-[var(--text-secondary)]">
            {toast.message}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => removeToast(toast.id)}
        className="text-[var(--text-secondary)] hover:text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
        aria-label="بستن پیام"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts } = useAppStore();

  return (
    <div
      dir="rtl"
      aria-live="polite"
      aria-atomic="false"
      className="fixed top-3 inset-x-3 sm:inset-x-auto sm:left-6 sm:w-80 sm:max-w-sm z-[99999] pointer-events-none flex flex-col gap-2 font-['Vazirmatn',sans-serif]"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  );
};
