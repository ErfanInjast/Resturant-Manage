import React from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Trash2,
  Info,
  Receipt,
  Layers,
  Utensils,
  BarChart2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { DailySalesRecord, WasteLog, FixedCosts, MenuItem } from '../../types';
import { formatToman, formatNumber, toPersianDigits, roundCurrency, cn } from '../../lib/utils';
import { calculateTotalMonthlyOverhead, calculateDailyOverhead } from '../../lib/financial';
import { formatJalaliReadable } from '../../lib/jalali';

export type KPIMetricType = 'revenue' | 'cogs' | 'overhead_waste' | 'net_profit';

interface KPIDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  metricType: KPIMetricType | null;
  filterTitle: string;
  filterSubtitle: string;
  periodDaysCount: number;
  salesRecords: DailySalesRecord[];
  wasteLogs: WasteLog[];
  fixedCosts: FixedCosts;
  menuItems: MenuItem[];
  workingDays: number;
  revenue: number;
  cogs: number;
  periodOverhead: number;
  totalWaste: number;
  grossProfit: number;
  netProfit: number;
  foodCostPercent: number;
  netMarginPercent: number;
}

export const KPIDetailModal: React.FC<KPIDetailModalProps> = ({
  isOpen,
  onClose,
  metricType,
  filterTitle,
  filterSubtitle,
  periodDaysCount,
  salesRecords,
  wasteLogs,
  fixedCosts,
  menuItems,
  workingDays,
  revenue,
  cogs,
  periodOverhead,
  totalWaste,
  grossProfit,
  netProfit,
  foodCostPercent,
  netMarginPercent,
}) => {
  if (!isOpen || !metricType) return null;

  // Monthly total overhead across all 8 categories
  const totalMonthlyOverhead = calculateTotalMonthlyOverhead(fixedCosts);

  // Average Daily Revenue
  const avgDailyRevenue = salesRecords.length > 0 ? revenue / Math.max(1, salesRecords.length) : 0;

  // Render specific content depending on metricType
  const getModalConfig = () => {
    switch (metricType) {
      case 'revenue':
        return {
          title: 'گزارش فروش و درآمد',
          description: `تحلیل فروش و عملکرد در ${filterTitle}`,
          icon: <TrendingUp className="h-5 w-5 text-[var(--status-success-text)] dark:text-[var(--status-success-text)]" />,
          badgeColor: 'success' as const,
        };
      case 'cogs':
        return {
          title: 'گزارش بهای تمام‌شده مواد',
          description: `تحلیل هزینه مواد اولیه و مصرف منو در ${filterTitle}`,
          icon: <ShoppingBag className="h-5 w-5 text-[var(--status-warning-text)] dark:text-[var(--status-warning-text)]" />,
          badgeColor: 'warning' as const,
        };
      case 'overhead_waste':
        return {
          title: 'گزارش سربار و ضایعات',
          description: `تفکیک هزینه‌های جاری و تلفات مواد در ${filterTitle}`,
          icon: <Trash2 className="h-5 w-5 text-rose-600 dark:text-rose-400" />,
          badgeColor: 'danger' as const,
        };
      case 'net_profit':
        return {
          title: 'گزارش سود خالص',
          description: `تحلیل سودآوری و ساختار مالی در ${filterTitle}`,
          icon: netProfit >= 0 ? <TrendingUp className="h-5 w-5 text-[var(--status-success-text)]" /> : <TrendingDown className="h-5 w-5 text-[var(--status-error-text)]" />,
          badgeColor: netProfit >= 0 ? ('success' as const) : ('danger' as const),
        };
    }
  };

  const config = getModalConfig();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={config.title} description={config.description} maxWidth="4xl">
      <div className="space-y-5 text-right dir-rtl">
        {/* Definition & Professional Explanation Header Box */}
        <div className="p-4 rounded-2xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] space-y-2">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-[var(--brand-primary)] shrink-0" />
            <h4 className="text-xs font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
              {metricType === 'revenue' && 'فرمول درآمد دوره'}
              {metricType === 'cogs' && 'فرمول بهای تمام‌شده مواد'}
              {metricType === 'overhead_waste' && 'فرمول سربار و ضایعات'}
              {metricType === 'net_profit' && 'فرمول سود خالص'}
            </h4>
          </div>
          <p className="text-xs leading-relaxed text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            {metricType === 'revenue' && (
              <>
                مجموع فروش ثبت‌شده از کلیه فاکتورها در این دوره.
                <span className="block mt-1 font-bold text-[var(--status-success-text)] dark:text-[var(--status-success-text)]">
                  فرمول: درآمد کل = مجموع مبالغ فاکتورهای فروش دوره
                </span>
              </>
            )}
            {metricType === 'cogs' && (
              <>
                ارزش مواد اولیه‌ مصرف‌شده بر اساس رسپی آیتم‌های فروش‌رفته.
                <span className="block mt-1 font-bold text-[var(--status-warning-text)] dark:text-[var(--status-warning-text)]">
                  فرمول: بهای مواد = مجموع (تعداد فروش هر آیتم × هزینه مواد رسپی)
                </span>
              </>
            )}
            {metricType === 'overhead_waste' && (
              <>
                سهم هزینه‌های ثابت (اجاره، حقوق، قبوض) به‌علاوه ارزش ضایعات ثبت‌شده.
                <span className="block mt-1 font-bold text-rose-600 dark:text-rose-400">
                  فرمول: سربار و ضایعات = (سربار روزانه × روزهای دوره) + ارزش ضایعات
                </span>
              </>
            )}
            {metricType === 'net_profit' && (
              <>
                سود نهایی باقی‌مانده پس از کسر کلیه هزینه‌های مستقیم، سربار و ضایعات.
                <span className="block mt-1 font-bold text-[var(--status-success-text)] dark:text-[var(--status-success-text)]">
                  فرمول: سود خالص = درآمد کل - بهای مواد - سربار - ضایعات
                </span>
              </>
            )}
          </p>
        </div>

        {/* METRIC 1: REVENUE REPORT DETAILS */}
        {metricType === 'revenue' && (
          <div className="space-y-4">
            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-[var(--status-success-text)] dark:border-[var(--status-success-text)]">
                <span className="text-[11px] font-bold text-[var(--status-success-text)] dark:text-emerald-300 block">درآمد کل دوره</span>
                <span className="text-base sm:text-lg font-black text-emerald-900 dark:text-emerald-100 block mt-1">
                  {formatToman(revenue).text}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
                <span className="text-[11px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)] block">میانگین فروش روزانه</span>
                <span className="text-base sm:text-lg font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] block mt-1">
                  {formatToman(avgDailyRevenue).text}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
                <span className="text-[11px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)] block">روزهای ثبت فروش</span>
                <span className="text-base sm:text-lg font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] block mt-1">
                  {toPersianDigits(salesRecords.length)} روز
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
                <span className="text-[11px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)] block">طول بازه گزارش</span>
                <span className="text-base sm:text-lg font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] block mt-1">
                  {toPersianDigits(periodDaysCount)} روز
                </span>
              </div>
            </div>

            {/* Sales Records Log Table */}
            <Card className="border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] bg-white dark:bg-[var(--bg-card)] p-4 space-y-3">
              <h4 className="text-xs font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
                <Receipt className="h-4 w-4 text-[var(--brand-primary)]" />
                فهرست روزهای ثبت فروش در این بازه ({toPersianDigits(salesRecords.length)} روز):
              </h4>
              <div className="max-h-60 overflow-y-auto custom-scrollbar">
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] dark:border-[var(--border-subtle)] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-bold">
                      <th className="py-2 px-2 text-right">تاریخ</th>
                      <th className="py-2 px-2 text-left">فروش کل (تومان)</th>
                      <th className="py-2 px-2 text-left">هزینه مواد اولیه</th>
                      <th className="py-2 px-2 text-center">سود ناخالص</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesRecords.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-[var(--text-secondary)]">
                          هیچ رکورد فروشی در این بازه زمانی ثبت نشده است.
                        </td>
                      </tr>
                    ) : (
                      salesRecords.map((r) => {
                        const gp = r.totalRevenue - r.totalCOGS;
                        return (
                          <tr key={r.id || r.date} className="border-b border-[var(--border-subtle)] dark:border-[var(--border-subtle)] hover:bg-[var(--bg-base)] hover:bg-[var(--bg-base)]">
                            <td className="py-2 px-2 font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                              {formatJalaliReadable(r.date) || toPersianDigits(r.date)}
                            </td>
                            <td className="py-2 px-2 text-left font-extrabold text-[var(--status-success-text)] dark:text-[var(--status-success-text)]">
                              {formatToman(r.totalRevenue).text}
                            </td>
                            <td className="py-2 px-2 text-left font-medium text-[var(--status-warning-text)] dark:text-[var(--status-warning-text)]">
                              {formatToman(r.totalCOGS).text}
                            </td>
                            <td className="py-2 px-2 text-center font-bold text-[var(--text-primary)] dark:text-[var(--text-secondary)]">
                              {formatToman(gp).text}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* METRIC 2: COGS REPORT DETAILS */}
        {metricType === 'cogs' && (
          <div className="space-y-4">
            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-[var(--status-warning-text)] dark:border-[var(--status-warning-text)]">
                <span className="text-[11px] font-bold text-[var(--status-warning-text)] dark:text-[var(--status-warning-text)] block">بهای تمام‌شده مواد</span>
                <span className="text-base sm:text-lg font-black text-[var(--status-warning-text)] dark:text-amber-100 block mt-1">
                  {formatToman(cogs).text}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
                <span className="text-[11px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)] block">درصد هزینه مواد اولیه</span>
                <span className="text-base sm:text-lg font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] block mt-1">
                  {toPersianDigits(roundCurrency(foodCostPercent))}٪
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
                <span className="text-[11px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)] block">سود ناخالص</span>
                <span className="text-base sm:text-lg font-black text-[var(--status-success-text)] dark:text-[var(--status-success-text)] block mt-1">
                  {formatToman(grossProfit).text}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
                <span className="text-[11px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)] block">حاشیه سود ناخالص</span>
                <span className="text-base sm:text-lg font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] block mt-1">
                  {toPersianDigits(roundCurrency(Math.max(0, 100 - foodCostPercent)))}٪
                </span>
              </div>
            </div>

            {/* Benchmark Analysis */}
            <Card className="border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] bg-white dark:bg-[var(--bg-card)] p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] dark:border-[var(--border-subtle)] pb-2.5">
                <h4 className="text-xs font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-[var(--status-warning-text)]" />
                  ارزیابی سلامت درصد هزینه مواد در صنعت رستوران‌داری:
                </h4>
                {foodCostPercent <= 32 ? (
                  <Badge variant="success" className="text-[11px]">عالی و بهینه (زیر ۳۲٪)</Badge>
                ) : foodCostPercent <= 38 ? (
                  <Badge variant="warning" className="text-[11px]">استاندارد صنعت (۳۲٪ تا ۳۸٪)</Badge>
                ) : (
                  <Badge variant="danger" className="text-[11px]">هشدار - بالا (بالای ۳۸٪)</Badge>
                )}
              </div>
              <div className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)] leading-relaxed space-y-1.5">
                <p>
                  در صنعت رستوران، فست‌فود و کافه، استاندارد مطلوب هزینه مواد اولیه بین <strong>۲۸٪ تا ۳۵٪</strong> از درآمد فروش است.
                </p>
                <div className="w-full bg-[var(--bg-base)] dark:bg-[var(--bg-card)] h-3 rounded-full overflow-hidden relative mt-2">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      foodCostPercent <= 32 ? 'bg-emerald-500' : foodCostPercent <= 38 ? 'bg-amber-500' : 'bg-rose-500'
                    )}
                    style={{ width: `${Math.min(100, Math.max(5, foodCostPercent))}%` }}
                  />
                </div>
              </div>
            </Card>

            {/* Menu Items Material Cost Breakdown */}
            <Card className="border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] bg-white dark:bg-[var(--bg-card)] p-4 space-y-3">
              <h4 className="text-xs font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
                <Utensils className="h-4 w-4 text-[var(--status-warning-text)]" />
                وضعیت هزینه مواد در آیتم‌های منو ({toPersianDigits(menuItems.length)} آیتم فعال):
              </h4>
              <div className="max-h-56 overflow-y-auto custom-scrollbar">
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] dark:border-[var(--border-subtle)] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-bold">
                      <th className="py-2 px-2 text-right">نام آیتم منو</th>
                      <th className="py-2 px-2 text-left">قیمت فروش (تومان)</th>
                      <th className="py-2 px-2 text-left">هزینه مواد رسپی (تومان)</th>
                      <th className="py-2 px-2 text-center">درصد هزینه مواد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menuItems.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-[var(--text-secondary)]">آیتم منویی ثبت نشده است.</td>
                      </tr>
                    ) : (
                      menuItems.map((m) => {
                        const itemPrice = m.sellingPrice || 0;
                        const itemCogs = m.foodCost ?? m.totalMaterialCost ?? 0;
                        const itemFc = itemPrice > 0 ? Math.round((itemCogs / itemPrice) * 100) : 0;
                        return (
                          <tr key={m.id} className="border-b border-[var(--border-subtle)] dark:border-[var(--border-subtle)] hover:bg-[var(--bg-base)] hover:bg-[var(--bg-base)]">
                            <td className="py-2 px-2 font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">{m.name}</td>
                            <td className="py-2 px-2 text-left font-bold text-[var(--text-primary)] dark:text-[var(--text-secondary)]">{formatToman(itemPrice).text}</td>
                            <td className="py-2 px-2 text-left font-extrabold text-[var(--status-warning-text)] dark:text-[var(--status-warning-text)]">{formatToman(itemCogs).text}</td>
                            <td className="py-2 px-2 text-center">
                              <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', itemFc <= 35 ? 'bg-emerald-50 text-[var(--status-success-text)] dark:bg-emerald-950/60 dark:text-[var(--status-success-text)]' : 'bg-rose-50 text-[var(--status-error-text)] dark:bg-rose-950/60 dark:text-[var(--status-error-text)]')}>
                                {toPersianDigits(itemFc)}٪
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* METRIC 3: OVERHEAD & WASTE REPORT DETAILS */}
        {metricType === 'overhead_waste' && (
          <div className="space-y-4">
            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-[var(--status-error-text)] dark:border-[var(--status-error-text)]">
                <span className="text-[11px] font-bold text-[var(--status-error-text)] dark:text-rose-300 block">جمع کل سربار و ضایعات</span>
                <span className="text-base sm:text-lg font-black text-rose-900 dark:text-rose-100 block mt-1">
                  {formatToman(periodOverhead + totalWaste).text}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
                <span className="text-[11px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)] block">هزینه‌های ثابت (سربار)</span>
                <span className="text-base sm:text-lg font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] block mt-1">
                  {formatToman(periodOverhead).text}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
                <span className="text-[11px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)] block">ضایعات مواد ثبت‌شده</span>
                <span className="text-base sm:text-lg font-black text-[var(--status-error-text)] dark:text-[var(--status-error-text)] block mt-1">
                  {formatToman(totalWaste).text}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
                <span className="text-[11px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)] block">سربار روزانه عملیاتی</span>
                <span className="text-base sm:text-lg font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] block mt-1">
                  {formatToman(calculateDailyOverhead(totalMonthlyOverhead, workingDays)).text}
                </span>
              </div>
            </div>

            {/* Fixed Costs Breakdown List */}
            <Card className="border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] bg-white dark:bg-[var(--bg-card)] p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] dark:border-[var(--border-subtle)] pb-2.5">
                <h4 className="text-xs font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
                  <Layers className="h-4 w-4 text-[var(--brand-primary)]" />
                  تفکیک هزینه‌های ثابت (ماهانه و تخصیص‌یافته به دوره):
                </h4>
                <span className="text-[11px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                  مجموع ماهانه: {formatToman(totalMonthlyOverhead).text}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)] block">اجاره‌بها</span>
                  <span className="text-xs font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] block mt-0.5">
                    {formatToman(fixedCosts.rent || 0).text}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)] block">حقوق و دستمزد</span>
                  <span className="text-xs font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] block mt-0.5">
                    {formatToman(fixedCosts.salaries || 0).text}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)] block">قبوض و انرژی</span>
                  <span className="text-xs font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] block mt-0.5">
                    {formatToman(fixedCosts.utilities || 0).text}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)] block">پیک و ارسال</span>
                  <span className="text-xs font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] block mt-0.5">
                    {formatToman(fixedCosts.delivery || 0).text}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)] block">تعمیرات و نگهداری</span>
                  <span className="text-xs font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] block mt-0.5">
                    {formatToman(fixedCosts.maintenance || 0).text}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)] block">سایر هزینه‌های جاری</span>
                  <span className="text-xs font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] block mt-0.5">
                    {formatToman(fixedCosts.general || 0).text}
                  </span>
                </div>
              </div>
            </Card>

            {/* Waste Log Table */}
            <Card className="border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] bg-white dark:bg-[var(--bg-card)] p-4 space-y-3">
              <h4 className="text-xs font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-[var(--status-error-text)]" />
                فهرست ضایعات مواد در این بازه ({toPersianDigits(wasteLogs.length)} مورد):
              </h4>
              <div className="max-h-52 overflow-y-auto custom-scrollbar">
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] dark:border-[var(--border-subtle)] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-bold">
                      <th className="py-2 px-2 text-right">نام آیتم / ماده</th>
                      <th className="py-2 px-2 text-center">علت ضایعات</th>
                      <th className="py-2 px-2 text-center">مقدار</th>
                      <th className="py-2 px-2 text-left">ارزش زیان (تومان)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wasteLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-[var(--text-secondary)]">هیچ ضایعاتی در این بازه ثبت نشده است.</td>
                      </tr>
                    ) : (
                      wasteLogs.map((w) => (
                        <tr key={w.id} className="border-b border-[var(--border-subtle)] dark:border-[var(--border-subtle)] hover:bg-[var(--bg-base)] hover:bg-[var(--bg-base)]">
                          <td className="py-2 px-2 font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">{w.itemName}</td>
                          <td className="py-2 px-2 text-center font-medium text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">{w.reason}</td>
                          <td className="py-2 px-2 text-center font-bold">{toPersianDigits(w.quantity)} {w.unit || ''}</td>
                          <td className="py-2 px-2 text-left font-extrabold text-[var(--status-error-text)] dark:text-[var(--status-error-text)]">{formatToman(w.cost || 0).text}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* METRIC 4: NET PROFIT REPORT DETAILS */}
        {metricType === 'net_profit' && (
          <div className="space-y-4">
            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className={cn("p-3.5 rounded-2xl border", netProfit >= 0 ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-[var(--status-success-text)] dark:border-[var(--status-success-text)]" : "bg-rose-50/60 dark:bg-rose-950/30 border-[var(--status-error-text)] dark:border-[var(--status-error-text)]")}>
                <span className={cn("text-[11px] font-bold block", netProfit >= 0 ? "text-[var(--status-success-text)] dark:text-emerald-300" : "text-[var(--status-error-text)] dark:text-rose-300")}>سود خالص نهایی</span>
                <span className={cn("text-base sm:text-lg font-black block mt-1", netProfit >= 0 ? "text-emerald-900 dark:text-emerald-100" : "text-rose-900 dark:text-rose-100")}>
                  {formatToman(netProfit).text}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
                <span className="text-[11px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)] block">حاشیه سود خالص</span>
                <span className="text-base sm:text-lg font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] block mt-1">
                  {toPersianDigits(roundCurrency(netMarginPercent))}٪
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
                <span className="text-[11px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)] block">درآمد کل دوره</span>
                <span className="text-base sm:text-lg font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] block mt-1">
                  {formatToman(revenue).text}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
                <span className="text-[11px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)] block">جمع تمام هزینه‌ها</span>
                <span className="text-base sm:text-lg font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] block mt-1">
                  {formatToman(cogs + periodOverhead + totalWaste).text}
                </span>
              </div>
            </div>

            {/* Financial Waterfall Steps */}
            <Card className="border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] bg-white dark:bg-[var(--bg-card)] p-4 space-y-3">
              <h4 className="text-xs font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2 border-b border-[var(--border-subtle)] dark:border-[var(--border-subtle)] pb-2.5">
                <Sparkles className="h-4 w-4 text-[var(--brand-primary)]" />
                مراحل محاسبه و جریان سود مالی دوره:
              </h4>

              <div className="space-y-2.5 text-xs">
                {/* Step 1: Revenue */}
                <div className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-[var(--status-success-text)] dark:border-[var(--status-success-text)] flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-emerald-900 dark:text-emerald-200">۱. درآمد کل فروش</span>
                    <span className="text-[11px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] block">مجموع فاکتورهای فروش دوره</span>
                  </div>
                  <div dir="ltr" className="flex items-center gap-1 font-black text-[var(--status-success-text)] dark:text-[var(--status-success-text)] text-sm">
                    <span className="font-bold">+</span>
                    <span>{formatToman(revenue).text}</span>
                  </div>
                </div>

                {/* Step 2: COGS */}
                <div className="p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-[var(--status-warning-text)] dark:border-[var(--status-warning-text)] flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-[var(--status-warning-text)] dark:text-amber-200">۲. کسر بهای تمام‌شده مواد اولیه</span>
                    <span className="text-[11px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] block">هزینه مستقیم مواد اولیه رسپی</span>
                  </div>
                  <div dir="ltr" className="flex items-center gap-1 font-black text-[var(--status-warning-text)] dark:text-[var(--status-warning-text)] text-sm">
                    <span className="font-bold">-</span>
                    <span>{formatToman(cogs).text}</span>
                  </div>
                </div>

                {/* Step 3: Gross Profit */}
                <div className="p-2.5 rounded-xl bg-[var(--bg-base)]/70 dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-functional)] flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-[var(--text-primary)] dark:text-[var(--text-primary)]">۳. سود ناخالص</span>
                    <span className="text-[11px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] block">درآمد منهای هزینه مواد اولیه</span>
                  </div>
                  <div dir="ltr" className="flex items-center gap-1 font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] text-sm">
                    <span className="font-bold">=</span>
                    <span>{formatToman(grossProfit).text}</span>
                  </div>
                </div>

                {/* Step 4: Overhead & Waste */}
                <div className="p-2.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-[var(--status-error-text)] dark:border-[var(--status-error-text)] flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-rose-900 dark:text-rose-200">۴. کسر سربار عملیاتی و ضایعات</span>
                    <span className="text-[11px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] block">حقوق، اجاره، قبوض و ضایعات</span>
                  </div>
                  <div dir="ltr" className="flex items-center gap-1 font-black text-[var(--status-error-text)] dark:text-[var(--status-error-text)] text-sm">
                    <span className="font-bold">-</span>
                    <span>{formatToman(periodOverhead + totalWaste).text}</span>
                  </div>
                </div>

                {/* Step 5: Net Profit Result */}
                <div className={cn("p-3 rounded-xl border flex items-center justify-between font-black text-sm", netProfit >= 0 ? "bg-emerald-100/80 dark:bg-emerald-900/40 border-[var(--status-success-text)]/30 dark:border-[var(--status-success-text)]/30 text-emerald-950 dark:text-emerald-100" : "bg-rose-100/80 dark:bg-rose-900/40 border-[var(--status-error-text)]/30 dark:border-[var(--status-error-text)]/30 text-rose-950 dark:text-rose-100")}>
                  <span>۵. سود خالص نهایی دوره</span>
                  <div dir="ltr" className="flex items-center gap-1 text-base">
                    <span>{formatToman(netProfit).text}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Modal Close Footer */}
        <div className="flex justify-end pt-2 border-t border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
          <Button variant="outline" onClick={onClose} className="text-xs font-bold px-5">
            بستن گزارش
          </Button>
        </div>
      </div>
    </Modal>
  );
};
