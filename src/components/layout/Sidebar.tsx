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
  AlertTriangle,
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
      label: 'صورت سود و زیان',
      icon: LayoutDashboard,
    },
    {
      id: 'inventory',
      label: 'انبار و مواد اولیه',
      icon: Boxes,
      badge: lowStockCount > 0 ? `${lowStockCount} کمبود` : undefined,
    },
    {
      id: 'menu',
      label: 'آنالیز و قیمت‌گذاری',
      icon: UtensilsCrossed,
      badge: menuItemsCount > 0 ? `${menuItemsCount} آیتم` : undefined,
    },
    {
      id: 'sales',
      label: 'ثبت فروش و ضایعات',
      icon: Receipt,
    },
    {
      id: 'analytics',
      label: 'تحلیل سودآوری منو',
      icon: PieChart,
    },
    {
      id: 'settings',
      label: 'تنظیمات و پشتیبان‌گیری',
      icon: Settings,
    },
    {
      id: 'guide',
      label: 'راهنمای جامع و آموزش',
      icon: BookOpen,
    },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 border-l border-[var(--border-subtle)] bg-[var(--bg-base)]/80 backdrop-blur-md min-h-[calc(100vh-4rem)] p-4 select-none transition-colors">
      <div className="flex-1 space-y-1.5">
        <p className="px-3 text-[11px] font-black tracking-wider text-[var(--text-secondary)] uppercase mb-3 flex items-center justify-between">
          <span>منوی اصلی سیستم</span>
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
                'relative flex w-full items-center justify-between rounded-2xl px-3.5 py-3 text-sm font-bold transition-all duration-200 cursor-pointer group',
                isActive
                  ? 'text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/[0.03] dark:hover:bg-white/5'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebarActiveBg"
                  className="absolute inset-0 bg-[var(--brand-primary)] rounded-2xl shadow-xs"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <div className="relative z-10 flex items-center gap-3">
                <Icon
                  className={cn(
                    'h-5 w-5 transition-transform duration-200 group-hover:scale-105',
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

