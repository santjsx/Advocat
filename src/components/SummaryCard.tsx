import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';

interface Props {
    title: string;
    count: number;
    color: string;
}

export const SummaryCard: React.FC<Props> = ({ title, count, color }) => {
    const { colors, spacing, layout, shadows, mode } = useTheme();

    // Create gradient from color
    const getGradientColors = (baseColor: string): [string, string] => {
        if (mode === 'dark') {
            return [`${baseColor}20`, `${baseColor}08`];
        }
        // Pure white for light mode (basically removes gradient effect)
        return ['#ffffff', '#ffffff'];
    };

    const styles = StyleSheet.create({
        card: {
            flex: 1,
            borderRadius: layout.borderRadius,
            margin: spacing.xs,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.border,
            ...shadows.small,
        },
        gradient: {
            padding: spacing.m,
        },
        content: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        indicator: {
            width: 4,
            height: 40,
            borderRadius: 2,
            marginRight: spacing.m,
        },
        textContainer: {
            flex: 1,
        },
        count: {
            color: colors.textPrimary,
            fontSize: 32,
            fontWeight: '200',
            letterSpacing: -1,
            marginBottom: 2,
        },
        title: {
            color: colors.textSecondary,
            fontSize: 12,
            fontWeight: '500',
            letterSpacing: 0.3,
            textTransform: 'uppercase',
        },
    });

    return (
        <View style={styles.card}>
            <LinearGradient
                colors={getGradientColors(color)}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            >
                <View style={styles.content}>
                    <View style={[styles.indicator, { backgroundColor: color }]} />
                    <View style={styles.textContainer}>
                        <Text style={styles.count}>{count}</Text>
                        <Text style={styles.title}>{title}</Text>
                    </View>
                </View>
            </LinearGradient>
        </View>
    );
};
