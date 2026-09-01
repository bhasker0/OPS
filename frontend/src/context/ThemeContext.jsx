import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('ops_theme') || 'dark';
  });

  const [scanlines, setScanlines] = useState(() => {
    return localStorage.getItem('ops_crt_scanlines') !== 'false';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ops_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('ops_crt_scanlines', String(scanlines));
  }, [scanlines]);

  const toggleTheme = (newTheme) => {
    if (newTheme) {
      setTheme(newTheme);
    } else {
      setTheme((prev) => (prev === 'dark' ? 'light' : prev === 'light' ? 'high-contrast' : 'dark'));
    }
  };

  const toggleScanlines = () => {
    setScanlines((prev) => !prev);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: toggleTheme, scanlines, setScanlines, toggleScanlines }}>
      {children}
      {scanlines && <div className="crt-scanlines" aria-hidden="true" />}
      {scanlines && <div className="analog-grain" aria-hidden="true" />}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
