import React, { useState, useRef } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { cn, toEnglishDigits } from '../../lib/utils';
import { popoverVariants } from '../../lib/motion';

export interface SelectOption<T extends string | number = string | number> {
  value: T;
  label: string;
  sublabel?: string;
  badge?: string;
}

export interface SearchableSelectProps<T extends string | number = string | number> {
  options: SelectOption<T>[];
  value: T | '' | null | undefined;
  onChange: (value: T) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  enableSearch?: boolean;
  id?: string;
}

export function SearchableSelect<T extends string | number = string | number>({
  options,
  value,
  onChange,
  placeholder = 'انتخاب کنید...',
  searchPlaceholder = 'جستجو در لیست...',
  emptyMessage = 'موردی یافت نشد',
  label,
  disabled = false,
  className,
  triggerClassName,
  enableSearch = true,
  id,
}: SearchableSelectProps<T>) {
  const generatedId = React.useId();
  const selectId = id || generatedId;
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Filter options based on search query with Persian/English digit normalization
  const filteredOptions = options.filter((opt) => {
    if (!searchQuery.trim()) return true;
    const queryRaw = searchQuery.toLowerCase().trim();
    const queryEng = toEnglishDigits(queryRaw);

    const matchLabelRaw = opt.label.toLowerCase().includes(queryRaw);
    const matchLabelEng = toEnglishDigits(opt.label.toLowerCase()).includes(queryEng);

    const sublabelLower = opt.sublabel ? opt.sublabel.toLowerCase() : '';
    const matchSublabelRaw = sublabelLower.includes(queryRaw);
    const matchSublabelEng = toEnglishDigits(sublabelLower).includes(queryEng);

    return matchLabelRaw || matchLabelEng || matchSublabelRaw || matchSublabelEng;
  });

  const handleSelect = (optionValue: T) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSearchQuery('');
    }
  };

  return (
    <div className={cn('relative w-full text-right dir-rtl', className)}>
      {label && (
        <label htmlFor={selectId} className="block text-xs font-extrabold text-[var(--text-primary)] mb-1.5 cursor-pointer">
          {label}
        </label>
      )}

      <Popover.Root open={isOpen} onOpenChange={handleOpenChange}>
        <Popover.Trigger asChild>
          <button
            id={selectId}
            type="button"
            aria-label={label || placeholder}
            disabled={disabled}
            className={cn(
              'w-full h-10 flex items-center justify-between gap-2 rounded-xl border border-[var(--border-functional)] bg-[var(--bg-card)] px-3.5 text-xs font-bold text-[var(--text-primary)] transition-all cursor-pointer select-none',
              'hover:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)]',
              isOpen && 'border-[var(--brand-primary)] ring-2 ring-[var(--brand-primary)]/20',
              disabled && 'opacity-50 cursor-not-allowed bg-[var(--bg-base)]',
              !selectedOption && 'text-[var(--text-secondary)] font-normal',
              triggerClassName
            )}
          >
            <span className="truncate">
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 text-[var(--text-secondary)] transition-transform duration-200',
                isOpen && 'rotate-180 text-[var(--brand-primary)]'
              )}
            />
          </button>
        </Popover.Trigger>

        <AnimatePresence>
          {isOpen && (
            <Popover.Portal forceMount>
              <Popover.Content asChild sideOffset={6} align="start">
                <motion.div
                  variants={popoverVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  style={{
                    width: 'var(--radix-popover-trigger-width)',
                    maxHeight: '260px',
                    zIndex: 999999,
                  }}
                  className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-2 shadow-2xl ring-1 ring-black/10 flex flex-col dir-rtl text-right overflow-hidden"
                >
                  {/* Search Input */}
                  {enableSearch && options.length > 0 && (
                    <div className="relative mb-2 shrink-0">
                      <Search className="absolute right-3 top-2.5 h-4 w-4 text-[var(--text-secondary)]" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="w-full rounded-xl border border-[var(--border-functional)] bg-[var(--bg-base)] pr-9 pl-8 py-2 text-xs font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)]"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="absolute left-2.5 top-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Options List */}
                  <div className="flex-1 overflow-y-auto space-y-1 pr-0.5 scrollbar-thin">
                    {filteredOptions.length === 0 ? (
                      <div className="p-3 text-center text-xs font-medium text-[var(--text-secondary)]">
                        {emptyMessage}
                      </div>
                    ) : (
                      filteredOptions.map((opt) => {
                        const isSelected = opt.value === value;
                        return (
                          <button
                            key={String(opt.value)}
                            type="button"
                            onClick={() => handleSelect(opt.value)}
                            className={cn(
                              'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-right cursor-pointer select-none',
                              isSelected
                                ? 'bg-[var(--brand-primary-subtle)] text-[var(--brand-primary)] font-black'
                                : 'text-[var(--text-primary)] hover:bg-[var(--bg-base)]'
                            )}
                          >
                            <div className="flex flex-col gap-0.5 truncate pr-1">
                              <span className="truncate font-extrabold">{opt.label}</span>
                              {opt.sublabel && (
                                <span
                                  className={cn(
                                    'text-[11px] font-medium truncate',
                                    isSelected ? 'text-[var(--brand-primary)]/80' : 'text-[var(--text-secondary)]'
                                  )}
                                >
                                  {opt.sublabel}
                                </span>
                              )}
                            </div>
                            {isSelected && <Check className="h-4 w-4 shrink-0 text-[var(--brand-primary)] mr-2" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              </Popover.Content>
            </Popover.Portal>
          )}
        </AnimatePresence>
      </Popover.Root>
    </div>
  );
}
