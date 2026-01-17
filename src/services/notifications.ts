import * as Notifications from 'expo-notifications';
import dayjs from 'dayjs';
import { Deadline } from '../models/Deadline';
import { NotificationPreferences } from '../models/Notification';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export const requestPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
};

interface ScheduleOptions {
    deadline: Deadline;
    caseName: string;
    prefs: NotificationPreferences;
}

export const scheduleDeadlineNotifications = async (options: ScheduleOptions): Promise<string[]> => {
    const { deadline, caseName, prefs } = options;

    if (!prefs.enabled || deadline.isCompleted) return [];

    const due = dayjs(deadline.dueDate);
    const now = dayjs();
    const notificationIds: string[] = [];

    // Parse reminder time
    const [hours, minutes] = prefs.reminderTime.split(':').map(Number);

    const scheduleNotification = async (
        triggerDate: dayjs.Dayjs,
        label: string
    ): Promise<string | null> => {
        // Set to reminder time
        const trigger = triggerDate.hour(hours).minute(minutes).second(0);
        const secondsUntilTrigger = trigger.diff(now, 'second');

        if (secondsUntilTrigger > 0) {
            try {
                const id = await Notifications.scheduleNotificationAsync({
                    content: {
                        title: `📅 ${label}`,
                        body: `${deadline.title} - ${caseName}`,
                        data: { deadlineId: deadline.id, caseId: deadline.caseId },
                        sound: true,
                    },
                    trigger: { seconds: secondsUntilTrigger } as any,
                });
                return id;
            } catch (e) {
                console.warn('Failed to schedule notification', e);
                return null;
            }
        }
        return null;
    };

    // Same day reminder
    if (prefs.sameDayReminder) {
        const id = await scheduleNotification(due, 'Due Today');
        if (id) notificationIds.push(id);
    }

    // 1 day before
    if (prefs.oneDayBefore) {
        const id = await scheduleNotification(due.subtract(1, 'day'), 'Due Tomorrow');
        if (id) notificationIds.push(id);
    }

    // 3 days before
    if (prefs.threeDaysBefore) {
        const id = await scheduleNotification(due.subtract(3, 'day'), '3 Days Left');
        if (id) notificationIds.push(id);
    }

    // Custom days before
    if (prefs.customDaysBefore && prefs.customDaysBefore > 0) {
        const id = await scheduleNotification(
            due.subtract(prefs.customDaysBefore, 'day'),
            `${prefs.customDaysBefore} Days Left`
        );
        if (id) notificationIds.push(id);
    }

    return notificationIds;
};

export const cancelNotifications = async (ids: string[]) => {
    for (const id of ids) {
        try {
            await Notifications.cancelScheduledNotificationAsync(id);
        } catch (e) {
            console.warn('Failed to cancel notification', id, e);
        }
    }
};

export const cancelAllNotifications = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
};

export const getScheduledNotifications = async () => {
    return await Notifications.getAllScheduledNotificationsAsync();
};
