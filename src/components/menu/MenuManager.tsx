import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, Edit2, Trash2, UtensilsCrossed, Calculator, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { db, DEFAULT_SETTINGS, syncAndRecalculateAllData } from '../../db';
import type { MenuItem, MenuCategory, RecipeIngredient } from '../../types';
import { formatToman, formatNumber, getUnitLabel, roundCurrency, toPersianDigits, toEnglishDigits, parseFormattedNumber } from '../../lib/utils';
import { tablePageVariants, tableRowVariants } from '../../lib/motion';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { SmartMoneyInput } from '../ui/SmartMoneyInput';
import { EmptyState } from '../ui/EmptyState';
import { SearchableSelect } from '../ui/SearchableSelect';
import { Pagination } from '../ui/Pagination';
import { PageSkeleton } from '../ui/PageSkeleton';
import { useAppStore } from '../../store/useAppStore';

const MENU_CATEGORIES: MenuCategory[] = [
  'غذای اصلی',
  'پیش غذا',
  'نوشیدنی',
  'دسر و شیرینی',
  'کافه و گرم',
  'مخلفات',
  'سایر',
];

const ITEMS_PER_PAGE = 6;

export const MenuManager: React.FC = () => {
  const { notify, askConfirmation } = useAppStore();
  const menuItemsQuery = useLiveQuery(() => db.menuItems.toArray());
  const ingredientsQuery = useLiveQuery(() => db.ingredients.toArray());
  const settingsQuery = useLiveQuery(() => db.settings.get('config'));

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('همه');
  const [currentPage, setCurrentPage] = useState(1);
  const [direction, setDirection] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [sortField, setSortField] = useState<keyof MenuItem | 'grossProfit'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Recipe Builder Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState<MenuCategory>('غذای اصلی');
  const [sellingPrice, setSellingPrice] = useState<number | ''>('');
  const [wastePercent, setWastePercent] = useState<number | string>('');
  const [laborCost, setLaborCost] = useState<number | ''>('');
  const [packagingCost, setPackagingCost] = useState<number | ''>('');
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);

  // Ingredient Combobox selection inside Modal
  const [selectedIngredientId, setSelectedIngredientId] = useState<number | ''>('');
  const [selectedQty, setSelectedQty] = useState<number | string>('');

  const isLoading = menuItemsQuery === undefined || ingredientsQuery === undefined || settingsQuery === undefined;

  if (isLoading) {
    return <PageSkeleton type="table" />;
  }

  const menuItems = menuItemsQuery ?? [];
  const ingredients = ingredientsQuery ?? [];
  const settings = settingsQuery ?? DEFAULT_SETTINGS;

  const handlePageChange = (newPage: number, dir: number) => {
    setDirection(dir);
    setCurrentPage(newPage);
  };

  const handleSort = (field: keyof MenuItem | 'grossProfit') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const renderSortIcon = (field: keyof MenuItem | 'grossProfit') => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 opacity-40 group-hover:opacity-100 transition-opacity" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-[var(--brand-primary)]" />
    ) : (
      <ArrowDown className="h-3 w-3 text-[var(--brand-primary)]" />
    );
  };

  const openAddModal = () => {
    setEditingItem(null);
    setName('');
    setCategory('غذای اصلی');
    setSellingPrice('');
    setWastePercent('');
    setLaborCost('');
    setPackagingCost('');
    setRecipeIngredients([]);
    setSelectedIngredientId('');
    setSelectedQty('');
    setIsModalOpen(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setName(item.name);
    setCategory(item.category);
    setSellingPrice(item.sellingPrice);
    setWastePercent(item.wastePercent ?? 0);
    setLaborCost(item.laborCost ?? 0);
    setPackagingCost(item.packagingCost ?? 0);
    setRecipeIngredients(item.ingredients || []);
    setSelectedIngredientId('');
    setSelectedQty('');
    setIsModalOpen(true);
  };

  const addIngredientToRecipe = () => {
    if (!selectedIngredientId) return notify.warning('انتخاب ماده اولیه', 'لطفاً یک ماده اولیه انتخاب کنید.');
    const qtyNum = parseFormattedNumber(selectedQty);
    if (qtyNum <= 0) return notify.warning('مقدار نامعتبر', 'مقدار باید بیشتر از صفر باشد.');

    const ing = ingredients.find((i) => i.id === Number(selectedIngredientId));
    if (!ing) return;

    // Check if already in recipe
    const existingIndex = recipeIngredients.findIndex((ri) => ri.ingredientId === ing.id);
    const itemCost = roundCurrency(qtyNum * ing.unitCost);

    if (existingIndex >= 0) {
      const updated = [...recipeIngredients];
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: qtyNum,
        cost: itemCost,
      };
      setRecipeIngredients(updated);
    } else {
      setRecipeIngredients([
        ...recipeIngredients,
        {
          ingredientId: ing.id!,
          ingredientName: ing.name,
          unit: ing.unit,
          unitCost: ing.unitCost,
          quantity: qtyNum,
          cost: itemCost,
        },
      ]);
    }

    setSelectedIngredientId('');
    setSelectedQty('');
  };

  const removeRecipeIngredient = (index: number) => {
    setRecipeIngredients(recipeIngredients.filter((_, i) => i !== index));
  };

  // Recipe Cost Calculations
  const numSellingPrice = parseFormattedNumber(sellingPrice);
  const numWastePercent = parseFormattedNumber(wastePercent);
  const numLaborCost = parseFormattedNumber(laborCost);
  const numPackagingCost = parseFormattedNumber(packagingCost);

  const totalMaterialCost = recipeIngredients.reduce((acc, curr) => acc + (curr.cost || 0), 0);
  const wasteCost = roundCurrency(totalMaterialCost * (numWastePercent / 100));
  const primeCost = roundCurrency(totalMaterialCost + wasteCost + numLaborCost + numPackagingCost);
  
  // Target Price = Prime Cost / (Target Food Cost % / 100)
  const targetFoodCostRatio = (settings.targetFoodCostPercent || 35) / 100;
  const targetPrice = targetFoodCostRatio > 0 ? roundCurrency(primeCost / targetFoodCostRatio) : 0;
  
  const grossProfit = roundCurrency(numSellingPrice - primeCost);
  const marginPercent = numSellingPrice > 0 ? roundCurrency((grossProfit / numSellingPrice) * 100) : 0;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      if (!name.trim()) {
        notify.error('اطلاعات نامشخص است', 'لطفاً نام محصول در منو را وارد کنید.');
        return;
      }

      const normalizedName = name.trim().toLowerCase();
      const allMenuItems = await db.menuItems.toArray();
      const duplicate = allMenuItems.find(
        (item) => item.name.trim().toLowerCase() === normalizedName && item.id !== editingItem?.id
      );

      if (duplicate) {
        notify.error('نام تکراری', 'این نام قبلاً ثبت شده است.');
        return;
      }

      if (recipeIngredients.length === 0) {
        notify.error('فرمول ساخت خالی است', 'لطفاً حداقل یک ماده اولیه به فرمول اضافه کنید.');
        return;
      }
      if (numSellingPrice <= 0) {
        notify.error('قیمت فروش نامعتبر است', 'لطفاً قیمت فروش نهایی محصول در منو را وارد کنید.');
        return;
      }

      const menuItemData: Omit<MenuItem, 'id'> = {
        name: name.trim(),
        category,
        sellingPrice: numSellingPrice,
        wastePercent: numWastePercent,
        ingredients: recipeIngredients,
        laborCost: numLaborCost,
        packagingCost: numPackagingCost,
        totalMaterialCost,
        primeCost,
        targetPrice,
        grossProfit,
        marginPercent,
        popularityScore: editingItem?.popularityScore || 50,
        salesVolume30Days: editingItem?.salesVolume30Days || 0,
        matrixCategory: editingItem?.matrixCategory || 'star',
        updatedAt: new Date().toISOString(),
      };

      if (editingItem?.id) {
        await db.menuItems.update(editingItem.id, menuItemData);
        notify.success('ویرایش آیتم منو', `آیتم "${name}" با موفقیت به‌روزرسانی شد.`);
      } else {
        await db.menuItems.add(menuItemData);
        notify.success('آیتم جدید اضافه شد', `"${name}" به منو اضافه شد.`);
      }

      // Trigger central recalculation engine across daily sales and P&L
      await syncAndRecalculateAllData();

      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, itemName: string) => {
    // Check if menuItem is used in any dailySales records
    const salesRecords = await db.dailySales.toArray();
    const isUsedInSales = salesRecords.some((record) =>
      record.items?.some((item) => Number(item.menuItemId) === Number(id))
    );

    if (isUsedInSales) {
      return askConfirmation({
        title: 'هشدار: وجود سابقه فروش برای این آیتم',
        message: `آیتم "${itemName}" در یک یا چند گزارش فروش روزانه ثبت شده است. حذف این آیتم ممکن است گزارش‌های مالی قبلی را تحت تاثیر قرار دهد. آیا همچنان از حذف آن اطمینان دارید؟`,
        confirmText: 'حذف نهایی آیتم',
        cancelText: 'انصراف',
        variant: 'danger',
        onConfirm: async () => {
          await db.menuItems.delete(id);
          await syncAndRecalculateAllData();
          notify.success('حذف آیتم', `آیتم "${itemName}" از منو حذف شد.`);
        },
      });
    }

    askConfirmation({
      title: 'حذف آیتم منو',
      message: `آیا از حذف آیتم منو "${itemName}" اطمینان دارید؟`,
      confirmText: 'حذف آیتم',
      cancelText: 'انصراف',
      variant: 'danger',
      onConfirm: async () => {
        await db.menuItems.delete(id);
        await syncAndRecalculateAllData();
        notify.success('حذف آیتم', `آیتم "${itemName}" از منو حذف شد.`);
      },
    });
  };

  const filteredMenuItems = menuItems.filter((item) => {
    const matchesCategory = categoryFilter === 'همه' || item.category === categoryFilter;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const sortedMenuItems = [...filteredMenuItems].sort((a, b) => {
    let valA = a[sortField as keyof MenuItem];
    let valB = b[sortField as keyof MenuItem];

    if (sortField === 'grossProfit') {
      valA = a.sellingPrice - a.primeCost;
      valB = b.sellingPrice - b.primeCost;
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

  const totalPages = Math.ceil(sortedMenuItems.length / itemsPerPage) || 1;
  const validPage = Math.min(currentPage, totalPages);
  const paginatedMenuItems = sortedMenuItems.slice(
    (validPage - 1) * itemsPerPage,
    validPage * itemsPerPage
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[var(--text-primary)] dark:text-[var(--text-primary)]">آنالیز و قیمت‌گذاری منو</h2>
          <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-medium mt-0.5">
            محاسبه بهای تمام شده، فرمول ساخت و قیمت پیشنهادی بر اساس {formatNumber(settings.targetFoodCostPercent)}٪ فود کاست هدف (نمایش لیست صفحه‌ای)
          </p>
        </div>

        <Button onClick={openAddModal} className="w-full sm:w-auto bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]">
          <Plus className="h-4 w-4" />
          افزودن آیتم جدید
        </Button>
      </div>

      {/* Filter & Search */}
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
            placeholder="جستجوی غذا یا نوشیدنی منو..."
            className="w-full rounded-xl border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] bg-white dark:bg-[var(--bg-card)] pr-10 pl-4 py-2 text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-all"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {['همه', ...MENU_CATEGORIES].map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setCategoryFilter(cat);
                setCurrentPage(1);
              }}
              className={`px-3.5 py-2 text-xs font-bold rounded-full whitespace-nowrap transition-all cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-[var(--brand-primary)] text-white shadow-2xs font-black'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-base)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Paginated Table View */}
      {filteredMenuItems.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="آیتم منویی ثبت نشده است"
          description="با ساخت رسپی و فرمول ساخت برای هر غذا یا نوشیدنی، سود واقعی هر پرس را محاسبه کنید."
          actionLabel="افزودن اولین آیتم منو"
          onAction={openAddModal}
        />
      ) : (
        <Card className="overflow-hidden border border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border-b border-[var(--border-subtle)] dark:border-[var(--border-subtle)] text-[11px] font-black text-[var(--text-secondary)] dark:text-[var(--text-secondary)] select-none">
                  <th
                    onClick={() => handleSort('name')}
                    className="p-3.5 cursor-pointer hover:text-[var(--text-primary)] hover:text-[var(--text-primary)] group transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>نام آیتم منو</span>
                      {renderSortIcon('name')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('category')}
                    className="p-3.5 cursor-pointer hover:text-[var(--text-primary)] hover:text-[var(--text-primary)] group transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>دسته‌بندی</span>
                      {renderSortIcon('category')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('sellingPrice')}
                    className="p-3.5 cursor-pointer hover:text-[var(--text-primary)] hover:text-[var(--text-primary)] group transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>قیمت فروش فعلی</span>
                      {renderSortIcon('sellingPrice')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('targetPrice')}
                    className="p-3.5 cursor-pointer hover:text-[var(--text-primary)] hover:text-[var(--text-primary)] group transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>قیمت پیشنهادی (فودکاست {formatNumber(settings.targetFoodCostPercent)}٪)</span>
                      {renderSortIcon('targetPrice')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('primeCost')}
                    className="p-3.5 cursor-pointer hover:text-[var(--text-primary)] hover:text-[var(--text-primary)] group transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>بهای تمام شده هر پرس</span>
                      {renderSortIcon('primeCost')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('grossProfit')}
                    className="p-3.5 cursor-pointer hover:text-[var(--text-primary)] hover:text-[var(--text-primary)] group transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>سود ناخالص (حاشیه سود)</span>
                      {renderSortIcon('grossProfit')}
                    </div>
                  </th>
                  <th className="p-3.5 text-center">وضعیت قیمت</th>
                  <th className="p-3.5 text-center">عملیات</th>
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
                  className="divide-y divide-[var(--border-subtle)] divide-[var(--border-subtle)] text-xs"
                >
                  {paginatedMenuItems.map((item) => {
                    const isBelowTarget = item.sellingPrice < item.targetPrice;
                    return (
                      <motion.tr
                        key={item.id}
                        variants={tableRowVariants}
                        className="hover:bg-[var(--bg-base)]/60 hover:bg-[var(--bg-base)] transition-colors"
                      >
                        <td className="p-3.5">
                          <div className="font-extrabold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                            {item.name}
                          </div>
                          <div className="text-[10px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] mt-0.5">
                            {formatNumber(item.ingredients?.length || 0)} ماده اولیه در رسپی
                          </div>
                        </td>
                        <td className="p-3.5">
                          <Badge variant="secondary" className="text-[10px]">
                            {item.category}
                          </Badge>
                        </td>
                        <td className="p-3.5 font-black text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                          {formatToman(item.sellingPrice).text}
                        </td>
                        <td className="p-3.5 font-bold text-[var(--status-success-text)] dark:text-[var(--status-success-text)]">
                          {formatToman(item.targetPrice).text}
                        </td>
                        <td className="p-3.5 font-bold text-[var(--status-warning-text)] dark:text-[var(--status-warning-text)]">
                          {formatToman(item.primeCost).text}
                        </td>
                        <td className="p-3.5 font-black">
                          <span className={item.grossProfit >= 0 ? 'text-[#00A650] dark:text-[var(--status-success-text)]' : 'text-[var(--status-error-text)] dark:text-[var(--status-error-text)]'}>
                            {formatToman(item.grossProfit).text} ({formatNumber(item.marginPercent)}٪)
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <Badge variant={isBelowTarget ? 'danger' : 'success'} className="text-[10px]">
                            {isBelowTarget ? 'سوددهی کم' : 'قیمت مناسب'}
                          </Badge>
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openEditModal(item)}
                              className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-base)] hover:bg-[var(--bg-base)] transition-colors cursor-pointer"
                              title="ویرایش رسپی"
                              aria-label={`ویرایش رسپی ${item.name}`}
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => item.id && handleDelete(item.id, item.name)}
                              className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--status-error-text)] dark:hover:text-[var(--status-error-text)] rounded-lg hover:bg-[var(--bg-base)] hover:bg-[var(--bg-base)] transition-colors cursor-pointer"
                              title="حذف"
                              aria-label={`حذف آیتم ${item.name}`}
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
            totalPages={totalPages}
            totalItems={filteredMenuItems.length}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={(newSize) => {
              setItemsPerPage(newSize);
              setCurrentPage(1);
            }}
            itemsPerPageOptions={[5, 8, 10, 12, 15]}
            itemLabel="آیتم منو"
          />
        </Card>
      )}

      {/* Add / Edit Recipe Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'ویرایش فرمول و قیمت‌گذاری' : 'افزودن فرمول ساخت منو'}
        description="مشخصات محصول، ترکیبات و هزینه‌های تولید را جهت آنالیز مالی وارد کنید."
        maxWidth="5xl"
      >
        <form onSubmit={handleSave} noValidate className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Right Column: Basic Info & Recipe Builder */}
            <div className="lg:col-span-7 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-extrabold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-1">
                    نام محصول در منو <span className="text-[var(--status-error-text)]">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثلاً: چلو کباب کوبیده، پیتزا سیر و استیک"
                    className="w-full h-10 rounded-xl border border-[var(--border-subtle)] dark:border-[var(--border-functional)] bg-white dark:bg-[var(--bg-card)] px-3.5 py-2 text-xs font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-all"
                  />
                </div>

                <div>
                  <SearchableSelect
                    label="دسته‌بندی منو"
                    value={category}
                    onChange={(val) => setCategory(val as MenuCategory)}
                    options={MENU_CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
                  />
                </div>
              </div>

              {/* Recipe Builder Box */}
              <div className="rounded-2xl border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] p-3.5 bg-[var(--bg-base)] dark:bg-[var(--bg-card)] space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-1.5">
                    <Calculator className="h-4 w-4 text-[var(--brand-primary)]" />
                    فرمول ساخت و ترکیبات اولیه
                  </h4>
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                    {formatNumber(recipeIngredients.length)} ماده اضافه شده
                  </span>
                </div>

                {/* Ingredient Selector & Add Row */}
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-end">
                  <div className="flex-1 w-full">
                    <SearchableSelect
                      value={selectedIngredientId}
                      onChange={(val) => setSelectedIngredientId(val === '' ? '' : Number(val))}
                      placeholder="-- انتخاب ماده اولیه --"
                      searchPlaceholder="جستجوی سریع..."
                      emptyMessage="ماده اولیه‌ای در انبار یافت نشد"
                      options={ingredients.map((ing) => ({
                        value: ing.id!,
                        label: ing.name,
                        sublabel: `${getUnitLabel(ing.unit)} - هر واحد ${formatToman(ing.unitCost).text}`,
                      }))}
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={selectedQty === '' ? '' : toPersianDigits(selectedQty)}
                      onChange={(e) => {
                        const val = e.target.value;
                        const eng = toEnglishDigits(val).replace(',', '.').replace('/', '.');
                        if (eng === '') setSelectedQty('');
                        else if (/^\d*\.?\d*$/.test(eng)) setSelectedQty(val);
                      }}
                      placeholder="مقدار"
                      className="w-full sm:w-24 h-10 rounded-xl border border-[var(--border-subtle)] dark:border-[var(--border-functional)] bg-white dark:bg-[var(--bg-card)] px-3 py-2 text-xs font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] text-right dir-rtl placeholder:text-[var(--text-secondary)] focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)]"
                    />
                    <Button type="button" size="sm" onClick={addIngredientToRecipe} className="h-10 px-3.5 rounded-xl text-xs font-bold shrink-0">
                      افزودن
                    </Button>
                  </div>
                </div>

                {/* Recipe Ingredients Pill / List Container */}
                {recipeIngredients.length > 0 ? (
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 pl-1">
                    {recipeIngredients.map((ri, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-xl bg-white dark:bg-[var(--bg-card)] px-3 py-2 border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] text-xs font-bold"
                      >
                        <span className="text-[var(--text-primary)] dark:text-[var(--text-primary)] truncate max-w-[140px]">{ri.ingredientName}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)] text-[11px]">
                            {formatNumber(ri.quantity)} {getUnitLabel(ri.unit || '')}
                          </span>
                          <span className="text-[var(--text-primary)] dark:text-[var(--text-primary)] font-black text-[11px]">
                            {formatToman(ri.cost).text}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeRecipeIngredient(index)}
                            aria-label="حذف ماده اولیه از رسپی"
                            className="text-[var(--status-error-text)] hover:text-[var(--status-error-text)] dark:hover:text-[var(--status-error-text)] p-0.5 cursor-pointer transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 text-center border border-dashed border-[var(--border-subtle)] dark:border-[var(--border-subtle)] rounded-xl bg-white/50 dark:bg-[var(--bg-card)]">
                    <p className="text-[11px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-medium">
                      ماده اولیه را انتخاب کرده و مقدار آن را ثبت کنید
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Left Column: Cost Parameters & Calculated Summary & Price */}
            <div className="lg:col-span-5 space-y-3.5">
              {/* Additional Costs (Labor, Packaging, Waste %) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-extrabold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-1 truncate">ضایعات (٪)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={wastePercent === '' ? '' : toPersianDigits(wastePercent)}
                    onChange={(e) => {
                      const val = e.target.value;
                      const eng = toEnglishDigits(val).replace(',', '.').replace('/', '.');
                      if (eng === '') setWastePercent('');
                      else if (/^\d*\.?\d*$/.test(eng)) setWastePercent(val);
                    }}
                    placeholder="مثلاً ۵"
                    className="w-full h-10 rounded-xl border border-[var(--border-subtle)] dark:border-[var(--border-functional)] bg-white dark:bg-[var(--bg-card)] px-2.5 py-2 text-xs font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] text-center dir-rtl focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)]"
                  />
                </div>

                <SmartMoneyInput
                  label="دستمزد"
                  value={laborCost}
                  onChange={(val) => setLaborCost(val)}
                  placeholder="۱۰,۰۰۰"
                  suffix="تومان"
                />

                <SmartMoneyInput
                  label="بسته‌بندی"
                  value={packagingCost}
                  onChange={(val) => setPackagingCost(val)}
                  placeholder="۵,۰۰۰"
                  suffix="تومان"
                />
              </div>

              {/* Financial Calculation Live Card */}
              <div className="rounded-2xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] p-4 space-y-2.5 shadow-2xs transition-colors">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-extrabold">مواد خام:</span>
                  <span className="font-extrabold text-[var(--text-primary)] dark:text-[var(--text-primary)]">{formatToman(totalMaterialCost).text}</span>
                </div>
                {(wasteCost > 0 || numLaborCost > 0 || numPackagingCost > 0) && (
                  <div className="flex justify-between items-center text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                    <span>جانبی (ضایعات + دستمزد + بسته‌بندی):</span>
                    <span className="font-bold text-[var(--status-warning-text)] dark:text-[var(--status-warning-text)]">{formatToman(wasteCost + numLaborCost + numPackagingCost).text}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-extrabold">بهای تمام شده کل (کاست هر پرس):</span>
                  <span className="font-black text-[var(--brand-primary)] dark:text-[var(--status-warning-text)]">{formatToman(primeCost).text}</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-2.5 border-t border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
                  <span className="text-[var(--text-primary)] dark:text-[var(--text-secondary)] font-black">قیمت پیشنهادی ({formatNumber(settings.targetFoodCostPercent)}٪ فودکاست):</span>
                  <span className="font-black text-[var(--status-success-text)] dark:text-[var(--status-success-text)] text-sm">{formatToman(targetPrice).text}</span>
                </div>
              </div>

              {/* Selling Price Entry & Live Margin Badge */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                    قیمت فروش نهایی <span className="text-[var(--status-error-text)]">*</span>
                  </label>
                  {numSellingPrice > 0 && (
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${grossProfit >= 0 ? 'bg-emerald-500/15 text-[var(--status-success-text)] dark:text-[var(--status-success-text)]' : 'bg-rose-500/15 text-[var(--status-error-text)] dark:text-[var(--status-error-text)]'}`}>
                      سود: {formatToman(grossProfit).text} ({formatNumber(marginPercent)}٪)
                    </span>
                  )}
                </div>
                <SmartMoneyInput
                  value={sellingPrice}
                  onChange={(val) => setSellingPrice(val)}
                  placeholder="مثلاً: ۲۵۰,۰۰۰"
                  suffix="تومان"
                />
              </div>

              {/* Footer Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="h-10 px-4 rounded-xl text-xs font-bold">
                  انصراف
                </Button>
                <Button type="submit" variant="primary" disabled={isSubmitting} className="h-10 px-5 rounded-xl text-xs font-black bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]">
                  {isSubmitting ? 'در حال ثبت...' : 'ذخیره آیتم منو'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
