import React from 'react';
import clsx from 'clsx';
import { Spinner } from './Spinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  icon,
  className,
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'h-9 px-4 text-[13px] leading-[18px]',
    md: 'h-11 px-5 text-[14px] leading-[20px]',
    lg: 'h-12 px-6 text-[15px] leading-[20px]',
  }[size];

  const variantClasses = {
    primary:
      'bg-accent text-accent-ink hover:bg-accent-hover active:opacity-90',
    secondary:
      'bg-card text-primary border border-line hover:bg-card-hover active:bg-secondary',
    ghost:
      'bg-transparent text-sub hover:bg-card-hover hover:text-primary active:bg-secondary',
    danger:
      'bg-transparent text-danger border border-danger/40 hover:bg-danger/10 active:bg-danger/20',
  }[variant];

  const isDisabled = disabled || loading;

  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center font-semibold rounded-full cursor-pointer transition-colors duration-150 select-none',
        sizeClasses,
        variantClasses,
        fullWidth && 'w-full',
        isDisabled && 'opacity-45 pointer-events-none cursor-not-allowed',
        className
      )}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <span className="mr-2 inline-flex items-center justify-center">
          <Spinner size="sm" />
        </span>
      ) : icon ? (
        <span className="mr-2 inline-flex items-center justify-center text-[14px]">
          {icon}
        </span>
      ) : null}
      <span>{children}</span>
    </button>
  );
};
