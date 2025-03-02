import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full hover:bg-primary-100 dark:hover:bg-primary-800 transition-colors"
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <Moon className="w-5 h-5 text-primary-600 dark:text-primary-300" />
      ) : (
        <Sun className="w-5 h-5 text-primary-600 dark:text-primary-300" />
      )}
    </button>
  );
}