import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'motion/react';
import { UtensilsCrossed } from 'lucide-react';
import { pageVariants } from './lib/motion';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { MobileDrawer } from './components/layout/MobileDrawer';
import { MobileRestrictionGuard } from './components/layout/MobileRestrictionGuard';
import { ToastContainer } from './components/ui/ToastContainer';
import { ConfirmDialogModal } from './components/ui/ConfirmDialogModal';
import { useAppStore } from './store/useAppStore';
import { useScreenSize } from './lib/hooks/useScreenSize';
import { PnLDashboard } from './components/dashboard/PnLDashboard';
import { SimpleModeDashboard } from './components/dashboard/SimpleModeDashboard';
import { InventoryManager } from './components/inventory/InventoryManager';
import { MenuManager } from './components/menu/MenuManager';
import { SalesManager } from './components/sales/SalesManager';
import { AnalyticsManager } from './components/analytics/AnalyticsManager';
import { SettingsManager } from './components/settings/SettingsManager';
import { GuideManager } from './components/guide/GuideManager';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { db } from './db';

export default function App() {
  const { activeTab, theme, isSimpleMode } = useAppStore();
  useScreenSize();

  const settingsState = useLiveQuery(async () => {
    const config = await db.settings.get('config');
    return { loaded: true, data: config ?? null };
  });

  // Synchronize documentElement class with current theme state
  React.useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Render clean standard preloader while IndexedDB query resolves
  if (!settingsState || !settingsState.loaded) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex flex-col items-center justify-center p-4 dir-rtl transition-colors duration-200">
        <div className="flex flex-col items-center gap-4 bg-[var(--bg-card)] p-8 rounded-3xl border border-[var(--border-subtle)] shadow-xl backdrop-blur-md max-w-xs w-full text-center">
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 rounded-2xl bg-[var(--brand-primary)]/20 animate-ping opacity-75" />
            <div className="relative h-14 w-14 rounded-2xl bg-[var(--brand-primary)] text-white flex items-center justify-center shadow-lg shadow-[var(--brand-primary)]/30">
              <UtensilsCrossed className="h-7 w-7 animate-pulse" />
            </div>
          </div>
          <div className="space-y-1.5">
            <h3 className="text-sm font-black text-[var(--text-primary)]">فود کاست مهندسی منو</h3>
            <p className="text-[11px] text-[var(--text-secondary)] font-bold">در حال آماده‌سازی و بارگذاری داده‌ها...</p>
          </div>
          <div className="w-full bg-[var(--bg-base)] h-1.5 rounded-full overflow-hidden">
            <div className="bg-[var(--brand-primary)] h-full rounded-full animate-shimmer w-full" />
          </div>
        </div>
      </div>
    );
  }

  const settings = settingsState.data;

  // If settings record is missing or setup is not completed -> Show Onboarding Wizard
  if (!settings || settings.isSetupCompleted === false) {
    return (
      <>
        <OnboardingWizard onComplete={() => {}} />
        <ToastContainer />
        <ConfirmDialogModal />
        <MobileRestrictionGuard />
      </>
    );
  }

  const renderActiveView = () => {
    if (isSimpleMode) {
      return <SimpleModeDashboard />;
    }

    switch (activeTab) {
      case 'dashboard':
        return <PnLDashboard />;
      case 'inventory':
        return <InventoryManager />;
      case 'menu':
        return <MenuManager />;
      case 'sales':
        return <SalesManager />;
      case 'analytics':
        return <AnalyticsManager />;
      case 'settings':
        return <SettingsManager />;
      case 'guide':
        return <GuideManager />;
      default:
        return <PnLDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] flex flex-col font-['IRANYekan','iranyekan',sans-serif] dir-rtl select-none transition-colors duration-200">
      <Header />
      <div className="flex flex-1 w-full max-w-[1440px] mx-auto pb-20 lg:pb-8 px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 gap-6">
        {!isSimpleMode && <Sidebar />}
        <main className="flex-1 min-w-0 transition-all">
          <AnimatePresence mode="wait">
            <motion.div
              key={isSimpleMode ? 'simple-mode' : activeTab}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {renderActiveView()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <MobileDrawer />
      <ToastContainer />
      <ConfirmDialogModal />
      <MobileRestrictionGuard />
    </div>
  );
}




