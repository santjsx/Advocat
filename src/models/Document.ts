export type DocumentType =
    | 'PETITION'
    | 'AFFIDAVIT'
    | 'EVIDENCE'
    | 'CONTRACT'
    | 'CORRESPONDENCE'
    | 'COURT_ORDER'
    | 'INVOICE'
    | 'OTHER';

export const DOCUMENT_TYPES: DocumentType[] = [
    'PETITION',
    'AFFIDAVIT',
    'EVIDENCE',
    'CONTRACT',
    'CORRESPONDENCE',
    'COURT_ORDER',
    'INVOICE',
    'OTHER',
];

export interface DocumentVersion {
    id: string;
    versionNumber: number;
    uri: string;
    createdAt: string;
    notes?: string;
    fileSize: number;
}

export interface Document {
    id: string;
    caseId: string;
    name: string;
    type: DocumentType;
    mimeType: string;
    currentVersionId: string;
    versions: DocumentVersion[];
    tags: string[];
    ocrText?: string;
    createdAt: string;
    updatedAt: string;
}
