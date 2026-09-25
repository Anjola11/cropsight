import React from 'react';
import clsx from 'clsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSeedling } from '@fortawesome/free-solid-svg-icons';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

interface EmptyStateProps {
  icon?: IconDefinition;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = faSeedling,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center text-center py-10 px-4',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-accent-light flex items-center justify-center text-accent-text text-[20px] mb-3">
        <FontAwesomeIcon icon={icon} fixedWidth />
      </div>
      <h4 className="text-[15px] leading-[20px] font-semibold text-primary m-0">
        {title}
      </h4>
      {description && (
        <p className="text-[13px] leading-[18px] text-muted max-w-[280px] mt-1 mb-0">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
