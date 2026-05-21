import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';

const ThemeContext = createContext();

export const lightTheme = {
  background: '#f8fafc',
  surface: '#ffffff',
  cardBackground: '#ffffff',
  text: '#0f172a',
  textSecondary: '#64748b',
  primary: '#4f46e5',
  border: '#e2e8f0',
  messageUser: '#4f46e5',
  messageUserText: '#ffffff',
  messageSystem: '#ffffff',
  messageSystemText: '#0f172a',
  danger: '#ef4444',
  success: '#22c55e'
};

export const darkTheme = {
  background: '#020617',
  surface: '#0f172a',
  cardBackground: '#0f172a',
  text: '#f8fafc',
  textSecondary: '#94a3b8',
  primary: '#38bdf8',
  border: '#1e293b',
  messageUser: '#38bdf8',
  messageUserText: '#020617',
  messageSystem: '#1e293b',
  messageSystemText: '#f8fafc',
  danger: '#ef4444',
  success: '#22c55e'
};

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemColorScheme === 'dark');

  const theme = isDark ? darkTheme : lightTheme;

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
