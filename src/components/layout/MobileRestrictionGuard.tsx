import React, { useState } from 'react';
import { Smartphone, Zap, ArrowLeft, X, Sparkles, AlertCircle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useScreenSize } from '../../lib/hooks/useScreenSize';

export const MobileRestrictionGuard: React.FC = () => {
  const { setIsSimpleMode, notify } = useAppStore();
  const { isMobileScreen } = useScreenSize();
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  if (!isMobileScreen || isDismissed) {
    return null;
  }

  const handleSimpleMode = () => {
    setIsSimpleMode(true, true);
    setIsDismissed(true);
    notify.info('فعال‌سازی حالت ساده', 'سیستم برای سهولت کار در موبایل در «حالت ساده» قرار دارد.');
  };

  const handleFullMode = () => {
    setIsSimpleMode(false, true);
    setIsDismissed(true);
    notify.success('فعال‌سازی حالت کامل', 'حالت کامل با تمام امکانات در دستگاه موبایل فعال گردید.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4 dir-rtl text-right font-['Vazirmatn',sans-serif]">
      <div className="bg-white dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
        
        {/* Header Icon */}
        <div className="flex items-center justify-between">
          <div className="p-2.5 rounded-2xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] flex items-center justify-center">
            <Smartphone className="h-6 w-6" />
          </div>
          <button
            onClick={handleSimpleMode}
            className="text-[var(--text-secondary)] hover:text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 rounded-xl hover:bg-[var(--bg-base)] hover:bg-[var(--bg-base)] transition-colors"
            title="بستن پیام"
            aria-label="بستن پیام"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[var(--brand-primary)] font-extrabold text-xs">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>راهنمای نمای نمایشگر</span>
          </div>
          <h2 className="text-lg font-black text-[var(--text-primary)] dark:text-[var(--text-primary)]">
            پیشنهاد برای تجربه بهتر در موبایل
          </h2>
          <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)] leading-relaxed font-medium">
            برای راحتی و سرعت بیشتر روی صفحه نمایش کوچک، پیشنهاد می‌کنیم از <strong>«حالت ساده»</strong> استفاده کنید. همچنین می‌توانید وارد <strong>«حالت کامل»</strong> شوید.
          </p>
        </div>

        {/* Info box */}
        <div className="p-3.5 bg-[var(--bg-base)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] rounded-2xl text-[11px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-medium leading-relaxed space-y-1.5">
          <p className="font-bold text-[var(--brand-primary)]">گزینه‌های پیش روی شما:</p>
          <ul className="list-disc list-inside space-y-1 opacity-90">
            <li><strong>حالت ساده:</strong> ثبت سریع فروش روزانه و مشاهده ۴ شاخص اصلی کلیدی</li>
            <li><strong>حالت کامل:</strong> دسترسی به تمامی بخش‌ها (انبار، منو، گزارشات، تنظیمات)</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="pt-1 space-y-2">
          <button
            type="button"
            onClick={handleSimpleMode}
            className="w-full h-11 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md shadow-[var(--brand-primary)]/20 transition-all cursor-pointer"
          >
            <Zap className="h-4 w-4" />
            <span>ورود به حالت ساده (پیشنهادی)</span>
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleFullMode}
            className="w-full h-10 bg-[var(--bg-base)] border border-[var(--border-subtle)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-primary)] font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>ورود به حالت کامل در موبایل</span>
          </button>
        </div>

      </div>
    </div>
  );
};
