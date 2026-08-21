import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

interface Props {
    title: string;
    count: number;
    color: string;
    onPress?: () => void;
}

export const SummaryCard: React.FC<Props> = ({ title, count, color, onPress }) => {
    const { colors, spacing, layout, shadows, mode } = useTheme();

    // Create gradient from color
    const getGradientColors = (baseColor: string): [string, string] => {
        if (mode === 'dark') {
            return [`${baseColor}22`, `${baseColor}08`];
        }
        return ['#ffffff', '#f8f9fa'];
    };

    const styles = StyleSheet.create({
        card: {
            flex: 1,
            borderRadius: layout.borderRadius || 16,
            margin: spacing.xs,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: mode === 'dark' ? `${color}25` : colors.border,
            ...shadows.small,
        },
        gradient: {
            paddingVertical: 14,
            paddingHorizontal: 12,
        },
        content: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        leftSection: {
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
            marginRight: 6,
        },
        indicator: {
            width: 4,
            height: 36,
            borderRadius: 2,
            marginRight: 10,
        },
        textContainer: {
            flex: 1,
        },
        count: {
            color: colors.textPrimary,
            fontSize: 26,
            fontWeight: '300',
            letterSpacing: -0.5,
            lineHeight: 28,
            marginBottom: 2,
        },
        title: {
            color: colors.textSecondary,
            fontSize: 10,
            fontWeight: '700',
            letterSpacing: 0.5,
            textTransform: 'uppercase',
        },
        viewButton: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 2,
            backgroundColor: `${color}18`,
            borderWidth: 1,
            borderColor: `${color}40`,
            paddingHorizontal: 7,
            paddingVertical: 4,
            borderRadius: 8,
        },
        viewButtonText: {
            color: color,
            fontSize: 10,
            fontWeight: '700',
            letterSpacing: 0.4,
            textTransform: 'uppercase',
        },
    });

    return (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={onPress ? 0.7 : 1}
            onPress={onPress}
            disabled={!onPress}
        >
            <LinearGradient
                colors={getGradientColors(color)}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            >
                <View style={styles.content}>
                    <View style={styles.leftSection}>
                        <View style={[styles.indicator, { backgroundColor: color }]} />
                        <View style={styles.textContainer}>
                            <Text style={styles.count}>{count}</Text>
                            <Text style={styles.title} numberOfLines={1}>{title}</Text>
                        </View>
                    </View>
                    <View style={styles.viewButton}>
                        <Text style={styles.viewButtonText}>View</Text>
                        <MaterialCommunityIcons name="chevron-right" size={12} color={color} />
                    </View>
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );
};
