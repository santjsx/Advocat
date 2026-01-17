export interface NotificationPreferences {
    enabled: boolean;
    sameDayReminder: boolean;
    oneDayBefore: boolean;
    threeDaysBefore: boolean;
    customDaysBefore: number | null; // null = disabled, number = days before
    reminderTime: string; // HH:mm format, e.g. "09:00"
}

export interface NotificationHistoryItem {
    id: string;
    deadlineId: string;
    deadlineTitle: string;
    caseName: string;
    type: 'SAME_DAY' | 'ONE_DAY' | 'THREE_DAYS' | 'CUSTOM' | 'OVERDUE';
    message: string;
    scheduledAt: string; // ISO 8601
    read: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
    enabled: true,
    sameDayReminder: true,
    oneDayBefore: true,
    threeDaysBefore: true,
    customDaysBefore: null,
    reminderTime: '09:00',
};
