import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'motion/react';
import { X, LayoutDashboard, Boxes, UtensilsCrossed, Receipt, PieChart, Settings, BookOpen } from 'lucide-react';
import { useAppStore, type ActiveTab } from '../../store/useAppStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/Badge';
import { overlayVariants, EASINGS } from '../../lib/motion';

export const MobileDrawer: React.FC = () => {
  const { activeTab, setActiveTab, isMobileDrawerOpen, setIsMobileDrawerOpen, isSimpleMode } = useAppStore();

  const ingredients = useLiveQuery(() => db.ingredients.toArray()) ?? [];
  const lowStockCount = ingredients.filter((ing) => ing.currentStock <= ing.minimumStock).length;
  const menuCount = useLiveQuery(() => db.menuItems.count()) ?? 0;

  const navItems = [
    { id: 'dashboard' as ActiveTab, label: 'صورت سود و زیان', icon: LayoutDashboard },
    { id: 'inventory' as ActiveTab, label: 'انبار و مواد اولیه', icon: Boxes, badge: lowStockCount > 0 ? `${lowStockCount} کمبود` : undefined },
    { id: 'menu' as ActiveTab, label: 'آنالیز و قیمت‌گذاری', icon: UtensilsCrossed, badge: menuCount > 0 ? `${menuCount} آیتم` : undefined },
    { id: 'sales' as ActiveTab, label: 'ثبت فروش و ضایعات', icon: Receipt },
    { id: 'analytics' as ActiveTab, label: 'تحلیل سودآوری منو', icon: PieChart },
    { id: 'settings' as ActiveTab, label: 'تنظیمات و پشتیبان‌گیری', icon: Settings },
    { id: 'guide' as ActiveTab, label: 'راهنمای جامع و آموزش', icon: BookOpen },
  ];

  const handleSelect = (tab: ActiveTab) => {
    setActiveTab(tab);
    setIsMobileDrawerOpen(false);
  };

  return (
    <>
      {/* Mobile Drawer */}
      <Dialog.Root open={isMobileDrawerOpen} onOpenChange={setIsMobileDrawerOpen}>
        <AnimatePresence>
          {isMobileDrawerOpen && (
            <Dialog.Portal forceMount>
              <Dialog.Overlay asChild>
                <motion.div
                  variants={overlayVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
                />
              </Dialog.Overlay>
              <Dialog.Content asChild>
                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ duration: 0.22, ease: EASINGS.smooth }}
                  className="fixed inset-y-0 right-0 z-50 w-72 bg-[var(--bg-card)] p-5 shadow-2xl dir-rtl flex flex-col justify-between border-l border-[var(--border-subtle)]"
                >
                  <div>
                    <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)] mb-4">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-[var(--text-primary)]">منوی سیستم</span>
                      </div>
                      <button
                        onClick={() => setIsMobileDrawerOpen(false)}
                        className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-base)]"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleSelect(item.id)}
                            className={cn(
                              'flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-sm font-bold transition-colors',
                              isActive
                                ? 'bg-[var(--brand-primary-subtle)] text-[var(--brand-primary)] font-black'
                                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)]'
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <Icon className={cn('h-5 w-5', isActive ? 'text-[var(--brand-primary)]' : 'text-[var(--text-secondary)]')} />
                              <span>{item.label}</span>
                            </div>
                            {item.badge && (
                              <Badge variant={item.id === 'inventory' && lowStockCount > 0 ? 'danger' : 'primary'}>
                                {item.badge}
                              </Badge>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>

      {/* Mobile Bottom Navigation Bar (Hidden in Simple Mode) */}
      {!isSimpleMode && (
        <nav className="fixed bottom-0 inset-x-0 z-40 flex h-16 bg-[var(--bg-card)] border-t border-[var(--border-subtle)] lg:hidden shadow-lg justify-around items-center px-2">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  'flex flex-col items-center justify-center w-full h-full text-[10px] font-bold gap-1 transition-all cursor-pointer',
                  isActive ? 'text-[var(--brand-primary)]' : 'text-[var(--text-secondary)]'
                )}
              >
                <Icon className={cn('h-5 w-5', isActive ? 'text-[var(--brand-primary)]' : 'text-[var(--text-secondary)]')} />
                <span className="truncate max-w-[64px]">{item.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </nav>
      )}
    </>
  );
};
