import React from 'react';
import clsx from 'clsx';

interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  headerAction?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  headerAction,
  className,
  ...props
}) => {
  return (
    <div
      className={clsx(
        'bg-card border border-line rounded-[20px] p-4 md:p-5 transition-colors duration-150',
        className
      )}
      {...props}
    >
      {(title || headerAction) && (
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            {title && (
              <h3 className="text-[15px] leading-[20px] font-semibold text-primary m-0">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-[12px] leading-[16px] text-muted mt-0.5 m-0">
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && <div className="flex items-center gap-2">{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
