import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, HelpCircle, AlertCircle, X, Check, ShieldAlert } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { Button } from './Button';

export const ConfirmDialogModal: React.FC = () => {
  const { confirmModal, closeConfirmation } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);

  const isOpen = Boolean(confirmModal && confirmModal.isOpen);

  const handleConfirm = async () => {
    if (!confirmModal) return;
    try {
      setIsLoading(true);
      await confirmModal.onConfirm();
    } catch (err) {
      console.error('Confirmation action error:', err);
    } finally {
      setIsLoading(false);
      closeConfirmation();
    }
  };

  const handleCancel = () => {
    if (confirmModal?.onCancel) {
      confirmModal.onCancel();
    }
    closeConfirmation();
  };

  if (!confirmModal) return null;

  const getVariantStyles = () => {
    switch (confirmModal.variant) {
      case 'danger':
        return {
          icon: <AlertTriangle className="h-6 w-6 text-[var(--status-error-text)] dark:text-[var(--status-error-text)]" />,
          iconBg: 'bg-[var(--status-error-bg)]/80 border-[var(--status-error-text)]/30 dark:border-[var(--status-error-text)] text-[var(--status-error-text)] dark:text-[var(--status-error-text)]',
          cardBorder: 'border-[var(--status-error-text)]/30 dark:border-[var(--status-error-text)]/30 shadow-rose-950/10',
          badgeBg: 'bg-[var(--status-error-bg)]/80 text-[var(--status-error-text)] dark:text-rose-300 border-[var(--status-error-text)]/30 dark:border-[var(--status-error-text)]/30',
          badgeDefault: 'عملیات غیرقابل بازگشت',
          boxBg: 'bg-rose-50/70 dark:bg-rose-950/30 border-[var(--status-error-text)]/30 dark:border-[var(--status-error-text)]/30 text-rose-950 dark:text-rose-200',
          btnVariant: 'danger' as const,
        };
      case 'warning':
        return {
          icon: <AlertCircle className="h-6 w-6 text-[var(--status-warning-text)] dark:text-[var(--status-warning-text)]" />,
          iconBg: 'bg-amber-100 dark:bg-amber-950/80 border-[var(--status-warning-text)]/30 dark:border-[var(--status-warning-text)] text-[var(--status-warning-text)] dark:text-[var(--status-warning-text)]',
          cardBorder: 'border-[var(--status-warning-text)]/30 dark:border-[var(--status-warning-text)]/30 shadow-amber-950/10',
          badgeBg: 'bg-amber-100 dark:bg-amber-950/80 text-[var(--status-warning-text)] dark:text-[var(--status-warning-text)] border-[var(--status-warning-text)]/30 dark:border-[var(--status-warning-text)]/30',
          badgeDefault: 'هشدار بازنشانی داده‌ها',
          boxBg: 'bg-amber-50/70 dark:bg-amber-950/30 border-[var(--status-warning-text)]/30 dark:border-[var(--status-warning-text)]/30 text-[var(--status-warning-text)] dark:text-amber-200',
          btnVariant: 'warning' as const,
        };
      case 'primary':
      default:
        return {
          icon: <HelpCircle className="h-6 w-6 text-[var(--brand-primary)]" />,
          iconBg: 'bg-[var(--brand-primary-subtle)] border-[var(--brand-primary)]/20 text-[var(--brand-primary)]',
          cardBorder: 'border-[var(--brand-primary)]/30 shadow-indigo-950/10',
          badgeBg: 'bg-[var(--brand-primary-subtle)] text-[var(--brand-primary)] border-[var(--brand-primary)]/20',
          badgeDefault: 'تایید درخواست',
          boxBg: 'bg-[var(--bg-base)] border-[var(--border-subtle)] text-[var(--text-primary)]',
          btnVariant: 'primary' as const,
        };
    }
  };

  const styles = getVariantStyles();
  const badgeLabel = confirmModal.badgeText || styles.badgeDefault;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) handleCancel(); }}>
      {isOpen && (
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-stone-950/75 backdrop-blur-md animate-in fade-in duration-150" />
          <Dialog.Content className={`fixed left-[50%] top-[50%] z-50 w-[92vw] max-w-md translate-x-[-50%] translate-y-[-50%] bg-white dark:bg-[var(--bg-card)] border rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-7 space-y-5 focus:outline-hidden dir-rtl text-right font-['Vazirmatn',sans-serif] ${styles.cardBorder}`}>
            {/* Top Close Button */}
            <Dialog.Close asChild>
              <button
                type="button"
                onClick={handleCancel}
                aria-label="بستن پنجره"
                className="absolute top-5 left-5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:text-[var(--text-primary)] p-1.5 rounded-2xl hover:bg-[var(--bg-base)] hover:bg-[var(--bg-base)] transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>

            {/* Badge Tag */}
            <div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black border ${styles.badgeBg}`}>
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>{badgeLabel}</span>
              </span>
            </div>

            {/* Header Title & Icon */}
            <div className="flex items-start gap-3.5">
              <div className={`p-3 rounded-2xl border shrink-0 shadow-xs ${styles.iconBg}`}>
                {styles.icon}
              </div>
              <div className="space-y-1 flex-1 pt-0.5">
                <Dialog.Title className="text-base font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] leading-snug">
                  {confirmModal.title}
                </Dialog.Title>
              </div>
            </div>

            {/* Warning Content Callout Box */}
            <div className={`p-4 rounded-2xl border space-y-3 ${styles.boxBg}`}>
              <p className="text-xs font-bold leading-relaxed">
                {confirmModal.message}
              </p>

              {confirmModal.details && confirmModal.details.length > 0 && (
                <ul className="space-y-1.5 pt-1 border-t border-current/15 text-[11px] font-medium opacity-90">
                  {confirmModal.details.map((detail, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current mt-1.5 shrink-0" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isLoading}
                className="h-10 px-4 text-xs font-bold border-[var(--border-subtle)] dark:border-[var(--border-functional)] text-[var(--text-primary)] dark:text-[var(--text-secondary)] rounded-xl hover:bg-[var(--bg-base)] hover:bg-[var(--bg-base)] cursor-pointer"
              >
                {confirmModal.cancelText || 'انصراف'}
              </Button>

              <Button
                type="button"
                variant={styles.btnVariant}
                size="sm"
                onClick={handleConfirm}
                isLoading={isLoading}
                className="h-10 px-5 text-xs font-black rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Check className="h-4 w-4" />
                <span>{confirmModal.confirmText || 'تایید و ادامه'}</span>
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      )}
    </Dialog.Root>
  );
};
