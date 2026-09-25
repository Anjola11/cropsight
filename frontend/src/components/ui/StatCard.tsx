import React from 'react';
import clsx from 'clsx';
import { Link } from '@tanstack/react-router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faArrowTrendUp } from '@fortawesome/free-solid-svg-icons';

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  delta?: string | null;
  showTrendIcon?: boolean;
  to?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  delta,
  showTrendIcon = false,
  to,
  className,
}) => {
  const hasValue = value !== undefined && value !== null && value !== '' && value !== '—';

  return (
    <div
      className={clsx(
        'bg-card border border-line rounded-[20px] p-4 min-h-[120px] flex flex-col justify-between transition-colors duration-150',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] leading-[16px] text-sub font-medium">{label}</span>
        {to ? (
          <Link
            to={to}
            className="w-8 h-8 rounded-full border border-line flex items-center justify-center text-sub hover:text-primary hover:bg-card-hover transition-colors duration-150"
            aria-label={`View ${label}`}
          >
            <FontAwesomeIcon icon={faArrowRight} className="-rotate-45 text-[12px]" fixedWidth />
          </Link>
        ) : (
          <div className="w-8 h-8 rounded-full border border-line/40 flex items-center justify-center text-muted">
            <FontAwesomeIcon icon={faArrowRight} className="-rotate-45 text-[12px]" fixedWidth />
          </div>
        )}
      </div>

      <div className="my-3">
        <span
          className={clsx(
            'text-[24px] md:text-[28px] leading-[28px] md:leading-[32px] font-bold tabular-nums',
            hasValue ? 'text-primary' : 'text-muted'
          )}
        >
          {hasValue ? value : '—'}
        </span>
      </div>

      <div>
        {hasValue && delta ? (
          <div className="flex items-center gap-1 text-[12px] leading-[16px] text-success font-medium">
            {showTrendIcon && (
              <FontAwesomeIcon icon={faArrowTrendUp} className="text-[12px]" fixedWidth />
            )}
            <span>{delta}</span>
          </div>
        ) : (
          <div className="h-4" />
        )}
      </div>
    </div>
  );
};
