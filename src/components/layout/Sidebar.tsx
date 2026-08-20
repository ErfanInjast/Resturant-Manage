import React from 'react';
import { motion } from 'motion/react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  LayoutDashboard,
  Boxes,
  UtensilsCrossed,
  Receipt,
  PieChart,
  Settings,
  BookOpen,
} from 'lucide-react';
import { useAppStore, type ActiveTab } from '../../store/useAppStore';
import { db } from '../../db';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/Badge';

interface NavItem {
  id: ActiveTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab } = useAppStore();

  const ingredients = useLiveQuery(() => db.ingredients.toArray()) ?? [];
  const lowStockCount = ingredients.filter(
    (ing) => ing.currentStock <= ing.minimumStock
  ).length;

  const menuItemsCount = useLiveQuery(() => db.menuItems.count()) ?? 0;

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'سود و زیان',
      icon: LayoutDashboard,
    },
    {
      id: 'inventory',
      label: 'مدیریت انبار',
      icon: Boxes,
      badge: lowStockCount > 0 ? `${lowStockCount} کمبود` : undefined,
    },
    {
      id: 'menu',
      label: 'منو و قیمت‌گذاری',
      icon: UtensilsCrossed,
      badge: menuItemsCount > 0 ? `${menuItemsCount} آیتم` : undefined,
    },
    {
      id: 'sales',
      label: 'فروش و ضایعات',
      icon: Receipt,
    },
    {
      id: 'analytics',
      label: 'تحلیل سودآوری',
      icon: PieChart,
    },
    {
      id: 'settings',
      label: 'تنظیمات',
      icon: Settings,
    },
    {
      id: 'guide',
      label: 'راهنما و آموزش',
      icon: BookOpen,
    },
  ];

  return (
    <aside
      className="hidden lg:flex flex-col w-64 shrink-0 sticky top-20 self-start max-h-[calc(100vh-5.5rem)] overflow-y-auto scrollbar-none rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)]/90 backdrop-blur-md p-3 select-none transition-all shadow-2xs z-20"
    >
      <div className="space-y-1">
        <p className="px-3 py-1 text-[11px] font-bold tracking-wider text-[var(--text-secondary)] uppercase flex items-center justify-between">
          <span>منوی اصلی</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)]"></span>
        </p>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                'relative flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer group',
                isActive
                  ? 'text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/[0.03] dark:hover:bg-white/5'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebarActiveBg"
                  className="absolute inset-0 bg-[var(--brand-primary)] rounded-xl shadow-2xs"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <div className="relative z-10 flex items-center gap-2.5">
                <Icon
                  className={cn(
                    'h-4.5 w-4.5 transition-transform duration-200 group-hover:scale-105',
                    isActive ? 'text-white' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
                  )}
                />
                <span className="tracking-tight">{item.label}</span>
              </div>
              {item.badge && (
                <div className="relative z-10">
                  <Badge
                    variant={
                      item.id === 'inventory' && lowStockCount > 0
                        ? 'danger'
                        : isActive
                        ? 'outline'
                        : 'default'
                    }
                    className={cn(
                      'text-[10px] px-2 py-0.5 font-bold shadow-2xs',
                      isActive && 'bg-white/20 text-white border-0'
                    )}
                  >
                    {item.badge}
                  </Badge>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
};
