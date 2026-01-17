export type UrgencyLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type DeadlineType =
    | 'HEARING'
    | 'FILING'
    | 'REPLY'
    | 'AFFIDAVIT'
    | 'EVIDENCE'
    | 'ARGUMENTS'
    | 'ORDER_COMPLIANCE'
    | 'OTHER';

export const DEADLINE_TYPES: DeadlineType[] = [
    'HEARING',
    'FILING',
    'REPLY',
    'AFFIDAVIT',
    'EVIDENCE',
    'ARGUMENTS',
    'ORDER_COMPLIANCE',
    'OTHER',
];

export const URGENCY_LEVELS: UrgencyLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export interface Deadline {
    id: string;
    caseId: string;
    title: string;
    type: DeadlineType;
    dueDate: string; // ISO 8601
    urgency: UrgencyLevel; // Manual urgency override
    description?: string;
    isCompleted: boolean;
    notificationIds: string[];
    createdAt: string;
    updatedAt: string;
}
