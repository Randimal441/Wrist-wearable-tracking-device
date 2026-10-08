'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    // The inline script in layout.tsx already set data-theme on <html>.
    // Read it back so React state matches the DOM attribute.
    const current = (document.documentElement.getAttribute('data-theme') as Theme) ?? 'dark';
    setTheme(current);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('wristtrack-theme', next);
      document.documentElement.setAttribute('data-theme', next);
      return next;
    });
  }, []);

  // Always render children — theme defaults to 'dark' until localStorage is read
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
