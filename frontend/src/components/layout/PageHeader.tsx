import React from 'react';
import clsx from 'clsx';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  action,
  className,
}) => {
  return (
    <div
      className={clsx(
        'flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 md:mb-6',
        className
      )}
    >
      <div>
        <h1 className="text-[22px] leading-[28px] md:text-[28px] md:leading-[34px] font-bold text-primary tracking-[-0.02em] m-0">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[14px] leading-[20px] text-sub mt-1 m-0">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="flex items-center gap-3 shrink-0">{action}</div>}
    </div>
  );
};
