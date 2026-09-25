import React from 'react';
import clsx from 'clsx';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  dotColor?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  dotColor,
  className,
  ...props
}) => {
  return (
    <span
      className={clsx(
        'inline-flex items-center h-7 px-2.5 rounded-full border border-line text-[12px] leading-[16px] font-medium text-sub bg-card select-none',
        className
      )}
      {...props}
    >
      {dotColor && (
        <span
          className="w-2 h-2 rounded-full mr-1.5 shrink-0"
          style={{ backgroundColor: dotColor.startsWith('--') ? `var(${dotColor})` : dotColor }}
        />
      )}
      <span>{children}</span>
    </span>
  );
};
