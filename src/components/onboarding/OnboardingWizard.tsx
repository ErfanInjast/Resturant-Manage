import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Store,
  Clock,
  DollarSign,
  Boxes,
  UtensilsCrossed,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Sparkles,
  Coffee,
  ChefHat,
  Pizza,
  Cake,
  Truck,
  TrendingUp,
  ShieldCheck,
  Sun,
  Moon,
  AlertTriangle,
  X,
} from 'lucide-react';
import { db, seedDemoData } from '../../db';
import type { AppSettings, UnitType, MenuCategory } from '../../types';
import { SmartMoneyInput } from '../ui/SmartMoneyInput';
import { SearchableSelect } from '../ui/SearchableSelect';
import { Button } from '../ui/Button';
import { formatToman, toPersianDigits, toEnglishDigits } from '../../lib/utils';
import { useAppStore } from '../../store/useAppStore';

const INGREDIENT_CATEGORY_OPTIONS = [
  { value: 'نوشیدنی و قهوه', label: 'نوشیدنی و قهوه' },
  { value: 'لبنیات و روغن', label: 'لبنیات و روغن' },
  { value: 'پروتئین', label: 'پروتئین' },
  { value: 'غلات', label: 'غلات' },
  { value: 'سایر / سفارشی', label: 'سایر / سفارشی' },
];

const INGREDIENT_UNIT_OPTIONS = [
  { value: 'kg', label: 'کیلوگرم (kg)' },
  { value: 'g', label: 'گرم (g)' },
  { value: 'liter', label: 'لیتر (liter)' },
  { value: 'ml', label: 'میلی‌لیتر (ml)' },
  { value: 'piece', label: 'عدد (piece)' },
];

const MENU_CATEGORY_OPTIONS = [
  { value: 'کافه و گرم', label: 'کافه و گرم' },
  { value: 'نوشیدنی سرد', label: 'نوشیدنی سرد' },
  { value: 'غذای اصلی', label: 'غذای اصلی' },
  { value: 'پیش غذا', label: 'پیش غذا' },
  { value: 'دسر و شیرینی', label: 'دسر و شیرینی' },
  { value: 'سایر / سفارشی', label: 'سایر / سفارشی' },
];

interface OnboardingWizardProps {
  onComplete: () => void;
}

type BusinessType = 'cafe' | 'restaurant' | 'fastfood' | 'bakery' | 'catering' | 'custom';

interface InitialIngredientState {
  id: string;
  name: string;
  category: string;
  unit: UnitType;
  totalQuantity: number;
  totalPrice: number;
}

interface InitialMenuItemState {
  id: string;
  name: string;
  category: MenuCategory;
  sellingPrice: number;
  wastePercent: number;
}

const BUSINESS_TYPES: { id: BusinessType; title: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'cafe', title: 'کافه و اسپرسوبار', desc: 'تخصصی قهوه، نوشیدنی‌های گرم و سرد، دسر', icon: Coffee },
  { id: 'restaurant', title: 'رستوران سنتی / فرنگی', desc: 'انواع غذاهای اصلی، پیش‌غذا، کباب و پاستا', icon: ChefHat },
  { id: 'fastfood', title: 'فست‌فود و پیتزا', desc: 'برگر، پیتزا، ساندویچ و سوخاری', icon: Pizza },
  { id: 'bakery', title: 'قنادی و کافه نان', desc: 'انواع کیک، شیرینی، نان حجیم و کوکی', icon: Cake },
  { id: 'catering', title: 'کترینگ و تهیه غذا', desc: 'سفارشات عمده، شرکتی و مجالس', icon: Truck },
  { id: 'custom', title: 'سایر / سفارشی', desc: 'بستنی‌فروشی، آبمیوه، طباخی، بوفه یا کسب‌وکار خاص شما', icon: Sparkles },
];

const PRESET_INGREDIENTS: Record<BusinessType, Omit<InitialIngredientState, 'id'>[]> = {
  cafe: [
    { name: 'دان قهوه ترکیبی arabica/robusta', category: 'نوشیدنی و قهوه', unit: 'kg', totalQuantity: 5, totalPrice: 4000000 },
    { name: 'شیر تازه پاستوریزه', category: 'لبنیات و روغن', unit: 'liter', totalQuantity: 20, totalPrice: 700000 },
    { name: 'شربت طعم‌دهنده (سیروپ)', category: 'نوشیدنی و قهوه', unit: 'liter', totalQuantity: 3, totalPrice: 1200000 },
  ],
  restaurant: [
    { name: 'برنج ایرانی طارم', category: 'غلات', unit: 'kg', totalQuantity: 50, totalPrice: 7000000 },
    { name: 'گوشت راسته گوسفندی', category: 'پروتئین', unit: 'kg', totalQuantity: 10, totalPrice: 6500000 },
    { name: 'فیله مرغ تازه', category: 'پروتئین', unit: 'kg', totalQuantity: 15, totalPrice: 3300000 },
  ],
  fastfood: [
    { name: 'پنیر موزارلا رنده شده', category: 'لبنیات و روغن', unit: 'kg', totalQuantity: 10, totalPrice: 2800000 },
    { name: 'گوشت چرخ‌کرده برگر', category: 'پروتئین', unit: 'kg', totalQuantity: 15, totalPrice: 4500000 },
    { name: 'نان برگر فرانسوی', category: 'غلات', unit: 'piece', totalQuantity: 100, totalPrice: 1200000 },
  ],
  bakery: [
    { name: 'آرد قنادی درجه یک', category: 'غلات', unit: 'kg', totalQuantity: 50, totalPrice: 1500000 },
    { name: 'کره گیاهی مخصوص شیرینی', category: 'لبنیات و روغن', unit: 'kg', totalQuantity: 10, totalPrice: 2200000 },
    { name: 'شکر سفید', category: 'سایر', unit: 'kg', totalQuantity: 25, totalPrice: 1100000 },
  ],
  catering: [
    { name: 'برنج هاشمی درجه یک', category: 'غلات', unit: 'kg', totalQuantity: 100, totalPrice: 14000000 },
    { name: 'گوشت گوساله مخلوط', category: 'پروتئین', unit: 'kg', totalQuantity: 30, totalPrice: 16500000 },
    { name: 'روغن سرخ‌کردنی', category: 'لبنیات و روغن', unit: 'liter', totalQuantity: 20, totalPrice: 1800000 },
  ],
  custom: [
    { name: 'ماده اولیه نمونه', category: 'سایر', unit: 'kg', totalQuantity: 10, totalPrice: 1000000 },
  ],
};

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
  const { theme, toggleTheme, notify, askConfirmation } = useAppStore();
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Business Profile
  const [restaurantName, setRestaurantName] = useState<string>('کافه رستوران من');
  const [businessType, setBusinessType] = useState<BusinessType>('cafe');
  const [customBusinessTitle, setCustomBusinessTitle] = useState<string>('');

  // Step 2: Capacity & Targets
  const [workingDaysPerMonth, setWorkingDaysPerMonth] = useState<number>(26);
  const [dailyWorkHours, setDailyWorkHours] = useState<number>(8);
  const [targetFoodCostPercent, setTargetFoodCostPercent] = useState<number>(35);

  // Step 3: Fixed Costs
  const [rent, setRent] = useState<number | ''>(0);
  const [salaries, setSalaries] = useState<number | ''>(0);
  const [utilities, setUtilities] = useState<number | ''>(0);
  const [marketing, setMarketing] = useState<number | ''>(0);
  const [insurance, setInsurance] = useState<number | ''>(0);
  const [general, setGeneral] = useState<number | ''>(0);
  const [maintenance, setMaintenance] = useState<number | ''>(0);
  const [delivery, setDelivery] = useState<number | ''>(0);

  // Step 4: Initial Ingredients
  const [ingredientsList, setIngredientsList] = useState<InitialIngredientState[]>([]);
  const [ingPage, setIngPage] = useState<number>(1);
  const [newIngName, setNewIngName] = useState<string>('');
  const [newIngCategory, setNewIngCategory] = useState<string>('نوشیدنی و قهوه');
  const [customIngCategory, setCustomIngCategory] = useState<string>('');
  const [newIngUnit, setNewIngUnit] = useState<UnitType>('kg');
  const [newIngQty, setNewIngQty] = useState<number | ''>('');
  const [newIngPrice, setNewIngPrice] = useState<number | ''>('');

  // Step 5: Initial Menu Items
  const [menuList, setMenuList] = useState<InitialMenuItemState[]>([]);
  const [menuPage, setMenuPage] = useState<number>(1);
  const [newItemName, setNewItemName] = useState<string>('');
  const [newItemCategory, setNewItemCategory] = useState<string>('کافه و گرم');
  const [customMenuItemCategory, setCustomMenuItemCategory] = useState<string>('');
  const [newItemPrice, setNewItemPrice] = useState<number | ''>('');

  // Totals calculations
  const totalMonthlyFixedCosts =
    (Number(rent) || 0) +
    (Number(salaries) || 0) +
    (Number(utilities) || 0) +
    (Number(marketing) || 0) +
    (Number(insurance) || 0) +
    (Number(general) || 0) +
    (Number(maintenance) || 0) +
    (Number(delivery) || 0);

  const totalDailyFixedCost = workingDaysPerMonth > 0 ? totalMonthlyFixedCosts / workingDaysPerMonth : 0;
  const totalHourlyFixedCost = dailyWorkHours > 0 ? totalDailyFixedCost / dailyWorkHours : 0;

  // Load Demo Data Action from Wizard with explicit warning confirm dialog
  const handleLoadDemoFromWizard = () => {
    askConfirmation({
      title: 'بارگذاری اطلاعات نمونه آزمایشی (جایگزینی کامل)',
      message: '⚠️ هشدار مهم: با بارگذاری داده‌های نمونه، کلیه فرم‌های راه‌اندازی با اطلاعات واقعی دمو تکمیل شده و دیتابیس شامل انبار، منو، فروش و ضایعات بارگذاری می‌شود. کلیه اطلاعات فعلی پاک خواهند شد. آیا ادامه می‌دهید؟',
      confirmText: 'بله، پاک‌سازی و بارگذاری دمو',
      cancelText: 'انصراف',
      variant: 'warning',
      onConfirm: async () => {
        try {
          await seedDemoData();
          notify.success('اطلاعات نمونه آزمایشی با موفقیت بارگذاری شد.', 'خوش آمدید به سامانه مدیریت و قیمت‌گذاری رستوران!');
          onComplete();
        } catch (err) {
          console.error('Demo seed error from wizard:', err);
          notify.error('خطا در بارگذاری اطلاعات دمو.');
        }
      },
    });
  };

  const handleApplyPresetIngredients = () => {
    const presets = PRESET_INGREDIENTS[businessType] || PRESET_INGREDIENTS.cafe;
    const formatted = presets.map((p, idx) => ({
      ...p,
      id: `preset-${Date.now()}-${idx}`,
    }));
    setIngredientsList(formatted);
  };

  const handleAddIngredient = () => {
    if (!newIngName.trim()) return;
    const qty = Number(newIngQty) || 1;
    const price = Number(newIngPrice) || 0;
    const resolvedCat = newIngCategory === 'سایر / سفارشی' ? (customIngCategory.trim() || 'سایر') : newIngCategory;

    setIngredientsList((prev) => [
      ...prev,
      {
        id: `ing-${Date.now()}-${Math.random()}`,
        name: newIngName.trim(),
        category: resolvedCat,
        unit: newIngUnit,
        totalQuantity: qty,
        totalPrice: price,
      },
    ]);
    setNewIngName('');
    setNewIngQty('');
    setNewIngPrice('');
  };

  const handleRemoveIngredient = (id: string) => {
    setIngredientsList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddMenuItem = () => {
    if (!newItemName.trim() || !newItemPrice) return;
    const resolvedCat = newItemCategory === 'سایر / سفارشی' ? (customMenuItemCategory.trim() || 'سایر') : newItemCategory;

    setMenuList((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random()}`,
        name: newItemName.trim(),
        category: resolvedCat as MenuCategory,
        sellingPrice: Number(newItemPrice),
        wastePercent: 3,
      },
    ]);
    setNewItemName('');
    setNewItemPrice('');
  };

  const handleRemoveMenuItem = (id: string) => {
    setMenuList((prev) => prev.filter((item) => item.id !== id));
  };

  const [existingCounts, setExistingCounts] = useState<{ sales: number; ingredients: number; menu: number; waste: number } | null>(null);
  const [isConfirmChecked, setIsConfirmChecked] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);

  const doFinishSetup = async () => {
    // 1. Save Settings to IndexedDB Dexie
    const settingsData: AppSettings = {
      id: 'config',
      restaurantName: restaurantName.trim() || 'مجموعه من',
      workingDaysPerMonth: workingDaysPerMonth || 26,
      dailyWorkHours: dailyWorkHours || 8,
      holidaysCount: 4,
      monthlyFixedCosts: {
        rent: Number(rent) || 0,
        utilities: Number(utilities) || 0,
        salaries: Number(salaries) || 0,
        marketing: Number(marketing) || 0,
        insurance: Number(insurance) || 0,
        general: Number(general) || 0,
        maintenance: Number(maintenance) || 0,
        delivery: Number(delivery) || 0,
      },
      targetFoodCostPercent: targetFoodCostPercent || 35,
      taxPercent: 0,
      currencyUnit: 'toman',
      isSetupCompleted: true,
    };

    await db.settings.put(settingsData);

    // 2. Clear old data and write new user ingredients
    await db.ingredients.clear();
    await db.menuItems.clear();
    await db.dailySales.clear();
    await db.wasteLogs.clear();

    for (const ing of ingredientsList) {
      const unitCost = ing.totalQuantity > 0 ? Math.round(ing.totalPrice / ing.totalQuantity) : 0;
      await db.ingredients.add({
        name: ing.name,
        category: ing.category,
        unit: ing.unit,
        totalPrice: ing.totalPrice,
        totalQuantity: ing.totalQuantity,
        unitCost,
        minimumStock: Math.max(1, Math.round(ing.totalQuantity * 0.2)),
        currentStock: ing.totalQuantity,
        updatedAt: new Date().toISOString(),
      });
    }

    // 3. Write new user menu items
    for (const item of menuList) {
      const matCost = 0;
      const primeCost = matCost;
      await db.menuItems.add({
        name: item.name,
        category: item.category,
        sellingPrice: item.sellingPrice,
        wastePercent: item.wastePercent,
        ingredients: [],
        laborCost: 0,
        packagingCost: 0,
        totalMaterialCost: matCost,
        primeCost,
        targetPrice: Math.round(primeCost / (targetFoodCostPercent / 100)),
        grossProfit: item.sellingPrice - primeCost,
        marginPercent: Math.round(((item.sellingPrice - primeCost) / item.sellingPrice) * 100),
        salesVolume30Days: 0,
        updatedAt: new Date().toISOString(),
      });
    }

    notify.success('راه‌اندازی با موفقیت انجام شد', `خوش آمدید به سامانه مدیریت و قیمت‌گذاری رستوران!`);
    onComplete();
  };

  const handleFinishSetup = async () => {
    const [salesCount, ingCount, menuCount, wasteCount] = await Promise.all([
      db.dailySales.count(),
      db.ingredients.count(),
      db.menuItems.count(),
      db.wasteLogs.count(),
    ]);

    const total = salesCount + ingCount + menuCount + wasteCount;

    if (total > 0) {
      setExistingCounts({
        sales: salesCount,
        ingredients: ingCount,
        menu: menuCount,
        waste: wasteCount,
      });
      setIsConfirmChecked(false);
      setShowWarningModal(true);
    } else {
      await doFinishSetup();
    }
  };

  const STEPS_CONFIG = [
    { step: 1, title: 'کسب‌وکار', icon: Store },
    { step: 2, title: 'ظرفیت', icon: Clock },
    { step: 3, title: 'هزینه‌ها', icon: DollarSign },
    { step: 4, title: 'تایید', icon: CheckCircle2 },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 font-['IRANYekan','iranyekan',sans-serif] dir-rtl select-none overflow-hidden transition-colors duration-200">
      <div className="w-full max-w-3xl bg-white dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden my-auto max-h-[96vh] transition-colors duration-200">
        
        {/* Header Bar */}
        <div className="shrink-0 bg-[var(--bg-base)] dark:bg-[#262320] border-b border-[var(--border-subtle)] dark:border-[var(--border-subtle)] p-3 sm:p-4 transition-colors duration-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-[var(--brand-primary)] text-white flex items-center justify-center font-black text-sm shadow-md">
                <Store className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
                  <span>راه‌اندازی مدیریت و قیمت‌گذاری رستوران</span>
                </h1>
                <p className="text-[11px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                  تنظیمات اولیه‌تان را مشخص کنید
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLoadDemoFromWizard}
                className="h-8 px-2.5 rounded-xl bg-[var(--brand-primary-subtle)] hover:bg-[var(--brand-primary)]/15 text-[var(--brand-primary)] text-xs font-bold flex items-center gap-1.5 transition-colors border border-[var(--brand-primary)]/20 cursor-pointer"
                title="تست سریع با داده‌های نمونه رستوران"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">بارگذاری دمو</span>
              </button>

              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={toggleTheme}
                className="h-8 w-8 rounded-xl bg-[var(--bg-base)] hover:bg-stone-200 dark:bg-[var(--bg-card)] dark:hover:bg-stone-700 text-[var(--text-primary)] dark:text-[var(--text-secondary)] flex items-center justify-center transition-colors cursor-pointer border border-[var(--border-subtle)] dark:border-[var(--border-functional)]"
                title={theme === 'dark' ? 'حالت روز (روشن)' : 'حالت شب (تاریک)'}
              >
                {theme === 'dark' ? <Sun className="h-4 w-4 text-[var(--status-warning-text)]" /> : <Moon className="h-4 w-4 text-[var(--text-secondary)]" />}
              </button>

              <div className="text-left bg-white dark:bg-[var(--bg-card)] px-2.5 py-1 rounded-xl border border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
                <span className="text-[10px] font-extrabold text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">گام </span>
                <span className="text-xs font-black text-[var(--brand-primary)]">{toPersianDigits(currentStep)}</span>
                <span className="text-[10px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)]"> / {toPersianDigits(4)}</span>
              </div>
            </div>
          </div>

          {/* Reassurance Guarantee Banner */}
          <div className="bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20 rounded-xl px-3 py-1.5 flex items-center gap-2 text-[11px] font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
            <ShieldCheck className="h-4 w-4 text-[var(--brand-primary)] shrink-0" />
            <span className="truncate">
              خیالتان راحت! تمامی این اطلاعات بعداً از بخش <b>تنظیمات</b>، <b>انبار</b> و <b>منو</b> قابل ویرایش، حذف و اضافه هستند.
            </span>
          </div>

          {/* Compact Step Icons */}
          <div className="grid grid-cols-4 gap-1 mt-2.5">
            {STEPS_CONFIG.map((s) => {
              const Icon = s.icon;
              const isActive = s.step === currentStep;
              const isDone = s.step < currentStep;
              return (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => s.step < currentStep && setCurrentStep(s.step)}
                  className={`flex items-center justify-center gap-1 py-1 px-1 rounded-lg text-[11px] font-bold transition-all ${
                    isDone
                      ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-[var(--status-success-text)] dark:text-[var(--status-success-text)] border border-emerald-500/30 cursor-pointer'
                      : isActive
                      ? 'bg-[var(--brand-primary)] text-white shadow-xs'
                      : 'bg-white dark:bg-[var(--bg-card)] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline truncate">{s.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content View Body - Zero Inner Scrollbar */}
        <div className="p-3 sm:p-5 space-y-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="space-y-3"
            >
              {/* STEP 1: BUSINESS PROFILE */}
              {currentStep === 1 && (
                <div className="space-y-3">
                  <div>
                    <h2 className="text-sm font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
                      <Store className="h-4 w-4 text-[var(--brand-primary)]" />
                      <span>عنوان و نوع کسب‌وکار</span>
                    </h2>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--text-primary)] dark:text-[var(--text-secondary)] mb-1">نام برند یا مجموعه شما</label>
                    <input
                      type="text"
                      value={restaurantName}
                      onChange={(e) => setRestaurantName(e.target.value)}
                      placeholder="مثلاً: کافه رستوران سپهر"
                      className="w-full h-10 rounded-xl border border-[var(--border-subtle)] dark:border-[var(--border-functional)] bg-[var(--bg-base)] dark:bg-stone-950 px-3 py-2 text-xs font-bold text-[var(--text-primary)] dark:text-white placeholder:text-[var(--text-secondary)] dark:placeholder:text-[var(--text-secondary)] focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary)]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--text-primary)] dark:text-[var(--text-secondary)] mb-1">حوزه کاری تخصصی</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {BUSINESS_TYPES.map((bt) => {
                        const Icon = bt.icon;
                        const isSelected = businessType === bt.id;
                        return (
                          <button
                            key={bt.id}
                            type="button"
                            onClick={() => setBusinessType(bt.id)}
                            className={`p-2.5 rounded-xl border transition-all text-right flex items-center gap-2 cursor-pointer ${
                              isSelected
                                ? 'bg-[var(--brand-primary)]/10 dark:bg-[var(--brand-primary)]/20 border-[var(--brand-primary)] text-[var(--text-primary)] dark:text-white shadow-xs'
                                : 'bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border-[var(--border-subtle)] dark:border-[var(--border-subtle)] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] hover:border-[var(--border-functional)] dark:hover:border-stone-700'
                            }`}
                          >
                            <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? 'bg-[var(--brand-primary)] text-white' : 'bg-stone-200 dark:bg-[var(--bg-card)] text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="truncate">
                              <h3 className="text-xs font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] truncate">{bt.title}</h3>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {businessType === 'custom' && (
                      <div className="mt-2.5 p-2 bg-[var(--bg-base)] dark:bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
                        <label className="block text-[11px] font-bold text-[var(--text-primary)] dark:text-[var(--text-secondary)] mb-1">عنوان سفارشی حوزه کاری شما</label>
                        <input
                          type="text"
                          value={customBusinessTitle}
                          onChange={(e) => setCustomBusinessTitle(e.target.value)}
                          placeholder="مثلاً: آبمیوه بستنی، طباخی، بوفه باشگاه..."
                          className="w-full h-9 rounded-lg border border-[var(--border-subtle)] dark:border-[var(--border-functional)] bg-white dark:bg-stone-950 px-3 py-1 text-xs font-bold text-[var(--text-primary)] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary)]"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 2: WORKING HOURS & TARGET FOOD COST */}
              {currentStep === 2 && (
                <div className="space-y-3">
                  <div>
                    <h2 className="text-sm font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
                      <Clock className="h-4 w-4 text-[var(--brand-primary)]" />
                      <span>ظرفیت زمان‌بندی و فودکاست هدف (Food Cost %)</span>
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-[var(--bg-base)] dark:bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] space-y-2">
                      <label className="block text-xs font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">روزهای کاری در ماه</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={workingDaysPerMonth === 0 ? '' : toPersianDigits(workingDaysPerMonth)}
                        onChange={(e) => {
                          const eng = toEnglishDigits(e.target.value);
                          setWorkingDaysPerMonth(eng === '' ? 0 : Math.min(31, Math.max(1, Number(eng))));
                        }}
                        className="w-full h-9 rounded-lg border border-[var(--border-subtle)] dark:border-[var(--border-functional)] bg-white dark:bg-stone-950 px-3 text-xs font-bold text-[var(--text-primary)] dark:text-white text-right focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary)]"
                      />
                      <div className="flex gap-1.5">
                        {[20, 24, 26, 30].map((days) => (
                          <button
                            key={days}
                            type="button"
                            onClick={() => setWorkingDaysPerMonth(days)}
                            className={`flex-1 h-8 rounded-md text-[11px] font-bold border transition-all cursor-pointer ${
                              workingDaysPerMonth === days
                                ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]'
                                : 'bg-[var(--bg-base)] dark:bg-[var(--bg-card)] text-[var(--text-primary)] dark:text-[var(--text-secondary)] border-[var(--border-subtle)] dark:border-[var(--border-functional)] hover:bg-stone-200 dark:hover:bg-stone-700'
                            }`}
                          >
                            {toPersianDigits(days)} روز
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-[var(--bg-base)] dark:bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] space-y-2">
                      <label className="block text-xs font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">ساعات کاری روزانه</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={dailyWorkHours === 0 ? '' : toPersianDigits(dailyWorkHours)}
                        onChange={(e) => {
                          const eng = toEnglishDigits(e.target.value);
                          setDailyWorkHours(eng === '' ? 0 : Math.min(24, Math.max(1, Number(eng))));
                        }}
                        className="w-full h-9 rounded-lg border border-[var(--border-subtle)] dark:border-[var(--border-functional)] bg-white dark:bg-stone-950 px-3 text-xs font-bold text-[var(--text-primary)] dark:text-white text-right focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary)]"
                      />
                      <div className="flex gap-1.5">
                        {[6, 8, 10, 12, 16].map((hrs) => (
                          <button
                            key={hrs}
                            type="button"
                            onClick={() => setDailyWorkHours(hrs)}
                            className={`flex-1 h-8 rounded-md text-[11px] font-bold border transition-all cursor-pointer ${
                              dailyWorkHours === hrs
                                ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]'
                                : 'bg-[var(--bg-base)] dark:bg-[var(--bg-card)] text-[var(--text-primary)] dark:text-[var(--text-secondary)] border-[var(--border-subtle)] dark:border-[var(--border-functional)] hover:bg-stone-200 dark:hover:bg-stone-700'
                            }`}
                          >
                            {toPersianDigits(hrs)} ساعت
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-[var(--bg-base)] dark:bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
                        <span>درصد فودکاست هدف (استاندارد صنعت)</span>
                      </label>
                      <span className="text-xs font-black text-[var(--brand-primary)] bg-[var(--brand-primary)]/10 px-2 py-0.5 rounded-md border border-[var(--brand-primary)]/20">
                        {toPersianDigits(targetFoodCostPercent)}٪
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {[25, 30, 35, 40].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setTargetFoodCostPercent(pct)}
                          className={`flex-1 h-9 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            targetFoodCostPercent === pct
                              ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]'
                              : 'bg-[var(--bg-base)] dark:bg-[var(--bg-card)] text-[var(--text-primary)] dark:text-[var(--text-secondary)] border-[var(--border-subtle)] dark:border-[var(--border-functional)] hover:bg-stone-200 dark:hover:bg-stone-700'
                          }`}
                        >
                          {toPersianDigits(pct)}٪
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: FIXED COSTS */}
              {currentStep === 3 && (
                <div className="space-y-3">
                  <div>
                    <h2 className="text-sm font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-[var(--brand-primary)]" />
                      <span>هزینه‌های ثابت و عمومی ماهانه (به تومان)</span>
                    </h2>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <SmartMoneyInput
                      label="اجاره ماهانه"
                      labelClassName="text-[var(--text-primary)] dark:text-[var(--text-secondary)] text-[11px]"
                      className="bg-white dark:bg-stone-950 border-[var(--border-subtle)] dark:border-[var(--border-functional)] text-[var(--text-primary)] dark:text-white text-xs h-9 placeholder:text-[var(--text-secondary)] dark:placeholder:text-[var(--text-secondary)]"
                      value={rent}
                      onChange={setRent}
                      placeholder="مثلاً ۵۰,۰۰۰,۰۰۰"
                    />
                    <SmartMoneyInput
                      label="حقوق پرسنل"
                      labelClassName="text-[var(--text-primary)] dark:text-[var(--text-secondary)] text-[11px]"
                      className="bg-white dark:bg-stone-950 border-[var(--border-subtle)] dark:border-[var(--border-functional)] text-[var(--text-primary)] dark:text-white text-xs h-9 placeholder:text-[var(--text-secondary)] dark:placeholder:text-[var(--text-secondary)]"
                      value={salaries}
                      onChange={setSalaries}
                      placeholder="مثلاً ۷۰,۰۰۰,۰۰۰"
                    />
                    <SmartMoneyInput
                      label="قبوض و انرژی"
                      labelClassName="text-[var(--text-primary)] dark:text-[var(--text-secondary)] text-[11px]"
                      className="bg-white dark:bg-stone-950 border-[var(--border-subtle)] dark:border-[var(--border-functional)] text-[var(--text-primary)] dark:text-white text-xs h-9 placeholder:text-[var(--text-secondary)] dark:placeholder:text-[var(--text-secondary)]"
                      value={utilities}
                      onChange={setUtilities}
                      placeholder="مثلاً ۸,۰۰۰,۰۰۰"
                    />
                    <SmartMoneyInput
                      label="تبلیغات"
                      labelClassName="text-[var(--text-primary)] dark:text-[var(--text-secondary)] text-[11px]"
                      className="bg-white dark:bg-stone-950 border-[var(--border-subtle)] dark:border-[var(--border-functional)] text-[var(--text-primary)] dark:text-white text-xs h-9 placeholder:text-[var(--text-secondary)] dark:placeholder:text-[var(--text-secondary)]"
                      value={marketing}
                      onChange={setMarketing}
                      placeholder="مثلاً ۵,۰۰۰,۰۰۰"
                    />
                    <SmartMoneyInput
                      label="بیمه و مالیات"
                      labelClassName="text-[var(--text-primary)] dark:text-[var(--text-secondary)] text-[11px]"
                      className="bg-white dark:bg-stone-950 border-[var(--border-subtle)] dark:border-[var(--border-functional)] text-[var(--text-primary)] dark:text-white text-xs h-9 placeholder:text-[var(--text-secondary)] dark:placeholder:text-[var(--text-secondary)]"
                      value={insurance}
                      onChange={setInsurance}
                      placeholder="مثلاً ۱۰,۰۰۰,۰۰۰"
                    />
                    <SmartMoneyInput
                      label="سایر هزینه‌ها"
                      labelClassName="text-[var(--text-primary)] dark:text-[var(--text-secondary)] text-[11px]"
                      className="bg-white dark:bg-stone-950 border-[var(--border-subtle)] dark:border-[var(--border-functional)] text-[var(--text-primary)] dark:text-white text-xs h-9 placeholder:text-[var(--text-secondary)] dark:placeholder:text-[var(--text-secondary)]"
                      value={general}
                      onChange={setGeneral}
                      placeholder="مثلاً ۴,۰۰۰,۰۰۰"
                    />
                    <SmartMoneyInput
                      label="تعمیرات و نگهداری"
                      labelClassName="text-[var(--text-primary)] dark:text-[var(--text-secondary)] text-[11px]"
                      className="bg-white dark:bg-stone-950 border-[var(--border-subtle)] dark:border-[var(--border-functional)] text-[var(--text-primary)] dark:text-white text-xs h-9 placeholder:text-[var(--text-secondary)] dark:placeholder:text-[var(--text-secondary)]"
                      value={maintenance}
                      onChange={setMaintenance}
                      placeholder="مثلاً ۳,۵۰۰,۰۰۰"
                    />
                    <SmartMoneyInput
                      label="بسته‌بندی و ارسال"
                      labelClassName="text-[var(--text-primary)] dark:text-[var(--text-secondary)] text-[11px]"
                      className="bg-white dark:bg-stone-950 border-[var(--border-subtle)] dark:border-[var(--border-functional)] text-[var(--text-primary)] dark:text-white text-xs h-9 placeholder:text-[var(--text-secondary)] dark:placeholder:text-[var(--text-secondary)]"
                      value={delivery}
                      onChange={setDelivery}
                      placeholder="مثلاً ۴,۵۰۰,۰۰۰"
                    />
                  </div>

                  <div className="rounded-xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] p-2.5 border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)] block text-[10px]">جمع کل هزینه‌های ثابت:</span>
                      <span className="font-black text-[var(--brand-primary)] text-sm">{formatToman(totalMonthlyFixedCosts).text}</span>
                    </div>

                    <div className="flex gap-3 text-[var(--text-primary)] dark:text-[var(--text-secondary)] font-bold text-[11px]">
                      <div>
                        <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)] text-[10px] block">روزانه:</span>
                        <span>{formatToman(Math.round(totalDailyFixedCost)).text}</span>
                      </div>
                      <div>
                        <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)] text-[10px] block">ساعتی:</span>
                        <span>{formatToman(Math.round(totalHourlyFixedCost)).text}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: SUMMARY & FINAL CONFIRMATION */}
              {currentStep === 4 && (
                <div className="space-y-3">
                  <div>
                    <h2 className="text-sm font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[var(--status-success-text)] dark:text-[var(--status-success-text)]" />
                      <span>تایید و راه‌اندازی نهایی</span>
                    </h2>
                  </div>

                  <div className="bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] rounded-xl p-3 space-y-2 text-xs">
                    <div className="flex justify-between items-center border-b border-[var(--border-subtle)] dark:border-[var(--border-subtle)] pb-2">
                      <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">نام مجموعه:</span>
                      <span className="font-black text-[var(--text-primary)] dark:text-[var(--text-primary)]">{restaurantName}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">هزینه‌های ثابت ماهانه:</span>
                      <span className="font-black text-[var(--brand-primary)]">{formatToman(totalMonthlyFixedCosts).text}</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[var(--status-success-text)] dark:text-emerald-300 text-[11px] font-bold flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-[var(--status-success-text)] dark:text-[var(--status-success-text)]" />
                    <span>سیستم آماده محاسبه بهای تمام شده، سود خالص و نقطه سربه سر است. روی دکمه شروع کار کلیک کنید.</span>
                  </div>

                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[var(--brand-primary)] shrink-0" />
                      <span className="font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] text-[11px]">یا بارگذاری کامل داده‌های نمونه واقعی؟</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleLoadDemoFromWizard}
                      className="px-3 py-1 rounded-lg bg-[var(--brand-primary)] text-white font-bold text-[11px] hover:bg-[var(--brand-primary-hover)] transition-all cursor-pointer shadow-sm shrink-0"
                    >
                      بارگذاری دمو
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Navigation Controls */}
        <div className="shrink-0 bg-[var(--bg-base)] dark:bg-[#262320] border-t border-[var(--border-subtle)] dark:border-[var(--border-subtle)] p-3 sm:p-4 flex items-center justify-between transition-colors duration-200">
          <div>
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="text-[var(--text-primary)] dark:text-[var(--text-secondary)] border-[var(--border-subtle)] dark:border-[var(--border-functional)] bg-white dark:bg-[var(--bg-card)] hover:bg-[var(--bg-base)] dark:hover:bg-stone-700 text-xs font-bold h-9 rounded-xl"
              >
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
                <span>مرحله قبل</span>
              </Button>
            )}
          </div>

          <div>
            {currentStep < 4 ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setCurrentStep((prev) => prev + 1)}
                className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-xs font-black h-9 px-4 rounded-xl shadow-md cursor-pointer"
              >
                <span>مرحله بعد</span>
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleFinishSetup}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black h-9 px-5 rounded-xl shadow-lg cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4 ml-1.5" />
                <span>شروع کار با سامانه</span>
              </Button>
            )}
          </div>
        </div>

      </div>

      {/* Warning Confirmation Modal */}
      {showWarningModal && existingCounts && (
        <div dir="rtl" className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md font-['IRANYekan','iranyekan',sans-serif]">
          <div className="w-full max-w-md bg-white dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] dark:border-[var(--border-subtle)] pb-3">
              <h3 className="text-base font-black text-[var(--status-error-text)] dark:text-[var(--status-error-text)] flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                <span>تأیید پاک‌سازی داده‌های موجود</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowWarningModal(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs font-bold text-[var(--text-primary)] dark:text-[var(--text-secondary)] leading-relaxed">
              این عملیات {toPersianDigits(existingCounts.sales)} فاکتور فروش، {toPersianDigits(existingCounts.ingredients)} ماده اولیه، {toPersianDigits(existingCounts.menu)} آیتم منو و {toPersianDigits(existingCounts.waste)} گزارش ضایعات موجود را برای همیشه و غیرقابل بازگشت حذف میکند.
            </p>

            <div className="flex items-center gap-2 bg-[var(--status-error-bg)] p-3 rounded-xl border border-[var(--status-error-text)]/30 dark:border-[var(--status-error-text)]/30">
              <input
                type="checkbox"
                id="wizardConfirmDeleteCheck"
                checked={isConfirmChecked}
                onChange={(e) => setIsConfirmChecked(e.target.checked)}
                className="h-4 w-4 text-[var(--status-error-text)] rounded-md border-[var(--status-error-text)]/30 focus:ring-rose-500 cursor-pointer"
              />
              <label htmlFor="wizardConfirmDeleteCheck" className="text-xs font-black text-rose-900 dark:text-rose-200 cursor-pointer">
                میدانم که همهی دادههای فعلی پاک میشوند
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowWarningModal(false)}
                className="text-xs font-bold rounded-xl"
              >
                انصراف
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={async () => {
                  setShowWarningModal(false);
                  await doFinishSetup();
                }}
                disabled={!isConfirmChecked}
                className="text-xs font-black px-4 rounded-xl shadow-md disabled:opacity-40"
              >
                تأیید و ادامه
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
