import React, { useState, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Settings,
  Download,
  Upload,
  RotateCcw,
  Sparkles,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Building,
  Phone,
  MapPin,
  Sliders,
  Database,
  ShieldAlert,
  Save,
  Clock,
  Briefcase,
  TrendingUp,
  HelpCircle,
  FileText,
  Printer,
  Trash2,
  ClipboardList,
  X,
} from 'lucide-react';
import { db, DEFAULT_SETTINGS, exportDatabaseJSON, importDatabaseJSON, seedDemoData, syncAndRecalculateAllData } from '../../db';
import type { AppSettings, FixedCosts } from '../../types';
import { formatToman, formatNumber, roundCurrency, toPersianDigits, toEnglishDigits } from '../../lib/utils';
import { formatJalali, getJalaliDate, PERSIAN_MONTH_NAMES, getDaysInJalaliMonth } from '../../lib/jalali';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { SmartMoneyInput } from '../ui/SmartMoneyInput';
import { SearchableSelect } from '../ui/SearchableSelect';
import { PageSkeleton } from '../ui/PageSkeleton';
import { useAppStore } from '../../store/useAppStore';
import { PnLReportExportModal } from '../dashboard/PnLReportExportModal';

type SettingsTab = 'profile' | 'financials' | 'thresholds' | 'data';

const BUSINESS_TYPES = [
  'کافه رستوران',
  'رستوران سنتی / مطعم',
  'فست فود و ساندویچی',
  'کترینگ و تهیه غذا',
  'کافه قنادی و شیرینی‌پزی',
  'سایر / چندمنظوره',
];

export const SettingsManager: React.FC = () => {
  const { notify, askConfirmation } = useAppStore();
  const settingsQuery = useLiveQuery(() => db.settings.get('config'));
  const settings = settingsQuery ?? DEFAULT_SETTINGS;

  const salesRecords = useLiveQuery(() => db.dailySales.toArray()) ?? [];
  const wasteLogs = useLiveQuery(() => db.wasteLogs.toArray()) ?? [];
  const menuItems = useLiveQuery(() => db.menuItems.toArray()) ?? [];

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [isExportPdfOpen, setIsExportPdfOpen] = useState(false);

  // Tab 1: Profile & Identity
  const [restaurantName, setRestaurantName] = useState(settings.restaurantName || '');
  const [businessType, setBusinessType] = useState(settings.businessType || 'کافه رستوران');
  const [contactPhone, setContactPhone] = useState(settings.contactPhone || '');
  const [address, setAddress] = useState(settings.address || '');

  // Tab 2: Financial & Working Parameters
  const [workingDays, setWorkingDays] = useState<number | ''>(settings.workingDaysPerMonth || 26);
  const [dailyWorkHours, setDailyWorkHours] = useState<number | ''>(settings.dailyWorkHours || 8);
  const [targetFoodCostPercent, setTargetFoodCostPercent] = useState<number | string>(settings.targetFoodCostPercent || 35);
  const [taxPercent, setTaxPercent] = useState<number | string>(settings.taxPercent ?? 9);
  const [fixedCosts, setFixedCosts] = useState<FixedCosts>(settings.monthlyFixedCosts || DEFAULT_SETTINGS.monthlyFixedCosts);

  // Tab 3: Inventory & Thresholds
  const [defaultLowStockThreshold, setDefaultLowStockThreshold] = useState<number | string>(settings.defaultLowStockThreshold ?? 5);
  const [defaultRecipeWastePercent, setDefaultRecipeWastePercent] = useState<number | string>(settings.defaultRecipeWastePercent ?? 3);
  const [highFoodCostThreshold, setHighFoodCostThreshold] = useState<number | string>(settings.highFoodCostThreshold ?? 40);

  // Export / Import Loading
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset All DB Modal State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetConfirmInput, setResetConfirmInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (settingsQuery) {
      setRestaurantName(settingsQuery.restaurantName || '');
      setBusinessType(settingsQuery.businessType || 'کافه رستوران');
      setContactPhone(settingsQuery.contactPhone || '');
      setAddress(settingsQuery.address || '');

      setWorkingDays(settingsQuery.workingDaysPerMonth || 26);
      setDailyWorkHours(settingsQuery.dailyWorkHours || 8);
      setTargetFoodCostPercent(settingsQuery.targetFoodCostPercent || 35);
      setTaxPercent(settingsQuery.taxPercent ?? 9);
      setFixedCosts(settingsQuery.monthlyFixedCosts || DEFAULT_SETTINGS.monthlyFixedCosts);

      setDefaultLowStockThreshold(settingsQuery.defaultLowStockThreshold ?? 5);
      setDefaultRecipeWastePercent(settingsQuery.defaultRecipeWastePercent ?? 3);
      setHighFoodCostThreshold(settingsQuery.highFoodCostThreshold ?? 40);
    }
  }, [settingsQuery]);

  if (settingsQuery === undefined) {
    return <PageSkeleton type="settings" />;
  }

  // Derived Numbers
  const parseDecimal = (val: number | string, fallback: number): number => {
    if (typeof val === 'number') return isNaN(val) ? fallback : val;
    const str = toEnglishDigits(String(val)).replace(',', '.').replace('/', '.').trim();
    if (str === '') return fallback;
    const num = Number(str);
    return isNaN(num) ? fallback : num;
  };

  const numWorkingDays = typeof workingDays === 'number' ? workingDays : (workingDays === '' ? 26 : (Number(toEnglishDigits(String(workingDays))) || 26));
  const numDailyWorkHours = typeof dailyWorkHours === 'number' ? dailyWorkHours : (dailyWorkHours === '' ? 8 : (Number(toEnglishDigits(String(dailyWorkHours))) || 8));
  const numTargetFoodCost = parseDecimal(targetFoodCostPercent, 35);
  const numTaxPercent = parseDecimal(taxPercent, 0);

  const numDefaultLowStock = parseDecimal(defaultLowStockThreshold, 5);
  const numDefaultRecipeWaste = parseDecimal(defaultRecipeWastePercent, 3);
  const numHighFoodCost = parseDecimal(highFoodCostThreshold, 40);

  // Monthly Total Overhead Calculation
  const totalMonthlyOverhead =
    (fixedCosts.rent || 0) +
    (fixedCosts.utilities || 0) +
    (fixedCosts.salaries || 0) +
    (fixedCosts.marketing || 0) +
    (fixedCosts.insurance || 0) +
    (fixedCosts.general || 0) +
    (fixedCosts.maintenance || 0) +
    (fixedCosts.delivery || 0);

  const dailyOverhead = roundCurrency(totalMonthlyOverhead / Math.max(1, numWorkingDays));
  const hourlyOverhead = roundCurrency(dailyOverhead / Math.max(1, numDailyWorkHours));

  // Handle Save
  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setIsSaving(true);
      const updated: AppSettings = {
        id: 'config',
        restaurantName: restaurantName.trim() || 'مجموعه من',
        businessType,
        contactPhone: contactPhone.trim(),
        address: address.trim(),
        workingDaysPerMonth: numWorkingDays,
        dailyWorkHours: numDailyWorkHours,
        holidaysCount: Math.max(0, 30 - numWorkingDays),
        monthlyFixedCosts: fixedCosts,
        targetFoodCostPercent: numTargetFoodCost,
        taxPercent: numTaxPercent,
        currencyUnit: 'toman',
        defaultLowStockThreshold: numDefaultLowStock,
        defaultRecipeWastePercent: numDefaultRecipeWaste,
        highFoodCostThreshold: numHighFoodCost,
        isSetupCompleted: settings?.isSetupCompleted ?? true,
      };

      await db.settings.put(updated);
      await syncAndRecalculateAllData();
      notify.success('تنظیمات با موفقیت به‌روزرسانی شد.');
    } catch (err) {
      console.error('Save settings error:', err);
      notify.error('خطا در ذخیره‌سازی تنظیمات.');
    } finally {
      setIsSaving(false);
    }
  };

  // Export JSON
  const handleExportJSON = async () => {
    try {
      setIsExporting(true);
      const blob = await exportDatabaseJSON();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-restaurant-financial-${formatJalali(new Date(), 'iso')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      notify.success('فایل پشتیبان داده‌ها با موفقیت دانلود شد.');
    } catch (err) {
      console.error('Export error:', err);
      notify.error('خطا در پشتیبان‌گیری از دیتابیس.');
    } finally {
      setIsExporting(false);
    }
  };

  // Import JSON
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    askConfirmation({
      title: 'بازیابی فایل پشتیبان اطلاعات',
      badgeText: 'جایگزینی کامل داده‌ها',
      message: 'بازیابی این فایل پشتیبان، تمام اطلاعات موجود در بانک اطلاعاتی برنامه را جایگزین خواهد کرد. آیا اطمینان دارید؟',
      details: [
        'اطلاعات فعلی موجودی انبار، منو و فاکتورها جایگزین می‌شوند.',
        'لطفاً مطمئن شوید فایل انتخاب‌شده فایل پشتیبان معتبر همین سامانه است.',
      ],
      confirmText: 'تایید و بازیابی اطلاعات',
      cancelText: 'انصراف',
      variant: 'warning',
      onConfirm: async () => {
        try {
          setIsImporting(true);
          await importDatabaseJSON(file);
          notify.success('بازیابی داده‌ها با موفقیت انجام شد!');
        } catch (err) {
          console.error('Import error:', err);
          notify.error('خطا در بازیابی فایل پشتیبان', 'لطفاً از صحت فایل انتخاب‌شده مطمئن شوید.');
        } finally {
          setIsImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      },
      onCancel: () => {
        if (fileInputRef.current) fileInputRef.current.value = '';
      },
    });
  };

  // Seed Demo Data
  const handleLoadDemoData = () => {
    askConfirmation({
      title: 'بارگذاری اطلاعات نمونه آزمایشی',
      badgeText: 'جایگزینی با نمونه آزمایشی',
      message: 'با بارگذاری داده‌های نمونه، کلیه اطلاعات فعلی شما (انبار، منو، فاکتورهای فروش روزانه و ضایعات) پاک شده و با اطلاعات آزمایشی جدید جایگزین می‌شود. آیا اطمینان دارید؟',
      details: [
        'مواد اولیه و موجودی انبار فعلی پاک‌سازی و با اقلام نمونه آزمایشی پر می‌شوند.',
        'لیست محصولات و فرمول‌های ساخت منو مجدداً ساخته می‌شوند.',
        'تاریخچه فروش و فاکتورهای روزانه با دادهای نمونه آزمایش بازسازی می‌شوند.',
      ],
      confirmText: 'پاک‌سازی و بارگذاری نمونه آزمایشی',
      cancelText: 'انصراف',
      variant: 'warning',
      onConfirm: async () => {
        try {
          setIsSeeding(true);
          await seedDemoData();
          notify.success('اطلاعات نمونه آزمایشی با موفقیت بارگذاری گردید.');
        } catch (err) {
          console.error('Seed demo error:', err);
          notify.error('خطا در بارگذاری اطلاعات نمونه آزمایشی.');
        } finally {
          setIsSeeding(false);
        }
      },
    });
  };

  // Re-run Wizard
  const handleReRunWizard = () => {
    askConfirmation({
      title: 'اجرای مجدد فرم راه‌اندازی اولیه',
      badgeText: 'بازنشانی تنظیمات اولیه',
      message: 'آیا مایلید فرم راه‌اندازی اولیه مجدداً برای شما فعال شود؟ تکمیل مجدد آن، اطلاعات انبار، منو و فروش را بازنشانی خواهد کرد.',
      details: [
        'مراحل خوش‌آمدگویی و دریافت مشخصات کسب‌وکار مجدداً فعال می‌شوند.',
        'تکمیل دوباره این فرم، تمام اطلاعات قبلی را پاک‌سازی می‌کند.',
      ],
      confirmText: 'شروع مجدد راه‌اندازی اولیه',
      cancelText: 'انصراف',
      variant: 'warning',
      onConfirm: async () => {
        const current = (await db.settings.get('config')) || DEFAULT_SETTINGS;
        await db.settings.put({
          ...current,
          id: 'config',
          isSetupCompleted: false,
        });
        notify.success('فرم راه‌اندازی اولیه فعال شد.');
      },
    });
  };

  const handleResetData = () => {
    setResetConfirmInput('');
    setIsResetModalOpen(true);
  };

  const handleExecuteResetData = async () => {
    if (resetConfirmInput.trim() !== 'حذف کامل') return;
    try {
      setIsResetting(true);
      await db.transaction('rw', [db.ingredients, db.menuItems, db.dailySales, db.wasteLogs, db.settings], async () => {
        await db.ingredients.clear();
        await db.menuItems.clear();
        await db.dailySales.clear();
        await db.wasteLogs.clear();
        await db.settings.clear();
        await db.settings.put({
          ...DEFAULT_SETTINGS,
          id: 'config',
          isSetupCompleted: false,
        });
      });
      notify.success('بانک اطلاعاتی پاک‌سازی شد و فرم راه‌اندازی اولیه فعال گردید.');
      setIsResetModalOpen(false);
      setResetConfirmInput('');
    } catch (err) {
      console.error('Reset database error:', err);
      notify.error('خطا در پاک‌سازی بانک اطلاعاتی');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header & Quick Action Bar */}
      <div className="bg-white dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] rounded-3xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] dark:bg-[var(--brand-primary)]/20 shrink-0">
            <Settings className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
              تنظیمات سیستم و مدیریت داده‌ها
            </h2>
            <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-medium mt-0.5">
              پیکربندی مشخصات مجموعه، محاسبات مالی ماهانه، آستانه‌های انبار و نسخه پشتیبان
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="primary"
          onClick={() => handleSaveSettings()}
          isLoading={isSaving}
          className="h-10 px-5 rounded-2xl shadow-sm text-xs font-black self-start sm:self-auto cursor-pointer"
        >
          <Save className="h-4 w-4 ml-1.5" />
          ذخیره تغییرات تنظیمات
        </Button>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="bg-[var(--bg-base)] dark:bg-[var(--bg-card)] p-1.5 rounded-2xl border border-[var(--border-subtle)] dark:border-[var(--border-functional)] flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-white dark:bg-[var(--bg-card)] text-[var(--brand-primary)] shadow-2xs font-black'
              : 'text-[var(--text-secondary)] dark:text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Building className="h-4 w-4" />
          <span>هویت و مشخصات مجموعه</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('financials')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'financials'
              ? 'bg-white dark:bg-[var(--bg-card)] text-[var(--brand-primary)] shadow-2xs font-black'
              : 'text-[var(--text-secondary)] dark:text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <DollarSign className="h-4 w-4" />
          <span>پارامترهای مالی و هزینه‌ها</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('thresholds')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'thresholds'
              ? 'bg-white dark:bg-[var(--bg-card)] text-[var(--brand-primary)] shadow-2xs font-black'
              : 'text-[var(--text-secondary)] dark:text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Sliders className="h-4 w-4" />
          <span>آستانه‌ها و هشدارهای انبار</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('data')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'data'
              ? 'bg-white dark:bg-[var(--bg-card)] text-[var(--brand-primary)] shadow-2xs font-black'
              : 'text-[var(--text-secondary)] dark:text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Database className="h-4 w-4" />
          <span>پشتیبان‌گیری و ذخیره اطلاعات</span>
        </button>
      </div>

      {/* TAB 1: RESTAURANT PROFILE & IDENTITY */}
      {activeTab === 'profile' && (
        <Card className="border border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
          <CardHeader className="border-b border-[var(--border-subtle)]/60 dark:border-[var(--border-subtle)] pb-4">
            <CardTitle className="text-sm font-extrabold text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
              <Building className="h-4 w-4 text-[var(--brand-primary)]" />
              پروفایل و هویت کسب‌وکار
            </CardTitle>
            <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-medium mt-0.5">
              اطلاعات عمومی رستوران یا کافه شما در تمامی گزارش‌ها و فاکتورها درج می‌شود.
            </p>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-[var(--text-secondary)] mb-1">
                  نام مجموعه / رستوران *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    placeholder="مثلاً: کافه رستوران ارکیده"
                    className="w-full rounded-xl border border-slate-200/80 dark:border-[var(--border-subtle)] bg-slate-50/50 dark:bg-[var(--bg-card)] hover:bg-white hover:bg-[var(--bg-base)] focus:bg-white dark:focus:bg-stone-900 px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-[var(--text-primary)] placeholder:text-slate-400 dark:placeholder:text-[var(--text-secondary)] focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-all"
                  />
                </div>
              </div>

              <div>
                <SearchableSelect
                  label="نوع فعالیت کسب‌وکار"
                  value={businessType}
                  onChange={(val) => setBusinessType(val as string)}
                  options={BUSINESS_TYPES.map((type) => ({
                    value: type,
                    label: type,
                  }))}
                  enableSearch={false}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-[var(--text-secondary)] mb-1">
                  شماره تماس پشتیبانی یا سفارشات
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-[var(--text-secondary)]" />
                  <input
                    type="text"
                    value={toPersianDigits(contactPhone)}
                    onChange={(e) => setContactPhone(toPersianDigits(e.target.value))}
                    placeholder="مثلاً: ۰۲۱-۸۸۸۸۸۸۸۸"
                    className="w-full rounded-xl border border-slate-200/80 dark:border-[var(--border-subtle)] bg-slate-50/50 dark:bg-[var(--bg-card)] hover:bg-white hover:bg-[var(--bg-base)] focus:bg-white dark:focus:bg-stone-900 px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-[var(--text-primary)] placeholder:text-slate-400 dark:placeholder:text-[var(--text-secondary)] focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-[var(--text-secondary)] mb-1">
                  آدرس فیزیکی یا شعبه
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-[var(--text-secondary)]" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="مثلاً: تهران، خیابان ولیعصر، پلاک ۱۲"
                    className="w-full rounded-xl border border-slate-200/80 dark:border-[var(--border-subtle)] bg-slate-50/50 dark:bg-[var(--bg-card)] hover:bg-white hover:bg-[var(--bg-base)] focus:bg-white dark:focus:bg-stone-900 px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-[var(--text-primary)] placeholder:text-slate-400 dark:placeholder:text-[var(--text-secondary)] focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-all"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 2: FINANCIALS & FIXED OVERHEAD */}
      {activeTab === 'financials' && (
        <div className="space-y-6">
          {/* Operating Parameters */}
          <Card className="border border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
            <CardHeader className="border-b border-[var(--border-subtle)]/60 dark:border-[var(--border-subtle)] pb-4">
              <CardTitle className="text-sm font-extrabold text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
                <Clock className="h-4 w-4 text-[var(--brand-primary)]" />
                زمان‌بندی کاری و اهداف مالی
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-[var(--text-secondary)] mb-1">
                    روزهای کاری ماه
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={workingDays === '' ? '' : toPersianDigits(workingDays)}
                    onChange={(e) => {
                      const eng = toEnglishDigits(e.target.value);
                      if (eng === '') setWorkingDays('');
                      else {
                        const num = Number(eng);
                        if (!isNaN(num)) setWorkingDays(num);
                      }
                    }}
                    placeholder="مثلاً: ۲۶"
                    className="w-full rounded-xl border border-slate-200/80 dark:border-[var(--border-subtle)] bg-slate-50/50 dark:bg-[var(--bg-card)] hover:bg-white hover:bg-[var(--bg-base)] focus:bg-white dark:focus:bg-stone-900 px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-[var(--text-primary)] placeholder:text-slate-400 dark:placeholder:text-[var(--text-secondary)] text-right dir-rtl focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-[var(--text-secondary)] mb-1">
                    ساعات کاری روزانه
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={dailyWorkHours === '' ? '' : toPersianDigits(dailyWorkHours)}
                    onChange={(e) => {
                      const eng = toEnglishDigits(e.target.value);
                      if (eng === '') setDailyWorkHours('');
                      else {
                        const num = Number(eng);
                        if (!isNaN(num)) setDailyWorkHours(num);
                      }
                    }}
                    placeholder="مثلاً: ۸"
                    className="w-full rounded-xl border border-slate-200/80 dark:border-[var(--border-subtle)] bg-slate-50/50 dark:bg-[var(--bg-card)] hover:bg-white hover:bg-[var(--bg-base)] focus:bg-white dark:focus:bg-stone-900 px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-[var(--text-primary)] placeholder:text-slate-400 dark:placeholder:text-[var(--text-secondary)] text-right dir-rtl focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-[var(--text-secondary)] mb-1">
                    درصد فودکاست هدف (٪)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={targetFoodCostPercent === '' ? '' : toPersianDigits(targetFoodCostPercent)}
                    onChange={(e) => {
                      const val = e.target.value;
                      const eng = toEnglishDigits(val).replace(',', '.').replace('/', '.');
                      if (eng === '') setTargetFoodCostPercent('');
                      else if (/^\d*\.?\d*$/.test(eng)) setTargetFoodCostPercent(val);
                    }}
                    placeholder="مثلاً: ۳۵"
                    className="w-full rounded-xl border border-slate-200/80 dark:border-[var(--border-subtle)] bg-slate-50/50 dark:bg-[var(--bg-card)] hover:bg-white hover:bg-[var(--bg-base)] focus:bg-white dark:focus:bg-stone-900 px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-[var(--text-primary)] placeholder:text-slate-400 dark:placeholder:text-[var(--text-secondary)] text-right dir-rtl focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-[var(--text-secondary)] mb-1">
                    درصد مالیات / ارزش افزوده‌ (٪)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={taxPercent === '' ? '' : toPersianDigits(taxPercent)}
                    onChange={(e) => {
                      const val = e.target.value;
                      const eng = toEnglishDigits(val).replace(',', '.').replace('/', '.');
                      if (eng === '') setTaxPercent('');
                      else if (/^\d*\.?\d*$/.test(eng)) setTaxPercent(val);
                    }}
                    placeholder="مثلاً: ۹"
                    className="w-full rounded-xl border border-slate-200/80 dark:border-[var(--border-subtle)] bg-slate-50/50 dark:bg-[var(--bg-card)] hover:bg-white hover:bg-[var(--bg-base)] focus:bg-white dark:focus:bg-stone-900 px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-[var(--text-primary)] placeholder:text-slate-400 dark:placeholder:text-[var(--text-secondary)] text-right dir-rtl focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-all"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Fixed Overhead Costs */}
          <Card className="border border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
            <CardHeader className="border-b border-[var(--border-subtle)]/60 dark:border-[var(--border-subtle)] pb-4">
              <CardTitle className="text-sm font-extrabold text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-[var(--brand-primary)]" />
                ریز هزینه‌های ثابت و عمومی ماهانه
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <SmartMoneyInput
                  label="اجاره‌بهای ماهانه"
                  value={fixedCosts.rent}
                  onChange={(val) => setFixedCosts({ ...fixedCosts, rent: val })}
                  placeholder="مثلاً: ۴۵,۰۰۰,۰۰۰"
                />

                <SmartMoneyInput
                  label="قبوض و انرژی (آب، برق، گاز)"
                  value={fixedCosts.utilities}
                  onChange={(val) => setFixedCosts({ ...fixedCosts, utilities: val })}
                  placeholder="مثلاً: ۵,۰۰۰,۰۰۰"
                />

                <SmartMoneyInput
                  label="حقوق و دستمزد پرسنل"
                  value={fixedCosts.salaries}
                  onChange={(val) => setFixedCosts({ ...fixedCosts, salaries: val })}
                  placeholder="مثلاً: ۶۰,۰۰۰,۰۰۰"
                />

                <SmartMoneyInput
                  label="تبلیغات و بازاریابی"
                  value={fixedCosts.marketing}
                  onChange={(val) => setFixedCosts({ ...fixedCosts, marketing: val })}
                  placeholder="مثلاً: ۸,۰۰۰,۰۰۰"
                />

                <SmartMoneyInput
                  label="بیمه و عوارض قانونی"
                  value={fixedCosts.insurance}
                  onChange={(val) => setFixedCosts({ ...fixedCosts, insurance: val })}
                  placeholder="مثلاً: ۴,۰۰۰,۰۰۰"
                />

                <SmartMoneyInput
                  label="استهلاک و نگهداری تجهیزات"
                  value={fixedCosts.maintenance}
                  onChange={(val) => setFixedCosts({ ...fixedCosts, maintenance: val })}
                  placeholder="مثلاً: ۳,۵۰۰,۰۰۰"
                />

                <SmartMoneyInput
                  label="هزینه پیک و حمل و نقل"
                  value={fixedCosts.delivery}
                  onChange={(val) => setFixedCosts({ ...fixedCosts, delivery: val })}
                  placeholder="مثلاً: ۲,۰۰۰,۰۰۰"
                />

                <SmartMoneyInput
                  label="سایر هزینه‌های عمومی"
                  value={fixedCosts.general}
                  onChange={(val) => setFixedCosts({ ...fixedCosts, general: val })}
                  placeholder="مثلاً: ۳,۰۰۰,۰۰۰"
                />
              </div>

              {/* Dynamic Overhead KPI Summary Banner */}
              <div className="rounded-2xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] p-4.5 grid grid-cols-1 sm:grid-cols-3 gap-4 shadow-2xs transition-colors">
                <div className="text-right">
                  <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-extrabold text-[11px] block">جمع کل سربار ماهانه:</span>
                  <span className="text-lg font-black text-[var(--status-success-text)] dark:text-[var(--status-success-text)] mt-0.5 block">
                    {formatToman(totalMonthlyOverhead).text}
                  </span>
                </div>

                <div className="text-right sm:text-center border-t sm:border-t-0 sm:border-r sm:border-l border-[var(--border-subtle)] dark:border-[var(--border-subtle)] pt-3 sm:pt-0">
                  <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-extrabold text-[11px] block">سربار محاسبه شده هر روز کاری:</span>
                  <span className="text-lg font-black text-[var(--brand-primary)] dark:text-[var(--status-warning-text)] mt-0.5 block">
                    {formatToman(dailyOverhead).text}
                  </span>
                </div>

                <div className="text-right sm:text-left dir-rtl sm:dir-ltr border-t sm:border-t-0 border-[var(--border-subtle)] dark:border-[var(--border-subtle)] pt-3 sm:pt-0">
                  <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-extrabold text-[11px] block">سربار هر ساعت کاری فعال:</span>
                  <span className="text-lg font-black text-sky-600 dark:text-sky-400 mt-0.5 block">
                    {formatToman(hourlyOverhead).text}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: THRESHOLDS & ALERTS */}
      {activeTab === 'thresholds' && (
        <Card className="border border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
          <CardHeader className="border-b border-[var(--border-subtle)]/60 dark:border-[var(--border-subtle)] pb-4">
            <CardTitle className="text-sm font-extrabold text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
              <Sliders className="h-4 w-4 text-[var(--brand-primary)]" />
              تنظیمات هشدارهای هوشمند و انبار
            </CardTitle>
            <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-medium mt-0.5">
              مقادیر پیش‌فرض جهت نمایش هشدارهای کمبود موجودی، درصد ضایعات رسپی‌ها و نقطه خط قرمز فودکاست
            </p>
          </CardHeader>
          <CardContent className="pt-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-[var(--text-secondary)] mb-1">
                  حد کمبود موجودی انبار پیش‌فرض
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={defaultLowStockThreshold === '' ? '' : toPersianDigits(defaultLowStockThreshold)}
                  onChange={(e) => {
                    const val = e.target.value;
                    const eng = toEnglishDigits(val).replace(',', '.').replace('/', '.');
                    if (eng === '') setDefaultLowStockThreshold('');
                    else if (/^\d*\.?\d*$/.test(eng)) setDefaultLowStockThreshold(val);
                  }}
                  placeholder="مثلاً: ۵"
                  className="w-full rounded-xl border border-slate-200/80 dark:border-[var(--border-subtle)] bg-slate-50/50 dark:bg-[var(--bg-card)] hover:bg-white hover:bg-[var(--bg-base)] focus:bg-white dark:focus:bg-stone-900 px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-[var(--text-primary)] placeholder:text-slate-400 dark:placeholder:text-[var(--text-secondary)] text-right dir-rtl focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-all"
                />
                <span className="text-[10px] text-[var(--text-secondary)] font-medium mt-1 block">
                  مبنای هشدار اولیه در صورت ثبت ماده جدید در انبار
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-[var(--text-secondary)] mb-1">
                  درصد ضایعات پیش‌فرض رسپی جدید (٪)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={defaultRecipeWastePercent === '' ? '' : toPersianDigits(defaultRecipeWastePercent)}
                  onChange={(e) => {
                    const val = e.target.value;
                    const eng = toEnglishDigits(val).replace(',', '.').replace('/', '.');
                    if (eng === '') setDefaultRecipeWastePercent('');
                    else if (/^\d*\.?\d*$/.test(eng)) setDefaultRecipeWastePercent(val);
                  }}
                  placeholder="مثلاً: ۳"
                  className="w-full rounded-xl border border-slate-200/80 dark:border-[var(--border-subtle)] bg-slate-50/50 dark:bg-[var(--bg-card)] hover:bg-white hover:bg-[var(--bg-base)] focus:bg-white dark:focus:bg-stone-900 px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-[var(--text-primary)] placeholder:text-slate-400 dark:placeholder:text-[var(--text-secondary)] text-right dir-rtl focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-all"
                />
                <span className="text-[10px] text-[var(--text-secondary)] font-medium mt-1 block">
                  میزان پرتی و ضایعات تخمینی هنگام ایجاد غذاهای جدید
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-[var(--text-secondary)] mb-1">
                  آستانه قرمز فودکاست بالای منو (٪)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={highFoodCostThreshold === '' ? '' : toPersianDigits(highFoodCostThreshold)}
                  onChange={(e) => {
                    const val = e.target.value;
                    const eng = toEnglishDigits(val).replace(',', '.').replace('/', '.');
                    if (eng === '') setHighFoodCostThreshold('');
                    else if (/^\d*\.?\d*$/.test(eng)) setHighFoodCostThreshold(val);
                  }}
                  placeholder="مثلاً: ۴۰"
                  className="w-full rounded-xl border border-slate-200/80 dark:border-[var(--border-subtle)] bg-slate-50/50 dark:bg-[var(--bg-card)] hover:bg-white hover:bg-[var(--bg-base)] focus:bg-white dark:focus:bg-stone-900 px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-[var(--text-primary)] placeholder:text-slate-400 dark:placeholder:text-[var(--text-secondary)] text-right dir-rtl focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-all"
                />
                <span className="text-[10px] text-[var(--text-secondary)] font-medium mt-1 block">
                  غذاهایی که فودکاست آن‌ها بالاتر از این مقدار باشد، علامت هشدار دریافت می‌کنند
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-[var(--status-warning-text)] shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <span className="font-extrabold text-[var(--text-primary)] dark:text-[var(--text-primary)] block">
                  نحوه محاسبه خودکار و تاثیر بر منو:
                </span>
                <p className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)] leading-relaxed font-medium">
                  با تغییر این پارامترها و کلیک بر روی «ذخیره تغییرات»، قیمت تمام‌شده، فودکاست هدف و ماتریس سودآوری تمام محصولات منو بلافاصله همگام‌سازی و بازمحاسبه می‌شوند.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 4: DATA BACKUP, REPORTS & DATABASE */}
      {activeTab === 'data' && (
        <div className="space-y-4">
          {/* PDF Official Report Card */}
          <Card className="border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] bg-white dark:bg-[var(--bg-card)] overflow-hidden">
            <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] shrink-0">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                    گزارش رسمی و خروجی صورت سود و زیان (پی‌دی‌اف)
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-medium mt-0.5">
                    پیش‌نمایش و تولید فایل سند رسمی جهت ارائه به شرکا یا بایگانی مالی
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="primary"
                onClick={() => setIsExportPdfOpen(true)}
                className="h-10 px-4 rounded-xl text-xs font-black bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white shadow-sm shrink-0 cursor-pointer transition-colors"
              >
                <Printer className="h-4 w-4 ml-1.5" />
                دانلود / چاپ گزارش رسمی
              </Button>
            </CardContent>
          </Card>

          {/* Backup & Restore Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Export Backup */}
            <Card className="border border-[var(--border-subtle)] bg-[var(--bg-card)]">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[var(--status-success-bg)] text-[var(--status-success-text)] shrink-0">
                    <Download className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-[var(--text-primary)]">
                      پشتیبان‌گیری از داده‌ها
                    </h4>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      ذخیره آفلاین تمام داده‌های انبار، فاکتورها و تنظیمات
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExportJSON}
                  isLoading={isExporting}
                  className="h-9 px-3 text-xs font-bold rounded-xl shrink-0 cursor-pointer border-[var(--border-functional)]"
                >
                  دانلود فایل پشتیبان
                </Button>
              </CardContent>
            </Card>

            {/* Restore Backup */}
            <Card className="border border-[var(--border-subtle)] bg-[var(--bg-card)]">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] shrink-0">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-[var(--text-primary)]">
                      بازیابی فایل پشتیبان
                    </h4>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      بارگذاری اطلاعات قبلی از فایل ذخیره‌شده
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  isLoading={isImporting}
                  className="h-9 px-3 text-xs font-bold rounded-xl shrink-0 cursor-pointer border-[var(--border-functional)]"
                >
                  انتخاب فایل
                </Button>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportJSON}
                  accept=".json"
                  className="hidden"
                />
              </CardContent>
            </Card>
          </div>

          {/* Reset & Advanced Operations Section */}
          <div className="border border-[var(--border-subtle)] bg-[var(--bg-card)] rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-[var(--border-subtle)]">
              <RotateCcw className="h-5 w-5 text-[var(--brand-primary)] shrink-0" />
              <div>
                <h3 className="text-sm font-black text-[var(--text-primary)]">
                  مدیریت داده‌ها و بازنشانی سیستم
                </h3>
                <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">
                  گزینه‌های بارگذاری داده‌های نمونه، اجرای مجدد فرم راه‌اندازی یا پاک‌سازی اطلاعات
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Card 1: Load Demo Data */}
              <Card className="border border-[var(--border-subtle)] bg-[var(--bg-base)]">
                <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] shrink-0">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-[var(--text-primary)]">
                        بارگذاری اطلاعات نمونه آزمایشی
                      </h4>
                      <p className="text-[11px] text-[var(--text-secondary)] font-medium mt-0.5">
                        داده‌های فعلی شما با یک نمونه آزمایشی کامل جایگزین می‌شود — مناسب برای تست سیستم
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleLoadDemoData}
                    isLoading={isSeeding}
                    className="h-9 px-4 text-xs font-bold rounded-xl border-[var(--border-functional)] text-[var(--text-primary)] hover:bg-[var(--bg-card)] shrink-0 cursor-pointer w-full sm:w-auto"
                  >
                    بارگذاری نمونه آزمایشی
                  </Button>
                </CardContent>
              </Card>

              {/* Card 2: Re-run Onboarding Wizard */}
              <Card className="border border-[var(--border-subtle)] bg-[var(--bg-base)]">
                <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] shrink-0">
                      <RotateCcw className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-[var(--text-primary)]">
                        اجرای مجدد فرم راه‌اندازی اولیه
                      </h4>
                      <p className="text-[11px] text-[var(--text-secondary)] font-medium mt-0.5">
                        فعال‌سازی دوباره فرم راه‌اندازی اولیه — تکمیل مجدد آن داده‌های انبار، منو و فروش را بازنشانی می‌کند
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReRunWizard}
                    className="h-9 px-4 text-xs font-bold rounded-xl border-[var(--border-functional)] text-[var(--text-primary)] hover:bg-[var(--bg-card)] shrink-0 cursor-pointer w-full sm:w-auto"
                  >
                    فرم راه‌اندازی اولیه
                  </Button>
                </CardContent>
              </Card>

              {/* Card 3: Full Reset Database */}
              <Card className="border border-[var(--status-error-bg)] bg-[var(--bg-base)]">
                <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-[var(--status-error-bg)] text-[var(--status-error-text)] shrink-0">
                      <Trash2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-[var(--text-primary)]">
                        حذف کامل بانک اطلاعاتی و پاک‌سازی داده‌ها
                      </h4>
                      <p className="text-[11px] text-[var(--text-secondary)] font-medium mt-0.5">
                        حذف غیرقابل‌بازگشت کلیه اطلاعات انبار، منو، فاکتورهای فروش روزانه، ضایعات و تنظیمات
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="danger"
                    onClick={handleResetData}
                    className="h-9 px-4 text-xs font-bold rounded-xl bg-[var(--status-error-text)] hover:opacity-90 text-white shrink-0 cursor-pointer w-full sm:w-auto"
                  >
                    حذف کامل بانک اطلاعاتی
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Official PnL Report Export Modal */}
      {(() => {
        const todayJ = getJalaliDate(new Date());
        const currentMonthName = PERSIAN_MONTH_NAMES[todayJ.jm - 1];
        const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
        const startIso = `${todayJ.jy}-${pad(todayJ.jm)}-01`;
        const todayIso = `${todayJ.jy}-${pad(todayJ.jm)}-${pad(todayJ.jd)}`;

        const monthSales = salesRecords.filter((s) => s.date >= startIso && s.date <= todayIso);
        const monthWaste = wasteLogs.filter((w) => w.date >= startIso && w.date <= todayIso);

        const totalDaysInM = getDaysInJalaliMonth(todayJ.jy, todayJ.jm);
        const numDaysPassed = Math.max(1, todayJ.jd);

        const totalRev = monthSales.reduce((acc, s) => acc + (s.totalRevenue || 0), 0);
        const totalCogs = monthSales.reduce((acc, s) => acc + (s.totalCOGS || 0), 0);
        const totalWasteAmt = monthWaste.reduce((acc, w) => acc + (w.cost || 0), 0);

        const fixedCostsTotal =
          (settings.monthlyFixedCosts?.rent || 0) +
          (settings.monthlyFixedCosts?.utilities || 0) +
          (settings.monthlyFixedCosts?.salaries || 0) +
          (settings.monthlyFixedCosts?.marketing || 0) +
          (settings.monthlyFixedCosts?.insurance || 0) +
          (settings.monthlyFixedCosts?.general || 0) +
          (settings.monthlyFixedCosts?.maintenance || 0) +
          (settings.monthlyFixedCosts?.delivery || 0);

        const dailyOverheadCost = roundCurrency(fixedCostsTotal / Math.max(1, settings.workingDaysPerMonth || 26));
        const periodOverhead = dailyOverheadCost * numDaysPassed;

        const grossProfit = totalRev - totalCogs;
        const netProfit = grossProfit - totalWasteAmt - periodOverhead;
        const foodCostPercent = totalRev > 0 ? roundCurrency((totalCogs / totalRev) * 100) : 0;
        const netMarginPercent = totalRev > 0 ? roundCurrency((netProfit / totalRev) * 100) : 0;

        const itemMap = new Map<number, { menuItemId: number; name: string; totalQty: number; totalRev: number; totalCost: number }>();
        monthSales.forEach((s) => {
          (s.items || []).forEach((item) => {
            const existing = itemMap.get(item.menuItemId) || {
              menuItemId: item.menuItemId,
              name: item.menuItemName,
              totalQty: 0,
              totalRev: 0,
              totalCost: 0,
            };
            existing.totalQty += item.quantity || 0;
            existing.totalRev += item.totalRevenue || (item.unitSellingPrice || 0) * (item.quantity || 0);
            existing.totalCost += item.totalCost || (item.unitCost || 0) * (item.quantity || 0);
            itemMap.set(item.menuItemId, existing);
          });
        });

        const topSoldItemsList = Array.from(itemMap.values())
          .sort((a, b) => b.totalRev - a.totalRev)
          .slice(0, 5);

        return (
          <PnLReportExportModal
            isOpen={isExportPdfOpen}
            onClose={() => setIsExportPdfOpen(false)}
            filterTitle={`ماه جاری - ${currentMonthName} ${toPersianDigits(todayJ.jy)}`}
            filterSubtitle={`از اول ${currentMonthName} تا امروز - روز ${toPersianDigits(todayJ.jd)}`}
            filteredSalesRecords={monthSales}
            filteredWasteLogs={monthWaste}
            metrics={{
              totalRevenue: totalRev,
              totalCOGS: totalCogs,
              loggedWaste: totalWasteAmt,
              salesWaste: 0,
              totalWaste: totalWasteAmt,
              periodOverhead,
              grossProfit,
              netProfit,
              foodCostPercent,
              netMarginPercent,
              periodDaysCount: numDaysPassed,
            }}
            topSoldItems={topSoldItemsList}
            settings={settings}
          />
        );
      })()}

      {/* Reset Confirmation Modal */}
      {isResetModalOpen && (
        <div dir="rtl" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-md font-['Vazirmatn',sans-serif]">
          <div className="w-full max-w-md bg-white dark:bg-[var(--bg-card)] border border-[var(--status-error-text)]/30 dark:border-[var(--status-error-text)]/30 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            {/* Top Close Button & Badge Tag */}
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-[var(--status-error-bg)]/80 text-[var(--status-error-text)] dark:text-rose-300 border border-[var(--status-error-text)]/30 dark:border-[var(--status-error-text)]/30">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>پاک‌سازی غیرقابل بازگشت</span>
              </span>
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                aria-label="بستن پنجره"
                className="text-[var(--text-secondary)] hover:text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 rounded-2xl hover:bg-[var(--bg-base)] hover:bg-[var(--bg-base)] transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Header Title & Icon */}
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-2xl bg-[var(--status-error-bg)]/80 border border-[var(--status-error-text)]/30 dark:border-[var(--status-error-text)]/30 text-[var(--status-error-text)] dark:text-[var(--status-error-text)] shrink-0 shadow-xs">
                <Trash2 className="h-6 w-6" />
              </div>
              <div className="space-y-1 flex-1 pt-0.5">
                <h3 className="text-base font-black text-rose-950 dark:text-rose-200 leading-snug">
                  حذف کامل بانک اطلاعاتی
                </h3>
              </div>
            </div>

            {/* Warning Callout Box */}
            <div className="p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border border-[var(--status-error-text)]/30 dark:border-[var(--status-error-text)]/30 text-rose-950 dark:text-rose-200 text-xs font-bold leading-relaxed">
              ⚠️ توجه بسیار مهم: تمام داده‌های انبار، منو، فاکتورهای فروش روزانه، گزارش‌های ضایعات و تنظیمات سیستم به صورت کاملاً غیرقابل بازگشت پاک خواهند شد.
            </div>

            {/* Confirmation Input Box */}
            <div className="space-y-2 bg-[var(--bg-base)] dark:bg-[var(--bg-card)] p-3.5 rounded-2xl border border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
              <label className="block text-xs font-black text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                جهت تایید نهایی، عبارت <span className="underline select-all font-mono font-black text-[var(--status-error-text)] dark:text-[var(--status-error-text)]">حذف کامل</span> را در کادر زیر وارد کنید:
              </label>
              <input
                type="text"
                value={resetConfirmInput}
                onChange={(e) => setResetConfirmInput(e.target.value)}
                placeholder="حذف کامل"
                className="w-full h-11 rounded-xl border border-[var(--status-error-text)]/30 dark:border-[var(--status-error-text)] bg-white dark:bg-[var(--bg-card)] px-3.5 text-xs font-black text-[var(--text-primary)] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500 text-center tracking-wide"
              />
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsResetModalOpen(false)}
                disabled={isResetting}
                className="h-10 px-4 text-xs font-bold border-[var(--border-subtle)] dark:border-[var(--border-functional)] text-[var(--text-primary)] dark:text-[var(--text-secondary)] rounded-xl hover:bg-[var(--bg-base)] hover:bg-[var(--bg-base)] cursor-pointer"
              >
                انصراف
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleExecuteResetData}
                disabled={resetConfirmInput.trim() !== 'حذف کامل'}
                isLoading={isResetting}
                className="h-10 px-5 text-xs font-black rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
                <span>حذف و پاک‌سازی کامل</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
