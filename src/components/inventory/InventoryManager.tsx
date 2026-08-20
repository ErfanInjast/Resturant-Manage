import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  Boxes,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ShoppingBag,
  History,
} from 'lucide-react';
import { db, syncAndRecalculateAllData } from '../../db';
import type { Ingredient, UnitType } from '../../types';
import {
  getUnitLabel,
  roundCurrency,
  toPersianDigits,
  toEnglishDigits,
  parseFormattedNumber,
  formatCurrency,
} from '../../lib/utils';
import { getTodayJalaliIso } from '../../lib/jalali';
import { tablePageVariants, tableRowVariants } from '../../lib/motion';
import { recalculateIngredientCost } from '../../lib/inventoryCost';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { SmartMoneyInput } from '../ui/SmartMoneyInput';
import { EmptyState } from '../ui/EmptyState';
import { SearchableSelect } from '../ui/SearchableSelect';
import { Pagination } from '../ui/Pagination';
import { PageSkeleton } from '../ui/PageSkeleton';
import { JalaliDatePicker } from '../ui/JalaliDatePicker';
import { PurchaseHistoryDrawer } from './PurchaseHistoryDrawer';
import { useAppStore } from '../../store/useAppStore';

const CATEGORIES = [
  'همه',
  'پروتئین',
  'غلات',
  'لبنیات و روغن',
  'صیفی‌جات',
  'نوشیدنی و قهوه',
  'ادویه‌جات',
  'بسته‌بندی',
  'سایر',
];

const UNITS: { value: UnitType; label: string }[] = [
  { value: 'kg', label: 'کیلوگرم' },
  { value: 'g', label: 'گرم' },
  { value: 'liter', label: 'لیتر' },
  { value: 'ml', label: 'میلی‌لیتر' },
  { value: 'piece', label: 'عدد / دانه‌ای' },
  { value: 'pack', label: 'بسته' },
];

export const InventoryManager: React.FC = () => {
  const { notify, askConfirmation } = useAppStore();
  const ingredientsQuery = useLiveQuery(() => db.ingredients.toArray());

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('همه');
  const [currentPage, setCurrentPage] = useState(1);
  const [direction, setDirection] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);
  const [sortField, setSortField] = useState<keyof Ingredient>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [historyDrawerIngredient, setHistoryDrawerIngredient] = useState<Ingredient | null>(null);

  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [purchaseSelectedId, setPurchaseSelectedId] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State - Add New Ingredient
  const [addName, setAddName] = useState('');
  const [addCategory, setAddCategory] = useState('پروتئین');
  const [addUnit, setAddUnit] = useState<UnitType>('kg');
  const [addMinStock, setAddMinStock] = useState<number | string>('5');
  const [addInitialStock, setAddInitialStock] = useState<number | string>('10');
  const [addInitialPrice, setAddInitialPrice] = useState<number | ''>('');
  const [addInitialDate, setAddInitialDate] = useState<string>(getTodayJalaliIso());
  const [addNote, setAddNote] = useState('');

  // Form State - Edit Ingredient Specs & Stock Adjustment
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('پروتئین');
  const [editUnit, setEditUnit] = useState<UnitType>('kg');
  const [editMinStock, setEditMinStock] = useState<number | string>('');
  const [editCurrentStock, setEditCurrentStock] = useState<number | string>('');
  const [editAdjustmentNote, setEditAdjustmentNote] = useState('');

  // Form State - Purchase
  const [purchaseDate, setPurchaseDate] = useState<string>(getTodayJalaliIso());
  const [purchaseQty, setPurchaseQty] = useState<number | string>('');
  const [purchaseTotalPrice, setPurchaseTotalPrice] = useState<number | ''>('');
  const [purchaseNote, setPurchaseNote] = useState('');

  if (ingredientsQuery === undefined) {
    return <PageSkeleton type="table" />;
  }

  const ingredients = ingredientsQuery ?? [];

  const handlePageChange = (newPage: number, dir: number) => {
    setDirection(dir);
    setCurrentPage(newPage);
  };

  const handleSort = (field: keyof Ingredient) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const renderSortIcon = (field: keyof Ingredient) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 opacity-40 group-hover:opacity-100 transition-opacity" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-[var(--brand-primary)]" />
    ) : (
      <ArrowDown className="h-3 w-3 text-[var(--brand-primary)]" />
    );
  };

  // Open Add New Ingredient Modal
  const openAddModal = () => {
    setAddName('');
    setAddCategory('پروتئین');
    setAddUnit('kg');
    setAddMinStock('5');
    setAddInitialStock('10');
    setAddInitialPrice('');
    setAddInitialDate(getTodayJalaliIso());
    setAddNote('موجودی اولیه / خرید افتتاحیه');
    setIsAddModalOpen(true);
  };

  // Open Edit Specs & Stock Adjustment Modal
  const openEditModal = (item: Ingredient) => {
    setSelectedIngredient(item);
    setEditName(item.name);
    setEditCategory(item.category);
    setEditUnit(item.unit);
    setEditMinStock(item.minimumStock);
    setEditCurrentStock(item.currentStock);
    setEditAdjustmentNote('');
    setIsEditModalOpen(true);
  };

  // Open Record Purchase Modal (from top header or pre-selected)
  const openPurchaseModal = (item?: Ingredient) => {
    if (item && item.id) {
      setSelectedIngredient(item);
      setPurchaseSelectedId(item.id);
    } else if (ingredients.length > 0) {
      const first = ingredients[0];
      setSelectedIngredient(first);
      setPurchaseSelectedId(first.id || '');
    } else {
      notify.error('ماده اولیه‌ای وجود ندارد', 'لطفاً ابتدا یک ماده اولیه جدید تعریف کنید.');
      return;
    }
    setPurchaseDate(getTodayJalaliIso());
    setPurchaseQty('');
    setPurchaseTotalPrice('');
    setPurchaseNote('');
    setIsPurchaseModalOpen(true);
  };

  // 1. Submit Add New Ingredient
  const handleSaveNewIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      if (!addName.trim()) {
        notify.error('نام نامعتبر', 'لطفاً نام ماده اولیه را وارد کنید.');
        return;
      }

      const normalizedName = addName.trim().toLowerCase();
      const duplicate = ingredients.find((ing) => ing.name.trim().toLowerCase() === normalizedName);
      if (duplicate) {
        notify.error('نام تکراری', 'این ماده اولیه قبلاً تعریف شده است.');
        return;
      }

      const priceNum = parseFormattedNumber(addInitialPrice);
      const qtyNum = parseFormattedNumber(addInitialStock);
      const minStockNum = parseFormattedNumber(addMinStock);

      if (qtyNum <= 0) {
        notify.error('مقدار اولیه نامعتبر است', 'مقدار اولیه خرید باید بیشتر از صفر باشد.');
        return;
      }

      if (priceNum <= 0) {
        notify.error('مبلغ اولیه نامعتبر است', 'مبلغ خرید اولیه باید بیشتر از صفر باشد.');
        return;
      }

      const unitCost = roundCurrency(priceNum / qtyNum);

      const newId = await db.ingredients.add({
        name: addName.trim(),
        category: addCategory,
        unit: addUnit,
        totalPrice: priceNum,
        totalQuantity: qtyNum,
        unitCost,
        minimumStock: minStockNum,
        currentStock: qtyNum,
        updatedAt: new Date().toISOString(),
      });

      // Register initial purchase log
      await db.purchaseLogs.add({
        ingredientId: Number(newId),
        date: addInitialDate || getTodayJalaliIso(),
        quantity: qtyNum,
        totalPrice: priceNum,
        unitCost,
        reason: 'purchase',
        note: addNote.trim() || 'موجودی اولیه',
        createdAt: new Date().toISOString(),
      });

      await recalculateIngredientCost(Number(newId));
      notify.success('ثبت شد', `ماده اولیه "${addName}" با موفقیت اضافه شد.`);
      setIsAddModalOpen(false);
    } catch (err) {
      console.error(err);
      notify.error('خطا در ثبت ماده اولیه');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Submit Edit Specs & Optional Stock Adjustment
  const handleSaveEditSpecs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIngredient?.id) return;

    try {
      setIsSubmitting(true);
      if (!editName.trim()) {
        notify.error('اطلاعات ناقص است', 'لطفاً نام ماده اولیه را وارد کنید.');
        return;
      }

      const normalizedName = editName.trim().toLowerCase();
      const duplicate = ingredients.find(
        (ing) => ing.name.trim().toLowerCase() === normalizedName && ing.id !== selectedIngredient.id
      );
      if (duplicate) {
        notify.error('نام تکراری', 'این نام قبلاً برای ماده اولیه دیگری استفاده شده است.');
        return;
      }

      const minStockNum = parseFormattedNumber(editMinStock);
      const newStockNum = parseFormattedNumber(editCurrentStock);

      if (newStockNum < 0) {
        notify.error('موجودی نامعتبر', 'موجودی انبار نمی‌تواند عدد منفی باشد.');
        return;
      }

      const stockDiff = newStockNum - selectedIngredient.currentStock;

      // If stock level was changed manually, log adjustment
      if (stockDiff !== 0) {
        await db.purchaseLogs.add({
          ingredientId: selectedIngredient.id,
          date: getTodayJalaliIso(),
          quantity: stockDiff,
          totalPrice: 0,
          unitCost: 0,
          reason: 'adjustment',
          note: editAdjustmentNote.trim() || 'اصلاح دستی موجودی در ویرایش مشخصات',
          createdAt: new Date().toISOString(),
        });
      }

      await db.ingredients.update(selectedIngredient.id, {
        name: editName.trim(),
        category: editCategory,
        unit: editUnit,
        minimumStock: minStockNum,
        currentStock: newStockNum,
        updatedAt: new Date().toISOString(),
      });

      await syncAndRecalculateAllData();
      notify.success('ویرایش شد', `اطلاعات "${editName}" با موفقیت به‌روزرسانی گردید.`);
      setIsEditModalOpen(false);
    } catch (err) {
      console.error(err);
      notify.error('خطا در ویرایش مشخصات');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Submit Record Purchase
  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetIngredient = ingredients.find((i) => i.id === Number(purchaseSelectedId));
    if (!targetIngredient?.id) {
      notify.error('ماده اولیه انتخاب نشده است', 'لطفاً ماده اولیه مورد نظر را انتخاب کنید.');
      return;
    }

    try {
      setIsSubmitting(true);
      const qtyNum = parseFormattedNumber(purchaseQty);
      const priceNum = parseFormattedNumber(purchaseTotalPrice);

      if (qtyNum <= 0) {
        notify.error('مقدار نامعتبر', 'مقدار فاکتور خرید باید بیشتر از صفر باشد.');
        return;
      }

      if (priceNum <= 0) {
        notify.error('مبلغ نامعتبر', 'مبلغ کل فاکتور خرید باید بیشتر از صفر باشد.');
        return;
      }

      const unitCost = Math.round(priceNum / qtyNum);

      // Add purchase log
      await db.purchaseLogs.add({
        ingredientId: targetIngredient.id,
        date: purchaseDate || getTodayJalaliIso(),
        quantity: qtyNum,
        totalPrice: priceNum,
        unitCost,
        reason: 'purchase',
        note: purchaseNote.trim() || undefined,
        createdAt: new Date().toISOString(),
      });

      // Increase current stock
      await db.ingredients.update(targetIngredient.id, {
        currentStock: targetIngredient.currentStock + qtyNum,
      });

      // Trigger WAC recalculation
      await recalculateIngredientCost(targetIngredient.id);

      notify.success(
        'خرید ثبت شد',
        `مقدار ${toPersianDigits(qtyNum)} ${getUnitLabel(targetIngredient.unit)} به انبار "${targetIngredient.name}" اضافه شد.`
      );
      setIsPurchaseModalOpen(false);
    } catch (err) {
      console.error(err);
      notify.error('خطا در ثبت خرید');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    const menuItems = await db.menuItems.toArray();
    const usedInItems = menuItems.filter((mi) => (mi.ingredients || []).some((ri) => ri.ingredientId === id));

    if (usedInItems.length > 0) {
      const itemNames = usedInItems.map((i) => i.name).slice(0, 3).join('، ');
      const extraCount = usedInItems.length > 3 ? ` و ${usedInItems.length - 3} آیتم دیگر` : '';
      return notify.error(
        'امکان حذف وجود ندارد',
        `این ماده در رسپی (${itemNames}${extraCount}) استفاده شده است. ابتدا آن را از رسپی‌ها پاک کنید.`
      );
    }

    askConfirmation({
      title: 'حذف ماده اولیه',
      message: `آیا از حذف ماده اولیه "${name}" و تمامی سوابق خرید آن اطمینان دارید؟`,
      confirmText: 'حذف کامل',
      cancelText: 'انصراف',
      variant: 'danger',
      onConfirm: async () => {
        await db.transaction('rw', [db.ingredients, db.purchaseLogs, db.menuItems, db.dailySales, db.settings, db.wasteLogs], async () => {
          await db.purchaseLogs.where('ingredientId').equals(id).delete();
          await db.ingredients.delete(id);
        });
        await syncAndRecalculateAllData();
        notify.success('حذف شد', `ماده اولیه "${name}" پاک شد.`);
      },
    });
  };

  // Filtered ingredients
  const filteredIngredients = ingredients.filter((item) => {
    const matchesCategory = selectedCategory === 'همه' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const sortedIngredients = [...filteredIngredients].sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];

    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortDirection === 'asc'
        ? valA.localeCompare(valB, 'fa')
        : valB.localeCompare(valA, 'fa');
    }

    const numA = Number(valA ?? 0);
    const numB = Number(valB ?? 0);
    return sortDirection === 'asc' ? numA - numB : numB - numA;
  });

  const totalPages = Math.ceil(sortedIngredients.length / itemsPerPage) || 1;
  const validPage = Math.min(currentPage, totalPages);
  const paginatedIngredients = sortedIngredients.slice(
    (validPage - 1) * itemsPerPage,
    validPage * itemsPerPage
  );

  const lowStockItems = ingredients.filter((i) => i.currentStock <= i.minimumStock);

  const targetPurchaseIngredient = ingredients.find((i) => i.id === Number(purchaseSelectedId));

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[var(--text-primary)]">انبار و مواد اولیه</h2>
          <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">
            مدیریت موجودی انبار، ثبت فاکتورهای خرید و حداقل نقطه سفارش
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => openPurchaseModal()}
            className="flex-1 sm:flex-none bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] font-black text-xs h-10 px-4 rounded-xl gap-1.5"
          >
            <ShoppingBag className="h-4 w-4" />
            ثبت خرید جدید
          </Button>

          <Button
            onClick={openAddModal}
            variant="outline"
            className="flex-1 sm:flex-none border-[var(--border-subtle)] font-bold text-xs h-10 px-4 rounded-xl gap-1.5"
          >
            <Plus className="h-4 w-4" />
            تعریف ماده اولیه جدید
          </Button>
        </div>
      </div>

      {/* Low stock alert banner */}
      {lowStockItems.length > 0 && (
        <div className="rounded-2xl bg-[var(--status-error-bg)] border border-[var(--status-error-text)]/30 p-4 flex items-center justify-between text-[var(--status-error-text)]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span className="text-xs font-bold">
              هشدار کمبود موجودی: {toPersianDigits(lowStockItems.length)} ماده اولیه به نقطه سفارش رسیده‌اند.
            </span>
          </div>
          <Badge variant="danger">{lowStockItems.map((i) => i.name).join('، ')}</Badge>
        </div>
      )}

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3.5 top-2.5 h-4 w-4 text-[var(--text-secondary)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="جستجوی نام ماده اولیه..."
            className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] pr-10 pl-4 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-all"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setCurrentPage(1);
              }}
              className={`px-3.5 py-2 text-xs font-bold rounded-full whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[var(--brand-primary)] text-white shadow-2xs font-black'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-base)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Ingredients Streamlined List */}
      {filteredIngredients.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="ماده اولیه‌ای یافت نشد"
          description="هنوز ماده اولیه‌ای ثبت نشده است یا عبارت جستجو نتیجه‌ای ندارد."
          actionLabel="افزودن اولین ماده اولیه"
          onAction={openAddModal}
        />
      ) : (
        <Card className="overflow-hidden border border-[var(--border-subtle)]">
          {/* Desktop & Tablet Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-[var(--bg-base)] border-b border-[var(--border-subtle)] text-[11px] font-black text-[var(--text-secondary)] select-none">
                  <th
                    onClick={() => handleSort('name')}
                    className="p-3.5 cursor-pointer hover:text-[var(--text-primary)] group transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>نام ماده اولیه</span>
                      {renderSortIcon('name')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('category')}
                    className="p-3.5 cursor-pointer hover:text-[var(--text-primary)] group transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>دسته‌بندی</span>
                      {renderSortIcon('category')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('currentStock')}
                    className="p-3.5 cursor-pointer hover:text-[var(--text-primary)] group transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>موجودی فعلی</span>
                      {renderSortIcon('currentStock')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('minimumStock')}
                    className="p-3.5 cursor-pointer hover:text-[var(--text-primary)] group transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>نقطه سفارش</span>
                      {renderSortIcon('minimumStock')}
                    </div>
                  </th>
                  <th className="p-3.5 text-center">وضعیت</th>
                  <th className="p-3.5 text-center w-28">عملیات</th>
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
                  className="divide-y divide-[var(--border-subtle)] text-xs"
                >
                  {paginatedIngredients.map((item) => {
                    const isLow = item.currentStock <= item.minimumStock;
                    return (
                      <motion.tr
                        key={item.id}
                        variants={tableRowVariants}
                        className={`hover:bg-[var(--bg-base)] transition-colors ${
                          isLow ? 'bg-[var(--status-error-bg)]/20' : ''
                        }`}
                      >
                        {/* Name (Clean plain text) */}
                        <td className="p-3.5 font-black text-[var(--text-primary)]">
                          {item.name}
                        </td>

                        {/* Category */}
                        <td className="p-3.5">
                          <Badge variant="default" className="text-[10px]">
                            {item.category}
                          </Badge>
                        </td>

                        {/* Current Stock */}
                        <td className={`p-3.5 font-black ${isLow ? 'text-[var(--status-error-text)]' : 'text-[var(--text-primary)]'}`}>
                          {toPersianDigits(item.currentStock)} {getUnitLabel(item.unit)}
                        </td>

                        {/* Minimum Stock */}
                        <td className="p-3.5 text-[var(--text-secondary)]">
                          {toPersianDigits(item.minimumStock)} {getUnitLabel(item.unit)}
                        </td>

                        {/* Status */}
                        <td className="p-3.5 text-center">
                          {isLow ? (
                            <Badge variant="danger" className="text-[10px]">کمبود موجودی</Badge>
                          ) : (
                            <Badge variant="success" className="text-[10px]">عادی</Badge>
                          )}
                        </td>

                        {/* Minimal Icon Action Buttons */}
                        <td className="p-3.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setHistoryDrawerIngredient(item)}
                              className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary-subtle)] rounded-lg transition-colors cursor-pointer"
                              title="سوابق خرید و نمودار قیمت"
                            >
                              <History className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-base)] rounded-lg transition-colors cursor-pointer"
                              title="ویرایش مشخصات و اصلاح موجودی"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => item.id && handleDelete(item.id, item.name)}
                              className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--status-error-text)] hover:bg-[var(--status-error-bg)] rounded-lg transition-colors cursor-pointer"
                              title="حذف ماده اولیه"
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

          {/* Mobile-optimized Card List View */}
          <div className="block md:hidden">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={validPage}
                custom={direction}
                variants={tablePageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="divide-y divide-[var(--border-subtle)] text-xs"
              >
                {paginatedIngredients.map((item) => {
                  const isLow = item.currentStock <= item.minimumStock;
                  return (
                    <motion.div
                      key={item.id}
                      variants={tableRowVariants}
                      className={`p-4 space-y-3.5 transition-colors ${
                        isLow ? 'bg-[var(--status-error-bg)]/10 dark:bg-[var(--status-error-bg)]/5' : 'bg-white dark:bg-[var(--bg-card)]'
                      }`}
                    >
                      {/* Ingredient Header Info */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-black text-[var(--text-primary)] dark:text-white">
                            {item.name}
                          </h4>
                          <span className="text-[10px] text-[var(--text-secondary)] mt-0.5 inline-block">
                            شناسه: {toPersianDigits(item.id || 0)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="default" className="text-[9px] px-2 py-0.5">
                            {item.category}
                          </Badge>
                          {isLow ? (
                            <Badge variant="danger" className="text-[9px] px-2 py-0.5">کمبود موجودی</Badge>
                          ) : (
                            <Badge variant="success" className="text-[9px] px-2 py-0.5">عادی</Badge>
                          )}
                        </div>
                      </div>

                      {/* Stock Info Details */}
                      <div className="grid grid-cols-2 gap-3 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] p-2.5 rounded-xl border border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-[var(--text-secondary)]">موجودی فعلی:</span>
                          <div className={`text-xs font-black ${isLow ? 'text-[var(--status-error-text)]' : 'text-[var(--text-primary)] dark:text-stone-200'}`}>
                            {toPersianDigits(item.currentStock)} {getUnitLabel(item.unit)}
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-[var(--text-secondary)]">نقطه سفارش (حداقل):</span>
                          <div className="text-xs font-bold text-[var(--text-primary)] dark:text-stone-300">
                            {toPersianDigits(item.minimumStock)} {getUnitLabel(item.unit)}
                          </div>
                        </div>
                      </div>

                      {/* Tactile Touch Actions (at least 44px touch-friendly) */}
                      <div className="flex items-center justify-end gap-1 pt-1">
                        <button
                          type="button"
                          onClick={() => setHistoryDrawerIngredient(item)}
                          className="flex items-center gap-1 px-3 py-2 text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary-subtle)] rounded-xl border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] transition-colors cursor-pointer min-h-[38px]"
                          title="سوابق خرید و نمودار قیمت"
                        >
                          <History className="h-3.5 w-3.5" />
                          <span>تاریخچه خرید</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="flex items-center gap-1 px-3 py-2 text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-base)] rounded-xl border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] transition-colors cursor-pointer min-h-[38px]"
                          title="ویرایش مشخصات"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          <span>اصلاح و ویرایش</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => item.id && handleDelete(item.id, item.name)}
                          className="flex items-center gap-1 px-2.5 py-2 text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--status-error-text)] hover:bg-[var(--status-error-bg)] rounded-xl border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] transition-colors cursor-pointer min-h-[38px]"
                          title="حذف ماده اولیه"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-[var(--status-error-text)]" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>

          <Pagination
            currentPage={validPage}
            totalPages={totalPages}
            totalItems={filteredIngredients.length}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={(newSize) => {
              setItemsPerPage(newSize);
              setCurrentPage(1);
            }}
            itemsPerPageOptions={[5, 8, 10, 12, 15]}
            itemLabel="ماده اولیه"
          />
        </Card>
      )}

      {/* 1. Modal: Record New Purchase */}
      <Modal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        title="ثبت خرید جدید"
        description="ثبت فاکتور خرید مواد اولیه جهت افزایش موجودی انبار و به‌روزرسانی قیمت فی"
        maxWidth="2xl"
      >
        <form onSubmit={handleSavePurchase} noValidate className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
            <SearchableSelect
              label="انتخاب ماده اولیه"
              value={purchaseSelectedId}
              onChange={(val) => {
                setPurchaseSelectedId(val as number);
                const found = ingredients.find((i) => i.id === Number(val));
                if (found) setSelectedIngredient(found);
              }}
              options={ingredients.map((ing) => ({
                value: ing.id!,
                label: `${ing.name} (موجودی: ${toPersianDigits(ing.currentStock)} ${getUnitLabel(ing.unit)})`,
              }))}
            />

            <JalaliDatePicker
              label="تاریخ فاکتور خرید"
              value={purchaseDate}
              onChange={setPurchaseDate}
              showSteppers={true}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
            <div>
              <label className="block text-xs font-extrabold text-[var(--text-primary)] mb-1.5">
                مقدار خرید {targetPurchaseIngredient ? `(${getUnitLabel(targetPurchaseIngredient.unit)})` : ''} <span className="text-[var(--status-error-text)]">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={purchaseQty === '' ? '' : toPersianDigits(purchaseQty)}
                onChange={(e) => {
                  const val = e.target.value;
                  const eng = toEnglishDigits(val).replace(',', '.').replace('/', '.');
                  if (eng === '') setPurchaseQty('');
                  else if (/^\d*\.?\d*$/.test(eng)) setPurchaseQty(val);
                }}
                placeholder="مثلاً: ۱۰"
                className="w-full h-10 rounded-xl border border-[var(--border-functional)] bg-[var(--bg-card)] px-3 py-2 text-xs font-bold text-[var(--text-primary)] text-right dir-rtl focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-all shadow-2xs"
              />
            </div>

            <SmartMoneyInput
              label="مبلغ کل فاکتور خرید (تومان)"
              value={purchaseTotalPrice}
              onChange={(val) => setPurchaseTotalPrice(val)}
              placeholder="مثلاً: ۶,۵۰۰,۰۰۰"
              suffix="تومان"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-[var(--text-secondary)] mb-1.5">
              توضیحات یا شماره فاکتور (اختیاری)
            </label>
            <input
              type="text"
              value={purchaseNote}
              onChange={(e) => setPurchaseNote(e.target.value)}
              placeholder="مثلاً: فاکتور شماره ۱۲۴"
              className="w-full h-10 rounded-xl border border-[var(--border-functional)] bg-[var(--bg-card)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-all shadow-2xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsPurchaseModalOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting} className="font-black">
              {isSubmitting ? 'در حال ثبت...' : 'تأیید و ثبت خرید'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Modal: Add Brand New Ingredient */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="تعریف ماده اولیه جدید"
        description="تعریف مشخصات ماده اولیه همراه با فاکتور خرید اولیه"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveNewIngredient} noValidate className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
            <div>
              <label className="block text-xs font-extrabold text-[var(--text-primary)] mb-1.5">
                نام ماده اولیه <span className="text-[var(--status-error-text)]">*</span>
              </label>
              <input
                type="text"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="مثلاً: فیله مرغ سینه، شیر پرچرب"
                className="w-full h-10 rounded-xl border border-[var(--border-functional)] bg-[var(--bg-card)] px-3 py-2 text-xs font-bold text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-all shadow-2xs"
              />
            </div>

            <SearchableSelect
              label="دسته‌بندی انبار"
              value={addCategory}
              onChange={(val) => setAddCategory(val as string)}
              options={CATEGORIES.filter((c) => c !== 'همه').map((cat) => ({
                value: cat,
                label: cat,
              }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
            <SearchableSelect
              label="واحد سنجش"
              value={addUnit}
              onChange={(val) => setAddUnit(val as UnitType)}
              options={UNITS.map((u) => ({
                value: u.value,
                label: u.label,
              }))}
            />

            <div>
              <label className="block text-xs font-extrabold text-[var(--text-primary)] mb-1.5">
                نقطه سفارش (حداقل موجودی)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={addMinStock === '' ? '' : toPersianDigits(addMinStock)}
                onChange={(e) => {
                  const val = e.target.value;
                  const eng = toEnglishDigits(val).replace(',', '.').replace('/', '.');
                  if (eng === '') setAddMinStock('');
                  else if (/^\d*\.?\d*$/.test(eng)) setAddMinStock(val);
                }}
                placeholder="مثلاً: ۵"
                className="w-full h-10 rounded-xl border border-[var(--border-functional)] bg-[var(--bg-card)] px-3 py-2 text-xs font-bold text-[var(--text-primary)] text-right dir-rtl focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-all shadow-2xs"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)] space-y-2.5">
            <h4 className="text-xs font-black text-[var(--text-primary)] flex items-center gap-1.5">
              <ShoppingBag className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
              <span>مشخصات خرید اولیه</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
              <JalaliDatePicker
                label="تاریخ خرید"
                value={addInitialDate}
                onChange={setAddInitialDate}
                showSteppers={true}
              />

              <div>
                <label className="block text-xs font-extrabold text-[var(--text-primary)] mb-1.5">
                  مقدار ({getUnitLabel(addUnit)}) <span className="text-[var(--status-error-text)]">*</span>
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={addInitialStock === '' ? '' : toPersianDigits(addInitialStock)}
                  onChange={(e) => {
                    const val = e.target.value;
                    const eng = toEnglishDigits(val).replace(',', '.').replace('/', '.');
                    if (eng === '') setAddInitialStock('');
                    else if (/^\d*\.?\d*$/.test(eng)) setAddInitialStock(val);
                  }}
                  placeholder="مثلاً: ۱۰"
                  className="w-full h-10 rounded-xl border border-[var(--border-functional)] bg-[var(--bg-card)] px-3 py-2 text-xs font-bold text-[var(--text-primary)] text-right dir-rtl focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-all shadow-2xs"
                />
              </div>

              <SmartMoneyInput
                label="مبلغ کل (تومان)"
                value={addInitialPrice}
                onChange={(val) => setAddInitialPrice(val)}
                placeholder="مثلاً: ۲,۵۰۰,۰۰۰"
                suffix="تومان"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting} className="font-black">
              {isSubmitting ? 'در حال ثبت...' : 'ذخیره ماده اولیه'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3. Modal: Edit Ingredient Specs AND Stock Adjustment */}
      {selectedIngredient && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`ویرایش و اصلاح موجودی: ${selectedIngredient.name}`}
          description="ویرایش نام، دسته‌بندی، نقطه سفارش و اصلاح موجودی واقعی انبار"
          maxWidth="xl"
        >
          <form onSubmit={handleSaveEditSpecs} noValidate className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
              <div>
                <label className="block text-xs font-extrabold text-[var(--text-primary)] mb-1.5">
                  نام ماده اولیه <span className="text-[var(--status-error-text)]">*</span>
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="نام ماده اولیه"
                  className="w-full h-10 rounded-xl border border-[var(--border-functional)] bg-[var(--bg-card)] px-3 py-2 text-xs font-bold text-[var(--text-primary)] focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-all shadow-2xs"
                />
              </div>

              <SearchableSelect
                label="دسته‌بندی انبار"
                value={editCategory}
                onChange={(val) => setEditCategory(val as string)}
                options={CATEGORIES.filter((c) => c !== 'همه').map((cat) => ({
                  value: cat,
                  label: cat,
                }))}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
              <SearchableSelect
                label="واحد سنجش"
                value={editUnit}
                onChange={(val) => setEditUnit(val as UnitType)}
                options={UNITS.map((u) => ({
                  value: u.value,
                  label: u.label,
                }))}
              />

              <div>
                <label className="block text-xs font-extrabold text-[var(--text-primary)] mb-1.5">
                  موجودی فعلی ({getUnitLabel(editUnit)})
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={editCurrentStock === '' ? '' : toPersianDigits(editCurrentStock)}
                  onChange={(e) => {
                    const val = e.target.value;
                    const eng = toEnglishDigits(val).replace(',', '.').replace('/', '.');
                    if (eng === '') setEditCurrentStock('');
                    else if (/^\d*\.?\d*$/.test(eng)) setEditCurrentStock(val);
                  }}
                  placeholder="مثلاً: ۱۲.۵"
                  className="w-full h-10 rounded-xl border border-[var(--border-functional)] bg-[var(--bg-card)] px-3 py-2 text-xs font-bold text-[var(--text-primary)] text-right dir-rtl focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-all shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[var(--text-primary)] mb-1.5">
                  نقطه سفارش (حداقل)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={editMinStock === '' ? '' : toPersianDigits(editMinStock)}
                  onChange={(e) => {
                    const val = e.target.value;
                    const eng = toEnglishDigits(val).replace(',', '.').replace('/', '.');
                    if (eng === '') setEditMinStock('');
                    else if (/^\d*\.?\d*$/.test(eng)) setEditMinStock(val);
                  }}
                  placeholder="مثلاً: ۵"
                  className="w-full h-10 rounded-xl border border-[var(--border-functional)] bg-[var(--bg-card)] px-3 py-2 text-xs font-bold text-[var(--text-primary)] text-right dir-rtl focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Note if stock was changed */}
            {parseFormattedNumber(editCurrentStock) !== selectedIngredient.currentStock && (
              <div>
                <label className="block text-xs font-extrabold text-[var(--text-secondary)] mb-1.5">
                  علت اصلاح موجودی
                </label>
                <input
                  type="text"
                  value={editAdjustmentNote}
                  onChange={(e) => setEditAdjustmentNote(e.target.value)}
                  placeholder="مثلاً: انبارگردانی / کسر ضایعات"
                  className="w-full h-10 rounded-xl border border-[var(--border-functional)] bg-[var(--bg-card)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-all shadow-2xs"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEditModalOpen(false)}>
                انصراف
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isSubmitting} className="font-black">
                {isSubmitting ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 4. Purchase History & Price Trend Drawer */}
      <PurchaseHistoryDrawer
        ingredient={historyDrawerIngredient}
        isOpen={!!historyDrawerIngredient}
        onClose={() => setHistoryDrawerIngredient(null)}
      />
    </div>
  );
};
