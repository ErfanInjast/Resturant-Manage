import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'bg-[var(--bg-base)] text-[var(--text-primary)] border border-[var(--border-subtle)]',
        primary: 'bg-[var(--brand-primary-subtle)] text-[var(--brand-primary)] border border-[var(--brand-primary)]/20',
        secondary: 'bg-[var(--bg-base)] text-[var(--text-secondary)] border border-[var(--border-subtle)]',
        success: 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border border-[var(--status-success-text)]/20',
        warning: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border border-[var(--status-warning-text)]/20',
        danger: 'bg-[var(--status-error-bg)] text-[var(--status-error-text)] border border-[var(--status-error-text)]/20',
        star: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border border-[var(--status-warning-text)]/20',
        workhorse: 'bg-[var(--status-info-bg)] text-[var(--status-info-text)] border border-[var(--status-info-text)]/20',
        puzzle: 'bg-[var(--status-purple-bg)] text-[var(--status-purple-text)] border border-[var(--status-purple-text)]/20',
        underperformer: 'bg-[var(--status-error-bg)] text-[var(--status-error-text)] border border-[var(--status-error-text)]/20',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export type BadgeProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, id, children, ...props }: BadgeProps) {
  return (
    <div id={id} className={cn(badgeVariants({ variant }), className)} {...props}>
      {children}
    </div>
  );
}

