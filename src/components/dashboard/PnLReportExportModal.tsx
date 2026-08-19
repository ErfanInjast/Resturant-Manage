import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Trash2,
  Building2,
  CheckCircle2,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import { formatToman, formatNumber, roundCurrency, toPersianDigits, restoreAppInteractivity } from '../../lib/utils';
import { formatJalali, formatJalaliReadable } from '../../lib/jalali';
import type { AppSettings, DailySalesRecord, WasteLog } from '../../types';

interface PnLReportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  filterTitle: string;
  filterSubtitle: string;
  filteredSalesRecords: DailySalesRecord[];
  filteredWasteLogs: WasteLog[];
  metrics: {
    totalRevenue: number;
    totalCOGS: number;
    totalLaborCost?: number;
    loggedWaste: number;
    salesWaste: number;
    totalWaste: number;
    periodOverhead: number;
    grossProfit: number;
    netProfit: number;
    foodCostPercent: number;
    laborCostPercent?: number;
    primeCostPercent?: number;
    netMarginPercent: number;
    periodDaysCount: number;
  };
  topSoldItems: {
    menuItemId: number;
    name: string;
    totalQty: number;
    totalRev: number;
    totalCost: number;
  }[];
}

export const PnLReportExportModal: React.FC<PnLReportExportModalProps> = ({
  isOpen,
  onClose,
  settings,
  filterTitle,
  filterSubtitle,
  filteredSalesRecords,
  filteredWasteLogs,
  metrics,
  topSoldItems,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const restaurantName = settings.restaurantName || 'مجموعه رستورانی و کافه';
  const issueDateStr = formatJalali(new Date(), 'long');
  const issueTimeStr = toPersianDigits(new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }));

  // Guarantee body pointer-events restoration on modal unmount or print exit
  React.useEffect(() => {
    if (!isOpen) return;

    return () => {
      restoreAppInteractivity();
    };
  }, [isOpen]);

  const handleTriggerPrint = () => {
    const source = document.getElementById('pnl-report-printable-area');
    if (!source) return;

    setIsGenerating(true);
    restoreAppInteractivity();

    // Create or locate the standalone print portal at document root
    let printPortal = document.getElementById('pnl-print-portal');
    if (!printPortal) {
      printPortal = document.createElement('div');
      printPortal.id = 'pnl-print-portal';
      document.body.appendChild(printPortal);
    }

    // Populate print portal with exact content clone
    printPortal.innerHTML = source.innerHTML;

    // Trigger browser print (Save as PDF / Print)
    setTimeout(() => {
      try {
        window.print();
      } catch (err) {
        console.error('Print error:', err);
      } finally {
        setTimeout(() => {
          if (printPortal) {
            printPortal.innerHTML = '';
          }
          setIsGenerating(false);
          restoreAppInteractivity();
        }, 500);
      }
    }, 150);
  };

  const netProfitToman = formatToman(metrics.netProfit);
  const grossProfitToman = formatToman(metrics.grossProfit);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="گزارش رسمی و خروجی صورت سود و زیان"
      description="پیش‌نمایش کامل داکیومنت جهت چاپ یا دانلود فایل پی‌دی‌اف با دیزاین رسمی"
      maxWidth="5xl"
    >
      {/* Top Export Toolbar */}
      <div className="flex flex-col gap-2 p-3.5 bg-[var(--bg-base)] dark:bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] no-print">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-black text-[var(--text-primary)] dark:text-[var(--text-secondary)]">
            <FileText className="h-4 w-4 text-[var(--brand-primary)]" />
            <span>خروجی رسمی و وکتور بدون افت کیفیت جهت چاپ یا دانلود PDF</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={handleTriggerPrint}
              disabled={isGenerating}
              className="flex-1 sm:flex-none h-9 text-xs font-bold gap-1.5 rounded-xl border-[var(--border-functional)] dark:border-[var(--border-functional)] cursor-pointer"
            >
              <Printer className="h-4 w-4 text-[var(--text-secondary)] dark:text-[var(--text-secondary)]" />
              <span>چاپ مستقیم / پرینت</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              disabled={isGenerating}
              onClick={handleTriggerPrint}
              className="flex-1 sm:flex-none h-9 text-xs font-black gap-1.5 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white shadow-md shadow-[var(--brand-primary)]/20 cursor-pointer transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>{isGenerating ? 'در حال آماده‌سازی...' : 'دانلود فایل PDF (خروجی وکتور)'}</span>
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-[var(--status-warning-text)] bg-[var(--status-warning-bg)] px-3 py-1.5 rounded-xl border border-[var(--status-warning-text)]/20 font-bold">
          <Info className="h-3.5 w-3.5 shrink-0 text-[var(--status-warning-text)] dark:text-[var(--status-warning-text)]" />
          <span>راهنما: در پنجره باز شده، مقصد (Destination) را روی <strong>"ذخیره به عنوان PDF"</strong> یا <strong>"Save as PDF"</strong> قرار دهید تا فایل پی‌دی‌اف وکتور با بالاترین کیفیت در دستگاه شما ذخیره شود.</span>
        </div>
      </div>

      {/* Printable Paper Document Container */}
      <div className="overflow-x-auto pb-2">
        <div
          id="pnl-report-printable-area"
          className="mx-auto my-2 w-full max-w-[794px] bg-white text-[var(--text-primary)] p-5 sm:p-7 rounded-xl border border-[var(--border-subtle)] shadow-lg dir-rtl text-right font-sans box-border"
          style={{ backgroundColor: '#ffffff', color: '#1c1917' }}
        >
          {/* Document Header */}
          <div className="flex items-start justify-between border-b-2 border-stone-800 pb-3 mb-3.5">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-[var(--brand-primary)]" />
                <h1 className="text-lg sm:text-xl font-black text-[var(--text-primary)]">{restaurantName}</h1>
              </div>
              <p className="text-[11px] sm:text-xs font-bold text-[var(--text-secondary)] mt-0.5">
                سیستم جامع مدیریت مالی و بهای تمام شده مطبخ و کافه
              </p>
            </div>

            <div className="text-left bg-[var(--bg-base)] p-2.5 sm:p-3 rounded-xl border border-[var(--border-subtle)]">
              <h2 className="text-sm sm:text-base font-black text-[var(--brand-primary)]">صورت سود و زیان</h2>
              <div className="text-[10px] sm:text-[11px] font-bold text-[var(--text-secondary)] mt-0.5 space-y-0.5">
                <div>تاریخ صدور: {issueDateStr} - ساعت {issueTimeStr}</div>
                <div>بازه گزارش: <span className="font-extrabold text-[var(--text-primary)]">{filterTitle}</span></div>
              </div>
            </div>
          </div>

          {/* Subtitle Badge */}
          <div className="mb-3.5 p-2 sm:p-2.5 bg-amber-50/80 rounded-xl border border-[var(--status-warning-text)]/30 flex items-center justify-between text-[11px] sm:text-xs font-bold text-[var(--status-warning-text)]">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[var(--status-warning-text)]" />
              <span>مشخصات بازه گزارش‌گیری: {filterSubtitle || filterTitle}</span>
            </span>
            <span>تعداد روزهای محاسبه‌شده: {toPersianDigits(metrics.periodDaysCount)} روز</span>
          </div>

          {/* Key Metric Summary Boxes */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2 mb-3.5">
            <div className="p-2 bg-emerald-50/60 rounded-xl border border-[var(--status-success-text)]/30">
              <div className="text-[9px] font-bold text-[var(--status-success-text)]">فروش و درآمد کل</div>
              <div className="text-xs font-black text-emerald-950 mt-0.5">
                {formatToman(metrics.totalRevenue).text}
              </div>
              <div className="text-[9px] text-[var(--status-success-text)] mt-0.5 font-bold">
                {toPersianDigits(filteredSalesRecords.length)} روز ثبت
              </div>
            </div>

            <div className="p-2 bg-amber-50/60 rounded-xl border border-[var(--status-warning-text)]/30">
              <div className="text-[9px] font-bold text-[var(--status-warning-text)]">بهای مواد اولیه</div>
              <div className="text-xs font-black text-[var(--status-warning-text)] mt-0.5">
                {formatToman(metrics.totalCOGS).text}
              </div>
              <div className="text-[9px] text-[var(--status-warning-text)] mt-0.5 font-bold">
                درصد مواد: {toPersianDigits(roundCurrency(metrics.foodCostPercent))}٪
              </div>
            </div>

            <div className="p-2 bg-blue-50/60 rounded-xl border border-blue-200">
              <div className="text-[9px] font-bold text-blue-700">هزینه نیروی کار</div>
              <div className="text-xs font-black text-blue-950 mt-0.5">
                {toPersianDigits(roundCurrency(metrics.laborCostPercent ?? 0))}٪
              </div>
              <div className="text-[9px] text-blue-700 mt-0.5 font-bold">
                مبلغ: {formatToman(metrics.totalLaborCost ?? 0).text}
              </div>
            </div>

            <div className="p-2 bg-violet-50/60 rounded-xl border border-violet-200">
              <div className="text-[9px] font-bold text-violet-700">بهای اولیه تولید</div>
              <div className="text-xs font-black text-violet-950 mt-0.5">
                {toPersianDigits(roundCurrency(metrics.primeCostPercent ?? 0))}٪
              </div>
              <div className="text-[9px] text-violet-700 mt-0.5 font-bold">
                هدف: ۵۵٪ تا ۶۵٪
              </div>
            </div>

            <div className="p-2 bg-rose-50/60 rounded-xl border border-[var(--status-error-text)]/30">
              <div className="text-[9px] font-bold text-[var(--status-error-text)]">ضایعات و سربار</div>
              <div className="text-xs font-black text-rose-950 mt-0.5">
                {formatToman(metrics.periodOverhead + metrics.totalWaste).text}
              </div>
              <div className="text-[9px] text-[var(--status-error-text)] mt-0.5 font-bold">
                ضایعات: {formatToman(metrics.totalWaste).text}
              </div>
            </div>

            <div className={`p-2 rounded-xl border ${netProfitToman.isNegative ? 'bg-rose-50/80 border-[var(--status-error-text)]/30' : 'bg-emerald-50/80 border-[var(--status-success-text)]/30'}`}>
              <div className={`text-[9px] font-bold ${netProfitToman.isNegative ? 'text-[var(--status-error-text)]' : 'text-[var(--status-success-text)]'}`}>سود خالص دوره</div>
              <div className={`text-xs font-black mt-0.5 ${netProfitToman.isNegative ? 'text-[var(--status-error-text)]' : 'text-[var(--status-success-text)]'}`}>
                {netProfitToman.text}
              </div>
              <div className={`text-[9px] mt-0.5 font-bold ${netProfitToman.isNegative ? 'text-[var(--status-error-text)]' : 'text-[var(--status-success-text)]'}`}>
                حاشیه: {toPersianDigits(roundCurrency(metrics.netMarginPercent))}٪
              </div>
            </div>
          </div>

          {/* Section 1: Detailed PnL Table */}
          <div className="mb-3.5">
            <h3 className="text-xs font-extrabold text-[var(--text-primary)] mb-1.5 border-r-4 border-[var(--brand-primary)] pr-2">
              جدول ریز محاسبات صورت سود و زیان
            </h3>
            <table className="w-full text-xs text-right border-collapse border border-[var(--border-subtle)] rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-[var(--bg-base)] text-[var(--text-primary)] font-extrabold text-[10px] sm:text-[11px] border-b border-[var(--border-subtle)]">
                  <th className="p-2 border-l border-[var(--border-subtle)]">عنوان ردیف مالی</th>
                  <th className="p-2 border-l border-[var(--border-subtle)] text-center">نوع حساب</th>
                  <th className="p-2 border-l border-[var(--border-subtle)] text-left">مبلغ (تومان)</th>
                  <th className="p-2 text-center">سهم از درآمد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 font-medium text-[10px] sm:text-[11px] text-[var(--text-primary)]">
                {/* Revenue */}
                <tr className="bg-emerald-50/30 font-extrabold">
                  <td className="p-2 border-l border-[var(--border-subtle)] text-emerald-950">۱. کل فروش و درآمدهای عملیاتی</td>
                  <td className="p-2 border-l border-[var(--border-subtle)] text-center text-[var(--status-success-text)]">درآمد</td>
                  <td className="p-2 border-l border-[var(--border-subtle)] text-left text-emerald-950 font-black">{formatToman(metrics.totalRevenue).text}</td>
                  <td className="p-2 text-center text-emerald-900 font-black">۱۰۰٪</td>
                </tr>

                {/* COGS */}
                <tr>
                  <td className="p-2 border-l border-[var(--border-subtle)] pr-4 sm:pr-5">۲. بهای تمام شده مواد اولیه مصرفی</td>
                  <td className="p-2 border-l border-[var(--border-subtle)] text-center text-[var(--text-secondary)]">هزینه مستقیم</td>
                  <td className="p-2 border-l border-[var(--border-subtle)] text-left font-bold text-[var(--status-warning-text)]">
                    {formatToman(metrics.totalCOGS).text}
                  </td>
                  <td className="p-2 text-center font-bold text-[var(--text-secondary)]">{toPersianDigits(roundCurrency(metrics.foodCostPercent))}٪</td>
                </tr>

                {/* Gross Profit */}
                <tr className="bg-[var(--bg-base)]/80 font-black border-t-2 border-[var(--border-functional)]">
                  <td className="p-2 border-l border-[var(--border-subtle)]">سود ناخالص</td>
                  <td className="p-2 border-l border-[var(--border-subtle)] text-center text-[var(--text-secondary)]">میانی</td>
                  <td className="p-2 border-l border-[var(--border-subtle)] text-left text-stone-950">{grossProfitToman.text}</td>
                  <td className="p-2 text-center text-[var(--text-primary)]">
                    {metrics.totalRevenue > 0 ? toPersianDigits(roundCurrency((metrics.grossProfit / metrics.totalRevenue) * 100)) : '۰'}٪
                  </td>
                </tr>

                {/* Waste */}
                <tr>
                  <td className="p-2 border-l border-[var(--border-subtle)] pr-4 sm:pr-5">۳. ضایعات انبار و خسارات تولید</td>
                  <td className="p-2 border-l border-[var(--border-subtle)] text-center text-[var(--text-secondary)]">تلفات</td>
                  <td className="p-2 border-l border-[var(--border-subtle)] text-left font-bold text-[var(--status-error-text)]">
                    {formatToman(metrics.totalWaste).text}
                  </td>
                  <td className="p-2 text-center font-bold text-[var(--text-secondary)]">
                    {metrics.totalRevenue > 0 ? toPersianDigits(roundCurrency((metrics.totalWaste / metrics.totalRevenue) * 100)) : '۰'}٪
                  </td>
                </tr>

                {/* Overhead */}
                <tr>
                  <td className="p-2 border-l border-[var(--border-subtle)] pr-4 sm:pr-5">۴. هزینه‌های ثابت و سربار عملیاتی (تسهیم روزانه)</td>
                  <td className="p-2 border-l border-[var(--border-subtle)] text-center text-[var(--text-secondary)]">سربار ثابت</td>
                  <td className="p-2 border-l border-[var(--border-subtle)] text-left font-bold text-[var(--text-primary)]">
                    {formatToman(metrics.periodOverhead).text}
                  </td>
                  <td className="p-2 text-center font-bold text-[var(--text-secondary)]">
                    {metrics.totalRevenue > 0 ? toPersianDigits(roundCurrency((metrics.periodOverhead / metrics.totalRevenue) * 100)) : '۰'}٪
                  </td>
                </tr>

                {/* Net Profit */}
                <tr className={`font-black text-xs ${netProfitToman.isNegative ? 'bg-rose-100/80 text-rose-950' : 'bg-emerald-100/80 text-emerald-950'} border-t-2 border-stone-400`}>
                  <td className="p-2 border-l border-[var(--border-subtle)]">سود (یا زیان) خالص نهایی</td>
                  <td className="p-2 border-l border-[var(--border-subtle)] text-center">نهایی</td>
                  <td className="p-2 border-l border-[var(--border-subtle)] text-left font-black">{netProfitToman.text}</td>
                  <td className="p-2 text-center font-black">{toPersianDigits(roundCurrency(metrics.netMarginPercent))}٪</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 2: Top Selling Products in Period */}
          {topSoldItems.length > 0 && (
            <div className="mb-3.5">
              <h3 className="text-xs font-extrabold text-[var(--text-primary)] mb-1.5 border-r-4 border-emerald-600 pr-2">
                پرفروش‌ترین محصولات منو در این بازه زمانی
              </h3>
              <table className="w-full text-xs text-right border-collapse border border-[var(--border-subtle)] rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-[var(--bg-base)] text-[var(--text-primary)] font-extrabold text-[10px] sm:text-[11px] border-b border-[var(--border-subtle)]">
                    <th className="p-1.5 sm:p-2 border-l border-[var(--border-subtle)]">نام آیتم منو</th>
                    <th className="p-1.5 sm:p-2 border-l border-[var(--border-subtle)] text-center">تعداد فروش</th>
                    <th className="p-1.5 sm:p-2 border-l border-[var(--border-subtle)] text-left">فروش کل</th>
                    <th className="p-1.5 sm:p-2 border-l border-[var(--border-subtle)] text-left">بهای تمام شده</th>
                    <th className="p-1.5 sm:p-2 text-left">سود ناخالص</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 text-[10px] sm:text-[11px] text-[var(--text-primary)]">
                  {topSoldItems.slice(0, 4).map((item) => {
                    const profit = item.totalRev - item.totalCost;
                    return (
                      <tr key={item.menuItemId}>
                        <td className="p-1.5 sm:p-2 border-l border-[var(--border-subtle)] font-bold text-[var(--text-primary)]">{item.name}</td>
                        <td className="p-1.5 sm:p-2 border-l border-[var(--border-subtle)] text-center font-black">{toPersianDigits(item.totalQty)}</td>
                        <td className="p-1.5 sm:p-2 border-l border-[var(--border-subtle)] text-left font-bold text-emerald-900">{formatToman(item.totalRev).text}</td>
                        <td className="p-1.5 sm:p-2 border-l border-[var(--border-subtle)] text-left text-[var(--status-warning-text)] font-medium">{formatToman(item.totalCost).text}</td>
                        <td className="p-1.5 sm:p-2 text-left font-black text-[var(--text-primary)]">{formatToman(profit).text}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Section 3: Waste Logs Summary in Period */}
          {filteredWasteLogs.length > 0 && (
            <div className="mb-3.5">
              <h3 className="text-xs font-extrabold text-[var(--text-primary)] mb-1.5 border-r-4 border-rose-600 pr-2">
                خلاصه ضایعات و خسارات انبار ثبت‌شده در این بازه
              </h3>
              <table className="w-full text-xs text-right border-collapse border border-[var(--border-subtle)] rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-[var(--bg-base)] text-[var(--text-primary)] font-extrabold text-[10px] sm:text-[11px] border-b border-[var(--border-subtle)]">
                    <th className="p-1.5 sm:p-2 border-l border-[var(--border-subtle)]">نام آیتم ضایعاتی</th>
                    <th className="p-1.5 sm:p-2 border-l border-[var(--border-subtle)] text-center">مقدار / واحد</th>
                    <th className="p-1.5 sm:p-2 border-l border-[var(--border-subtle)] text-left">خسارت مالی</th>
                    <th className="p-1.5 sm:p-2 text-right">علت ضایعات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 text-[10px] sm:text-[11px] text-[var(--text-primary)]">
                  {filteredWasteLogs.slice(0, 3).map((log, idx) => (
                    <tr key={log.id || idx}>
                      <td className="p-1.5 sm:p-2 border-l border-[var(--border-subtle)] font-bold text-[var(--text-primary)]">{log.itemName}</td>
                      <td className="p-1.5 sm:p-2 border-l border-[var(--border-subtle)] text-center font-bold">{formatNumber(log.quantity)} {log.unit}</td>
                      <td className="p-1.5 sm:p-2 border-l border-[var(--border-subtle)] text-left font-black text-[var(--status-error-text)]">{formatToman(log.cost).text}</td>
                      <td className="p-1.5 sm:p-2 text-[var(--text-secondary)] font-medium">{log.reason || 'نامشخص'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Document Footer: Stamp, Signature & Disclaimer */}
          <div
            className="pt-3.5 border-t-2 border-stone-400 grid grid-cols-2 gap-6 text-xs font-bold text-[var(--text-primary)] mt-3.5 print-avoid-break"
            style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
          >
            <div className="space-y-1">
              <div className="text-[11px] sm:text-xs">تاییدیه حسابداری و مدیریت مالی:</div>
              <div className="h-14 border border-dashed border-stone-400 rounded-lg bg-[var(--bg-base)] flex items-end justify-center pb-1.5 text-[10px] text-[var(--text-secondary)]">
                محل مهر و امضای مدیریت مجموعه
              </div>
            </div>

            <div className="space-y-1 text-left dir-ltr">
              <div className="dir-rtl text-right text-[11px] sm:text-xs">یادداشت فنی سیستم:</div>
              <p className="text-[9.5px] sm:text-[10px] font-medium text-[var(--text-secondary)] dir-rtl text-right leading-relaxed">
                این گزارش بر اساس استانداردهای حسابداری صنعتی مطبخ، داده‌های فرمول ساخت، هزینه‌های ثابت ماهانه و ضایعات ثبت‌شده در نرم‌افزار به‌صورت هوشمند تولید گردیده است.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
