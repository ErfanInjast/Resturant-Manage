import React, { useEffect, useState, useMemo } from 'react';
import {
  History,
  TrendingUp,
  TrendingDown,
  Trash2,
  Calendar,
  Layers,
  ShoppingBag,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { db } from '../../db';
import type { Ingredient, PurchaseLog } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { calculateWACFromLogs, recalculateIngredientCost } from '../../lib/inventoryCost';
import { formatCurrency, toPersianDigits, getUnitLabel } from '../../lib/utils';
import { formatJalaliReadable } from '../../lib/jalali';

interface PurchaseHistoryDrawerProps {
  ingredient: Ingredient | null;
  isOpen: boolean;
  onClose: () => void;
  onPurchaseAdded?: () => void;
}

export const PurchaseHistoryDrawer: React.FC<PurchaseHistoryDrawerProps> = ({
  ingredient,
  isOpen,
  onClose,
}) => {
  const { askConfirmation, notify } = useAppStore();
  const [logs, setLogs] = useState<PurchaseLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = async () => {
    if (!ingredient?.id) return;
    setIsLoading(true);
    try {
      const data = await db.purchaseLogs.where('ingredientId').equals(ingredient.id).toArray();
      setLogs(data);
    } catch (err) {
      console.error('Error fetching purchase logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && ingredient?.id) {
      fetchLogs();
    } else {
      setLogs([]);
    }
  }, [isOpen, ingredient?.id]);

  // Purchases sorted oldest to newest for chart & price change diff
  const purchaseLogsChronological = useMemo(() => {
    return logs
      .filter((l) => l.reason === 'purchase')
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      });
  }, [logs]);

  // Table logs sorted newest first
  const logsNewestFirst = useMemo(() => {
    return [...logs].sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  }, [logs]);

  // Chart data
  const chartData = useMemo(() => {
    return purchaseLogsChronological.map((item, idx) => ({
      index: idx + 1,
      date: formatJalaliReadable(item.date),
      unitCost: item.unitCost,
      quantity: item.quantity,
    }));
  }, [purchaseLogsChronological]);

  // Map each log id to percentage change relative to immediate previous purchase
  const priceChangesMap = useMemo(() => {
    const map = new Map<number, number | null>();
    for (let i = 0; i < purchaseLogsChronological.length; i++) {
      const current = purchaseLogsChronological[i];
      if (!current.id) continue;
      if (i === 0) {
        map.set(current.id, null);
      } else {
        const prev = purchaseLogsChronological[i - 1];
        if (prev.unitCost > 0) {
          const diffPct = ((current.unitCost - prev.unitCost) / prev.unitCost) * 100;
          map.set(current.id, diffPct);
        } else {
          map.set(current.id, null);
        }
      }
    }
    return map;
  }, [purchaseLogsChronological]);

  const handleDeleteLog = (logToDelete: PurchaseLog) => {
    if (!ingredient?.id || !logToDelete.id) return;

    const remainingLogs = logs.filter((l) => l.id !== logToDelete.id);
    const { unitCost: simulatedUnitCost } = calculateWACFromLogs(remainingLogs);

    const isPurchase = logToDelete.reason === 'purchase';

    askConfirmation({
      title: 'تأیید حذف سابقه خرید',
      message: `آیا از حذف این سابقه (${toPersianDigits(logToDelete.quantity)} ${getUnitLabel(ingredient.unit)} - ${formatCurrency(logToDelete.totalPrice)} تومان) اطمینان دارید؟`,
      details: isPurchase
        ? [
            `بهای میانگین موزون فعلی: ${formatCurrency(ingredient.unitCost)} تومان`,
            `بهای میانگین موزون جدید پس از حذف: ${formatCurrency(simulatedUnitCost)} تومان`,
          ]
        : ['حذف این رکورد اصلاحی تأثیری روی میانگین بهای تمام‌شده ندارد.'],
      badgeText: 'عملیات حساس',
      variant: 'danger',
      confirmText: 'حذف سابقه',
      onConfirm: async () => {
        try {
          await db.purchaseLogs.delete(logToDelete.id!);
          if (isPurchase) {
            await recalculateIngredientCost(ingredient.id!);
          }
          notify.success('سابقه حذف شد', 'سابقه فاکتور حذف گردید و میانگین قیمت مجدداً محاسبه شد.');
          await fetchLogs();
        } catch (err) {
          console.error('Error deleting purchase log:', err);
          notify.error('خطا در حذف سابقه');
        }
      },
    });
  };

  if (!ingredient) return null;

  const unitLabel = getUnitLabel(ingredient.unit);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`سوابق خرید و نوسان قیمت: ${ingredient.name}`}
      description={`بهای میانگین خرید فعلی: ${formatCurrency(ingredient.unitCost)} تومان به ازای هر ${unitLabel}`}
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-[var(--bg-base)] border border-[var(--border-subtle)] space-y-1">
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-bold">
              <ShoppingBag className="h-4 w-4 text-[var(--brand-primary)]" />
              <span>میانگین قیمت هر {unitLabel}</span>
            </div>
            <p className="text-base font-black text-[var(--brand-primary)]">
              {formatCurrency(ingredient.unitCost)}{' '}
              <span className="text-xs font-bold text-[var(--text-secondary)]">تومان</span>
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-base)] border border-[var(--border-subtle)] space-y-1">
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-bold">
              <History className="h-4 w-4 text-[var(--status-info-text)]" />
              <span>تعداد کل فاکتورها</span>
            </div>
            <p className="text-base font-black text-[var(--text-primary)]">
              {toPersianDigits(purchaseLogsChronological.length)}{' '}
              <span className="text-xs font-bold text-[var(--text-secondary)]">نوبت خرید</span>
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-base)] border border-[var(--border-subtle)] space-y-1">
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-bold">
              <Layers className="h-4 w-4 text-[var(--status-success-text)]" />
              <span>موجودی فعلی انبار</span>
            </div>
            <p className="text-base font-black text-[var(--text-primary)]">
              {toPersianDigits(ingredient.currentStock)}{' '}
              <span className="text-xs font-bold text-[var(--text-secondary)]">{unitLabel}</span>
            </p>
          </div>
        </div>

        {/* Price Trend Chart */}
        {chartData.length > 1 && (
          <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-[var(--text-primary)] flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[var(--brand-primary)]" />
                <span>نمودار روند تغییر قیمت فی خرید در طول زمان</span>
              </h3>
            </div>
            <div className="h-48 sm:h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => toPersianDigits(Math.round(val / 1000)) + ' هزار'}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-lg text-xs font-bold space-y-1 dir-rtl">
                            <p className="text-[var(--text-secondary)]">{data.date}</p>
                            <p className="text-[var(--brand-primary)] font-black">
                              قیمت هر {unitLabel}: {formatCurrency(data.unitCost)} تومان
                            </p>
                            <p className="text-[var(--text-primary)]">
                              مقدار خرید: {toPersianDigits(data.quantity)} {unitLabel}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="unitCost"
                    stroke="var(--brand-primary)"
                    strokeWidth={2.5}
                    dot={{ fill: 'var(--brand-primary)', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Purchase History Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-[var(--text-primary)] flex items-center gap-2">
              <History className="h-4 w-4 text-[var(--brand-primary)]" />
              <span>ریز فاکتورهای خرید و اصلاحات</span>
            </h3>
            <span className="text-[11px] text-[var(--text-secondary)] font-medium">
              مرتب‌شده بر اساس جدیدترین
            </span>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-xs font-bold text-[var(--text-secondary)]">
              در حال دریافت سوابق...
            </div>
          ) : logsNewestFirst.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-[var(--border-subtle)] text-xs font-bold text-[var(--text-secondary)] space-y-1">
              <Info className="h-6 w-6 mx-auto text-[var(--text-secondary)]/50" />
              <p>هیچ سابقه خریدی برای این ماده ثبت نشده است.</p>
            </div>
          ) : (
            <div className="border border-[var(--border-subtle)] rounded-2xl overflow-hidden bg-[var(--bg-card)]">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[var(--bg-base)] border-b border-[var(--border-subtle)] text-[var(--text-secondary)] font-black">
                    <tr>
                      <th className="p-3">تاریخ</th>
                      <th className="p-3">نوع ثبت</th>
                      <th className="p-3">مقدار</th>
                      <th className="p-3">مبلغ کل (تومان)</th>
                      <th className="p-3">قیمت واحد (تومان)</th>
                      <th className="p-3">تغییر نسبت به خرید قبل</th>
                      <th className="p-3 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)] font-medium">
                    {logsNewestFirst.map((log) => {
                      const isPurchase = log.reason === 'purchase';
                      const changePct = log.id ? priceChangesMap.get(log.id) : null;

                      return (
                        <tr key={log.id} className="hover:bg-[var(--bg-base)] transition-colors">
                          {/* Date */}
                          <td className="p-3 font-bold text-[var(--text-primary)] whitespace-nowrap">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-[var(--text-secondary)] shrink-0" />
                              <span>{formatJalaliReadable(log.date)}</span>
                            </span>
                          </td>

                          {/* Reason Badge */}
                          <td className="p-3 whitespace-nowrap">
                            {isPurchase ? (
                              <Badge className="bg-[var(--brand-primary-subtle)] text-[var(--brand-primary)] border-[var(--brand-primary)]/20 text-[10px] font-black">
                                <ShoppingBag className="h-3 w-3 ml-1" />
                                خرید جدید
                              </Badge>
                            ) : (
                              <Badge className="bg-[var(--status-info-bg)] text-[var(--status-info-text)] border-[var(--status-info-text)]/20 text-[10px] font-black">
                                اصلاح موجودی
                              </Badge>
                            )}
                          </td>

                          {/* Quantity */}
                          <td className="p-3 font-bold text-[var(--text-primary)] whitespace-nowrap">
                            {toPersianDigits(log.quantity)} {unitLabel}
                          </td>

                          {/* Total Price */}
                          <td className="p-3 font-extrabold text-[var(--text-primary)] whitespace-nowrap">
                            {isPurchase ? formatCurrency(log.totalPrice) : '-'}
                          </td>

                          {/* Unit Cost */}
                          <td className="p-3 font-black text-[var(--brand-primary)] whitespace-nowrap">
                            {isPurchase ? formatCurrency(log.unitCost) : '-'}
                          </td>

                          {/* Price Change Percentage */}
                          <td className="p-3 whitespace-nowrap">
                            {isPurchase && changePct !== undefined && changePct !== null ? (
                              changePct > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border border-[var(--status-warning-text)]/20">
                                  <TrendingUp className="h-3 w-3" />
                                  <span>{toPersianDigits(Math.abs(changePct).toFixed(1))}%+ (گران‌تر)</span>
                                </span>
                              ) : changePct < 0 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-[var(--status-success-bg)] text-[var(--status-success-text)] border border-[var(--status-success-text)]/20">
                                  <TrendingDown className="h-3 w-3" />
                                  <span>{toPersianDigits(Math.abs(changePct).toFixed(1))}%- (ارزان‌تر)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--bg-base)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                                  بدون تغییر
                                </span>
                              )
                            ) : (
                              <span className="text-[var(--text-secondary)] text-[10px]">-</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="p-3 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleDeleteLog(log)}
                              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--status-error-text)] hover:bg-[var(--status-error-bg)] transition-colors cursor-pointer"
                              title="حذف این سابقه"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
