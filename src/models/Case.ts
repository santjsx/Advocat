export type CaseStatus = 'ACTIVE' | 'CLOSED' | 'PENDING';

export type CaseStage =
    | 'INTAKE'
    | 'INVESTIGATION'
    | 'PLEADING'
    | 'DISCOVERY'
    | 'PRE_TRIAL'
    | 'TRIAL'
    | 'POST_TRIAL'
    | 'APPEAL'
    | 'SETTLEMENT'
    | 'CLOSED';

export const CASE_STAGES: { value: CaseStage; label: string }[] = [
    { value: 'INTAKE', label: 'Intake' },
    { value: 'INVESTIGATION', label: 'Investigation' },
    { value: 'PLEADING', label: 'Pleading' },
    { value: 'DISCOVERY', label: 'Discovery' },
    { value: 'PRE_TRIAL', label: 'Pre-Trial' },
    { value: 'TRIAL', label: 'Trial' },
    { value: 'POST_TRIAL', label: 'Post-Trial' },
    { value: 'APPEAL', label: 'Appeal' },
    { value: 'SETTLEMENT', label: 'Settlement' },
    { value: 'CLOSED', label: 'Closed' },
];

export type CaseType =
    | 'CIVIL'
    | 'CRIMINAL'
    | 'FAMILY'
    | 'CORPORATE'
    | 'PROPERTY'
    | 'LABOR'
    | 'OTHER';

export const CASE_TYPES: CaseType[] = [
    'CIVIL',
    'CRIMINAL',
    'FAMILY',
    'CORPORATE',
    'PROPERTY',
    'LABOR',
    'OTHER',
];

// Legal section types (IPC, BNS, CrPC, etc.)
export type LegalActType =
    | 'IPC'      // Indian Penal Code (old)
    | 'BNS'      // Bharatiya Nyaya Sanhita (new - replaces IPC)
    | 'CRPC'     // Code of Criminal Procedure (old)
    | 'BNSS'     // Bharatiya Nagarik Suraksha Sanhita (new - replaces CrPC)
    | 'BSA'      // Bharatiya Sakshya Adhiniyam (new - replaces Evidence Act)
    | 'IEA'      // Indian Evidence Act (old)
    | 'CPC'      // Code of Civil Procedure
    | 'MV_ACT'   // Motor Vehicles Act
    | 'NI_ACT'   // Negotiable Instruments Act
    | 'EVIDENCE' // Generic Evidence
    | 'BNR'      // Bharatiya Nyaya Rules
    | 'MVA'      // Motor Vehicles Act (Alternate)
    | 'NDPS'     // NDPS Act
    | 'POSH'     // POSH Act
    | 'POCSO'    // POCSO Act
    | 'SC_ST'    // SC/ST Act
    | 'OTHER';

export const LEGAL_ACTS: { value: LegalActType; label: string }[] = [
    { value: 'BNS', label: 'BNS (Bharatiya Nyaya Sanhita)' },
    { value: 'IPC', label: 'IPC (Indian Penal Code)' },
    { value: 'BNSS', label: 'BNSS (Bharatiya Nagarik Suraksha Sanhita)' },
    { value: 'CRPC', label: 'CrPC (Code of Criminal Procedure)' },
    { value: 'BSA', label: 'BSA (Bharatiya Sakshya Adhiniyam)' },
    { value: 'IEA', label: 'IEA (Indian Evidence Act)' },
    { value: 'CPC', label: 'CPC (Code of Civil Procedure)' },
    { value: 'MV_ACT', label: 'MV Act (Motor Vehicles)' },
    { value: 'NI_ACT', label: 'NI Act (Cheque Bounce)' },
    { value: 'EVIDENCE', label: 'Evidence Act' },
    { value: 'BNR', label: 'BNR (Bharatiya Nyaya Rules)' },
    { value: 'NDPS', label: 'NDPS Act' },
    { value: 'POSH', label: 'POSH Act' },
    { value: 'POCSO', label: 'POCSO Act' },
    { value: 'SC_ST', label: 'SC/ST Act' },
    { value: 'OTHER', label: 'Other Acts' },
];

// Legal section applied to a case
export interface LegalSection {
    id: string;
    act: LegalActType;
    section: string;      // e.g., "302", "420", "34"
    description?: string; // Optional description of the section
    isChargeSheet?: boolean; // Whether this is part of charge sheet
}

// Case note for internal notes
export interface CaseNote {
    id: string;
    content: string;
    createdAt: string;
    updatedAt: string;
}

// Timeline event for case history
export type TimelineEventType =
    | 'CASE_CREATED'
    | 'STATUS_CHANGED'
    | 'STAGE_CHANGED'
    | 'DEADLINE_ADDED'
    | 'DEADLINE_COMPLETED'
    | 'DOCUMENT_ADDED'
    | 'NOTE_ADDED'
    | 'SECTION_ADDED'
    | 'HEARING_SCHEDULED'
    | 'CLIENT_MEETING'
    | 'CUSTOM';

export interface TimelineEvent {
    id: string;
    type: TimelineEventType;
    title: string;
    description?: string;
    date: string;
    metadata?: Record<string, any>;
}

// Client information
export interface ClientInfo {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    companyName?: string;
    notes?: string;
}

export interface Case {
    id: string;
    name: string;
    caseNumber?: string;
    client: ClientInfo;
    courtName: string;
    caseType: CaseType;
    stage: CaseStage;
    filingDate: string;
    description?: string;
    status: CaseStatus;
    sections: LegalSection[];  // IPC/BNS sections
    notes: CaseNote[];
    timeline: TimelineEvent[];
    createdAt: string;
    updatedAt: string;

    // Legacy support - will be removed
    clientName?: string;
    clientPhone?: string;
}
