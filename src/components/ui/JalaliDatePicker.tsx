import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronRight, ChevronLeft, ChevronDown, RotateCcw, Check } from 'lucide-react';
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
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
    setIsMonthPickerOpen(false);
    setIsYearPickerOpen(false);
  }, [selectedYear, selectedMonth, isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsMonthPickerOpen(false);
        setIsYearPickerOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

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
    setIsMonthPickerOpen(false);
    setIsYearPickerOpen(false);
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
    setIsMonthPickerOpen(false);
    setIsYearPickerOpen(false);
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
    setIsMonthPickerOpen(false);
    setIsYearPickerOpen(false);
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
    <div className={cn('relative inline-flex flex-col text-right', className)} ref={containerRef}>
      {label && <label htmlFor={pickerId} className="text-xs font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)] mb-1 cursor-pointer">{label}</label>}

      <div className="flex items-center gap-1">
        {/* Trigger Button */}
        <button
          id={pickerId}
          type="button"
          aria-label={label || 'انتخاب تاریخ شمسی'}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'flex items-center justify-between gap-2 border border-[var(--border-subtle)] dark:border-[var(--border-functional)] bg-white dark:bg-[var(--bg-card)] rounded-xl transition-all cursor-pointer shadow-xs hover:border-[var(--brand-primary)] dark:hover:border-[var(--brand-primary)]',
            compact ? 'px-2.5 h-9 text-xs font-black' : 'px-3 h-10 text-xs font-black',
            isOpen && 'ring-2 ring-[var(--brand-primary)]/20 border-[var(--brand-primary)]'
          )}
        >
          <CalendarIcon className="h-4 w-4 text-[var(--brand-primary)] shrink-0" />
          <span className="text-[var(--text-primary)] dark:text-[var(--text-primary)] font-extrabold tracking-tight">
            {formatJalaliReadable(safeValue) || toPersianDigits(safeValue)}
          </span>
        </button>

        {/* Stepper Buttons */}
        {showSteppers && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              disabled={safeValue <= minDate}
              onClick={() => shiftDay(-1)}
              className="h-9 px-2 rounded-xl border border-[var(--border-subtle)] dark:border-[var(--border-functional)] bg-[var(--bg-base)] dark:bg-[var(--bg-card)] text-[11px] font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] hover:bg-[var(--bg-base)] dark:hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center gap-0.5"
              title="یک روز قبل"
            >
              <ChevronRight className="h-3.5 w-3.5" />
              <span>قبل</span>
            </button>

            <button
              type="button"
              disabled={safeValue >= maxDate}
              onClick={() => shiftDay(1)}
              className="h-9 px-2 rounded-xl border border-[var(--border-subtle)] dark:border-[var(--border-functional)] bg-[var(--bg-base)] dark:bg-[var(--bg-card)] text-[11px] font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] hover:bg-[var(--bg-base)] dark:hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center gap-0.5"
              title="یک روز بعد"
            >
              <span>بعد</span>
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Popover Calendar Container */}
      {isOpen && (
        <div
          className={cn(
            'absolute top-full mt-1.5 z-50 w-72 bg-white dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] rounded-2xl shadow-xl p-3.5 animate-in fade-in slide-in-from-top-2 duration-150',
            align === 'left' && 'left-0',
            align === 'right' && 'right-0',
            align === 'center' && 'left-1/2 -translate-x-1/2'
          )}
        >
          {/* Header Controls: Custom Month & Year Dropdowns */}
          <div className="flex items-center justify-between gap-1 mb-3 bg-[var(--bg-base)] dark:bg-[var(--bg-card)] p-1.5 rounded-xl border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] relative">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 text-[var(--text-secondary)] dark:text-[var(--text-secondary)] transition-colors"
              title="ماه قبل"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-1.5">
              {/* Custom Month Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsMonthPickerOpen(!isMonthPickerOpen);
                    setIsYearPickerOpen(false);
                  }}
                  className={cn(
                    'flex items-center gap-1 bg-white dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-functional)] hover:border-[var(--brand-primary)] dark:hover:border-[var(--brand-primary)] rounded-xl px-2.5 py-1 text-xs font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] transition-colors shadow-2xs cursor-pointer',
                    isMonthPickerOpen && 'border-[var(--brand-primary)] ring-2 ring-[var(--brand-primary)]/20'
                  )}
                >
                  <span>{PERSIAN_MONTH_NAMES[viewMonth - 1]}</span>
                  <ChevronDown className="h-3 w-3 text-[var(--text-secondary)] shrink-0" />
                </button>

                {isMonthPickerOpen && (
                  <div className="absolute top-full right-0 mt-1 z-30 w-44 bg-white dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] rounded-xl shadow-xl p-1.5 grid grid-cols-2 gap-1 animate-in fade-in zoom-in-95 duration-100">
                    {PERSIAN_MONTH_NAMES.map((mName, idx) => {
                      const mVal = idx + 1;
                      const isSel = mVal === viewMonth;
                      return (
                        <button
                          key={mVal}
                          type="button"
                          onClick={() => {
                            setViewMonth(mVal);
                            setIsMonthPickerOpen(false);
                          }}
                          className={cn(
                            'px-2 py-1.5 rounded-lg text-xs font-black text-center transition-all cursor-pointer',
                            isSel
                              ? 'bg-[var(--brand-primary)] text-white shadow-xs'
                              : 'hover:bg-[var(--brand-primary-subtle)] text-[var(--text-primary)] hover:text-[var(--brand-primary)]'
                          )}
                        >
                          {mName}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Custom Year Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsYearPickerOpen(!isYearPickerOpen);
                    setIsMonthPickerOpen(false);
                  }}
                  className={cn(
                    'flex items-center gap-1 bg-white dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-functional)] hover:border-[var(--brand-primary)] dark:hover:border-[var(--brand-primary)] rounded-xl px-2.5 py-1 text-xs font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] transition-colors shadow-2xs cursor-pointer',
                    isYearPickerOpen && 'border-[var(--brand-primary)] ring-2 ring-[var(--brand-primary)]/20'
                  )}
                >
                  <span>{toPersianDigits(viewYear)}</span>
                  <ChevronDown className="h-3 w-3 text-[var(--text-secondary)] shrink-0" />
                </button>

                {isYearPickerOpen && (
                  <div className="absolute top-full left-0 mt-1 z-30 w-28 max-h-48 overflow-y-auto bg-white dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] rounded-xl shadow-xl p-1.5 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100">
                    {yearOptions.map((yr) => {
                      const isSel = yr === viewYear;
                      return (
                        <button
                          key={yr}
                          type="button"
                          onClick={() => {
                            setViewYear(yr);
                            setIsYearPickerOpen(false);
                          }}
                          className={cn(
                            'w-full px-2 py-1.5 rounded-lg text-xs font-black text-center transition-all cursor-pointer',
                            isSel
                              ? 'bg-[var(--brand-primary)] text-white shadow-xs'
                              : 'hover:bg-[var(--brand-primary-subtle)] text-[var(--text-primary)] hover:text-[var(--brand-primary)]'
                          )}
                        >
                          {toPersianDigits(yr)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 text-[var(--text-secondary)] dark:text-[var(--text-secondary)] transition-colors"
              title="ماه بعد"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 text-center mb-1.5">
            {WEEKDAYS.map((wd, i) => (
              <span
                key={i}
                className={cn(
                  'text-[11px] font-black py-1',
                  i === 6 ? 'text-[var(--status-error-text)]' : 'text-[var(--text-secondary)] dark:text-[var(--text-secondary)]'
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

          {/* Quick Presets & Actions Footer */}
          <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  onChange(todayIso);
                  setIsOpen(false);
                  setIsMonthPickerOpen(false);
                  setIsYearPickerOpen(false);
                }}
                className={cn(
                  'px-2 py-1 rounded-lg font-extrabold transition-colors cursor-pointer',
                  safeValue === todayIso
                    ? 'bg-[var(--brand-primary-subtle)] text-[var(--brand-primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-base)]'
                )}
              >
                امروز
              </button>

              <button
                type="button"
                onClick={() => {
                  onChange(yesterdayIso);
                  setIsOpen(false);
                  setIsMonthPickerOpen(false);
                  setIsYearPickerOpen(false);
                }}
                className={cn(
                  'px-2 py-1 rounded-lg font-extrabold transition-colors cursor-pointer',
                  safeValue === yesterdayIso
                    ? 'bg-[var(--brand-primary-subtle)] text-[var(--brand-primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-base)]'
                )}
              >
                دیروز
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsMonthPickerOpen(false);
                setIsYearPickerOpen(false);
              }}
              className="text-[var(--text-secondary)] hover:text-[var(--text-secondary)] dark:hover:text-stone-300 font-bold text-[11px] cursor-pointer"
            >
              بستن
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
