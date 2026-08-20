import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Convert English digits to Persian digits with proper LRM positioning for negative numbers
export function toPersianDigits(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return '';
  const strVal = String(str);
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  
  const trimmed = strVal.replace(/\u200E/g, '').trim();
  const isNegative = trimmed.startsWith('-');

  if (isNegative) {
    const cleanStr = trimmed.substring(1).trim();
    const persianStr = cleanStr.replace(/[0-9]/g, (w) => persianDigits[parseInt(w, 10)]);
    return `\u200E-${persianStr}`;
  }

  return strVal.replace(/[0-9]/g, (w) => persianDigits[parseInt(w, 10)]);
}

// Convert Persian digits to English digits
export function toEnglishDigits(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return '';
  const strVal = String(str);
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  
  return strVal
    .replace(/[۰-۹]/g, (w) => String(persianDigits.indexOf(w)))
    .replace(/[٠-٩]/g, (w) => String(arabicDigits.indexOf(w)));
}

// Safely parse formatted Persian or English number string into JavaScript float number
export function parseFormattedNumber(val: number | string | null | undefined): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim();
  if (!str) return 0;

  let english = toEnglishDigits(str);
  english = english.replace(/[\s\u200E\u200F]/g, '');
  english = english.replace(/\//g, '.');

  if (english.includes(',') && !english.includes('.')) {
    const parts = english.split(',');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      english = english.replace(/,/g, '');
    } else if (parts.length === 2 && parts[1].length <= 2) {
      english = english.replace(',', '.');
    } else {
      english = english.replace(/,/g, '');
    }
  } else {
    english = english.replace(/,/g, '');
  }

  const result = parseFloat(english);
  return isNaN(result) ? 0 : result;
}

// Format numbers with thousands separator in Persian digits
export function formatNumber(val: number | string, decimals = 0): string {
  if (val === null || val === undefined || isNaN(Number(val))) return toPersianDigits('0');
  const num = Number(val);
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const formatted = absNum.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const persianAbs = toPersianDigits(formatted);
  return isNegative ? `\u200E-${persianAbs}` : persianAbs;
}

export function formatCurrency(amount: number): string {
  return formatNumber(amount, 0);
}

// Financial precision rounding (whole integer Tomans)
export function roundCurrency(amount: number): number {
  return Math.round(amount);
}

/**
 * Format Toman utility as per specification:
 * < 1,000 -> "850 تومان"
 * 1,000 - 1,000,000 -> "120.5 هزار تومان"
 * >= 1,000,000 -> "4.7 میلیون تومان"
 * Negatives formatted with LRM so the minus sign stays on the left
 */
export function formatToman(amount: number, compact = true): { text: string; isNegative: boolean } {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  
  let textStr = '';
  if (!compact) {
    textStr = formatNumber(absAmount, 0) + ' تومان';
  } else if (absAmount < 1000) {
    textStr = `${formatNumber(absAmount, 0)} تومان`;
  } else if (absAmount < 1000000) {
    const rawThousands = absAmount / 1000;
    const thousands = Math.round(rawThousands * 10) / 10;
    const decimal = thousands % 1 === 0 ? 0 : 1;
    textStr = `${formatNumber(thousands, decimal)} هزار تومان`;
  } else if (absAmount < 1000000000) {
    const rawMillions = absAmount / 1000000;
    const millions = Math.round(rawMillions * 100) / 100;
    let decimal = 0;
    if (Math.abs(millions - Math.round(millions)) > 0.0001) {
      decimal = Math.abs(millions * 10 - Math.round(millions * 10)) > 0.0001 ? 2 : 1;
    }
    textStr = `${formatNumber(millions, decimal)} میلیون تومان`;
  } else {
    const rawBillions = absAmount / 1000000000;
    const billions = Math.round(rawBillions * 100) / 100;
    let decimal = 0;
    if (Math.abs(billions - Math.round(billions)) > 0.0001) {
      decimal = Math.abs(billions * 10 - Math.round(billions * 10)) > 0.0001 ? 2 : 1;
    }
    textStr = `${formatNumber(billions, decimal)} میلیارد تومان`;
  }

  return {
    text: isNegative ? `\u200E-${textStr}` : textStr,
    isNegative,
  };
}

// Helper for unit display names in Persian
export function restoreAppInteractivity(): void {
  if (typeof document === 'undefined') return;
  
  document.body.style.pointerEvents = 'auto';
  document.body.style.overflow = 'auto';
  document.documentElement.style.pointerEvents = 'auto';
  document.documentElement.style.overflow = 'auto';
  document.body.removeAttribute('data-scroll-locked');
  document.body.removeAttribute('aria-hidden');

  const rootEl = document.getElementById('root');
  if (rootEl) {
    rootEl.style.pointerEvents = 'auto';
    rootEl.removeAttribute('aria-hidden');
  }

  // Clear any stuck pointer-events or aria-hidden on main wrappers
  document.querySelectorAll('#root, body, html').forEach((el) => {
    (el as HTMLElement).style.pointerEvents = 'auto';
    el.removeAttribute('aria-hidden');
  });
}

export function getUnitLabel(unit: string): string {
  switch (unit) {
    case 'kg':
      return 'کیلوگرم';
    case 'g':
      return 'گرم';
    case 'liter':
      return 'لیتر';
    case 'ml':
      return 'میلی‌لیتر';
    case 'piece':
      return 'عدد / دانه‌ای';
    case 'pack':
      return 'بسته';
    default:
      return unit;
  }
}
