import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Award,
  Flame,
  HelpCircle,
  ShieldAlert,
  Search,
  Grid,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Sparkles,
  ArrowUpRight,
  Info,
  Calculator,
  PieChart,
  Table as TableIcon,
  Target,
  Lightbulb,
  CheckCircle2,
  Eye,
  BarChart3,
  ArrowRight,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import type { MenuItem, DailySalesRecord } from '../../types';
import { formatToman, formatNumber, roundCurrency, toPersianDigits } from '../../lib/utils';
import { isDateInPresetFilter } from '../../lib/financial';
import { tablePageVariants, tableRowVariants } from '../../lib/motion';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Pagination } from '../ui/Pagination';
import { Card } from '../ui/Card';

interface MenuEngineeringMatrixProps {
  menuItems: MenuItem[];
  salesRecords: DailySalesRecord[];
  onOpenEditItem?: (item: MenuItem) => void;
}

export type MatrixCategory = 'star' | 'workhorse' | 'puzzle' | 'underperformer';

export interface QuadrantConfig {
  key: MatrixCategory;
  title: string;
  englishTitle: string;
  subTitle: string;
  icon: React.ComponentType<{ className?: string }>;
  headerBg: string;
  iconBg: string;
  iconColor: string;
  borderColor: string;
  badgeVariant: 'star' | 'workhorse' | 'puzzle' | 'underperformer';
  actionTag: string;
  actionTagStyle: string;
  strategy: string;
  detailedSteps: string[];
}

export const QUADRANT_CONFIGS: Record<MatrixCategory, QuadrantConfig> = {
  star: {
    key: 'star',
    title: 'محصولات طلایی',
    englishTitle: 'محصولات طلایی',
    subTitle: 'سود ناخالص بالا + محبوبیت و فروش بالا',
    icon: Award,
    headerBg: 'bg-[var(--status-warning-bg)]',
    iconBg: 'bg-amber-500/10 dark:bg-amber-500/20',
    iconColor: 'text-[var(--status-warning-text)] dark:text-[var(--status-warning-text)]',
    borderColor: 'border-[var(--status-warning-text)]/30 dark:border-[var(--status-warning-text)]',
    badgeVariant: 'star',
    actionTag: 'حفظ کیفیت و رتبه اول',
    actionTagStyle: 'bg-amber-100 text-[var(--status-warning-text)] dark:bg-amber-900/50 dark:text-[var(--status-warning-text)] border-[var(--status-warning-text)]/30',
    strategy: 'محصولات پرچمدار و ستون اصلی سودآوری مجموعه شما هستند.',
    detailedSteps: [
      'کیفیت رسپی و ثبات طعم و پورسیاژ را کاملاً حفظ کنید.',
      'این آیتم‌ها را در برجسته‌ترین موقعیت بصری منو (گوشه بالا-راست یا مرکز) قرار دهید.',
      'از تغییر تامین‌کنندگان اصلی مواد اولیه این محصولات بدون تست دقیق خودداری کنید.',
      'با پروموت این محصولات، تجربه مثبت مشتریان را تضمین نمایید.',
    ],
  },
  workhorse: {
    key: 'workhorse',
    title: 'پرفروش‌های محبوب',
    englishTitle: 'پرفروش‌های محبوب',
    subTitle: 'فروش و محبوبیت بالا + سود ناخالص متوسط یا پایین',
    icon: Flame,
    headerBg: 'bg-blue-50 dark:bg-blue-950/30',
    iconBg: 'bg-blue-500/10 dark:bg-blue-500/20',
    iconColor: 'text-[var(--status-info-text)] dark:text-[var(--status-info-text)]',
    borderColor: 'border-[var(--status-info-text)]/30 dark:border-[var(--status-info-text)]',
    badgeVariant: 'workhorse',
    actionTag: 'بهینه‌سازی فودکاست یا تعدیل قیمت',
    actionTagStyle: 'bg-blue-100 text-[var(--status-info-text)] dark:bg-blue-900/50 dark:text-blue-300 border-[var(--status-info-text)]/30',
    strategy: 'بسیار محبوب در میان مشتریان، اما حاشیه سود آن‌ها کمتر از میانگین منو است.',
    detailedSteps: [
      'قیمت فروش را بین ۵٪ تا ۱۰٪ به صورت غیرمحسوس افزایش دهید.',
      'حجم یا وزن پورسیون مواد اولیه گران‌قیمت را اندکی بهینه‌سازی کنید.',
      'با تامین‌کنندگان برای دریافت تخفیف خرید عمده مذاکره کنید.',
      'این آیتم را با نوشیدنی یا پیش‌غذای پر‌سود به صورت پکیج ترکیبی ارائه دهید.',
    ],
  },
  puzzle: {
    key: 'puzzle',
    title: 'فرصت‌های رشد',
    englishTitle: 'فرصت‌های رشد',
    subTitle: 'سود ناخالص فوق‌العاده + حجم فروش پایین',
    icon: HelpCircle,
    headerBg: 'bg-purple-50 dark:bg-purple-950/30',
    iconBg: 'bg-purple-500/10 dark:bg-purple-500/20',
    iconColor: 'text-[var(--status-purple-text)] dark:text-[var(--status-purple-text)]',
    borderColor: 'border-[var(--status-purple-text)]/30 dark:border-[var(--status-purple-text)]',
    badgeVariant: 'puzzle',
    actionTag: 'بازاریابی و پیشنهاد ویژه گارسون',
    actionTagStyle: 'bg-purple-100 text-[var(--status-purple-text)] dark:bg-purple-900/50 dark:text-purple-300 border-[var(--status-purple-text)]/30',
    strategy: 'هر پرس آن سود فوق‌العاده‌ای دارد، اما تعداد فروش آن هنوز پایین است.',
    detailedSteps: [
      'نام، عکس و توضیحات محصول در منو را جذاب‌تر و اشتهاآورتر بازنویسی کنید.',
      'به سالن‌کاران و گارسون‌ها پاداش سفارش‌گیری تشویقی برای پیشنهاد این غذا بدهید.',
      'موقعیت قرارگیری آن در منو را به بخش‌های پردید منتقل کنید.',
      'تست رایگان یا نمونه چشیدنی به مشتریان وفادار ارائه دهید.',
    ],
  },
  underperformer: {
    key: 'underperformer',
    title: 'نیازمند بهینه‌سازی',
    englishTitle: 'نیازمند بهینه‌سازی',
    subTitle: 'سود ناخالص پایین + محبوبیت و فروش پایین',
    icon: ShieldAlert,
    headerBg: 'bg-[var(--status-error-bg)]',
    iconBg: 'bg-rose-500/10 dark:bg-rose-500/20',
    iconColor: 'text-[var(--status-error-text)] dark:text-[var(--status-error-text)]',
    borderColor: 'border-[var(--status-error-text)]/30 dark:border-[var(--status-error-text)]',
    badgeVariant: 'underperformer',
    actionTag: 'اصلاح رسپی یا جایگزینی در منو',
    actionTagStyle: 'bg-rose-100 text-[var(--status-error-text)] dark:bg-rose-900/50 dark:text-rose-300 border-[var(--status-error-text)]/30',
    strategy: 'نه سود مناسبی ایجاد می‌کنند و نه طرفدار زیادی دارند؛ منبع ضایعات انبار.',
    detailedSteps: [
      'رسپی محصول را به کلی بازطراحی کنید تا فودکاست آن کاهش یابد.',
      'قیمت را افزایش دهید تا حداقل در صورت فروش کم، سود مناسبی بسازد.',
      'در صورت عدم بهبود پس از ۲ هفته، محصول را از منو حذف کنید تا سرمایه انبار آزاد شود.',
      'مواد اولیه اختصاصی این غذا را با سایر غذاهای پرفروش جایگزین یا مشترک کنید.',
    ],
  },
};

const MENU_CATEGORIES: string[] = [
  'همه',
  'غذای اصلی',
  'پیش غذا',
  'نوشیدنی',
  'دسر و شیرینی',
  'کافه و گرم',
  'مخلفات',
  'سایر',
];

type MainViewMode = 'table' | 'matrix' | 'scatter' | 'strategy';

const ITEMS_PER_PAGE = 6;

export const MenuEngineeringMatrix: React.FC<MenuEngineeringMatrixProps> = ({
  menuItems,
  salesRecords,
  onOpenEditItem,
}) => {
  const [mainView, setMainView] = useState<MainViewMode>('table');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('همه');
  const [selectedQuadrantFilter, setSelectedQuadrantFilter] = useState<MatrixCategory | 'all'>('all');
  const [selectedDetailItem, setSelectedDetailItem] = useState<MenuItem | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [direction, setDirection] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handlePageChange = (newPage: number, dir: number) => {
    setDirection(dir);
    setCurrentPage(newPage);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const renderSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 opacity-40 group-hover:opacity-100 transition-opacity" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-[var(--brand-primary)]" />
    ) : (
      <ArrowDown className="h-3 w-3 text-[var(--brand-primary)]" />
    );
  };

  // 1. Calculate actual sales volume per menu item from salesRecords in last 30 days
  const salesVolumeMap = useMemo(() => {
    const map = new Map<number, number>();
    salesRecords.forEach((record) => {
      if (!isDateInPresetFilter(record.date, 'last30')) return;
      record.items?.forEach((item) => {
        if (item.menuItemId) {
          const current = map.get(item.menuItemId) || 0;
          map.set(item.menuItemId, current + (item.quantity || 0));
        }
      });
    });
    return map;
  }, [salesRecords]);

  // 2. Enhance menu items with real metrics and matrix category
  const processedItems = useMemo(() => {
    if (menuItems.length === 0) return [];

    const itemsWithVolume = menuItems.map((item) => {
      const recordedVolume = item.id ? salesVolumeMap.get(item.id) : undefined;
      const actualVolume = recordedVolume !== undefined ? recordedVolume : (item.salesVolume30Days ?? 0);
      return {
        ...item,
        computedVolume: actualVolume,
      };
    });

    const totalProfitSum = itemsWithVolume.reduce((acc, item) => acc + (item.grossProfit || 0), 0);
    const avgProfit = totalProfitSum / itemsWithVolume.length;

    const totalVolumeSum = itemsWithVolume.reduce((acc, item) => acc + item.computedVolume, 0);
    const avgVolume = totalVolumeSum / itemsWithVolume.length;

    return itemsWithVolume.map((item) => {
      const profit = item.grossProfit || 0;
      const volume = item.computedVolume;

      const isHighProfit = profit >= avgProfit;
      const isHighVolume = volume >= avgVolume;

      let cat: MatrixCategory = 'star';
      if (isHighProfit && isHighVolume) cat = 'star';
      else if (!isHighProfit && isHighVolume) cat = 'workhorse';
      else if (isHighProfit && !isHighVolume) cat = 'puzzle';
      else cat = 'underperformer';

      const foodCostPct = item.sellingPrice > 0 ? (item.totalMaterialCost / item.sellingPrice) * 100 : 0;
      const monthlyGrossProfitContribution = volume * profit;
      const monthlyRevenueContribution = volume * item.sellingPrice;

      return {
        ...item,
        matrixCategoryCalculated: cat,
        isHighProfit,
        isHighVolume,
        foodCostPct,
        monthlyGrossProfitContribution,
        monthlyRevenueContribution,
      };
    });
  }, [menuItems, salesVolumeMap]);

  // Global Benchmarks
  const benchmarks = useMemo(() => {
    if (processedItems.length === 0) {
      return {
        avgProfit: 0,
        avgVolume: 0,
        totalMonthlyProfit: 0,
        totalMonthlyVolume: 0,
        healthyRatio: 0,
        mostProfitableItem: null,
      };
    }

    const totalProfitSum = processedItems.reduce((acc, i) => acc + (i.grossProfit || 0), 0);
    const totalVolumeSum = processedItems.reduce((acc, i) => acc + i.computedVolume, 0);
    const avgProfit = totalProfitSum / processedItems.length;
    const avgVolume = totalVolumeSum / processedItems.length;

    const totalMonthlyProfit = processedItems.reduce((acc, i) => acc + i.monthlyGrossProfitContribution, 0);

    const healthyCount = processedItems.filter((i) => i.matrixCategoryCalculated !== 'underperformer').length;
    const healthyRatio = (healthyCount / processedItems.length) * 100;

    // Find most profitable item overall
    let mostProfitableItem = processedItems[0];
    processedItems.forEach((item) => {
      if ((item.grossProfit || 0) > (mostProfitableItem.grossProfit || 0)) {
        mostProfitableItem = item;
      }
    });

    return {
      avgProfit,
      avgVolume,
      totalMonthlyProfit,
      totalMonthlyVolume: totalVolumeSum,
      healthyRatio,
      mostProfitableItem,
    };
  }, [processedItems]);

  // Filter and sort items by search, category, quadrant & sort field
  const filteredAndSortedItems = useMemo(() => {
    const filtered = processedItems.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === 'همه' || item.category === selectedCategory;
      const matchesQuadrant =
        selectedQuadrantFilter === 'all' || item.matrixCategoryCalculated === selectedQuadrantFilter;
      return matchesSearch && matchesCategory && matchesQuadrant;
    });

    return filtered.sort((a, b) => {
      let valA: any = a[sortField as keyof typeof a];
      let valB: any = b[sortField as keyof typeof b];

      if (sortField === 'matrixCategoryCalculated') {
        valA = a.matrixCategoryCalculated;
        valB = b.matrixCategoryCalculated;
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
  }, [processedItems, search, selectedCategory, selectedQuadrantFilter, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedItems.length / itemsPerPage));
  const validPage = Math.min(currentPage, totalPages);
  const paginatedItems = useMemo(() => {
    const start = (validPage - 1) * itemsPerPage;
    return filteredAndSortedItems.slice(start, start + itemsPerPage);
  }, [filteredAndSortedItems, validPage, itemsPerPage]);

  // Group items into the 4 Quadrants
  const quadrantData = useMemo(() => {
    const totalProcessedVolume = processedItems.reduce((sum, i) => sum + i.computedVolume, 0) || 1;
    const totalProcessedProfit = processedItems.reduce((sum, i) => sum + i.monthlyGrossProfitContribution, 0) || 1;

    const keys: MatrixCategory[] = ['star', 'workhorse', 'puzzle', 'underperformer'];

    return keys.map((key) => {
      const config = QUADRANT_CONFIGS[key];
      const items = filteredAndSortedItems.filter((i) => i.matrixCategoryCalculated === key);
      const allCategoryItems = processedItems.filter((i) => i.matrixCategoryCalculated === key);

      const qVolume = allCategoryItems.reduce((acc, i) => acc + i.computedVolume, 0);
      const qProfit = allCategoryItems.reduce((acc, i) => acc + i.monthlyGrossProfitContribution, 0);

      const volumeSharePct = (qVolume / totalProcessedVolume) * 100;
      const profitSharePct = (qProfit / totalProcessedProfit) * 100;
      const menuSharePct = processedItems.length > 0 ? (allCategoryItems.length / processedItems.length) * 100 : 0;

      return {
        ...config,
        items,
        totalItemsCount: allCategoryItems.length,
        filteredCount: items.length,
        qVolume,
        qProfit,
        volumeSharePct,
        profitSharePct,
        menuSharePct,
      };
    });
  }, [filteredAndSortedItems, processedItems]);

  // Scatter chart data
  const scatterData = useMemo(() => {
    return processedItems.map((item) => {
      return {
        name: item.name,
        x: item.computedVolume,
        y: item.grossProfit || 0,
        cat: item.matrixCategoryCalculated,
        sellingPrice: item.sellingPrice,
      };
    });
  }, [processedItems]);

  // Detail Modal item metrics
  const detailItemMetrics = useMemo(() => {
    if (!selectedDetailItem) return null;
    const found = processedItems.find((i) => i.id === selectedDetailItem.id);
    if (!found) return null;
    const config = QUADRANT_CONFIGS[found.matrixCategoryCalculated];
    return {
      ...found,
      config,
    };
  }, [selectedDetailItem, processedItems]);

  return (
    <div className="space-y-6">
      {/* 1. Header & Primary View Navigation Tabs */}
      <div className="bg-white dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] rounded-3xl p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] dark:bg-[var(--brand-primary)]/20 shrink-0">
              <PieChart className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
                سودآوری و تحلیل منو (مهندسی ۴ بخش)
              </h3>
              <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-medium mt-0.5">
                طبقه‌بندی هوشمند غذاها و نوشیدنی‌ها جهت تصمیم‌گیری درباره قیمت‌گذاری و ترکیب منو
              </p>
            </div>
          </div>

          {/* Top Main Navigation Tabs */}
          <div className="bg-[var(--bg-base)] dark:bg-[var(--bg-card)] p-1.5 rounded-2xl border border-[var(--border-subtle)] dark:border-[var(--border-functional)] flex items-center gap-1 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setMainView('table')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                mainView === 'table'
                  ? 'bg-white dark:bg-[var(--bg-card)] text-[var(--brand-primary)] shadow-2xs'
                  : 'text-[var(--text-secondary)] dark:text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <TableIcon className="h-3.5 w-3.5" />
              <span>جدول و لیست محصولات</span>
            </button>

            <button
              type="button"
              onClick={() => setMainView('matrix')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                mainView === 'matrix'
                  ? 'bg-white dark:bg-[var(--bg-card)] text-[var(--brand-primary)] shadow-2xs'
                  : 'text-[var(--text-secondary)] dark:text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Grid className="h-3.5 w-3.5" />
              <span>ماتریس ۴ گانه</span>
            </button>

            <button
              type="button"
              onClick={() => setMainView('scatter')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                mainView === 'scatter'
                  ? 'bg-white dark:bg-[var(--bg-card)] text-[var(--brand-primary)] shadow-2xs'
                  : 'text-[var(--text-secondary)] dark:text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Target className="h-3.5 w-3.5" />
              <span>نقشه بصری</span>
            </button>

            <button
              type="button"
              onClick={() => setMainView('strategy')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                mainView === 'strategy'
                  ? 'bg-white dark:bg-[var(--bg-card)] text-[var(--brand-primary)] shadow-2xs'
                  : 'text-[var(--text-secondary)] dark:text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Lightbulb className="h-3.5 w-3.5" />
              <span>راهنمای استراتژیک</span>
            </button>
          </div>
        </div>

        {/* 2. Global Benchmarks KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-3 border-t border-[#F4F0EB] dark:border-[var(--border-subtle)] text-xs">
          <div className="bg-[var(--bg-base)] dark:bg-[var(--bg-card)] p-3 rounded-2xl border border-[var(--border-subtle)]/60 dark:border-[var(--border-subtle)]">
            <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)] text-[10px] font-bold block mb-0.5">
              میانگین سود هر پرس (مبنا)
            </span>
            <span className="text-xs sm:text-sm font-black text-[var(--text-primary)] dark:text-[var(--text-primary)]">
              {formatToman(benchmarks.avgProfit).text}
            </span>
          </div>

          <div className="bg-[var(--bg-base)] dark:bg-[var(--bg-card)] p-3 rounded-2xl border border-[var(--border-subtle)]/60 dark:border-[var(--border-subtle)]">
            <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)] text-[10px] font-bold block mb-0.5">
              میانگین فروش ۳۰ روز (مبنا)
            </span>
            <span className="text-xs sm:text-sm font-black text-[var(--text-primary)] dark:text-[var(--text-primary)]">
              {formatNumber(roundCurrency(benchmarks.avgVolume))} پرس
            </span>
          </div>

          <div className="bg-[var(--bg-base)] dark:bg-[var(--bg-card)] p-3 rounded-2xl border border-[var(--border-subtle)]/60 dark:border-[var(--border-subtle)]">
            <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)] text-[10px] font-bold block mb-0.5">
              سودآورترین محصول منو
            </span>
            <span className="text-xs sm:text-sm font-black text-[var(--status-success-text)] dark:text-[var(--status-success-text)] truncate block">
              {benchmarks.mostProfitableItem?.name || '---'}
            </span>
          </div>

          <div className="bg-[var(--bg-base)] dark:bg-[var(--bg-card)] p-3 rounded-2xl border border-[var(--border-subtle)]/60 dark:border-[var(--border-subtle)]">
            <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)] text-[10px] font-bold block mb-0.5">
              شاخص سلامت منو
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-black text-[var(--brand-primary)]">
                {formatNumber(roundCurrency(benchmarks.healthyRatio))}٪
              </span>
              <span className="text-[10px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-medium">
                (سودآور/پرفروش)
              </span>
            </div>
          </div>
        </div>

        {/* 3. Quadrant & Category Filters (Visible in Table and Matrix Views) */}
        {(mainView === 'table' || mainView === 'matrix') && (
          <div className="space-y-3 pt-2 border-t border-[#F4F0EB] dark:border-[var(--border-subtle)]">
            {/* Quadrant Quick Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[11px] font-extrabold text-[var(--text-secondary)] dark:text-[var(--text-secondary)] shrink-0 ml-1">
                گروه منو:
              </span>
              <button
                type="button"
                onClick={() => setSelectedQuadrantFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedQuadrantFilter === 'all'
                    ? 'bg-[var(--brand-primary)] text-white shadow-2xs font-black'
                    : 'bg-[var(--bg-base)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)]'
                }`}
              >
                همه محصولات ({formatNumber(processedItems.length)})
              </button>

              {(['star', 'workhorse', 'puzzle', 'underperformer'] as MatrixCategory[]).map((key) => {
                const conf = QUADRANT_CONFIGS[key];
                const count = processedItems.filter((i) => i.matrixCategoryCalculated === key).length;
                const isSelected = selectedQuadrantFilter === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSelectedQuadrantFilter(key);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
                      isSelected
                        ? `${conf.actionTagStyle} shadow-2xs font-black`
                        : 'bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border-[var(--border-subtle)] dark:border-[var(--border-functional)] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] hover:bg-[#F3EFEA]'
                    }`}
                  >
                    <conf.icon className="h-3.5 w-3.5" />
                    <span>{conf.title.split(' ')[0]} {conf.title.split(' ')[1]}</span>
                    <span className="opacity-75">({formatNumber(count)})</span>
                  </button>
                );
              })}
            </div>

            {/* Search & Category Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="absolute right-3.5 top-2.5 h-4 w-4 text-[var(--text-secondary)]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="جستجوی سریع غذا یا نوشیدنی در منو..."
                  className="w-full rounded-2xl border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] bg-[var(--bg-base)] dark:bg-[var(--bg-card)] pr-10 pl-4 py-2 text-xs font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-all"
                />
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {MENU_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-[var(--brand-primary)] text-white shadow-2xs'
                        : 'bg-[var(--bg-base)] dark:bg-[var(--bg-card)] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] border border-[var(--border-subtle)] dark:border-[var(--border-functional)] hover:bg-[#F3EFEA]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* VIEW 1: PRODUCT TABLE VIEW */}
      {mainView === 'table' && (
        <Card className="overflow-hidden border border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
          {/* Desktop and Tablet table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border-b border-[var(--border-subtle)] dark:border-[var(--border-subtle)] text-[11px] font-black text-[var(--text-secondary)] dark:text-[var(--text-secondary)] select-none">
                  <th
                    onClick={() => handleSort('name')}
                    className="p-3.5 cursor-pointer hover:text-[var(--text-primary)] group transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>نام محصول</span>
                      {renderSortIcon('name')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('matrixCategoryCalculated')}
                    className="p-3.5 cursor-pointer hover:text-[var(--text-primary)] group transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>وضعیت سودآوری (ماتریس)</span>
                      {renderSortIcon('matrixCategoryCalculated')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('sellingPrice')}
                    className="p-3.5 cursor-pointer hover:text-[var(--text-primary)] group transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>قیمت فروش</span>
                      {renderSortIcon('sellingPrice')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('primeCost')}
                    className="p-3.5 cursor-pointer hover:text-[var(--text-primary)] group transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>بهای تمام‌شده (COGS)</span>
                      {renderSortIcon('primeCost')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('grossProfit')}
                    className="p-3.5 cursor-pointer hover:text-[var(--text-primary)] group transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>سود ناخالص هر پرس</span>
                      {renderSortIcon('grossProfit')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('computedVolume')}
                    className="p-3.5 cursor-pointer hover:text-[var(--text-primary)] group transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>فروش ۳۰ روزه</span>
                      {renderSortIcon('computedVolume')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('monthlyGrossProfitContribution')}
                    className="p-3.5 cursor-pointer hover:text-[var(--text-primary)] group transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>کل سود ماهانه</span>
                      {renderSortIcon('monthlyGrossProfitContribution')}
                    </div>
                  </th>
                  <th className="p-3.5 text-center">شناسنامه محصول</th>
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
                  className="divide-y divide-[var(--border-subtle)]"
                >
                  {filteredAndSortedItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-[var(--text-secondary)] font-bold text-xs">
                        هیچ محصولی مطابق با جستجو یا فیلتر انتخابی یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item) => {
                      const quad = QUADRANT_CONFIGS[item.matrixCategoryCalculated];
                      const QuadIcon = quad.icon;
                      return (
                        <motion.tr
                          key={item.id}
                          variants={tableRowVariants}
                          className="hover:bg-[var(--bg-base)]/60 hover:bg-[var(--bg-base)] transition-colors"
                        >
                          <td className="p-3.5">
                            <div className="font-extrabold text-[var(--text-primary)] dark:text-[var(--text-primary)] text-xs">
                              {item.name}
                            </div>
                            <div className="text-[10px] text-[var(--text-secondary)] font-medium mt-0.5">
                              {item.category}
                            </div>
                          </td>

                          <td className="p-3.5">
                            <Badge variant={quad.badgeVariant} className="text-[10px] gap-1 py-1 px-2.5">
                              <QuadIcon className="h-3 w-3" />
                              <span>{quad.title.split(' ')[0]} {quad.title.split(' ')[1]}</span>
                            </Badge>
                          </td>

                          <td className="p-3.5 font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                            {formatToman(item.sellingPrice).text}
                          </td>

                          <td className="p-3.5 font-bold text-[var(--status-warning-text)] dark:text-[var(--status-warning-text)]">
                            {formatToman(item.primeCost).text}
                          </td>

                          <td className="p-3.5 font-black">
                            <span
                              className={
                                (item.grossProfit || 0) >= 0
                                  ? 'text-[#00A650] dark:text-[var(--status-success-text)]'
                                  : 'text-[var(--status-error-text)] dark:text-[var(--status-error-text)]'
                              }
                            >
                              {formatToman(item.grossProfit || 0).text}
                              <span className="text-[10px] opacity-75 mr-1 font-bold">
                                ({formatNumber(item.marginPercent)}٪)
                              </span>
                            </span>
                          </td>

                          <td className="p-3.5 font-extrabold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                            {formatNumber(item.computedVolume)} پرس
                          </td>

                          <td className="p-3.5 font-black text-[var(--status-success-text)] dark:text-[var(--status-success-text)]">
                            {formatToman(item.monthlyGrossProfitContribution).text}
                          </td>

                          <td className="p-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedDetailItem(item)}
                              className="p-1.5 px-3 rounded-xl bg-[var(--bg-base)] hover:bg-[var(--brand-primary-subtle)] text-[var(--text-primary)] hover:text-[var(--brand-primary)] transition-colors font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>جزئیات</span>
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })
                  )}
                </motion.tbody>
              </AnimatePresence>
            </table>
          </div>

          {/* Mobile Card Layout View */}
          <div className="block lg:hidden">
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
                {filteredAndSortedItems.length === 0 ? (
                  <div className="p-8 text-center text-[var(--text-secondary)] font-bold text-xs bg-white dark:bg-stone-950/25">
                    هیچ محصولی مطابق با جستجو یا فیلتر انتخابی یافت نشد.
                  </div>
                ) : (
                  paginatedItems.map((item) => {
                    const quad = QUADRANT_CONFIGS[item.matrixCategoryCalculated];
                    const QuadIcon = quad.icon;
                    return (
                      <motion.div
                        key={item.id}
                        variants={tableRowVariants}
                        className="p-4 space-y-3.5 bg-white dark:bg-stone-950/25 transition-colors"
                      >
                        {/* Title and Badge header */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-black text-[var(--text-primary)] dark:text-white">
                              {item.name}
                            </h4>
                            <span className="text-[10px] text-[var(--text-secondary)] font-medium mt-0.5 inline-block">
                              دسته‌بندی: {item.category}
                            </span>
                          </div>
                          <div className="shrink-0">
                            <Badge variant={quad.badgeVariant} className="text-[10px] gap-1 py-0.5 px-2 font-bold">
                              <QuadIcon className="h-3 w-3" />
                              <span>{quad.title}</span>
                            </Badge>
                          </div>
                        </div>

                        {/* Financial and volume metrics grid */}
                        <div className="grid grid-cols-2 gap-2 bg-[var(--bg-base)] dark:bg-stone-900/40 p-2.5 rounded-xl border border-[var(--border-subtle)] dark:border-stone-900">
                          <div className="space-y-0.5">
                            <span className="text-[9px] text-[var(--text-secondary)] font-bold block">قیمت و سود هر پرس:</span>
                            <div className="text-[11px] font-black text-[var(--text-primary)]">
                              فروش: {formatToman(item.sellingPrice).text}
                            </div>
                            <div className="text-[11px] font-bold text-[var(--text-secondary)]">
                              بها (COGS): {formatToman(item.primeCost).text}
                            </div>
                            <div className="text-[11px] font-black text-[var(--status-success-text)] mt-0.5">
                              سود: {formatToman(item.grossProfit || 0).text} <span className="text-[9px] font-bold">({formatNumber(item.marginPercent)}٪)</span>
                            </div>
                          </div>

                          <div className="space-y-0.5 border-r border-[var(--border-subtle)]/50 dark:border-stone-800 pr-2.5">
                            <span className="text-[9px] text-[var(--text-secondary)] font-bold block">مجموع عملکرد ۳۰ روزه:</span>
                            <div className="text-[11px] font-black text-[var(--text-primary)]">
                              تعداد فروش: {formatNumber(item.computedVolume)} پرس
                            </div>
                            <div className="text-[11px] font-black text-[var(--status-success-text)] mt-1">
                              مجموع سود ماهانه:
                              <span className="block text-[12px] font-black text-[var(--status-success-text)]">
                                {formatToman(item.monthlyGrossProfitContribution).text}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Detail Touch Button */}
                        <div className="flex items-center justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => setSelectedDetailItem(item)}
                            className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary-subtle)] rounded-xl border border-[var(--border-subtle)] dark:border-stone-900 transition-colors cursor-pointer min-h-[38px]"
                          >
                            <Eye className="h-4 w-4 text-[var(--brand-primary)]" />
                            <span>مشاهده شناسنامه محصول</span>
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <Pagination
            currentPage={validPage}
            totalPages={totalPages}
            totalItems={filteredAndSortedItems.length}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={(newSize) => {
              setItemsPerPage(newSize);
              setCurrentPage(1);
            }}
            itemsPerPageOptions={[5, 8, 10, 12, 15]}
            itemLabel="محصول آنالیز شده"
          />
        </Card>
      )}

      {/* VIEW 2: 4 QUADRANTS GRID VIEW */}
      {mainView === 'matrix' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {quadrantData.map((data) => {
            const IconComp = data.icon;
            return (
              <div
                key={data.key}
                className={`rounded-3xl border transition-all duration-200 bg-white dark:bg-[var(--bg-card)] overflow-hidden shadow-2xs flex flex-col ${data.borderColor}`}
              >
                {/* Quadrant Header */}
                <div className={`p-4 ${data.headerBg} border-b ${data.borderColor} flex items-center justify-between`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-2xl ${data.iconBg} ${data.iconColor}`}>
                      <IconComp className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                          {data.title}
                        </h4>
                        <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">
                          ({data.englishTitle})
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-medium mt-0.5">
                        {data.subTitle}
                      </p>
                    </div>
                  </div>

                  <Badge variant={data.badgeVariant}>
                    {formatNumber(data.totalItemsCount)} آیتم
                  </Badge>
                </div>

                {/* Metrics Row */}
                <div className="grid grid-cols-3 gap-1 p-3 bg-[var(--bg-base)]/60 dark:bg-[var(--bg-card)] border-b border-[#F4F0EB] dark:border-[var(--border-subtle)] text-[11px]">
                  <div className="text-center px-2 py-1 bg-white dark:bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)]/50 dark:border-[var(--border-subtle)]">
                    <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)] text-[10px] font-bold block">سهم منو</span>
                    <span className="font-extrabold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                      {formatNumber(roundCurrency(data.menuSharePct))}٪
                    </span>
                  </div>
                  <div className="text-center px-2 py-1 bg-white dark:bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)]/50 dark:border-[var(--border-subtle)]">
                    <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)] text-[10px] font-bold block">سهم فروش</span>
                    <span className="font-extrabold text-[#2563EB] dark:text-[var(--status-info-text)]">
                      {formatNumber(roundCurrency(data.volumeSharePct))}٪
                    </span>
                  </div>
                  <div className="text-center px-2 py-1 bg-white dark:bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)]/50 dark:border-[var(--border-subtle)]">
                    <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)] text-[10px] font-bold block">سهم سودکل</span>
                    <span className="font-extrabold text-[var(--status-success-text)] dark:text-[var(--status-success-text)]">
                      {formatNumber(roundCurrency(data.profitSharePct))}٪
                    </span>
                  </div>
                </div>

                {/* Strategy Summary & Product List */}
                <div className="p-3.5 text-xs space-y-3 flex-1 flex flex-col justify-between">
                  <div className="p-2.5 rounded-2xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)]/80 dark:border-[var(--border-subtle)] flex items-start gap-2">
                    <Info className={`h-4 w-4 shrink-0 mt-0.5 ${data.iconColor}`} />
                    <p className="text-[11px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-medium leading-relaxed">
                      {data.strategy}
                    </p>
                  </div>

                  {/* Items Container */}
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-0.5 scrollbar-thin">
                    {data.items.length === 0 ? (
                      <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)] py-3 text-center font-medium">
                        هیچ محصولی در این دسته‌بندی با فیلتر فعلی وجود ندارد.
                      </p>
                    ) : (
                      data.items.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => setSelectedDetailItem(item)}
                          className="group p-2.5 rounded-2xl border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] bg-[var(--bg-base)]/50 dark:bg-[var(--bg-card)] hover:bg-white hover:bg-[var(--bg-base)] transition-all cursor-pointer shadow-2xs flex items-center justify-between gap-2"
                        >
                          <div>
                            <span className="font-extrabold text-xs text-[var(--text-primary)] dark:text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors block">
                              {item.name}
                            </span>
                            <span className="text-[10px] text-[var(--text-secondary)] font-medium">
                              فروش: {formatNumber(item.computedVolume)} پرس
                            </span>
                          </div>

                          <div className="text-left dir-ltr">
                            <span className="text-xs font-black text-[var(--status-success-text)] dark:text-[var(--status-success-text)] block">
                              {formatToman(item.grossProfit || 0).text}
                            </span>
                            <span className="text-[10px] text-[var(--text-secondary)] font-bold block">
                              قیمت: {formatToman(item.sellingPrice).text}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 3: VISUAL SCATTER MATRIX CHART */}
      {mainView === 'scatter' && (
        <Card className="border border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
          <div className="p-4 sm:p-5 border-b border-[var(--border-subtle)] dark:border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
                <Target className="h-4 w-4 text-[var(--brand-primary)]" />
                نقشه فضایی محصولات (ماتریس مهندسی منو)
              </h4>
              <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-medium mt-0.5">
                موقعیت هر محصول در دو محور میزان فروش (افقی) و سود ناخالص هر پرس (عمودی). خطوط نقطه‌چین نشان‌دهنده میانگین‌های منو هستند.
              </p>
            </div>

            {/* Color Legend */}
            <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                محصولات طلایی
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                پرفروش‌ها
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                فرصت رشد
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                نیازمند اصلاح
              </span>
            </div>
          </div>

          <div className="p-4 h-96">
            {scatterData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--border-subtle)" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="حجم فروش"
                    tick={{ fontSize: 11, fontWeight: 'bold', fill: '#78716C' }}
                    tickFormatter={(v) => `${formatNumber(v)} پرس`}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--border-subtle)' }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="سود ناخالص"
                    tick={{ fontSize: 11, fontWeight: 'bold', fill: '#78716C' }}
                    tickFormatter={(v) => (v === 0 ? '۰' : `${formatNumber(roundCurrency(v / 1000))} هزار`)}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ReferenceLine
                    x={benchmarks.avgVolume}
                    stroke="#94A3B8"
                    strokeDasharray="5 5"
                    label={{ value: 'میانگین فروش', fill: '#64748B', fontSize: 10, position: 'top' }}
                  />
                  <ReferenceLine
                    y={benchmarks.avgProfit}
                    stroke="#94A3B8"
                    strokeDasharray="5 5"
                    label={{ value: 'میانگین سود', fill: '#64748B', fontSize: 10, position: 'right' }}
                  />
                  <Tooltip content={<CustomScatterTooltip />} />
                  <Scatter data={scatterData} fill="var(--brand-primary)">
                    {scatterData.map((entry, index) => {
                      let color = '#D97706';
                      if (entry.cat === 'workhorse') color = '#2563EB';
                      if (entry.cat === 'puzzle') color = '#7C3AED';
                      if (entry.cat === 'underperformer') color = 'var(--brand-primary)';
                      return <Cell key={`cell-${index}`} fill={color} r={8} className="cursor-pointer hover:opacity-80 transition-opacity" />;
                    })}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[var(--text-secondary)] font-bold text-xs">
                اطلاعات کافی جهت رسم نمودار وجود ندارد.
              </div>
            )}
          </div>
        </Card>
      )}

      {/* VIEW 4: STRATEGIC ACTION CENTER */}
      {mainView === 'strategy' && (
        <div className="space-y-4">
          <div className="bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] rounded-3xl p-5 space-y-2">
            <h4 className="text-sm font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[var(--brand-primary)]" />
              نقشه راه و راهکارهای عملیاتی برای بهینه‌سازی سودآوری منو
            </h4>
            <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)] leading-relaxed font-medium">
              بر اساس فرمول‌های استاندارد مهندسی منو (Menu Engineering)، برای هر یک از گروه محصولات می‌توانید از دستورالعمل‌های زیر جهت افزایش سودآوری کل رستوران استفاده کنید:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(['star', 'workhorse', 'puzzle', 'underperformer'] as MatrixCategory[]).map((key) => {
              const conf = QUADRANT_CONFIGS[key];
              const IconComp = conf.icon;
              const itemsCount = processedItems.filter((i) => i.matrixCategoryCalculated === key).length;

              return (
                <div
                  key={key}
                  className={`rounded-3xl border p-5 space-y-3 bg-white dark:bg-[var(--bg-card)] ${conf.borderColor}`}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-[#F4F0EB] dark:border-[var(--border-subtle)]">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-2xl ${conf.iconBg} ${conf.iconColor}`}>
                        <IconComp className="h-5 w-5" />
                      </div>
                      <div>
                        <h5 className="text-sm font-black text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                          {conf.title}
                        </h5>
                        <p className="text-[11px] text-[var(--text-secondary)] font-medium">
                          {conf.subTitle}
                        </p>
                      </div>
                    </div>
                    <Badge variant={conf.badgeVariant}>
                      {formatNumber(itemsCount)} محصول
                    </Badge>
                  </div>

                  <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-bold leading-relaxed">
                    {conf.strategy}
                  </p>

                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-black text-[var(--text-secondary)] dark:text-[var(--text-secondary)] block">
                      گام‌های کلیدی اجرای استراتژی:
                    </span>
                    <ul className="space-y-1.5 text-xs text-[var(--text-primary)] dark:text-[var(--text-secondary)] font-medium pr-4 list-disc">
                      {conf.detailedSteps.map((step, idx) => (
                        <li key={idx} className="leading-relaxed">
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ITEM ENGINEERING PASSPORT MODAL */}
      {selectedDetailItem && detailItemMetrics && (
        <Modal
          isOpen={!!selectedDetailItem}
          onClose={() => setSelectedDetailItem(null)}
          title={`شناسنامه مهندسی: ${detailItemMetrics.name}`}
          description={`تحلیل کامل مالی و جایگاه استراتژیک محصول در ${detailItemMetrics.config.title}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            {/* Header Category Banner */}
            <div
              className={`p-4 rounded-2xl ${detailItemMetrics.config.headerBg} border ${detailItemMetrics.config.borderColor} flex items-center justify-between`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl ${detailItemMetrics.config.iconBg} ${detailItemMetrics.config.iconColor}`}
                >
                  <detailItemMetrics.config.icon className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                    {detailItemMetrics.config.title} ({detailItemMetrics.config.englishTitle})
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-medium">
                    {detailItemMetrics.config.subTitle}
                  </p>
                </div>
              </div>
              <Badge variant={detailItemMetrics.config.badgeVariant}>
                {detailItemMetrics.category}
              </Badge>
            </div>

            {/* Financial Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="bg-[var(--bg-base)] dark:bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] text-xs">
                <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-bold block mb-0.5">قیمت فروش در منو</span>
                <span className="text-sm font-black text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                  {formatToman(detailItemMetrics.sellingPrice).text}
                </span>
              </div>

              <div className="bg-[var(--bg-base)] dark:bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] text-xs">
                <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-bold block mb-0.5">بهای تمام شده (COGS)</span>
                <span className="text-sm font-black text-[var(--status-warning-text)] dark:text-[var(--status-warning-text)]">
                  {formatToman(detailItemMetrics.primeCost).text}
                </span>
              </div>

              <div className="bg-[var(--bg-base)] dark:bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] text-xs">
                <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-bold block mb-0.5">سود ناخالص هر پرس</span>
                <span className="text-sm font-black text-[var(--status-success-text)] dark:text-[var(--status-success-text)]">
                  {formatToman(detailItemMetrics.grossProfit || 0).text} ({formatNumber(detailItemMetrics.marginPercent)}٪)
                </span>
              </div>

              <div className="bg-[var(--bg-base)] dark:bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] text-xs">
                <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-bold block mb-0.5">درصد فود کاست</span>
                <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                  {formatNumber(roundCurrency(detailItemMetrics.foodCostPct))}٪
                </span>
              </div>

              <div className="bg-[var(--bg-base)] dark:bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] text-xs">
                <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-bold block mb-0.5">حجم فروش ۳۰ روزه</span>
                <span className="text-sm font-black text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                  {formatNumber(detailItemMetrics.computedVolume)} پرس
                </span>
              </div>

              <div className="bg-[var(--bg-base)] dark:bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] text-xs">
                <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-bold block mb-0.5">کل سود ماهانه حاصله</span>
                <span className="text-sm font-black text-[var(--status-success-text)] dark:text-[var(--status-success-text)]">
                  {formatToman(detailItemMetrics.monthlyGrossProfitContribution).text}
                </span>
              </div>
            </div>

            {/* Ingredients Summary */}
            <div className="rounded-2xl border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] p-3.5 bg-[var(--bg-base)]/80 dark:bg-[var(--bg-card)] space-y-2">
              <span className="text-xs font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] block">
                ترکیب مواد اولیه و رسپی ({formatNumber(detailItemMetrics.ingredients?.length || 0)} قلم):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {detailItemMetrics.ingredients?.map((ing, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] bg-white dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-functional)] px-2.5 py-1 rounded-lg text-[var(--text-primary)] dark:text-[var(--text-secondary)] font-bold"
                  >
                    {ing.ingredientName}: {formatNumber(ing.quantity)} {ing.unit || ''} ({formatToman(ing.cost).text})
                  </span>
                ))}
              </div>
            </div>

            {/* Steps */}
            <div className="rounded-2xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] p-4 space-y-3 shadow-2xs transition-colors">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[var(--brand-primary)]" />
                <h5 className="text-xs font-black text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                  گام‌های پیشنهادی برای بهینه‌سازی و بهبود سودآوری
                </h5>
              </div>
              <ul className="space-y-1.5 text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-medium pr-4 list-disc">
                {detailItemMetrics.config.detailedSteps.map((step, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {step}
                  </li>
                ))}
              </ul>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
              {onOpenEditItem && (
                <button
                  type="button"
                  onClick={() => {
                    const itemToEdit = selectedDetailItem;
                    setSelectedDetailItem(null);
                    onOpenEditItem(itemToEdit);
                  }}
                  className="px-4 py-2 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Calculator className="h-4 w-4" />
                  ویرایش رسپی و قیمت‌گذاری
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedDetailItem(null)}
                className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] dark:border-[var(--border-functional)] text-[var(--text-primary)] dark:text-[var(--text-secondary)] hover:bg-[var(--bg-base)] hover:bg-[var(--bg-base)] text-xs font-bold transition-all cursor-pointer mr-auto"
              >
                بستن شناسنامه
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

/* Custom Tooltip for Scatter Plot Chart */
const CustomScatterTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const quad = QUADRANT_CONFIGS[data.cat as MatrixCategory];
    return (
      <div className="bg-white dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] rounded-2xl p-3.5 shadow-xl dir-rtl text-right min-w-[200px]">
        <div className="text-xs font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] pb-2 border-b border-[#F4F0EB] dark:border-[var(--border-subtle)] flex items-center justify-between">
          <span>{data.name}</span>
          <span className="text-[10px] text-[var(--brand-primary)] font-bold">({quad?.title.split(' ')[0]})</span>
        </div>
        <div className="mt-2 space-y-1 text-xs">
          <div className="flex justify-between gap-3 text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            <span>قیمت فروش:</span>
            <span className="font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">{formatToman(data.sellingPrice).text}</span>
          </div>
          <div className="flex justify-between gap-3 text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            <span>حجم فروش (۳۰ روز):</span>
            <span className="font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">{formatNumber(data.x)} پرس</span>
          </div>
          <div className="flex justify-between gap-3 text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            <span>سود ناخالص هر پرس:</span>
            <span className="font-bold text-[var(--status-success-text)] dark:text-[var(--status-success-text)]">{formatToman(data.y).text}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};
