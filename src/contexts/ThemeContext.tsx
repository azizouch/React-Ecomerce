import { createContext, useContext, useState, useEffect } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getInitialThemeMode(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'system';
  }

  const saved = localStorage.getItem('theme');
  if (saved === 'light' || saved === 'dark') {
    return saved;
  }

  return 'system';
}

function getSystemPrefersDark() {
  return typeof window !== 'undefined'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialThemeMode);

  const isDark = themeMode === 'dark' || (themeMode === 'system' && getSystemPrefersDark());

  useEffect(() => {
    const applyTheme = () => {
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      if (themeMode === 'system') {
        localStorage.removeItem('theme');
      } else {
        localStorage.setItem('theme', themeMode);
      }
    };

    applyTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => {
      if (themeMode === 'system') {
        const systemDark = mediaQuery.matches;
        if (systemDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };

    mediaQuery.addEventListener
      ? mediaQuery.addEventListener('change', handleMediaChange)
      : mediaQuery.addListener(handleMediaChange);

    return () => {
      mediaQuery.removeEventListener
        ? mediaQuery.removeEventListener('change', handleMediaChange)
        : mediaQuery.removeListener(handleMediaChange);
    };
  }, [themeMode, isDark]);

  const toggleTheme = () => {
    setThemeMode((previous) => (previous === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ isDark, themeMode, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
