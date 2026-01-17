import * as FileSystem from 'expo-file-system/legacy';
import { Document, DocumentVersion } from '../models/Document';

const DOCUMENTS_DIR = `${FileSystem.documentDirectory}documents/`;

/**
 * Extended document version with base64 file data for backup
 */
interface BackupDocumentVersion extends DocumentVersion {
    base64Data?: string;
}

/**
 * Extended document with backup versions
 */
interface BackupDocument extends Omit<Document, 'versions'> {
    versions: BackupDocumentVersion[];
}

/**
 * Full backup data structure
 */
export interface FullBackupData {
    cases: any[];
    deadlines: any[];
    documents: BackupDocument[];
    citations: any[];
    researchNotes: any[];
    searchHistory: any[];
    userName?: string;
    notificationPrefs?: any;
    version: string;
    exportedAt: string;
    includesFiles: boolean;
}

/**
 * Export all app data including document files as base64
 * 
 * @param appState - Object containing cases, deadlines, documents, etc.
 * @returns FullBackupData with document files encoded as base64
 */
export const exportFullBackup = async (appState: {
    cases: any[];
    deadlines: any[];
    documents: Document[];
    citations: any[];
    researchNotes: any[];
    searchHistory: any[];
    userName?: string;
    notificationPrefs?: any;
}): Promise<FullBackupData> => {
    const backupDocuments: BackupDocument[] = [];

    // Process each document
    for (const doc of appState.documents) {
        const backupVersions: BackupDocumentVersion[] = [];

        // Process each version of the document
        for (const version of doc.versions) {
            try {
                // Check if file exists
                const fileInfo = await FileSystem.getInfoAsync(version.uri);

                if (fileInfo.exists) {
                    // Read file as base64
                    const base64Data = await FileSystem.readAsStringAsync(version.uri, {
                        encoding: FileSystem.EncodingType.Base64,
                    });

                    backupVersions.push({
                        ...version,
                        base64Data,
                    });
                } else {
                    // File doesn't exist - include version metadata without file data
                    console.warn(`File not found for backup: ${version.uri}`);
                    backupVersions.push({
                        ...version,
                        base64Data: undefined,
                    });
                }
            } catch (error) {
                console.warn(`Error reading file for backup: ${version.uri}`, error);
                // Include version without file data
                backupVersions.push({
                    ...version,
                    base64Data: undefined,
                });
            }
        }

        backupDocuments.push({
            ...doc,
            versions: backupVersions,
        });
    }

    return {
        cases: appState.cases,
        deadlines: appState.deadlines,
        documents: backupDocuments,
        citations: appState.citations,
        researchNotes: appState.researchNotes,
        searchHistory: appState.searchHistory,
        userName: appState.userName,
        notificationPrefs: appState.notificationPrefs,
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
        includesFiles: true,
    };
};

/**
 * Ensure documents directory exists
 */
const ensureDocumentsDir = async (): Promise<void> => {
    const dirInfo = await FileSystem.getInfoAsync(DOCUMENTS_DIR);
    if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(DOCUMENTS_DIR, { intermediates: true });
    }
};

/**
 * Generate a unique filename for restored document
 */
const generateRestoredFileName = (docId: string, versionNum: number, originalUri: string): string => {
    const ext = originalUri.split('.').pop() || 'file';
    const timestamp = Date.now();
    return `restored_${docId}_v${versionNum}_${timestamp}.${ext}`;
};

/**
 * Import full backup data including document files
 * 
 * @param backupData - The backup data to import
 * @returns Restored data with updated document URIs
 */
export const importFullBackup = async (backupData: FullBackupData): Promise<{
    cases: any[];
    deadlines: any[];
    documents: Document[];
    citations: any[];
    researchNotes: any[];
    searchHistory: any[];
    userName?: string;
    notificationPrefs?: any;
}> => {
    await ensureDocumentsDir();

    const restoredDocuments: Document[] = [];

    // Process each document
    for (const backupDoc of backupData.documents) {
        const restoredVersions: DocumentVersion[] = [];

        // Process each version
        for (const backupVersion of backupDoc.versions) {
            if (backupVersion.base64Data) {
                try {
                    // Generate new filename for the restored file
                    const newFileName = generateRestoredFileName(
                        backupDoc.id,
                        backupVersion.versionNumber,
                        backupVersion.uri
                    );
                    const newUri = `${DOCUMENTS_DIR}${newFileName}`;

                    // Write file from base64
                    await FileSystem.writeAsStringAsync(newUri, backupVersion.base64Data, {
                        encoding: FileSystem.EncodingType.Base64,
                    });

                    // Verify file was written
                    const fileInfo = await FileSystem.getInfoAsync(newUri);
                    if (!fileInfo.exists) {
                        throw new Error('File was not created');
                    }

                    // Add version with updated URI
                    restoredVersions.push({
                        id: backupVersion.id,
                        versionNumber: backupVersion.versionNumber,
                        uri: newUri,
                        createdAt: backupVersion.createdAt,
                        notes: backupVersion.notes,
                        fileSize: (fileInfo as any).size || backupVersion.fileSize,
                    });
                } catch (error) {
                    console.error(`Error restoring file for document ${backupDoc.name}:`, error);
                    // Skip this version if restoration fails
                }
            } else {
                // No file data - include version metadata with original URI
                // (file won't be accessible but metadata is preserved)
                restoredVersions.push({
                    id: backupVersion.id,
                    versionNumber: backupVersion.versionNumber,
                    uri: backupVersion.uri,
                    createdAt: backupVersion.createdAt,
                    notes: backupVersion.notes,
                    fileSize: backupVersion.fileSize,
                });
            }
        }

        // Only include document if it has at least one version
        if (restoredVersions.length > 0) {
            restoredDocuments.push({
                id: backupDoc.id,
                caseId: backupDoc.caseId,
                name: backupDoc.name,
                type: backupDoc.type,
                mimeType: backupDoc.mimeType,
                currentVersionId: backupDoc.currentVersionId,
                versions: restoredVersions,
                tags: backupDoc.tags,
                ocrText: backupDoc.ocrText,
                createdAt: backupDoc.createdAt,
                updatedAt: backupDoc.updatedAt,
            });
        }
    }

    return {
        cases: backupData.cases || [],
        deadlines: backupData.deadlines || [],
        documents: restoredDocuments,
        citations: backupData.citations || [],
        researchNotes: backupData.researchNotes || [],
        searchHistory: backupData.searchHistory || [],
        userName: backupData.userName,
        notificationPrefs: backupData.notificationPrefs,
    };
};

/**
 * Calculate approximate backup size in bytes
 */
export const estimateBackupSize = (documents: Document[]): number => {
    return documents.reduce((total, doc) => {
        return total + doc.versions.reduce((vTotal, v) => vTotal + v.fileSize, 0);
    }, 0);
};

/**
 * Format bytes to human readable string
 */
export const formatBackupSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};
