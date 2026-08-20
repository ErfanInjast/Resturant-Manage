import React from 'react';
import { Button } from './Button';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  id?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
  id,
}) => {
  return (
    <div
      id={id}
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border-subtle)] bg-[var(--bg-card)] p-10 text-center transition-all my-4',
        className
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--brand-primary-subtle)] text-[var(--brand-primary)] mb-4 shadow-2xs border border-[var(--brand-primary)]/20">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-base font-black text-[var(--text-primary)] mb-1">{title}</h3>
      <p className="max-w-sm text-xs font-medium text-[var(--text-secondary)] mb-6 leading-relaxed">
        {description}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {actionLabel && onAction && (
          <Button variant="primary" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <Button variant="outline" onClick={onSecondaryAction}>
            {secondaryActionLabel}
          </Button>
        )}
      </div>
    </div>
  );
};
