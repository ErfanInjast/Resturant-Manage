import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn, restoreAppInteractivity } from '../../lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'lg',
}) => {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
  };

  const handleClose = () => {
    onClose();
    restoreAppInteractivity();
    setTimeout(restoreAppInteractivity, 50);
    setTimeout(restoreAppInteractivity, 250);
  };

  // Guarantee body pointer-events and scroll lock restoration
  React.useEffect(() => {
    if (!isOpen) {
      restoreAppInteractivity();
    }

    const handleWindowFocus = () => {
      setTimeout(restoreAppInteractivity, 50);
    };

    window.addEventListener('afterprint', restoreAppInteractivity);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.removeEventListener('afterprint', restoreAppInteractivity);
      window.removeEventListener('focus', handleWindowFocus);
      restoreAppInteractivity();
    };
  }, [isOpen]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      {isOpen && (
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-stone-950/75 backdrop-blur-xs animate-in fade-in duration-150" />
          <Dialog.Content
            className={cn(
              'fixed left-[50%] top-[50%] z-50 w-[95vw] translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-[var(--bg-card)] p-3.5 sm:p-4.5 shadow-2xl focus:outline-hidden dir-rtl border border-[var(--border-subtle)] text-[var(--text-primary)] max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150',
              maxWidthClasses[maxWidth]
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-[var(--border-subtle)] shrink-0">
              <div className="min-w-0 pr-1">
                <Dialog.Title className="text-sm sm:text-base font-black text-[var(--text-primary)] truncate">
                  {title}
                </Dialog.Title>
                {description && (
                  <Dialog.Description className="text-[11px] sm:text-xs font-medium text-[var(--text-secondary)] mt-0.5 truncate">
                    {description}
                  </Dialog.Description>
                )}
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-xl p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)] transition-colors focus:outline-hidden cursor-pointer shrink-0 mr-2"
                  aria-label="بستن"
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </Dialog.Close>
            </div>

            {/* Body */}
            <div className="pt-2.5 pb-1 overflow-y-auto flex-1 pl-1 pr-0.5 space-y-3 custom-scrollbar">
              {children}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      )}
    </Dialog.Root>
  );
};
