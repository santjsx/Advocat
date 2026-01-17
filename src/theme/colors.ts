// Theme Configuration - Light & Dark Mode
// Premium palettes for legal professionals

export type ThemeMode = 'light' | 'dark';

// Dark Theme - Default
export const darkColors = {
    // Core Backgrounds
    background: '#0a0a0f',
    surface: '#12121a',
    surfaceHighlight: '#1a1a24',
    surfaceElevated: '#22222e',

    // Borders
    border: '#2a2a38',
    borderLight: '#3a3a4a',

    // Premium Accent - Deep Blue
    accent: '#3b82f6',
    accentLight: '#60a5fa',
    accentMuted: 'rgba(59, 130, 246, 0.15)',

    // Primary
    primary: '#6366f1',
    primaryMuted: 'rgba(99, 102, 241, 0.15)',

    // Text Hierarchy
    textPrimary: '#f8f8fc',
    textSecondary: '#9ca3af',
    textTertiary: '#6b7280',
    textMuted: '#4b5563',

    // Urgency Colors
    critical: '#ef4444',
    warning: '#f59e0b',
    safe: '#22c55e',
    overdue: '#dc2626',

    // Semantic
    success: '#10b981',
    info: '#3b82f6',

    // Toggle specific
    toggleBg: '#303136',
    toggleBgUnchecked: '#f4f4f5',
};

// Light Theme - Enhanced for better visibility
export const lightColors = {
    // Core Backgrounds - Slightly warmer off-white
    background: '#f5f5f7',
    surface: '#ffffff',
    surfaceHighlight: '#eaecf0',
    surfaceElevated: '#ffffff',

    // Borders - Darker for better definition
    border: '#d1d5db',
    borderLight: '#9ca3af',

    // Premium Accent - Deep Blue
    accent: '#2563eb',
    accentLight: '#3b82f6',
    accentMuted: 'rgba(37, 99, 235, 0.12)',

    // Primary - Deeper indigo
    primary: '#4338ca',
    primaryMuted: 'rgba(67, 56, 202, 0.12)',

    // Text Hierarchy - Significantly darker for readability
    textPrimary: '#0f172a',      // Near black
    textSecondary: '#334155',    // Dark slate
    textTertiary: '#475569',     // Medium slate
    textMuted: '#64748b',        // Light slate

    // Urgency Colors - Deeper, more saturated
    critical: '#b91c1c',
    warning: '#b45309',
    safe: '#15803d',
    overdue: '#991b1b',

    // Semantic
    success: '#047857',
    info: '#1d4ed8',

    // Toggle specific
    toggleBg: '#303136',
    toggleBgUnchecked: '#e5e7eb',
};

export type ColorPalette = typeof darkColors;

export const getColors = (mode: ThemeMode): ColorPalette => {
    return mode === 'dark' ? darkColors : lightColors;
};

export const spacing = {
    xxs: 2,
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
    xxl: 48,
};

export const layout = {
    borderRadius: 12,
    borderRadiusSmall: 8,
    borderRadiusLarge: 16,
};

export const typography = {
    displayLarge: {
        fontSize: 42,
        fontWeight: '200' as const,
        letterSpacing: -1.5,
    },
    displayMedium: {
        fontSize: 34,
        fontWeight: '300' as const,
        letterSpacing: -1,
    },
    h1: {
        fontSize: 28,
        fontWeight: '500' as const,
        letterSpacing: -0.5,
    },
    h2: {
        fontSize: 22,
        fontWeight: '500' as const,
        letterSpacing: -0.3,
    },
    h3: {
        fontSize: 18,
        fontWeight: '600' as const,
        letterSpacing: 0,
    },
    body: {
        fontSize: 16,
        fontWeight: '400' as const,
        lineHeight: 24,
    },
    bodySmall: {
        fontSize: 14,
        fontWeight: '400' as const,
        lineHeight: 20,
    },
    label: {
        fontSize: 12,
        fontWeight: '600' as const,
        letterSpacing: 0.8,
        textTransform: 'uppercase' as const,
    },
    caption: {
        fontSize: 11,
        fontWeight: '500' as const,
        letterSpacing: 0.5,
    },
};

export const shadows = {
    small: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    medium: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    large: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8,
    },
};

// Legacy export for backward compatibility - will use context
export const colors = darkColors;
