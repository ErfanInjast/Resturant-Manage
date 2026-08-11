// netProfit = totalRevenue - totalCOGS - totalWasteCost
// Decision: wasteCost is included as real operational expense
// Last updated: 2026-08-09
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Calendar, Receipt, AlertOctagon, Check, ShoppingCart, Search, TrendingUp, Sparkles, ArrowUpRight, BarChart3, Pencil, Eye, ChevronRight, ChevronLeft, ArrowUpDown, ArrowUp, ArrowDown, Package, Utensils, Calculator, ShoppingBag, CheckCircle2 } from 'lucide-react';
import { db, syncAndRecalculateAllData } from '../../db';
import type { DailySalesItem, WasteLog, MenuItem, DailySalesRecord, Ingredient } from '../../types';
import { formatToman, formatNumber, roundCurrency, toPersianDigits, toEnglishDigits, cn } from '../../lib/utils';
import { formatJalali, formatJalaliReadable, jalaliToGregorian, MIN_JALALI_DATE, getTodayJalaliIso, clampJalaliIso, normalizeDateStr } from '../../lib/jalali';
import { tablePageVariants, tableRowVariants } from '../../lib/motion';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { SmartMoneyInput } from '../ui/SmartMoneyInput';
import { SearchableSelect } from '../ui/SearchableSelect';
import { Pagination } from '../ui/Pagination';
import { PageSkeleton } from '../ui/PageSkeleton';
import { JalaliDatePicker } from '../ui/JalaliDatePicker';
import { useAppStore } from '../../store/useAppStore';

const SALES_PER_PAGE = 5;

const getUnitLabel = (unit?: string) => {
  switch (unit) {
    case 'kg': return 'کیلوگرم';
    case 'g': return 'گرم';
    case 'liter': return 'لیتر';
    case 'ml': return 'میلی‌لیتر';
    case 'piece': return 'عدد';
    case 'pack': return 'بسته';
    default: return unit || 'واحد';
  }
};

const getShiftedJalaliIso = (baseIso: string, dayDelta: number) => {
  const norm = clampJalaliIso(baseIso);
  const match = norm.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
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
    gDate.setDate(gDate.getDate() + dayDelta);
    const shifted = formatJalali(gDate, 'iso');
    return clampJalaliIso(shifted, MIN_JALALI_DATE, todayIso);
  } catch (e) {
    return todayIso;
  }
};

export const SalesManager: React.FC = () => {
  const { notify, askConfirmation, setActiveTab } = useAppStore();
  const ingredientsQuery = useLiveQuery(() => db.ingredients.toArray());
  const salesRecordsQuery = useLiveQuery(() => db.dailySales.toArray());
  const wasteLogsQuery = useLiveQuery(() => db.wasteLogs.toArray());
  const menuItemsQuery = useLiveQuery(() => db.menuItems.toArray());

  const [salesCurrentPage, setSalesCurrentPage] = useState(1);
  const [salesDirection, setSalesDirection] = useState(1);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [salesPerPage, setSalesPerPage] = useState(5);
  const [salesSortField, setSalesSortField] = useState<'date' | 'totalUnits' | 'totalRevenue' | 'totalCOGS' | 'grossProfit'>('date');
  const [salesSortDirection, setSalesSortDirection] = useState<'asc' | 'desc'>('desc');

  const [wastePage, setWastePage] = useState(1);
  const [wastePerPage, setWastePerPage] = useState(5);
  const [wasteSortField, setWasteSortField] = useState<'date' | 'totalUnits' | 'totalCost'>('date');
  const [wasteSortDirection, setWasteSortDirection] = useState<'asc' | 'desc'>('desc');
  const [wasteSearchQuery, setWasteSearchQuery] = useState('');
  const [detailWasteDate, setDetailWasteDate] = useState<string | null>(null);

  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWasteModalOpen, setIsWasteModalOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<number | null>(null);
  const [detailRecord, setDetailRecord] = useState<DailySalesRecord | null>(null);

  // Sales Entry Form State
  const [salesDate, setSalesDate] = useState<string>(getTodayJalaliIso());
  const [salesItems, setSalesItems] = useState<{ menuItemId: number; quantity: number }[]>([]);

  // Waste Log Form State
  const [wasteDate, setWasteDate] = useState<string>(getTodayJalaliIso());
  const [wasteType, setWasteType] = useState<'ingredient' | 'menuItem'>('ingredient');
  const [selectedIngredientId, setSelectedIngredientId] = useState<number | ''>('');
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<number | ''>('');
  const [wasteQty, setWasteQty] = useState<number | string>('');
  const [wasteReason, setWasteReason] = useState('انقضا و فساد تاریخ مصرف');
  const [editingWasteId, setEditingWasteId] = useState<number | null>(null);

  const ingredients = ingredientsQuery ?? [];
  const salesRecords = salesRecordsQuery ?? [];
  const wasteLogs = wasteLogsQuery ?? [];
  const menuItems = menuItemsQuery ?? [];

  // Check if sales record exists for currently chosen salesDate
  const existingSalesRecord = salesRecords.find(
    (r) => normalizeDateStr(r.date) === normalizeDateStr(salesDate)
  );

  // Auto-sync form when salesDate changes inside modal
  React.useEffect(() => {
    if (!isSalesModalOpen) return;
    const cleanDate = normalizeDateStr(salesDate);
    if (!cleanDate) return;

    const recordForDate = salesRecords.find(
      (r) => normalizeDateStr(r.date) === cleanDate
    );

    if (recordForDate && recordForDate.id) {
      setEditingRecordId(recordForDate.id);
      if (recordForDate.items && Array.isArray(recordForDate.items)) {
        setSalesItems(
          recordForDate.items.map((item) => ({
            menuItemId: Number(item.menuItemId),
            quantity: Number(item.quantity),
          }))
        );
      } else {
        setSalesItems([]);
      }
    } else {
      setEditingRecordId(null);
      setSalesItems([]);
    }
  }, [salesDate, isSalesModalOpen]);

  const groupedWasteRecords = React.useMemo(() => {
    const map = new Map<string, WasteLog[]>();
    wasteLogs.forEach((log) => {
      const dateKey = log.date ? normalizeDateStr(log.date) : getTodayJalaliIso();
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(log);
    });

    const groups: {
      date: string;
      logs: WasteLog[];
      totalCost: number;
      totalUnits: number;
      reasons: string[];
    }[] = [];

    map.forEach((logs, date) => {
      const totalCost = logs.reduce((sum, l) => sum + (l.cost || 0), 0);
      const totalUnits = logs.reduce((sum, l) => sum + (l.quantity || 1), 0);
      const reasons = Array.from(new Set(logs.map((l) => l.reason).filter(Boolean)));
      groups.push({
        date,
        logs,
        totalCost,
        totalUnits,
        reasons,
      });
    });

    return groups;
  }, [wasteLogs]);

  const isLoading =
    ingredientsQuery === undefined ||
    salesRecordsQuery === undefined ||
    wasteLogsQuery === undefined ||
    menuItemsQuery === undefined;

  if (isLoading) {
    return <PageSkeleton type="table" />;
  }

  const handleSalesPageChange = (newPage: number, dir: number) => {
    setSalesDirection(dir);
    setSalesCurrentPage(newPage);
  };

  const handleSalesSort = (field: 'date' | 'totalUnits' | 'totalRevenue' | 'totalCOGS' | 'grossProfit') => {
    if (salesSortField === field) {
      setSalesSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSalesSortField(field);
      setSalesSortDirection('asc');
    }
    setSalesCurrentPage(1);
  };

  const renderSalesSortIcon = (field: string) => {
    if (salesSortField !== field) {
      return <ArrowUpDown className="h-3 w-3 opacity-40 group-hover:opacity-100 transition-opacity" />;
    }
    return salesSortDirection === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-[var(--brand-primary)]" />
    ) : (
      <ArrowDown className="h-3 w-3 text-[var(--brand-primary)]" />
    );
  };

  const handleWasteSort = (field: 'date' | 'totalUnits' | 'totalCost') => {
    if (wasteSortField === field) {
      setWasteSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setWasteSortField(field);
      setWasteSortDirection(field === 'date' ? 'desc' : 'asc');
    }
    setWastePage(1);
  };

  const renderWasteSortIcon = (field: 'date' | 'totalUnits' | 'totalCost') => {
    if (wasteSortField !== field) {
      return <ArrowUpDown className="h-3 w-3 opacity-40 group-hover:opacity-100 transition-opacity" />;
    }
    return wasteSortDirection === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-[var(--status-error-text)]" />
    ) : (
      <ArrowDown className="h-3 w-3 text-[var(--status-error-text)]" />
    );
  };

  const currentWasteDetailGroup = detailWasteDate
    ? groupedWasteRecords.find((g) => normalizeDateStr(g.date) === normalizeDateStr(detailWasteDate)) || null
    : null;
  const openWasteModal = () => {
    setEditingWasteId(null);
    setWasteDate(getTodayJalaliIso());
    setWasteType('ingredient');
    setSelectedIngredientId(ingredients[0]?.id || '');
    setSelectedMenuItemId(menuItems[0]?.id || '');
    setWasteQty('');
    setWasteReason('انقضا و فساد تاریخ مصرف');
    setIsWasteModalOpen(true);
  };

  const openEditWasteModal = (log: WasteLog) => {
    if (!log.id) return;
    setEditingWasteId(log.id);
    setWasteDate(log.date || getTodayJalaliIso());

    if (log.ingredientId && ingredients.some((i) => i.id === log.ingredientId)) {
      setWasteType('ingredient');
      setSelectedIngredientId(log.ingredientId);
    } else if (log.menuItemId && menuItems.some((m) => m.id === log.menuItemId)) {
      setWasteType('menuItem');
      setSelectedMenuItemId(log.menuItemId);
    } else {
      const matchedIng = ingredients.find((i) => i.name === log.itemName);
      const matchedMI = menuItems.find((m) => m.name === log.itemName);
      if (matchedIng && matchedIng.id) {
        setWasteType('ingredient');
        setSelectedIngredientId(matchedIng.id);
      } else if (matchedMI && matchedMI.id) {
        setWasteType('menuItem');
        setSelectedMenuItemId(matchedMI.id);
      } else {
        setWasteType('ingredient');
        setSelectedIngredientId(ingredients[0]?.id || '');
      }
    }

    setWasteQty(log.quantity);
    setWasteReason(log.reason || 'انقضا و فساد تاریخ مصرف');
    setIsWasteModalOpen(true);
  };

  const selectedIng = ingredients.find((i) => i.id === selectedIngredientId);
  const selectedMI = menuItems.find((m) => m.id === selectedMenuItemId);

  const wasteQtyNum = typeof wasteQty === 'number'
    ? wasteQty
    : Number(toEnglishDigits(String(wasteQty)).replace(',', '.').replace('/', '.')) || 0;

  const currentWasteUnit = wasteType === 'ingredient'
    ? (selectedIng ? getUnitLabel(selectedIng.unit) : 'کیلوگرم')
    : 'عدد / پرس';

  const unitCost = wasteType === 'ingredient'
    ? (selectedIng?.unitCost || 0)
    : (selectedMI?.primeCost || 0);

  const autoCalculatedCost = Math.round(wasteQtyNum * unitCost);

  const handleSaveWaste = async (e: React.FormEvent) => {
    e.preventDefault();

    if (wasteType === 'ingredient') {
      if (!selectedIngredientId || !selectedIng) {
        return notify.warning('لطفاً یک ماده اولیه را انتخاب کنید.');
      }
    } else {
      if (!selectedMenuItemId || !selectedMI) {
        return notify.warning('لطفاً یک آیتم منو را انتخاب کنید.');
      }
    }

    if (wasteQtyNum <= 0) {
      return notify.warning('لطفاً مقدار معتبری برای ضایعات وارد کنید.');
    }

    const itemName = wasteType === 'ingredient' ? selectedIng!.name : selectedMI!.name;
    const unit = wasteType === 'ingredient' ? selectedIng!.unit : 'عدد';

    const finalWasteDate = wasteDate.trim() || getTodayJalaliIso();

    const wasteData = {
      date: finalWasteDate,
      ingredientId: wasteType === 'ingredient' ? (selectedIngredientId as number) : undefined,
      menuItemId: wasteType === 'menuItem' ? (selectedMenuItemId as number) : undefined,
      itemName,
      quantity: wasteQtyNum,
      unit: getUnitLabel(unit),
      cost: autoCalculatedCost,
      reason: wasteReason || 'غیرقابل استفاده / انقضا',
    };

    if (editingWasteId) {
      await db.transaction('rw', [db.wasteLogs, db.ingredients], async () => {
        const oldWaste = await db.wasteLogs.get(editingWasteId);

        const oldIngId = oldWaste?.ingredientId !== undefined ? Number(oldWaste.ingredientId) : undefined;
        const oldQty = oldWaste?.quantity || 0;

        const newIngId = wasteType === 'ingredient' && selectedIngredientId !== undefined ? Number(selectedIngredientId) : undefined;
        const newQty = wasteQtyNum;

        if (oldIngId !== undefined && newIngId !== undefined && oldIngId === newIngId) {
          // Same ingredient
          const qtyDelta = newQty - oldQty;
          if (qtyDelta !== 0) {
            const ing = await db.ingredients.get(oldIngId);
            if (ing) {
              const updatedStock = Math.max(0, roundCurrency((ing.currentStock || 0) - qtyDelta));
              await db.ingredients.update(oldIngId, {
                currentStock: updatedStock,
                updatedAt: new Date().toISOString(),
              });
            }
          }
        } else {
          // ingredientId changed OR wasteType changed
          if (oldIngId !== undefined) {
            // Revert old quantity back to old ingredient stock (increase)
            const oldIng = await db.ingredients.get(oldIngId);
            if (oldIng) {
              const restoredStock = roundCurrency((oldIng.currentStock || 0) + oldQty);
              await db.ingredients.update(oldIngId, {
                currentStock: restoredStock,
                updatedAt: new Date().toISOString(),
              });
            }
          }

          if (newIngId !== undefined) {
            // Deduct new quantity from new ingredient stock (decrease)
            const newIng = await db.ingredients.get(newIngId);
            if (newIng) {
              const deductedStock = Math.max(0, roundCurrency((newIng.currentStock || 0) - newQty));
              await db.ingredients.update(newIngId, {
                currentStock: deductedStock,
                updatedAt: new Date().toISOString(),
              });
            }
          }
        }

        await db.wasteLogs.update(editingWasteId, wasteData);
      });

      notify.success('گزارش ضایعات بروزرسانی شد', `گزارش ضایعات "${itemName}" با موفقیت ویرایش شد.`);
    } else {
      await db.transaction('rw', [db.wasteLogs, db.ingredients], async () => {
        await db.wasteLogs.add({
          ...wasteData,
          createdAt: new Date().toISOString(),
        });

        if (wasteType === 'ingredient' && selectedIngredientId !== undefined) {
          const ingId = Number(selectedIngredientId);
          const ing = await db.ingredients.get(ingId);
          if (ing) {
            const newStock = Math.max(0, roundCurrency((ing.currentStock || 0) - wasteQtyNum));
            await db.ingredients.update(ingId, {
              currentStock: newStock,
              updatedAt: new Date().toISOString(),
            });
          }
        }
      });

      notify.success('ضایعات ثبت شد', `خسارت ${formatToman(autoCalculatedCost).text} برای "${itemName}" ثبت و از موجودی کسر گردید.`);
    }

    await syncAndRecalculateAllData();
    setIsWasteModalOpen(false);
    setEditingWasteId(null);
  };

  const openNewSalesModal = () => {
    const today = normalizeDateStr(getTodayJalaliIso());
    setSalesDate(today);

    // Check if sales record already exists for today
    const existingToday = salesRecords.find(
      (r) => normalizeDateStr(r.date) === today
    );

    if (existingToday && existingToday.id) {
      setEditingRecordId(existingToday.id);
      setSalesItems(
        existingToday.items?.map((item) => ({
          menuItemId: Number(item.menuItemId),
          quantity: Number(item.quantity),
        })) || []
      );
    } else {
      setEditingRecordId(null);
      setSalesItems([]);
    }
    setIsSalesModalOpen(true);
  };

  const openEditSalesModal = (record: DailySalesRecord) => {
    if (!record.id) return;
    const cleanDate = normalizeDateStr(record.date);
    setEditingRecordId(record.id);
    setSalesDate(cleanDate);

    setSalesItems(
      record.items?.map((item) => ({
        menuItemId: Number(item.menuItemId),
        quantity: Number(item.quantity),
      })) || []
    );

    setIsSalesModalOpen(true);
  };

  const updateItemQty = (menuItemId: number, delta: number) => {
    setSalesItems((prev) => {
      const exists = prev.some((item) => Number(item.menuItemId) === Number(menuItemId));
      if (!exists && delta > 0) {
        return [...prev, { menuItemId: Number(menuItemId), quantity: delta }];
      }
      return prev
        .map((item) =>
          Number(item.menuItemId) === Number(menuItemId)
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0);
    });
  };

  const setDirectItemQty = (menuItemId: number, qty: number) => {
    setSalesItems((prev) => {
      if (qty <= 0) {
        return prev.filter((item) => Number(item.menuItemId) !== Number(menuItemId));
      }
      const exists = prev.some((item) => Number(item.menuItemId) === Number(menuItemId));
      if (exists) {
        return prev.map((item) =>
          Number(item.menuItemId) === Number(menuItemId) ? { ...item, quantity: qty } : item
        );
      } else {
        return [...prev, { menuItemId: Number(menuItemId), quantity: qty }];
      }
    });
  };

  // Calculate totals for current sales modal entry
  const calculatedItems: DailySalesItem[] = salesItems
    .filter((si) => si.quantity > 0)
    .map((si) => {
      const mi = menuItems.find((m) => Number(m.id) === Number(si.menuItemId));
      const unitSellingPrice = mi?.sellingPrice || 0;
      const unitCost = mi?.primeCost || 0;
      return {
        menuItemId: Number(si.menuItemId),
        menuItemName: mi?.name || 'محصول منو',
        quantity: Number(si.quantity),
        unitSellingPrice,
        unitCost,
        totalRevenue: roundCurrency(si.quantity * unitSellingPrice),
        totalCost: roundCurrency(si.quantity * unitCost),
      };
    });

  const modalTotalRevenue = calculatedItems.reduce((acc, curr) => acc + curr.totalRevenue, 0);
  const modalTotalCOGS = calculatedItems.reduce((acc, curr) => acc + curr.totalCost, 0);

  const adjustInventoryForSalesItems = async (
    items: { menuItemId: number; quantity: number }[],
    multiplier: 1 | -1
  ) => {
    const allMenuItems = await db.menuItems.toArray();
    const menuItemMap = new Map(allMenuItems.map((mi) => [mi.id!, mi]));

    const totalDeltaMap = new Map<number, number>();
    for (const sItem of items) {
      const menuItem = menuItemMap.get(Number(sItem.menuItemId));
      if (!menuItem || !menuItem.ingredients) continue;

      for (const recipeIng of menuItem.ingredients) {
        const ingId = Number(recipeIng.ingredientId);
        if (!ingId) continue;
        const consumedQty = recipeIng.quantity * sItem.quantity;
        totalDeltaMap.set(ingId, (totalDeltaMap.get(ingId) || 0) + consumedQty);
      }
    }

    if (totalDeltaMap.size === 0) return;

    await db.transaction('rw', [db.ingredients], async () => {
      for (const [ingId, deltaQty] of totalDeltaMap.entries()) {
        const ing = await db.ingredients.get(ingId);
        if (!ing) continue;

        const currentVal = ing.currentStock || 0;
        const newStock =
          multiplier === 1
            ? Math.max(0, roundCurrency(currentVal - deltaQty))
            : roundCurrency(currentVal + deltaQty);

        await db.ingredients.update(ingId, {
          currentStock: newStock,
          updatedAt: new Date().toISOString(),
        });
      }
    });
  };

  const handleSaveSales = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);

      const cleanSalesDate = normalizeDateStr(salesDate);
      const todayJalali = normalizeDateStr(getTodayJalaliIso());

      // 1. Prevent future dates
      if (cleanSalesDate > todayJalali) {
        return notify.warning(
          'تاریخ غیرمجاز',
          'امکان ثبت یا ویرایش گزارش فروش برای روزهای آینده وجود ندارد.'
        );
      }

      if (calculatedItems.length === 0) {
        return notify.warning('آیتمی انتخاب نشده است', 'لطفاً حداقل یک محصول را به فاکتور فروش اضافه کنید.');
      }

      // Match actual waste cost from wasteLogs for this date
      const matchingWaste = wasteLogs
        .filter((w) => normalizeDateStr(w.date) === cleanSalesDate)
        .reduce((acc, w) => acc + (w.cost || 0), 0);

      const salesData = {
        date: cleanSalesDate,
        items: calculatedItems,
        totalRevenue: modalTotalRevenue,
        totalCOGS: modalTotalCOGS,
        totalWasteCost: matchingWaste,
        netProfit: roundCurrency(modalTotalRevenue - modalTotalCOGS - matchingWaste),
        createdAt: new Date().toISOString(),
      };

      // Find ALL records matching this date to update correctly and clean up any historical duplicates
      const existingForDate = salesRecords.filter(
        (r) => normalizeDateStr(r.date) === cleanSalesDate
      );

      let targetId = editingRecordId;
      if (!targetId && existingForDate.length > 0) {
        targetId = existingForDate[0].id || null;
      }

      if (targetId) {
        // Revert stock for previous version of sale
        const oldRecord = salesRecords.find((r) => r.id === targetId) || existingForDate[0];
        if (oldRecord && oldRecord.items) {
          await adjustInventoryForSalesItems(oldRecord.items, -1);
        }

        // Update existing record
        await db.dailySales.update(targetId, salesData);

        // Remove any duplicate records for the same date and revert their stock
        const duplicateIds = existingForDate
          .map((r) => r.id)
          .filter((id): id is number => typeof id === 'number' && id !== targetId);

        if (duplicateIds.length > 0) {
          for (const dupId of duplicateIds) {
            const dupRecord = salesRecords.find((r) => r.id === dupId);
            if (dupRecord && dupRecord.items) {
              await adjustInventoryForSalesItems(dupRecord.items, -1);
            }
          }
          await db.dailySales.bulkDelete(duplicateIds);
        }

        notify.success(
          'فاکتور فروش بروزرسانی شد',
          `اطلاعات فروش تاریخ ${formatJalaliReadable(cleanSalesDate)} با موفقیت به روز گردید.`
        );
      } else {
        // Create single new record
        await db.dailySales.add(salesData as DailySalesRecord);
        notify.success(
          'فروش روزانه ثبت شد',
          `گزارش فروش برای تاریخ ${formatJalaliReadable(cleanSalesDate)} با موفقیت ثبت شد.`
        );
      }

      // Deduct new sales consumed stock from ingredients
      await adjustInventoryForSalesItems(calculatedItems, 1);

      await syncAndRecalculateAllData();
      setIsSalesModalOpen(false);
      setEditingRecordId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteWasteLog = (log: WasteLog) => {
    if (!log.id) return;
    askConfirmation({
      title: 'حذف گزارش ضایعات',
      message: `آیا از حذف گزارش ضایعات "${log.itemName}" اطمینان دارید؟`,
      confirmText: 'حذف گزارش',
      cancelText: 'انصراف',
      variant: 'danger',
      onConfirm: async () => {
        await db.transaction('rw', [db.wasteLogs, db.ingredients], async () => {
          const targetLog = await db.wasteLogs.get(log.id!);
          if (targetLog && targetLog.ingredientId !== undefined) {
            const ingId = Number(targetLog.ingredientId);
            const ing = await db.ingredients.get(ingId);
            if (ing) {
              const restoredStock = roundCurrency((ing.currentStock || 0) + (targetLog.quantity || 0));
              await db.ingredients.update(ingId, {
                currentStock: restoredStock,
                updatedAt: new Date().toISOString(),
              });
            }
          }
          await db.wasteLogs.delete(log.id!);
        });
        await syncAndRecalculateAllData();
        notify.success('گزارش ضایعات حذف شد.');
      },
    });
  };

  const handleDeleteWasteGroup = (group: { date: string; logs: WasteLog[] }) => {
    const ids = group.logs.map((l) => l.id).filter((id): id is number => typeof id === 'number');
    if (ids.length === 0) return;

    askConfirmation({
      title: 'حذف تمامی ضایعات این تاریخ',
      message: `آیا از حذف تمامی گزارش‌های ضایعات تاریخ ${formatJalaliReadable(group.date)} (${toPersianDigits(group.logs.length)} مورد) اطمینان دارید؟`,
      confirmText: 'حذف کلیه موارد',
      cancelText: 'انصراف',
      variant: 'danger',
      onConfirm: async () => {
        await db.transaction('rw', [db.wasteLogs, db.ingredients], async () => {
          for (const id of ids) {
            const targetLog = await db.wasteLogs.get(id);
            if (targetLog && targetLog.ingredientId !== undefined) {
              const ingId = Number(targetLog.ingredientId);
              const ing = await db.ingredients.get(ingId);
              if (ing) {
                const restoredStock = roundCurrency((ing.currentStock || 0) + (targetLog.quantity || 0));
                await db.ingredients.update(ingId, {
                  currentStock: restoredStock,
                  updatedAt: new Date().toISOString(),
                });
              }
            }
          }
          await db.wasteLogs.bulkDelete(ids);
        });
        await syncAndRecalculateAllData();
        if (detailWasteDate && normalizeDateStr(detailWasteDate) === normalizeDateStr(group.date)) {
          setDetailWasteDate(null);
        }
        notify.success('ضایعات این تاریخ با موفقیت حذف شدند.');
      },
    });
  };

  const handleDeleteSalesRecord = (id: number) => {
    askConfirmation({
      title: 'حذف گزارش فروش',
      message: 'آیا از حذف این گزارش فروش روزانه اطمینان دارید؟',
      confirmText: 'حذف گزارش',
      cancelText: 'انصراف',
      variant: 'danger',
      onConfirm: async () => {
        const record = await db.dailySales.get(id);
        if (record && record.items) {
          await adjustInventoryForSalesItems(record.items, -1);
        }
        await db.dailySales.delete(id);
        await syncAndRecalculateAllData();
        notify.success('گزارش فروش حذف شد.');
      },
    });
  };

  // Quick Sales Forecasting Calculation
  const totalSalesDays = salesRecords.length;
  const isDataDriven = totalSalesDays > 0;
  const totalHistoricalRev = salesRecords.reduce((acc, r) => acc + (r.totalRevenue || 0), 0);
  const avgDailyRev = isDataDriven
    ? totalHistoricalRev / totalSalesDays
    : menuItems.reduce((acc, i) => acc + (i.sellingPrice || 0) * (i.salesVolume30Days || 30), 0) / 30;

  const nextWeekProjectedRev = roundCurrency(7 * avgDailyRev);
  const nextMonthProjectedRev = roundCurrency(28 * avgDailyRev);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[var(--text-primary)] dark:text-[var(--text-primary)]">ثبت فروش روزانه و ضایعات</h2>
          <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-medium mt-0.5">
            ثبت سریع تعداد فروش روزانه و گزارش‌گیری ضایعات انبار
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={openWasteModal} className="border-[var(--border-subtle)] dark:border-[var(--border-subtle)] dark:bg-[var(--bg-card)] text-[var(--text-primary)] dark:text-[var(--text-primary)]">
            <AlertOctagon className="h-4 w-4 text-[var(--status-error-text)] dark:text-[var(--status-error-text)]" />
            ثبت ضایعات
          </Button>

          <Button onClick={openNewSalesModal} className="bg-[var(--status-success-text)] hover:bg-[var(--status-success-text)]">
            <Plus className="h-4 w-4" />
            ثبت فروش روزانه
          </Button>
        </div>
      </div>

      {/* Sales Forecast Analytical Summary Card */}
      <Card className="border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] bg-gradient-to-br from-[var(--bg-base)] via-white to-amber-50/20 ">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] dark:text-[var(--status-warning-text)] border-[var(--status-warning-text)]/30 dark:border-[var(--status-warning-text)]/30 text-[11px] font-bold">
                  <Sparkles className="h-3 w-3 inline ml-1 text-[var(--status-warning-text)]" />
                  پیش‌بینی هوشمند فروش
                </Badge>
                <span className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-medium">
                  {isDataDriven
                    ? `بر اساس میانگین ${formatNumber(totalSalesDays)} روز فروش ثبت‌شده`
                    : 'بر اساس تخمین منوی اولیه'}
                </span>
              </div>
              <h3 className="text-sm font-extrabold text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2 pt-1">
                <TrendingUp className="h-4 w-4 text-[var(--brand-primary)]" />
                برآورد درآمد هفته و ماه آینده
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="px-3.5 py-2 rounded-xl bg-white dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] text-right">
                <span className="block text-[10px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-bold mb-0.5">
                  پیش‌بینی هفته آینده
                </span>
                <span className="text-sm font-black text-[var(--status-success-text)] dark:text-[var(--status-success-text)]">
                  {formatToman(nextWeekProjectedRev).text}
                </span>
              </div>

              <div className="px-3.5 py-2 rounded-xl bg-white dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] text-right">
                <span className="block text-[10px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-bold mb-0.5">
                  پیش‌بینی ۴ هفته (یک‌ماه)
                </span>
                <span className="text-sm font-black text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                  {formatToman(nextMonthProjectedRev).text}
                </span>
              </div>

              <Button
                variant="outline"
                onClick={() => setActiveTab('analytics')}
                className="text-xs border-[var(--border-subtle)] dark:border-[var(--border-subtle)] hover:bg-[var(--bg-base)] hover:bg-[var(--bg-base)]"
              >
                <BarChart3 className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
                مشاهده تحلیل کامل
                <ArrowUpRight className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales History List */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-extrabold text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
            <Receipt className="h-4 w-4 text-[var(--brand-primary)]" />
            تاریخچه فروش ثبت شده ({formatNumber(salesRecords.length)} روز)
          </h3>

          {salesRecords.length > 0 && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-[var(--text-secondary)]" />
              <input
                type="text"
                value={historySearchQuery}
                onChange={(e) => {
                  setHistorySearchQuery(e.target.value);
                  setSalesCurrentPage(1);
                }}
                placeholder="جستجو در تاریخ یا نام محصول..."
                className="w-full h-9 rounded-xl border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] bg-white dark:bg-[var(--bg-card)] pr-9 pl-3 text-xs font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)]"
              />
            </div>
          )}
        </div>

        {salesRecords.length === 0 ? (
          <Card className="p-8 text-center text-slate-500 dark:text-[var(--text-secondary)] text-xs font-medium">
            هنوز هیچ فروش روزانه‌ای ثبت نشده است. روی «ثبت فروش روز جدید» کلیک کنید.
          </Card>
        ) : (
          (() => {
            const filteredRecords = salesRecords.filter((record) => {
              if (!historySearchQuery.trim()) return true;
              const q = historySearchQuery.trim().toLowerCase();
              const readableDate = formatJalaliReadable(record.date).toLowerCase();
              const rawDate = record.date.toLowerCase();
              const persianRawDate = toPersianDigits(record.date).toLowerCase();
              const itemMatch = record.items?.some((item) =>
                item.menuItemName.toLowerCase().includes(q)
              );
              return (
                readableDate.includes(q) ||
                rawDate.includes(q) ||
                persianRawDate.includes(q) ||
                itemMatch
              );
            });

            const sortedRecords = [...filteredRecords].sort((a, b) => {
              let valA: any = a.date;
              let valB: any = b.date;

              if (salesSortField === 'date') {
                valA = a.date;
                valB = b.date;
              } else if (salesSortField === 'totalUnits') {
                valA = a.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
                valB = b.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
              } else if (salesSortField === 'totalRevenue') {
                valA = a.totalRevenue;
                valB = b.totalRevenue;
              } else if (salesSortField === 'totalCOGS') {
                valA = a.totalCOGS;
                valB = b.totalCOGS;
              } else if (salesSortField === 'grossProfit') {
                valA = a.totalRevenue - a.totalCOGS;
                valB = b.totalRevenue - b.totalCOGS;
              }

              if (typeof valA === 'string' && typeof valB === 'string') {
                return salesSortDirection === 'asc'
                  ? valA.localeCompare(valB)
                  : valB.localeCompare(valA);
              }

              return salesSortDirection === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
            });

            const totalSalesPages = Math.ceil(sortedRecords.length / salesPerPage) || 1;
            const validPage = Math.min(salesCurrentPage, totalSalesPages);
            const paginatedRecords = sortedRecords.slice(
              (validPage - 1) * salesPerPage,
              validPage * salesPerPage
            );

            if (sortedRecords.length === 0) {
              return (
                <Card className="p-6 text-center text-[var(--text-secondary)] dark:text-[var(--text-secondary)] text-xs font-medium">
                  گزارش فروشی منطبق با عبارت «{historySearchQuery}» یافت نشد.
                </Card>
              );
            }

            return (
              <Card className="overflow-hidden border border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border-b border-[var(--border-subtle)] dark:border-[var(--border-subtle)] text-[11px] font-black text-[var(--text-secondary)] dark:text-[var(--text-secondary)] select-none">
                        <th
                          onClick={() => handleSalesSort('date')}
                          className="p-3.5 cursor-pointer hover:text-[var(--text-primary)] hover:text-[var(--text-primary)] group transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>تاریخ ثبت</span>
                            {renderSalesSortIcon('date')}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSalesSort('totalUnits')}
                          className="p-3.5 cursor-pointer hover:text-[var(--text-primary)] hover:text-[var(--text-primary)] group transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>حجم فروش (تعداد کل)</span>
                            {renderSalesSortIcon('totalUnits')}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSalesSort('totalRevenue')}
                          className="p-3.5 cursor-pointer hover:text-[var(--text-primary)] hover:text-[var(--text-primary)] group transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>درآمد کل</span>
                            {renderSalesSortIcon('totalRevenue')}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSalesSort('totalCOGS')}
                          className="p-3.5 cursor-pointer hover:text-[var(--text-primary)] hover:text-[var(--text-primary)] group transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>بهای تمام شده (COGS)</span>
                            {renderSalesSortIcon('totalCOGS')}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSalesSort('grossProfit')}
                          className="p-3.5 cursor-pointer hover:text-[var(--text-primary)] hover:text-[var(--text-primary)] group transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>سود ناخالص</span>
                            {renderSalesSortIcon('grossProfit')}
                          </div>
                        </th>
                        <th className="p-3.5 text-center">عملیات</th>
                      </tr>
                    </thead>
                    <AnimatePresence mode="wait" custom={salesDirection}>
                      <motion.tbody
                        key={validPage}
                        custom={salesDirection}
                        variants={tablePageVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="divide-y divide-[var(--border-subtle)] divide-[var(--border-subtle)] text-xs"
                      >
                        {paginatedRecords.map((record) => {
                          const grossProfit = record.totalRevenue - record.totalCOGS;
                          const totalUnits = record.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
                          const typesCount = record.items?.length || 0;

                          return (
                            <motion.tr
                              key={record.id}
                              variants={tableRowVariants}
                              className="hover:bg-[var(--bg-base)]/60 hover:bg-[var(--bg-base)] transition-colors"
                            >
                              <td className="p-3.5 whitespace-nowrap">
                                <div className="font-extrabold text-[var(--text-primary)] dark:text-[var(--text-primary)] text-xs">
                                  {formatJalaliReadable(record.date)}
                                </div>
                                <div className="text-[10px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-mono mt-0.5">
                                  {toPersianDigits(record.date)}
                                </div>
                              </td>
                              <td className="p-3.5 whitespace-nowrap">
                                <div className="font-extrabold text-[var(--text-primary)] dark:text-[var(--text-primary)] text-xs flex items-center gap-1.5">
                                  <span className="text-[var(--brand-primary)] dark:text-[var(--status-warning-text)] font-black">
                                    {formatNumber(totalUnits)}
                                  </span>{' '}
                                  عدد
                                  <span className="text-[10px] text-[var(--text-secondary)] font-medium">
                                    ({formatNumber(typesCount)} نوع محصول)
                                  </span>
                                </div>
                              </td>
                              <td className="p-3.5 whitespace-nowrap font-black text-[var(--status-success-text)] dark:text-[var(--status-success-text)]">
                                {formatToman(record.totalRevenue).text}
                              </td>
                              <td className="p-3.5 whitespace-nowrap font-black text-[var(--brand-primary)] dark:text-[var(--status-warning-text)]">
                                {formatToman(record.totalCOGS).text}
                              </td>
                              <td className="p-3.5 whitespace-nowrap">
                                <span
                                  className={`font-black ${
                                    grossProfit >= 0
                                      ? 'text-[var(--status-success-text)] dark:text-[var(--status-success-text)]'
                                      : 'text-[var(--status-error-text)] dark:text-[var(--status-error-text)]'
                                  }`}
                                >
                                  {formatToman(grossProfit).text}
                                </span>
                              </td>
                              <td className="p-3.5 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => setDetailRecord(record)}
                                    className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--brand-primary)] rounded-lg bg-[var(--bg-base)] hover:bg-[var(--brand-primary-subtle)] transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold px-2.5"
                                    title="مشاهده جزئیات فاکتور"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    <span>جزئیات</span>
                                  </button>
                                  <button
                                    onClick={() => openEditSalesModal(record)}
                                    className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--brand-primary)] dark:hover:text-[var(--status-warning-text)] rounded-lg hover:bg-[var(--bg-base)] hover:bg-[var(--bg-base)] transition-colors cursor-pointer"
                                    title="ویرایش"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => record.id && handleDeleteSalesRecord(record.id)}
                                    className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--status-error-text)] dark:hover:text-[var(--status-error-text)] rounded-lg hover:bg-[var(--bg-base)] hover:bg-[var(--bg-base)] transition-colors cursor-pointer"
                                    title="حذف"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </motion.tbody>
                    </AnimatePresence>
                  </table>
                </div>

                <Pagination
                  currentPage={validPage}
                  totalPages={totalSalesPages}
                  totalItems={sortedRecords.length}
                  itemsPerPage={salesPerPage}
                  onPageChange={handleSalesPageChange}
                  onItemsPerPageChange={(newSize) => {
                    setSalesPerPage(newSize);
                    setSalesCurrentPage(1);
                  }}
                  itemsPerPageOptions={[5, 8, 10, 12, 15]}
                  itemLabel="فاکتور ثبت‌شده"
                />
              </Card>
            );
          })()
        )}
      </div>

      {/* Waste History List */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-extrabold text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
            <AlertOctagon className="h-4 w-4 text-[var(--status-error-text)] dark:text-[var(--status-error-text)]" />
            تاریخچه ضایعات و سوختگی ثبت شده ({formatNumber(groupedWasteRecords.length)} روز)
          </h3>

          {groupedWasteRecords.length > 0 && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-[var(--text-secondary)]" />
              <input
                type="text"
                value={wasteSearchQuery}
                onChange={(e) => {
                  setWasteSearchQuery(e.target.value);
                  setWastePage(1);
                }}
                placeholder="جستجو در تاریخ، نام محصول یا علت..."
                className="w-full h-9 rounded-xl border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] bg-white dark:bg-[var(--bg-card)] pr-9 pl-3 text-xs font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>
          )}
        </div>

        {groupedWasteRecords.length === 0 ? (
          <Card className="p-8 text-center text-slate-500 dark:text-[var(--text-secondary)] text-xs font-medium">
            هنوز هیچ گزارش ضایعاتی ثبت نشده است. روی «ثبت ضایعات» کلیک کنید.
          </Card>
        ) : (
          (() => {
            const filteredGroups = groupedWasteRecords.filter((group) => {
              if (!wasteSearchQuery.trim()) return true;
              const q = wasteSearchQuery.trim().toLowerCase();
              const readableDate = formatJalaliReadable(group.date).toLowerCase();
              const rawDate = group.date.toLowerCase();
              const persianRawDate = toPersianDigits(group.date).toLowerCase();
              const itemMatch = group.logs.some(
                (l) => l.itemName.toLowerCase().includes(q) || (l.reason && l.reason.toLowerCase().includes(q))
              );
              return (
                readableDate.includes(q) ||
                rawDate.includes(q) ||
                persianRawDate.includes(q) ||
                itemMatch
              );
            });

            const sortedGroups = [...filteredGroups].sort((a, b) => {
              let valA: any = a.date;
              let valB: any = b.date;

              if (wasteSortField === 'date') {
                valA = a.date;
                valB = b.date;
              } else if (wasteSortField === 'totalUnits') {
                valA = a.logs.length;
                valB = b.logs.length;
              } else if (wasteSortField === 'totalCost') {
                valA = a.totalCost;
                valB = b.totalCost;
              }

              if (typeof valA === 'string' && typeof valB === 'string') {
                return wasteSortDirection === 'asc'
                  ? valA.localeCompare(valB)
                  : valB.localeCompare(valA);
              }

              return wasteSortDirection === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
            });

            const totalWastePages = Math.ceil(sortedGroups.length / wastePerPage) || 1;
            const validWastePage = Math.min(wastePage, totalWastePages);
            const paginatedGroups = sortedGroups.slice(
              (validWastePage - 1) * wastePerPage,
              validWastePage * wastePerPage
            );

            if (sortedGroups.length === 0) {
              return (
                <Card className="p-6 text-center text-[var(--text-secondary)] dark:text-[var(--text-secondary)] text-xs font-medium">
                  گزارش ضایعاتی منطبق با عبارت «{wasteSearchQuery}» یافت نشد.
                </Card>
              );
            }

            return (
              <Card className="overflow-hidden border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] border-r-4 border-r-rose-500">
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border-b border-[var(--border-subtle)] dark:border-[var(--border-subtle)] text-[11px] font-black text-[var(--text-secondary)] dark:text-[var(--text-secondary)] select-none">
                        <th
                          onClick={() => handleWasteSort('date')}
                          className="p-3.5 cursor-pointer hover:text-[var(--text-primary)] hover:text-[var(--text-primary)] group transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>تاریخ ثبت</span>
                            {renderWasteSortIcon('date')}
                          </div>
                        </th>
                        <th
                          onClick={() => handleWasteSort('totalUnits')}
                          className="p-3.5 cursor-pointer hover:text-[var(--text-primary)] hover:text-[var(--text-primary)] group transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>تعداد موارد ضایعات</span>
                            {renderWasteSortIcon('totalUnits')}
                          </div>
                        </th>
                        <th
                          onClick={() => handleWasteSort('totalCost')}
                          className="p-3.5 cursor-pointer hover:text-[var(--text-primary)] hover:text-[var(--text-primary)] group transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>مجموع خسارت مالی</span>
                            {renderWasteSortIcon('totalCost')}
                          </div>
                        </th>
                        <th className="p-3.5">علت‌های اصلی ضایعات</th>
                        <th className="p-3.5 text-center">عملیات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)] divide-[var(--border-subtle)] text-xs">
                      {paginatedGroups.map((group) => {
                        return (
                          <tr
                            key={group.date}
                            className="hover:bg-[var(--bg-base)]/60 hover:bg-[var(--bg-base)] transition-colors"
                          >
                            <td className="p-3.5 whitespace-nowrap">
                              <div className="font-extrabold text-[var(--text-primary)] dark:text-[var(--text-primary)] text-xs">
                                {formatJalaliReadable(group.date)}
                              </div>
                              <div className="text-[10px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-mono mt-0.5">
                                {toPersianDigits(group.date)}
                              </div>
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <div className="font-extrabold text-[var(--text-primary)] dark:text-[var(--text-primary)] text-xs flex items-center gap-1.5">
                                <span className="text-[var(--status-error-text)] dark:text-[var(--status-error-text)] font-black">
                                  {formatNumber(group.logs.length)}
                                </span>{' '}
                                مورد ضایعات
                              </div>
                            </td>
                            <td className="p-3.5 whitespace-nowrap font-black text-[var(--status-error-text)] dark:text-[var(--status-error-text)]">
                              {formatToman(group.totalCost).text}
                            </td>
                            <td className="p-3.5">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {group.reasons.slice(0, 2).map((r, i) => (
                                  <Badge
                                    key={i}
                                    variant="outline"
                                    className="text-[10px] bg-[var(--status-error-bg)] text-[var(--status-error-text)] dark:text-rose-300 border-[var(--status-error-text)]/30 dark:border-[var(--status-error-text)]/30"
                                  >
                                    {r}
                                  </Badge>
                                ))}
                                {group.reasons.length > 2 && (
                                  <span className="text-[10px] text-[var(--text-secondary)] font-bold self-center">
                                    +{toPersianDigits(group.reasons.length - 2)} موارد دیگر
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3.5 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => setDetailWasteDate(group.date)}
                                  className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--status-error-text)] rounded-lg bg-[var(--bg-base)] hover:bg-[var(--status-error-bg)] transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold px-2.5"
                                  title="مشاهده جزئیات ضایعات"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  <span>جزئیات</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setWasteDate(group.date);
                                    openWasteModal();
                                  }}
                                  className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--status-error-text)] dark:hover:text-[var(--status-error-text)] rounded-lg hover:bg-[var(--bg-base)] hover:bg-[var(--bg-base)] transition-colors cursor-pointer"
                                  title="ثبت ضایعات در این تاریخ"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteWasteGroup(group)}
                                  className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--status-error-text)] dark:hover:text-[var(--status-error-text)] rounded-lg hover:bg-[var(--bg-base)] hover:bg-[var(--bg-base)] transition-colors cursor-pointer"
                                  title="حذف کلیه ضایعات این تاریخ"
                                >
                                  <Trash2 className="h-4 w-4" />
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
                  currentPage={validWastePage}
                  totalPages={totalWastePages}
                  totalItems={sortedGroups.length}
                  itemsPerPage={wastePerPage}
                  onPageChange={(p) => setWastePage(p)}
                  onItemsPerPageChange={(newSize) => {
                    setWastePerPage(newSize);
                    setWastePage(1);
                  }}
                  itemsPerPageOptions={[5, 8, 10, 12, 15]}
                  itemLabel="روز ثبت ضایعات"
                />
              </Card>
            );
          })()
        )}
      </div>

      {/* Stepper Daily Sales Modal */}
      <Modal
        isOpen={isSalesModalOpen}
        onClose={() => {
          setIsSalesModalOpen(false);
          setEditingRecordId(null);
        }}
        title={editingRecordId ? 'ویرایش گزارش فروش روزانه' : 'ثبت فروش روز جدید'}
        description={editingRecordId ? 'تعداد فروش محصولات در این تاریخ را اصلاح و ویرایش کنید.' : 'تعداد فروش هر محصول منو در این روز را مشخص کنید.'}
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveSales} noValidate className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-extrabold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                  تاریخ فروش
                </label>
              </div>

              <div className="w-full">
                <JalaliDatePicker
                  value={salesDate}
                  onChange={setSalesDate}
                  minDate={MIN_JALALI_DATE}
                  maxDate={getTodayJalaliIso()}
                  showSteppers={true}
                  className="w-full"
                />
              </div>

              {existingSalesRecord && (
                <div className="mt-1.5 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] dark:text-[var(--status-warning-text)] border border-[var(--status-warning-text)]/30 dark:border-[var(--status-warning-text)]/30 text-[11px] font-bold">
                  <Pencil className="h-3 w-3 shrink-0 text-[var(--status-warning-text)] dark:text-[var(--status-warning-text)]" />
                  <span>اطلاعات این تاریخ بارگذاری شد (ویرایش فاکتور موجود)</span>
                </div>
              )}

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-[10px] text-[var(--text-secondary)] font-bold shrink-0">میانبر:</span>
                <button
                  type="button"
                  onClick={() => setSalesDate(getTodayJalaliIso())}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold cursor-pointer transition-colors ${
                    normalizeDateStr(salesDate) === normalizeDateStr(getTodayJalaliIso())
                      ? 'bg-[var(--brand-primary)] text-white'
                      : 'bg-[var(--bg-base)] dark:bg-[var(--bg-card)] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] hover:bg-stone-200 dark:hover:bg-stone-700'
                  }`}
                >
                  امروز
                </button>
                <button
                  type="button"
                  onClick={() => setSalesDate(getShiftedJalaliIso(getTodayJalaliIso(), -1))}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold cursor-pointer transition-colors ${
                    normalizeDateStr(salesDate) === normalizeDateStr(getShiftedJalaliIso(getTodayJalaliIso(), -1))
                      ? 'bg-[var(--brand-primary)] text-white'
                      : 'bg-[var(--bg-base)] dark:bg-[var(--bg-card)] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] hover:bg-stone-200 dark:hover:bg-stone-700'
                  }`}
                >
                  دیروز
                </button>
                <button
                  type="button"
                  onClick={() => setSalesDate(getShiftedJalaliIso(getTodayJalaliIso(), -2))}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold cursor-pointer transition-colors ${
                    normalizeDateStr(salesDate) === normalizeDateStr(getShiftedJalaliIso(getTodayJalaliIso(), -2))
                      ? 'bg-[var(--brand-primary)] text-white'
                      : 'bg-[var(--bg-base)] dark:bg-[var(--bg-card)] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] hover:bg-stone-200 dark:hover:bg-stone-700'
                  }`}
                >
                  پریروز
                </button>
              </div>
            </div>

            <div>
              <SearchableSelect
                label="افزودن آیتم از منو"
                placeholder="انتخاب محصول..."
                searchPlaceholder="جستجوی نام محصول..."
                options={menuItems.map((m) => ({
                  value: m.id!,
                  label: m.name,
                  sublabel: `قیمت: ${formatToman(m.sellingPrice).text}`,
                }))}
                value=""
                onChange={(selectedId) => {
                  if (selectedId) {
                    updateItemQty(Number(selectedId), 1);
                  }
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-extrabold text-[var(--text-primary)] dark:text-[var(--text-primary)] pt-1 border-t border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
            <span>محصولات در فاکتور ({formatNumber(salesItems.filter((i) => i.quantity > 0).length)} نوع)</span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setSalesItems(menuItems.map((m) => ({ menuItemId: m.id!, quantity: 1 })));
                }}
                className="text-[11px] font-extrabold text-[var(--brand-primary)] hover:underline cursor-pointer"
              >
                + افزودن همه محصولات
              </button>
              {salesItems.some((i) => i.quantity > 0) && (
                <button
                  type="button"
                  onClick={() => setSalesItems([])}
                  className="text-[11px] font-extrabold text-[var(--text-secondary)] hover:text-[var(--status-error-text)] cursor-pointer"
                >
                  پاکسازی فاکتور
                </button>
              )}
            </div>
          </div>

          {/* Selected Items List */}
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {salesItems.filter((si) => si.quantity > 0).length === 0 ? (
              <div className="p-6 text-center border-2 border-dashed border-[var(--border-subtle)] dark:border-[var(--border-subtle)] rounded-2xl bg-[var(--bg-base)]/50 dark:bg-[var(--bg-card)]">
                <ShoppingCart className="h-8 w-8 text-stone-300 dark:text-[var(--text-secondary)] mx-auto mb-2" />
                <p className="text-xs font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                  هیچ محصولی هنوز به فاکتور اضافه نشده است.
                </p>
                <p className="text-[11px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] mt-1">
                  از منوی کشویی بالا، محصول مورد نظر را جستجو و انتخاب کنید.
                </p>
              </div>
            ) : (
              salesItems
                .filter((si) => si.quantity > 0)
                .map((si) => {
                  const item = menuItems.find((m) => m.id === si.menuItemId);
                  if (!item) return null;
                  const totalRowRevenue = si.quantity * item.sellingPrice;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] bg-[var(--bg-base)]/80 dark:bg-[var(--bg-card)] hover:bg-white hover:bg-[var(--bg-base)] transition-colors gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="font-extrabold text-xs text-[var(--text-primary)] dark:text-[var(--text-primary)] block truncate">
                          {item.name}
                        </span>
                        <span className="text-[11px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-medium">
                          تک: {formatToman(item.sellingPrice).text} | جمع: {formatToman(totalRowRevenue).text}
                        </span>
                      </div>

                      {/* Stepper Controls */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1.5 bg-white dark:bg-[var(--bg-card)] p-1 rounded-xl border border-[var(--border-subtle)] dark:border-[var(--border-functional)]">
                          <button
                            type="button"
                            onClick={() => item.id && updateItemQty(item.id, -1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--bg-base)] dark:bg-stone-700 text-[var(--text-primary)] dark:text-[var(--text-primary)] font-bold hover:bg-stone-200 dark:hover:bg-stone-600 cursor-pointer transition-colors text-xs"
                          >
                            -
                          </button>

                          <input
                            type="text"
                            inputMode="numeric"
                            value={toPersianDigits(si.quantity)}
                            onChange={(e) => {
                              if (item.id) {
                                const eng = toEnglishDigits(e.target.value);
                                setDirectItemQty(item.id, eng === '' ? 0 : Number(eng));
                              }
                            }}
                            className="w-12 h-7 rounded-md bg-transparent text-center font-black text-xs text-[var(--text-primary)] dark:text-[var(--text-primary)] focus:outline-hidden focus:ring-1 focus:ring-[var(--brand-primary)]"
                          />

                          <button
                            type="button"
                            onClick={() => item.id && updateItemQty(item.id, 1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--brand-primary-subtle)] text-[var(--brand-primary)] font-bold hover:bg-[var(--brand-primary)]/20 cursor-pointer transition-colors text-xs"
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => item.id && setDirectItemQty(item.id, 0)}
                          className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--status-error-text)] rounded-lg hover:bg-[var(--status-error-bg)] cursor-pointer transition-colors"
                          title="حذف از فاکتور"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
            )}
          </div>

          {/* Modal Summary Banner */}
          <div className="rounded-2xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] p-4 flex justify-between items-center text-xs shadow-2xs transition-colors">
            <div>
              <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-extrabold block">جمع درآمد روزانه:</span>
              <span className="text-base font-black text-[var(--status-success-text)] dark:text-[var(--status-success-text)] mt-0.5 block">
                {formatToman(modalTotalRevenue).text}
              </span>
            </div>
            <div className="text-left dir-ltr">
              <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-extrabold block">جمع بهای تمام شده تولید:</span>
              <span className="text-base font-black text-[var(--brand-primary)] dark:text-[var(--status-error-text)] mt-0.5 block">
                {formatToman(modalTotalCOGS).text}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsSalesModalOpen(false);
                setEditingRecordId(null);
              }}
              className="h-10 px-4 rounded-xl text-xs font-bold"
            >
              انصراف
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting} className="h-10 px-4 rounded-xl text-xs font-black">
              {isSubmitting ? 'در حال ثبت...' : (editingRecordId ? 'ذخیره تغییرات' : 'ثبت فروش امروز')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Log Waste Modal */}
      <Modal
        isOpen={isWasteModalOpen}
        onClose={() => {
          setIsWasteModalOpen(false);
          setEditingWasteId(null);
        }}
        title={editingWasteId ? "ویرایش گزارش ضایعات" : "ثبت ضایعات و آسیب‌دیدگی انبار"}
        description={editingWasteId ? "مشخصات و میزان خسارت ضایعات را ویرایش کنید." : "انتخاب ماده اولیه یا آیتم منو جهت محاسبه خودکار خسارت مالی"}
      >
        <form onSubmit={handleSaveWaste} noValidate className="space-y-5">
          {/* 0. Date Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-extrabold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                تاریخ ثبت ضایعات
              </label>
            </div>

            <div className="w-full">
              <JalaliDatePicker
                value={wasteDate}
                onChange={setWasteDate}
                minDate={MIN_JALALI_DATE}
                maxDate={getTodayJalaliIso()}
                showSteppers={true}
                className="w-full"
              />
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[10px] text-[var(--text-secondary)] font-bold shrink-0">میانبر:</span>
              <button
                type="button"
                onClick={() => setWasteDate(getTodayJalaliIso())}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold cursor-pointer transition-colors ${
                  normalizeDateStr(wasteDate) === normalizeDateStr(getTodayJalaliIso())
                    ? 'bg-rose-600 text-white'
                    : 'bg-[var(--bg-base)] dark:bg-[var(--bg-card)] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                امروز
              </button>
              <button
                type="button"
                onClick={() => setWasteDate(getShiftedJalaliIso(getTodayJalaliIso(), -1))}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold cursor-pointer transition-colors ${
                  normalizeDateStr(wasteDate) === normalizeDateStr(getShiftedJalaliIso(getTodayJalaliIso(), -1))
                    ? 'bg-rose-600 text-white'
                    : 'bg-[var(--bg-base)] dark:bg-[var(--bg-card)] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                دیروز
              </button>
              <button
                type="button"
                onClick={() => setWasteDate(getShiftedJalaliIso(getTodayJalaliIso(), -2))}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold cursor-pointer transition-colors ${
                  normalizeDateStr(wasteDate) === normalizeDateStr(getShiftedJalaliIso(getTodayJalaliIso(), -2))
                    ? 'bg-rose-600 text-white'
                    : 'bg-[var(--bg-base)] dark:bg-[var(--bg-card)] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                پریروز
              </button>
            </div>
          </div>

          {/* 1. Type Selector Toggle */}
          <div>
            <label className="block text-xs font-extrabold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-2">
              نوع ضایعات
            </label>
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-[var(--bg-base)] dark:bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] dark:border-[var(--border-functional)]">
              <button
                type="button"
                onClick={() => setWasteType('ingredient')}
                className={cn(
                  'flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer',
                  wasteType === 'ingredient'
                    ? 'bg-white dark:bg-[var(--bg-card)] text-[var(--brand-primary)] shadow-xs border border-[var(--border-subtle)] dark:border-[var(--border-functional)]'
                    : 'text-[var(--text-secondary)] dark:text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:text-[var(--text-primary)]'
                )}
              >
                <Package className="h-4 w-4" />
                <span>ماده اولیه (انبار)</span>
              </button>

              <button
                type="button"
                onClick={() => setWasteType('menuItem')}
                className={cn(
                  'flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer',
                  wasteType === 'menuItem'
                    ? 'bg-white dark:bg-[var(--bg-card)] text-[var(--brand-primary)] shadow-xs border border-[var(--border-subtle)] dark:border-[var(--border-functional)]'
                    : 'text-[var(--text-secondary)] dark:text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:text-[var(--text-primary)]'
                )}
              >
                <Utensils className="h-4 w-4" />
                <span>آیتم منو (محصول آماده)</span>
              </button>
            </div>
          </div>

          {/* 2. Item Selector Dropdown */}
          {wasteType === 'ingredient' ? (
            <div>
              {ingredients.length === 0 ? (
                <div className="p-4 rounded-2xl bg-[var(--status-warning-bg)] border border-[var(--status-warning-text)]/30 dark:border-[var(--status-warning-text)]/30 text-[var(--status-warning-text)] dark:text-amber-200 text-xs font-extrabold flex items-center justify-between gap-2">
                  <span>هیچ ماده اولیه‌ای در انبار ثبت نشده است.</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsWasteModalOpen(false);
                      setActiveTab('inventory');
                    }}
                    className="text-[11px]"
                  >
                    مدیریت انبار
                  </Button>
                </div>
              ) : (
                <SearchableSelect
                  label="انتخاب ماده اولیه از انبار"
                  options={ingredients.map((ing) => ({
                    value: ing.id!,
                    label: ing.name,
                    sublabel: `فی: ${formatToman(ing.unitCost).text} / ${getUnitLabel(ing.unit)} | موجودی: ${formatNumber(ing.currentStock)} ${getUnitLabel(ing.unit)}`,
                  }))}
                  value={selectedIngredientId}
                  onChange={(val) => setSelectedIngredientId(val as number)}
                  placeholder="جستجو و انتخاب ماده اولیه..."
                />
              )}
            </div>
          ) : (
            <div>
              {menuItems.length === 0 ? (
                <div className="p-4 rounded-2xl bg-[var(--status-warning-bg)] border border-[var(--status-warning-text)]/30 dark:border-[var(--status-warning-text)]/30 text-[var(--status-warning-text)] dark:text-amber-200 text-xs font-extrabold flex items-center justify-between gap-2">
                  <span>هیچ آیتم منویی ثبت نشده است.</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsWasteModalOpen(false);
                      setActiveTab('menu');
                    }}
                    className="text-[11px]"
                  >
                    مدیریت منو
                  </Button>
                </div>
              ) : (
                <SearchableSelect
                  label="انتخاب محصول / آیتم منو"
                  options={menuItems.map((mi) => ({
                    value: mi.id!,
                    label: mi.name,
                    sublabel: `قیمت تمام شده (COGS): ${formatToman(mi.primeCost).text} | دسته‌بندی: ${mi.category}`,
                  }))}
                  value={selectedMenuItemId}
                  onChange={(val) => setSelectedMenuItemId(val as number)}
                  placeholder="جستجو و انتخاب آیتم منو..."
                />
              )}
            </div>
          )}

          {/* 3. Quantity Input */}
          <div>
            <label className="block text-xs font-extrabold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-1.5">
              مقدار / تعداد ضایعات
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                inputMode="decimal"
                required
                value={wasteQty === '' ? '' : toPersianDigits(wasteQty)}
                onChange={(e) => {
                  const val = e.target.value;
                  const eng = toEnglishDigits(val).replace(',', '.').replace('/', '.');
                  if (eng === '') setWasteQty('');
                  else if (/^\d*\.?\d*$/.test(eng)) setWasteQty(val);
                }}
                placeholder={wasteType === 'ingredient' ? 'مثلاً: ۱.۵' : 'مثلاً: ۲'}
                className="w-full h-11 rounded-xl border border-[var(--border-subtle)] dark:border-[var(--border-functional)] bg-white dark:bg-[var(--bg-card)] pr-3.5 pl-24 py-2 text-sm font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-all dir-rtl"
              />
              <div className="absolute left-2 px-2.5 py-1 rounded-lg bg-[var(--bg-base)] dark:bg-[var(--bg-card)] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] text-xs font-extrabold pointer-events-none">
                {currentWasteUnit}
              </div>
            </div>

            {wasteType === 'ingredient' && selectedIng && wasteQtyNum > selectedIng.currentStock && (
              <p className="mt-1.5 text-[11px] font-extrabold text-[var(--status-warning-text)] dark:text-[var(--status-warning-text)] flex items-center gap-1">
                <span>⚠️ توجه: مقدار ضایعات ({formatNumber(wasteQtyNum)}) بیشتر از موجودی انبار ({formatNumber(selectedIng.currentStock)} {getUnitLabel(selectedIng.unit)}) است.</span>
              </p>
            )}
          </div>

          {/* 4. Auto-Calculated Cost Card */}
          <div className="p-4 rounded-2xl bg-[var(--status-error-bg)] border border-[var(--status-error-text)]/20 space-y-2">
            <div className="flex items-center justify-between text-xs font-extrabold text-[var(--text-primary)]">
              <span className="flex items-center gap-1.5 text-[var(--status-error-text)]">
                <Calculator className="h-4 w-4" />
                <span>محاسبه خودکار خسارت مالی</span>
              </span>
              <span className="text-[var(--text-secondary)] font-bold text-[11px]">بر اساس قیمت انبار و فرمول ساخت</span>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <span className="text-xs font-bold text-[var(--text-secondary)]">
                مبلغ کل ضایعات:
              </span>
              <div className="text-left">
                <span className="text-xl font-black text-[var(--status-error-text)] ml-1">
                  {formatToman(autoCalculatedCost).text}
                </span>
              </div>
            </div>

            {/* Formula Breakdown */}
            <div className="pt-2 border-t border-[var(--status-error-text)]/20 flex items-center justify-between text-[11px] font-bold text-[var(--text-secondary)]">
              <span>فرمول محاسبه:</span>
              <span className="text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                {formatNumber(wasteQtyNum)} {currentWasteUnit} × {formatToman(unitCost).text}
              </span>
            </div>

            {/* Inventory deduction preview */}
            {wasteType === 'ingredient' && selectedIng && (
              <div className="text-[11px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)] flex items-center justify-between pt-1">
                <span>تاثیر بر انبار:</span>
                <span className="text-[var(--text-primary)] dark:text-[var(--text-secondary)]">
                  موجودی {formatNumber(selectedIng.currentStock)} ➔ پس از ثبت: {formatNumber(Math.max(0, roundCurrency(selectedIng.currentStock - wasteQtyNum)))} {getUnitLabel(selectedIng.unit)}
                </span>
              </div>
            )}
          </div>

          {/* 5. Reason Field with Quick Presets */}
          <div>
            <label className="block text-xs font-extrabold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-1.5">
              علت ضایعات
            </label>
            
            <div className="flex flex-wrap gap-1.5 mb-2">
              {[
                'انقضا و فساد تاریخ مصرف',
                'سوختگی و خرابی در پخت',
                'آسیب در انبار یا حمل‌ونقل',
                'خرابی یخچال و تجهیزات',
                'مرجوعی و اشتباه سفارش',
                'افت کیفیت فرآوری اولیه',
              ].map((reasonPreset) => (
                <button
                  key={reasonPreset}
                  type="button"
                  onClick={() => setWasteReason(reasonPreset)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border',
                    wasteReason === reasonPreset
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-[var(--bg-base)] dark:bg-[var(--bg-card)] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] border-[var(--border-subtle)] dark:border-[var(--border-functional)] hover:bg-[var(--bg-base)] dark:hover:bg-stone-700'
                  )}
                >
                  {reasonPreset}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={wasteReason}
              onChange={(e) => setWasteReason(e.target.value)}
              placeholder="یا علت سفارشی را تایپ کنید..."
              className="w-full h-10 rounded-xl border border-[var(--border-subtle)] dark:border-[var(--border-functional)] bg-white dark:bg-[var(--bg-card)] px-3.5 py-2 text-xs font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-all dir-rtl"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsWasteModalOpen(false);
                setEditingWasteId(null);
              }}
              className="h-10 px-4 rounded-xl text-xs font-bold"
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={wasteQtyNum <= 0 || (wasteType === 'ingredient' ? !selectedIngredientId : !selectedMenuItemId)}
              className="h-10 px-5 rounded-xl text-xs font-black shadow-md shadow-[var(--status-error-text)]/20"
            >
              {editingWasteId ? 'ذخیره تغییرات' : 'ثبت قطعی ضایعات'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Sales Record Details Modal */}
      <Modal
        isOpen={!!detailRecord}
        onClose={() => setDetailRecord(null)}
        title="جزئیات فاکتور فروش روزانه"
        description={
          detailRecord
            ? `گزارش کامل اقلام فروخته‌شده در تاریخ ${formatJalaliReadable(detailRecord.date)} (${toPersianDigits(detailRecord.date)})`
            : ''
        }
        maxWidth="2xl"
      >
        {detailRecord && (
          <div className="space-y-4">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="p-3 rounded-2xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] text-right">
                <span className="text-[10px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-bold block">درآمد کل</span>
                <span className="text-xs sm:text-sm font-black text-[var(--status-success-text)] dark:text-[var(--status-success-text)] mt-0.5 block">
                  {formatToman(detailRecord.totalRevenue).text}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] text-right">
                <span className="text-[10px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-bold block">بهای تمام شده</span>
                <span className="text-xs sm:text-sm font-black text-[var(--brand-primary)] dark:text-[var(--status-warning-text)] mt-0.5 block">
                  {formatToman(detailRecord.totalCOGS).text}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] text-right">
                <span className="text-[10px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-bold block">سود ناخالص</span>
                <span
                  className={`text-xs sm:text-sm font-black mt-0.5 block ${
                    detailRecord.totalRevenue - detailRecord.totalCOGS >= 0
                      ? 'text-[var(--status-success-text)] dark:text-[var(--status-success-text)]'
                      : 'text-[var(--status-error-text)] dark:text-[var(--status-error-text)]'
                  }`}
                >
                  {formatToman(detailRecord.totalRevenue - detailRecord.totalCOGS).text}
                </span>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] rounded-2xl overflow-hidden">
              <div className="bg-[var(--bg-base)] dark:bg-[var(--bg-card)] p-3 border-b border-[var(--border-subtle)] dark:border-[var(--border-subtle)] flex justify-between items-center text-xs font-black text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                <span>اقلام فروخته‌شده</span>
                <Badge variant="primary">
                  {formatNumber(detailRecord.items?.reduce((sum, i) => sum + i.quantity, 0) || 0)} عدد در {formatNumber(detailRecord.items?.length || 0)} محصول
                </Badge>
              </div>

              <div className="max-h-64 overflow-y-auto custom-scrollbar">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[var(--bg-base)]/50 dark:bg-[var(--bg-card)] text-[10px] text-[var(--text-secondary)] font-black border-b border-[var(--border-subtle)] dark:border-[var(--border-subtle)] sticky top-0 backdrop-blur-xs">
                    <tr>
                      <th className="p-2.5">نام محصول</th>
                      <th className="p-2.5 text-center">تعداد</th>
                      <th className="p-2.5">قیمت واحد</th>
                      <th className="p-2.5">جمع درآمد</th>
                      <th className="p-2.5">بهای تمام‌شده کل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)] divide-[var(--border-subtle)] font-medium">
                    {detailRecord.items?.map((item, idx) => {
                      const unitSellingPrice = item.unitSellingPrice ?? (item as any).unitPrice ?? 0;
                      const unitCost = item.unitCost ?? (item as any).unitCOGS ?? 0;
                      const totalRowRevenue = item.totalRevenue ?? (unitSellingPrice * item.quantity);
                      const totalRowCOGS = item.totalCost ?? (unitCost * item.quantity);
                      return (
                        <tr key={idx} className="hover:bg-[var(--bg-base)]/60 hover:bg-[var(--bg-base)] transition-colors">
                          <td className="p-2.5 font-extrabold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                            {item.menuItemName}
                          </td>
                          <td className="p-2.5 text-center font-black text-[var(--brand-primary)] dark:text-[var(--status-warning-text)]">
                            {formatNumber(item.quantity)} عدد
                          </td>
                          <td className="p-2.5 text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                            {formatToman(unitSellingPrice).text}
                          </td>
                          <td className="p-2.5 font-bold text-[var(--status-success-text)] dark:text-[var(--status-success-text)]">
                            {formatToman(totalRowRevenue).text}
                          </td>
                          <td className="p-2.5 text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-bold">
                            {formatToman(totalRowCOGS).text}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const r = detailRecord;
                  setDetailRecord(null);
                  if (r) openEditSalesModal(r);
                }}
                className="h-9 px-3.5 rounded-xl text-xs font-bold text-[var(--brand-primary)] border-[var(--brand-primary)]/30 hover:bg-[var(--brand-primary-subtle)]"
              >
                <Pencil className="h-3.5 w-3.5 ml-1.5" />
                ویرایش این فاکتور
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={() => setDetailRecord(null)}
                className="h-9 px-4 rounded-xl text-xs font-bold"
              >
                بستن
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Waste Details Modal */}
      <Modal
        isOpen={!!currentWasteDetailGroup}
        onClose={() => setDetailWasteDate(null)}
        title="جزئیات ضایعات ثبت‌شده"
        description={
          currentWasteDetailGroup
            ? `گزارش کامل ضایعات ثبت‌شده در تاریخ ${formatJalaliReadable(currentWasteDetailGroup.date)} (${toPersianDigits(currentWasteDetailGroup.date)})`
            : ''
        }
        maxWidth="2xl"
      >
        {currentWasteDetailGroup && (
          <div className="space-y-4">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-[var(--status-error-bg)] border border-[var(--status-error-text)]/30 dark:border-[var(--status-error-text)]/30 flex items-center justify-between text-right">
                <div>
                  <span className="block text-[11px] font-bold text-[var(--status-error-text)] dark:text-rose-300">مجموع خسارت مالی</span>
                  <span className="text-sm font-black text-[var(--status-error-text)] dark:text-[var(--status-error-text)] mt-0.5 block">
                    {formatToman(currentWasteDetailGroup.totalCost).text}
                  </span>
                </div>
                <AlertOctagon className="h-6 w-6 text-[var(--status-error-text)] opacity-80 shrink-0" />
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] text-right flex items-center justify-between">
                <div>
                  <span className="block text-[11px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">تعداد موارد ضایعات</span>
                  <span className="text-sm font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] mt-0.5 block">
                    {formatNumber(currentWasteDetailGroup.logs.length)} مورد ثبت‌شده
                  </span>
                </div>
                <Receipt className="h-6 w-6 text-[var(--text-secondary)] opacity-80 shrink-0" />
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] rounded-2xl overflow-hidden bg-white dark:bg-[var(--bg-card)]">
              <div className="bg-[var(--bg-base)] dark:bg-[var(--bg-card)] p-3 border-b border-[var(--border-subtle)] dark:border-[var(--border-subtle)] flex justify-between items-center text-xs font-black text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                <span>اقلام و محصولات ضایعاتی</span>
                <Badge variant="outline" className="bg-[var(--status-error-bg)] text-[var(--status-error-text)] dark:text-rose-300 border-[var(--status-error-text)]/30 dark:border-[var(--status-error-text)]/30">
                  {formatNumber(currentWasteDetailGroup.logs.length)} ردیف ثبت‌شده
                </Badge>
              </div>

              <div className="max-h-64 overflow-y-auto custom-scrollbar">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[var(--bg-base)]/80 dark:bg-[var(--bg-card)] text-[10px] text-[var(--text-secondary)] font-black border-b border-[var(--border-subtle)] dark:border-[var(--border-subtle)] sticky top-0 backdrop-blur-xs">
                    <tr>
                      <th className="p-2.5">عنوان آیتم / ماده</th>
                      <th className="p-2.5">نوع</th>
                      <th className="p-2.5">مقدار</th>
                      <th className="p-2.5">خسارت مالی</th>
                      <th className="p-2.5">علت ضایعات</th>
                      <th className="p-2.5 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)] divide-[var(--border-subtle)] font-medium">
                    {currentWasteDetailGroup.logs.map((log) => {
                      const isIng = Boolean(log.ingredientId) || (!log.menuItemId && ingredients.some(i => i.name === log.itemName));
                      const isMI = Boolean(log.menuItemId) || menuItems.some(m => m.name === log.itemName);

                      return (
                        <tr key={log.id} className="hover:bg-[var(--bg-base)]/60 hover:bg-[var(--bg-base)] transition-colors">
                          <td className="p-2.5 font-extrabold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                            {log.itemName}
                          </td>
                          <td className="p-2.5 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-100 dark:bg-rose-900/60 text-[var(--status-error-text)] dark:text-rose-300">
                              {isMI ? 'آیتم منو' : 'ماده اولیه'}
                            </span>
                          </td>
                          <td className="p-2.5 whitespace-nowrap font-bold text-[var(--text-primary)] dark:text-[var(--text-secondary)]">
                            {formatNumber(log.quantity)} {log.unit}
                          </td>
                          <td className="p-2.5 whitespace-nowrap font-black text-[var(--status-error-text)] dark:text-[var(--status-error-text)]">
                            {formatToman(log.cost).text}
                          </td>
                          <td className="p-2.5 font-medium text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                            {log.reason}
                          </td>
                          <td className="p-2.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditWasteModal(log)}
                                className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--status-warning-text)] hover:bg-[var(--status-warning-bg)] transition-colors cursor-pointer"
                                title="ویرایش این ردیف"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteWasteLog(log)}
                                className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--status-error-text)] hover:bg-[var(--status-error-bg)] transition-colors cursor-pointer"
                                title="حذف این ردیف"
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
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-[var(--border-subtle)]">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setWasteDate(currentWasteDetailGroup.date);
                  openWasteModal();
                }}
                className="h-9 px-3.5 rounded-xl text-xs font-bold text-[var(--status-error-text)] border-[var(--status-error-text)]/20 hover:bg-[var(--status-error-bg)]"
              >
                <Plus className="h-3.5 w-3.5 ml-1" />
                ثبت ضایعات جدید در این تاریخ
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={() => setDetailWasteDate(null)}
                className="h-9 px-4 rounded-xl text-xs font-bold"
              >
                بستن
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
