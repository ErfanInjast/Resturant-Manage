import React, { useState } from 'react';
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
  Layers,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { SmartMoneyInput } from '../ui/SmartMoneyInput';
import { formatToman, toPersianDigits } from '../../lib/utils';

type GuideChapterId = 'setup' | 'inventory' | 'menu' | 'sales' | 'analytics' | 'backup' | 'calculator' | 'faq';

interface ChapterDef {
  id: GuideChapterId;
  title: string;
  shortDesc: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
}

export const GuideManager: React.FC = () => {
  const { setActiveTab } = useAppStore();
  const [activeChapter, setActiveChapter] = useState<GuideChapterId>('setup');
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

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
      id: 'setup',
      title: '۱. تنظیمات و هزینه ثابت',
      shortDesc: 'محاسبه هزینه اجاره، حقوق، قبوض و نرخ سرانه هر دقیقه',
      icon: Settings,
      badge: 'پایه',
    },
    {
      id: 'inventory',
      title: '۲. انبار و درصد افت',
      shortDesc: 'مدیریت موجودی، واحد سنجش و درصد دورریز مواد اولیه',
      icon: Boxes,
      badge: 'انبارداری',
    },
    {
      id: 'menu',
      title: '۳. رسپی و قیمت‌گذاری',
      shortDesc: 'تعریف دستور پخت، بهای مواد و قیمت‌گذاری علمی',
      icon: UtensilsCrossed,
      badge: 'هسته سیستم',
    },
    {
      id: 'sales',
      title: '۴. ثبت فروش و ضایعات',
      shortDesc: 'کسر خودکار انبار، ثبت فروش روزانه و ضایعات ریالی',
      icon: Receipt,
      badge: 'روزانه',
    },
    {
      id: 'analytics',
      title: '۵. تحلیل سود و منو',
      shortDesc: 'سود و زیان، بهای اولیه (زیر ۶۵٪) و ماتریس مهندسی منو',
      icon: PieChart,
      badge: 'گزارشات',
    },
    {
      id: 'backup',
      title: '۶. امنیت و پشتیبان',
      shortDesc: 'ذخیره ۱۰۰٪ آفلاین در مرورگر و دریافت فایل پشتیبان',
      icon: ShieldCheck,
      badge: 'امنیت داده',
    },
    {
      id: 'calculator',
      title: '۷. ماشین‌حساب زنده',
      shortDesc: 'شبیه‌ساز آنی محاسبه قیمت تمام‌شده، افت و سود',
      icon: Calculator,
      badge: 'تعاملی',
    },
    {
      id: 'faq',
      title: '۸. پرسش‌های متداول',
      shortDesc: 'پاسخ به سوالات پرتکرار و نکات کلیدی نرم‌افزار',
      icon: HelpCircle,
      badge: 'راهنما',
    },
  ];

  const faqs = [
    {
      q: 'آیا برای استفاده از این سیستم نیاز به اتصال به اینترنت دارم؟',
      a: 'خیر! تمامی اطلاعات، انبار، قیمت‌گذاری و گزارش‌های مالی شما ۱۰۰٪ به صورت محلی در حافظه امن مرورگرتان ذخیره می‌شوند. هیچ داده‌ای به سرور خارجی ارسال نمی‌شود و حتی در حالت آفلاین کامل، سیستم بدون هیچ نقصی کار می‌کند.',
    },
    {
      q: 'درصد افت و ضایعات پاک‌کردن ماده اولیه چیست و چرا اهمیت دارد؟',
      a: 'وقتی مثلاً ۱۰ کیلوگرم فیله مرغ یا گوشت می‌خرید، پس از پاک‌کردن، گرفتن چربی و استخوان، ممکن است فقط ۸.۵ کیلوگرم گوشت قابل استفاده باقی بماند (۱۵٪ افت). اگر این ۱۵٪ را حساب نکنید، قیمت تمام‌شده غذای خود را کمتر از واقعیت برآورد کرده و متضرر می‌شوید. سیستم ما با کسر درصد افت، قیمت خالص واقعی هر گرم را محاسبه می‌کند.',
    },
    {
      q: 'تفاوت هزینه مواد اولیه و سود ناخالص چیست؟',
      a: 'هزینه مواد اولیه یعنی مجموع هزینه ریالی مواد اولیه مصرف‌شده در یک پرس غذا. اگر هزینه مواد پیتزا ۵۰ هزار تومان باشد و آن را ۱۵۰ هزار تومان بفروشید، سود ناخالص شما ۱۰۰ هزار تومان (درصد هزینه مواد ۳۳.۳٪) است.',
    },
    {
      q: 'بهای اولیه تولید (Prime Cost) چیست و استاندارد آن چقدر است؟',
      a: 'بهای اولیه حاصل‌جمع دو مؤلفه مستقیم است: هزینه مواد اولیه مصرفی + هزینه نیروی کار و دستمزد. در رستوران‌داری مدرن، مجموع این دو نسبت به درآمد فروش باید زیر ۶۵٪ (ایده‌آل بین ۵۵٪ تا ۶۰٪) باشد تا پوشش هزینه‌های ثابت و سود خالص تضمین گردد.',
    },
    {
      q: 'اگر مرورگر را پاک کنم یا ویندوز تعویض شود چه اتفاقی برای داده‌ها می‌افتد؟',
      a: 'چون داده‌ها در مرورگر ذخیره می‌شوند، حتماً هفتگی از بخش «تنظیمات» گزینه «دانلود فایل پشتیبان» را بزنید. در صورت تعویض سیستم، با کلیک روی بازیابی پشتیبان، تمام اطلاعات بلافاصله بازمی‌گردند.',
    },
  ];

  // Filter chapters based on search query if entered
  const filteredChapters = chapters.filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.shortDesc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-[var(--brand-primary-subtle)] text-[var(--brand-primary)] shrink-0 border border-[var(--brand-primary)]/20">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-[var(--text-primary)]">
                راهنمای جامع و مدیریت مالی رستوران
              </h1>
              <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">
                راهنمای گام‌به‌گام و ابزارهای تحلیلی برای قیمت‌گذاری علمی و کنترل بهای تمام‌شده
              </p>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative w-full md:w-72">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در سرفصل‌ها..."
              className="w-full h-10 pr-9 pl-4 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-all"
            />
          </div>
        </div>
      </div>

      {/* Chapters Horizontal Tab Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {filteredChapters.map((ch) => {
          const Icon = ch.icon;
          const isActive = activeChapter === ch.id;
          return (
            <button
              key={ch.id}
              onClick={() => setActiveChapter(ch.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-black transition-all shrink-0 cursor-pointer border ${
                isActive
                  ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] shadow-2xs'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-base)]'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{ch.title}</span>
            </button>
          );
        })}
      </div>

      {/* Active Chapter Content */}
      <div className="space-y-6">
        {/* Chapter 1: Setup & Fixed Costs */}
        {activeChapter === 'setup' && (
          <Card className="border border-[var(--border-subtle)] bg-[var(--bg-card)] rounded-2xl overflow-hidden shadow-2xs">
            <CardHeader className="border-b border-[var(--border-subtle)] pb-4 bg-[var(--bg-base)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[var(--brand-primary-subtle)] text-[var(--brand-primary)] shrink-0 border border-[var(--brand-primary)]/20">
                    <Settings className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-black text-[var(--text-primary)]">
                      تنظیمات اولیه و فرمول دقیق هزینه‌های ثابت ماهانه
                    </CardTitle>
                    <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">
                      محاسبه دقیق نرخ سرانه هر دقیقه کاری جهت اعمال سربار بر هر سفارش
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => setActiveTab('settings')}
                  className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-xs font-bold rounded-xl shrink-0"
                >
                  <span>ورود به تنظیمات</span>
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-[var(--bg-base)] border border-[var(--border-subtle)] space-y-2.5">
                  <h4 className="font-black text-xs text-[var(--text-primary)] flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[var(--brand-primary)]" />
                    <span>اقلام تشکیل‌دهنده هزینه‌های ثابت:</span>
                  </h4>
                  <ul className="space-y-1.5 text-xs text-[var(--text-secondary)] font-medium">
                    <li className="flex items-center gap-2">• اجاره‌بهای ماهانه ملک رستوران یا کافه</li>
                    <li className="flex items-center gap-2">• حقوق و دستمزد ثابت پرسنل، بیمه و مزایا</li>
                    <li className="flex items-center gap-2">• قبوض آب، برق، گاز، تلفن و اینترنت</li>
                    <li className="flex items-center gap-2">• استهلاک تجهیزات، تعمیرات و تبلیغات مستمر</li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--brand-primary-subtle)] border border-[var(--brand-primary)]/20 space-y-2.5">
                  <h4 className="font-black text-xs text-[var(--text-primary)] flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-[var(--brand-primary)]" />
                    <span>فرمول نرخ سربار هر دقیقه کاری:</span>
                  </h4>
                  <div className="p-2.5 rounded-xl bg-[var(--bg-card)] text-[11px] font-black text-[var(--brand-primary)] border border-[var(--brand-primary)]/30 text-center">
                    نرخ دقیقه = کل هزینه‌های ماهانه ÷ (روزهای کاری × ساعات روزانه × ۶۰)
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] font-medium">
                    مثال: ۵۰ میلیون هزینه ÷ (۲۶ روز × ۱۰ ساعت × ۶۰) = ۳,۲۰۵ تومان در هر دقیقه.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--status-warning-bg)] border border-[var(--status-warning-text)]/20 flex items-start gap-2.5 text-xs text-[var(--status-warning-text)]">
                <Lightbulb className="h-4 w-4 shrink-0 mt-0.5" />
                <p className="font-medium">
                  <strong>نکته کاربردی:</strong> روزهای کاری واقعی ماه را در تنظیمات دقیق وارد کنید تا هزینه به ازای ساعات واقعی فعالیت محاسبه شود.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chapter 2: Inventory & Waste */}
        {activeChapter === 'inventory' && (
          <Card className="border border-[var(--border-subtle)] bg-[var(--bg-card)] rounded-2xl overflow-hidden shadow-2xs">
            <CardHeader className="border-b border-[var(--border-subtle)] pb-4 bg-[var(--bg-base)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] shrink-0 border border-[var(--status-warning-text)]/20">
                    <Boxes className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-black text-[var(--text-primary)]">
                      انبارداری، واحد سنجش و درصد افت مواد اولیه
                    </CardTitle>
                    <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">
                      محاسبه قیمت واقعی مصرفی پس از کسر ضایعات و دورریز پاک‌کردن
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => setActiveTab('inventory')}
                  className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-xs font-bold rounded-xl shrink-0"
                >
                  <span>ورود به انبار</span>
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-6 space-y-5">
              <div className="p-4 rounded-2xl bg-[var(--status-warning-bg)] border border-[var(--status-warning-text)]/20 space-y-2.5">
                <div className="flex items-center gap-2 text-[var(--status-warning-text)] font-black text-xs">
                  <TrendingUp className="h-4 w-4" />
                  <span>فرمول قیمت واقعی هر گرم پس از کسر افت:</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[var(--bg-card)] text-[var(--status-warning-text)] font-bold text-xs text-center border border-[var(--status-warning-text)]/30">
                  قیمت هر گرم خالص = (قیمت خرید هر کیلو ÷ ((۱۰۰ - درصد افت) ÷ ۱۰۰)) ÷ ۱۰۰۰
                </div>
                <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">
                  <strong>مثال عملی:</strong> ۱ کیلوگرم گوشت به قیمت ۵۰۰,۰۰۰ تومان با ۲۰٪ دورریز پاک‌کردن، قیمت خالص واقعی آن ۶۲۵,۰۰۰ تومان در هر کیلو (۶۲۵ تومان در هر گرم) است.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)] space-y-1">
                  <span className="text-[10px] font-bold text-[var(--text-secondary)]">۱. ثبت خرید</span>
                  <p className="font-bold text-[var(--text-primary)]">ثبت فاکتورهای جدید با کسر خودکار</p>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)] space-y-1">
                  <span className="text-[10px] font-bold text-[var(--status-warning-text)]">۲. میانگین موزون</span>
                  <p className="font-bold text-[var(--text-primary)]">محاسبه نرخ متوسط خریدها (WAC)</p>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)] space-y-1">
                  <span className="text-[10px] font-bold text-[var(--brand-primary)]">۳. تاریخچه قیمت</span>
                  <p className="font-bold text-[var(--text-primary)]">پایش نموداری نوسانات قیمت تامین</p>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)] space-y-1">
                  <span className="text-[10px] font-bold text-[var(--status-success-text)]">۴. هشدار کمبود</span>
                  <p className="font-bold text-[var(--text-primary)]">آلارم رسیدن به حداقل نقطه سفارش</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chapter 3: Recipe & Pricing */}
        {activeChapter === 'menu' && (
          <Card className="border border-[var(--border-subtle)] bg-[var(--bg-card)] rounded-2xl overflow-hidden shadow-2xs">
            <CardHeader className="border-b border-[var(--border-subtle)] pb-4 bg-[var(--bg-base)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[var(--status-success-bg)] text-[var(--status-success-text)] shrink-0 border border-[var(--status-success-text)]/20">
                    <UtensilsCrossed className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-black text-[var(--text-primary)]">
                      آنالیز دستور پخت و قیمت‌گذاری منو
                    </CardTitle>
                    <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">
                      فرمول‌نویسی رسپی، بهای مواد اولیه و قیمت‌گذاری بر اساس حاشیه سود هدف
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => setActiveTab('menu')}
                  className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-xs font-bold rounded-xl shrink-0"
                >
                  <span>آنالیز منو</span>
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-[var(--status-success-bg)] border border-[var(--status-success-text)]/20 space-y-2">
                  <h4 className="font-black text-xs text-[var(--status-success-text)] flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    <span>محاسبه خودکار بهای مواد (Food Cost)</span>
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">
                    سیستم هزینه هر یک از مواد اولیه را بر اساس مقدار مصرفی (گرم یا سی‌سی) در دستور پخت ضرب کرده و بهای تمام‌شده هر پرس را لحظه‌ای محاسبه می‌کند.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--bg-base)] border border-[var(--border-subtle)] space-y-2">
                  <h4 className="font-black text-xs text-[var(--text-primary)] flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-[var(--status-success-text)]" />
                    <span>قیمت پیشنهادی بر اساس درصد هدف</span>
                  </h4>
                  <div className="p-2.5 rounded-xl bg-[var(--bg-card)] text-[11px] font-black text-[var(--status-success-text)] border border-[var(--status-success-text)]/30 text-center">
                    قیمت پیشنهادی = هزینه کل مواد ÷ (درصد هدف فودکاست ÷ ۱۰۰)
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] font-medium">
                    استاندارد جهانی درصد بهای مواد بین ۲۸٪ تا ۳۵٪ است.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chapter 4: Sales & Daily Logs */}
        {activeChapter === 'sales' && (
          <Card className="border border-[var(--border-subtle)] bg-[var(--bg-card)] rounded-2xl overflow-hidden shadow-2xs">
            <CardHeader className="border-b border-[var(--border-subtle)] pb-4 bg-[var(--bg-base)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[var(--brand-primary-subtle)] text-[var(--brand-primary)] shrink-0 border border-[var(--brand-primary)]/20">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-black text-[var(--text-primary)]">
                      ثبت فروش روزانه و مدیریت ضایعات
                    </CardTitle>
                    <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">
                      کسر هوشمند انبار در هنگام فروش و ثبت خسارات ریالی ضایعات
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => setActiveTab('sales')}
                  className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-xs font-bold rounded-xl shrink-0"
                >
                  <span>ثبت فروش</span>
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-[var(--bg-base)] border border-[var(--border-subtle)] space-y-1.5">
                  <h4 className="font-black text-xs text-[var(--brand-primary)]">ثبت فاکتورهای فروش روزانه</h4>
                  <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">
                    با ثبت فروش هر محصول، مواد اولیه تشکیل‌دهنده آن بر اساس رسپی به طور خودکار از موجودی انبار کسر می‌شوند.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--status-error-bg)] border border-[var(--status-error-text)]/20 space-y-1.5">
                  <h4 className="font-black text-xs text-[var(--status-error-text)]">ثبت ضایعات و خسارت</h4>
                  <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">
                    مواد فاسد شده، سوخته یا آسیب‌دیده را در بخش ضایعات ثبت کنید تا اثر ریالی آن در سود و زیان محاسبه شود.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chapter 5: Analytics & Menu Matrix */}
        {activeChapter === 'analytics' && (
          <Card className="border border-[var(--border-subtle)] bg-[var(--bg-card)] rounded-2xl overflow-hidden shadow-2xs">
            <CardHeader className="border-b border-[var(--border-subtle)] pb-4 bg-[var(--bg-base)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[var(--brand-primary-subtle)] text-[var(--brand-primary)] shrink-0 border border-[var(--brand-primary)]/20">
                    <PieChart className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-black text-[var(--text-primary)]">
                      تحلیل صورت سود و زیان و ماتریس ۴ گانه منو
                    </CardTitle>
                    <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">
                      طبقه‌بندی علمی غذاها جهت استراتژی قیمت‌گذاری و حذف اقلام کم‌بازده
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => setActiveTab('analytics')}
                  className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-xs font-bold rounded-xl shrink-0"
                >
                  <span>ماتریس سودآوری</span>
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-6 space-y-5">
              {/* Prime Cost Highlight */}
              <div className="p-4 rounded-2xl bg-[var(--status-warning-bg)] border border-[var(--status-warning-text)]/20 space-y-1.5">
                <h4 className="font-black text-xs text-[var(--status-warning-text)] flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  <span>استاندارد بهای اولیه تولید (Prime Cost):</span>
                </h4>
                <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">
                  بهای اولیه = سهم مواد مصرفی + دستمزد پرسنل. مجموع این دو شاخص باید همواره <strong>زیر ۶۵٪ درآمد فروش</strong> باشد تا پوشش هزینه‌های ثابت (اجاره، قبوض) و سود خالص مجموعه تضمین گردد.
                </p>
              </div>

              {/* 4 Quadrants Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-[var(--status-warning-bg)] border border-[var(--status-warning-text)]/20 space-y-1">
                  <span className="font-black text-[var(--status-warning-text)]">🌟 محصولات طلایی</span>
                  <p className="text-[11px] text-[var(--text-secondary)]">سود بالا + فروش بالا. ستون اصلی سودآوری و پرچمدار منو.</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-[var(--brand-primary-subtle)] border border-[var(--brand-primary)]/20 space-y-1">
                  <span className="font-black text-[var(--brand-primary)]">🔥 پرفروش‌های محبوب</span>
                  <p className="text-[11px] text-[var(--text-secondary)]">فروش بالا + حاشیه سود کمتر. نیازمند تعدیل فودکاست یا قیمت.</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-[var(--bg-base)] border border-[var(--border-subtle)] space-y-1">
                  <span className="font-black text-[var(--text-primary)]">💡 فرصت‌های رشد</span>
                  <p className="text-[11px] text-[var(--text-secondary)]">سود فوق‌العاده + فروش کم. نیازمند معرفی بیشتر و پروموشن.</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-[var(--status-error-bg)] border border-[var(--status-error-text)]/20 space-y-1">
                  <span className="font-black text-[var(--status-error-text)]">⚠️ نیازمند بهینه‌سازی</span>
                  <p className="text-[11px] text-[var(--text-secondary)]">سود کم + فروش کم. منبع خواب سرمایه انبار و نیازمند اصلاح یا حذف.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chapter 6: Backup & Offline Security */}
        {activeChapter === 'backup' && (
          <Card className="border border-[var(--border-subtle)] bg-[var(--bg-card)] rounded-2xl overflow-hidden shadow-2xs">
            <CardHeader className="border-b border-[var(--border-subtle)] pb-4 bg-[var(--bg-base)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[var(--status-error-bg)] text-[var(--status-error-text)] shrink-0 border border-[var(--status-error-text)]/20">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-black text-[var(--text-primary)]">
                      پشتیبان‌گیری و ذخیره ۱۰۰٪ آفلاین
                    </CardTitle>
                    <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">
                      اطلاعات شما بدون نیاز به اینترنت در مرورگرتان حفظ و قابل خروجی‌گیری است
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => setActiveTab('settings')}
                  className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-xs font-bold rounded-xl shrink-0"
                >
                  <span>ورود به پشتیبان‌گیری</span>
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-6 space-y-3 text-xs text-[var(--text-secondary)] font-medium leading-relaxed">
              <p>
                تمامی سوابق مالی، انبار و منو در مرورگر شما ذخیره می‌شود. جهت پیشگیری از حذف ناخواسته، هفتگی از بخش «تنظیمات» فایل پشتیبان دریافت کنید.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Chapter 7: Interactive Simulator */}
        {activeChapter === 'calculator' && (
          <Card className="border border-[var(--brand-primary)]/30 rounded-2xl overflow-hidden bg-[var(--bg-card)] shadow-2xs">
            <CardHeader className="border-b border-[var(--border-subtle)] pb-4 bg-[var(--bg-base)]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[var(--brand-primary)] text-white shrink-0">
                  <Calculator className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-black text-[var(--text-primary)]">
                    ماشین‌حساب تعاملی فرمول‌های فودکاست و درصد افت
                  </CardTitle>
                  <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">
                    تست زنده تاثیر درصد افت و وزن مصرفی بر قیمت تمام‌شده و سود ناخالص غذا
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Inputs */}
                <div className="space-y-4 p-4.5 rounded-2xl bg-[var(--bg-base)] border border-[var(--border-subtle)]">
                  <h4 className="text-xs font-black text-[var(--text-primary)] flex items-center gap-2">
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
                    <label className="block text-xs font-bold text-[var(--text-primary)]">
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
                      <span className="text-xs font-black w-12 text-center py-1 px-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)]">
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

                {/* Outputs */}
                <div className="space-y-4 p-4.5 rounded-2xl bg-[var(--status-warning-bg)] border border-[var(--status-warning-text)]/20 flex flex-col justify-between">
                  <div className="space-y-3.5">
                    <h4 className="text-xs font-black text-[var(--status-warning-text)] flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[var(--brand-primary)]" />
                      <span>خروجی محاسبات زنده سیستم</span>
                    </h4>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between items-center pb-2 border-b border-[var(--status-warning-text)]/20">
                        <span className="text-[var(--text-secondary)] font-medium">قیمت واقعی ماده اولیه پاک‌شده (هر کیلو):</span>
                        <span className="font-bold text-[var(--status-warning-text)]">{formatToman(netCostPerKg).text}</span>
                      </div>

                      <div className="flex justify-between items-center pb-2 border-b border-[var(--status-warning-text)]/20">
                        <span className="text-[var(--text-secondary)] font-medium">قیمت خالص هر گرم:</span>
                        <span className="font-bold text-[var(--status-warning-text)]">{formatToman(netCostPerGram).text}</span>
                      </div>

                      <div className="flex justify-between items-center pb-2 border-b border-[var(--status-warning-text)]/20">
                        <span className="text-[var(--text-secondary)] font-medium">بهای تمام‌شده این پرس ({toPersianDigits(calcWeightGrams)} گرم):</span>
                        <span className="font-black text-[var(--status-error-text)] text-sm">{formatToman(recipeFoodCost).text}</span>
                      </div>

                      <div className="flex justify-between items-center pb-2 border-b border-[var(--status-warning-text)]/20">
                        <span className="text-[var(--text-secondary)] font-medium">درصد واقعی بهای مواد:</span>
                        <span className="font-black text-[var(--status-success-text)] text-sm">٪{toPersianDigits(foodCostPercentage)}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-[var(--text-secondary)] font-medium">سود ناخالص هر پرس:</span>
                        <span className="font-black text-[var(--status-success-text)] text-sm">{formatToman(grossProfit).text}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--status-warning-text)]/20 text-[11px] text-[var(--text-primary)] font-medium leading-relaxed">
                    💡 درصد بهای مواد این غذا <strong>٪{toPersianDigits(foodCostPercentage)}</strong> است. (هدف استاندارد: زیر ۳۵٪).
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chapter 8: FAQs */}
        {activeChapter === 'faq' && (
          <Card className="border border-[var(--border-subtle)] bg-[var(--bg-card)] rounded-2xl overflow-hidden shadow-2xs">
            <CardHeader className="border-b border-[var(--border-subtle)] pb-4 bg-[var(--bg-base)]">
              <CardTitle className="text-base font-black text-[var(--text-primary)] flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-[var(--brand-primary)]" />
                <span>پرسش‌های متداول و پاسخ‌های کاربردی</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 sm:p-6 space-y-3">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <div
                    key={index}
                    className={`rounded-2xl border transition-all overflow-hidden ${
                      isOpen
                        ? 'border-[var(--brand-primary)]/40 shadow-2xs'
                        : 'border-[var(--border-subtle)] hover:border-[var(--border-functional)]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                      className="w-full p-4 text-right flex items-center justify-between gap-3 text-xs sm:text-sm font-black text-[var(--text-primary)] hover:bg-[var(--bg-base)] transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[var(--brand-primary)] shrink-0" />
                        <span>{faq.q}</span>
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-[var(--text-secondary)] shrink-0 transition-transform ${
                          isOpen ? 'rotate-180 text-[var(--brand-primary)]' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-base)] p-4 sm:p-5">
                        <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed font-medium">
                          {faq.a}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
