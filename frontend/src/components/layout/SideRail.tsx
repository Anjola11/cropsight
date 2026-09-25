import React from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHouse,
  faCamera,
  faMicrochip,
} from '@fortawesome/free-solid-svg-icons';

const RAIL_ITEMS = [
  { to: '/', label: 'Overview', icon: faHouse },
  { to: '/scan', label: 'Scan', icon: faCamera },
  { to: '/model', label: 'Model', icon: faMicrochip },
];

export const SideRail: React.FC = () => {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  return (
    <aside
      className="hidden lg:flex flex-col items-center w-14 p-2 rounded-full bg-card border border-line gap-2 sticky top-[88px] self-start"
      aria-label="Sidebar Navigation"
    >
      {RAIL_ITEMS.map((item) => {
        const isActive =
          item.to === '/'
            ? currentPath === '/'
            : currentPath.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            title={item.label}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-150 select-none ${
              isActive
                ? 'bg-accent text-accent-ink'
                : 'text-muted hover:bg-card-hover hover:text-primary'
            }`}
          >
            <FontAwesomeIcon icon={item.icon} className="text-[16px]" fixedWidth />
          </Link>
        );
      })}
    </aside>
  );
};
