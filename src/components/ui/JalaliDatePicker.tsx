import React, { useState, useEffect } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, ChevronRight, ChevronLeft, ChevronDown, Check, X } from 'lucide-react';
import {
  PERSIAN_MONTH_NAMES,
  getDaysInJalaliMonth,
  jalaliToGregorian,
  getJalaliDate,
  formatJalaliReadable,
  clampJalaliIso,
  MIN_JALALI_DATE,
  getTodayJalaliIso,
} from '../../lib/jalali';
import { toPersianDigits, cn } from '../../lib/utils';
import { popoverVariants } from '../../lib/motion';

export interface JalaliDatePickerProps {
  value: string; // ISO format "1403-05-14"
  onChange: (newIso: string) => void;
  minDate?: string;
  maxDate?: string;
  className?: string;
  label?: string;
  showSteppers?: boolean;
  align?: 'left' | 'right' | 'center';
  compact?: boolean;
  id?: string;
}

const WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

export const JalaliDatePicker: React.FC<JalaliDatePickerProps> = ({
  value,
  onChange,
  minDate = MIN_JALALI_DATE,
  maxDate = getTodayJalaliIso(),
  className = '',
  label,
  showSteppers = true,
  align = 'center',
  compact = false,
  id,
}) => {
  const generatedId = React.useId();
  const pickerId = id || generatedId;
  const [isOpen, setIsOpen] = useState(false);
  const [activeView, setActiveView] = useState<'days' | 'months' | 'years'>('days');

  const safeValue = clampJalaliIso(value, minDate, maxDate);

  // Parse current value into year, month, day
  const match = safeValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const todayObj = getJalaliDate();

  const selectedYear = match ? parseInt(match[1], 10) : todayObj.jy;
  const selectedMonth = match ? parseInt(match[2], 10) : todayObj.jm;
  const selectedDay = match ? parseInt(match[3], 10) : todayObj.jd;

  // State for navigating month/year inside calendar popover
  const [viewYear, setViewYear] = useState<number>(selectedYear);
  const [viewMonth, setViewMonth] = useState<number>(selectedMonth);

  // Sync view when popup opens or selectedValue changes
  useEffect(() => {
    setViewYear(selectedYear);
    setViewMonth(selectedMonth);
    setActiveView('days');
  }, [selectedYear, selectedMonth, isOpen]);

  // Years options for dropdown select (e.g. 1390 to current year)
  const maxYearAllowed = parseInt(maxDate.split('-')[0], 10) || todayObj.jy;
  const minYearAllowed = parseInt(minDate.split('-')[0], 10) || 1390;
  const yearOptions: number[] = [];
  for (let y = maxYearAllowed; y >= minYearAllowed; y--) {
    yearOptions.push(y);
  }

  // Shift day by +1 or -1
  const shiftDay = (delta: number) => {
    try {
      const gDate = jalaliToGregorian(selectedYear, selectedMonth, selectedDay);
      gDate.setDate(gDate.getDate() + delta);
      const newJ = getJalaliDate(gDate);
      const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
      const newIso = `${newJ.jy}-${pad(newJ.jm)}-${pad(newJ.jd)}`;
      const clamped = clampJalaliIso(newIso, minDate, maxDate);
      onChange(clamped);
    } catch (e) {
      onChange(getTodayJalaliIso());
    }
  };

  // Change view month safely
  const handlePrevMonth = () => {
    setActiveView('days');
    if (viewMonth === 1) {
      if (viewYear > minYearAllowed) {
        setViewYear((y) => y - 1);
        setViewMonth(12);
      }
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    setActiveView('days');
    if (viewMonth === 12) {
      if (viewYear < maxYearAllowed) {
        setViewYear((y) => y + 1);
        setViewMonth(1);
      }
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Calculate day of week offset for day 1 of viewMonth
  const firstDayGDate = jalaliToGregorian(viewYear, viewMonth, 1);
  const jsDay = firstDayGDate.getDay(); // 0: Sun, 1: Mon, ..., 6: Sat
  const firstDayOfWeekIndex = (jsDay + 1) % 7; // 0: Sat, 1: Sun, ..., 6: Fri

  const daysInCurrentViewMonth = getDaysInJalaliMonth(viewYear, viewMonth);

  const handleSelectDay = (day: number) => {
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const chosenIso = `${viewYear}-${pad(viewMonth)}-${pad(day)}`;
    const clamped = clampJalaliIso(chosenIso, minDate, maxDate);
    onChange(clamped);
    setIsOpen(false);
  };

  const isDayDisabled = (day: number) => {
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const iso = `${viewYear}-${pad(viewMonth)}-${pad(day)}`;
    return iso < minDate || iso > maxDate;
  };

  const isToday = (day: number) => {
    return viewYear === todayObj.jy && viewMonth === todayObj.jm && day === todayObj.jd;
  };

  const isSelected = (day: number) => {
    return viewYear === selectedYear && viewMonth === selectedMonth && day === selectedDay;
  };

  const todayIso = getTodayJalaliIso();
  const yesterdayIso = clampJalaliIso(
    (() => {
      const g = jalaliToGregorian(todayObj.jy, todayObj.jm, todayObj.jd);
      g.setDate(g.getDate() - 1);
      const j = getJalaliDate(g);
      const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
      return `${j.jy}-${pad(j.jm)}-${pad(j.jd)}`;
    })(),
    minDate,
    maxDate
  );

  return (
    <div className={cn('relative flex flex-col text-right dir-rtl w-full', className)}>
      {label && (
        <label htmlFor={pickerId} className="block text-xs font-extrabold text-[var(--text-primary)] mb-1.5 cursor-pointer">
          {label}
        </label>
      )}

      <div className="flex items-center gap-1.5 w-full">
        {/* Radix Popover Wrapper */}
        <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
          <Popover.Trigger asChild>
            <button
              id={pickerId}
              type="button"
              aria-label={label || 'انتخاب تاریخ شمسی'}
              className={cn(
                'flex-1 min-w-0 flex items-center justify-between gap-2 border border-[var(--border-functional)] bg-[var(--bg-card)] rounded-xl transition-all cursor-pointer shadow-xs hover:border-[var(--brand-primary)] focus:outline-hidden focus:ring-2 focus:ring-[var(--brand-primary)]/20',
                compact ? 'px-2.5 h-9 text-xs font-bold' : 'px-3 h-10 text-xs font-bold',
                isOpen && 'ring-2 ring-[var(--brand-primary)]/20 border-[var(--brand-primary)]'
              )}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                <CalendarIcon className="h-4 w-4 text-[var(--brand-primary)] shrink-0" />
                <span className="text-[var(--text-primary)] font-extrabold tracking-tight truncate text-xs">
                  {formatJalaliReadable(safeValue) || toPersianDigits(safeValue)}
                </span>
              </div>
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 text-[var(--text-secondary)] shrink-0 transition-transform duration-200 ml-0.5',
                  isOpen && 'rotate-180 text-[var(--brand-primary)]'
                )}
              />
            </button>
          </Popover.Trigger>

          {/* Compact Stepper Buttons */}
          {showSteppers && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                disabled={safeValue <= minDate}
                onClick={(e) => {
                  e.stopPropagation();
                  shiftDay(-1);
                }}
                className={cn(
                  'rounded-xl border border-[var(--border-functional)] bg-[var(--bg-base)] text-[var(--text-primary)] hover:bg-[var(--bg-card)] hover:border-[var(--brand-primary)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center justify-center shadow-2xs shrink-0',
                  compact ? 'h-9 w-8 text-xs' : 'h-10 w-9 text-xs'
                )}
                title="یک روز قبل"
                aria-label="یک روز قبل"
              >
                <ChevronRight className="h-4 w-4 shrink-0" />
              </button>

              <button
                type="button"
                disabled={safeValue >= maxDate}
                onClick={(e) => {
                  e.stopPropagation();
                  shiftDay(1);
                }}
                className={cn(
                  'rounded-xl border border-[var(--border-functional)] bg-[var(--bg-base)] text-[var(--text-primary)] hover:bg-[var(--bg-card)] hover:border-[var(--brand-primary)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center justify-center shadow-2xs shrink-0',
                  compact ? 'h-9 w-8 text-xs' : 'h-10 w-9 text-xs'
                )}
                title="یک روز بعد"
                aria-label="یک روز بعد"
              >
                <ChevronLeft className="h-4 w-4 shrink-0" />
              </button>
            </div>
          )}

          {/* Radix Portal Popover Calendar */}
          <AnimatePresence>
            {isOpen && (
              <Popover.Portal forceMount>
                <Popover.Content
                  asChild
                  side="bottom"
                  sideOffset={6}
                  align={align === 'center' ? 'center' : align === 'left' ? 'start' : 'end'}
                  collisionPadding={12}
                >
                  <motion.div
                    variants={popoverVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    style={{ zIndex: 999999 }}
                    className="w-72 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl p-3.5 dir-rtl text-right ring-1 ring-black/10 select-none overflow-hidden"
                  >
                    {/* Header Controls: Navigation + Month/Year View Toggles */}
                    <div className="flex items-center justify-between gap-1.5 mb-3 bg-[var(--bg-base)] p-1.5 rounded-xl border border-[var(--border-subtle)]">
                      <button
                        type="button"
                        onClick={handlePrevMonth}
                        className="p-1 rounded-lg hover:bg-[var(--bg-card)] text-[var(--text-secondary)] transition-colors cursor-pointer"
                        title="ماه قبل"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>

                      <div className="flex items-center gap-1.5">
                        {/* Month Selector Toggle */}
                        <button
                          type="button"
                          onClick={() => setActiveView(activeView === 'months' ? 'days' : 'months')}
                          className={cn(
                            'flex items-center justify-between gap-2 bg-[var(--bg-card)] border border-[var(--border-functional)] hover:border-[var(--brand-primary)] rounded-xl px-2.5 py-1 text-xs font-black text-[var(--text-primary)] transition-colors shadow-2xs cursor-pointer min-w-[76px]',
                            activeView === 'months' && 'border-[var(--brand-primary)] ring-2 ring-[var(--brand-primary)]/20 text-[var(--brand-primary)]'
                          )}
                        >
                          <span className="truncate">{PERSIAN_MONTH_NAMES[viewMonth - 1]}</span>
                          <ChevronDown className="h-3.5 w-3.5 text-[var(--text-secondary)] shrink-0" />
                        </button>

                        {/* Year Selector Toggle */}
                        <button
                          type="button"
                          onClick={() => setActiveView(activeView === 'years' ? 'days' : 'years')}
                          className={cn(
                            'flex items-center justify-between gap-2 bg-[var(--bg-card)] border border-[var(--border-functional)] hover:border-[var(--brand-primary)] rounded-xl px-2.5 py-1 text-xs font-black text-[var(--text-primary)] transition-colors shadow-2xs cursor-pointer min-w-[68px]',
                            activeView === 'years' && 'border-[var(--brand-primary)] ring-2 ring-[var(--brand-primary)]/20 text-[var(--brand-primary)]'
                          )}
                        >
                          <span>{toPersianDigits(viewYear)}</span>
                          <ChevronDown className="h-3.5 w-3.5 text-[var(--text-secondary)] shrink-0" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleNextMonth}
                        className="p-1 rounded-lg hover:bg-[var(--bg-card)] text-[var(--text-secondary)] transition-colors cursor-pointer"
                        title="ماه بعد"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                    </div>

                    {/* View 1: Months Grid View */}
                    {activeView === 'months' && (
                      <div className="py-1">
                        <div className="text-[11px] font-bold text-[var(--text-secondary)] mb-2 px-1">
                          انتخاب ماه:
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {PERSIAN_MONTH_NAMES.map((mName, idx) => {
                            const mVal = idx + 1;
                            const isSel = mVal === viewMonth;
                            return (
                              <button
                                key={mVal}
                                type="button"
                                onClick={() => {
                                  setViewMonth(mVal);
                                  setActiveView('days');
                                }}
                                className={cn(
                                  'py-2 px-1 rounded-xl text-xs font-black text-center transition-all cursor-pointer',
                                  isSel
                                    ? 'bg-[var(--brand-primary)] text-white shadow-xs'
                                    : 'bg-[var(--bg-base)] text-[var(--text-primary)] hover:bg-[var(--brand-primary-subtle)] hover:text-[var(--brand-primary)]'
                                )}
                              >
                                {mName}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* View 2: Years Grid View */}
                    {activeView === 'years' && (
                      <div className="py-1">
                        <div className="text-[11px] font-bold text-[var(--text-secondary)] mb-2 px-1">
                          انتخاب سال:
                        </div>
                        <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-0.5 custom-scrollbar">
                          {yearOptions.map((yr) => {
                            const isSel = yr === viewYear;
                            return (
                              <button
                                key={yr}
                                type="button"
                                onClick={() => {
                                  setViewYear(yr);
                                  setActiveView('days');
                                }}
                                className={cn(
                                  'py-2 px-1 rounded-xl text-xs font-black text-center transition-all cursor-pointer',
                                  isSel
                                    ? 'bg-[var(--brand-primary)] text-white shadow-xs'
                                    : 'bg-[var(--bg-base)] text-[var(--text-primary)] hover:bg-[var(--brand-primary-subtle)] hover:text-[var(--brand-primary)]'
                                )}
                              >
                                {toPersianDigits(yr)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* View 3: Standard Days View */}
                    {activeView === 'days' && (
                      <>
                        {/* Weekday Labels */}
                        <div className="grid grid-cols-7 text-center mb-1.5">
                          {WEEKDAYS.map((wd, i) => (
                            <span
                              key={i}
                              className={cn(
                                'text-[11px] font-black py-1',
                                i === 6 ? 'text-[var(--status-error-text)]' : 'text-[var(--text-secondary)]'
                              )}
                            >
                              {wd}
                            </span>
                          ))}
                        </div>

                        {/* Days Grid */}
                        <div className="grid grid-cols-7 gap-1 text-center">
                          {/* Blank offset boxes */}
                          {Array.from({ length: firstDayOfWeekIndex }).map((_, idx) => (
                            <div key={`blank-${idx}`} className="h-8 w-8" />
                          ))}

                          {/* Month Day Buttons */}
                          {Array.from({ length: daysInCurrentViewMonth }).map((_, idx) => {
                            const dayNum = idx + 1;
                            const disabled = isDayDisabled(dayNum);
                            const selected = isSelected(dayNum);
                            const today = isToday(dayNum);

                            return (
                              <button
                                key={dayNum}
                                type="button"
                                disabled={disabled}
                                onClick={() => handleSelectDay(dayNum)}
                                className={cn(
                                  'h-8 w-8 rounded-xl text-xs font-black flex items-center justify-center transition-all cursor-pointer',
                                  selected
                                    ? 'bg-[var(--brand-primary)] text-white shadow-xs scale-105 font-black'
                                    : today
                                    ? 'border-2 border-[var(--brand-primary)] text-[var(--brand-primary)] bg-[var(--brand-primary-subtle)]'
                                    : 'hover:bg-[var(--bg-base)] text-[var(--text-primary)]',
                                  disabled && 'opacity-25 cursor-not-allowed hover:bg-transparent text-[var(--text-secondary)]'
                                )}
                              >
                                {toPersianDigits(dayNum)}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}

                    {/* Quick Presets & Actions Footer */}
                    <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            onChange(todayIso);
                            setIsOpen(false);
                          }}
                          className={cn(
                            'px-2.5 py-1 rounded-lg font-extrabold transition-colors cursor-pointer text-[11px]',
                            safeValue === todayIso
                              ? 'bg-[var(--brand-primary-subtle)] text-[var(--brand-primary)]'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)]'
                          )}
                        >
                          امروز
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onChange(yesterdayIso);
                            setIsOpen(false);
                          }}
                          className={cn(
                            'px-2.5 py-1 rounded-lg font-extrabold transition-colors cursor-pointer text-[11px]',
                            safeValue === yesterdayIso
                              ? 'bg-[var(--brand-primary-subtle)] text-[var(--brand-primary)]'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)]'
                          )}
                        >
                          دیروز
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-bold text-[11px] cursor-pointer px-2 py-1 rounded-lg hover:bg-[var(--bg-base)] transition-colors"
                      >
                        بستن
                      </button>
                    </div>
                  </motion.div>
                </Popover.Content>
              </Popover.Portal>
            )}
          </AnimatePresence>
        </Popover.Root>
      </div>
    </div>
  );
};
