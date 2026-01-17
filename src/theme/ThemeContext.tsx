import React, { createContext, useContext, ReactNode } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getColors, ColorPalette, ThemeMode, spacing, layout, shadows, typography } from './colors';

interface ThemeContextType {
    colors: ColorPalette;
    mode: ThemeMode;
    toggleTheme: () => void;
    spacing: typeof spacing;
    layout: typeof layout;
    shadows: typeof shadows;
    typography: typeof typography;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
    children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    const themeMode = useAppStore(state => state.themeMode);
    const setThemeMode = useAppStore(state => state.setThemeMode);

    const toggleTheme = () => {
        setThemeMode(themeMode === 'dark' ? 'light' : 'dark');
    };

    const value: ThemeContextType = {
        colors: getColors(themeMode),
        mode: themeMode,
        toggleTheme,
        spacing,
        layout,
        shadows,
        typography,
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
