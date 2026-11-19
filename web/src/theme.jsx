import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const KEY = 'kq_theme';
const ThemeCtx = createContext({ mode: 'dark', setMode: () => {}, toggle: () => {} });

function readInitial() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* localStorage 不可用时回退默认 */
  }
  return 'dark';
}

/**
 * 主题：深色（CoinPulse 默认）/ 浅色（同色系反相面层）。
 * 只写 html[data-theme]，样式层由 styles/theme.css 承接；antd 主题由 antdThemeFor(mode) 承接。
 */
export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(readInitial);

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
    try {
      localStorage.setItem(KEY, mode);
    } catch {
      /* 忽略写入失败 */
    }
  }, [mode]);

  const setMode = useCallback((next) => setModeState(next === 'light' ? 'light' : 'dark'), []);
  const toggle = useCallback(() => setModeState((m) => (m === 'dark' ? 'light' : 'dark')), []);

  const value = useMemo(() => ({ mode, setMode, toggle }), [mode, setMode, toggle]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  return useContext(ThemeCtx);
}
