import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLiveQuery } from 'dexie-react-hooks';
import { staggerContainer, fadeInUpItem, cardHover } from '../../lib/motion';
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Trash2,
  Calendar,
  Target,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronRight,
  ChevronLeft,
  Filter,
  PieChart,
  BarChart2,
  Receipt,
  Utensils,
  Layers,
  Users,
  Sparkles,
} from 'lucide-react';
import { db, DEFAULT_SETTINGS } from '../../db';
import { useAppStore } from '../../store/useAppStore';
import { cn, formatToman, formatNumber, roundCurrency, toPersianDigits, toEnglishDigits } from '../../lib/utils';
import {
  calculateWorkingDays,
  formatJalali,
  getJalaliDate,
  getDaysInJalaliMonth,
  PERSIAN_MONTH_NAMES,
  formatJalaliReadable,
  jalaliToGregorian,
  MIN_JALALI_DATE,
  getTodayJalaliIso,
  clampJalaliIso,
} from '../../lib/jalali';
import {
  calculateFinancialMetrics,
  calculateTotalMonthlyOverhead,
  calculateDailyOverhead,
  isDateInPresetFilter,
  findEarliestRecordDate,
  DatePreset,
} from '../../lib/financial';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { PageSkeleton } from '../ui/PageSkeleton';
import { JalaliDatePicker } from '../ui/JalaliDatePicker';
import { PnLReportExportModal } from './PnLReportExportModal';
import { KPIDetailModal, KPIMetricType } from './KPIDetailModal';
import { TopSoldItemsModal } from './TopSoldItemsModal';
import { WasteLogsDetailModal } from './WasteLogsDetailModal';
import { ArrowUpRight } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
} from 'recharts';

export type DateFilterPreset = 'today' | 'specific' | 'last7' | 'last30' | 'currentMonth' | 'allTime';

// Helper to normalize Jalali YYYY-MM-DD or YYYY/MM/DD strings
function normalizeDateStr(dateStr?: string | null): string {
  if (!dateStr) return '';
  const clean = toEnglishDigits(String(dateStr).trim()).replace(/\//g, '-');
  const match = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    const pad = (n: string) => (n.length === 1 ? `0${n}` : n);
    return `${match[1]}-${pad(match[2])}-${pad(match[3])}`;
  }
  return clean;
}

function parseJalaliStringToGregorian(dateStr: string): Date | null {
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

function getShiftedJalaliIso(jalaliStr: string, deltaDays: number): string {
  const norm = clampJalaliIso(jalaliStr);
  const match = norm.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const todayIso = getTodayJalaliIso();
  if (!match) return todayIso;

  const jy = parseInt(match[1], 10);
  const jm = parseInt(match[2], 10);
  const jd = parseInt(match[3], 10);

  if (isNaN(jy) || isNaN(jm) || isNaN(jd) || jy < 1300 || jy > 1500 || jm < 1 || jm > 12 || jd < 1 || jd > 31) {
    return todayIso;
  }

  try {
    const gDate = jalaliToGregorian(jy, jm, jd);
    gDate.setDate(gDate.getDate() + deltaDays);
    const shiftedIso = formatJalali(gDate, 'iso');
    return clampJalaliIso(shiftedIso, MIN_JALALI_DATE, todayIso);
  } catch (e) {
    return todayIso;
  }
}

export const PnLDashboard: React.FC = () => {
  const { setActiveTab } = useAppStore();
  const settingsQuery = useLiveQuery(() => db.settings.get('config'));
  const salesRecordsQuery = useLiveQuery(() => db.dailySales.toArray());
  const wasteLogsQuery = useLiveQuery(() => db.wasteLogs.toArray());
  const menuItemsQuery = useLiveQuery(() => db.menuItems.toArray());

  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [datePreset, setDatePreset] = useState<DateFilterPreset>('currentMonth');
  const [customSpecificDate, setCustomSpecificDate] = useState<string>(formatJalali(new Date(), 'iso'));
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [activeKpiModal, setActiveKpiModal] = useState<KPIMetricType | null>(null);
  const [isTopSoldModalOpen, setIsTopSoldModalOpen] = useState<boolean>(false);
  const [isWasteLogsModalOpen, setIsWasteLogsModalOpen] = useState<boolean>(false);

  const settings = settingsQuery ?? DEFAULT_SETTINGS;
  const salesRecords = salesRecordsQuery ?? [];
  const wasteLogs = wasteLogsQuery ?? [];
  const menuItems = menuItemsQuery ?? [];

  const earliestRecordDate = React.useMemo(() => {
    return findEarliestRecordDate(salesRecords, wasteLogs);
  }, [salesRecords, wasteLogs]);

  const isLoading =
    settingsQuery === undefined ||
    salesRecordsQuery === undefined ||
    wasteLogsQuery === undefined ||
    menuItemsQuery === undefined;

  if (isLoading) {
    return <PageSkeleton type="dashboard" />;
  }

  // Working days and overhead calculations
  const workingDays = settings.workingDaysPerMonth || calculateWorkingDays();
  const fixedCosts = settings.monthlyFixedCosts || DEFAULT_SETTINGS.monthlyFixedCosts;
  const totalMonthlyOverhead = calculateTotalMonthlyOverhead(fixedCosts);
  const dailyOverhead = calculateDailyOverhead(totalMonthlyOverhead, workingDays);

  // Compute standardized financial metrics for the active filter preset
  const metrics = calculateFinancialMetrics({
    salesRecords,
    wasteLogs,
    settings,
    datePreset: datePreset as DatePreset,
    customSpecificDate,
    earliestRecordDate,
  });

  const {
    totalRevenue: filteredRevenue,
    totalCOGS: filteredCOGS,
    totalLaborCost: filteredLaborCost,
    loggedWaste: filteredLoggedWaste,
    salesWaste: filteredSalesWaste,
    totalWaste: filteredTotalWaste,
    grossProfit: filteredGrossProfit,
    periodOverhead: filteredPeriodOverhead,
    netProfit: filteredNetProfit,
    foodCostPercent: filteredFoodCostPercent,
    laborCostPercent: filteredLaborCostPercent,
    primeCostPercent: filteredPrimeCostPercent,
    netMarginPercent: filteredNetMarginPercent,
    periodDaysCount,
  } = metrics;

  // Filter description labels
  const todayJ = getJalaliDate();
  const todayIso = formatJalali(new Date(), 'iso');

  let filterTitle = metrics.filterTitle;
  let filterSubtitle = metrics.filterSubtitle;

  if (datePreset === 'today') {
    filterSubtitle = `تاریخ: ${formatJalaliReadable(todayIso) || toPersianDigits(todayIso)}`;
  } else if (datePreset === 'specific') {
    const readable = formatJalaliReadable(customSpecificDate) || toPersianDigits(customSpecificDate);
    filterTitle = `گزارش روز ${readable}`;
    filterSubtitle = `تاریخ انتخاب‌شده: ${toPersianDigits(customSpecificDate)}`;
  } else if (datePreset === 'last7') {
    const gStart7 = new Date();
    gStart7.setDate(gStart7.getDate() - 6);
    const startIso = formatJalali(gStart7, 'iso');
    filterSubtitle = `از ${formatJalaliReadable(startIso)} تا ${formatJalaliReadable(todayIso)}`;
  } else if (datePreset === 'last30') {
    const gStart30 = new Date();
    gStart30.setDate(gStart30.getDate() - 29);
    const startIso = formatJalali(gStart30, 'iso');
    filterSubtitle = `از ${formatJalaliReadable(startIso)} تا ${formatJalaliReadable(todayIso)}`;
  } else if (datePreset === 'currentMonth') {
    const currentMonthName = PERSIAN_MONTH_NAMES[todayJ.jm - 1];
    filterTitle = `ماه جاری - ${currentMonthName} ${toPersianDigits(todayJ.jy)}`;
    filterSubtitle = `از اول ${currentMonthName} تا امروز - روز ${toPersianDigits(todayJ.jd)}`;
  } else if (datePreset === 'allTime') {
    filterTitle = 'کل تاریخچه - همه زمان‌ها';
    filterSubtitle = 'شامل تمام داده‌های فروش و ضایعات ثبت‌شده از ابتدا';
  }

  // Filter Records according to active date preset
  const filteredSalesRecords = salesRecords.filter((r) =>
    isDateInPresetFilter(r.date, datePreset as DatePreset, customSpecificDate)
  );
  const filteredWasteLogs = wasteLogs.filter((w) =>
    isDateInPresetFilter(w.date, datePreset as DatePreset, customSpecificDate)
  );

  const filteredNetProfitToman = formatToman(filteredNetProfit);
  const filteredGrossProfitToman = formatToman(filteredGrossProfit);

  // Product sales aggregation for filtered period
  const itemSalesMap = new Map<number, { menuItemId: number; name: string; totalQty: number; totalRev: number; totalCost: number }>();
  filteredSalesRecords.forEach((rec) => {
    rec.items?.forEach((item) => {
      const existing = itemSalesMap.get(item.menuItemId) || {
        menuItemId: item.menuItemId,
        name: item.menuItemName,
        totalQty: 0,
        totalRev: 0,
        totalCost: 0,
      };
      existing.totalQty += item.quantity || 0;
      existing.totalRev += item.totalRevenue || 0;
      existing.totalCost += item.totalCost || 0;
      itemSalesMap.set(item.menuItemId, existing);
    });
  });

  const allSoldItemsInPeriod = Array.from(itemSalesMap.values()).sort((a, b) => b.totalRev - a.totalRev);
  const topSoldItemsInPeriod = allSoldItemsInPeriod.slice(0, 4);
  const topWasteLogsInPeriod = filteredWasteLogs.slice(0, 4);

  // Month-level metrics for Break-Even Target Card (remains fixed for current month as requested)
  const monthRevenue = salesRecords
    .filter((r) => {
      const norm = normalizeDateStr(r.date);
      const match = norm.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!match) return false;
      return parseInt(match[1], 10) === todayJ.jy && parseInt(match[2], 10) === todayJ.jm;
    })
    .reduce((acc, curr) => acc + (curr.totalRevenue || 0), 0);

  const monthCOGS = salesRecords
    .filter((r) => {
      const norm = normalizeDateStr(r.date);
      const match = norm.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!match) return false;
      return parseInt(match[1], 10) === todayJ.jy && parseInt(match[2], 10) === todayJ.jm;
    })
    .reduce((acc, curr) => acc + (curr.totalCOGS || 0), 0);

  const monthCogsRatio = monthRevenue > 0 ? monthCOGS / monthRevenue : 0.4;
  const monthGrossMarginRatio = 1 - monthCogsRatio;
  const monthlyBreakEvenTarget =
    monthGrossMarginRatio > 0 ? roundCurrency(totalMonthlyOverhead / monthGrossMarginRatio) : totalMonthlyOverhead * 2;
  const breakEvenProgress = Math.min(100, Math.round((monthRevenue / monthlyBreakEvenTarget) * 100));

  const totalDaysInMonth = getDaysInJalaliMonth(todayJ.jy, todayJ.jm);
  const currentMonthDay = todayJ.jd;
  const remainingCalendarDays = Math.max(0, totalDaysInMonth - currentMonthDay);
  const currentMonthName = PERSIAN_MONTH_NAMES[todayJ.jm - 1];

  const estimatedWorkingDaysPassed = Math.round((currentMonthDay / totalDaysInMonth) * workingDays);
  const remainingWorkingDays = Math.max(0, workingDays - estimatedWorkingDaysPassed);

  const remainingRevenueNeeded = Math.max(0, monthlyBreakEvenTarget - monthRevenue);
  const dailyRequiredRevenue = remainingWorkingDays > 0 ? roundCurrency(remainingRevenueNeeded / remainingWorkingDays) : 0;

  const daysPassedForAvg = Math.max(1, currentMonthDay);
  const averageDailyRevenue = monthRevenue / daysPassedForAvg;
  const projectedMonthEndRevenue = averageDailyRevenue * totalDaysInMonth;
  const projectedPercentage = Math.round((projectedMonthEndRevenue / Math.max(1, monthlyBreakEvenTarget)) * 100);

  // Prepare Chart Data for filtered records
  const chartData = [...filteredSalesRecords]
    .sort((a, b) => (normalizeDateStr(a.date) > normalizeDateStr(b.date) ? 1 : -1))
    .slice(-15)
    .map((record) => {
      return {
        date: formatJalaliReadable(record.date) || toPersianDigits(record.date),
        'درآمد کل': record.totalRevenue,
        'بهای تمام شده': record.totalCOGS,
        'سود ناخالص': record.totalRevenue - record.totalCOGS,
      };
    });

  // Helper for responsive font sizes based on text length
  const getResponsiveFontClass = (str: string) => {
    const len = str.length;
    if (len > 24) return 'text-xs sm:text-sm font-black truncate';
    if (len > 18) return 'text-sm sm:text-base font-black truncate';
    if (len > 13) return 'text-base sm:text-lg font-black truncate';
    return 'text-lg sm:text-xl md:text-2xl font-black truncate';
  };

  if (salesRecords.length === 0 && menuItems.length === 0) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={ShoppingBag}
          title="هنوز هیچ فروش یا آیتم منویی ثبت نشده است"
          description="برای فعال‌سازی گزارش سود و زیان، نقطه سربه سر و نمودارها، ابتدا از بخش انبار و منو، محصولات خود را تعریف کرده و اولین فروش روزانه را ثبت کنید."
          actionLabel="افزودن آیتم‌های منو"
          onAction={() => {
            setActiveTab('menu');
          }}
        />
      </div>
    );
  }

  const PRESET_OPTIONS: { id: DateFilterPreset; label: string; icon?: React.ComponentType<{ className?: string }> }[] = [
    { id: 'today', label: 'امروز' },
    { id: 'specific', label: 'یک روز به‌خصوص', icon: Calendar },
    { id: 'last7', label: '۷ روز اخیر' },
    { id: 'last30', label: '۳۰ روز اخیر' },
    { id: 'currentMonth', label: 'ماه جاری' },
    { id: 'allTime', label: 'کل تاریخچه' },
  ];

  const filterKey = `${datePreset}_${datePreset === 'specific' ? customSpecificDate : ''}`;

  return (
    <div className="space-y-6">
      {/* Sleek Minimalist Date Scope Filter & Action Bar */}
      <div className="bg-white dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col gap-3 relative z-30 overflow-visible">
        {/* Row 1: Filter Presets + Duration & Export */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 w-full">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] pl-2 border-l border-[var(--border-subtle)] dark:border-[var(--border-subtle)] shrink-0">
              <Filter className="h-4 w-4 text-[var(--brand-primary)]" />
              <span>بازه گزارش:</span>
            </div>

            {/* Minimalist Filter Preset Buttons with Sliding Motion Highlight */}
            <div className="relative flex items-center bg-[var(--bg-base)] dark:bg-[var(--bg-base)] p-1 rounded-2xl border border-[var(--border-subtle)] overflow-x-auto scrollbar-none select-none max-w-full">
              {PRESET_OPTIONS.map((preset) => {
                const isSelected = datePreset === preset.id;
                const IconComponent = preset.icon;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setDatePreset(preset.id)}
                    className={cn(
                      'relative z-10 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap select-none',
                      isSelected
                        ? 'text-white'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    )}
                  >
                    {IconComponent && <IconComponent className="h-3.5 w-3.5" />}
                    <span>{preset.label}</span>
                    {isSelected && (
                      <motion.div
                        layoutId="pnlActiveDatePreset"
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                        className="absolute inset-0 bg-[var(--brand-primary)] rounded-xl -z-10 shadow-xs"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-[var(--border-subtle)] shrink-0">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
              دوره: <strong className="text-[var(--text-primary)] dark:text-[var(--text-primary)]">{toPersianDigits(periodDaysCount)} روز</strong>
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExportModalOpen(true)}
              className="text-xs font-bold border-[var(--border-subtle)] hover:border-[var(--brand-primary)] text-[var(--text-primary)] hover:text-[var(--brand-primary)] rounded-xl gap-1.5 shadow-2xs cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>خروجی گزارش</span>
            </Button>
          </div>
        </div>

        {/* Row 2: Specific Date Picker Sub-row (Dedicated collapsible container that never breaks top layout) */}
        <AnimatePresence initial={false}>
          {datePreset === 'specific' && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 2 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: 'visible' }}
              className="relative z-30 overflow-visible"
            >
              <div className="pt-3 border-t border-dashed border-[var(--border-subtle)] dark:border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-base)]/60 bg-[var(--bg-base)] p-3 rounded-xl border border-[var(--border-subtle)] relative z-30 overflow-visible">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="text-xs font-bold text-[var(--text-secondary)] shrink-0 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-[var(--brand-primary)]" />
                    <span>انتخاب روز مورد نظر برای تحلیل:</span>
                  </label>
                  <JalaliDatePicker
                    value={customSpecificDate}
                    onChange={setCustomSpecificDate}
                    minDate={MIN_JALALI_DATE}
                    maxDate={todayIso}
                    showSteppers={true}
                    align="right"
                  />
                </div>
                <div className="text-xs font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                  گزارش روز: <span className="font-black text-[var(--text-primary)]">{formatJalaliReadable(customSpecificDate) || toPersianDigits(customSpecificDate)}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Dynamic PnL Content Wrapped in Smooth Animated Transition */}
      <AnimatePresence mode="wait">
        <motion.div
          key={filterKey}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
          className="space-y-6 relative z-10"
        >
          {/* Filtered Metric Cards Grid - 4 Core Pillars */}
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
        {/* Total Revenue */}
        <motion.div variants={fadeInUpItem} whileHover={cardHover.whileHover} transition={cardHover.transition} className="h-full">
          <Card
            onClick={() => setActiveKpiModal('revenue')}
            className="border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] bg-white dark:bg-[var(--bg-card)] hover:border-emerald-500/60 dark:hover:border-emerald-500/60 hover:shadow-md transition-all h-full flex flex-col justify-between cursor-pointer group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between pb-1">
              <CardTitle className="text-xs font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">فروش و درآمد دوره</CardTitle>
              <div className="rounded-full bg-emerald-50 dark:bg-emerald-950/50 p-2 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-110 transition-transform">
                <TrendingUp className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <div className={cn("text-[var(--text-primary)] dark:text-[var(--text-primary)] tracking-tight font-black", getResponsiveFontClass(formatToman(filteredRevenue).text))}>
                {formatToman(filteredRevenue).text}
              </div>

              <div className="flex items-center justify-between pt-2 text-[10px] text-[var(--text-secondary)] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors font-bold border-t border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
                <span>{formatNumber(filteredSalesRecords.length)} روز ثبت فروش</span>
                <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                  گزارش کامل
                  <ArrowUpRight className="h-3 w-3" />
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* COGS (بهای مواد اولیه) */}
        <motion.div variants={fadeInUpItem} whileHover={cardHover.whileHover} transition={cardHover.transition} className="h-full">
          <Card
            onClick={() => setActiveKpiModal('cogs')}
            className="border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] bg-white dark:bg-[var(--bg-card)] hover:border-amber-500/60 dark:hover:border-amber-500/60 hover:shadow-md transition-all h-full flex flex-col justify-between cursor-pointer group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between pb-1">
              <CardTitle className="text-xs font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">بهای تمام شده مواد اولیه</CardTitle>
              <div className="rounded-full bg-amber-50 dark:bg-amber-950/50 p-2 text-amber-600 dark:text-amber-400 shrink-0 group-hover:scale-110 transition-transform">
                <ShoppingBag className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <div className={cn("text-[var(--text-primary)] dark:text-[var(--text-primary)] tracking-tight font-black", getResponsiveFontClass(formatToman(filteredCOGS).text))}>
                {formatToman(filteredCOGS).text}
              </div>

              <div className="flex items-center justify-between pt-2 text-[10px] text-[var(--text-secondary)] group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors font-bold border-t border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
                <span>نسبت مواد: {toPersianDigits(roundCurrency(filteredFoodCostPercent))}٪</span>
                <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                  گزارش کامل
                  <ArrowUpRight className="h-3 w-3" />
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Overhead & Waste */}
        <motion.div variants={fadeInUpItem} whileHover={cardHover.whileHover} transition={cardHover.transition} className="h-full">
          <Card
            onClick={() => setActiveKpiModal('overhead_waste')}
            className="border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] bg-white dark:bg-[var(--bg-card)] hover:border-rose-500/60 dark:hover:border-rose-500/60 hover:shadow-md transition-all h-full flex flex-col justify-between cursor-pointer group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-rose-500 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between pb-1">
              <CardTitle className="text-xs font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">سربار و ضایعات دوره</CardTitle>
              <div className="rounded-full bg-rose-50 dark:bg-rose-950/50 p-2 text-rose-600 dark:text-rose-400 shrink-0 group-hover:scale-110 transition-transform">
                <Trash2 className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <div className={cn("text-[var(--text-primary)] dark:text-[var(--text-primary)] tracking-tight font-black", getResponsiveFontClass(formatToman(filteredPeriodOverhead + filteredTotalWaste).text))}>
                {formatToman(filteredPeriodOverhead + filteredTotalWaste).text}
              </div>

              <div className="flex items-center justify-between pt-2 text-[10px] text-[var(--text-secondary)] group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors font-bold border-t border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
                <span>سربار: {formatToman(filteredPeriodOverhead).text}</span>
                <span className="flex items-center gap-0.5 text-rose-600 dark:text-rose-400">
                  گزارش کامل
                  <ArrowUpRight className="h-3 w-3" />
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Net Profit */}
        <motion.div variants={fadeInUpItem} whileHover={cardHover.whileHover} transition={cardHover.transition} className="h-full">
          <Card
            onClick={() => setActiveKpiModal('net_profit')}
            className={cn(
              "border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] bg-white dark:bg-[var(--bg-card)] hover:shadow-md transition-all h-full flex flex-col justify-between cursor-pointer group relative overflow-hidden",
              filteredNetProfitToman.isNegative
                ? "hover:border-rose-500/60 dark:hover:border-rose-500/60"
                : "hover:border-emerald-500/60 dark:hover:border-emerald-500/60"
            )}
          >
            <div
              className={cn(
                "absolute top-0 right-0 left-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity",
                filteredNetProfitToman.isNegative
                  ? "bg-gradient-to-r from-rose-500 to-red-600"
                  : "bg-gradient-to-r from-emerald-500 to-green-600"
              )}
            />
            <CardHeader className="flex flex-row items-center justify-between pb-1">
              <CardTitle className="text-xs font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">سود خالص دوره</CardTitle>
              <div className={cn(
                "rounded-full p-2 shrink-0 group-hover:scale-110 transition-transform",
                filteredNetProfitToman.isNegative
                  ? "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400"
                  : "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
              )}>
                {filteredNetProfitToman.isNegative ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <div className={cn(filteredNetProfitToman.isNegative ? 'text-rose-600 dark:text-rose-400 font-black' : 'text-emerald-600 dark:text-emerald-400 font-black', getResponsiveFontClass(filteredNetProfitToman.text))}>
                {filteredNetProfitToman.text}
              </div>

              <div className={cn(
                "flex items-center justify-between pt-2 text-[10px] text-[var(--text-secondary)] transition-colors font-bold border-t border-[var(--border-subtle)] dark:border-[var(--border-subtle)]",
                filteredNetProfitToman.isNegative
                  ? "group-hover:text-rose-600 dark:group-hover:text-rose-400"
                  : "group-hover:text-emerald-600 dark:group-hover:text-emerald-400"
              )}>
                <span>حاشیه سود: {toPersianDigits(roundCurrency(filteredNetMarginPercent))}٪</span>
                <span className={cn(
                  "flex items-center gap-0.5",
                  filteredNetProfitToman.isNegative ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                )}>
                  گزارش کامل
                  <ArrowUpRight className="h-3 w-3" />
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Dedicated Section: بهای اولیه تولید و هزینه‌های مستقیم */}
      <Card className="border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] bg-white dark:bg-[var(--bg-card)] overflow-hidden">
        <CardHeader className="border-b border-[var(--border-subtle)]/60 dark:border-[var(--border-subtle)] pb-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[var(--bg-base)] dark:bg-[var(--bg-base)] text-[var(--text-primary)] shrink-0 border border-[var(--border-subtle)]">
                <Layers className="h-4.5 w-4.5 text-[var(--brand-primary)]" />
              </div>
              <div>
                <CardTitle className="text-sm font-black text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                  بهای اولیه تولید و هزینه‌های مستقیم
                </CardTitle>
                <p className="text-[11px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)] mt-0.5">
                  پایش نسبت هزینه مواد مصرفی و دستمزد به درآمد فروش • {filterTitle}
                </p>
              </div>
            </div>

            <Badge
              variant={filteredPrimeCostPercent <= 65 ? 'success' : 'warning'}
              className="font-bold px-3 py-1 self-start sm:self-auto text-xs"
            >
              {filteredPrimeCostPercent <= 65 ? 'وضعیت بهینه (زیر ۶۵٪ هدف)' : 'بالاتر از سقف استاندارد'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-5 space-y-4">
          {/* 3 Clean Metric Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* 1. Food Cost */}
            <div className="p-4 rounded-2xl bg-[var(--bg-base)]/70 bg-[var(--bg-base)] border border-[var(--border-subtle)] flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-secondary)]">سهم مواد اولیه</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[var(--bg-card)] dark:bg-[var(--bg-base)] text-[var(--text-primary)]">
                  مواد مصرفی
                </span>
              </div>
              <div>
                <div className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
                  {toPersianDigits(roundCurrency(filteredFoodCostPercent))}٪
                </div>
                <div className="text-xs font-bold text-[var(--text-secondary)] mt-0.5">
                  مبلغ مواد: {formatToman(filteredCOGS).text}
                </div>
              </div>
            </div>

            {/* 2. Labor Cost */}
            <div className="p-4 rounded-2xl bg-[var(--bg-base)]/70 bg-[var(--bg-base)] border border-[var(--border-subtle)] flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-secondary)]">سهم هزینه نیروی کار</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[var(--bg-card)] dark:bg-[var(--bg-base)] text-[var(--text-primary)]">
                  دستمزد
                </span>
              </div>
              <div>
                <div className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
                  {toPersianDigits(roundCurrency(filteredLaborCostPercent))}٪
                </div>
                <div className="text-xs font-bold text-[var(--text-secondary)] mt-0.5">
                  مبلغ دستمزد: {formatToman(filteredLaborCost).text}
                </div>
              </div>
            </div>

            {/* 3. Total Prime Cost */}
            <div className="p-4 rounded-2xl bg-[var(--bg-base)]/70 bg-[var(--bg-base)] border border-[var(--border-subtle)] flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-secondary)]">بهای اولیه کل (مواد + دستمزد)</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[var(--bg-card)] dark:bg-[var(--bg-base)] text-[var(--text-primary)]">
                  هدف: ۵۵٪ تا ۶۵٪
                </span>
              </div>
              <div>
                <div className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
                  {toPersianDigits(roundCurrency(filteredPrimeCostPercent))}٪
                </div>
                <div className="text-xs font-bold text-[var(--text-secondary)] mt-0.5">
                  مجموع بهای مستقیم: {formatToman(filteredCOGS + filteredLaborCost).text}
                </div>
              </div>
            </div>
          </div>

          {/* Visual Revenue Share Strip with Restored Colors */}
          <div className="p-4 rounded-2xl bg-[var(--bg-base)] bg-[var(--bg-base)] border border-[var(--border-subtle)] space-y-3">
            <div className="flex items-center justify-between text-xs font-extrabold text-[var(--text-primary)]">
              <span>تفکیک سهم هزینه‌های مستقیم از درآمد فروش:</span>
              <span className="text-[var(--text-secondary)] font-bold">{formatToman(filteredRevenue).text}</span>
            </div>

            {/* Segmented Progress Track with Clear Distinct Colors */}
            <div className="h-4 w-full rounded-full bg-[var(--bg-card)] dark:bg-[var(--bg-base)] flex overflow-hidden p-0.5 border border-[var(--border-subtle)]">
              {filteredRevenue > 0 ? (
                <>
                  <div
                    style={{ width: `${Math.min(100, filteredFoodCostPercent)}%` }}
                    className="h-full bg-amber-500 rounded-r-full transition-all shadow-xs"
                    title={`مواد اولیه: ${roundCurrency(filteredFoodCostPercent)}٪`}
                  />
                  <div
                    style={{ width: `${Math.min(Math.max(0, 100 - filteredFoodCostPercent), filteredLaborCostPercent)}%` }}
                    className="h-full bg-blue-500 transition-all shadow-xs"
                    title={`نیروی کار: ${roundCurrency(filteredLaborCostPercent)}٪`}
                  />
                  <div
                    style={{ width: `${Math.max(0, 100 - filteredPrimeCostPercent)}%` }}
                    className="h-full bg-emerald-500 rounded-l-full transition-all shadow-xs"
                    title={`مانده ناخالص باقیمانده: ${roundCurrency(Math.max(0, 100 - filteredPrimeCostPercent))}٪`}
                  />
                </>
              ) : (
                <div className="h-full w-full bg-[var(--border-functional)] dark:bg-[var(--border-functional)] rounded-full" />
              )}
            </div>

            {/* Visual Legend with Matching Colors */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 shadow-2xs" />
                <span className="font-bold text-[var(--text-secondary)]">مواد اولیه:</span>
                <span className="font-black text-amber-700 dark:text-amber-400">{toPersianDigits(roundCurrency(filteredFoodCostPercent))}٪</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 shadow-2xs" />
                <span className="font-bold text-[var(--text-secondary)]">نیروی کار:</span>
                <span className="font-black text-blue-700 dark:text-blue-400">{toPersianDigits(roundCurrency(filteredLaborCostPercent))}٪</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 shadow-2xs" />
                <span className="font-bold text-[var(--text-secondary)]">مانده ناخالص پس از بهای اولیه:</span>
                <span className="font-black text-emerald-700 dark:text-emerald-400">
                  {toPersianDigits(roundCurrency(Math.max(0, 100 - filteredPrimeCostPercent)))}٪
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Itemized PnL Financial Statement Card */}
      <Card className="border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] bg-white dark:bg-[var(--bg-card)]">
        <CardHeader className="border-b border-[var(--border-subtle)]/60 dark:border-[var(--border-subtle)] pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-[var(--brand-primary)]" />
              <CardTitle className="text-sm font-black text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                صورت‌حساب سود و زیان تفکیکی • {filterTitle}
              </CardTitle>
            </div>
            <span className="text-[11px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
              واحدهای محاسباتی: تومان
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-4 overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] dark:border-[var(--border-subtle)] font-extrabold text-[var(--text-secondary)] dark:text-[var(--text-secondary)] pb-2">
                <th className="py-2.5 px-3 text-right">عنوان ردیف صورت سود و زیان</th>
                <th className="py-2.5 px-3 text-center">نوع هزینه / درآمد</th>
                <th className="py-2.5 px-3 text-left">مبلغ کل (تومان)</th>
                <th className="py-2.5 px-3 text-center">نسبت به فروش</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] divide-[var(--border-subtle)]/60 font-medium">
              {/* Gross Sales */}
              <tr className="bg-emerald-50/40 dark:bg-emerald-950/20 font-black">
                <td className="py-3 px-3 text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--status-success-text)]"></span>
                  <span>۱. کل درآمد حاصل از فروش محصولات</span>
                </td>
                <td className="py-3 px-3 text-center text-[var(--status-success-text)] dark:text-[var(--status-success-text)]">درآمد عملیاتی</td>
                <td className="py-3 px-3 text-left font-black text-[var(--status-success-text)] dark:text-[var(--status-success-text)]">{formatToman(filteredRevenue).text}</td>
                <td className="py-3 px-3 text-center text-[var(--text-primary)] dark:text-[var(--text-secondary)]">۱۰۰٪</td>
              </tr>

              {/* COGS */}
              <tr>
                <td className="py-3 px-3 text-[var(--text-primary)] dark:text-[var(--text-secondary)] pr-7">
                  ۲. بهای تمام شده مواد اولیه مصرفی
                </td>
                <td className="py-3 px-3 text-center text-[var(--status-warning-text)] dark:text-[var(--status-warning-text)]">هزینه مستقیم</td>
                <td className="py-3 px-3 text-left font-bold text-[var(--status-warning-text)] dark:text-[var(--status-warning-text)]">
                  {formatToman(filteredCOGS).text}
                </td>
                <td className="py-3 px-3 text-center font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                  {toPersianDigits(roundCurrency(filteredFoodCostPercent))}٪
                </td>
              </tr>

              {/* Gross Profit Subtotal */}
              <tr className="bg-[var(--bg-base)] dark:bg-[var(--bg-card)] font-black border-t-2 border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
                <td className="py-3 px-3 text-[var(--text-primary)] dark:text-[var(--text-primary)]">سود ناخالص</td>
                <td className="py-3 px-3 text-center text-[var(--text-secondary)]">مرحله‌ای</td>
                <td className="py-3 px-3 text-left text-[var(--text-primary)] dark:text-[var(--text-primary)]">{filteredGrossProfitToman.text}</td>
                <td className="py-3 px-3 text-center text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                  {filteredRevenue > 0 ? toPersianDigits(roundCurrency((filteredGrossProfit / filteredRevenue) * 100)) : '۰'}٪
                </td>
              </tr>

              {/* Waste */}
              <tr>
                <td className="py-3 px-3 text-[var(--text-primary)] dark:text-[var(--text-secondary)] pr-7">
                  ۳. ضایعات ثبت‌شده انبار و خسارات تولید
                </td>
                <td className="py-3 px-3 text-center text-[var(--status-error-text)] dark:text-[var(--status-error-text)]">تلفات</td>
                <td className="py-3 px-3 text-left font-bold text-[var(--status-error-text)] dark:text-[var(--status-error-text)]">
                  ({formatToman(filteredTotalWaste).text})
                </td>
                <td className="py-3 px-3 text-center font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                  {filteredRevenue > 0 ? toPersianDigits(roundCurrency((filteredTotalWaste / filteredRevenue) * 100)) : '۰'}٪
                </td>
              </tr>

              {/* Pro-rated Overhead */}
              <tr>
                <td className="py-3 px-3 text-[var(--text-primary)] dark:text-[var(--text-secondary)] pr-7">
                  ۴. هزینه‌های ثابت و سربار عملیاتی (سهم {toPersianDigits(periodDaysCount)} روز)
                </td>
                <td className="py-3 px-3 text-center text-[var(--text-secondary)]">سربار ثابت</td>
                <td className="py-3 px-3 text-left font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                  ({formatToman(filteredPeriodOverhead).text})
                </td>
                <td className="py-3 px-3 text-center font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                  {filteredRevenue > 0 ? toPersianDigits(roundCurrency((filteredPeriodOverhead / filteredRevenue) * 100)) : '۰'}٪
                </td>
              </tr>

              {/* Final Net Profit */}
              <tr className={`font-black text-sm ${filteredNetProfitToman.isNegative ? 'bg-[var(--status-error-bg)] text-[var(--status-error-text)] dark:text-rose-300' : 'bg-emerald-50 dark:bg-emerald-950/40 text-[var(--status-success-text)] dark:text-emerald-300'} border-t-2 border-[var(--border-functional)] dark:border-[var(--border-functional)]`}>
                <td className="py-3.5 px-3">سود (یا زیان) خالص نهایی دوره</td>
                <td className="py-3.5 px-3 text-center">سود خالص</td>
                <td className="py-3.5 px-3 text-left font-black">{filteredNetProfitToman.text}</td>
                <td className="py-3.5 px-3 text-center font-black">{toPersianDigits(roundCurrency(filteredNetMarginPercent))}٪</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Break-Even Progress Bar (Fixed for current month as requested) */}
      <Card className="overflow-hidden border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] bg-white dark:bg-[var(--bg-card)]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-[var(--brand-primary)]" />
              <div>
                <CardTitle className="text-sm font-black text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                  پیشرفت پوشش نقطه سر‌به‌سر ماهانه
                </CardTitle>
                <p className="text-[11px] font-bold text-[var(--text-secondary)] mt-0.5">
                  شاخص انحصاری پایش هزینه‌های ثابت کل ماه جاری ({PERSIAN_MONTH_NAMES[todayJ.jm - 1]})
                </p>
              </div>
            </div>
            <Badge variant={breakEvenProgress >= 100 ? 'success' : 'warning'} className="font-extrabold px-3 py-1">
              {formatNumber(breakEvenProgress)}٪ پوشش هزینه
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <div className="h-3 w-full rounded-full bg-[var(--bg-base)] dark:bg-[var(--bg-card)] p-0.5 border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, breakEvenProgress)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full rounded-full ${
                breakEvenProgress >= 100 ? 'bg-[var(--status-success-text)]' : 'bg-[var(--brand-primary)]'
              }`}
            />
          </div>
          <div className="flex items-center justify-between text-xs font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            <span>درآمد واقعی کل ماه جاری: {formatToman(monthRevenue).text}</span>
            <span>تارگت سر به سر ماهانه: {formatToman(monthlyBreakEvenTarget).text}</span>
          </div>

          {/* Extended Helper Metrics: Remaining Days, Daily Target & Pacing */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[var(--border-subtle)]/80 dark:border-[var(--border-subtle)] mt-2">
            {/* Box 1: Days Remaining */}
            <div className="p-3 rounded-xl bg-[var(--bg-base)]/80 dark:bg-[var(--bg-card)] border border-[var(--border-subtle)]/80 dark:border-[var(--border-subtle)] flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-[var(--brand-primary)]" />
                <span className="text-xs font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">زمان‌بندی و روزهای باقی‌مانده</span>
              </div>
              <div className="text-sm font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] mt-1">
                {toPersianDigits(remainingWorkingDays)} روز کاری مانده
              </div>
              <p className="text-[11px] font-medium text-[var(--text-secondary)] dark:text-[var(--text-secondary)] mt-1">
                {toPersianDigits(remainingCalendarDays)} روز تقویمی تا پایان {currentMonthName} (روز {toPersianDigits(currentMonthDay)} از {toPersianDigits(totalDaysInMonth)})
              </p>
            </div>

            {/* Box 2: Required Daily Sales Target */}
            <div className="p-3 rounded-xl bg-[var(--bg-base)]/80 dark:bg-[var(--bg-card)] border border-[var(--border-subtle)]/80 dark:border-[var(--border-subtle)] flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-[var(--brand-primary)]" />
                <span className="text-xs font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">تارگت فروش روزانه (سر به سر)</span>
              </div>
              <div className="text-sm font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] mt-1">
                {remainingRevenueNeeded <= 0 ? (
                  <span className="text-[var(--status-success-text)] dark:text-[var(--status-success-text)]">سر به سر محقق شد 🎉</span>
                ) : remainingWorkingDays > 0 ? (
                  `${formatToman(dailyRequiredRevenue).text} / روز`
                ) : (
                  formatToman(remainingRevenueNeeded).text
                )}
              </div>
              <p className="text-[11px] font-medium text-[var(--text-secondary)] dark:text-[var(--text-secondary)] mt-1">
                {remainingRevenueNeeded <= 0
                  ? 'تمامی هزینه‌های ثابت ماه پوشش داده شده است'
                  : `مانده کل تا سر به سر: ${formatToman(remainingRevenueNeeded).text}`}
              </p>
            </div>

            {/* Box 3: Pacing Projection */}
            <div className="p-3 rounded-xl bg-[var(--bg-base)]/80 dark:bg-[var(--bg-card)] border border-[var(--border-subtle)]/80 dark:border-[var(--border-subtle)] flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-1">
                {breakEvenProgress >= 100 ? (
                  <CheckCircle2 className="h-4 w-4 text-[var(--status-success-text)]" />
                ) : projectedPercentage >= 100 ? (
                  <TrendingUp className="h-4 w-4 text-[var(--status-success-text)]" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-[var(--status-warning-text)]" />
                )}
                <span className="text-xs font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">پیش‌بینی سرعت فروش</span>
              </div>
              <div className="text-sm font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] mt-1 flex items-center gap-1.5">
                {breakEvenProgress >= 100 ? (
                  <span className="text-[var(--status-success-text)] dark:text-[var(--status-success-text)]">عبور از نقطه سر به سر</span>
                ) : projectedPercentage >= 100 ? (
                  <span className="text-[var(--status-success-text)] dark:text-[var(--status-success-text)]">در مسیر تحقق ۱۰۰٪</span>
                ) : (
                  <span className="text-[var(--status-warning-text)] dark:text-[var(--status-warning-text)]">نیازمند افزایش فروش</span>
                )}
              </div>
              <p className="text-[11px] font-medium text-[var(--text-secondary)] dark:text-[var(--text-secondary)] mt-1">
                میانگین فروش روزانه: {formatToman(Math.round(averageDailyRevenue)).text}/روز
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue & Cost Trend Charts */}
      {chartData.length > 0 && (
        <Card className="border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] bg-white dark:bg-[var(--bg-card)]">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-subtle)]/60 dark:border-[var(--border-subtle)] pb-4">
            <div>
              <CardTitle className="text-sm font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
                <PieChart className="h-4 w-4 text-[var(--brand-primary)]" />
                روند مقایسه‌ای فروش، بهای تمام شده و سود ({filterTitle})
              </CardTitle>
              <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-medium mt-0.5">
                نمودار تحلیلی عملکرد مالی بر اساس روزهای ثبت‌شده در بازه انتخابی
              </p>
            </div>
            <div className="flex items-center gap-1 bg-[var(--bg-base)] p-1 rounded-xl border border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setChartType('area')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  chartType === 'area'
                    ? 'bg-[var(--brand-primary)] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                مساحتی
              </button>
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  chartType === 'bar'
                    ? 'bg-[var(--brand-primary)] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                میله‌ای
              </button>
            </div>
          </CardHeader>
          <CardContent className="pt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--status-success-text)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--status-success-text)" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--brand-primary)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--brand-primary)" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--status-info-text)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--status-info-text)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--border-subtle)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fontWeight: 'bold', fill: 'var(--text-secondary)' }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--border-subtle)' }}
                  />
                  <YAxis
                    tickFormatter={(v) => (v === 0 ? '۰' : `${formatNumber(roundCurrency(v / 1000))} هزار`)}
                    tick={{ fontSize: 11, fontWeight: 'bold', fill: 'var(--text-secondary)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomPnLTooltip />} />
                  <Legend
                    wrapperStyle={{ paddingTop: '12px', fontSize: '12px', fontWeight: 'bold' }}
                    formatter={(value) => <span className="text-[var(--text-secondary)] font-bold mx-1">{value}</span>}
                  />
                  <Area
                    type="monotone"
                    dataKey="درآمد کل"
                    stroke="var(--status-success-text)"
                    fillOpacity={1}
                    fill="url(#colorRev)"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: 'var(--status-success-text)' }}
                    activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="بهای تمام شده"
                    stroke="var(--brand-primary)"
                    fillOpacity={1}
                    fill="url(#colorCost)"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: 'var(--brand-primary)' }}
                    activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="سود ناخالص"
                    stroke="var(--status-info-text)"
                    fillOpacity={1}
                    fill="url(#colorProfit)"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3, fill: 'var(--status-info-text)' }}
                  />
                </AreaChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--border-subtle)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fontWeight: 'bold', fill: 'var(--text-secondary)' }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--border-subtle)' }}
                  />
                  <YAxis
                    tickFormatter={(v) => (v === 0 ? '۰' : `${formatNumber(roundCurrency(v / 1000))} هزار`)}
                    tick={{ fontSize: 11, fontWeight: 'bold', fill: 'var(--text-secondary)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomPnLTooltip />} />
                  <Legend
                    wrapperStyle={{ paddingTop: '12px', fontSize: '12px', fontWeight: 'bold' }}
                    formatter={(value) => <span className="text-[var(--text-secondary)] font-bold mx-1">{value}</span>}
                  />
                  <Bar dataKey="درآمد کل" fill="var(--status-success-text)" radius={[6, 6, 0, 0]} maxBarSize={20} />
                  <Bar dataKey="بهای تمام شده" fill="var(--brand-primary)" radius={[6, 6, 0, 0]} maxBarSize={20} />
                  <Bar dataKey="سود ناخالص" fill="var(--status-info-text)" radius={[6, 6, 0, 0]} maxBarSize={20} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top Performing Items & Waste Logs in Filtered Period */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Sold Items */}
        <Card className="border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] bg-white dark:bg-[var(--bg-card)] flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3 border-b border-[var(--border-subtle)] dark:border-[var(--border-subtle)] flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
                <Utensils className="h-4 w-4 text-[var(--status-success-text)]" />
                پرفروش‌ترین آیتم‌های منو ({filterTitle})
              </CardTitle>
              {allSoldItemsInPeriod.length > 0 && (
                <button
                  type="button"
                  id="open-all-top-sold-header-btn"
                  onClick={() => setIsTopSoldModalOpen(true)}
                  className="text-[11px] font-bold text-[var(--brand-primary)] hover:text-[var(--brand-primary)]/80 hover:bg-[var(--bg-base)] px-2 py-1 rounded-lg flex items-center gap-0.5 transition-colors cursor-pointer"
                >
                  <span>گزارش کامل ({toPersianDigits(allSoldItemsInPeriod.length)})</span>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
              )}
            </CardHeader>
            <CardContent className="pt-3">
              {topSoldItemsInPeriod.length === 0 ? (
                <div className="text-center py-6 text-xs text-[var(--text-secondary)] font-bold">
                  هیچ فروشی در این بازه زمانی ثبت نشده است.
                </div>
              ) : (
                <div className="space-y-2">
                  {topSoldItemsInPeriod.map((item, idx) => {
                    const profit = item.totalRev - item.totalCost;
                    return (
                      <div
                        key={item.menuItemId}
                        className="p-2.5 rounded-xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] flex items-center justify-between text-xs hover:border-[var(--border-functional)] transition-all cursor-pointer"
                        onClick={() => setIsTopSoldModalOpen(true)}
                        title="برای مشاهده جزئیات کلیک کنید"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[var(--bg-card)] dark:bg-[var(--bg-base)] text-[var(--text-primary)] dark:text-[var(--text-secondary)] font-black text-[10px] flex items-center justify-center shrink-0">
                            {toPersianDigits(idx + 1)}
                          </span>
                          <div>
                            <div className="font-extrabold text-[var(--text-primary)] dark:text-[var(--text-primary)]">{item.name}</div>
                            <div className="text-[10px] text-[var(--text-secondary)]">
                              فروش: {toPersianDigits(item.totalQty)} عدد | درآمد: {formatToman(item.totalRev).text}
                            </div>
                          </div>
                        </div>
                        <div className="text-left shrink-0">
                          <div className="font-black text-[var(--status-success-text)] dark:text-[var(--status-success-text)]">
                            {formatToman(profit).text}
                          </div>
                          <div className="text-[10px] text-[var(--text-secondary)] font-bold">سود ناخالص</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </div>

          {allSoldItemsInPeriod.length > 4 && (
            <div className="p-3 pt-0">
              <Button
                variant="outline"
                size="sm"
                id="open-all-top-sold-footer-btn"
                onClick={() => setIsTopSoldModalOpen(true)}
                className="w-full h-8 text-xs font-black text-[var(--brand-primary)] bg-[var(--bg-base)] hover:bg-[var(--bg-card)]/60 dark:hover:bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              >
                <span>مشاهده گزارش و لیست کامل ({toPersianDigits(allSoldItemsInPeriod.length)} آیتم)</span>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </Card>

        {/* Waste Logs Summary */}
        <Card className="border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] bg-white dark:bg-[var(--bg-card)] flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3 border-b border-[var(--border-subtle)] dark:border-[var(--border-subtle)] flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-[var(--brand-primary)]" />
                خلاصه ضایعات ثبت‌شده ({filterTitle})
              </CardTitle>
              {filteredWasteLogs.length > 0 && (
                <button
                  type="button"
                  id="open-all-waste-logs-header-btn"
                  onClick={() => setIsWasteLogsModalOpen(true)}
                  className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 px-2 py-1 rounded-lg flex items-center gap-0.5 transition-colors cursor-pointer"
                >
                  <span>گزارش کامل ({toPersianDigits(filteredWasteLogs.length)})</span>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
              )}
            </CardHeader>
            <CardContent className="pt-3">
              {filteredWasteLogs.length === 0 ? (
                <div className="text-center py-6 text-xs text-[var(--text-secondary)] font-bold">
                  هیچ ضایعاتی در این بازه زمانی ثبت نشده است.
                </div>
              ) : (
                <div className="space-y-2">
                  {topWasteLogsInPeriod.map((log, idx) => (
                    <div
                      key={log.id || idx}
                      className="p-2.5 rounded-xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] flex items-center justify-between text-xs hover:border-rose-300 dark:hover:border-rose-800 transition-all cursor-pointer"
                      onClick={() => setIsWasteLogsModalOpen(true)}
                      title="برای مشاهده جزئیات کلیک کنید"
                    >
                      <div>
                        <div className="font-extrabold text-[var(--text-primary)] dark:text-[var(--text-primary)]">{log.itemName}</div>
                        <div className="text-[10px] text-[var(--text-secondary)]">
                          مقدار: {formatNumber(log.quantity)} {log.unit} • علت: {log.reason || 'نامشخص'}
                        </div>
                      </div>
                      <div className="text-left shrink-0">
                        <div className="font-black text-[var(--status-error-text)] dark:text-[var(--status-error-text)]">
                          {formatToman(log.cost).text}
                        </div>
                        <div className="text-[10px] text-[var(--text-secondary)] font-bold">خسارت مالی</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </div>

          {filteredWasteLogs.length > 4 && (
            <div className="p-3 pt-0">
              <Button
                variant="outline"
                size="sm"
                id="open-all-waste-logs-footer-btn"
                onClick={() => setIsWasteLogsModalOpen(true)}
                className="w-full h-8 text-xs font-black text-rose-700 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100/60 dark:hover:bg-rose-900/40 border border-rose-200/60 dark:border-rose-900/40 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              >
                <span>مشاهده تمام ضایعات و خسارات ({toPersianDigits(filteredWasteLogs.length)} مورد)</span>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </Card>
      </div>
        </motion.div>
      </AnimatePresence>

      {/* Full Top Sold Items Modal */}
      <TopSoldItemsModal
        isOpen={isTopSoldModalOpen}
        onClose={() => setIsTopSoldModalOpen(false)}
        filterTitle={filterTitle}
        filterSubtitle={filterSubtitle}
        items={allSoldItemsInPeriod}
      />

      {/* Full Waste Logs Detail Modal */}
      <WasteLogsDetailModal
        isOpen={isWasteLogsModalOpen}
        onClose={() => setIsWasteLogsModalOpen(false)}
        filterTitle={filterTitle}
        filterSubtitle={filterSubtitle}
        wasteLogs={filteredWasteLogs}
      />

      {/* KPI Detail Drilldown Modal */}
      <KPIDetailModal
        isOpen={activeKpiModal !== null}
        onClose={() => setActiveKpiModal(null)}
        metricType={activeKpiModal}
        filterTitle={filterTitle}
        filterSubtitle={filterSubtitle}
        periodDaysCount={periodDaysCount}
        salesRecords={filteredSalesRecords}
        wasteLogs={filteredWasteLogs}
        fixedCosts={fixedCosts}
        menuItems={menuItems}
        workingDays={workingDays}
        revenue={filteredRevenue}
        cogs={filteredCOGS}
        periodOverhead={filteredPeriodOverhead}
        totalWaste={filteredTotalWaste}
        grossProfit={filteredGrossProfit}
        netProfit={filteredNetProfit}
        foodCostPercent={filteredFoodCostPercent}
        netMarginPercent={filteredNetMarginPercent}
      />

      {/* Official PDF Export Modal */}
      <PnLReportExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        settings={settings}
        filterTitle={filterTitle}
        filterSubtitle={filterSubtitle}
        filteredSalesRecords={filteredSalesRecords}
        filteredWasteLogs={filteredWasteLogs}
        metrics={{
          totalRevenue: filteredRevenue,
          totalCOGS: filteredCOGS,
          totalLaborCost: filteredLaborCost,
          loggedWaste: filteredLoggedWaste,
          salesWaste: filteredSalesWaste,
          totalWaste: filteredTotalWaste,
          periodOverhead: filteredPeriodOverhead,
          grossProfit: filteredGrossProfit,
          netProfit: filteredNetProfit,
          foodCostPercent: filteredFoodCostPercent,
          laborCostPercent: filteredLaborCostPercent,
          primeCostPercent: filteredPrimeCostPercent,
          netMarginPercent: filteredNetMarginPercent,
          periodDaysCount,
        }}
        topSoldItems={topSoldItemsInPeriod}
      />
    </div>
  );
};

const CustomPnLTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] rounded-2xl p-3.5 shadow-xl dir-rtl text-right min-w-[200px]">
        <div className="text-xs font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] pb-2 mb-2 border-b border-[#F4F0EB] dark:border-[var(--border-subtle)] flex items-center justify-between">
          <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">تاریخ:</span>
          <span className="font-bold text-[var(--brand-primary)]">{toPersianDigits(label)}</span>
        </div>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between text-xs gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                <span className="font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">{entry.name}:</span>
              </div>
              <span className="font-black text-[var(--text-primary)] dark:text-[var(--text-primary)]">{formatToman(Number(entry.value)).text}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};
