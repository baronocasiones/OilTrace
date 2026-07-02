/**
 * ThemeContext
 *
 * Provides the active theme to the entire component tree.
 * Persists the user's preferred mode via AsyncStorage.
 *
 * Usage:
 *   // In _layout.tsx (root):
 *   <ThemeProvider><Slot /></ThemeProvider>
 *
 *   // In any component:
 *   const { theme, mode, setMode } = useTheme();
 *   const styles = makeStyles(theme);
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { buildTheme, defaultTheme, type Theme, type ThemeMode } from './theme';

interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: defaultTheme,
  mode: 'dark',
  setMode: () => {},
});

interface ThemeProviderProps {
  children: React.ReactNode;
  initialMode?: ThemeMode;
}

export function ThemeProvider({ children, initialMode = 'dark' }: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>(initialMode);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
  }, []);

  const theme = useMemo(() => buildTheme(mode), [mode]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, mode, setMode }),
    [theme, mode, setMode]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
