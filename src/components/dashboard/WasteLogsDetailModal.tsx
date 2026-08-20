import React, { useState, useMemo } from 'react';
import {
  Trash2,
  Search,
  ArrowUpDown,
  Filter,
  Calendar,
  AlertTriangle,
  Receipt,
  Scale,
  Sparkles,
  Tag,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { WasteLog } from '../../types';
import { formatToman, formatNumber, toPersianDigits, roundCurrency, cn } from '../../lib/utils';
import { formatJalaliReadable } from '../../lib/jalali';

interface WasteLogsDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  filterTitle: string;
  filterSubtitle?: string;
  wasteLogs: WasteLog[];
}

type SortField = 'cost' | 'date' | 'quantity';

export const WasteLogsDetailModal: React.FC<WasteLogsDetailModalProps> = ({
  isOpen,
  onClose,
  filterTitle,
  filterSubtitle,
  wasteLogs,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReason, setSelectedReason] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('cost');

  // Extract all unique reasons for filter tabs
  const allReasons = useMemo(() => {
    const reasons = new Set<string>();
    wasteLogs.forEach((log) => {
      if (log.reason && log.reason.trim()) {
        reasons.add(log.reason.trim());
      }
    });
    return Array.from(reasons);
  }, [wasteLogs]);

  // Overall totals
  const totalCost = useMemo(() => wasteLogs.reduce((acc, curr) => acc + (curr.cost || 0), 0), [wasteLogs]);
  const avgCostPerIncident = wasteLogs.length > 0 ? Math.round(totalCost / wasteLogs.length) : 0;

  // Most frequent reason
  const mostFrequentReason = useMemo(() => {
    if (wasteLogs.length === 0) return '—';
    const counts: Record<string, number> = {};
    wasteLogs.forEach((w) => {
      const r = w.reason?.trim() || 'نامشخص';
      counts[r] = (counts[r] || 0) + 1;
    });
    let topReason = 'نامشخص';
    let maxCount = 0;
    Object.entries(counts).forEach(([r, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topReason = r;
      }
    });
    return topReason;
  }, [wasteLogs]);

  // Filter & Sort logic
  const processedLogs = useMemo(() => {
    let result = [...wasteLogs];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (log) =>
          log.itemName.toLowerCase().includes(q) ||
          (log.reason && log.reason.toLowerCase().includes(q))
      );
    }

    if (selectedReason !== 'all') {
      result = result.filter((log) => (log.reason?.trim() || 'نامشخص') === selectedReason);
    }

    result.sort((a, b) => {
      switch (sortField) {
        case 'cost':
          return (b.cost || 0) - (a.cost || 0);
        case 'date':
          return (b.date || '').localeCompare(a.date || '');
        case 'quantity':
          return (b.quantity || 0) - (a.quantity || 0);
        default:
          return (b.cost || 0) - (a.cost || 0);
      }
    });

    return result;
  }, [wasteLogs, searchQuery, selectedReason, sortField]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="گزارش جامع و تفکیکی ضایعات انبار و تولید"
      description={`فهرست ریز خسارات، تلفات مواد اولیه و دلایل ضایعات (${filterTitle})`}
      maxWidth="4xl"
    >
      <div className="space-y-4" id="waste-logs-detail-modal-content">
        {/* KPI Top Highlights Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/50">
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800 dark:text-rose-300">
              <Trash2 className="h-3.5 w-3.5" />
              <span>کل خسارت مالی ضایعات</span>
            </div>
            <div className="text-base sm:text-lg font-black text-rose-950 dark:text-rose-200 mt-1">
              {formatToman(totalCost).text}
            </div>
            <div className="text-[10px] text-rose-700 dark:text-rose-400 font-bold mt-0.5">
              مجموع خسارت تحمیل‌شده به دوره
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
              <Receipt className="h-3.5 w-3.5" />
              <span>تعداد دفعات ثبت</span>
            </div>
            <div className="text-base sm:text-lg font-black text-amber-950 dark:text-amber-200 mt-1">
              {toPersianDigits(wasteLogs.length)} <span className="text-xs font-normal">مورد</span>
            </div>
            <div className="text-[10px] text-amber-700 dark:text-amber-400 font-bold mt-0.5">
              در طول بازه انتخابی
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[var(--bg-base)] border border-[var(--border-subtle)]">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)]">
              <Scale className="h-3.5 w-3.5" />
              <span>میانگین خسارت هر ثبت</span>
            </div>
            <div className="text-base sm:text-lg font-black text-[var(--text-primary)] mt-1">
              {formatToman(avgCostPerIncident).text}
            </div>
            <div className="text-[10px] text-[var(--text-secondary)] font-bold mt-0.5">
              میانگین ارزش تلفات هر رویداد
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-orange-50/80 dark:bg-orange-950/30 border border-orange-200/80 dark:border-orange-800/50">
            <div className="flex items-center gap-1.5 text-xs font-bold text-orange-800 dark:text-orange-300">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>علت عمده ضایعات</span>
            </div>
            <div className="text-xs sm:text-sm font-black text-orange-950 dark:text-orange-200 mt-1 truncate">
              {mostFrequentReason}
            </div>
            <div className="text-[10px] text-orange-700 dark:text-orange-400 font-bold mt-0.5">
              دارای بالاترین تکرار در ثبت‌ها
            </div>
          </div>
        </div>

        {/* Search, Category Filter, and Sort Toolbar */}
        <div className="space-y-2.5 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] p-2.5 rounded-2xl border border-[var(--border-subtle)]">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {/* Search Box */}
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
              <input
                id="waste-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجوی نام ماده اولیه، آیتم ضایعاتی یا علت..."
                className="w-full h-9 pr-9 pl-4 rounded-xl border border-[var(--border-subtle)] bg-white dark:bg-[var(--bg-card)] text-xs font-bold text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)]"
              />
            </div>

            {/* Sort Controls */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[11px] font-bold text-[var(--text-secondary)] shrink-0 ml-1 flex items-center gap-1">
                <ArrowUpDown className="h-3 w-3" />
                <span>مرتب‌سازی:</span>
              </span>

              <button
                type="button"
                onClick={() => setSortField('cost')}
                className={cn(
                  'px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
                  sortField === 'cost'
                    ? 'bg-[var(--brand-primary)] text-white shadow-xs'
                    : 'bg-white dark:bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]'
                )}
              >
                بیشترین خسارت
              </button>

              <button
                type="button"
                onClick={() => setSortField('date')}
                className={cn(
                  'px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
                  sortField === 'date'
                    ? 'bg-[var(--brand-primary)] text-white shadow-xs'
                    : 'bg-white dark:bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]'
                )}
              >
                جدیدترین تاریخ
              </button>

              <button
                type="button"
                onClick={() => setSortField('quantity')}
                className={cn(
                  'px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
                  sortField === 'quantity'
                    ? 'bg-[var(--brand-primary)] text-white shadow-xs'
                    : 'bg-white dark:bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]'
                )}
              >
                بیشترین مقدار
              </button>
            </div>
          </div>

          {/* Filter by Reason Chips */}
          {allReasons.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1">
              <span className="text-[10px] font-bold text-[var(--text-secondary)] shrink-0 flex items-center gap-1">
                <Tag className="h-3 w-3" />
                <span>فیلتر علت:</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedReason('all')}
                className={cn(
                  'px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap',
                  selectedReason === 'all'
                    ? 'bg-[var(--brand-primary)] text-white'
                    : 'bg-white dark:bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
                )}
              >
                همه علل ({toPersianDigits(wasteLogs.length)})
              </button>
              {allReasons.map((r) => {
                const count = wasteLogs.filter((w) => (w.reason?.trim() || 'نامشخص') === r).length;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSelectedReason(r)}
                    className={cn(
                      'px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap',
                      selectedReason === r
                        ? 'bg-rose-600 text-white'
                        : 'bg-white dark:bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
                    )}
                  >
                    {r} ({toPersianDigits(count)})
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Detailed Waste Records List */}
        {processedLogs.length === 0 ? (
          <div className="text-center py-10 rounded-2xl bg-[var(--bg-base)] border border-dashed border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] font-bold">
            {searchQuery || selectedReason !== 'all'
              ? 'هیچ موردی منطبق با فیلترها و جستجوی شما یافت نشد.'
              : 'هیچ ضایعاتی در این بازه زمانی ثبت نشده است.'}
          </div>
        ) : (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-0.5 custom-scrollbar">
            {processedLogs.map((log, idx) => {
              const formattedDate = formatJalaliReadable(log.date) || toPersianDigits(log.date);
              const costShare = totalCost > 0 ? (log.cost / totalCost) * 100 : 0;

              return (
                <div
                  key={log.id || idx}
                  className="p-3 sm:p-3.5 rounded-2xl border border-[var(--border-subtle)] hover:border-rose-300 dark:hover:border-rose-800 bg-white dark:bg-[var(--bg-card)] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                >
                  {/* Left details */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5 border border-rose-100 dark:border-rose-900/50">
                      <Trash2 className="h-4 w-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-xs sm:text-sm text-[var(--text-primary)]">
                          {log.itemName}
                        </span>
                        {log.reason && (
                          <span className="px-2 py-0.5 rounded-md bg-[var(--bg-base)] text-[10px] font-extrabold text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                            علت: {log.reason}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-[var(--text-secondary)] font-bold flex flex-wrap items-center gap-2 mt-1">
                        <span>مقدار تلف‌شده: <strong className="text-[var(--text-primary)]">{formatNumber(log.quantity)} {log.unit}</strong></span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formattedDate}</span>
                        </span>
                        <span>•</span>
                        <span>سهم از کل ضایعات: <strong className="text-rose-600 dark:text-rose-400">{toPersianDigits(roundCurrency(costShare))}٪</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Cost Highlight */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border-subtle)] shrink-0">
                    <div className="p-2 sm:p-2.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 text-left min-w-[120px]">
                      <div className="text-[9px] text-rose-700 dark:text-rose-300 font-bold">خسارت مالی برآوردشده:</div>
                      <div className="font-black text-xs sm:text-sm text-rose-700 dark:text-rose-400">
                        {formatToman(log.cost).text}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal Footer Summary */}
        <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-bold text-[var(--text-secondary)]">
          <span>نمایش {toPersianDigits(processedLogs.length)} از {toPersianDigits(wasteLogs.length)} مورد ضایعات</span>
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl text-xs font-bold">
            بستن پنجره
          </Button>
        </div>
      </div>
    </Modal>
  );
};
