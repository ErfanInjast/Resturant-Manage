import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 rounded-xl font-bold transition-all duration-200 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] cursor-pointer selection:bg-transparent tracking-tight whitespace-nowrap',
  {
    variants: {
      variant: {
        primary: 'bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-hover)] shadow-2xs hover:shadow-xs focus-visible:ring-[var(--brand-primary)]',
        secondary: 'bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-functional)] hover:bg-[var(--bg-base)] shadow-2xs focus-visible:ring-[var(--brand-primary)]',
        outline: 'border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-base)] hover:border-[var(--border-functional)] shadow-2xs',
        ghost: 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-base)]',
        danger: 'bg-[var(--status-error-text)] text-white hover:opacity-90 shadow-2xs focus-visible:ring-[var(--status-error-text)]',
        warning: 'bg-[var(--status-warning-text)] text-white hover:opacity-90 shadow-2xs focus-visible:ring-[var(--status-warning-text)]',
        success: 'bg-[var(--status-success-text)] text-white hover:opacity-90 shadow-2xs focus-visible:ring-[var(--status-success-text)]',
        soft: 'bg-[var(--brand-primary-subtle)] text-[var(--brand-primary)] hover:opacity-80 font-bold border border-[var(--brand-primary)]/20',
      },
      size: {
        xs: 'h-7 px-2.5 text-[11px] font-bold rounded-lg',
        sm: 'h-8 px-3 text-xs font-bold rounded-xl',
        md: 'h-9 px-3.5 text-xs font-black rounded-xl',
        lg: 'h-10 px-4.5 text-xs sm:text-sm font-black rounded-xl',
        icon: 'h-8 w-8 p-0 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, id, ...props }, ref) => {
    return (
      <button
        id={id}
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-1.5 h-3.5 w-3.5 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
