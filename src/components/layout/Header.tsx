import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Menu, PlusCircle, Calendar, Zap, Layers } from 'lucide-react';
import { db } from '../../db';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../ui/Button';
import { formatJalali } from '../../lib/jalali';

export const Header: React.FC = () => {
  const {
    setIsMobileDrawerOpen,
    activeTab,
    setActiveTab,
    isSimpleMode,
    toggleSimpleMode,
  } = useAppStore();
  const settings = useLiveQuery(() => db.settings.get('config'));

  const getTabTitle = () => {
    if (isSimpleMode) {
      return 'نمای ساده';
    }
    switch (activeTab) {
      case 'dashboard':
        return 'صورت سود و زیان';
      case 'inventory':
        return 'مدیریت انبار';
      case 'menu':
        return 'منو و قیمت‌گذاری';
      case 'sales':
        return 'فروش و ضایعات';
      case 'analytics':
        return 'تحلیل سودآوری';
      case 'settings':
        return 'تنظیمات';
      case 'guide':
        return 'راهنما و آموزش';
      default:
        return 'مدیریت مالی رستوران';
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/90 backdrop-blur-xl shadow-2xs transition-colors">
      <div className="flex h-14 sm:h-16 w-full max-w-[1440px] mx-auto items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Right column / Brand area */}
        <div className="flex items-center gap-2 sm:gap-3 lg:w-64 lg:shrink-0 lg:pr-4 h-full min-w-0">
          {!isSimpleMode && (
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="inline-flex items-center justify-center rounded-xl p-1.5 text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 lg:hidden cursor-pointer transition-colors shrink-0"
              aria-label="منوی موبایل"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--status-success-text)] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--status-success-text)]"></span>
                </span>
                <h1 className="text-xs sm:text-sm font-black text-[var(--text-primary)] tracking-tight leading-snug truncate">
                  {settings?.restaurantName || 'مدیریت مالی رستوران'}
                </h1>
              </div>
              <p className="text-[10px] sm:text-[11px] font-bold text-[var(--text-secondary)] flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="text-[var(--brand-primary)] font-extrabold">{getTabTitle()}</span>
                <span className="opacity-40">•</span>
                <span className="flex items-center gap-1 text-[var(--text-secondary)] shrink-0">
                  <Calendar className="h-3 w-3 opacity-60" />
                  {formatJalali(new Date(), 'long')}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Header Actions area */}
        <div className="flex items-center gap-2">
          {!isSimpleMode && activeTab !== 'sales' && (
            <Button
              variant="success"
              size="sm"
              onClick={() => setActiveTab('sales')}
              className="gap-1.5 shadow-2xs font-bold"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">ثبت فروش جدید</span>
            </Button>
          )}

          {/* Simple Mode Toggle Button */}
          <Button
            variant={isSimpleMode ? "primary" : "outline"}
            size="sm"
            onClick={toggleSimpleMode}
            className="gap-1.5 font-bold"
            title={isSimpleMode ? "تغییر به مدیریت کامل انبارداری و آنالیز" : "تغییر به ثبت فروش و خلاصه آمار سریع"}
          >
            {isSimpleMode ? (
              <Layers className="h-3.5 w-3.5" />
            ) : (
              <Zap className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
            )}
            <span className="hidden md:inline">
              {isSimpleMode ? "نمای پیشرفته" : "نمای ساده"}
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
};
