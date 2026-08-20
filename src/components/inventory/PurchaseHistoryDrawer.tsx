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
  Edit2,
  CheckCircle2,
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
import { Button } from '../ui/Button';
import { SmartMoneyInput } from '../ui/SmartMoneyInput';
import { JalaliDatePicker } from '../ui/JalaliDatePicker';
import { Pagination } from '../ui/Pagination';
import { db } from '../../db';
import type { Ingredient, PurchaseLog } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { calculateWACFromLogs, recalculateIngredientCost, getTimelineEventTimestamp } from '../../lib/inventoryCost';
import { formatCurrency, toPersianDigits, toEnglishDigits, parseFormattedNumber, getUnitLabel } from '../../lib/utils';
import { formatJalaliReadable, getTodayJalaliIso, toJalaliIso } from '../../lib/jalali';

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

  // Pagination state for history table
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Edit Log State
  const [editingLog, setEditingLog] = useState<PurchaseLog | null>(null);
  const [editDate, setEditDate] = useState<string>(getTodayJalaliIso());
  const [editQty, setEditQty] = useState<number | string>('');
  const [editTotalPrice, setEditTotalPrice] = useState<number | ''>('');
  const [editNote, setEditNote] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const fetchLogs = async () => {
    if (!ingredient?.id) return;
    setIsLoading(true);
    try {
      const data = await db.purchaseLogs.where('ingredientId').equals(ingredient.id).toArray();
      const normalized = data.map((item) => ({
        ...item,
        date: toJalaliIso(item.date),
      }));
      setLogs(normalized);
    } catch (err) {
      console.error('Error fetching purchase logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && ingredient?.id) {
      fetchLogs();
      setCurrentPage(1);
    } else {
      setLogs([]);
    }
  }, [isOpen, ingredient?.id]);

  // Purchases sorted oldest to newest for chart & price change diff
  const purchaseLogsChronological = useMemo(() => {
    return logs
      .filter((l) => l.reason === 'purchase')
      .sort((a, b) => {
        const tsA = getTimelineEventTimestamp(a.date, a.createdAt, 'purchase');
        const tsB = getTimelineEventTimestamp(b.date, b.createdAt, 'purchase');
        if (tsA !== tsB) return tsA - tsB;
        return (a.id || 0) - (b.id || 0);
      });
  }, [logs]);

  // Table logs sorted newest first
  const logsNewestFirst = useMemo(() => {
    return [...logs].sort((a, b) => {
      const tsA = getTimelineEventTimestamp(a.date, a.createdAt, a.reason === 'purchase' ? 'purchase' : 'adjustment');
      const tsB = getTimelineEventTimestamp(b.date, b.createdAt, b.reason === 'purchase' ? 'purchase' : 'adjustment');
      if (tsA !== tsB) return tsB - tsA;
      return (b.id || 0) - (a.id || 0);
    });
  }, [logs]);

  // Paginated logs
  const totalPages = Math.ceil(logsNewestFirst.length / itemsPerPage) || 1;
  const validPage = Math.min(currentPage, totalPages);
  const paginatedLogs = useMemo(() => {
    const start = (validPage - 1) * itemsPerPage;
    return logsNewestFirst.slice(start, start + itemsPerPage);
  }, [logsNewestFirst, validPage, itemsPerPage]);

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

  // Open Edit Modal for a specific purchase log
  const handleOpenEditModal = (log: PurchaseLog) => {
    setEditingLog(log);
    setEditDate(toJalaliIso(log.date));
    setEditQty(log.quantity);
    setEditTotalPrice(log.reason === 'purchase' ? log.totalPrice : 0);
    setEditNote(log.note || '');
  };

  // Save edited purchase log
  const handleSaveEditLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog?.id || !ingredient?.id) return;

    try {
      setIsSubmittingEdit(true);
      const qtyNum = parseFormattedNumber(editQty);
      const totalPriceNum = editingLog.reason === 'purchase' ? parseFormattedNumber(editTotalPrice) : 0;

      if (qtyNum <= 0 && editingLog.reason === 'purchase') {
        notify.error('مقدار نامعتبر', 'مقدار فاکتور باید بیشتر از صفر باشد.');
        return;
      }

      if (totalPriceNum <= 0 && editingLog.reason === 'purchase') {
        notify.error('مبلغ نامعتبر', 'مبلغ کل فاکتور خرید باید بیشتر از صفر باشد.');
        return;
      }

      const unitCost = editingLog.reason === 'purchase' && qtyNum > 0
        ? Math.round(totalPriceNum / qtyNum)
        : 0;

      // Update the log in DB
      await db.purchaseLogs.update(editingLog.id, {
        date: editDate || getTodayJalaliIso(),
        quantity: qtyNum,
        totalPrice: totalPriceNum,
        unitCost,
        note: editNote.trim() || undefined,
      });

      // Recalculate WAC cost & updated stocks
      if (editingLog.reason === 'purchase') {
        await recalculateIngredientCost(ingredient.id);
      } else {
        // Recalculate current stock based on diff
        const diffQty = qtyNum - editingLog.quantity;
        await db.ingredients.update(ingredient.id, {
          currentStock: ingredient.currentStock + diffQty,
        });
      }

      notify.success('ویرایش شد', 'اطلاعات فاکتور خرید به‌روزرسانی شد و محاسبات میانگین قیمت اعمال گردید.');
      setEditingLog(null);
      await fetchLogs();
    } catch (err) {
      console.error('Error updating purchase log:', err);
      notify.error('خطا در ویرایش فاکتور خرید');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

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
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`سوابق خرید و نوسان قیمت: ${ingredient.name}`}
        description={`بهای میانگین خرید فعلی: ${formatCurrency(ingredient.unitCost)} تومان به ازای هر ${unitLabel}`}
        maxWidth="4xl"
      >
        <div className="space-y-4">
          {/* Top Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)] space-y-0.5">
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] font-bold">
                <ShoppingBag className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
                <span>میانگین قیمت هر {unitLabel}</span>
              </div>
              <p className="text-sm font-black text-[var(--brand-primary)]">
                {formatCurrency(ingredient.unitCost)}{' '}
                <span className="text-[10px] font-bold text-[var(--text-secondary)]">تومان</span>
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)] space-y-0.5">
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] font-bold">
                <History className="h-3.5 w-3.5 text-[var(--status-info-text)]" />
                <span>تعداد کل سوابق</span>
              </div>
              <p className="text-sm font-black text-[var(--text-primary)]">
                {toPersianDigits(logs.length)}{' '}
                <span className="text-[10px] font-bold text-[var(--text-secondary)]">نوبت</span>
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)] space-y-0.5">
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] font-bold">
                <Layers className="h-3.5 w-3.5 text-[var(--status-success-text)]" />
                <span>موجودی فعلی انبار</span>
              </div>
              <p className="text-sm font-black text-[var(--text-primary)]">
                {toPersianDigits(ingredient.currentStock)}{' '}
                <span className="text-[10px] font-bold text-[var(--text-secondary)]">{unitLabel}</span>
              </p>
            </div>
          </div>

          {/* Minimal Compact Price Trend Chart */}
          {chartData.length > 1 && (
            <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-1.5">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-black text-[var(--text-primary)] flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
                  <span>نمودار نوسان قیمت فی خرید</span>
                </h3>
              </div>
              <div className="h-32 w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 9, fill: 'var(--text-secondary)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: 'var(--text-secondary)' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => toPersianDigits(Math.round(val / 1000)) + 'k'}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-md text-[11px] font-bold space-y-0.5 dir-rtl">
                              <p className="text-[var(--text-secondary)]">{data.date}</p>
                              <p className="text-[var(--brand-primary)] font-black">
                                فی: {formatCurrency(data.unitCost)} تومان
                              </p>
                              <p className="text-[var(--text-primary)]">
                                مقدار: {toPersianDigits(data.quantity)} {unitLabel}
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
                      strokeWidth={2}
                      dot={{ fill: 'var(--brand-primary)', r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Purchase History Table with Pagination */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-black text-[var(--text-primary)] flex items-center gap-1.5">
                <History className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
                <span>ریز فاکتورهای خرید و اصلاحات</span>
              </h3>
              <span className="text-[10px] text-[var(--text-secondary)] font-medium">
                جدیدترین‌ها در ابتدا
              </span>
            </div>

            {isLoading ? (
              <div className="p-6 text-center text-xs font-bold text-[var(--text-secondary)]">
                در حال دریافت سوابق...
              </div>
            ) : logsNewestFirst.length === 0 ? (
              <div className="p-6 text-center rounded-xl border border-dashed border-[var(--border-subtle)] text-xs font-bold text-[var(--text-secondary)] space-y-1">
                <Info className="h-5 w-5 mx-auto text-[var(--text-secondary)]/50" />
                <p>هیچ سابقه خریدی برای این ماده ثبت نشده است.</p>
              </div>
            ) : (
              <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden bg-[var(--bg-card)]">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-[var(--bg-base)] border-b border-[var(--border-subtle)] text-[10px] text-[var(--text-secondary)] font-black">
                      <tr>
                        <th className="p-2.5">تاریخ</th>
                        <th className="p-2.5">نوع ثبت</th>
                        <th className="p-2.5">مقدار</th>
                        <th className="p-2.5">مبلغ کل (تومان)</th>
                        <th className="p-2.5">قیمت واحد</th>
                        <th className="p-2.5">تغییر نرخ</th>
                        <th className="p-2.5 text-center">عملیات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)] font-medium text-[11px]">
                      {paginatedLogs.map((log) => {
                        const isPurchase = log.reason === 'purchase';
                        const changePct = log.id ? priceChangesMap.get(log.id) : null;

                        return (
                          <tr key={log.id} className="hover:bg-[var(--bg-base)] transition-colors">
                            {/* Jalali Date Display (Always converted cleanly) */}
                            <td className="p-2.5 font-bold text-[var(--text-primary)] whitespace-nowrap">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-[var(--text-secondary)] shrink-0" />
                                <span>{formatJalaliReadable(log.date)}</span>
                              </span>
                            </td>

                            {/* Reason Badge */}
                            <td className="p-2.5 whitespace-nowrap">
                              {isPurchase ? (
                                <Badge className="bg-[var(--brand-primary-subtle)] text-[var(--brand-primary)] border-[var(--brand-primary)]/20 text-[9px] font-black">
                                  خرید
                                </Badge>
                              ) : (
                                <Badge className="bg-[var(--status-info-bg)] text-[var(--status-info-text)] border-[var(--status-info-text)]/20 text-[9px] font-black">
                                  اصلاح
                                </Badge>
                              )}
                            </td>

                            {/* Quantity */}
                            <td className="p-2.5 font-bold text-[var(--text-primary)] whitespace-nowrap">
                              {toPersianDigits(log.quantity)} {unitLabel}
                            </td>

                            {/* Total Price */}
                            <td className="p-2.5 font-extrabold text-[var(--text-primary)] whitespace-nowrap">
                              {isPurchase ? formatCurrency(log.totalPrice) : '-'}
                            </td>

                            {/* Unit Cost */}
                            <td className="p-2.5 font-black text-[var(--brand-primary)] whitespace-nowrap">
                              {isPurchase ? formatCurrency(log.unitCost) : '-'}
                            </td>

                            {/* Price Change Percentage */}
                            <td className="p-2.5 whitespace-nowrap">
                              {isPurchase && changePct !== undefined && changePct !== null ? (
                                changePct > 0 ? (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border border-[var(--status-warning-text)]/20">
                                    <TrendingUp className="h-2.5 w-2.5" />
                                    <span>{toPersianDigits(Math.abs(changePct).toFixed(1))}%+</span>
                                  </span>
                                ) : changePct < 0 ? (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-[var(--status-success-bg)] text-[var(--status-success-text)] border border-[var(--status-success-text)]/20">
                                    <TrendingDown className="h-2.5 w-2.5" />
                                    <span>{toPersianDigits(Math.abs(changePct).toFixed(1))}%-</span>
                                  </span>
                                ) : (
                                  <span className="text-[var(--text-secondary)] text-[9px]">بدون تغییر</span>
                                )
                              ) : (
                                <span className="text-[var(--text-secondary)] text-[9px]">-</span>
                              )}
                            </td>

                            {/* Actions: Edit & Delete */}
                            <td className="p-2.5 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(log)}
                                  className="p-1 rounded-md text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:bg-[var(--bg-base)] transition-colors cursor-pointer"
                                  title="ویرایش فاکتور"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteLog(log)}
                                  className="p-1 rounded-md text-[var(--text-secondary)] hover:text-[var(--status-error-text)] hover:bg-[var(--status-error-bg)] transition-colors cursor-pointer"
                                  title="حذف سابقه"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <Pagination
                  currentPage={validPage}
                  totalPages={totalPages}
                  totalItems={logsNewestFirst.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={(p) => setCurrentPage(p)}
                  onItemsPerPageChange={(sz) => {
                    setItemsPerPage(sz);
                    setCurrentPage(1);
                  }}
                  itemsPerPageOptions={[5, 10, 15]}
                  itemLabel="سابقه"
                />
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal for Editing a Purchase Log */}
      {editingLog && (
        <Modal
          isOpen={!!editingLog}
          onClose={() => setEditingLog(null)}
          title={`ویرایش سابقه ${editingLog.reason === 'purchase' ? 'خرید' : 'اصلاح'}: ${ingredient.name}`}
          description="ویرایش تاریخ، مقدار و مبلغ ثبت‌شده و محاسبه مجدد میانگین بهای انبار"
          maxWidth="lg"
        >
          <form onSubmit={handleSaveEditLog} noValidate className="space-y-3.5">
            <JalaliDatePicker
              label="تاریخ فاکتور"
              value={editDate}
              onChange={setEditDate}
            />

            <div>
              <label className="block text-xs font-extrabold text-[var(--text-primary)] mb-1">
                مقدار ({unitLabel}) <span className="text-[var(--status-error-text)]">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={editQty === '' ? '' : toPersianDigits(editQty)}
                onChange={(e) => {
                  const val = e.target.value;
                  const eng = toEnglishDigits(val).replace(',', '.').replace('/', '.');
                  if (eng === '') setEditQty('');
                  else if (/^\d*\.?\d*$/.test(eng)) setEditQty(val);
                }}
                className="w-full h-10 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3.5 py-2 text-xs font-bold text-[var(--text-primary)] text-right dir-rtl focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-all"
              />
            </div>

            {editingLog.reason === 'purchase' && (
              <SmartMoneyInput
                label="مبلغ کل فاکتور (تومان)"
                value={editTotalPrice}
                onChange={(val) => setEditTotalPrice(val)}
                placeholder="مبلغ کل"
                suffix="تومان"
              />
            )}

            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                توضیحات (اختیاری)
              </label>
              <input
                type="text"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="توضیحات فاکتور"
                className="w-full h-10 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3.5 py-2 text-xs font-medium text-[var(--text-primary)] focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-all"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingLog(null)}
                className="h-10 px-4 rounded-xl text-xs font-bold"
              >
                انصراف
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmittingEdit}
                className="h-10 px-5 rounded-xl text-xs font-black bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]"
              >
                {isSubmittingEdit ? 'در حال ذخیره...' : 'ذخیره تغییرات و محاسبه مجدد'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
};
