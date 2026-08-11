import { toJalaali, toGregorian, jalaaliMonthLength } from 'jalaali-js';
import { toPersianDigits, toEnglishDigits } from './utils';

export interface JalaliDateObj {
  jy: number;
  jm: number;
  jd: number;
}

export const MIN_JALALI_DATE = '1390-01-01';

export function getTodayJalaliIso(): string {
  return formatJalali(new Date(), 'iso');
}

export const PERSIAN_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

// Convert Gregorian date (or current date) to Jalali date object safely
export function getJalaliDate(date: Date = new Date()): JalaliDateObj {
  try {
    const d = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
    const gy = d.getFullYear();
    if (isNaN(gy) || gy < 1800 || gy > 2200) {
      const today = new Date();
      return toJalaali(today.getFullYear(), today.getMonth() + 1, today.getDate());
    }
    return toJalaali(gy, d.getMonth() + 1, d.getDate());
  } catch (e) {
    const today = new Date();
    return toJalaali(today.getFullYear(), today.getMonth() + 1, today.getDate());
  }
}

// Format Jalali Date e.g. "۱۴۰۳/۰۵/۰۸" or "۸ مرداد ۱۴۰۳"
export function formatJalali(
  date: Date = new Date(),
  mode: 'short' | 'long' | 'iso' = 'short'
): string {
  try {
    const { jy, jm, jd } = getJalaliDate(date);
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

    if (mode === 'iso') {
      return `${jy}-${pad(jm)}-${pad(jd)}`;
    }

    if (mode === 'long') {
      const monthName = PERSIAN_MONTH_NAMES[jm - 1] || 'فروردین';
      return toPersianDigits(`${jy} ${monthName} ${pad(jd)}`);
    }

    return toPersianDigits(`${jy}/${pad(jm)}/${pad(jd)}`);
  } catch (e) {
    return toPersianDigits('1403/01/01');
  }
}

// Convert date string or Date to Jalali ISO string: e.g. "1405-05-16"
export function toJalaliIso(dateInput?: string | Date | null): string {
  if (!dateInput) return getTodayJalaliIso();

  try {
    if (typeof dateInput === 'string') {
      const cleanStr = toEnglishDigits(dateInput.trim());
      const match = cleanStr.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
      if (match) {
        const y = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const d = parseInt(match[3], 10);
        const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

        if (y >= 1300 && y <= 1500) {
          return `${y}-${pad(m)}-${pad(d)}`;
        } else if (y >= 1900 && y <= 2200) {
          const j = toJalaali(y, m, d);
          return `${j.jy}-${pad(j.jm)}-${pad(j.jd)}`;
        }
      }
      const dObj = new Date(dateInput);
      if (!isNaN(dObj.getTime())) {
        return formatJalali(dObj, 'iso');
      }
    } else if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
      return formatJalali(dateInput, 'iso');
    }
  } catch (e) {
    console.error('Error in toJalaliIso:', e);
  }

  return getTodayJalaliIso();
}

// Convert date string or Date to Persian readable string: e.g. "۱۶ مرداد ۱۴۰۵"
export function formatJalaliReadable(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '';

  let jy: number = 0;
  let jm: number = 0;
  let jd: number = 0;

  try {
    if (typeof dateInput === 'string') {
      const cleanStr = toEnglishDigits(dateInput.trim());
      const match = cleanStr.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
      if (match) {
        const y = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const d = parseInt(match[3], 10);

        if (y >= 1300 && y <= 1500) {
          jy = y;
          jm = m;
          jd = d;
        } else if (y >= 1900 && y <= 2200) {
          const j = toJalaali(y, m, d);
          jy = j.jy;
          jm = j.jm;
          jd = j.jd;
        } else {
          const dObj = new Date(dateInput);
          if (!isNaN(dObj.getTime())) {
            const j = getJalaliDate(dObj);
            jy = j.jy;
            jm = j.jm;
            jd = j.jd;
          }
        }
      } else {
        const dObj = new Date(dateInput);
        if (!isNaN(dObj.getTime())) {
          const j = getJalaliDate(dObj);
          jy = j.jy;
          jm = j.jm;
          jd = j.jd;
        }
      }
    } else if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
      const j = getJalaliDate(dateInput);
      jy = j.jy;
      jm = j.jm;
      jd = j.jd;
    }
  } catch (e) {
    return toPersianDigits(String(dateInput || ''));
  }

  if (jy >= 1300 && jy <= 1500 && jm >= 1 && jm <= 12 && jd >= 1 && jd <= 31) {
    const monthName = PERSIAN_MONTH_NAMES[jm - 1] || '';
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return toPersianDigits(`${pad(jd)} ${monthName} ${jy}`);
  }

  return toPersianDigits(String(dateInput));
}

// Convert Jalali string YYYY-MM-DD to Date object safely
export function jalaliToGregorian(jy: number, jm: number, jd: number): Date {
  if (
    isNaN(jy) ||
    isNaN(jm) ||
    isNaN(jd) ||
    jy < 1300 ||
    jy > 1500 ||
    jm < 1 ||
    jm > 12 ||
    jd < 1 ||
    jd > 31
  ) {
    return new Date();
  }
  try {
    const { gy, gm, gd } = toGregorian(jy, jm, jd);
    if (isNaN(gy) || isNaN(gm) || isNaN(gd)) return new Date();
    return new Date(gy, gm - 1, gd);
  } catch (e) {
    return new Date();
  }
}

// Get number of days in current Jalali month safely
export function getDaysInJalaliMonth(jy: number, jm: number): number {
  if (isNaN(jy) || isNaN(jm) || jy < 1300 || jy > 1500 || jm < 1 || jm > 12) {
    return 30;
  }
  try {
    return jalaaliMonthLength(jy, jm);
  } catch (e) {
    return 30;
  }
}

export function clampJalaliIso(
  dateStr: string,
  minIso: string = MIN_JALALI_DATE,
  maxIso: string = getTodayJalaliIso()
): string {
  if (!dateStr) return maxIso;
  const clean = toEnglishDigits(String(dateStr).trim()).replace(/\//g, '-');
  const match = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return maxIso;

  const pad = (n: string) => (n.length === 1 ? `0${n}` : n);
  const formattedIso = `${match[1]}-${pad(match[2])}-${pad(match[3])}`;

  const jy = parseInt(match[1], 10);
  const jm = parseInt(match[2], 10);
  const jd = parseInt(match[3], 10);

  if (isNaN(jy) || jy < 1300 || jy > 1500 || isNaN(jm) || jm < 1 || jm > 12 || isNaN(jd) || jd < 1 || jd > 31) {
    return maxIso;
  }

  if (formattedIso > maxIso) return maxIso;
  if (formattedIso < minIso) return minIso;
  return formattedIso;
}

// Calculate actual working days in current Jalali month based on total days minus holidays
export function calculateWorkingDays(
  date: Date = new Date(),
  holidaysCount = 4
): number {
  const { jy, jm } = getJalaliDate(date);
  const totalDays = getDaysInJalaliMonth(jy, jm);
  const workingDays = totalDays - holidaysCount;
  return Math.max(1, workingDays);
}

export function getCurrentJalaliMonthName(date: Date = new Date()): string {
  const { jm } = getJalaliDate(date);
  return PERSIAN_MONTH_NAMES[jm - 1];
}

// Helper to normalize Jalali YYYY-MM-DD or YYYY/MM/DD strings
export function normalizeDateStr(dateStr?: string | null): string {
  if (!dateStr) return '';
  const clean = toEnglishDigits(String(dateStr).trim()).replace(/\//g, '-');
  const match = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    const pad = (n: string) => (n.length === 1 ? `0${n}` : n);
    return `${match[1]}-${pad(match[2])}-${pad(match[3])}`;
  }
  return clean;
}

export function parseJalaliStringToGregorian(dateStr: string): Date | null {
  const norm = clampJalaliIso(dateStr);
  const match = norm.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const jy = parseInt(match[1], 10);
  const jm = parseInt(match[2], 10);
  const jd = parseInt(match[3], 10);
  if (isNaN(jy) || isNaN(jm) || isNaN(jd) || jy < 1300 || jy > 1500 || jm < 1 || jm > 12 || jd < 1 || jd > 31) return null;
  try {
    return jalaliToGregorian(jy, jm, jd);
  } catch (e) {
    return null;
  }
}

export function parseJalaliStringToGregorianStrict(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const clean = toEnglishDigits(String(dateStr).trim()).replace(/\//g, '-');
  const match = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;

  const jy = parseInt(match[1], 10);
  const jm = parseInt(match[2], 10);
  const jd = parseInt(match[3], 10);

  if (isNaN(jy) || jy < 1300 || jy > 1500 || isNaN(jm) || jm < 1 || jm > 12 || isNaN(jd) || jd < 1 || jd > 31) {
    return null;
  }

  try {
    const { gy, gm, gd } = toGregorian(jy, jm, jd);
    if (isNaN(gy) || isNaN(gm) || isNaN(gd)) return null;
    return new Date(gy, gm - 1, gd);
  } catch (e) {
    return null;
  }
}


