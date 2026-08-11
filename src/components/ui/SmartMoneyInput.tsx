import React from 'react';
import { NumberFormatBase, type NumberFormatValues } from 'react-number-format';
import { cn, toEnglishDigits, toPersianDigits } from '../../lib/utils';

export interface SmartMoneyInputProps {
  value: number | string;
  onChange: (value: number) => void;
  placeholder?: string;
  label?: string;
  labelClassName?: string;
  suffix?: string;
  className?: string;
  error?: string;
  disabled?: boolean;
  min?: number;
  id?: string;
}

export const SmartMoneyInput: React.FC<SmartMoneyInputProps> = ({
  value,
  onChange,
  placeholder = 'مثلاً: ۱۵۰,۰۰۰',
  label,
  labelClassName,
  suffix = 'تومان',
  className,
  error,
  disabled = false,
  id,
}) => {
  const generatedId = React.useId();
  const inputId = id || generatedId;

  const handleValueChange = (values: NumberFormatValues) => {
    const floatVal = values.floatValue ?? 0;
    onChange(floatVal);
  };

  const formatPersianMoney = (val: string) => {
    if (!val) return '';
    const eng = toEnglishDigits(val).replace(/\D/g, '');
    if (!eng) return '';
    const num = Number(eng);
    if (isNaN(num)) return '';
    const formatted = num.toLocaleString('en-US');
    return toPersianDigits(formatted);
  };

  const removeFormatting = (val: string) => {
    return toEnglishDigits(val).replace(/\D/g, '');
  };

  return (
    <div className="w-full text-right dir-rtl">
      {label && (
        <label htmlFor={inputId} className={cn('block text-xs font-extrabold text-[var(--text-primary)] mb-1.5', labelClassName)}>
          {label}
        </label>
      )}
      <div className="relative rounded-xl shadow-2xs">
        <NumberFormatBase
          id={inputId}
          inputMode="decimal"
          value={value === 0 || value === '' ? '' : value}
          onValueChange={handleValueChange}
          format={formatPersianMoney}
          removeFormatting={removeFormatting}
          placeholder={placeholder ? toPersianDigits(placeholder) : ''}
          disabled={disabled}
          className={cn(
            'flex h-10 w-full rounded-xl border border-[var(--border-functional)] bg-[var(--bg-card)] pr-3 py-2 text-xs font-bold text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] disabled:cursor-not-allowed disabled:opacity-50 transition-all text-right dir-rtl',
            suffix ? 'pl-14' : 'pl-3',
            error && 'border-[var(--status-error-text)] focus:ring-[var(--status-error-text)] focus:border-[var(--status-error-text)]',
            className
          )}
        />
        {suffix && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-2.5 text-[11px] font-black text-[var(--text-secondary)] bg-[var(--bg-base)] border-r border-[var(--border-subtle)] rounded-l-xl dir-rtl">
            {suffix}
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600 font-bold">{error}</p>}
    </div>
  );
};


