import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TrendingUp,
  Calendar,
  Sparkles,
  ShoppingBag,
  ArrowUpRight,
  Sliders,
  DollarSign,
  PieChart,
  CheckCircle2,
  Info,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import type { DailySalesRecord, MenuItem } from '../../types';
import { formatToman, formatNumber, roundCurrency, toPersianDigits } from '../../lib/utils';
import { isDateInPresetFilter } from '../../lib/financial';
import { tablePageVariants, tableRowVariants } from '../../lib/motion';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Pagination } from '../ui/Pagination';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

interface SalesForecastSectionProps {
  salesRecords: DailySalesRecord[];
  menuItems: MenuItem[];
}

type ScenarioKey = 'baseline' | 'optimistic' | 'peak' | 'conservative';

const SCENARIOS: { key: ScenarioKey; label: string; multiplier: number; description: string; badgeColor: string }[] = [
  {
    key: 'baseline',
    label: 'عادی (۱۰۰٪)',
    multiplier: 1.0,
    description: 'بر اساس میانگین واقعی فروش روزهای گذشته',
    badgeColor: 'bg-[var(--bg-base)] text-[var(--text-primary)] border-[var(--border-subtle)] dark:bg-[var(--bg-card)] dark:text-[var(--text-primary)] dark:border-[var(--border-functional)]',
  },
  {
    key: 'optimistic',
    label: 'رشد (+۱۰٪)',
    multiplier: 1.1,
    description: 'پیش‌بینی با فرض موفقیت کمپین بازاریابی',
    badgeColor: 'bg-emerald-50 text-[var(--status-success-text)] border-[var(--status-success-text)]/30 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-[var(--status-success-text)]/30',
  },
  {
    key: 'peak',
    label: 'پیک شلوغی (+۲۰٪)',
    multiplier: 1.2,
    description: 'مناسبت‌ها، ایام تعطیل و روزهای پرمشتری',
    badgeColor: 'bg-amber-50 text-[var(--status-warning-text)] border-[var(--status-warning-text)]/30 dark:bg-amber-950/50 dark:text-[var(--status-warning-text)] dark:border-[var(--status-warning-text)]/30',
  },
  {
    key: 'conservative',
    label: 'محافظه‌کارانه (\u200E-۱۰٪)',
    multiplier: 0.9,
    description: 'روزهای خلوت یا شرایط نامساعد جوی/کسب‌وکار',
    badgeColor: 'bg-rose-50 text-[var(--status-error-text)] border-[var(--status-error-text)]/30 dark:bg-rose-950/50 dark:text-rose-300 dark:border-[var(--status-error-text)]/30',
  },
];

export const SalesForecastSection: React.FC<SalesForecastSectionProps> = ({
  salesRecords,
  menuItems,
}) => {
  const [selectedScenario, setSelectedScenario] = useState<ScenarioKey>('baseline');
  const [forecastWeeks, setForecastWeeks] = useState<number>(4);
  const [currentPage, setCurrentPage] = useState(1);
  const [direction, setDirection] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(6);
  const [sortField, setSortField] = useState<string>('forecastRevenue');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handlePageChange = (newPage: number, dir: number) => {
    setDirection(dir);
    setCurrentPage(newPage);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const renderSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 opacity-40 group-hover:opacity-100 transition-opacity" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-[var(--brand-primary)]" />
    ) : (
      <ArrowDown className="h-3 w-3 text-[var(--brand-primary)]" />
    );
  };

  const scenarioObj = SCENARIOS.find((s) => s.key === selectedScenario) || SCENARIOS[0];
  const scenarioMultiplier = scenarioObj.multiplier;

  // 1. Calculate historical metrics with weighted daily averages (70% last 30 days, 30% older history)
  const totalSalesDays = salesRecords.length;
  const isDataDriven = totalSalesDays > 0;

  // Daily average run rates
  let avgDailyRevenue = 0;
  let avgDailyCOGS = 0;
  let avgDailyProfit = 0;

  if (isDataDriven) {
    const recentRecords = salesRecords.filter((r) => isDateInPresetFilter(r.date, 'last30'));
    const olderRecords = salesRecords.filter((r) => !isDateInPresetFilter(r.date, 'last30'));

    const sumRecords = (recs: DailySalesRecord[]) => {
      const rev = recs.reduce((acc, r) => acc + (r.totalRevenue || 0), 0);
      const cogs = recs.reduce((acc, r) => acc + (r.totalCOGS || 0), 0);
      const profit = recs.reduce((acc, r) => acc + (r.netProfit || 0), 0);
      return { rev, cogs, profit };
    };

    if (recentRecords.length > 0 && olderRecords.length > 0) {
      const recentSum = sumRecords(recentRecords);
      const olderSum = sumRecords(olderRecords);

      const recentAvg = {
        rev: recentSum.rev / recentRecords.length,
        cogs: recentSum.cogs / recentRecords.length,
        profit: recentSum.profit / recentRecords.length,
      };
      const olderAvg = {
        rev: olderSum.rev / olderRecords.length,
        cogs: olderSum.cogs / olderRecords.length,
        profit: olderSum.profit / olderRecords.length,
      };

      // 70% weight for last 30 days, 30% weight for older history
      avgDailyRevenue = 0.7 * recentAvg.rev + 0.3 * olderAvg.rev;
      avgDailyCOGS = 0.7 * recentAvg.cogs + 0.3 * olderAvg.cogs;
      avgDailyProfit = 0.7 * recentAvg.profit + 0.3 * olderAvg.profit;
    } else {
      const totalRev = salesRecords.reduce((acc, r) => acc + (r.totalRevenue || 0), 0);
      const totalCOGS = salesRecords.reduce((acc, r) => acc + (r.totalCOGS || 0), 0);
      const totalProfit = salesRecords.reduce((acc, r) => acc + (r.netProfit || 0), 0);

      avgDailyRevenue = totalRev / totalSalesDays;
      avgDailyCOGS = totalCOGS / totalSalesDays;
      avgDailyProfit = totalProfit / totalSalesDays;
    }
  } else {
    // Fallback based on estimated menu items volume if no daily sales recorded yet
    const estimatedMonthlyRevenue = menuItems.reduce(
      (acc, item) => acc + (item.sellingPrice || 0) * (item.salesVolume30Days || 30),
      0
    );
    const estimatedMonthlyCOGS = menuItems.reduce(
      (acc, item) => acc + (item.primeCost || 0) * (item.salesVolume30Days || 30),
      0
    );
    avgDailyRevenue = estimatedMonthlyRevenue / 30;
    avgDailyCOGS = estimatedMonthlyCOGS / 30;
    avgDailyProfit = (estimatedMonthlyRevenue - estimatedMonthlyCOGS) / 30;
  }

  // 2. Weekly Projections
  const weeklyProjections = Array.from({ length: forecastWeeks }).map((_, index) => {
    const weekNum = index + 1;
    // Slight organic trend factor for future weeks (1.0, 1.015, 1.03, 1.045)
    const organicFactor = 1 + index * 0.015;
    const weeklyRevenue = roundCurrency(7 * avgDailyRevenue * scenarioMultiplier * organicFactor);
    const weeklyCOGS = roundCurrency(7 * avgDailyCOGS * scenarioMultiplier * organicFactor);
    const weeklyProfit = roundCurrency(7 * avgDailyProfit * scenarioMultiplier * organicFactor);

    return {
      weekLabel: `هفته ${toPersianDigits(weekNum)}`,
      weekNum,
      'درآمد پیش‌بینی‌شده': weeklyRevenue,
      'بهای تمام‌شده': weeklyCOGS,
      'سود خالص پیش‌بینی‌شده': weeklyProfit,
    };
  });

  const projectedTotalRevenue = weeklyProjections.reduce((acc, w) => acc + w['درآمد پیش‌بینی‌شده'], 0);
  const projectedTotalCOGS = weeklyProjections.reduce((acc, w) => acc + w['بهای تمام‌شده'], 0);
  const projectedTotalProfit = weeklyProjections.reduce((acc, w) => acc + w['سود خالص پیش‌بینی‌شده'], 0);

  // 3. Item level run-rate forecasting
  const itemRunRateMap = new Map<number, { name: string; category: string; avgDailyQty: number; unitPrice: number; unitCost: number }>();

  menuItems.forEach((m) => {
    if (m.id) {
      itemRunRateMap.set(m.id, {
        name: m.name,
        category: m.category || 'سایر',
        avgDailyQty: (m.salesVolume30Days || 30) / 30,
        unitPrice: m.sellingPrice || 0,
        unitCost: m.primeCost || 0,
      });
    }
  });

  if (isDataDriven) {
    const itemTotals = new Map<number, { qty: number; name: string; category: string; price: number; cost: number }>();
    salesRecords.forEach((record) => {
      record.items?.forEach((item) => {
        const existing = itemTotals.get(item.menuItemId) || {
          qty: 0,
          name: item.menuItemName,
          category: menuItems.find((m) => m.id === item.menuItemId)?.category || 'سایر',
          price: item.unitSellingPrice,
          cost: item.unitCost,
        };
        existing.qty += item.quantity;
        itemTotals.set(item.menuItemId, existing);
      });
    });

    itemTotals.forEach((data, id) => {
      itemRunRateMap.set(id, {
        name: data.name,
        category: data.category,
        avgDailyQty: data.qty / totalSalesDays,
        unitPrice: data.price,
        unitCost: data.cost,
      });
    });
  }

  const forecastDays = forecastWeeks * 7;
  const itemForecastList = Array.from(itemRunRateMap.entries())
    .map(([id, info]) => {
      const forecastQty = Math.round(info.avgDailyQty * forecastDays * scenarioMultiplier);
      const forecastRevenue = roundCurrency(forecastQty * info.unitPrice);
      const forecastCost = roundCurrency(forecastQty * info.unitCost);
      const forecastProfit = roundCurrency(forecastRevenue - forecastCost);

      return {
        id,
        name: info.name,
        category: info.category,
        forecastQty,
        forecastRevenue,
        forecastProfit,
        unitPrice: info.unitPrice,
      };
    })
    .sort((a, b) => {
      let valA: any = a[sortField as keyof typeof a];
      let valB: any = b[sortField as keyof typeof b];

      if (sortField === 'share') {
        valA = a.forecastRevenue;
        valB = b.forecastRevenue;
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc'
          ? valA.localeCompare(valB, 'fa')
          : valB.localeCompare(valA, 'fa');
      }

      const numA = Number(valA ?? 0);
      const numB = Number(valB ?? 0);
      return sortDirection === 'asc' ? numA - numB : numB - numA;
    });

  const totalProjectedPortions = itemForecastList.reduce((acc, i) => acc + i.forecastQty, 0);
  const topForecastItem = itemForecastList[0];

  const totalPages = Math.max(1, Math.ceil(itemForecastList.length / itemsPerPage));
  const validPage = Math.min(currentPage, totalPages);

  const paginatedForecastItems = useMemo(() => {
    const start = (validPage - 1) * itemsPerPage;
    return itemForecastList.slice(start, start + itemsPerPage);
  }, [itemForecastList, validPage, itemsPerPage]);

  return (
    <Card className="border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] transition-all overflow-hidden">
      <CardHeader className="border-b border-[var(--border-subtle)]/60 dark:border-[var(--border-subtle)] pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant="outline"
                className={`text-[11px] font-bold px-2.5 py-0.5 border ${scenarioObj.badgeColor}`}
              >
                <Sparkles className="h-3 w-3 inline ml-1 text-[var(--status-warning-text)]" />
                پیوست الگوریتم پیش‌بینی هوشمند
              </Badge>
              <Badge variant="outline" className="text-[11px] font-bold px-2.5 py-0.5 bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border-[var(--border-subtle)] dark:border-[var(--border-subtle)] text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                {isDataDriven
                  ? `بر اساس ${formatNumber(totalSalesDays)} روز ثبت واقعی`
                  : 'بر اساس حجم فروش تخمینی منو'}
              </Badge>
            </div>
            <CardTitle className="text-base font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[var(--brand-primary)]" />
              پیش‌بینی فروش و درآمد هفته‌های آینده
            </CardTitle>
            <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-medium mt-0.5">
              تحلیل و برآورد روند فروش، سود و حجم آماده‌سازی منو برای هفته‌های پیش‌رو
            </p>
          </div>

          {/* Scenario Selector Controls */}
          <div className="flex flex-wrap items-center gap-2 bg-[var(--bg-base)] dark:bg-[var(--bg-card)] p-1.5 rounded-2xl border border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
            {SCENARIOS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => {
                  setSelectedScenario(s.key);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  selectedScenario === s.key
                    ? 'bg-[var(--brand-primary)] text-white shadow-xs font-black'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Top 4 Summary Cards for the selected timeframe */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] space-y-1">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)] flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-[var(--status-success-text)] dark:text-[var(--status-success-text)]" />
              پیش‌بینی درآمد کل ({toPersianDigits(forecastWeeks)} هفته)
            </span>
            <div className="text-lg font-black text-[var(--status-success-text)] dark:text-[var(--status-success-text)] tracking-tight">
              {formatToman(projectedTotalRevenue).text}
            </div>
            <p className="text-[10px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-medium">
              میانگین روزانه: {formatToman(roundCurrency(projectedTotalRevenue / forecastDays)).text}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] space-y-1">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)] flex items-center gap-1.5">
              <PieChart className="h-3.5 w-3.5 text-[var(--status-error-text)] dark:text-[var(--status-error-text)]" />
              بهای تمام‌شده تخمینی (COGS)
            </span>
            <div className="text-lg font-black text-[var(--status-error-text)] dark:text-[var(--status-error-text)] tracking-tight">
              {formatToman(projectedTotalCOGS).text}
            </div>
            <p className="text-[10px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-medium">
              نسبت هزینه مواد اولیه: {projectedTotalRevenue > 0 ? formatNumber(roundCurrency((projectedTotalCOGS / projectedTotalRevenue) * 100)) : '۰'}٪
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] space-y-1">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)] flex items-center gap-1.5">
              <ArrowUpRight className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              سود ناخالص پیش‌بینی‌شده
            </span>
            <div className="text-lg font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] tracking-tight">
              {formatToman(projectedTotalProfit).text}
            </div>
            <p className="text-[10px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-medium">
              حاشیه سود تخمینی: {projectedTotalRevenue > 0 ? formatNumber(roundCurrency((projectedTotalProfit / projectedTotalRevenue) * 100)) : '۰'}٪
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] space-y-1">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)] flex items-center gap-1.5">
              <ShoppingBag className="h-3.5 w-3.5 text-[var(--status-warning-text)] dark:text-[var(--status-warning-text)]" />
              حجم آماده‌سازی (تعداد کل پرس)
            </span>
            <div className="text-lg font-black text-[var(--status-warning-text)] dark:text-[var(--status-warning-text)] tracking-tight">
              {formatNumber(totalProjectedPortions)} پرس
            </div>
            <p className="text-[10px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-medium">
              میانگین روزانه: {formatNumber(Math.round(totalProjectedPortions / forecastDays))} پرس در روز
            </p>
          </div>
        </div>

        {/* Weekly Trend Forecast Chart */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-extrabold text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[var(--brand-primary)]" />
              نمودار پیش‌بینی تفکیکی هفته به هفته
            </h4>
            <div className="flex items-center gap-1.5">
              {[2, 3, 4, 6].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => {
                    setForecastWeeks(w);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    forecastWeeks === w
                      ? 'bg-[var(--brand-primary)] text-white shadow-2xs'
                      : 'bg-[var(--bg-base)] dark:bg-[var(--bg-card)] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] hover:bg-stone-200'
                  }`}
                >
                  {toPersianDigits(w)} هفته
                </button>
              ))}
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyProjections} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--status-success-text)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--status-success-text)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorProf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--brand-primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--brand-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--border-subtle)" />
                <XAxis
                  dataKey="weekLabel"
                  tick={{ fontSize: 11, fontWeight: 'bold', fill: '#78716C' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border-subtle)' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fontWeight: 'bold', fill: '#78716C' }}
                  tickFormatter={(v) => (v === 0 ? '۰' : `${formatNumber(roundCurrency(v / 1000000))}M`)}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomForecastTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: '12px', fontSize: '12px', fontWeight: 'bold' }}
                  formatter={(value) => <span className="text-[var(--text-primary)] dark:text-[var(--text-secondary)] font-bold mx-1">{value}</span>}
                />
                <Area
                  type="monotone"
                  dataKey="درآمد پیش‌بینی‌شده"
                  stroke="var(--status-success-text)"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorRev)"
                />
                <Area
                  type="monotone"
                  dataKey="سود خالص پیش‌بینی‌شده"
                  stroke="var(--brand-primary)"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorProf)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Forecasted Items Breakdown Table */}
        <div className="pt-2 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-[var(--status-success-text)]" />
              پیش‌بینی فروش به تفکیک پرفروش‌ترین آیتم‌های منو
            </h4>
            <span className="text-[11px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-bold">
              تعداد آماده‌سازی برای {toPersianDigits(forecastDays)} روز آینده
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
            <table className="w-full text-right text-xs">
              <thead className="bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border-b border-[var(--border-subtle)] dark:border-[var(--border-subtle)] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-extrabold select-none">
                <tr>
                  <th
                    onClick={() => handleSort('name')}
                    className="p-3 cursor-pointer hover:text-[var(--text-primary)] hover:text-[var(--text-primary)] group transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>نام محصول</span>
                      {renderSortIcon('name')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('category')}
                    className="p-3 cursor-pointer hover:text-[var(--text-primary)] hover:text-[var(--text-primary)] group transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>دسته‌بندی</span>
                      {renderSortIcon('category')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('forecastQty')}
                    className="p-3 text-center cursor-pointer hover:text-[var(--text-primary)] hover:text-[var(--text-primary)] group transition-colors"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>تعداد تخمینی فروش</span>
                      {renderSortIcon('forecastQty')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('forecastRevenue')}
                    className="p-3 cursor-pointer hover:text-[var(--text-primary)] hover:text-[var(--text-primary)] group transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>پیش‌بینی درآمد</span>
                      {renderSortIcon('forecastRevenue')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('forecastProfit')}
                    className="p-3 cursor-pointer hover:text-[var(--text-primary)] hover:text-[var(--text-primary)] group transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>پیش‌بینی سود ناخالص</span>
                      {renderSortIcon('forecastProfit')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('share')}
                    className="p-3 text-left cursor-pointer hover:text-[var(--text-primary)] hover:text-[var(--text-primary)] group transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>سهم از درآمد</span>
                      {renderSortIcon('share')}
                    </div>
                  </th>
                </tr>
              </thead>
              <AnimatePresence mode="wait" custom={direction}>
                <motion.tbody
                  key={validPage}
                  custom={direction}
                  variants={tablePageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="divide-y divide-[var(--border-subtle)]/60 divide-[var(--border-subtle)]/60 font-medium"
                >
                  {itemForecastList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-[var(--text-secondary)]">
                        هیچ آیتمی در منو یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    paginatedForecastItems.map((item) => {
                      const sharePercent =
                        projectedTotalRevenue > 0
                          ? Math.min(100, Math.round((item.forecastRevenue / projectedTotalRevenue) * 100))
                          : 0;

                      return (
                        <motion.tr
                          key={item.id}
                          variants={tableRowVariants}
                          className="hover:bg-[var(--bg-base)]/80 hover:bg-[var(--bg-base)] transition-colors"
                        >
                          <td className="p-3 font-extrabold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                            {item.name}
                          </td>
                          <td className="p-3 text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                            {item.category}
                          </td>
                          <td className="p-3 text-center font-black text-[var(--status-warning-text)] dark:text-[var(--status-warning-text)]">
                            {formatNumber(item.forecastQty)} پرس
                          </td>
                          <td className="p-3 font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                            {formatToman(item.forecastRevenue).text}
                          </td>
                          <td className="p-3 font-bold text-[var(--status-success-text)] dark:text-[var(--status-success-text)]">
                            {formatToman(item.forecastProfit).text}
                          </td>
                          <td className="p-3 text-left">
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-[11px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)] min-w-[32px] text-left">
                                {toPersianDigits(sharePercent)}٪
                              </span>
                              <div className="w-16 bg-[var(--bg-base)] dark:bg-[var(--bg-card)] h-2 rounded-full overflow-hidden">
                                <div
                                  className="bg-[var(--status-success-text)] dark:bg-emerald-500 h-full rounded-full transition-all duration-300"
                                  style={{ width: `${sharePercent}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })
                  )}
                </motion.tbody>
              </AnimatePresence>
            </table>
          </div>

          <Pagination
            currentPage={validPage}
            totalPages={totalPages}
            totalItems={itemForecastList.length}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={(newSize) => {
              setItemsPerPage(newSize);
              setCurrentPage(1);
            }}
            itemsPerPageOptions={[5, 8, 10, 12, 15]}
            itemLabel="پیش‌بینی محصول"
          />
        </div>

        {/* Operational Insight Tip Banner */}
        <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-[var(--status-warning-text)] dark:text-[var(--status-warning-text)] shrink-0 mt-0.5" />
          <div className="text-xs text-[var(--text-primary)] dark:text-[var(--text-secondary)] leading-relaxed space-y-1">
            <p className="font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
              توصیه هوشمند مدیریت سفارشات و انبار ({toPersianDigits(forecastWeeks)} هفته آینده):
            </p>
            <p>
              بر اساس سناریوی «{scenarioObj.label}»، محبوب‌ترین محصول پیش‌بینی‌شده{' '}
              <strong className="text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                «{topForecastItem?.name || 'محصول اصلی'}»
              </strong>{' '}
              با حدود <strong className="text-[var(--status-warning-text)] dark:text-[var(--status-warning-text)]">{formatNumber(topForecastItem?.forecastQty || 0)} پرس</strong> سفارش است. قبل از شروع هفته، موجودی مواد اولیه مرتبط در بخش مدیریت انبار چک و خریدهای اولیه انجام شود.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const CustomForecastTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] rounded-2xl p-3.5 shadow-xl dir-rtl text-right min-w-[200px]">
        <div className="text-xs font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] pb-2 mb-2 border-b border-[#F4F0EB] dark:border-[var(--border-subtle)]">
          {label}
        </div>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between text-xs gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                <span className="font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">{entry.name}:</span>
              </div>
              <span className="font-black text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                {formatToman(entry.value).text}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};
