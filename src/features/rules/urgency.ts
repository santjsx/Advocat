import dayjs from 'dayjs';
import { UrgencyLevel } from '../../models/Deadline';

export const getUrgencyLevel = (dueDate: string, isCompleted: boolean): UrgencyLevel => {
    if (isCompleted) return 'LOW';

    // Use end of day for urgency calculation to be generous
    const now = dayjs();
    const due = dayjs(dueDate).endOf('day');
    const diffDays = due.diff(now, 'day', true);

    // If due date is yesterday or earlier (overdue = CRITICAL)
    if (due.isBefore(now, 'day')) {
        return 'CRITICAL';
    }

    const daysRemaining = Math.ceil(diffDays);

    if (daysRemaining < 0) return 'CRITICAL'; // Overdue
    if (daysRemaining <= 3) return 'CRITICAL'; // Due within 3 days
    if (daysRemaining <= 7) return 'HIGH';     // Due within a week
    if (daysRemaining <= 14) return 'MEDIUM';  // Due within 2 weeks

    return 'LOW'; // More than 2 weeks away
};
