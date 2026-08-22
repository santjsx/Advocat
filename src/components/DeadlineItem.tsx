import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import { Deadline, UrgencyLevel } from '../models/Deadline';
import { useTheme } from '../theme/ThemeContext';
import { SmoothPressable } from './SmoothPressable';

interface Props {
    deadline: Deadline;
    caseName?: string;
    onPress: () => void;
    onToggleComplete: () => void;
}

const DeadlineItemComponent: React.FC<Props> = ({ deadline, caseName, onPress, onToggleComplete }) => {
    const { colors, spacing, layout, shadows } = useTheme();

    const URGENCY_COLORS: Record<UrgencyLevel, string> = useMemo(() => ({
        CRITICAL: colors.critical,
        HIGH: colors.warning,
        MEDIUM: colors.accent,
        LOW: colors.safe,
    }), [colors]);

    const isCompleted = deadline.isCompleted;
    const isOverdue = !isCompleted && dayjs(deadline.dueDate).isBefore(dayjs(), 'day');
    const daysUntil = dayjs(deadline.dueDate).diff(dayjs(), 'day');

    const bgColor = colors.surface;
    const accentColor = isCompleted ? colors.textTertiary : (isOverdue ? colors.overdue : URGENCY_COLORS[deadline.urgency]);

    const daysLabel = useMemo(() => {
        if (isCompleted) return 'Done';
        if (daysUntil < 0) return `${Math.abs(daysUntil)}d overdue`;
        if (daysUntil === 0) return 'Today';
        if (daysUntil === 1) return 'Tomorrow';
        return `${daysUntil}d left`;
    }, [isCompleted, daysUntil]);

    const styles = useMemo(() => StyleSheet.create({
        container: {
            flexDirection: 'row',
            marginBottom: spacing.s,
            borderRadius: layout.borderRadius,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.border,
            overflow: 'hidden',
            backgroundColor: bgColor,
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
    }), [colors, spacing, layout, shadows, bgColor]);

    return (
        <SmoothPressable
            onPress={onPress}
            style={[
                styles.container,
                isCompleted && styles.completedContainer,
            ]}
            haptic="light"
            scaleTo={0.98}
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
                        {daysLabel}
                    </Text>
                </View>

                <View style={styles.bottomRow}>
                    <Text style={styles.meta}>
                        {dayjs(deadline.dueDate).format('ddd, D MMM')} · {deadline.type.replace('_', ' ')}
                        {caseName && ` · ${caseName}`}
                    </Text>
                </View>
            </View>

            <SmoothPressable
                onPress={onToggleComplete}
                style={[styles.checkbox, isCompleted && styles.checkboxChecked]}
                hitSlop={12}
                haptic={isCompleted ? 'light' : 'success'}
                scaleTo={0.88}
            >
                {isCompleted && <Text style={styles.checkmark}>✓</Text>}
            </SmoothPressable>
        </SmoothPressable>
    );
};

export const DeadlineItem = React.memo(DeadlineItemComponent, (prev, next) => {
    return (
        prev.deadline.id === next.deadline.id &&
        prev.deadline.isCompleted === next.deadline.isCompleted &&
        prev.deadline.dueDate === next.deadline.dueDate &&
        prev.deadline.urgency === next.deadline.urgency &&
        prev.deadline.title === next.deadline.title &&
        prev.caseName === next.caseName
    );
});
