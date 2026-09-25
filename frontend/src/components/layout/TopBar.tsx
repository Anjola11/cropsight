import React from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLeaf } from '@fortawesome/free-solid-svg-icons';
import { ThemeToggle } from './ThemeToggle';
import { APP_NAME } from '../../utils/constants';

const NAV_ITEMS = [
  { to: '/', label: 'Overview' },
  { to: '/scan', label: 'Scan' },
  { to: '/model', label: 'Model' },
];

export const TopBar: React.FC = () => {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  return (
    <header className="w-full pt-4 mb-6">
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 flex items-center justify-between lg:grid lg:grid-cols-[auto_1fr_auto] h-11 lg:h-12">
        {/* Brand Pill */}
        <Link
          to="/"
          className="h-11 lg:h-12 px-3 lg:px-4 rounded-[16px] bg-card border border-line flex items-center gap-2.5 text-primary hover:bg-card-hover transition-colors duration-150 select-none"
        >
          <div className="w-7 h-7 rounded-[8px] bg-accent flex items-center justify-center text-accent-ink text-[14px]">
            <FontAwesomeIcon icon={faLeaf} fixedWidth />
          </div>
          <span className="text-[15px] leading-[20px] font-semibold text-primary">
            {APP_NAME}
          </span>
        </Link>

        {/* Center Nav Pill (Desktop >= 1024px only) */}
        <nav
          className="hidden lg:flex justify-self-center h-12 p-1 rounded-full bg-card border border-line items-center"
          aria-label="Main Navigation"
        >
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.to === '/'
                ? currentPath === '/'
                : currentPath.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={isActive ? 'page' : undefined}
                className={`h-10 px-5 rounded-full text-[13px] leading-[18px] flex items-center justify-center transition-colors duration-150 select-none ${
                  isActive
                    ? 'bg-accent text-accent-ink font-semibold'
                    : 'text-sub font-medium hover:text-primary hover:bg-card-hover'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Action Cluster */}
        <div className="flex items-center gap-2 justify-self-end">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};
