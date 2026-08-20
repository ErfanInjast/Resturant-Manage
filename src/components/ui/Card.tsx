import React from 'react';
import { cn } from '../../lib/utils';

export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, id, ...props }, ref) => (
  <div
    id={id}
    ref={ref}
    className={cn(
      'rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)] shadow-2xs transition-all duration-200 hover:border-[var(--border-functional)]',
      className
    )}
    {...props}
  />
));
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, id, ...props }, ref) => (
  <div
    id={id}
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-5 pb-3', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, id, ...props }, ref) => (
  <h3
    id={id}
    ref={ref}
    className={cn(
      'text-base font-black leading-none tracking-tight text-[var(--text-primary)]',
      className
    )}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, id, ...props }, ref) => (
  <p
    id={id}
    ref={ref}
    className={cn('text-xs text-[var(--text-secondary)] font-medium leading-relaxed', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, id, ...props }, ref) => (
  <div id={id} ref={ref} className={cn('p-5 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, id, ...props }, ref) => (
  <div
    id={id}
    ref={ref}
    className={cn('flex items-center p-5 pt-0 mt-auto', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';
