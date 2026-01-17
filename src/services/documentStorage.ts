import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { DocumentVersion } from '../models/Document';

const DOCUMENTS_DIR = `${FileSystem.documentDirectory}documents/`;

// Ensure documents directory exists
// Ensure documents directory exists
export const ensureDocumentsDir = async (): Promise<void> => {
    try {
        const dirInfo = await FileSystem.getInfoAsync(DOCUMENTS_DIR);
        if (!dirInfo.exists) {

            await FileSystem.makeDirectoryAsync(DOCUMENTS_DIR, { intermediates: true });
        }
    } catch (error) {
        console.error('Error ensuring documents directory:', error);
        // Fallback or re-throw if critical
    }
};

// Generate unique filename
const generateFileName = (originalName: string, docId: string, versionNum: number): string => {
    const ext = originalName.split('.').pop() || 'file';
    return `${docId}_v${versionNum}.${ext}`;
};

// Copy file to app's document storage
export const saveDocumentFile = async (
    sourceUri: string,
    docId: string,
    versionNum: number,
    originalName: string
): Promise<{ uri: string; fileSize: number }> => {
    await ensureDocumentsDir();

    const fileName = generateFileName(originalName, docId, versionNum);
    const destUri = `${DOCUMENTS_DIR}${fileName}`;

    try {
        await FileSystem.copyAsync({
            from: sourceUri,
            to: destUri,
        });
        console.log('Document saved securely to:', destUri);
    } catch (e) {
        console.error('Failed to copy file to persistent storage:', e);
        throw new Error('Failed to save document permanently.');
    }

    const fileInfo = await FileSystem.getInfoAsync(destUri);
    const fileSize = (fileInfo as any).size || 0;

    return { uri: destUri, fileSize };
};

// Pick documents from file system
export const pickDocuments = async (): Promise<{
    uri: string;
    name: string;
    mimeType: string;
}[] | null> => {
    try {
        const result = await DocumentPicker.getDocumentAsync({
            type: '*/*',
            copyToCacheDirectory: true,
            multiple: true,
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
            return null;
        }

        return result.assets.map(asset => ({
            uri: asset.uri,
            name: asset.name,
            mimeType: asset.mimeType || 'application/octet-stream',
        }));
    } catch (e) {
        console.error('Document picker error:', e);
        return null; // or empty array
    }
};

// Deprecated: use pickDocuments instead
export const pickDocument = async (): Promise<{
    uri: string;
    name: string;
    mimeType: string;
} | null> => {
    const docs = await pickDocuments();
    return docs && docs.length > 0 ? docs[0] : null;
};

// Scan document using camera
export const scanDocument = async (): Promise<{
    uri: string;
    name: string;
    mimeType: string;
} | null> => {
    try {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
            return null;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            allowsEditing: true,
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
            return null;
        }

        const asset = result.assets[0];
        const timestamp = Date.now();
        return {
            uri: asset.uri,
            name: `scan_${timestamp}.jpg`,
            mimeType: 'image/jpeg',
        };
    } catch (e) {
        console.error('Camera error:', e);
        return null;
    }
};

// Placeholder OCR - returns empty string
// TODO: Connect to Google Vision API or ML Kit for real OCR
export const performOCR = async (imageUri: string): Promise<string> => {
    // Placeholder - in production, send to OCR service

    return '';
};

// Delete document file
export const deleteDocumentFile = async (uri: string): Promise<void> => {
    try {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (fileInfo.exists) {
            await FileSystem.deleteAsync(uri);
        }
    } catch (e) {
        console.error('Delete file error:', e);
    }
};

// Delete all versions of a document
export const deleteAllVersions = async (versions: DocumentVersion[]): Promise<void> => {
    for (const version of versions) {
        await deleteDocumentFile(version.uri);
    }
};

// Share document
// Get MIME type from extension
const getMimeTypeFromExtension = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const map: Record<string, string> = {
        'pdf': 'application/pdf',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'txt': 'text/plain',
    };
    return ext && map[ext] ? map[ext] : 'application/octet-stream';
};

// Share document
export const shareDocument = async (uri: string, fileName?: string, mimeType?: string): Promise<void> => {
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) return;

    let shareUri = uri;
    let tempUri: string | null = null;
    let finalMimeType = mimeType;

    try {
        // If a filename is provided, create a temp copy with that name
        if (fileName) {
            // Get extension from original URI
            const ext = uri.split('.').pop();
            let safeName = fileName.replace(/[^a-zA-Z0-9._\- ]/g, '_');

            // Append extension if not present in fileName
            if (ext && !safeName.toLowerCase().endsWith(`.${ext.toLowerCase()}`)) {
                safeName = `${safeName}.${ext}`;
            }

            // Derive MIME type from the SAFE filename if original is generic or missing
            if (!finalMimeType || finalMimeType === 'application/octet-stream') {
                finalMimeType = getMimeTypeFromExtension(safeName);
            }

            tempUri = `${FileSystem.cacheDirectory}${safeName}`;

            await FileSystem.copyAsync({
                from: uri,
                to: tempUri
            });
            shareUri = tempUri;
        } else if (!finalMimeType || finalMimeType === 'application/octet-stream') {
            // Try to guess from URI if no filename provided
            finalMimeType = getMimeTypeFromExtension(uri);
        }

        // Pass the calculated mimeType to the share function
        await Sharing.shareAsync(shareUri, {
            mimeType: finalMimeType,
            UTI: finalMimeType // For iOS
        });
    } catch (error) {
        console.error('Error sharing document:', error);
    } finally {
        // Don't delete temp file immediately - let the share sheet read it
        // The cache directory will be cleaned up by the OS eventually
    }
};

// Get file extension from mime type
export const getExtensionFromMime = (mimeType: string): string => {
    const map: Record<string, string> = {
        'application/pdf': 'pdf',
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'application/msword': 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'text/plain': 'txt',
    };
    return map[mimeType] || 'file';
};

// Format file size
export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

// Share multiple documents at once
export interface ShareableDoc {
    uri: string;
    fileName: string;
    mimeType: string;
}

/**
 * Share multiple documents at once on Android using ACTION_SEND_MULTIPLE intent.
 * Falls back to sequential sharing on iOS or if the multi-share fails.
 * 
 * Production-ready implementation with:
 * - File existence validation
 * - Unique temp file naming to prevent collisions
 * - Proper content URI generation
 * - Graceful fallback on errors
 */


/**
 * Share multiple documents at once.
 * Tries to use react-native-share (native module) first for true multi-share.
 * Falls back to sequential sharing if native module is unavailable (e.g. Expo Go).
 */
export const shareMultipleDocuments = async (docs: ShareableDoc[]): Promise<void> => {
    if (docs.length === 0) return;

    // For single document, use the reliable single share
    if (docs.length === 1) {
        await shareDocument(docs[0].uri, docs[0].fileName, docs[0].mimeType);
        return;
    }

    const timestamp = Date.now();
    const preparedFiles: { fileUri: string; contentUri: string; mimeType: string }[] = [];

    // Generate a unique directory for this batch share
    const shareDir = `${FileSystem.cacheDirectory}share_${timestamp}/`;
    await FileSystem.makeDirectoryAsync(shareDir, { intermediates: true });

    // Step 1: Prepare all files (copy to unique directory with ORIGINAL names)
    for (let i = 0; i < docs.length; i++) {
        const doc = docs[i];
        try {
            const sourceInfo = await FileSystem.getInfoAsync(doc.uri);
            if (!sourceInfo.exists) {
                console.warn(`File not found, skipping: ${doc.uri}`);
                continue;
            }

            // Generate safe filename (original name, sanitized)
            let safeName = doc.fileName.replace(/[^a-zA-Z0-9._\- ]/g, '_').substring(0, 100);
            const ext = doc.uri.split('.').pop()?.toLowerCase() || 'file';
            if (!safeName.toLowerCase().endsWith(`.${ext}`)) {
                safeName = `${safeName}.${ext}`;
            }

            // Copy to the unique directory using the CLEAN filename
            const tempUri = `${shareDir}${safeName}`;
            await FileSystem.copyAsync({ from: doc.uri, to: tempUri });

            // Get content URI for Android
            const contentUri = await FileSystem.getContentUriAsync(tempUri);

            preparedFiles.push({
                fileUri: tempUri,
                contentUri: contentUri,
                mimeType: doc.mimeType || 'application/octet-stream',
            });
        } catch (err) {
            console.warn(`Error preparing file ${doc.fileName}:`, err);
        }
    }

    if (preparedFiles.length === 0) {
        console.error('No files could be prepared for sharing');
        return;
    }

    // Step 2: Try react-native-share (works in production APK)
    if (Platform.OS === 'android') {
        try {
            // Dynamic require to avoid crash in Expo Go
            const RNShare = require('react-native-share').default;

            // Use file:// URIs for react-native-share
            const fileUrls = preparedFiles.map(f => f.fileUri);

            console.log('Attempting react-native-share with', fileUrls.length, 'files');

            await RNShare.open({
                urls: fileUrls,
                type: 'application/octet-stream',
                failOnCancel: false,
            });

            console.log('react-native-share succeeded');
            return; // Success!
        } catch (rnShareError: any) {
            console.warn('react-native-share failed:', rnShareError?.message || rnShareError);

            // If user cancelled, don't try other methods
            if (rnShareError?.message?.includes('User did not share') ||
                rnShareError?.message?.includes('cancel')) {
                return;
            }
        }

        // Step 3: Try expo-intent-launcher as fallback
        try {
            const contentUris = preparedFiles.map(f => f.contentUri);

            console.log('Attempting IntentLauncher with', contentUris.length, 'content URIs');

            await IntentLauncher.startActivityAsync('android.intent.action.SEND_MULTIPLE', {
                type: '*/*',
                extra: {
                    'android.intent.extra.STREAM': contentUris,
                },
                flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
            });

            console.log('IntentLauncher succeeded');
            return; // Success!
        } catch (intentError) {
            console.warn('IntentLauncher failed:', intentError);
        }
    }

    // Step 4: Final fallback - share one by one
    console.log('All multi-share methods failed, falling back to sequential');
    await shareSequentially(docs);
};

/**
 * Helper function to share documents one by one.
 * Used as fallback when multi-share fails.
 */
const shareSequentially = async (docs: ShareableDoc[]): Promise<void> => {
    for (const doc of docs) {
        try {
            await shareDocument(doc.uri, doc.fileName, doc.mimeType);
            // Small delay between shares to let UI settle
            await new Promise(resolve => setTimeout(resolve, 300));
        } catch (e) {
            console.error(`Failed to share ${doc.fileName}:`, e);
            // Continue to next document
        }
    }
};
