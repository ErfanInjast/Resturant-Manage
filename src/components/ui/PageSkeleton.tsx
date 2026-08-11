import React from 'react';

interface PageSkeletonProps {
  type?: 'dashboard' | 'table' | 'analytics' | 'settings';
}

export const PageSkeleton: React.FC<PageSkeletonProps> = ({ type = 'table' }) => {
  return (
    <div className="space-y-6 animate-pulse transition-opacity duration-200 dir-rtl">
      {/* Top Banner / Metrics Grid Skeleton */}
      {type === 'dashboard' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-white/70 dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="h-3 w-24 bg-stone-200 dark:bg-[var(--bg-card)] rounded-md animate-shimmer" />
                <div className="h-8 w-8 rounded-xl bg-stone-200 dark:bg-[var(--bg-card)] animate-shimmer" />
              </div>
              <div className="h-7 w-32 bg-stone-300 dark:bg-stone-700 rounded-lg animate-shimmer" />
              <div className="h-3 w-20 bg-stone-200 dark:bg-[var(--bg-card)] rounded-md animate-shimmer" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/70 dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] shadow-sm">
          <div className="space-y-2">
            <div className="h-5 w-40 bg-stone-300 dark:bg-stone-700 rounded-lg animate-shimmer" />
            <div className="h-3 w-64 bg-stone-200 dark:bg-[var(--bg-card)] rounded-md animate-shimmer" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-28 bg-stone-200 dark:bg-[var(--bg-card)] rounded-xl animate-shimmer" />
            <div className="h-10 w-32 bg-stone-300 dark:bg-stone-700 rounded-xl animate-shimmer" />
          </div>
        </div>
      )}

      {/* Main Content Area Skeleton */}
      {type === 'analytics' || type === 'dashboard' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-5 rounded-2xl bg-white/70 dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-4 w-36 bg-stone-300 dark:bg-stone-700 rounded-lg animate-shimmer" />
              <div className="h-6 w-20 bg-stone-200 dark:bg-[var(--bg-card)] rounded-md animate-shimmer" />
            </div>
            <div className="h-[280px] w-full bg-[var(--bg-base)] dark:bg-[var(--bg-card)] rounded-xl animate-shimmer" />
          </div>

          <div className="p-5 rounded-2xl bg-white/70 dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] shadow-sm space-y-4">
            <div className="h-4 w-32 bg-stone-300 dark:bg-stone-700 rounded-lg animate-shimmer" />
            <div className="space-y-3 pt-2">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="h-12 w-full bg-[var(--bg-base)] dark:bg-[var(--bg-card)] rounded-xl animate-shimmer" />
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Table Skeleton */
        <div className="p-5 rounded-2xl bg-white/70 dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
            <div className="h-4 w-28 bg-stone-300 dark:bg-stone-700 rounded-md animate-shimmer" />
            <div className="h-4 w-16 bg-stone-200 dark:bg-[var(--bg-card)] rounded-md animate-shimmer" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((k) => (
              <div
                key={k}
                className="h-12 w-full bg-[var(--bg-base)] dark:bg-[var(--bg-card)] rounded-xl animate-shimmer flex items-center justify-between px-4"
              >
                <div className="h-3 w-32 bg-stone-200 dark:bg-stone-700 rounded-md" />
                <div className="h-3 w-20 bg-stone-200 dark:bg-stone-700 rounded-md" />
                <div className="h-3 w-16 bg-stone-200 dark:bg-stone-700 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
