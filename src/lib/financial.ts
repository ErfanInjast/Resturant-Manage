// netProfit = totalRevenue - totalCOGS - totalWasteCost
// Decision: wasteCost is included as real operational expense
// Last updated: 2026-08-09
import type { DailySalesRecord, WasteLog, FixedCosts, AppSettings } from '../types';
import { roundCurrency } from './utils';
import {
  getJalaliDate,
  formatJalali,
  normalizeDateStr,
  parseJalaliStringToGregorianStrict,
  getDaysInJalaliMonth,
  calculateWorkingDays,
} from './jalali';

export interface FinancialMetrics {
  totalRevenue: number;
  totalCOGS: number;
  loggedWaste: number;
  salesWaste: number;
  totalWaste: number;
  grossProfit: number;
  dailyOverhead: number;
  periodOverhead: number;
  netProfit: number;
  foodCostPercent: number;
  netMarginPercent: number;
  periodDaysCount: number;
  filterTitle: string;
  filterSubtitle: string;
}

export type DatePreset = 'today' | 'specific' | 'last7' | 'last30' | 'currentMonth' | 'allTime';

/**
 * Finds the earliest valid date across all sales and waste logs
 */
export function findEarliestRecordDate(
  salesRecords: DailySalesRecord[] = [],
  wasteLogs: WasteLog[] = []
): string | undefined {
  const dates: string[] = [];
  for (const s of salesRecords) {
    const norm = normalizeDateStr(s.date);
    if (norm && parseJalaliStringToGregorianStrict(norm)) {
      dates.push(norm);
    }
  }
  for (const w of wasteLogs) {
    const norm = normalizeDateStr(w.date);
    if (norm && parseJalaliStringToGregorianStrict(norm)) {
      dates.push(norm);
    }
  }
  if (dates.length === 0) return undefined;
  dates.sort();
  return dates[0];
}

/**
 * Calculates total monthly fixed costs / overhead across all 8 cost categories
 */
export function calculateTotalMonthlyOverhead(fixedCosts?: Partial<FixedCosts>): number {
  if (!fixedCosts) return 0;
  return (
    (fixedCosts.rent || 0) +
    (fixedCosts.utilities || 0) +
    (fixedCosts.salaries || 0) +
    (fixedCosts.marketing || 0) +
    (fixedCosts.insurance || 0) +
    (fixedCosts.general || 0) +
    (fixedCosts.maintenance || 0) +
    (fixedCosts.delivery || 0)
  );
}

/**
 * Filter record helper to check if a Jalali date string falls into the active preset
 */
export function isDateInPresetFilter(
  recordDateStr: string,
  preset: DatePreset,
  customSpecificDate: string = ''
): boolean {
  const normRec = normalizeDateStr(recordDateStr);
  if (!normRec) return false;

  const todayJ = getJalaliDate();
  const todayIso = formatJalali(new Date(), 'iso');
  const todayGregorian = new Date();
  todayGregorian.setHours(23, 59, 59, 999);

  switch (preset) {
    case 'today':
      return normRec === normalizeDateStr(todayIso);

    case 'specific':
      return customSpecificDate ? normRec === normalizeDateStr(customSpecificDate) : false;

    case 'last7': {
      const gDate = parseJalaliStringToGregorianStrict(normRec);
      if (!gDate) return false;
      const gStart = new Date(todayGregorian);
      gStart.setDate(gStart.getDate() - 6);
      gStart.setHours(0, 0, 0, 0);
      return gDate >= gStart && gDate <= todayGregorian;
    }

    case 'last30': {
      const gDate = parseJalaliStringToGregorianStrict(normRec);
      if (!gDate) return false;
      const gStart = new Date(todayGregorian);
      gStart.setDate(gStart.getDate() - 29);
      gStart.setHours(0, 0, 0, 0);
      return gDate >= gStart && gDate <= todayGregorian;
    }

    case 'currentMonth': {
      const match = normRec.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!match) return false;
      const jy = parseInt(match[1], 10);
      const jm = parseInt(match[2], 10);
      return jy === todayJ.jy && jm === todayJ.jm;
    }

    case 'allTime':
      return true;

    default:
      return true;
  }
}

/**
 * Standardized Financial Engine for calculating all key metrics identically across the app
 */
export function calculateFinancialMetrics(
  salesRecords: DailySalesRecord[],
  wasteLogs: WasteLog[],
  settings: Partial<AppSettings>,
  datePreset: DatePreset = 'currentMonth',
  customSpecificDate: string = '',
  earliestRecordDate?: string
): FinancialMetrics {
  const workingDays = settings.workingDaysPerMonth || calculateWorkingDays();
  const totalMonthlyOverhead = calculateTotalMonthlyOverhead(settings.monthlyFixedCosts);
  const dailyOverhead = roundCurrency(totalMonthlyOverhead / Math.max(1, workingDays));

  const todayJ = getJalaliDate();
  const todayIso = formatJalali(new Date(), 'iso');

  const actualEarliest = earliestRecordDate || findEarliestRecordDate(salesRecords, wasteLogs);

  let maxHistoryDays = Infinity;
  if (actualEarliest) {
    const earliestG = parseJalaliStringToGregorianStrict(actualEarliest);
    if (earliestG) {
      const todayZero = new Date();
      todayZero.setHours(0, 0, 0, 0);
      const earliestZero = new Date(earliestG);
      earliestZero.setHours(0, 0, 0, 0);
      const diffMs = todayZero.getTime() - earliestZero.getTime();
      if (diffMs >= 0) {
        maxHistoryDays = Math.floor(diffMs / 86400000) + 1;
      } else {
        maxHistoryDays = 1;
      }
    }
  }

  let periodDaysCount = 1;
  let filterTitle = 'ماه جاری';
  let filterSubtitle = '';

  if (datePreset === 'today') {
    filterTitle = 'گزارش امروز';
    filterSubtitle = `تاریخ: ${todayIso}`;
    periodDaysCount = 1;
  } else if (datePreset === 'specific') {
    filterTitle = `گزارش روز ${customSpecificDate}`;
    filterSubtitle = `تاریخ انتخاب‌شده: ${customSpecificDate}`;
    periodDaysCount = 1;
  } else if (datePreset === 'last7') {
    filterTitle = '۷ روز اخیر';
    periodDaysCount = Math.min(7, maxHistoryDays);
  } else if (datePreset === 'last30') {
    filterTitle = '۳۰ روز اخیر';
    periodDaysCount = Math.min(30, maxHistoryDays);
  } else if (datePreset === 'currentMonth') {
    filterTitle = 'ماه جاری';
    const totalDaysInM = getDaysInJalaliMonth(todayJ.jy, todayJ.jm);
    const estimatedWorkingDaysPassed = Math.round((todayJ.jd / totalDaysInM) * workingDays);
    periodDaysCount = Math.max(1, estimatedWorkingDaysPassed);
  } else if (datePreset === 'allTime') {
    filterTitle = 'کل تاریخچه';
    const uniqueDates = new Set([
      ...salesRecords.map((s) => normalizeDateStr(s.date)),
      ...wasteLogs.map((w) => normalizeDateStr(w.date)),
    ]);
    periodDaysCount = Math.max(1, uniqueDates.size);
  }

  // Filter records
  const filteredSales = salesRecords.filter((r) => isDateInPresetFilter(r.date, datePreset, customSpecificDate));
  const filteredWaste = wasteLogs.filter((w) => isDateInPresetFilter(w.date, datePreset, customSpecificDate));

  // Compute sums
  const totalRevenue = filteredSales.reduce((acc, r) => acc + (r.totalRevenue || 0), 0);
  const totalCOGS = filteredSales.reduce((acc, r) => acc + (r.totalCOGS || 0), 0);
  const loggedWaste = filteredWaste.reduce((acc, w) => acc + (w.cost || 0), 0);
  const salesWaste = 0; // Set to 0 to avoid double counting with loggedWaste
  const totalWaste = loggedWaste;

  const grossProfit = totalRevenue - totalCOGS;
  const periodOverhead = roundCurrency(dailyOverhead * periodDaysCount);
  const netProfit = grossProfit - periodOverhead - totalWaste;

  const foodCostPercent = totalRevenue > 0 ? roundCurrency((totalCOGS / totalRevenue) * 100) : 0;
  const netMarginPercent = totalRevenue > 0 ? roundCurrency((netProfit / totalRevenue) * 100) : 0;

  return {
    totalRevenue,
    totalCOGS,
    loggedWaste,
    salesWaste,
    totalWaste,
    grossProfit,
    dailyOverhead,
    periodOverhead,
    netProfit,
    foodCostPercent,
    netMarginPercent,
    periodDaysCount,
    filterTitle,
    filterSubtitle,
  };
}
