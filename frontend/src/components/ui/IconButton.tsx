import React from 'react';
import clsx from 'clsx';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string;
  icon: React.ReactNode;
  active?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  active = false,
  className,
  disabled,
  ...props
}) => {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center rounded-full transition-colors duration-150 cursor-pointer select-none border',
        'w-11 h-11 md:w-10 md:h-10 text-[16px]',
        active
          ? 'bg-accent text-accent-ink border-transparent'
          : 'bg-card text-sub border-line hover:bg-card-hover hover:text-primary active:bg-secondary',
        disabled && 'opacity-45 pointer-events-none cursor-not-allowed',
        className
      )}
      disabled={disabled}
      {...props}
    >
      {icon}
    </button>
  );
};
