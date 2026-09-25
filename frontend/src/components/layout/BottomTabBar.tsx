import React from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHouse,
  faCamera,
  faMicrochip,
} from '@fortawesome/free-solid-svg-icons';

const TABS = [
  { to: '/', label: 'Overview', icon: faHouse },
  { to: '/scan', label: 'Scan', icon: faCamera },
  { to: '/model', label: 'Model', icon: faMicrochip },
];

export const BottomTabBar: React.FC = () => {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-line flex items-center justify-around pb-[env(safe-area-inset-bottom,0px)] h-[calc(64px+env(safe-area-inset-bottom,0px))] shadow-lg select-none"
      aria-label="Mobile Navigation"
    >
      {TABS.map((tab) => {
        const isActive =
          tab.to === '/'
            ? currentPath === '/'
            : currentPath.startsWith(tab.to);

        return (
          <Link
            key={tab.to}
            to={tab.to}
            aria-current={isActive ? 'page' : undefined}
            className="flex-1 flex flex-col items-center justify-center min-h-[44px] py-1 cursor-pointer"
          >
            <div
              className={`w-14 h-8 rounded-full flex items-center justify-center transition-colors duration-150 ${
                isActive ? 'bg-accent text-accent-ink' : 'text-muted'
              }`}
            >
              <FontAwesomeIcon icon={tab.icon} className="text-[18px]" fixedWidth />
            </div>
            <span
              className={`text-[11px] leading-[14px] font-medium mt-1 ${
                isActive ? 'text-primary font-semibold' : 'text-muted'
              }`}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
};
