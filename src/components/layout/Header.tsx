import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Menu, PlusCircle, Calendar, Sun, Moon, Zap, Layers } from 'lucide-react';
import { db } from '../../db';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../ui/Button';
import { formatJalali } from '../../lib/jalali';

export const Header: React.FC = () => {
  const {
    setIsMobileDrawerOpen,
    activeTab,
    setActiveTab,
    theme,
    toggleTheme,
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
        return 'صورت سود و زیان و عملکرد';
      case 'inventory':
        return 'انبارداری و مدیریت مواد اولیه';
      case 'menu':
        return 'آنالیز و قیمت‌گذاری منو';
      case 'sales':
        return 'ثبت فروش و ضایعات';
      case 'analytics':
        return 'تحلیل سودآوری و پیش‌بینی';
      case 'settings':
        return 'تنظیمات و پشتیبان‌گیری';
      case 'guide':
        return 'راهنمای جامع و آموزش کاربردی سیستم';
      default:
        return 'مدیریت مالی رستوران';
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/90 backdrop-blur-xl shadow-[0_1px_3px_rgba(28,25,23,0.02)] transition-colors">
      <div className="flex h-16 w-full max-w-[1440px] mx-auto items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Right column / Brand area (aligned with sidebar width lg:w-64) */}
        <div className="flex items-center gap-2 sm:gap-3 lg:w-64 lg:shrink-0 lg:pr-4 h-full min-w-0">
          {!isSimpleMode && (
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="inline-flex items-center justify-center rounded-xl p-2 text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 lg:hidden cursor-pointer transition-colors shrink-0"
              aria-label="منوی موبایل"
            >
              <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          )}

          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--status-success-text)] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--status-success-text)]"></span>
                </span>
                <h1 className="text-xs sm:text-sm md:text-base font-black text-[var(--text-primary)] tracking-tight leading-snug truncate">
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

        {/* Header Actions area (aligned with main content area) */}
        <div className="flex items-center gap-2 lg:pr-6">
          {!isSimpleMode && activeTab !== 'sales' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setActiveTab('sales')}
              className="bg-[var(--status-success-text)] hover:opacity-90 text-white shadow-xs font-bold"
            >
              <PlusCircle className="h-4 w-4" />
              <span className="hidden sm:inline">ثبت فروش جدید</span>
            </Button>
          )}

          {/* Simple Mode Toggle Button */}
          <Button
            variant={isSimpleMode ? "primary" : "outline"}
            size="sm"
            onClick={toggleSimpleMode}
            className={
              isSimpleMode
                ? "bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-black rounded-xl shadow-xs transition-all gap-1.5"
                : "text-[var(--text-primary)] hover:text-[var(--brand-primary)] border-[var(--border-subtle)] bg-[var(--bg-card)] rounded-xl font-bold transition-all gap-1.5"
            }
            title={isSimpleMode ? "تغییر به مدیریت کامل انبارداری و آنالیز" : "تغییر به ثبت فروش و خلاصه آمار سریع"}
          >
            {isSimpleMode ? <Layers className="h-4 w-4" /> : <Zap className="h-4 w-4 text-[var(--brand-primary)]" />}
            <span className="hidden md:inline">
              {isSimpleMode ? "نمای کامل و پیشرفته" : "نمای ساده و سریع"}
            </span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="text-[var(--text-primary)] hover:text-[var(--brand-primary)] hover:bg-[var(--bg-base)] rounded-xl px-2.5 transition-colors"
            title={theme === 'dark' ? 'حالت روز (روشن)' : 'حالت شب (تاریک)'}
          >
            {theme === 'dark' ? (
              <div className="flex items-center gap-1.5 text-[var(--status-warning-text)] font-bold text-xs">
                <Sun className="h-4 w-4 text-[var(--status-warning-text)]" />
                <span className="hidden sm:inline">روز</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[var(--text-primary)] font-bold text-xs">
                <Moon className="h-4 w-4 text-[var(--text-primary)]" />
                <span className="hidden sm:inline">شب</span>
              </div>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
};

