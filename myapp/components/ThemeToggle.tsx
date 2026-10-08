'use client';

import { useTheme } from '../app/context/ThemeContext';

export default function ThemeToggle({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const px = size === 'sm' ? 34 : 40;
  const iconSize = size === 'sm' ? 16 : 18;

  return (
    <button
      id="theme-toggle-btn"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        width: px,
        height: px,
        borderRadius: '50%',
        border: '1px solid var(--border)',
        background: 'var(--bg-card)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: isDark ? '#fbbf24' : '#6c63ff',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        flexShrink: 0,
        boxShadow: isDark
          ? '0 0 12px rgba(251,191,36,0.15)'
          : '0 0 12px rgba(108,99,255,0.15)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1) rotate(20deg)';
        (e.currentTarget as HTMLButtonElement).style.borderColor = isDark
          ? 'rgba(251,191,36,0.5)'
          : 'rgba(108,99,255,0.5)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1) rotate(0deg)';
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
      }}
    >
      {isDark ? (
        /* Sun icon */
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        /* Moon icon */
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
