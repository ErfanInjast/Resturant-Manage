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
  Boxes,
  Sparkles,
  PlusCircle,
} from 'lucide-react';
import { db, syncAndRecalculateAllData } from '../../db';
import { useAppStore } from '../../store/useAppStore';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Pagination } from '../ui/Pagination';
import { JalaliDatePicker } from '../ui/JalaliDatePicker';
import { SearchableSelect } from '../ui/SearchableSelect';
import { SmartMoneyInput } from '../ui/SmartMoneyInput';
import {
  formatToman,
  toPersianDigits,
  toEnglishDigits,
  roundCurrency,
  cn,
  getUnitLabel,
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
import { recalculateIngredientCost } from '../../lib/inventoryCost';
import type { DailySalesRecord, DailySalesItem, MenuItem, UnitType, Ingredient } from '../../types';

export const SimpleModeDashboard: React.FC = () => {
  const { notify, isMobileScreen } = useAppStore();

  // Date Filter Preset State
  const [datePreset, setDatePreset] = useState<'today' | 'last7' | 'last30' | 'currentMonth'>('currentMonth');

  // Active Entry Workspace Tab
  const [activeEntryTab, setActiveEntryTab] = useState<'sales' | 'purchase'>('sales');

  // Quick Sales Entry Form State
  const [salesDate, setSalesDate] = useState<string>(getTodayJalaliIso());
  const [salesItemsMap, setSalesItemsMap] = useState<Record<number, number>>({});

  // Quick Purchase Entry Form State
  const [purchaseIngId, setPurchaseIngId] = useState<number | ''>('');
  const [purchaseDate, setPurchaseDate] = useState<string>(getTodayJalaliIso());
  const [purchaseQty, setPurchaseQty] = useState<number | string>('');
  const [purchasePrice, setPurchasePrice] = useState<number | ''>('');
  const [purchaseNote, setPurchaseNote] = useState('');

  // Inline Add New Ingredient States (For frictionless registration on the fly)
  const [showInlineNewIng, setShowInlineNewIng] = useState(false);
  const [newIngName, setNewIngName] = useState('');
  const [newIngUnit, setNewIngUnit] = useState<UnitType>('kg');
  const [newIngCategory, setNewIngCategory] = useState('سایر');

  // Menu Search, Category Filter & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('همه');
  const [menuCurrentPage, setMenuCurrentPage] = useState<number>(1);
  const [menuItemsPerPage, setMenuItemsPerPage] = useState<number>(8);

  // Recent History Tabs & Pagination States
  const [activeHistoryTab, setActiveHistoryTab] = useState<'sales' | 'purchase'>('sales');
  const [salesLogPage, setSalesLogPage] = useState<number>(1);
  const [salesLogsPerPage, setSalesLogsPerPage] = useState<number>(5);
  const [purchaseLogPage, setPurchaseLogPage] = useState<number>(1);
  const [purchaseLogsPerPage, setPurchaseLogsPerPage] = useState<number>(5);

  // History Invoice Expansion State
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<number | null>(null);

  // Live Database Queries
  const settingsQuery = useLiveQuery(() => db.settings.get('config'));
  const salesRecordsQuery = useLiveQuery(() => db.dailySales.orderBy('date').reverse().toArray());
  const wasteLogsQuery = useLiveQuery(() => db.wasteLogs.toArray());
  const menuItemsQuery = useLiveQuery(() => db.menuItems.toArray());
  const ingredientsQuery = useLiveQuery(() => db.ingredients.toArray());
  const purchaseLogsQuery = useLiveQuery(() => db.purchaseLogs.toArray());

  const settings = settingsQuery ?? {
    monthlyFixedCosts: { rent: 0, utilities: 0, salaries: 0, marketing: 0, insurance: 0, general: 0, maintenance: 0, delivery: 0 },
    workingDaysPerMonth: 30,
  };
  const salesRecords = salesRecordsQuery ?? [];
  const wasteLogs = wasteLogsQuery ?? [];
  const menuItems = menuItemsQuery ?? [];
  const ingredients = ingredientsQuery ?? [];
  const purchaseLogs = (purchaseLogsQuery ?? []).sort((a, b) => b.date.localeCompare(a.date));

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

  // Create Ingredient Inline (Frictionless flow)
  const handleCreateIngredientInline = async () => {
    if (!newIngName.trim()) {
      return notify.warning('نام ماده اولیه الزامی است');
    }
    try {
      const exists = ingredients.find(
        (i) => i.name.trim().toLowerCase() === newIngName.trim().toLowerCase()
      );
      if (exists) {
        return notify.warning('ماده اولیه تکراری', 'این ماده اولیه از قبل در لیست وجود دارد.');
      }

      const id = await db.ingredients.add({
        name: newIngName.trim(),
        category: newIngCategory,
        unit: newIngUnit,
        minimumStock: 5,
        currentStock: 0,
        unitCost: 0,
        totalPrice: 0,
        totalQuantity: 0,
        updatedAt: new Date().toISOString(),
      });

      notify.success('ماده اولیه ثبت شد', `ماده اولیه "${newIngName}" به لیست انبار افزوده شد.`);
      setPurchaseIngId(id);
      setNewIngName('');
      setShowInlineNewIng(false);
      await syncAndRecalculateAllData();
    } catch (err) {
      console.error(err);
      notify.error('خطا در ثبت ماده اولیه جدید');
    }
  };

  // Save Purchase transaction
  const handleSavePurchaseLog = async () => {
    if (!purchaseIngId) {
      return notify.warning('ماده اولیه انتخاب نشده است', 'لطفاً ابتدا یک ماده اولیه انتخاب کنید.');
    }
    const targetIngredient = ingredients.find((i) => i.id === Number(purchaseIngId));
    if (!targetIngredient) {
      return notify.error('خطا', 'ماده اولیه انتخاب شده معتبر نیست.');
    }

    const qtyNum = Number(toEnglishDigits(String(purchaseQty)));
    const priceNum = Number(purchasePrice);

    if (!qtyNum || qtyNum <= 0) {
      return notify.warning('مقدار خرید نامعتبر', 'مقدار خرید باید عددی بزرگتر از صفر باشد.');
    }
    if (!priceNum || priceNum <= 0) {
      return notify.warning('مبلغ کل خرید نامعتبر', 'مبلغ کل خرید باید بزرگتر از صفر باشد.');
    }

    const unitCost = Math.round(priceNum / qtyNum);

    try {
      await db.purchaseLogs.add({
        ingredientId: targetIngredient.id!,
        date: purchaseDate || getTodayJalaliIso(),
        quantity: qtyNum,
        totalPrice: priceNum,
        unitCost,
        reason: 'purchase',
        note: purchaseNote.trim() || undefined,
        createdAt: new Date().toISOString(),
      });

      // Increase current stock
      await db.ingredients.update(targetIngredient.id!, {
        currentStock: (targetIngredient.currentStock || 0) + qtyNum,
      });

      // Trigger WAC recalculation
      await recalculateIngredientCost(targetIngredient.id!);

      await syncAndRecalculateAllData();

      notify.success(
        'خرید انبار ثبت شد',
        `مقدار ${toPersianDigits(qtyNum)} ${getUnitLabel(targetIngredient.unit)} "${targetIngredient.name}" با موفقیت ثبت شد.`
      );

      // Reset form
      setPurchaseQty('');
      setPurchasePrice('');
      setPurchaseNote('');
    } catch (err) {
      console.error(err);
      notify.error('خطا در ثبت خرید', 'مشکلی در ذخیره تراکنش پیش آمد.');
    }
  };

  // Delete Purchase Log
  const handleDeletePurchaseLog = async (
    id: number,
    ingredientId: number,
    ingName: string,
    dateStr: string,
    qty: number,
    unitLabel: string
  ) => {
    if (!confirm(`آیا از حذف سابقه خرید ماده "${ingName}" تاریخ ${formatJalaliReadable(dateStr)} به مقدار ${toPersianDigits(qty)} ${unitLabel} اطمینان دارید؟`)) return;
    try {
      await db.transaction('rw', [db.purchaseLogs, db.ingredients, db.menuItems, db.dailySales, db.wasteLogs, db.settings], async () => {
        const targetIngredient = await db.ingredients.get(ingredientId);
        if (targetIngredient) {
          // Subtract stock
          await db.ingredients.update(ingredientId, {
            currentStock: Math.max(0, (targetIngredient.currentStock || 0) - qty),
          });
        }
        await db.purchaseLogs.delete(id);
      });
      await recalculateIngredientCost(ingredientId);
      notify.success('تراکنش خرید حذف شد', 'سند خرید حذف شده و موجودی انبار بازنگری گردید.');
    } catch (err) {
      console.error(err);
      notify.error('خطا در حذف', 'مشکلی در حذف خرید رخ داد.');
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
                'px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border',
                datePreset === 'today'
                  ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] shadow-xs'
                  : 'bg-[var(--bg-base)] dark:bg-[var(--bg-card)] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] border-[var(--border-subtle)] dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800'
              )}
            >
              امروز
            </button>
            <button
              type="button"
              onClick={() => setDatePreset('last7')}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border',
                datePreset === 'last7'
                  ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] shadow-xs'
                  : 'bg-[var(--bg-base)] dark:bg-[var(--bg-card)] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] border-[var(--border-subtle)] dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800'
              )}
            >
              ۷ روز اخیر
            </button>
            <button
              type="button"
              onClick={() => setDatePreset('last30')}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border',
                datePreset === 'last30'
                  ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] shadow-xs'
                  : 'bg-[var(--bg-base)] dark:bg-[var(--bg-card)] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] border-[var(--border-subtle)] dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800'
              )}
            >
              ۳۰ روز اخیر
            </button>
            <button
              type="button"
              onClick={() => setDatePreset('currentMonth')}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border',
                datePreset === 'currentMonth'
                  ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] shadow-xs'
                  : 'bg-[var(--bg-base)] dark:bg-[var(--bg-card)] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] border-[var(--border-subtle)] dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800'
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

      {/* WORKSPACE: POS QUICK ENTRY & PURCHASE LOGGING PANEL */}
      <Card className="bg-white dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] shadow-sm overflow-hidden">
        {/* Workspace Tab Switcher */}
        <div className="flex border-b border-[var(--border-subtle)] dark:border-[var(--border-subtle)] bg-stone-50/50 dark:bg-stone-900/30">
          <button
            type="button"
            onClick={() => setActiveEntryTab('sales')}
            className={cn(
              'flex-1 py-3.5 text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 border-b-2 cursor-pointer',
              activeEntryTab === 'sales'
                ? 'border-[var(--status-success-text)] text-[var(--status-success-text)] bg-white dark:bg-[var(--bg-card)]'
                : 'border-transparent text-[var(--text-secondary)] hover:bg-stone-100/50 dark:hover:bg-stone-800/30'
            )}
          >
            <Receipt className="h-4.5 w-4.5" />
            <span>ثبت فاکتور فروش (اقلام منو)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveEntryTab('purchase')}
            className={cn(
              'flex-1 py-3.5 text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 border-b-2 cursor-pointer',
              activeEntryTab === 'purchase'
                ? 'border-[var(--brand-primary)] text-[var(--brand-primary)] bg-white dark:bg-[var(--bg-card)]'
                : 'border-transparent text-[var(--text-secondary)] hover:bg-stone-100/50 dark:hover:bg-stone-800/30'
            )}
          >
            <ShoppingBag className="h-4.5 w-4.5" />
            <span>ثبت فاکتور خرید (مواد اولیه)</span>
          </button>
        </div>

        <div className="p-4 sm:p-6">
          {activeEntryTab === 'sales' ? (
            <div className="space-y-5">
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
                      className="w-full h-10 pr-9 pl-8 rounded-xl border border-[var(--border-subtle)] dark:border-[var(--border-functional)] bg-[var(--bg-base)] dark:bg-[var(--bg-card)] text-xs font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] focus:outline-hidden focus:ring-2 focus:ring-[var(--status-success-text)] transition-all"
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
            </div>
          ) : (
            <div className="space-y-5">
              {/* Entry Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[var(--border-subtle)] dark:border-[var(--border-subtle)] pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] shrink-0">
                    <Boxes className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-black text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                      ثبت فاکتور خرید (ورود به انبار)
                    </h2>
                    <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-medium mt-0.5">
                      اطلاعات فاکتور خرید مواد اولیه را جهت محاسبه دقیق بهای تمام‌شده و کنترل موجودی وارد کنید
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                  <span className="text-xs font-bold text-[var(--text-primary)] dark:text-[var(--text-secondary)] shrink-0">تاریخ فاکتور خرید:</span>
                  <JalaliDatePicker
                    value={purchaseDate}
                    onChange={(newIso) => setPurchaseDate(newIso)}
                    showSteppers={true}
                    compact={true}
                  />
                </div>
              </div>

              {/* Inline Add New Ingredient Expander Panel */}
              <AnimatePresence>
                {showInlineNewIng && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-[var(--bg-base)] dark:bg-stone-900/40 p-4 rounded-2xl border border-[var(--brand-primary)]/20 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black text-[var(--brand-primary)] flex items-center gap-1.5">
                        <PlusCircle className="h-4 w-4" />
                        <span>تعریف سریع ماده اولیه جدید</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowInlineNewIng(false)}
                        className="p-1 rounded-lg text-[var(--text-secondary)] hover:bg-stone-100 dark:hover:bg-stone-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-[var(--text-secondary)]">نام ماده اولیه:</label>
                        <input
                          type="text"
                          value={newIngName}
                          onChange={(e) => setNewIngName(e.target.value)}
                          placeholder="مثال: قهوه اسپرسو برزیل، مرغ..."
                          className="w-full h-9 rounded-xl border border-[var(--border-subtle)] dark:border-[var(--border-functional)] bg-white dark:bg-stone-950 px-3 text-xs font-bold text-[var(--text-primary)] dark:text-white placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary)]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-[var(--text-secondary)]">واحد اندازه‌گیری:</label>
                        <SearchableSelect
                          options={[
                            { value: 'kg', label: 'کیلوگرم (kg)' },
                            { value: 'g', label: 'گرم (g)' },
                            { value: 'liter', label: 'لیتر (liter)' },
                            { value: 'ml', label: 'میلی‌لیتر (ml)' },
                            { value: 'piece', label: 'عدد / دانه‌ای (piece)' },
                            { value: 'pack', label: 'بسته (pack)' },
                          ]}
                          value={newIngUnit}
                          onChange={(val) => setNewIngUnit(val as UnitType)}
                          placeholder="واحد اندازه‌گیری"
                          enableSearch={false}
                          triggerClassName="h-9 rounded-xl border-[var(--border-subtle)] dark:border-[var(--border-functional)] bg-white dark:bg-stone-950"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-[var(--text-secondary)]">دسته‌بندی:</label>
                        <SearchableSelect
                          options={[
                            { value: 'پروتئین', label: 'پروتئین' },
                            { value: 'غلات', label: 'غلات' },
                            { value: 'لبنیات و روغن', label: 'لبنیات و روغن' },
                            { value: 'صیفی‌جات', label: 'صیفی‌جات' },
                            { value: 'نوشیدنی و قهوه', label: 'نوشیدنی و قهوه' },
                            { value: 'ادویه‌جات', label: 'ادویه‌جات' },
                            { value: 'بسته‌بندی', label: 'بسته‌بندی' },
                            { value: 'سایر', label: 'سایر' },
                          ]}
                          value={newIngCategory}
                          onChange={(val) => setNewIngCategory(String(val))}
                          placeholder="دسته‌بندی"
                          enableSearch={false}
                          triggerClassName="h-9 rounded-xl border-[var(--border-subtle)] dark:border-[var(--border-functional)] bg-white dark:bg-stone-950"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowInlineNewIng(false)}
                        className="text-xs text-[var(--text-secondary)] cursor-pointer"
                      >
                        انصراف
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={handleCreateIngredientInline}
                        className="text-xs bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>ثبت ماده اولیه</span>
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Purchase fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Ingredient Selector */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-[var(--text-primary)] dark:text-[var(--text-secondary)]">ماده اولیه خریداری‌شده:</label>
                    {!showInlineNewIng && (
                      <button
                        type="button"
                        onClick={() => setShowInlineNewIng(true)}
                        className="text-[11px] font-bold text-[var(--brand-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>تعریف ماده اولیه جدید</span>
                      </button>
                    )}
                  </div>

                  {ingredients.length === 0 ? (
                    <div className="text-xs p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 text-amber-800 dark:text-amber-200 flex items-center justify-between">
                      <span>هنوز هیچ ماده اولیه‌ای تعریف نشده است!</span>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setShowInlineNewIng(true)}
                        className="bg-amber-600 text-white hover:bg-amber-700 text-[10px] py-1 h-7 cursor-pointer"
                      >
                        تعریف کنید
                      </Button>
                    </div>
                  ) : (
                    <SearchableSelect
                      options={ingredients.map((ing) => ({
                        value: ing.id!,
                        label: ing.name,
                        sublabel: `موجودی فعلی: ${toPersianDigits(ing.currentStock)} ${getUnitLabel(ing.unit)}`,
                        badge: ing.category,
                      }))}
                      value={purchaseIngId}
                      onChange={(val) => setPurchaseIngId(Number(val))}
                      placeholder="یک ماده اولیه را انتخاب کنید..."
                      triggerClassName="h-11 rounded-xl border-[var(--border-subtle)] dark:border-[var(--border-functional)] bg-white dark:bg-stone-950 text-xs font-bold text-[var(--text-primary)] dark:text-white"
                    />
                  )}
                </div>

                {/* Qty & Price */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-[var(--text-primary)] dark:text-[var(--text-secondary)]">
                      مقدار خرید {purchaseIngId && `(${getUnitLabel(ingredients.find((i) => i.id === Number(purchaseIngId))?.unit || '')})`}:
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={purchaseQty === '' ? '' : toPersianDigits(purchaseQty)}
                      onChange={(e) => {
                        const eng = toEnglishDigits(e.target.value);
                        setPurchaseQty(eng === '' ? '' : eng);
                      }}
                      placeholder="مثال: ۵.۵"
                      className="w-full h-11 rounded-xl border border-[var(--border-subtle)] dark:border-[var(--border-functional)] bg-white dark:bg-stone-950 px-3 text-xs font-bold text-[var(--text-primary)] dark:text-white placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary)]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-[var(--text-primary)] dark:text-[var(--text-secondary)]">قیمت کل خرید (تومان):</label>
                    <SmartMoneyInput
                      value={purchasePrice}
                      onChange={setPurchasePrice}
                      placeholder="مبلغ کل فاکتور"
                      className="h-11 rounded-xl border-[var(--border-subtle)] dark:border-[var(--border-functional)] bg-white dark:bg-stone-950 text-xs text-[var(--text-primary)] dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Note and Save button */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
                <div className="col-span-1 md:col-span-9 space-y-1.5">
                  <label className="text-xs font-extrabold text-[var(--text-primary)] dark:text-[var(--text-secondary)]">توضیحات فاکتور خرید (اختیاری):</label>
                  <input
                    type="text"
                    value={purchaseNote}
                    onChange={(e) => setPurchaseNote(e.target.value)}
                    placeholder="بابت فاکتور شماره فلان، خرید از میدان تره‌بار و..."
                    className="w-full h-11 rounded-xl border border-[var(--border-subtle)] dark:border-[var(--border-functional)] bg-white dark:bg-stone-950 px-3 text-xs font-bold text-[var(--text-primary)] dark:text-white placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary)]"
                  />
                </div>

                <div className="col-span-1 md:col-span-3">
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    onClick={handleSavePurchaseLog}
                    className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-black px-6 py-3 rounded-xl shadow-md w-full h-11 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    <span>ثبت نهایی خرید انبار</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* RECENT INVOICES & PURCHASES LOG PANEL WITH DUAL-TAB PAGINATION */}
      <Card className="p-4 sm:p-5 bg-white dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] space-y-4 shadow-2xs">
        {/* Header Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[var(--border-subtle)] dark:border-[var(--border-subtle)] pb-2">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto custom-scrollbar">
            <button
              type="button"
              onClick={() => {
                setActiveHistoryTab('sales');
                setSalesLogPage(1);
              }}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer flex items-center gap-2',
                activeHistoryTab === 'sales'
                  ? 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border border-[var(--status-success-text)]/30'
                  : 'bg-transparent text-[var(--text-secondary)] hover:bg-stone-100 dark:hover:bg-stone-800'
              )}
            >
              <Receipt className="h-4 w-4" />
              <span>فاکتورهای فروش ثبت‌شده</span>
              <Badge className="bg-emerald-100 dark:bg-emerald-950/60 text-[var(--status-success-text)] font-extrabold text-[10px] px-1.5 py-0.2">
                {toPersianDigits(salesRecords.length)}
              </Badge>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveHistoryTab('purchase');
                setPurchaseLogPage(1);
              }}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer flex items-center gap-2',
                activeHistoryTab === 'purchase'
                  ? 'bg-amber-50 dark:bg-amber-950/30 text-[var(--status-warning-text)] border border-[var(--status-warning-text)]/30'
                  : 'bg-transparent text-[var(--text-secondary)] hover:bg-stone-100 dark:hover:bg-stone-800'
              )}
            >
              <ShoppingBag className="h-4 w-4" />
              <span>فاکتورهای خرید انبار</span>
              <Badge className="bg-amber-100 dark:bg-amber-950/60 text-[var(--status-warning-text)] font-extrabold text-[10px] px-1.5 py-0.2">
                {toPersianDigits(purchaseLogs.length)}
              </Badge>
            </button>
          </div>

          <span className="text-[11px] text-[var(--text-secondary)] font-bold hidden sm:inline">
            نمایش تاریخچه تعاملی فاکتورهای ثبت‌شده
          </span>
        </div>

        {activeHistoryTab === 'sales' ? (
          <div className="space-y-4">
            {/* Sales Invoices List */}
            <div className="divide-y divide-stone-100 dark:divide-stone-900 border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] rounded-2xl overflow-hidden">
              {salesRecords.length === 0 ? (
                <div className="p-6 text-center text-xs text-[var(--text-secondary)]">
                  هنوز هیچ فاکتور فروشی ثبت نشده است.
                </div>
              ) : (
                salesRecords
                  .slice((salesLogPage - 1) * salesLogsPerPage, salesLogPage * salesLogsPerPage)
                  .map((record) => {
                    const recId = record.id || 0;
                    const isExpanded = expandedInvoiceId === recId;
                    const itemCount = record.items?.reduce((acc, i) => acc + i.quantity, 0) || 0;

                    return (
                      <div key={recId || record.date} className="bg-white dark:bg-[var(--bg-card)] transition-colors">
                        <div
                          onClick={() => setExpandedInvoiceId(isExpanded ? null : recId)}
                          className="p-3.5 flex items-center justify-between gap-3 hover:bg-[var(--bg-base)] dark:hover:bg-stone-900/45 cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-[var(--bg-base)] dark:bg-stone-900 text-[var(--text-secondary)] dark:text-[var(--text-secondary)] shrink-0">
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
                                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-base)] dark:hover:bg-stone-800 transition-colors cursor-pointer"
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
                          <div className="p-3 bg-[var(--bg-base)] dark:bg-stone-900/20 border-t border-[var(--border-subtle)] dark:border-stone-900 text-xs space-y-2">
                            <div className="text-[11px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">جزئیات فروش این روز:</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {record.items.map((it, idx) => (
                                <div
                                  key={idx}
                                  className="p-2 rounded-xl bg-white dark:bg-stone-950 border border-[var(--border-subtle)] dark:border-stone-900 flex items-center justify-between text-[11px]"
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

            {salesRecords.length > 0 && (
              <Pagination
                currentPage={salesLogPage}
                totalPages={Math.ceil(salesRecords.length / salesLogsPerPage)}
                totalItems={salesRecords.length}
                itemsPerPage={salesLogsPerPage}
                onPageChange={(p) => setSalesLogPage(p)}
                onItemsPerPageChange={(num) => {
                  setSalesLogsPerPage(num);
                  setSalesLogPage(1);
                }}
                itemLabel="فاکتور"
              />
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Purchase Invoices List */}
            <div className="divide-y divide-stone-100 dark:divide-stone-900 border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] rounded-2xl overflow-hidden">
              {purchaseLogs.length === 0 ? (
                <div className="p-6 text-center text-xs text-[var(--text-secondary)]">
                  هنوز هیچ فاکتور خریدی ثبت نشده است.
                </div>
              ) : (
                purchaseLogs
                  .slice((purchaseLogPage - 1) * purchaseLogsPerPage, purchaseLogPage * purchaseLogsPerPage)
                  .map((log) => {
                    const targetIng = ingredients.find((i) => i.id === log.ingredientId);
                    const ingName = targetIng ? targetIng.name : 'ماده اولیه حذف شده';
                    const unitLabel = targetIng ? getUnitLabel(targetIng.unit) : '';

                    return (
                      <div key={log.id} className="bg-white dark:bg-[var(--bg-card)] transition-colors p-3.5 flex items-center justify-between gap-3 hover:bg-[var(--bg-base)] dark:hover:bg-stone-900/45">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-[var(--bg-base)] dark:bg-stone-900 text-amber-600 dark:text-amber-400 shrink-0">
                            <Boxes className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-black text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                              خرید {ingName}
                            </div>
                            <div className="text-[10px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-medium mt-0.5 flex items-center gap-1.5 flex-wrap">
                              <span>تاریخ خرید: {formatJalaliReadable(log.date)}</span>
                              {log.note && <span className="text-stone-400 font-normal">({log.note})</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-left text-xs">
                            <div className="font-black text-amber-600 dark:text-amber-400">
                              {formatToman(log.totalPrice).text}
                            </div>
                            <div className="text-[10px] text-[var(--text-secondary)] font-medium">
                              {toPersianDigits(log.quantity)} {unitLabel} (هر {unitLabel} {formatToman(log.unitCost).text})
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (log.id) {
                                handleDeletePurchaseLog(
                                  log.id,
                                  log.ingredientId,
                                  ingName,
                                  log.date,
                                  log.quantity,
                                  unitLabel
                                );
                              }
                            }}
                            title="حذف سابقه خرید"
                            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--status-error-text)] hover:bg-[var(--status-error-bg)] transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {purchaseLogs.length > 0 && (
              <Pagination
                currentPage={purchaseLogPage}
                totalPages={Math.ceil(purchaseLogs.length / purchaseLogsPerPage)}
                totalItems={purchaseLogs.length}
                itemsPerPage={purchaseLogsPerPage}
                onPageChange={(p) => setPurchaseLogPage(p)}
                onItemsPerPageChange={(num) => {
                  setPurchaseLogsPerPage(num);
                  setPurchaseLogPage(1);
                }}
                itemLabel="سابقه خرید"
              />
            )}
          </div>
        )}
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
