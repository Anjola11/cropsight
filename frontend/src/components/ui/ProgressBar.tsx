import React from 'react';
import clsx from 'clsx';

interface ProgressBarProps {
  value: number; // 0 to 100
  color?: string; // CSS variable or color
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  color = 'var(--accent)',
  className,
}) => {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className={clsx('h-1 w-full bg-line rounded-full overflow-hidden', className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{
          width: `${clamped}%`,
          backgroundColor: color.startsWith('--') ? `var(${color})` : color,
        }}
      />
    </div>
  );
};
