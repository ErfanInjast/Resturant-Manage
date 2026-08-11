import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'motion/react';
import {
  Zap,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Trash2,
  Receipt,
  Calendar,
  CheckCircle2,
  Search,
  X,
  Info,
  Edit2,
  Plus,
  Minus,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  UtensilsCrossed,
  Filter,
} from 'lucide-react';
import { db, syncAndRecalculateAllData } from '../../db';
import { useAppStore } from '../../store/useAppStore';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Pagination } from '../ui/Pagination';
import { JalaliDatePicker } from '../ui/JalaliDatePicker';
import {
  formatToman,
  toPersianDigits,
  toEnglishDigits,
  roundCurrency,
  cn,
} from '../../lib/utils';
import {
  getJalaliDate,
  formatJalali,
  formatJalaliReadable,
  parseJalaliStringToGregorian,
  normalizeDateStr,
  getTodayJalaliIso,
  calculateWorkingDays,
} from '../../lib/jalali';
import {
  calculateFinancialMetrics,
  calculateTotalMonthlyOverhead,
  findEarliestRecordDate,
  DatePreset,
} from '../../lib/financial';
import type { DailySalesRecord, DailySalesItem, MenuItem } from '../../types';

export const SimpleModeDashboard: React.FC = () => {
  const { notify, isMobileScreen } = useAppStore();

  // Date Filter Preset State
  const [datePreset, setDatePreset] = useState<'today' | 'last7' | 'last30' | 'currentMonth'>('currentMonth');

  // Quick Sales Entry Form State
  const [salesDate, setSalesDate] = useState<string>(getTodayJalaliIso());
  const [salesItemsMap, setSalesItemsMap] = useState<Record<number, number>>({});

  // Menu Search, Category Filter & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('همه');
  const [menuCurrentPage, setMenuCurrentPage] = useState<number>(1);
  const [menuItemsPerPage, setMenuItemsPerPage] = useState<number>(8);

  // History Invoice Expansion State
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<number | null>(null);

  // Live Database Queries
  const settingsQuery = useLiveQuery(() => db.settings.get('config'));
  const salesRecordsQuery = useLiveQuery(() => db.dailySales.orderBy('date').reverse().toArray());
  const wasteLogsQuery = useLiveQuery(() => db.wasteLogs.toArray());
  const menuItemsQuery = useLiveQuery(() => db.menuItems.toArray());

  const settings = settingsQuery ?? {
    monthlyFixedCosts: { rent: 0, utilities: 0, salaries: 0, marketing: 0, insurance: 0, general: 0, maintenance: 0, delivery: 0 },
    workingDaysPerMonth: 30,
  };
  const salesRecords = salesRecordsQuery ?? [];
  const wasteLogs = wasteLogsQuery ?? [];
  const menuItems = menuItemsQuery ?? [];

  // Check if a sales record already exists for selected salesDate
  const existingDateRecord = salesRecords.find(
    (r) => normalizeDateStr(r.date) === normalizeDateStr(salesDate)
  );

  // Auto-populate form when salesDate changes
  React.useEffect(() => {
    const cleanDate = normalizeDateStr(salesDate);
    if (!cleanDate) return;

    const recordForDate = salesRecords.find(
      (r) => normalizeDateStr(r.date) === cleanDate
    );

    if (recordForDate && recordForDate.items && Array.isArray(recordForDate.items)) {
      const map: Record<number, number> = {};
      recordForDate.items.forEach((item) => {
        if (item.menuItemId && item.quantity > 0) {
          map[Number(item.menuItemId)] = item.quantity;
        }
      });
      setSalesItemsMap(map);
    } else {
      setSalesItemsMap({});
    }
  }, [salesDate, salesRecordsQuery]);

  const earliestRecordDate = React.useMemo(() => {
    return findEarliestRecordDate(salesRecords, wasteLogs);
  }, [salesRecords, wasteLogs]);

  // Compute standardized financial metrics
  const {
    totalRevenue: revenue,
    totalCOGS: cogs,
    totalWaste,
    grossProfit,
    periodOverhead,
    netProfit,
    foodCostPercent,
    netMarginPercent,
    filterTitle,
  } = calculateFinancialMetrics(
    salesRecords,
    wasteLogs,
    settings,
    datePreset as DatePreset,
    '',
    earliestRecordDate
  );

  // Menu categories with item counts
  const categoriesMap = React.useMemo(() => {
    const map: Record<string, number> = { 'همه': menuItems.length };
    menuItems.forEach((m) => {
      const cat = m.category || 'عمومی';
      map[cat] = (map[cat] || 0) + 1;
    });
    return map;
  }, [menuItems]);

  const categoriesList = Object.keys(categoriesMap);

  // Filtered Menu Items based on Search and Selected Category
  const filteredMenuItems = menuItems.filter((item) => {
    const matchesSearch =
      !searchQuery.trim() ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase().trim()));
    const matchesCategory = selectedCategory === 'همه' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalFilteredMenuItems = filteredMenuItems.length;
  const totalMenuPages = Math.ceil(totalFilteredMenuItems / menuItemsPerPage) || 1;
  const paginatedMenuItems = filteredMenuItems.slice(
    (menuCurrentPage - 1) * menuItemsPerPage,
    menuCurrentPage * menuItemsPerPage
  );

  // Selected Items Live Calculations
  const selectedItemsList = Object.entries(salesItemsMap)
    .filter(([_, qtyVal]) => Number(qtyVal) > 0)
    .map(([menuItemIdStr, qtyVal]) => {
      const qty = Number(qtyVal);
      const id = parseInt(menuItemIdStr, 10);
      const mi = menuItems.find((m) => Number(m.id) === id);
      const unitPrice = mi?.sellingPrice || 0;
      const unitCost = mi?.primeCost || mi?.totalMaterialCost || 0;
      return {
        menuItemId: id,
        menuItemName: mi?.name || 'محصول',
        category: mi?.category || 'عمومی',
        quantity: qty,
        unitPrice,
        totalPrice: roundCurrency(unitPrice * qty),
        unitCost,
        totalCost: roundCurrency(unitCost * qty),
      };
    });

  const totalSelectedCount = selectedItemsList.reduce((acc, i) => acc + i.quantity, 0);
  const quickTotalRevenue = selectedItemsList.reduce((acc, i) => acc + i.totalPrice, 0);
  const quickTotalCOGS = selectedItemsList.reduce((acc, i) => acc + i.totalCost, 0);

  // Stepper handlers
  const handleItemQtyChange = (menuItemId: number, delta: number) => {
    const numericId = Number(menuItemId);
    setSalesItemsMap((prev) => {
      const current = prev[numericId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [numericId]: next };
    });
  };

  const handleSetItemQty = (menuItemId: number, valStr: string) => {
    const numericId = Number(menuItemId);
    const rawDigits = toEnglishDigits(valStr);
    const qty = Math.max(0, parseInt(rawDigits, 10) || 0);
    setSalesItemsMap((prev) => ({ ...prev, [numericId]: qty }));
  };

  const handleResetForm = () => {
    setSalesItemsMap({});
  };

  // Save Quick Sales Record
  const handleSaveQuickSales = async () => {
    const cleanDate = normalizeDateStr(salesDate) || getTodayJalaliIso();
    if (selectedItemsList.length === 0) {
      return notify.warning('آیتمی انتخاب نشده است', 'لطفاً تعداد حداقل یک محصول را وارد کنید.');
    }

    const calculatedItems: DailySalesItem[] = selectedItemsList.map((i) => ({
      menuItemId: i.menuItemId,
      menuItemName: i.menuItemName,
      quantity: i.quantity,
      unitSellingPrice: i.unitPrice,
      unitCost: i.unitCost,
      totalRevenue: i.totalPrice,
      totalCost: i.totalCost,
    }));

    const salesRecordData = {
      date: cleanDate,
      items: calculatedItems,
      totalRevenue: quickTotalRevenue,
      totalCOGS: quickTotalCOGS,
      totalWasteCost: roundCurrency(quickTotalRevenue * 0.02),
      netProfit: roundCurrency(quickTotalRevenue - quickTotalCOGS),
      createdAt: new Date().toISOString(),
    };

    try {
      if (existingDateRecord && existingDateRecord.id) {
        await db.dailySales.put({
          ...salesRecordData,
          id: existingDateRecord.id,
        });
        notify.success('فاکتور فروش بروزرسانی شد', `اطلاعات فروش تاریخ ${formatJalaliReadable(cleanDate)} با مبلغ ${formatToman(quickTotalRevenue).text} بروزرسانی گردید.`);
      } else {
        await db.dailySales.add(salesRecordData as DailySalesRecord);
        notify.success('فروش ثبت شد', `فاکتور فروش جدید برای تاریخ ${formatJalaliReadable(cleanDate)} با موفقیت ثبت شد.`);
      }

      await syncAndRecalculateAllData();
    } catch (err) {
      console.error(err);
      notify.error('خطا در ذخیره‌سازی', 'مشکلی در ثبت فاکتور به وجود آمد.');
    }
  };

  // Delete invoice
  const handleDeleteInvoice = async (id: number, dateStr: string) => {
    if (!confirm(`آیا از حذف فاکتور فروش تاریخ ${formatJalaliReadable(dateStr)} اطمینان دارید؟`)) return;
    try {
      await db.dailySales.delete(id);
      await syncAndRecalculateAllData();
      notify.success('فاکتور حذف شد', 'فاکتور انتخاب شده حذف گردید.');
    } catch (err) {
      notify.error('خطا در حذف', 'مشکلی در حذف فاکتور رخ داد.');
    }
  };

  return (
    <div className="space-y-6 pt-2 pb-24 dir-rtl font-['Vazirmatn',sans-serif] text-right">
      {/* HEADER STATUS & FILTER BAR */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] shrink-0">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                  داشبورد سریع و ثبت فاکتور روزانه
                </h1>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-[var(--status-success-text)] dark:text-emerald-300 border border-[var(--status-success-text)]/30 dark:border-[var(--status-success-text)]/30 font-extrabold">
                  حالت ساده POS
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-medium mt-0.5">
                نمای کلی سود و فروش به همراه پنل لمسی ثبت سریع محصولات منو
              </p>
            </div>
          </div>

          {/* Date Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto custom-scrollbar pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setDatePreset('today')}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer',
                datePreset === 'today'
                  ? 'bg-[var(--bg-card)] dark:bg-[var(--brand-primary)] text-white shadow-xs'
                  : 'bg-[var(--bg-base)] dark:bg-[var(--bg-card)] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] hover:bg-stone-200'
              )}
            >
              امروز
            </button>
            <button
              type="button"
              onClick={() => setDatePreset('last7')}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer',
                datePreset === 'last7'
                  ? 'bg-[var(--bg-card)] dark:bg-[var(--brand-primary)] text-white shadow-xs'
                  : 'bg-[var(--bg-base)] dark:bg-[var(--bg-card)] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] hover:bg-stone-200'
              )}
            >
              ۷ روز اخیر
            </button>
            <button
              type="button"
              onClick={() => setDatePreset('last30')}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer',
                datePreset === 'last30'
                  ? 'bg-[var(--bg-card)] dark:bg-[var(--brand-primary)] text-white shadow-xs'
                  : 'bg-[var(--bg-base)] dark:bg-[var(--bg-card)] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] hover:bg-stone-200'
              )}
            >
              ۳۰ روز اخیر
            </button>
            <button
              type="button"
              onClick={() => setDatePreset('currentMonth')}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer',
                datePreset === 'currentMonth'
                  ? 'bg-[var(--bg-card)] dark:bg-[var(--brand-primary)] text-white shadow-xs'
                  : 'bg-[var(--bg-base)] dark:bg-[var(--bg-card)] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] hover:bg-stone-200'
              )}
            >
              ماه جاری
            </button>
          </div>
        </div>
      </div>

      {/* 4 PRIMARY EXECUTIVE KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: REVENUE */}
        <Card className="p-4 bg-white dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] space-y-2 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">فروش و درآمد کل</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[var(--status-success-text)] dark:text-[var(--status-success-text)]">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-900 dark:text-emerald-100 tracking-tight">
            {formatToman(revenue).text}
          </div>
          <div className="border-t border-[var(--border-subtle)] dark:border-[var(--border-subtle)] pt-2 text-[11px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-medium">
            بازه: <span className="font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">{filterTitle}</span>
          </div>
        </Card>

        {/* KPI 2: COST OF GOODS */}
        <Card className="p-4 bg-white dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">بهای تمام‌شده مواد اولیه</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-[var(--status-warning-text)] dark:text-[var(--status-warning-text)]">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[var(--status-warning-text)] dark:text-amber-100 tracking-tight">
            {formatToman(cogs).text}
          </div>
          <div className="border-t border-[var(--border-subtle)] dark:border-[var(--border-subtle)] pt-2 text-[11px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-medium flex items-center justify-between">
            <span>درصد هزینه غذا (Food Cost):</span>
            <span className="font-bold text-[var(--status-warning-text)] dark:text-[var(--status-warning-text)]">{toPersianDigits(foodCostPercent)}٪</span>
          </div>
        </Card>

        {/* KPI 3: OVERHEAD & WASTE */}
        <Card className="p-4 bg-white dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">سربار جاری و ضایعات</span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-[var(--status-error-text)] dark:text-[var(--status-error-text)]">
              <Trash2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-900 dark:text-rose-100 tracking-tight">
            {formatToman(periodOverhead + totalWaste).text}
          </div>
          <div className="border-t border-[var(--border-subtle)] dark:border-[var(--border-subtle)] pt-2 text-[11px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-medium">
            هزینه‌های ثابت و ضایعات محاسبه‌شده
          </div>
        </Card>

        {/* KPI 4: NET PROFIT */}
        <Card
          className={cn(
            'p-4 border space-y-2 shadow-2xs transition-colors',
            netProfit >= 0
              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-[var(--status-success-text)]/30 dark:border-[var(--status-success-text)]'
              : 'bg-rose-50/50 dark:bg-rose-950/20 border-[var(--status-error-text)]/30 dark:border-[var(--status-error-text)]'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-primary)] dark:text-[var(--text-secondary)]">سود خالص نهایی</span>
            <div className={cn('p-2 rounded-xl', netProfit >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/60 text-[var(--status-success-text)] dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-900/60 text-[var(--status-error-text)] dark:text-rose-300')}>
              {netProfit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            </div>
          </div>
          <div className={cn('text-2xl font-black tracking-tight', netProfit >= 0 ? 'text-emerald-950 dark:text-emerald-100' : 'text-rose-950 dark:text-rose-100')}>
            {formatToman(netProfit).text}
          </div>
          <div className="border-t border-[var(--border-subtle)] dark:border-[var(--border-subtle)] pt-2 text-[11px] font-medium flex items-center justify-between">
            <span>حاشیه سود خالص:</span>
            <span className="font-extrabold">{toPersianDigits(netMarginPercent)}٪</span>
          </div>
        </Card>
      </div>

      {/* POS QUICK ENTRY SECTION */}
      <Card className="p-4 sm:p-6 bg-white dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] space-y-5 shadow-sm">
        {/* Entry Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[var(--border-subtle)] dark:border-[var(--border-subtle)] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[var(--status-success-text)]/10 text-[var(--status-success-text)] shrink-0">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-black text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                  ثبت فاکتور فروش (ثبت سریع منو)
                </h2>
                {existingDateRecord && (
                  <span className="text-[10px] px-2.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-[var(--status-warning-text)] dark:text-[var(--status-warning-text)] border border-[var(--status-warning-text)]/30 dark:border-[var(--status-warning-text)]/30 font-bold">
                    ویرایش فاکتور قبلی
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-medium mt-0.5">
                تعداد هر آیتم فروش‌رفته را انتخاب کرده و دکمه ثبت نهایی را بفشارید
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-xs font-bold text-[var(--text-primary)] dark:text-[var(--text-secondary)] shrink-0">تاریخ فاکتور:</span>
            <JalaliDatePicker
              value={salesDate}
              onChange={(newIso) => setSalesDate(newIso)}
              showSteppers={true}
              compact={true}
            />
          </div>
        </div>

        {/* Search & Category Filter Toolbar */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setMenuCurrentPage(1);
                }}
                placeholder="جستجوی سریع محصول منو..."
                className="w-full h-10 pr-9 pl-8 rounded-xl border border-[var(--border-subtle)] dark:border-[var(--border-functional)] bg-[var(--bg-base)] dark:bg-[var(--bg-card)] text-xs font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--status-success-text)] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-secondary)] p-1 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Clear button if items selected */}
            {totalSelectedCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetForm}
                className="h-10 text-xs text-[var(--text-secondary)] hover:text-[var(--status-error-text)] dark:text-[var(--text-secondary)] dark:hover:text-[var(--status-error-text)] gap-1.5 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>پاکسازی فرم ({toPersianDigits(totalSelectedCount)})</span>
              </Button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
            {categoriesList.map((cat) => {
              const count = categoriesMap[cat] || 0;
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat);
                    setMenuCurrentPage(1);
                  }}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5',
                    isSelected
                      ? 'bg-[var(--status-success-text)] text-white shadow-xs'
                      : 'bg-[var(--bg-base)] dark:bg-[var(--bg-card)] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] hover:bg-stone-200 dark:hover:bg-stone-700'
                  )}
                >
                  <span>{cat}</span>
                  <span
                    className={cn(
                      'px-1.5 py-0.2 text-[10px] rounded-full font-black',
                      isSelected ? 'bg-white/20 text-white' : 'bg-stone-200 dark:bg-stone-700 text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'
                    )}
                  >
                    {toPersianDigits(count)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Cards POS Grid */}
        {menuItems.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--text-secondary)] border border-dashed border-[var(--border-subtle)] dark:border-[var(--border-subtle)] rounded-2xl space-y-2">
            <UtensilsCrossed className="h-8 w-8 mx-auto text-stone-300 dark:text-[var(--text-primary)]" />
            <p className="font-bold">هیچ آیتم منویی ثبت نشده است.</p>
            <p className="text-[11px] text-[var(--text-secondary)]">
              از بخش منو و رسپی در حالت دسکتاپ می‌توانید محصولات منو را تعریف و قیمت‌گذاری کنید.
            </p>
          </div>
        ) : paginatedMenuItems.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--text-secondary)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] rounded-2xl">
            هیچ محصولی با عنوان جستجو شده یافت نشد.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {paginatedMenuItems.map((item) => {
                const numId = Number(item.id);
                const qty = salesItemsMap[numId] || 0;
                const itemTotalPrice = (item.sellingPrice || 0) * qty;

                return (
                  <div
                    key={item.id}
                    className={cn(
                      'p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 relative',
                      qty > 0
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-[var(--status-success-text)] shadow-xs'
                        : 'bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border-[var(--border-subtle)] dark:border-[var(--border-subtle)] hover:border-[var(--border-functional)] dark:hover:border-stone-700'
                    )}
                  >
                    {/* Top Row: Category & Selected Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-stone-200/80 dark:bg-[var(--bg-card)] text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                        {item.category || 'عمومی'}
                      </span>

                      {qty > 0 && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-[var(--status-success-text)] text-white">
                          مجموع: {formatToman(itemTotalPrice).text}
                        </span>
                      )}
                    </div>

                    {/* Title & Price */}
                    <div className="space-y-1">
                      <h3 className="text-xs font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] line-clamp-1">
                        {item.name}
                      </h3>
                      <p className="text-[11px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                        قیمت واحد: <span className="text-[var(--text-primary)] dark:text-[var(--text-primary)]">{formatToman(item.sellingPrice || 0).text}</span>
                      </p>
                    </div>

                    {/* Stepper Touch Control */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
                      <span className="text-[11px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">تعداد:</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleItemQtyChange(numId, -1)}
                          disabled={qty === 0}
                          className={cn(
                            'w-8 h-8 rounded-xl font-black flex items-center justify-center text-sm transition-colors cursor-pointer',
                            qty > 0
                              ? 'bg-[var(--status-error-bg)] text-[var(--status-error-text)] hover:opacity-90'
                              : 'bg-[var(--bg-base)] text-[var(--text-secondary)] opacity-50 cursor-not-allowed'
                          )}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>

                        <input
                          type="text"
                          value={toPersianDigits(qty)}
                          onChange={(e) => handleSetItemQty(numId, e.target.value)}
                          className="w-11 h-8 text-center rounded-xl border border-[var(--border-subtle)] dark:border-[var(--border-functional)] bg-white dark:bg-[var(--bg-card)] text-xs font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--status-success-text)]"
                        />

                        <button
                          type="button"
                          onClick={() => handleItemQtyChange(numId, 1)}
                          className="w-8 h-8 rounded-xl bg-[var(--status-success-text)] hover:bg-[var(--status-success-text)] text-white font-black flex items-center justify-center text-sm transition-colors cursor-pointer shadow-2xs"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            <Pagination
              currentPage={menuCurrentPage}
              totalPages={totalMenuPages}
              totalItems={totalFilteredMenuItems}
              itemsPerPage={menuItemsPerPage}
              onPageChange={(p) => setMenuCurrentPage(p)}
              onItemsPerPageChange={(num) => {
                setMenuItemsPerPage(num);
                setMenuCurrentPage(1);
              }}
              itemLabel="محصول"
            />
          </div>
        )}

        {/* Live Cart & Submit Section */}
        <div className="p-4 rounded-2xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">مجموع فاکتور این تاریخ:</span>
              <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[var(--status-success-text)] dark:text-emerald-300">
                {toPersianDigits(totalSelectedCount)} عدد محصول
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-[var(--status-success-text)] dark:text-[var(--status-success-text)]">
              {formatToman(quickTotalRevenue).text}
            </div>
            <div className="text-[11px] text-[var(--status-warning-text)] dark:text-[var(--status-warning-text)] font-bold">
              بهای تمام‌شده مواد اولیه: {formatToman(quickTotalCOGS).text}
            </div>
          </div>

          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={handleSaveQuickSales}
            className="bg-[var(--status-success-text)] hover:bg-[var(--status-success-text)] text-white font-black px-8 py-3 rounded-xl shadow-md w-full sm:w-auto cursor-pointer"
          >
            <CheckCircle2 className="h-5 w-5" />
            <span>
              {existingDateRecord ? 'ذخیره و بروزرسانی فاکتور' : 'ثبت نهایی فاکتور فروش'}
            </span>
          </Button>
        </div>
      </Card>

      {/* RECENT INVOICES LOG TABLE WITH EXPANSION */}
      <Card className="p-4 sm:p-5 bg-white dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
            <Receipt className="h-4 w-4 text-[var(--status-success-text)]" />
            فهرست فاکتورهای فروش ثبت‌شده اخیر:
          </h3>
          <span className="text-[11px] text-[var(--text-secondary)] font-bold">
            کل فاکتورها: {toPersianDigits(salesRecords.length)}
          </span>
        </div>

        <div className="divide-y divide-stone-100 divide-[var(--border-subtle)]/80 border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] rounded-2xl overflow-hidden">
          {salesRecords.length === 0 ? (
            <div className="p-6 text-center text-xs text-[var(--text-secondary)]">
              هنوز هیچ فاکتور فروشی ثبت نشده است.
            </div>
          ) : (
            salesRecords.slice(0, 10).map((record) => {
              const recId = record.id || 0;
              const isExpanded = expandedInvoiceId === recId;
              const itemCount = record.items?.reduce((acc, i) => acc + i.quantity, 0) || 0;

              return (
                <div key={recId || record.date} className="bg-white dark:bg-[var(--bg-card)] transition-colors">
                  <div
                    onClick={() => setExpandedInvoiceId(isExpanded ? null : recId)}
                    className="p-3.5 flex items-center justify-between gap-3 hover:bg-[var(--bg-base)] hover:bg-[var(--bg-base)] cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] shrink-0">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                          فاکتور {formatJalaliReadable(record.date)}
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-medium">
                          تعداد کل محصولات: {toPersianDigits(itemCount)} عدد
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-left">
                        <div className="text-xs font-black text-[var(--status-success-text)] dark:text-[var(--status-success-text)]">
                          {formatToman(record.totalRevenue).text}
                        </div>
                        <div className="text-[10px] text-[var(--status-warning-text)] dark:text-[var(--status-warning-text)] font-bold">
                          بهای مواد: {formatToman(record.totalCOGS).text}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSalesDate(record.date);
                            window.scrollTo({ top: 300, behavior: 'smooth' });
                          }}
                          title="ویرایش در فرم"
                          className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-base)] hover:bg-[var(--bg-base)] transition-colors cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (recId) handleDeleteInvoice(recId, record.date);
                          }}
                          title="حذف فاکتور"
                          className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--status-error-text)] hover:bg-[var(--status-error-bg)] transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <div className="p-1 text-[var(--text-secondary)]">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Items Breakdown */}
                  {isExpanded && record.items && record.items.length > 0 && (
                    <div className="p-3 bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border-t border-[var(--border-subtle)] dark:border-[var(--border-subtle)] text-xs space-y-2">
                      <div className="text-[11px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">جزئیات فروش این روز:</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {record.items.map((it, idx) => (
                          <div
                            key={idx}
                            className="p-2 rounded-xl bg-white dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-functional)] flex items-center justify-between text-[11px]"
                          >
                            <span className="font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">{it.menuItemName}</span>
                            <span className="font-black text-[var(--status-success-text)] dark:text-[var(--status-success-text)]">
                              {toPersianDigits(it.quantity)} عدد ({formatToman(it.totalRevenue).text})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* STICKY BOTTOM MOBILE ACTION BAR */}
      {isMobileScreen && totalSelectedCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 dark:bg-[var(--bg-card)]/95 backdrop-blur-md border-t border-[var(--border-subtle)] dark:border-[var(--border-subtle)] shadow-lg z-40 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold text-[var(--text-secondary)]">
              فاکتور {formatJalaliReadable(salesDate)} ({toPersianDigits(totalSelectedCount)} عدد)
            </div>
            <div className="text-base font-black text-[var(--status-success-text)] dark:text-[var(--status-success-text)]">
              {formatToman(quickTotalRevenue).text}
            </div>
          </div>

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleSaveQuickSales}
            className="bg-[var(--status-success-text)] hover:bg-[var(--status-success-text)] text-white font-black px-5 rounded-xl shadow-md cursor-pointer"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>ثبت نهایی</span>
          </Button>
        </div>
      )}
    </div>
  );
};
