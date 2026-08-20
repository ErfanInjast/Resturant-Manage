import React, { useState } from 'react';
import { Smartphone, Zap, ArrowLeft, X, Sparkles } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useScreenSize } from '../../lib/hooks/useScreenSize';
import { Button } from '../ui/Button';

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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 dir-rtl text-right font-['IRANYekan','iranyekan',sans-serif]">
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
        
        {/* Header Icon */}
        <div className="flex items-center justify-between">
          <div className="p-2.5 rounded-xl bg-[var(--brand-primary-subtle)] text-[var(--brand-primary)] flex items-center justify-center border border-[var(--brand-primary)]/20">
            <Smartphone className="h-5 w-5" />
          </div>
          <button
            onClick={handleSimpleMode}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 rounded-xl hover:bg-[var(--bg-base)] transition-colors cursor-pointer"
            title="بستن پیام"
            aria-label="بستن پیام"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[var(--brand-primary)] font-black text-xs">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>راهنمای نمای نمایشگر</span>
          </div>
          <h2 className="text-base font-black text-[var(--text-primary)]">
            پیشنهاد برای تجربه بهتر در موبایل
          </h2>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
            برای راحتی و سرعت بیشتر روی صفحه نمایش کوچک، پیشنهاد می‌کنیم از <strong>«حالت ساده»</strong> استفاده کنید. همچنین می‌توانید وارد <strong>«حالت کامل»</strong> شوید.
          </p>
        </div>

        {/* Info box */}
        <div className="p-3.5 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-xl text-[11px] text-[var(--text-secondary)] font-medium leading-relaxed space-y-1.5">
          <p className="font-bold text-[var(--brand-primary)]">گزینه‌های پیش روی شما:</p>
          <ul className="list-disc list-inside space-y-1 opacity-90">
            <li><strong>حالت ساده:</strong> ثبت سریع فروش روزانه و مشاهده ۴ شاخص اصلی کلیدی</li>
            <li><strong>حالت کامل:</strong> دسترسی به تمامی بخش‌ها (انبار، منو، گزارشات، تنظیمات)</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="pt-1 space-y-2">
          <Button
            type="button"
            variant="primary"
            onClick={handleSimpleMode}
            className="w-full h-10 text-xs font-black rounded-xl gap-2"
          >
            <Zap className="h-4 w-4" />
            <span>ورود به حالت ساده (پیشنهادی)</span>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleFullMode}
            className="w-full h-10 text-xs font-bold rounded-xl"
          >
            <span>ورود به حالت کامل در موبایل</span>
          </Button>
        </div>

      </div>
    </div>
  );
};
