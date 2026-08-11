import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Search,
  Calculator,
  Boxes,
  UtensilsCrossed,
  Receipt,
  PieChart,
  Settings,
  ArrowLeft,
  Sparkles,
  Zap,
  Lightbulb,
  TrendingUp,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { SmartMoneyInput } from '../ui/SmartMoneyInput';
import { formatToman, toPersianDigits } from '../../lib/utils';

type GuideChapterId = 'all' | 'setup' | 'inventory' | 'menu' | 'sales' | 'analytics' | 'backup' | 'calculator';

interface ChapterDef {
  id: GuideChapterId;
  title: string;
  shortDesc: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  color: string;
}

export const GuideManager: React.FC = () => {
  const { setActiveTab } = useAppStore();
  const [activeChapter, setActiveChapter] = useState<GuideChapterId>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Interactive Calculator State
  const [calcCost, setCalcCost] = useState<number>(500000); // 500k Toman per kg
  const [calcWaste, setCalcWaste] = useState<number>(15); // 15% waste
  const [calcWeightGrams, setCalcWeightGrams] = useState<number>(180); // 180g
  const [calcSellingPrice, setCalcSellingPrice] = useState<number>(220000); // 220k selling price

  // Calculated variables for simulator
  const netUsableRatio = Math.max(0.01, (100 - calcWaste) / 100);
  const netCostPerKg = calcCost / netUsableRatio;
  const netCostPerGram = netCostPerKg / 1000;
  const recipeFoodCost = Math.round(netCostPerGram * calcWeightGrams);
  const foodCostPercentage = calcSellingPrice > 0 ? ((recipeFoodCost / calcSellingPrice) * 100).toFixed(1) : '۰';
  const grossProfit = Math.max(0, calcSellingPrice - recipeFoodCost);

  const chapters: ChapterDef[] = [
    {
      id: 'all',
      title: 'همه مباحث و آموزش‌ها',
      shortDesc: 'دیدن تمامی راهنماها و آموزش‌های سیستم به صورت یکجا',
      icon: BookOpen,
      color: 'bg-stone-800 text-white dark:bg-stone-200 dark:text-[var(--text-primary)]',
    },
    {
      id: 'setup',
      title: '۱. تنظیمات اولیه و هزینه‌های ثابت',
      shortDesc: 'فرمول دقیق محاسبه هزینه‌های ثابت ماهانه (اجاره، حقوق، بیمه، قبوض) و نرخ هر دقیقه',
      icon: Settings,
      badge: 'پایه و الزامی',
      color: 'bg-blue-600 text-white',
    },
    {
      id: 'inventory',
      title: '۲. انبارداری و درصد افت مواد اولیه',
      shortDesc: 'تعریف مواد اولیه، واحد سنجش، درصد ضایعات پاک‌کردن و هشدار کمبود موجودی',
      icon: Boxes,
      badge: 'کنترل موجودی',
      color: 'bg-amber-600 text-white',
    },
    {
      id: 'menu',
      title: '۳. آنالیز دستور پخت و قیمت‌گذاری منو',
      shortDesc: 'فرمول‌نویسی دستور پخت، محاسبه دقیق هزینه مواد اولیه و قیمت پیشنهادی علمی',
      icon: UtensilsCrossed,
      badge: 'قیمت‌گذاری علمی',
      color: 'bg-emerald-600 text-white',
    },
    {
      id: 'sales',
      title: '۴. ثبت فروش روزانه و ضایعات انبار',
      shortDesc: 'کسر هوشمند موجودی انبار هنگام فروش، ثبت ضایعات و خسارت با کسر لحظه‌ای',
      icon: Receipt,
      badge: 'تراکنش‌های روزانه',
      color: 'bg-indigo-600 text-white',
    },
    {
      id: 'analytics',
      title: '۵. صورت سود و زیان و ماتریس منو',
      shortDesc: 'تحلیل محصولات طلایی، پرفروش‌های محبوب، فرصت‌های رشد و آیتم‌های کم‌بازده',
      icon: PieChart,
      badge: 'مدیریت مالی',
      color: 'bg-purple-600 text-white',
    },
    {
      id: 'backup',
      title: '۶. پشتیبان‌گیری و امنیت ۱۰۰٪ آفلاین',
      shortDesc: 'ذخیره‌سازی اطلاعات محلی روی مرورگر، دریافت فایل خروجی پشتیبان و بازیابی',
      icon: ShieldCheck,
      badge: 'امنیت داده',
      color: 'bg-rose-600 text-white',
    },
    {
      id: 'calculator',
      title: '۷. ماشین‌حساب تعاملی و شبیه‌ساز',
      shortDesc: 'تست زنده فرمول‌های هزینه مواد اولیه، درصد افت و سود ناخالص آیتم‌ها',
      icon: Calculator,
      badge: 'ابزار تعاملی',
      color: 'bg-[var(--brand-primary)] text-white',
    },
  ];

  const faqs = [
    {
      q: 'آیا برای استفاده از این سیستم نیاز به اتصال به اینترنت دارم؟',
      a: 'خیر! تمامی اطلاعات، انبار، قیمت‌گذاری و گزارش‌های مالی شما ۱۰۰٪ به صورت محلی در حافظه امن مرورگرتان ذخیره می‌شوند. هیچ داده‌ای به سرور خارجی ارسال نمی‌شود و حتی در حالت قطعی کامل اینترنت، نرم‌افزار بدون هیچ مشکلی کار می‌کند.',
    },
    {
      q: 'درصد افت و ضایعات پاک‌کردن ماده اولیه چیست و چرا اهمیت دارد؟',
      a: 'وقتی مثلاً ۱۰ کیلوگرم فیله مرغ یا گوشت می‌خرید، پس از پاک‌کردن، گرفتن چربی و استخوان، ممکن است فقط ۸.۵ کیلوگرم گوشت قابل استفاده باقی بماند (۱۵٪ افت). اگر این ۱۵٪ را حساب نکنید، قیمت تمام‌شده غذای خود را کمتر از واقعیت برآورد کرده و متضرر می‌شوید. سیستم ما با کسر درصد افت، قیمت خالص واقعی هر گرم را محاسبه می‌کند.',
    },
    {
      q: 'تفاوت هزینه مواد اولیه و سود ناخالص چیست؟',
      a: 'هزینه مواد اولیه یعنی مجموع هزینه ریالی مواد اولیه مصرف‌شده در یک پرس غذا. اگر هزینه مواد اولیه پیتزا ۵۰ هزار تومان باشد و آن را ۱۵۰ هزار تومان بفروشید، سود ناخالص شما ۱۰۰ هزار تومان (درصد هزینه مواد اولیه ۳۳.۳٪) است.',
    },
    {
      q: 'هزینه‌های ثابت ماهانه چگونه روی قیمت هر پرس غذا تاثیر می‌گذارند؟',
      a: 'هزینه‌هایی مانند اجاره، حقوق پرسنل، قبوض و استهلاک در طول ماه ثابت هستند. سیستم با تقسیم کل این هزینه‌ها بر تعداد روزها و ساعات کاری، سهم هزینه ثابت هر دقیقه را به دست می‌آورد تا بدانید علاوه بر مواد اولیه، چقدر هزینه سربار برای هر سفارش داده‌اید.',
    },
    {
      q: 'اگر مرورگر را پاک کنم یا ویندوز تعویض شود چه اتفاقی برای داده‌ها می‌افتد؟',
      a: 'چون داده‌ها در مرورگر ذخیره می‌شوند، حتماً هفته‌ای یک‌بار از بخش «تنظیمات و پشتیبان‌گیری» گزینه «دانلود فایل پشتیبان» را بزنید. فایل دانلود شده را در فلش یا سیستم خود نگه دارید تا در صورت تعویض سیستم، با یک کلیک تمام اطلاعات را بازیابی کنید.',
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-['Vazirmatn',sans-serif] text-[var(--text-primary)]">
      {/* Hero Header - Light & High Contrast Design with Primary Blur Background */}
      <div className="relative overflow-hidden rounded-3xl bg-[var(--brand-primary-subtle)]/40 backdrop-blur-xl p-6 sm:p-8 md:p-10 shadow-xs border border-[var(--brand-primary)]/20 transition-all">
        {/* Soft Primary Glow Accents */}
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-[var(--brand-primary)]/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-[var(--brand-primary)]/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/30 text-[var(--brand-primary)] text-xs font-black">
            <Sparkles className="h-4 w-4" />
            <span>راهنمای جامع و استاندارد مهندسی منو</span>
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-[var(--text-primary)] leading-tight tracking-tight">
            آموزش کامل کار با سیستم مدیریت مالی و قیمت‌گذاری رستوران
          </h1>

          <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium leading-relaxed">
            این راهنما به شما یاد می‌دهد چگونه مانند یک مدیر حرفه‌ای، قیمت تمام‌شده هر پرس غذا را محاسبه کنید، افت انبار را کنترل نمایید، سود خالص واقعی را به‌دست آورید و از ضررهای پنهان رستوران جلوگیری کنید.
          </p>

          {/* Search Bar */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو در موضوعات (مثلاً: مواد اولیه، افت، ضایعات، پشتیبان)..."
                className="w-full h-11 pr-10 pl-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)] placeholder-[var(--text-secondary)]/60 focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary)] transition-all shadow-2xs"
              />
            </div>
            {searchQuery && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="text-xs font-bold border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-base)]"
              >
                پاک‌سازی جستجو
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Chapters Navigation Badges */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {chapters.map((ch) => {
          const Icon = ch.icon;
          const isActive = activeChapter === ch.id;
          return (
            <button
              key={ch.id}
              onClick={() => setActiveChapter(ch.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all shrink-0 cursor-pointer border ${
                isActive
                  ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] shadow-xs scale-102'
                  : 'bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:bg-[var(--bg-base)]'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{ch.title.split('.')[0] === 'همه مباحث و آموزش‌ها' ? ch.title : ch.title.split('.')[0] + '. ' + ch.title.split(' ')[1]}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area based on selected chapter */}
      <div className="space-y-8">
        {/* Chapter 1: Setup & Fixed Costs */}
        {(activeChapter === 'all' || activeChapter === 'setup') && (
          <Card className="border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] rounded-3xl shadow-sm overflow-hidden bg-white dark:bg-[var(--bg-card)]">
            <div className="p-5 sm:p-7 border-b border-[var(--border-subtle)] dark:border-[var(--border-subtle)] bg-blue-50/60 dark:bg-blue-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-2xl bg-blue-600 text-white shadow-md">
                  <Settings className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-[var(--status-info-text)] dark:text-[var(--status-info-text)]">گام {toPersianDigits(1)}</span>
                    <Badge variant="info">پیکربندی پایه</Badge>
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] mt-0.5">
                    {toPersianDigits('۱. تنظیمات اولیه و فرمول دقیق هزینه‌های ثابت ماهانه')}
                  </h2>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => setActiveTab('settings')}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shrink-0"
              >
                <span>ورود به تنظیمات</span>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>

            <CardContent className="p-5 sm:p-7 space-y-6 text-xs sm:text-sm text-[var(--text-primary)] dark:text-[var(--text-secondary)] leading-relaxed font-medium">
              <p>
                نخستین قدم برای مدیریت مالی علمی در هر رستوران، کافه یا فست‌فود، ثبت تمامی هزینه‌های غیرمستقیم است. اگر هزینه‌های ثابت را نادیده بگیرید، ممکن است تصور کنید سود خوبی دارید اما در پایان ماه با کسری بودجه مواجه شوید.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] space-y-2">
                  <h4 className="font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] text-xs flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[var(--status-info-text)]" />
                    <span>اقلام تشکیل‌دهنده هزینه‌های ثابت</span>
                  </h4>
                  <ul className="list-disc list-inside text-[var(--text-secondary)] dark:text-[var(--text-secondary)] space-y-1 pr-2 text-xs">
                    <li>اجاره‌بهای ماهانه ملک رستوران</li>
                    <li>حقوق، دستمزد و مزایای پرسنل آشپزخانه و سالن</li>
                    <li>بیمه، مالیات و عوارض شهرداری</li>
                    <li>قبوض آب، برق، گاز، تلفن و اینترنت</li>
                    <li>استهلاک تجهیزات و ظروف آشپزخانه</li>
                    <li>هزینه‌های بازاریابی و بسته‌بندی ثابت</li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-[var(--status-info-text)]/30 dark:border-[var(--status-info-text)]/30 space-y-2">
                  <h4 className="font-black text-blue-950 dark:text-blue-200 text-xs flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-[var(--status-info-text)]" />
                    <span>فرمول محاسبه نرخ سربار هر دقیقه</span>
                  </h4>
                  <p className="text-xs text-blue-900 dark:text-blue-300">
                    سیستم هزینه‌های ماهانه شما را به نرخ دقیقه تبدیل می‌کند:
                  </p>
                  <div className="p-3 rounded-xl bg-white dark:bg-[var(--bg-card)] text-[11px] font-bold text-[var(--status-info-text)] dark:text-blue-300 border border-[var(--status-info-text)]/30 dark:border-[var(--status-info-text)]/30 text-center">
                    هزینه سربار دقیقه = کل هزینه‌های ماهانه ÷ (روزهای کاری × ساعات کاری روزانه × {toPersianDigits(60)})
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                    مثال: {toPersianDigits(50)} میلیون هزینه ماهانه ÷ ({toPersianDigits(26)} روز × {toPersianDigits(10)} ساعت × {toPersianDigits(60)} دقیقه) = حدود {toPersianDigits('3,205')} تومان هزینه ثابت در هر دقیقه کاری.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--status-warning-bg)] border border-[var(--status-warning-text)]/30 dark:border-[var(--status-warning-text)]/30 flex items-start gap-3 text-[var(--status-warning-text)] dark:text-amber-200 text-xs font-bold">
                <Lightbulb className="h-5 w-5 text-[var(--status-warning-text)] shrink-0 mt-0.5" />
                <div>
                  <span className="font-black text-[var(--status-warning-text)] dark:text-amber-100 block mb-1">نکته کاربردی:</span>
                  تعداد روزهای کاری ماهانه (مثلاً {toPersianDigits(26)} یا {toPersianDigits(30)} روز) را در بخش تنظیمات به دقت وارد کنید. اگر مجموعه {toPersianDigits(4)} روز در ماه تعطیل باشد، هزینه‌های ثابت بین {toPersianDigits(26)} روز تقسیم می‌شوند و نرخ دقیق‌تری به‌دست می‌آید.
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chapter 2: Inventory & Yield/Waste */}
        {(activeChapter === 'all' || activeChapter === 'inventory') && (
          <Card className="border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] rounded-3xl shadow-sm overflow-hidden bg-white dark:bg-[var(--bg-card)]">
            <div className="p-5 sm:p-7 border-b border-[var(--border-subtle)] dark:border-[var(--border-subtle)] bg-amber-50/60 dark:bg-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-2xl bg-amber-600 text-white shadow-md">
                  <Boxes className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-[var(--status-warning-text)] dark:text-[var(--status-warning-text)]">گام {toPersianDigits(2)}</span>
                    <Badge variant="warning">مدیریت انبار</Badge>
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] mt-0.5">
                    {toPersianDigits('۲. انبارداری، واحد سنجش و درصد افت مواد اولیه')}
                  </h2>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => setActiveTab('inventory')}
                className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-xs font-black rounded-xl shrink-0 transition-colors"
              >
                <span>ورود به انبار</span>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>

            <CardContent className="p-5 sm:p-7 space-y-6 text-xs sm:text-sm text-[var(--text-primary)] dark:text-[var(--text-secondary)] leading-relaxed font-medium">
              <p>
                در انبارداری رستورانی، قیمت خرید فاکتور با قیمت واقعی مصرفی متفاوت است! به این تفاوت «درصد افت یا ضایعات پاک‌کردن» گفته می‌شود.
              </p>

              {/* Formula Callout in Light Aesthetic */}
              <div className="p-5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-[var(--status-warning-text)]/30 dark:border-[var(--status-warning-text)]/30 space-y-3">
                <div className="flex items-center gap-2 text-[var(--status-warning-text)] dark:text-amber-200 font-black text-xs">
                  <TrendingUp className="h-4 w-4 text-[var(--status-warning-text)]" />
                  <span>فرمول دقیق محاسبه قیمت واقعی هر گرم پس از کسر افت:</span>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-[var(--bg-card)] text-[var(--status-warning-text)] dark:text-amber-200 font-bold text-xs text-center border border-[var(--status-warning-text)]/30 dark:border-[var(--status-warning-text)]/30">
                  قیمت واقعی هر گرم = (قیمت خرید هر کیلوگرم ÷ ((۱۰۰ - درصد افت) ÷ ۱۰۰)) ÷ ۱۰۰۰
                </div>
                <p className="text-xs text-[var(--text-primary)] dark:text-[var(--text-secondary)] leading-relaxed">
                  <strong>مثال عملی:</strong> فرض کنید {toPersianDigits(1)} کیلوگرم گوشت پاک‌نشده را {toPersianDigits('500,000')} تومان می‌خرید. پس از پاک‌کردن و گرفتن چربی، {toPersianDigits(20)}٪ آن دورریز می‌شود ({toPersianDigits(800)} گرم خالص می‌ماند). قیمت واقعی هر کیلو گوشت خالص می‌شود {toPersianDigits('625,000')} تومان (یعنی {toPersianDigits(625)} تومان به ازای هر گرم).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] space-y-1">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)]">{toPersianDigits(1)}. ثبت قیمت خرید</span>
                  <p className="text-xs font-black text-[var(--text-primary)] dark:text-[var(--text-primary)]">قیمت خرید طبق فاکتور تامین‌کننده</p>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] space-y-1">
                  <span className="text-[11px] font-bold text-[var(--status-warning-text)]">{toPersianDigits(2)}. ثبت درصد افت</span>
                  <p className="text-xs font-black text-[var(--text-primary)] dark:text-[var(--text-primary)]">درصد ضایعات پاک‌کردن و ریشه/پوست</p>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] space-y-1">
                  <span className="text-[11px] font-bold text-[var(--status-success-text)]">{toPersianDigits(3)}. حد حداقل موجودی</span>
                  <p className="text-xs font-black text-[var(--text-primary)] dark:text-[var(--text-primary)]">دریافت هشدار خودکار در صورت کمبود</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chapter 3: Recipe Costing & Pricing */}
        {(activeChapter === 'all' || activeChapter === 'menu') && (
          <Card className="border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] rounded-3xl shadow-sm overflow-hidden bg-white dark:bg-[var(--bg-card)]">
            <div className="p-5 sm:p-7 border-b border-[var(--border-subtle)] dark:border-[var(--border-subtle)] bg-emerald-50/60 dark:bg-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-2xl bg-emerald-600 text-white shadow-md">
                  <UtensilsCrossed className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-[var(--status-success-text)] dark:text-[var(--status-success-text)]">گام {toPersianDigits(3)}</span>
                    <Badge variant="success">آنالیز و قیمت‌گذاری</Badge>
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] mt-0.5">
                    {toPersianDigits('۳. آنالیز دستور پخت و قیمت‌گذاری منو')}
                  </h2>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => setActiveTab('menu')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shrink-0"
              >
                <span>آنالیز و قیمت‌گذاری</span>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>

            <CardContent className="p-5 sm:p-7 space-y-6 text-xs sm:text-sm text-[var(--text-primary)] dark:text-[var(--text-secondary)] leading-relaxed font-medium">
              <p>
                قلب تپنده این نرم‌افزار، بخش قیمت‌گذاری علمی منو است. شما برای هر آیتم غذا یا نوشیدنی، یک دستور پخت (رسپی) دقیق تعریف می‌کنید.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-[var(--status-success-text)]/30 dark:border-[var(--status-success-text)]/30 space-y-2">
                  <h4 className="font-black text-emerald-950 dark:text-emerald-200 text-xs flex items-center gap-2">
                    <Zap className="h-4 w-4 text-[var(--status-success-text)]" />
                    <span>محاسبه هزینه کل مواد اولیه</span>
                  </h4>
                  <p className="text-xs text-emerald-900 dark:text-emerald-300">
                    سیستم هزینه تمام مواد اولیه تشکیل‌دهنده را بر اساس مقدار مصرفی (گرم/سی‌سی) جمع زده و هزینه مواد اولیه کل پرس را محاسبه می‌کند.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] space-y-2">
                  <h4 className="font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] text-xs flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-[var(--status-success-text)]" />
                    <span>قیمت پیشنهادی بر اساس درصد هدف</span>
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                    استاندارد جهانی درصد هزینه مواد اولیه بین {toPersianDigits(25)}٪ تا {toPersianDigits(35)}٪ است. قیمت پیشنهادی برابر است با:
                  </p>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[var(--bg-card)] text-[11px] font-bold text-[var(--status-success-text)] dark:text-[var(--status-success-text)] border border-[var(--status-success-text)]/30 dark:border-[var(--status-success-text)]/30 text-center">
                    قیمت پیشنهادی = هزینه کل مواد اولیه ÷ (درصد هدف ÷ {toPersianDigits(100)})
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chapter 4: Sales & Waste Logs */}
        {(activeChapter === 'all' || activeChapter === 'sales') && (
          <Card className="border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] rounded-3xl shadow-sm overflow-hidden bg-white dark:bg-[var(--bg-card)]">
            <div className="p-5 sm:p-7 border-b border-[var(--border-subtle)] dark:border-[var(--border-subtle)] bg-indigo-50/60 dark:bg-indigo-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-2xl bg-indigo-600 text-white shadow-md">
                  <Receipt className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">گام {toPersianDigits(4)}</span>
                    <Badge variant="outline">عملیات روزانه</Badge>
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] mt-0.5">
                    {toPersianDigits('۴. ثبت فروش روزانه و مدیریت ضایعات انبار')}
                  </h2>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => setActiveTab('sales')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shrink-0"
              >
                <span>ثبت فروش و ضایعات</span>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>

            <CardContent className="p-5 sm:p-7 space-y-6 text-xs sm:text-sm text-[var(--text-primary)] dark:text-[var(--text-secondary)] leading-relaxed font-medium">
              <p>
                در پایان هر شیفت یا روز کاری، فاکتورهای فروش و گزارش ضایعات را وارد کنید. سیستم به صورت دقیق و لحظه‌ای انبار را بروزرسانی می‌کند.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] space-y-2">
                  <h4 className="font-black text-indigo-600 dark:text-indigo-400 text-xs">ثبت فاکتورهای فروش</h4>
                  <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                    با ثبت فروش {toPersianDigits(10)} عدد پیتزا، سیستم به صورت خودکار به مقدار لازم از موجودی خمیر، پنیر، سس و ترکیبات انبار کسر می‌کند.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-[var(--status-error-text)]/30 dark:border-[var(--status-error-text)]/30 space-y-2">
                  <h4 className="font-black text-[var(--status-error-text)] dark:text-[var(--status-error-text)] text-xs">ثبت ضایعات و خسارت</h4>
                  <p className="text-xs text-rose-950 dark:text-rose-200">
                    اگر {toPersianDigits(5)} لیتر شیر فاسد شد یا {toPersianDigits(2)} عدد غذا سوخت، آن را در بخش ضایعات ثبت کنید تا هم موجودی اصلاح شود و هم خسارت ریالی در صورت سود و زیان محاسبه گردد.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chapter 5: P&L & Menu Matrix */}
        {(activeChapter === 'all' || activeChapter === 'analytics') && (
          <Card className="border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] rounded-3xl shadow-sm overflow-hidden bg-white dark:bg-[var(--bg-card)]">
            <div className="p-5 sm:p-7 border-b border-[var(--border-subtle)] dark:border-[var(--border-subtle)] bg-purple-50/60 dark:bg-purple-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-2xl bg-purple-600 text-white shadow-md">
                  <PieChart className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-[var(--status-purple-text)] dark:text-[var(--status-purple-text)]">گام {toPersianDigits(5)}</span>
                    <Badge variant="purple">تحلیل مدیریت</Badge>
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] mt-0.5">
                    {toPersianDigits('۵. صورت سود و زیان و ماتریس تحلیل منو')}
                  </h2>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => setActiveTab('analytics')}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-black rounded-xl shrink-0"
              >
                <span>تحلیل سودآوری منو</span>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>

            <CardContent className="p-5 sm:p-7 space-y-6 text-xs sm:text-sm text-[var(--text-primary)] dark:text-[var(--text-secondary)] leading-relaxed font-medium">
              <p>
                سیستم با ماتریس مهندسی منو، تمامی آیتم‌های غذایی شما را در {toPersianDigits(4)} دسته استاندارد تحلیل و دسته‌بندی می‌کند:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-[var(--status-warning-bg)] border border-[var(--status-warning-text)]/30 dark:border-[var(--status-warning-text)]/30 space-y-1">
                  <span className="text-xs font-black text-[var(--status-warning-text)] dark:text-[var(--status-warning-text)]">🌟 محصولات طلایی</span>
                  <p className="text-[11px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">سود ناخالص بالا + محبوبیت و فروش بالا. محصولات پرچمدار و ستون اصلی سودآوری مجموعه شما هستند.</p>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--status-info-bg)] border border-[var(--status-info-text)]/30 dark:border-[var(--status-info-text)]/30 space-y-1">
                  <span className="text-xs font-black text-[var(--status-info-text)] dark:text-blue-300">🔥 پرفروش‌های محبوب</span>
                  <p className="text-[11px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">فروش و محبوبیت بالا + سود ناخالص متوسط یا پایین. نیازمند بهینه‌سازی هزینه مواد اولیه یا تعدیل قیمت.</p>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--status-purple-bg)] border border-[var(--status-purple-text)]/30 dark:border-[var(--status-purple-text)]/30 space-y-1">
                  <span className="text-xs font-black text-[var(--status-purple-text)] dark:text-purple-300">💡 فرصت‌های رشد</span>
                  <p className="text-[11px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">سود ناخالص فوق‌العاده + فروش پایین. نیازمند بازاریابی، تغییر موقعیت منو و پیشنهاد ویژه.</p>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--status-error-bg)] border border-[var(--status-error-text)]/30 dark:border-[var(--status-error-text)]/30 space-y-1">
                  <span className="text-xs font-black text-[var(--status-error-text)] dark:text-rose-300">⚠️ نیازمند بهینه‌سازی</span>
                  <p className="text-[11px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">فروش پایین + سود پایین. نیازمند بازنگری رسپی، جایگزینی یا حذف از منو.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chapter 6: Backup & Data Safety */}
        {(activeChapter === 'all' || activeChapter === 'backup') && (
          <Card className="border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] rounded-3xl shadow-sm overflow-hidden bg-white dark:bg-[var(--bg-card)]">
            <div className="p-5 sm:p-7 border-b border-[var(--border-subtle)] dark:border-[var(--border-subtle)] bg-rose-50/60 dark:bg-rose-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-2xl bg-rose-600 text-white shadow-md">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-[var(--status-error-text)] dark:text-[var(--status-error-text)]">گام {toPersianDigits(6)}</span>
                    <Badge variant="danger">پشتیبان‌گیری و امنیت</Badge>
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] mt-0.5">
                    {toPersianDigits('۶. پشتیبان‌گیری و ذخیره آفلاین داده‌ها')}
                  </h2>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => setActiveTab('settings')}
                className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-xs font-black rounded-xl shrink-0 transition-colors"
              >
                <span>پشتیبان‌گیری در تنظیمات</span>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>

            <CardContent className="p-5 sm:p-7 space-y-4 text-xs sm:text-sm text-[var(--text-primary)] dark:text-[var(--text-secondary)] leading-relaxed font-medium">
              <p>
                داده‌های شما فقط در رایانه شخصی خودتان قرار دارد. جهت حفظ سوابق، حتماً هر هفته یک نسخه خروجی پشتیبان دریافت کرده و در جای امن نگهداری نمایید.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Chapter 7: Interactive Calculator Simulator - Clean Light Design System */}
        {(activeChapter === 'all' || activeChapter === 'calculator') && (
          <Card className="border border-[var(--brand-primary)]/30 dark:border-[var(--brand-primary)]/50 rounded-3xl shadow-sm overflow-hidden bg-white dark:bg-[var(--bg-card)]">
            <div className="p-5 sm:p-7 border-b border-[var(--border-subtle)] dark:border-[var(--border-subtle)] bg-[var(--bg-base)] dark:bg-[var(--bg-card)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-2xl bg-[var(--brand-primary)] text-white shadow-md">
                  <Calculator className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-[var(--brand-primary)]">شبیه‌ساز زنده</span>
                    <Badge variant="primary">ابزار تعاملی</Badge>
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] mt-0.5">
                    {toPersianDigits('۷. ماشین‌حساب تعاملی فرمول‌های هزینه مواد اولیه و درصد افت')}
                  </h2>
                </div>
              </div>
            </div>

            <CardContent className="p-5 sm:p-7 space-y-6">
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-medium">
                ارقام زیر را تغییر دهید تا تاثیر مستقیم درصد افت و میزان مصرف بر هزینه مواد اولیه و سود ناخالص غذا را زنده مشاهده کنید:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Inputs with SmartMoneyInput & Persian Digits */}
                <div className="space-y-4 p-5 rounded-2xl bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
                  <h4 className="text-xs font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
                    <Settings className="h-4 w-4 text-[var(--brand-primary)]" />
                    <span>ورودی‌های فرضی آیتم</span>
                  </h4>

                  <SmartMoneyInput
                    label="قیمت خرید فاکتور ماده اولیه (تومان به ازای هر کیلو):"
                    value={calcCost}
                    onChange={(val) => setCalcCost(val)}
                    placeholder="۵۰۰,۰۰۰"
                    suffix="تومان"
                  />

                  <div className="space-y-1.5">
                    <label className="block text-xs font-extrabold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                      درصد افت و ضایعات پاک‌کردن:
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="50"
                        value={calcWaste}
                        onChange={(e) => setCalcWaste(Number(e.target.value))}
                        className="flex-1 accent-[var(--brand-primary)]"
                      />
                      <span className="text-xs font-black w-12 text-center py-1.5 px-2 rounded-xl bg-white dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-functional)] text-[var(--text-primary)] dark:text-[var(--text-primary)] dir-rtl">
                        ٪{toPersianDigits(calcWaste)}
                      </span>
                    </div>
                  </div>

                  <SmartMoneyInput
                    label="مقدار مصرف خالص در دستور پخت یک پرس (گرم):"
                    value={calcWeightGrams}
                    onChange={(val) => setCalcWeightGrams(val)}
                    placeholder="۱۸۰"
                    suffix="گرم"
                  />

                  <SmartMoneyInput
                    label="قیمت فروش منو (تومان):"
                    value={calcSellingPrice}
                    onChange={(val) => setCalcSellingPrice(val)}
                    placeholder="۲۲۰,۰۰۰"
                    suffix="تومان"
                  />
                </div>

                {/* Real-time Calculated Outputs in High-Contrast Light Box */}
                <div className="space-y-4 p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-[var(--status-warning-text)]/30 dark:border-[var(--status-warning-text)] flex flex-col justify-between">
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-[var(--status-warning-text)] dark:text-amber-200 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[var(--brand-primary)]" />
                      <span>خروجی و محاسبات هوشمند سیستم</span>
                    </h4>

                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between items-center pb-2 border-b border-[var(--status-warning-text)] dark:border-[var(--status-warning-text)]/30">
                        <span className="text-[var(--text-primary)] dark:text-[var(--text-secondary)] font-medium">قیمت واقعی ماده اولیه پاک‌شده (هر کیلو):</span>
                        <span className="font-bold text-[var(--status-warning-text)] dark:text-amber-200">{formatToman(netCostPerKg).text}</span>
                      </div>

                      <div className="flex justify-between items-center pb-2 border-b border-[var(--status-warning-text)] dark:border-[var(--status-warning-text)]/30">
                        <span className="text-[var(--text-primary)] dark:text-[var(--text-secondary)] font-medium">قیمت خالص هر گرم:</span>
                        <span className="font-bold text-[var(--status-warning-text)] dark:text-amber-200">{formatToman(netCostPerGram).text}</span>
                      </div>

                      <div className="flex justify-between items-center pb-2 border-b border-[var(--status-warning-text)] dark:border-[var(--status-warning-text)]/30">
                        <span className="text-[var(--text-primary)] dark:text-[var(--text-secondary)] font-medium">هزینه مواد اولیه این پرس ({toPersianDigits(calcWeightGrams)} گرم):</span>
                        <span className="font-black text-[var(--status-error-text)] dark:text-[var(--status-error-text)] text-sm">{formatToman(recipeFoodCost).text}</span>
                      </div>

                      <div className="flex justify-between items-center pb-2 border-b border-[var(--status-warning-text)] dark:border-[var(--status-warning-text)]/30">
                        <span className="text-[var(--text-primary)] dark:text-[var(--text-secondary)] font-medium">درصد واقعی هزینه مواد اولیه:</span>
                        <span className="font-black text-[var(--status-success-text)] dark:text-[var(--status-success-text)] text-sm">٪{toPersianDigits(foodCostPercentage)}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-[var(--text-primary)] dark:text-[var(--text-secondary)] font-medium">سود ناخالص هر پرس:</span>
                        <span className="font-black text-[var(--status-success-text)] dark:text-emerald-300 text-sm">{formatToman(grossProfit).text}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-[var(--bg-card)] border border-[var(--status-warning-text)]/30 dark:border-[var(--status-warning-text)]/30 text-[11px] text-[var(--text-primary)] dark:text-[var(--text-primary)] font-medium leading-relaxed mt-4">
                    💡 <strong>تحلیل ماشینی:</strong> درصد هزینه مواد اولیه این غذا <strong>٪{toPersianDigits(foodCostPercentage)}</strong> است. اگر این عدد بالاتر از {toPersianDigits(35)}٪ باشد، سودآوری ضعیف است و باید یا قیمت فروش را افزایش دهید یا ضایعات و مقدار مصرف را کاهش دهید.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* FAQ Section */}
        <Card className="border border-[var(--border-subtle)] rounded-3xl shadow-xs overflow-hidden bg-[var(--bg-card)]">
          <CardHeader className="border-b border-[var(--border-subtle)] bg-[var(--bg-base)]">
            <CardTitle className="text-base font-black text-[var(--text-primary)] flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-[var(--brand-primary)]" />
              <span>پرسش‌های متداول و نکته‌های کلیدی کاربران</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 sm:p-7 space-y-3.5">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isOpen
                      ? 'border-[var(--brand-primary)]/40 shadow-xs'
                      : 'border-[var(--border-subtle)] hover:border-[var(--border-functional)]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full p-4.5 sm:p-5 text-right flex items-center justify-between gap-3 text-xs sm:text-sm font-black text-[var(--text-primary)] hover:bg-[var(--bg-base)] transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[var(--brand-primary)] shrink-0 opacity-80" />
                      <span>{faq.q}</span>
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-[var(--text-secondary)] shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-[var(--brand-primary)]' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-[var(--border-subtle)] bg-[var(--brand-primary-subtle)]/25 p-5 sm:p-6"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] shrink-0 mt-0.5">
                          <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                        <div className="space-y-1.5 flex-1">
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-[var(--brand-primary)] tracking-wide">
                            پاسخ کاربردی سیستم:
                          </span>
                          <p className="text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed font-medium">
                            {faq.a}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

