import React, { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { TrendingUp, Target } from 'lucide-react';
import { db } from '../../db';
import { formatToman, formatNumber, getUnitLabel, roundCurrency, toPersianDigits } from '../../lib/utils';
import { isDateInPresetFilter } from '../../lib/financial';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { SalesForecastSection } from './SalesForecastSection';
import { MenuEngineeringMatrix } from './MenuEngineeringMatrix';
import { PageSkeleton } from '../ui/PageSkeleton';
import { useAppStore } from '../../store/useAppStore';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
  ReferenceLine,
} from 'recharts';

export const AnalyticsManager: React.FC = () => {
  const { setActiveTab } = useAppStore();

  const menuItemsQuery = useLiveQuery(() => db.menuItems.toArray());
  const ingredientsQuery = useLiveQuery(() => db.ingredients.toArray());
  const salesRecordsQuery = useLiveQuery(() => db.dailySales.toArray());

  const menuItems = menuItemsQuery ?? [];
  const ingredients = ingredientsQuery ?? [];
  const salesRecords = salesRecordsQuery ?? [];

  // Map real sales volume from sales records (last 30 days only)
  const salesVolumeMap = useMemo(() => {
    const map = new Map<number, number>();
    salesRecords.forEach((record) => {
      if (isDateInPresetFilter(record.date, 'last30')) {
        record.items?.forEach((item) => {
          if (item.menuItemId) {
            const current = map.get(item.menuItemId) || 0;
            map.set(item.menuItemId, current + (item.quantity || 0));
          }
        });
      }
    });
    return map;
  }, [salesRecords]);

  // Enhanced menu items with computed actual volume
  const processedItems = useMemo(() => {
    return menuItems.map((item) => {
      const recordedVolume = item.id ? salesVolumeMap.get(item.id) : undefined;
      const actualVolume = recordedVolume !== undefined ? recordedVolume : (item.salesVolume30Days ?? 0);
      return {
        ...item,
        computedVolume: actualVolume,
      };
    });
  }, [menuItems, salesVolumeMap]);

  // Calculate Average Gross Profit & Average Sales Volume
  const totalGrossProfitSum = processedItems.reduce((acc, curr) => acc + (curr.grossProfit || 0), 0);
  const avgGrossProfit = processedItems.length > 0 ? totalGrossProfitSum / processedItems.length : 0;

  const totalSalesVolume = processedItems.reduce((acc, curr) => acc + curr.computedVolume, 0);
  const avgSalesVolume = processedItems.length > 0 ? totalSalesVolume / processedItems.length : 0;

  // Scatter plot data for Recharts matching matrix categorization
  const scatterData = useMemo(() => {
    return processedItems.map((item) => {
      const profit = item.grossProfit || 0;
      const volume = item.computedVolume;

      const isHighProfit = profit >= avgGrossProfit;
      const isHighVolume = volume >= avgSalesVolume;

      let cat: 'star' | 'workhorse' | 'puzzle' | 'underperformer' = 'star';
      if (isHighProfit && isHighVolume) cat = 'star';
      else if (!isHighProfit && isHighVolume) cat = 'workhorse';
      else if (isHighProfit && !isHighVolume) cat = 'puzzle';
      else cat = 'underperformer';

      return {
        name: item.name,
        x: volume,
        y: profit,
        cat,
      };
    });
  }, [processedItems, avgGrossProfit, avgSalesVolume]);

  const isLoading = menuItemsQuery === undefined || ingredientsQuery === undefined || salesRecordsQuery === undefined;

  if (isLoading) {
    return <PageSkeleton type="analytics" />;
  }

  // 30-Day Material Demand Forecast
  const forecastMap = new Map<number, { name: string; unit: string; currentStock: number; requiredForecast: number }>();

  ingredients.forEach((ing) => {
    if (ing.id) {
      forecastMap.set(ing.id, {
        name: ing.name,
        unit: getUnitLabel(ing.unit),
        currentStock: ing.currentStock,
        requiredForecast: 0,
      });
    }
  });

  processedItems.forEach((menuItem) => {
    const estMonthlySales = menuItem.computedVolume ?? menuItem.salesVolume30Days ?? 0;
    menuItem.ingredients?.forEach((ing) => {
      if (ing.ingredientId && forecastMap.has(ing.ingredientId)) {
        const item = forecastMap.get(ing.ingredientId)!;
        item.requiredForecast += ing.quantity * estMonthlySales;
      }
    });
  });

  const forecastChartData = Array.from(forecastMap.values()).map((f) => ({
    name: toPersianDigits(f.name),
    'موجودی فعلی': roundCurrency(f.currentStock),
    'پیش‌بینی مصرف ۳۰ روزه': roundCurrency(f.requiredForecast),
    unit: f.unit,
  }));

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Top Title Banner */}
      <div>
        <h2 className="text-xl font-black text-[var(--text-primary)] dark:text-[var(--text-primary)]">تحلیل و مهندسی سودآوری منو</h2>
        <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-medium mt-0.5">
          دسته‌بندی هوشمند محصولات بر اساس شاخص‌های سودآوری و محبوبیت در بازار (ماتریس ۴ بخش)
        </p>
      </div>

      {/* 4 Quadrants Engineering Matrix Section */}
      <MenuEngineeringMatrix
        menuItems={menuItems}
        salesRecords={salesRecords}
        onOpenEditItem={() => {
          setActiveTab('menu');
        }}
      />

      {/* Sales Forecasting Section for Upcoming Weeks */}
      <SalesForecastSection salesRecords={salesRecords} menuItems={menuItems} />

      {/* 30-Day Material Demand Forecast Bar Chart */}
      {forecastChartData.length > 0 && (
        <Card className="border border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
          <CardHeader className="border-b border-[var(--border-subtle)]/60 dark:border-[var(--border-subtle)] pb-4">
            <CardTitle className="text-sm font-extrabold text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[var(--brand-primary)]" />
              پیش‌بینی مصرف ۳۰ روزه مواد اولیه انبار در مقایسه با موجودی فعلی
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={forecastChartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--border-subtle)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fontWeight: 'bold', fill: '#78716C' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border-subtle)' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fontWeight: 'bold', fill: '#78716C' }}
                  tickFormatter={(v) => formatNumber(v)}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomForecastTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: '12px', fontSize: '12px', fontWeight: 'bold' }}
                  formatter={(value) => <span className="text-[var(--text-primary)] dark:text-[var(--text-secondary)] font-bold mx-1">{value}</span>}
                />
                <Bar dataKey="موجودی فعلی" fill="var(--status-success-text)" radius={[6, 6, 0, 0]} maxBarSize={22} />
                <Bar dataKey="پیش‌بینی مصرف ۳۰ روزه" fill="var(--brand-primary)" radius={[6, 6, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const CustomScatterTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] rounded-2xl p-3.5 shadow-xl dir-rtl text-right min-w-[200px]">
        <div className="text-xs font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] pb-2 border-b border-[#F4F0EB] dark:border-[var(--border-subtle)] flex items-center justify-between">
          <span>{data.name}</span>
          <span className="text-[10px] text-[var(--text-secondary)] font-normal">({data.cat})</span>
        </div>
        <div className="mt-2 space-y-1 text-xs">
          <div className="flex justify-between gap-3 text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            <span>حجم فروش (۳۰ روز):</span>
            <span className="font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">{formatNumber(data.x)} پرس</span>
          </div>
          <div className="flex justify-between gap-3 text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            <span>سود ناخالص هر پرس:</span>
            <span className="font-bold text-[var(--status-success-text)] dark:text-[var(--status-success-text)]">{formatToman(data.y).text}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const CustomForecastTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const unit = payload[0]?.payload?.unit || '';
    return (
      <div className="bg-white dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] rounded-2xl p-3.5 shadow-xl dir-rtl text-right min-w-[200px]">
        <div className="text-xs font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] pb-2 mb-2 border-b border-[#F4F0EB] dark:border-[var(--border-subtle)] flex items-center justify-between">
          <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">ماده اولیه:</span>
          <span className="font-bold text-[var(--brand-primary)] dark:text-[var(--status-error-text)]">{toPersianDigits(label)}</span>
        </div>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between text-xs gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                <span className="font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">{entry.name}:</span>
              </div>
              <span className="font-black text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                {formatNumber(entry.value)} {unit}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};
