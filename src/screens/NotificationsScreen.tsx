import React from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../theme/ThemeContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { NotificationHistoryItem } from '../models/Notification';

import { SmoothPressable } from '../components/SmoothPressable';
import { AnimatedListItem } from '../components/AnimatedListItem';

dayjs.extend(relativeTime);

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;

const TYPE_LABELS: Record<string, string> = {
    SAME_DAY: '📅 Due Today',
    ONE_DAY: '⏰ Tomorrow',
    THREE_DAYS: '📌 3 Days Left',
    CUSTOM: '🔔 Reminder',
    OVERDUE: '⚠️ Overdue',
};

export const NotificationsScreen: React.FC<Props> = ({ navigation }) => {
    const { colors, spacing, layout } = useTheme();
    const notificationHistory = useAppStore(state => state.notificationHistory);
    const markNotificationRead = useAppStore(state => state.markNotificationRead);
    const markAllNotificationsRead = useAppStore(state => state.markAllNotificationsRead);
    const clearNotificationHistory = useAppStore(state => state.clearNotificationHistory);

    const unreadCount = notificationHistory.filter(n => !n.read).length;
    const styles = createStyles(colors, spacing, layout);

    const renderItem = React.useCallback(({ item, index }: { item: NotificationHistoryItem; index: number }) => (
        <AnimatedListItem index={index}>
            <SmoothPressable
                style={[styles.notificationItem, !item.read && styles.unreadItem]}
                onPress={() => {
                    markNotificationRead(item.id);
                    navigation.navigate('EditDeadline', { deadlineId: item.deadlineId });
                }}
                haptic="light"
                scaleTo={0.98}
            >
                <View style={styles.notificationContent}>
                    <Text style={styles.notificationType}>{TYPE_LABELS[item.type] || item.type}</Text>
                    <Text style={styles.notificationTitle}>{item.deadlineTitle}</Text>
                    <Text style={styles.notificationCase}>{item.caseName}</Text>
                    <Text style={styles.notificationTime}>{dayjs(item.scheduledAt).fromNow()}</Text>
                </View>
                {!item.read && <View style={styles.unreadDot} />}
            </SmoothPressable>
        </AnimatedListItem>
    ), [styles, markNotificationRead, navigation]);

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <SmoothPressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={8} haptic="light">
                    <Text style={styles.backText}>← Back</Text>
                </SmoothPressable>
                <Text style={styles.title}>Notifications</Text>
                <View style={styles.headerActions}>
                    {unreadCount > 0 && (
                        <SmoothPressable onPress={markAllNotificationsRead} style={styles.actionButton} haptic="medium">
                            <Text style={styles.actionText}>Mark All Read</Text>
                        </SmoothPressable>
                    )}
                </View>
            </View>

            {unreadCount > 0 && (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount} unread</Text>
                </View>
            )}

            <FlatList
                data={notificationHistory}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                windowSize={5}
                initialNumToRender={10}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>🔔</Text>
                        <Text style={styles.emptyText}>No notifications yet</Text>
                        <Text style={styles.emptySubtext}>
                            Reminders for your deadlines will appear here
                        </Text>
                    </View>
                }
            />

            {notificationHistory.length > 0 && (
                <SmoothPressable
                    style={styles.clearButton}
                    onPress={clearNotificationHistory}
                    haptic="warning"
                    scaleTo={0.96}
                >
                    <Text style={styles.clearText}>Clear All History</Text>
                </SmoothPressable>
            )}
        </SafeAreaView>
    );
};

const createStyles = (colors: any, spacing: any, layout: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        padding: spacing.xs,
    },
    backText: {
        color: colors.accent,
        fontSize: 16,
    },
    title: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: '600',
    },
    headerActions: {
        minWidth: 80,
        alignItems: 'flex-end',
    },
    actionButton: {
        padding: spacing.xs,
    },
    actionText: {
        color: colors.accent,
        fontSize: 12,
    },
    badge: {
        backgroundColor: colors.critical,
        paddingHorizontal: spacing.m,
        paddingVertical: spacing.xs,
        marginHorizontal: spacing.m,
        marginTop: spacing.s,
        borderRadius: layout.borderRadius,
        alignSelf: 'flex-start',
    },
    badgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    list: {
        padding: spacing.m,
        paddingBottom: 140,
    },
    notificationItem: {
        backgroundColor: colors.surface,
        padding: spacing.m,
        borderRadius: layout.borderRadius,
        marginBottom: spacing.s,
        borderWidth: 1,
        borderColor: colors.border,
        flexDirection: 'row',
        alignItems: 'center',
    },
    unreadItem: {
        backgroundColor: colors.surfaceHighlight,
        borderColor: colors.accent,
    },
    notificationContent: {
        flex: 1,
    },
    notificationType: {
        color: colors.textSecondary,
        fontSize: 12,
        marginBottom: 4,
    },
    notificationTitle: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 2,
    },
    notificationCase: {
        color: colors.textSecondary,
        fontSize: 14,
        marginBottom: 4,
    },
    notificationTime: {
        color: colors.textTertiary,
        fontSize: 12,
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.accent,
        marginLeft: spacing.m,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxl,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: spacing.m,
    },
    emptyText: {
        color: colors.textSecondary,
        fontSize: 18,
        fontWeight: '500',
        marginBottom: spacing.xs,
    },
    emptySubtext: {
        color: colors.textTertiary,
        fontSize: 14,
        textAlign: 'center',
    },
    clearButton: {
        position: 'absolute',
        bottom: spacing.l,
        left: spacing.m,
        right: spacing.m,
        backgroundColor: colors.surface,
        padding: spacing.m,
        borderRadius: layout.borderRadius,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    clearText: {
        color: colors.textSecondary,
        fontSize: 14,
    },
});
