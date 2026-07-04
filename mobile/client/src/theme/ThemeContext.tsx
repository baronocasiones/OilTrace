/**
 * ThemeContext
 *
 * Provides the active theme to the entire component tree.
 * Persists the user's preferred mode via AsyncStorage so the choice survives app restarts.
 *
 * Usage:
 *   // In _layout.tsx (root):
 *   <ThemeProvider><Slot /></ThemeProvider>
 *
 *   // In any component:
 *   const { theme, mode, setMode } = useTheme();
 *   const styles = makeStyles(theme);
 */

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildTheme, defaultTheme, type Theme, type ThemeMode } from './theme';

const STORAGE_KEY = '@oiltrace_theme_mode';

interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: defaultTheme,
  mode: 'light',
  setMode: () => {},
});

interface ThemeProviderProps {
  children: React.ReactNode;
  initialMode?: ThemeMode;
}

export function ThemeProvider({ children, initialMode = 'light' }: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>(initialMode);
  const [ready, setReady] = useState(false);

  // Read stored theme from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark' || stored === 'dim') {
          setModeState(stored);
        }
      })
      .catch(() => {
        // Silently fall back to initialMode
      })
      .finally(() => {
        setReady(true);
      });
  }, []);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    // Persist to AsyncStorage
    AsyncStorage.setItem(STORAGE_KEY, newMode).catch(() => {});
  }, []);

  const theme = useMemo(() => buildTheme(mode), [mode]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, mode, setMode }),
    [theme, mode, setMode],
  );

  // Render children immediately; theme flashes to light then correct mode are
  // prevented by the splash screen hiding after fonts load in _layout.tsx.
  // Once ready, the correct theme is applied.
  if (!ready) {
    // Return a hidden placeholder so the context value is still provided
    return (
      <ThemeContext.Provider value={value}>
        <>{children}</>
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
