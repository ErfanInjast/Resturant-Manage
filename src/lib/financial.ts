// netProfit = totalRevenue - totalCOGS - totalWasteCost
// Decision: wasteCost is included as real operational expense
// Last updated: 2026-08-14

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

// Magic values/constants abstracted to UPPER_SNAKE_CASE
const MILLISECONDS_IN_DAY = 86400000;
const DEFAULT_PERIOD_DAYS = 1;
const DAYS_IN_WEEK_PRESET = 7;
const DAYS_IN_MONTH_PRESET = 30;
const DATE_STRING_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface FinancialMetrics {
  totalRevenue: number;
  totalCOGS: number;        // Pure Food Cost (مواد اولیه مصرفی)
  totalLaborCost: number;   // Total Labor Cost in period (دستمزد و حقوق)
  loggedWaste: number;
  salesWaste: number;
  totalWaste: number;
  grossProfit: number;      // Revenue - COGS
  dailyOverhead: number;
  periodOverhead: number;
  netProfit: number;        // Gross Profit - Overhead - Waste
  foodCostPercent: number;  // (COGS / Revenue) * 100
  laborCostPercent: number; // (Labor / Revenue) * 100
  primeCostPercent: number; // ((COGS + Labor) / Revenue) * 100
  netMarginPercent: number; // (Net Profit / Revenue) * 100
  periodDaysCount: number;
  filterTitle: string;
  filterSubtitle: string;
}

export type DatePreset = 'today' | 'specific' | 'last7' | 'last30' | 'currentMonth' | 'allTime';

export interface FinancialMetricsConfig {
  salesRecords: DailySalesRecord[];
  wasteLogs: WasteLog[];
  settings: Partial<AppSettings>;
  datePreset?: DatePreset;
  customSpecificDate?: string;
  earliestRecordDate?: string;
}

interface PeriodDetails {
  periodDaysCount: number;
  filterTitle: string;
  filterSubtitle: string;
}

/**
 * Extracts and filters valid, normalized date strings from raw objects.
 * Separated to ensure Single Responsibility Principle (SRP).
 */
function extractValidDates(records: Array<{ date: string }>): string[] {
  const validDates: string[] = [];
  for (const record of records) {
    const normalizedDate = normalizeDateStr(record.date);
    if (normalizedDate && parseJalaliStringToGregorianStrict(normalizedDate)) {
      validDates.push(normalizedDate);
    }
  }
  return validDates;
}

/**
 * Finds the earliest valid date across all sales and waste logs
 */
export function findEarliestRecordDate(
  salesRecords: DailySalesRecord[] = [],
  wasteLogs: WasteLog[] = []
): string | undefined {
  const allDates = [
    ...extractValidDates(salesRecords),
    ...extractValidDates(wasteLogs),
  ];

  if (allDates.length === 0) {
    return undefined;
  }

  allDates.sort();
  return allDates[0];
}

/**
 * Calculates total monthly fixed costs / overhead across all 8 cost categories
 */
export function calculateTotalMonthlyOverhead(fixedCosts?: Partial<FixedCosts>): number {
  if (!fixedCosts) {
    return 0;
  }
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
 * Computes standard daily overhead from monthly fixed overhead and working days per month.
 * Ensures consistent guard against division by zero (workingDays must be at least 1)
 * and uses consistent currency rounding (roundCurrency).
 */
export function calculateDailyOverhead(monthlyOverhead: number, workingDays: number): number {
  return roundCurrency(monthlyOverhead / Math.max(1, workingDays));
}

/**
 * Checks if a normalized record date falls within a set number of past days from today.
 */
function isDateWithinPastDays(normalizedRecordDate: string, daysCount: number): boolean {
  const gregorianDate = parseJalaliStringToGregorianStrict(normalizedRecordDate);
  if (!gregorianDate) {
    return false;
  }

  const todayGregorian = new Date();
  todayGregorian.setHours(23, 59, 59, 999);

  const gregorianStartDate = new Date(todayGregorian);
  gregorianStartDate.setDate(gregorianStartDate.getDate() - (daysCount - 1));
  gregorianStartDate.setHours(0, 0, 0, 0);

  return gregorianDate >= gregorianStartDate && gregorianDate <= todayGregorian;
}

/**
 * Checks if a normalized record date belongs to the current Jalali month.
 */
function isDateInCurrentJalaliMonth(normalizedRecordDate: string): boolean {
  const match = normalizedRecordDate.match(DATE_STRING_REGEX);
  if (!match) {
    return false;
  }

  const todayJalali = getJalaliDate();
  const jalaliYear = parseInt(match[1], 10);
  const jalaliMonth = parseInt(match[2], 10);

  return jalaliYear === todayJalali.jy && jalaliMonth === todayJalali.jm;
}

/**
 * Filter record helper to check if a Jalali date string falls into the active preset
 */
export function isDateInPresetFilter(
  recordDateStr: string,
  preset: DatePreset,
  customSpecificDate: string = ''
): boolean {
  const normalizedRecordDate = normalizeDateStr(recordDateStr);
  if (!normalizedRecordDate) {
    return false;
  }

  const todayIsoDate = formatJalali(new Date(), 'iso');

  switch (preset) {
    case 'today':
      return normalizedRecordDate === normalizeDateStr(todayIsoDate);

    case 'specific':
      return customSpecificDate ? normalizedRecordDate === normalizeDateStr(customSpecificDate) : false;

    case 'last7':
      return isDateWithinPastDays(normalizedRecordDate, DAYS_IN_WEEK_PRESET);

    case 'last30':
      return isDateWithinPastDays(normalizedRecordDate, DAYS_IN_MONTH_PRESET);

    case 'currentMonth':
      return isDateInCurrentJalaliMonth(normalizedRecordDate);

    case 'allTime':
    default:
      return true;
  }
}

/**
 * Calculates max history days from the earliest valid record.
 * Separated to reduce function length and maintain clean execution paths.
 */
function calculateMaxHistoryDays(
  salesRecords: DailySalesRecord[],
  wasteLogs: WasteLog[],
  earliestRecordDate?: string
): number {
  const actualEarliest = earliestRecordDate || findEarliestRecordDate(salesRecords, wasteLogs);
  if (!actualEarliest) {
    return Infinity;
  }

  const earliestGregorianDate = parseJalaliStringToGregorianStrict(actualEarliest);
  if (!earliestGregorianDate) {
    return Infinity;
  }

  const todayZeroHours = new Date();
  todayZeroHours.setHours(0, 0, 0, 0);

  const earliestZeroHours = new Date(earliestGregorianDate);
  earliestZeroHours.setHours(0, 0, 0, 0);

  const differenceInMilliseconds = todayZeroHours.getTime() - earliestZeroHours.getTime();
  if (differenceInMilliseconds < 0) {
    return DEFAULT_PERIOD_DAYS;
  }

  return Math.floor(differenceInMilliseconds / MILLISECONDS_IN_DAY) + 1;
}

/**
 * Core utility to decide active days and display text representing the active preset.
 */
function determinePeriodDetails(
  preset: DatePreset,
  maxHistoryDays: number,
  workingDays: number,
  customSpecificDate: string,
  uniqueDatesCount: number,
  holidaysCount: number
): PeriodDetails {
  const todayJalali = getJalaliDate();
  const todayIsoDate = formatJalali(new Date(), 'iso');

  switch (preset) {
    case 'today':
      return {
        periodDaysCount: DEFAULT_PERIOD_DAYS,
        filterTitle: 'گزارش امروز',
        filterSubtitle: `تاریخ: ${todayIsoDate}`,
      };

    case 'specific':
      return {
        periodDaysCount: DEFAULT_PERIOD_DAYS,
        filterTitle: `گزارش روز ${customSpecificDate}`,
        filterSubtitle: `تاریخ انتخاب‌شده: ${customSpecificDate}`,
      };

    case 'last7':
      return {
        periodDaysCount: Math.min(DAYS_IN_WEEK_PRESET, maxHistoryDays),
        filterTitle: '۷ روز اخیر',
        filterSubtitle: '',
      };

    case 'last30':
      return {
        periodDaysCount: Math.min(DAYS_IN_MONTH_PRESET, maxHistoryDays),
        filterTitle: '۳۰ روز اخیر',
        filterSubtitle: '',
      };

    case 'currentMonth': {
      const totalDaysInMonth = getDaysInJalaliMonth(todayJalali.jy, todayJalali.jm);
      // We assume holidays are spread evenly: 1 holiday for every 7 calendar days, capped at total holidays.
      const elapsedHolidays = Math.min(holidaysCount, Math.floor(todayJalali.jd / 7));
      const actualWorkingDaysPassed = todayJalali.jd - elapsedHolidays;
      return {
        periodDaysCount: Math.max(DEFAULT_PERIOD_DAYS, Math.min(workingDays, actualWorkingDaysPassed)),
        filterTitle: 'ماه جاری',
        filterSubtitle: '',
      };
    }

    case 'allTime':
    default: {
      const activeDays = maxHistoryDays === Infinity ? Math.max(DEFAULT_PERIOD_DAYS, uniqueDatesCount) : maxHistoryDays;
      return {
        periodDaysCount: Math.max(DEFAULT_PERIOD_DAYS, activeDays),
        filterTitle: 'کل تاریخچه',
        filterSubtitle: '',
      };
    }
  }
}

/**
 * Standardized Financial Engine for calculating all key metrics identically across the app.
 * Refactored to accept a configuration object, improving future extensibility and scaling.
 */
export function calculateFinancialMetrics(config: FinancialMetricsConfig): FinancialMetrics {
  const {
    salesRecords = [],
    wasteLogs = [],
    settings,
    datePreset = 'currentMonth',
    customSpecificDate = '',
    earliestRecordDate,
  } = config;

  const holidaysCount = settings.holidaysCount !== undefined ? settings.holidaysCount : 4;
  const workingDays = settings.workingDaysPerMonth !== undefined ? settings.workingDaysPerMonth : calculateWorkingDays(new Date(), holidaysCount);
  const totalMonthlyOverhead = calculateTotalMonthlyOverhead(settings.monthlyFixedCosts);
  const dailyOverhead = calculateDailyOverhead(totalMonthlyOverhead, workingDays);

  const maxHistoryDays = calculateMaxHistoryDays(salesRecords, wasteLogs, earliestRecordDate);

  const uniqueDatesCount = new Set([
    ...salesRecords.map((record) => normalizeDateStr(record.date)),
    ...wasteLogs.map((log) => normalizeDateStr(log.date)),
  ]).size;

  const { periodDaysCount, filterTitle, filterSubtitle } = determinePeriodDetails(
    datePreset,
    maxHistoryDays,
    workingDays,
    customSpecificDate,
    uniqueDatesCount,
    holidaysCount
  );

  const filteredSales = salesRecords.filter((record) =>
    isDateInPresetFilter(record.date, datePreset, customSpecificDate)
  );
  const filteredWaste = wasteLogs.filter((log) =>
    isDateInPresetFilter(log.date, datePreset, customSpecificDate)
  );

  const totalRevenue = filteredSales.reduce((accumulator, record) => accumulator + (record.totalRevenue || 0), 0);
  const totalCOGS = filteredSales.reduce((accumulator, record) => accumulator + (record.totalCOGS || 0), 0);
  const directLaborFromSales = filteredSales.reduce((accumulator, record) => accumulator + (record.totalLaborCost || 0), 0);
  const loggedWaste = filteredWaste.reduce((accumulator, log) => accumulator + (log.cost || 0), 0);
  // salesWaste is set to 0 because record.totalWasteCost on daily sales records is populated directly from wasteLogs in syncAndRecalculateAllData.
  // Summing both loggedWaste and salesWaste causes double-counting of the exact same waste logs.
  const salesWaste = 0;
  const totalWaste = loggedWaste;

  // Compute fixed labor portion for period
  const monthlySalaries = settings.monthlyFixedCosts?.salaries || 0;
  const periodSalaries = roundCurrency((monthlySalaries / Math.max(1, workingDays)) * periodDaysCount);
  const totalLaborCost = periodSalaries + directLaborFromSales;

  const grossProfit = totalRevenue - totalCOGS;
  const periodOverhead = roundCurrency(dailyOverhead * periodDaysCount);
  const netProfit = grossProfit - periodOverhead - totalWaste;

  const foodCostPercent = totalRevenue > 0 ? roundCurrency((totalCOGS / totalRevenue) * 100) : 0;
  const laborCostPercent = totalRevenue > 0 ? roundCurrency((totalLaborCost / totalRevenue) * 100) : 0;
  const primeCostPercent = totalRevenue > 0 ? roundCurrency(((totalCOGS + totalLaborCost) / totalRevenue) * 100) : 0;
  const netMarginPercent = totalRevenue > 0 ? roundCurrency((netProfit / totalRevenue) * 100) : 0;

  return {
    totalRevenue,
    totalCOGS,
    totalLaborCost,
    loggedWaste,
    salesWaste,
    totalWaste,
    grossProfit,
    dailyOverhead,
    periodOverhead,
    netProfit,
    foodCostPercent,
    laborCostPercent,
    primeCostPercent,
    netMarginPercent,
    periodDaysCount,
    filterTitle,
    filterSubtitle,
  };
}

