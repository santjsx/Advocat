import React, { useMemo } from 'react';
import { Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { SmoothPressable } from './SmoothPressable';

interface Props {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
    disabled?: boolean;
    style?: ViewStyle;
}

export const GradientButton: React.FC<Props> = ({
    title,
    onPress,
    variant = 'primary',
    disabled = false,
    style
}) => {
    const { colors, spacing, layout, mode } = useTheme();

    const gradientColors: [string, string] = useMemo(() => {
        if (disabled) {
            return [colors.textTertiary, colors.textMuted];
        }

        switch (variant) {
            case 'primary':
                return mode === 'dark'
                    ? ['#c9a227', '#a68821']  // Gold gradient
                    : ['#d4a853', '#c49734'];
            case 'secondary':
                return [colors.surface, colors.surfaceHighlight];
            case 'danger':
                return ['#dc2626', '#b91c1c'];
            default:
                return [colors.accent, colors.accent];
        }
    }, [disabled, variant, mode, colors]);

    const styles = useMemo(() => StyleSheet.create({
        container: {
            borderRadius: layout.borderRadius,
            overflow: 'hidden',
        },
        gradient: {
            paddingVertical: spacing.m,
            paddingHorizontal: spacing.l,
            alignItems: 'center',
            justifyContent: 'center',
        },
        text: {
            color: variant === 'secondary' ? colors.textPrimary : '#ffffff',
            fontSize: 16,
            fontWeight: '600',
            letterSpacing: 0.5,
        },
        disabledText: {
            color: colors.textMuted,
        },
    }), [colors, spacing, layout, variant]);

    return (
        <SmoothPressable
            onPress={onPress}
            disabled={disabled}
            style={[styles.container, style]}
            haptic="medium"
            scaleTo={0.97}
        >
            <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradient}
            >
                <Text style={[styles.text, disabled && styles.disabledText]}>
                    {title}
                </Text>
            </LinearGradient>
        </SmoothPressable>
    );
};
