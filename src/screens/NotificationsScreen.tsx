import React from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../store/useAppStore';
import { colors, spacing, layout } from '../theme/colors';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { NotificationHistoryItem } from '../models/Notification';

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
    const notificationHistory = useAppStore(state => state.notificationHistory);
    const markNotificationRead = useAppStore(state => state.markNotificationRead);
    const markAllNotificationsRead = useAppStore(state => state.markAllNotificationsRead);
    const clearNotificationHistory = useAppStore(state => state.clearNotificationHistory);

    const unreadCount = notificationHistory.filter(n => !n.read).length;

    const renderItem = ({ item }: { item: NotificationHistoryItem }) => (
        <TouchableOpacity
            style={[styles.notificationItem, !item.read && styles.unreadItem]}
            onPress={() => {
                markNotificationRead(item.id);
                navigation.navigate('EditDeadline', { deadlineId: item.deadlineId });
            }}
            activeOpacity={0.7}
        >
            <View style={styles.notificationContent}>
                <Text style={styles.notificationType}>{TYPE_LABELS[item.type] || item.type}</Text>
                <Text style={styles.notificationTitle}>{item.deadlineTitle}</Text>
                <Text style={styles.notificationCase}>{item.caseName}</Text>
                <Text style={styles.notificationTime}>{dayjs(item.scheduledAt).fromNow()}</Text>
            </View>
            {!item.read && <View style={styles.unreadDot} />}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Notifications</Text>
                <View style={styles.headerActions}>
                    {unreadCount > 0 && (
                        <TouchableOpacity onPress={markAllNotificationsRead} style={styles.actionButton}>
                            <Text style={styles.actionText}>Mark All Read</Text>
                        </TouchableOpacity>
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
                <TouchableOpacity
                    style={styles.clearButton}
                    onPress={clearNotificationHistory}
                >
                    <Text style={styles.clearText}>Clear All History</Text>
                </TouchableOpacity>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
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
        paddingBottom: 100,
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
