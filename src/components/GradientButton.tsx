import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';

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

    const getGradientColors = (): [string, string] => {
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
    };

    const styles = StyleSheet.create({
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
    });

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
    };

    return (
        <TouchableOpacity
            onPress={handlePress}
            disabled={disabled}
            activeOpacity={0.8}
            style={[styles.container, style]}
        >
            <LinearGradient
                colors={getGradientColors()}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradient}
            >
                <Text style={[styles.text, disabled && styles.disabledText]}>
                    {title}
                </Text>
            </LinearGradient>
        </TouchableOpacity>
    );
};
