import React, { useState, useMemo } from 'react';
import {
  Utensils,
  Search,
  ArrowUpDown,
  TrendingUp,
  Award,
  Layers,
  Sparkles,
  ShoppingBag,
  Coins,
  Percent,
  CheckCircle2,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { formatToman, formatNumber, toPersianDigits, roundCurrency, cn } from '../../lib/utils';

export interface SoldItemDetail {
  menuItemId: string;
  name: string;
  totalQty: number;
  totalRev: number;
  totalCost: number;
}

interface TopSoldItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  filterTitle: string;
  filterSubtitle?: string;
  items: SoldItemDetail[];
}

type SortField = 'revenue' | 'quantity' | 'profit' | 'margin';

export const TopSoldItemsModal: React.FC<TopSoldItemsModalProps> = ({
  isOpen,
  onClose,
  filterTitle,
  filterSubtitle,
  items,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('revenue');

  // Overall totals for KPI Banner
  const totalQuantity = useMemo(() => items.reduce((acc, curr) => acc + curr.totalQty, 0), [items]);
  const totalRevenue = useMemo(() => items.reduce((acc, curr) => acc + curr.totalRev, 0), [items]);
  const totalCost = useMemo(() => items.reduce((acc, curr) => acc + curr.totalCost, 0), [items]);
  const totalGrossProfit = totalRevenue - totalCost;
  const overallMargin = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;

  // Filter and Sort Items
  const processedItems = useMemo(() => {
    let result = [...items];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((item) => item.name.toLowerCase().includes(q));
    }

    result.sort((a, b) => {
      const profitA = a.totalRev - a.totalCost;
      const profitB = b.totalRev - b.totalCost;
      const marginA = a.totalRev > 0 ? (profitA / a.totalRev) * 100 : 0;
      const marginB = b.totalRev > 0 ? (profitB / b.totalRev) * 100 : 0;

      switch (sortField) {
        case 'revenue':
          return b.totalRev - a.totalRev;
        case 'quantity':
          return b.totalQty - a.totalQty;
        case 'profit':
          return profitB - profitA;
        case 'margin':
          return marginB - marginA;
        default:
          return b.totalRev - a.totalRev;
      }
    });

    return result;
  }, [items, searchQuery, sortField]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="گزارش تحلیلی کامل فروش آیتم‌های منو"
      description={`فهرست جامع و رتبه‌بندی محصولات بر اساس فروش و سودآوری (${filterTitle})`}
      maxWidth="4xl"
    >
      <div className="space-y-4" id="top-sold-items-modal-content">
        {/* KPI Top Highlights Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>کل درآمد فروش</span>
            </div>
            <div className="text-base sm:text-lg font-black text-emerald-950 dark:text-emerald-200 mt-1">
              {formatToman(totalRevenue).text}
            </div>
            <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold mt-0.5">
              {toPersianDigits(items.length)} آیتم ثبت‌شده
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/50">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-800 dark:text-blue-300">
              <Utensils className="h-3.5 w-3.5" />
              <span>تیراژ کل سفارشات</span>
            </div>
            <div className="text-base sm:text-lg font-black text-blue-950 dark:text-blue-200 mt-1">
              {toPersianDigits(totalQuantity)} <span className="text-xs font-normal">پرس/عدد</span>
            </div>
            <div className="text-[10px] text-blue-700 dark:text-blue-400 font-bold mt-0.5">
              میانگین: {toPersianDigits(items.length > 0 ? Math.round(totalQuantity / items.length) : 0)} عدد به ازای هر غذا
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-violet-50/80 dark:bg-violet-950/30 border border-violet-200/80 dark:border-violet-800/50">
            <div className="flex items-center gap-1.5 text-xs font-bold text-violet-800 dark:text-violet-300">
              <Coins className="h-3.5 w-3.5" />
              <span>سود ناخالص کل</span>
            </div>
            <div className="text-base sm:text-lg font-black text-violet-950 dark:text-violet-200 mt-1">
              {formatToman(totalGrossProfit).text}
            </div>
            <div className="text-[10px] text-violet-700 dark:text-violet-400 font-bold mt-0.5">
              پس از کسر هزینه مواد اولیه
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
              <Percent className="h-3.5 w-3.5" />
              <span>حاشیه سود میانگین</span>
            </div>
            <div className="text-base sm:text-lg font-black text-amber-950 dark:text-amber-200 mt-1">
              {toPersianDigits(roundCurrency(overallMargin))}٪
            </div>
            <div className="text-[10px] text-amber-700 dark:text-amber-400 font-bold mt-0.5">
              بهای مواد: {formatToman(totalCost).text}
            </div>
          </div>
        </div>

        {/* Search and Sort Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] p-2.5 rounded-2xl border border-[var(--border-subtle)]">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
            <input
              id="top-sold-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در بین نام آیتم‌های منو..."
              className="w-full h-9 pr-9 pl-4 rounded-xl border border-[var(--border-subtle)] bg-white dark:bg-[var(--bg-card)] text-xs font-bold text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)]"
            />
          </div>

          {/* Sort Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] shrink-0 ml-1 flex items-center gap-1">
              <ArrowUpDown className="h-3 w-3" />
              <span>مرتب‌سازی:</span>
            </span>

            <button
              type="button"
              onClick={() => setSortField('revenue')}
              className={cn(
                'px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
                sortField === 'revenue'
                  ? 'bg-[var(--brand-primary)] text-white shadow-xs'
                  : 'bg-white dark:bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]'
              )}
            >
              بیشترین درآمد
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
              بیشترین تعداد
            </button>

            <button
              type="button"
              onClick={() => setSortField('profit')}
              className={cn(
                'px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
                sortField === 'profit'
                  ? 'bg-[var(--brand-primary)] text-white shadow-xs'
                  : 'bg-white dark:bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]'
              )}
            >
              بیشترین سود
            </button>

            <button
              type="button"
              onClick={() => setSortField('margin')}
              className={cn(
                'px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
                sortField === 'margin'
                  ? 'bg-[var(--brand-primary)] text-white shadow-xs'
                  : 'bg-white dark:bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]'
              )}
            >
              حاشیه سود ٪
            </button>
          </div>
        </div>

        {/* Detailed List */}
        {processedItems.length === 0 ? (
          <div className="text-center py-10 rounded-2xl bg-[var(--bg-base)] border border-dashed border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] font-bold">
            {searchQuery ? 'هیچ آیتمی با عنوان جستجو شده یافت نشد.' : 'هیچ رکوردی برای نمایش وجود ندارد.'}
          </div>
        ) : (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-0.5 custom-scrollbar">
            {processedItems.map((item, idx) => {
              const profit = item.totalRev - item.totalCost;
              const margin = item.totalRev > 0 ? (profit / item.totalRev) * 100 : 0;
              const revShare = totalRevenue > 0 ? (item.totalRev / totalRevenue) * 100 : 0;

              // Rank styling
              const isRank1 = idx === 0 && !searchQuery;
              const isRank2 = idx === 1 && !searchQuery;
              const isRank3 = idx === 2 && !searchQuery;

              return (
                <div
                  key={item.menuItemId || idx}
                  className={cn(
                    'p-3 sm:p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[var(--bg-card)]',
                    isRank1 && 'border-amber-300 dark:border-amber-700 bg-amber-50/20 dark:bg-amber-950/10 shadow-xs',
                    isRank2 && 'border-slate-300 dark:border-slate-700 bg-slate-50/20 dark:bg-slate-900/10',
                    isRank3 && 'border-orange-300 dark:border-orange-700 bg-orange-50/20 dark:bg-orange-950/10',
                    !isRank1 && !isRank2 && !isRank3 && 'border-[var(--border-subtle)] hover:border-[var(--border-functional)]'
                  )}
                >
                  {/* Left info: Rank + Title + Share */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        'w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center shrink-0 shadow-2xs',
                        isRank1 && 'bg-amber-400 text-amber-950 ring-2 ring-amber-300/40',
                        isRank2 && 'bg-slate-300 text-slate-900 ring-2 ring-slate-200/40',
                        isRank3 && 'bg-amber-600 text-white ring-2 ring-amber-500/40',
                        !isRank1 && !isRank2 && !isRank3 && 'bg-[var(--bg-base)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
                      )}
                    >
                      {toPersianDigits(idx + 1)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs sm:text-sm text-[var(--text-primary)] truncate">
                          {item.name}
                        </span>
                        {isRank1 && (
                          <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                            محبوب‌ترین 🔥
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)] font-bold flex flex-wrap items-center gap-2 mt-0.5">
                        <span>تیراژ: <strong className="text-[var(--text-primary)]">{toPersianDigits(item.totalQty)} عدد</strong></span>
                        <span>•</span>
                        <span>سهم از کل فروش: <strong className="text-[var(--brand-primary)]">{toPersianDigits(roundCurrency(revShare))}٪</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Right numbers: Revenue, Cost, Profit & Margin */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border-subtle)] shrink-0">
                    {/* Financial details */}
                    <div className="text-right sm:text-left">
                      <div className="text-[10px] text-[var(--text-secondary)] font-bold">فروش کل:</div>
                      <div className="font-black text-xs sm:text-sm text-emerald-950 dark:text-emerald-300">
                        {formatToman(item.totalRev).text}
                      </div>
                      <div className="text-[10px] text-[var(--status-warning-text)] font-medium">
                        بهای مواد: {formatToman(item.totalCost).text}
                      </div>
                    </div>

                    {/* Profit & Margin box */}
                    <div className="p-2 rounded-xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] text-left min-w-[100px]">
                      <div className="text-[9px] text-[var(--text-secondary)] font-bold">سود ناخالص:</div>
                      <div className="font-black text-xs text-[var(--status-success-text)]">
                        {formatToman(profit).text}
                      </div>
                      <div className="text-[10px] font-black text-amber-600 dark:text-amber-400 mt-0.5 flex items-center justify-end gap-1">
                        <span>حاشیه:</span>
                        <span>{toPersianDigits(roundCurrency(margin))}٪</span>
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
          <span>نمایش {toPersianDigits(processedItems.length)} از {toPersianDigits(items.length)} آیتم منو</span>
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl text-xs font-bold">
            بستن پنجره
          </Button>
        </div>
      </div>
    </Modal>
  );
};
