import React from 'react';
import clsx from 'clsx';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  rounded?: 'sm' | 'md' | 'lg' | 'full';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  rounded = 'md',
  className,
  ...props
}) => {
  const roundedClasses = {
    sm: 'rounded-[8px]',
    md: 'rounded-[12px]',
    lg: 'rounded-[20px]',
    full: 'rounded-full',
  }[rounded];

  return (
    <div
      className={clsx(
        'bg-card-hover animate-pulse motion-reduce:animate-none',
        roundedClasses,
        className
      )}
      {...props}
    />
  );
};
