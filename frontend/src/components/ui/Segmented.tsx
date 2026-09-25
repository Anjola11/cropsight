import React, { useId } from 'react';
import clsx from 'clsx';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  size = 'md',
}: SegmentedProps<T>) {
  const groupId = useId();

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIndex = (index + 1) % options.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      nextIndex = (index - 1 + options.length) % options.length;
    }

    if (nextIndex >= 0) {
      e.preventDefault();
      const targetOption = options[nextIndex];
      if (!targetOption.disabled) {
        onChange(targetOption.value);
      }
    }
  };

  const isSmall = size === 'sm';

  return (
    <div
      role="radiogroup"
      aria-label="Selection"
      className={clsx(
        'inline-flex items-center p-0.5 rounded-full bg-secondary border border-line select-none',
        isSmall ? 'h-8' : 'h-9',
        className
      )}
    >
      {options.map((opt, idx) => {
        const isSelected = opt.value === value;
        const optId = `${groupId}-${opt.value}`;
        return (
          <button
            key={opt.value}
            id={optId}
            role="radio"
            type="button"
            aria-checked={isSelected}
            disabled={opt.disabled}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => !opt.disabled && onChange(opt.value)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={clsx(
              'rounded-full px-3 text-[12px] leading-[16px] font-semibold transition-colors duration-150 cursor-pointer flex items-center justify-center',
              isSmall ? 'h-7' : 'h-8',
              isSelected
                ? 'bg-accent text-accent-ink shadow-xs'
                : 'text-sub hover:text-primary hover:bg-card-hover/50',
              opt.disabled && 'opacity-45 cursor-not-allowed pointer-events-none'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
