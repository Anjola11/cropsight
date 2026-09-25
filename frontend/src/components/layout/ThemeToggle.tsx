import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faMoon } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../../context/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="w-11 h-11 lg:w-10 lg:h-10 rounded-full bg-card border border-line flex items-center justify-center text-sub hover:text-primary hover:bg-card-hover transition-colors duration-150 cursor-pointer select-none"
    >
      <FontAwesomeIcon icon={theme === 'dark' ? faSun : faMoon} className="text-[16px]" fixedWidth />
    </button>
  );
};
