import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import dayjs from 'dayjs';
import { Deadline, UrgencyLevel } from '../models/Deadline';
import { useTheme } from '../theme/ThemeContext';

interface Props {
    deadline: Deadline;
    caseName?: string;
    onPress: () => void;
    onToggleComplete: () => void;
}

export const DeadlineItem: React.FC<Props> = ({ deadline, caseName, onPress, onToggleComplete }) => {
    const { colors, spacing, layout, shadows } = useTheme();

    const URGENCY_COLORS: Record<UrgencyLevel, string> = {
        CRITICAL: colors.critical,
        HIGH: colors.warning,
        MEDIUM: colors.accent,
        LOW: colors.safe,
    };

    const getUrgencyBackground = (urgency: UrgencyLevel, isOverdue: boolean): string => {
        // Always use surface color (white/dark grey) for the card background to stay clean
        // We rely on the accent bar and labels to convey urgency now
        if (isOverdue && shadows.medium.shadowColor === '#000') { // Check if not light mode via proxies or just sticky to surface
            // Actually, let's just stick to surface for light mode to avoid the 'dirty' look mentioned
            return colors.surface;
        }
        return colors.surface;
    };

    const isCompleted = deadline.isCompleted;
    const isOverdue = !isCompleted && dayjs(deadline.dueDate).isBefore(dayjs(), 'day');
    const daysUntil = dayjs(deadline.dueDate).diff(dayjs(), 'day');

    const bgColor = isCompleted ? colors.surface : getUrgencyBackground(deadline.urgency, isOverdue);
    const accentColor = isCompleted ? colors.textTertiary : (isOverdue ? colors.overdue : URGENCY_COLORS[deadline.urgency]);

    const getDaysLabel = () => {
        if (isCompleted) return 'Done';
        if (daysUntil < 0) return `${Math.abs(daysUntil)}d overdue`;
        if (daysUntil === 0) return 'Today';
        if (daysUntil === 1) return 'Tomorrow';
        return `${daysUntil}d left`;
    };

    const styles = StyleSheet.create({
        container: {
            flexDirection: 'row',
            marginBottom: spacing.s,
            borderRadius: layout.borderRadius,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.border,
            overflow: 'hidden',
            ...shadows.small,
        },
        completedContainer: {
            opacity: 0.6,
        },
        accentBar: {
            width: 4,
            alignSelf: 'stretch',
        },
        content: {
            flex: 1,
            padding: spacing.m,
            paddingLeft: spacing.m,
        },
        topRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 6,
        },
        title: {
            color: colors.textPrimary,
            fontSize: 16,
            fontWeight: '500',
            flex: 1,
            marginRight: spacing.s,
        },
        completedText: {
            textDecorationLine: 'line-through',
            color: colors.textTertiary,
        },
        daysLabel: {
            color: colors.textSecondary,
            fontSize: 12,
            fontWeight: '600',
            backgroundColor: colors.surfaceHighlight,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 4,
        },
        overdueLabel: {
            color: colors.overdue,
            backgroundColor: 'rgba(220, 38, 38, 0.15)',
        },
        completedLabel: {
            color: colors.safe,
            backgroundColor: 'rgba(34, 197, 94, 0.15)',
        },
        bottomRow: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        meta: {
            color: colors.textTertiary,
            fontSize: 13,
        },
        checkbox: {
            width: 28,
            height: 28,
            borderRadius: 14,
            borderWidth: 2,
            borderColor: colors.textTertiary,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: spacing.m,
        },
        checkboxChecked: {
            borderColor: colors.safe,
            backgroundColor: colors.safe,
        },
        checkmark: {
            color: colors.background,
            fontSize: 14,
            fontWeight: 'bold',
        },
    });

    return (
        <TouchableOpacity
            onPress={onPress}
            style={[
                styles.container,
                { backgroundColor: bgColor },
                isCompleted && styles.completedContainer
            ]}
            activeOpacity={0.8}
        >
            <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

            <View style={styles.content}>
                <View style={styles.topRow}>
                    <Text style={[styles.title, isCompleted && styles.completedText]} numberOfLines={1}>
                        {deadline.title}
                    </Text>
                    <Text style={[
                        styles.daysLabel,
                        isOverdue && styles.overdueLabel,
                        isCompleted && styles.completedLabel
                    ]}>
                        {getDaysLabel()}
                    </Text>
                </View>

                <View style={styles.bottomRow}>
                    <Text style={styles.meta}>
                        {dayjs(deadline.dueDate).format('ddd, D MMM')} · {deadline.type.replace('_', ' ')}
                        {caseName && ` · ${caseName}`}
                    </Text>
                </View>
            </View>

            <TouchableOpacity
                onPress={onToggleComplete}
                style={[styles.checkbox, isCompleted && styles.checkboxChecked]}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
                {isCompleted && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
        </TouchableOpacity>
    );
};
