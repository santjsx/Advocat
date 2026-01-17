// Legal Research Models

export type ResearchType = 'CASE_LAW' | 'STATUTE' | 'REGULATION' | 'ARTICLE' | 'NOTE';

export type LegalDatabase =
    | 'INDIAN_KANOON'
    | 'SCC_ONLINE'
    | 'MANUPATRA'
    | 'SUPREME_COURT'
    | 'HIGH_COURT'
    | 'BARE_ACTS'
    | 'OTHER';

export const LEGAL_DATABASES: { value: LegalDatabase; label: string; url: string }[] = [
    { value: 'INDIAN_KANOON', label: 'Indian Kanoon', url: 'https://indiankanoon.org' },
    { value: 'SCC_ONLINE', label: 'SCC Online', url: 'https://www.scconline.com' },
    { value: 'MANUPATRA', label: 'Manupatra', url: 'https://www.manupatra.com' },
    { value: 'SUPREME_COURT', label: 'Supreme Court of India', url: 'https://main.sci.gov.in' },
    { value: 'HIGH_COURT', label: 'High Court Websites', url: 'https://ecourts.gov.in' },
    { value: 'BARE_ACTS', label: 'India Code (Bare Acts)', url: 'https://www.indiacode.nic.in' },
    { value: 'OTHER', label: 'Other', url: '' },
];

// Citation for case laws and precedents
export interface Citation {
    id: string;
    type: ResearchType;
    title: string;                    // Case name or statute title
    citation: string;                 // e.g., "AIR 2020 SC 123" or "IPC Section 302"
    court?: string;                   // Supreme Court, High Court, etc.
    year?: number;                    // Year of judgment
    judge?: string;                   // Judge name(s)
    url?: string;                     // External link
    source: LegalDatabase;
    summary?: string;                 // Brief summary or headnote
    keyPoints?: string[];             // Key legal points
    relevantSections?: string[];      // Related IPC/BNS sections
    linkedCaseIds: string[];          // Cases this citation is linked to
    tags: string[];
    isFavorite: boolean;
    createdAt: string;
    updatedAt: string;
}

// Research note linked to citations or cases
export interface ResearchNote {
    id: string;
    title: string;
    content: string;
    linkedCitationIds: string[];      // Citations referenced
    linkedCaseIds: string[];          // Cases this research relates to
    tags: string[];
    createdAt: string;
    updatedAt: string;
}

// Quick search history
export interface SearchHistory {
    id: string;
    query: string;
    database: LegalDatabase;
    timestamp: string;
}
