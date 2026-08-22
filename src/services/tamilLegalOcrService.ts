// Tamil Legal Document Ingestion, PDF Extraction & Multi-Language OCR Engine

import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

export interface TamilDocPickResult {
    cancelled: boolean;
    uri?: string;
    name?: string;
    mimeType?: string;
    size?: number;
    base64?: string;
    extractedText?: string;
    error?: string;
}

/**
 * 1. Pick a Legal Case Screenshot from device storage / gallery (High Quality)
 */
export const pickLegalScreenshot = async (): Promise<TamilDocPickResult> => {
    try {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            return {
                cancelled: true,
                error: 'Gallery permission is required to select case screenshots.',
            };
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: false,
            quality: 1.0,
            base64: true,
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
            return { cancelled: true };
        }

        const asset = result.assets[0];
        return {
            cancelled: false,
            uri: asset.uri,
            name: asset.fileName || 'case_screenshot.jpg',
            mimeType: asset.mimeType || 'image/jpeg',
            base64: asset.base64 || undefined,
            size: asset.fileSize,
        };
    } catch (err: any) {
        return {
            cancelled: true,
            error: err?.message || 'Failed to select case screenshot.',
        };
    }
};

/**
 * Legacy file pickers retained for backwards compatibility
 */
export const pickTamilLegalDocument = async (): Promise<TamilDocPickResult> => {
    return pickLegalScreenshot();
};

export const pickTamilPaperPhoto = async (
    _source: 'CAMERA' | 'GALLERY' = 'GALLERY'
): Promise<TamilDocPickResult> => {
    return pickLegalScreenshot();
};

/**
 * 3. Extract Tamil and English Text from Base64 Image via OCR
 */
export const extractTamilTextFromImage = async (
    base64Image: string,
    onProgress?: (msg: string) => void
): Promise<{ success: boolean; text?: string; message?: string }> => {
    if (!base64Image) {
        return { success: false, message: 'No image data provided for OCR.' };
    }

    onProgress?.('Scanning physical legal text with Tamil OCR engine...');

    try {
        const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
        const payload = new URLSearchParams();
        payload.append('base64Image', `data:image/jpeg;base64,${cleanBase64}`);
        // Support Tamil & English multi-language recognition
        payload.append('language', 'tam');
        payload.append('isOverlayRequired', 'false');
        payload.append('detectOrientation', 'true');
        payload.append('scale', 'true');
        payload.append('OCREngine', '2');

        const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
            method: 'POST',
            headers: {
                apikey: 'K88358249488957',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: payload.toString(),
        });

        if (ocrResponse.ok) {
            const ocrJson = await ocrResponse.json();
            if (ocrJson.ParsedResults && ocrJson.ParsedResults.length > 0) {
                const parsedText = ocrJson.ParsedResults[0].ParsedText || '';
                if (parsedText.trim().length > 5) {
                    return {
                        success: true,
                        text: parsedText.trim(),
                        message: 'Extracted Tamil document text successfully.',
                    };
                }
            }
        }
    } catch (ocrErr) {
        console.warn('Tamil OCR extraction attempt 1 failed:', ocrErr);
    }

    // Secondary attempt with English engine (in case document is mixed or transliterated)
    try {
        const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
        const payload = new URLSearchParams();
        payload.append('base64Image', `data:image/jpeg;base64,${cleanBase64}`);
        payload.append('language', 'eng');
        payload.append('isOverlayRequired', 'false');
        payload.append('detectOrientation', 'true');
        payload.append('scale', 'true');
        payload.append('OCREngine', '2');

        const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
            method: 'POST',
            headers: {
                apikey: 'K88358249488957',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: payload.toString(),
        });

        if (ocrResponse.ok) {
            const ocrJson = await ocrResponse.json();
            if (ocrJson.ParsedResults && ocrJson.ParsedResults.length > 0) {
                const parsedText = ocrJson.ParsedResults[0].ParsedText || '';
                if (parsedText.trim().length > 5) {
                    return {
                        success: true,
                        text: parsedText.trim(),
                        message: 'Extracted text via secondary OCR engine.',
                    };
                }
            }
        }
    } catch (secErr) {
        console.warn('Secondary OCR failed:', secErr);
    }

    return {
        success: false,
        message: 'Could not automatically OCR image. You can paste the Tamil text directly into the text box.',
    };
};
