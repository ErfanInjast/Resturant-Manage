import React from 'react';
import { motion } from 'motion/react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { toPersianDigits } from '../../lib/utils';
import { buttonPress } from '../../lib/motion';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (newPage: number, direction: number) => void;
  onItemsPerPageChange?: (newItemsPerPage: number) => void;
  itemsPerPageOptions?: number[];
  itemLabel?: string;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [5, 8, 10, 12, 15],
  itemLabel = 'آیتم',
  className = '',
}) => {
  if (totalItems <= 0) return null;

  const effectiveTotalPages = Math.max(1, totalPages);
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const handlePrev = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1, -1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1, 1);
    }
  };

  const handleSelectPage = (p: number) => {
    if (p !== currentPage) {
      const dir = p > currentPage ? 1 : -1;
      onPageChange(p, dir);
    }
  };

  // Generate page numbers array with optional ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div
      className={`p-3 bg-[var(--bg-base)] border-t border-[var(--border-subtle)] flex flex-col md:flex-row items-center justify-between gap-3 text-xs ${className}`}
    >
      <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 w-full md:w-auto">
        <span className="text-[var(--text-secondary)] font-medium whitespace-nowrap">
          نمایش {toPersianDigits(startItem)} تا {toPersianDigits(endItem)} از{' '}
          {toPersianDigits(totalItems)} کل {itemLabel}
        </span>

        {onItemsPerPageChange && (
          <div className="flex items-center gap-1.5 text-[var(--text-secondary)] whitespace-nowrap">
            <span className="font-bold text-[11px]">تعداد در صفحه:</span>
            <div className="flex items-center gap-1">
              {itemsPerPageOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onItemsPerPageChange(option)}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                    itemsPerPage === option
                      ? 'bg-[var(--brand-primary)] text-white shadow-2xs'
                      : 'bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {toPersianDigits(option)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 dir-rtl">
        {/* Previous Button */}
        <motion.button
          type="button"
          {...buttonPress}
          disabled={currentPage === 1}
          onClick={handlePrev}
          className="h-8 px-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-base)] disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
        >
          <ChevronRight className="h-3.5 w-3.5" />
          <span>قبلی</span>
        </motion.button>

        {/* Page Number Buttons */}
        <div className="flex items-center gap-1 px-1">
          {getPageNumbers().map((p, idx) => {
            if (typeof p === 'string') {
              return (
                <span key={`ellipsis-${idx}`} className="px-1 text-[var(--text-secondary)] font-bold">
                  ...
                </span>
              );
            }
            const isActive = p === currentPage;
            return (
              <motion.button
                key={`page-${p}`}
                type="button"
                {...buttonPress}
                onClick={() => handleSelectPage(p)}
                className={`h-8 w-8 rounded-xl font-black text-xs transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[var(--brand-primary)] text-white shadow-xs scale-105'
                    : 'bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-base)]'
                }`}
              >
                {toPersianDigits(p)}
              </motion.button>
            );
          })}
        </div>

        {/* Next Button */}
        <motion.button
          type="button"
          {...buttonPress}
          disabled={currentPage === effectiveTotalPages}
          onClick={handleNext}
          className="h-8 px-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-base)] disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
        >
          <span>بعدی</span>
          <ChevronLeft className="h-3.5 w-3.5" />
        </motion.button>
      </div>
    </div>
  );
};
