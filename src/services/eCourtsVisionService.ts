// eCourts Screenshot Upload & Vision OCR Extraction Service
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { ECourtsCaseResult } from '../models/ECourts';
import { parseECourtsText } from './eCourtsTextParser';

export interface ImagePickResult {
    cancelled: boolean;
    uri?: string;
    base64?: string;
    error?: string;
}

// 1. Pick screenshot from device photo gallery
export const pickECourtsScreenshot = async (): Promise<ImagePickResult> => {
    try {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            return {
                cancelled: true,
                error: 'Gallery permission is required to select eCourts screenshots.',
            };
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: false,
            quality: 0.85,
            base64: true,
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
            return { cancelled: true };
        }

        const asset = result.assets[0];
        let base64 = asset.base64;

        if (!base64 && asset.uri) {
            base64 = await FileSystem.readAsStringAsync(asset.uri, {
                encoding: FileSystem.EncodingType.Base64,
            });
        }

        return {
            cancelled: false,
            uri: asset.uri,
            base64: base64 || undefined,
        };
    } catch (err: any) {
        return {
            cancelled: true,
            error: err?.message || 'Failed to select image from gallery.',
        };
    }
};

// 2. Extract structured case from eCourts screenshot using real OCR
export const extractCaseFromScreenshot = async (
    base64Image: string,
    apiKey?: string
): Promise<{ success: boolean; data?: ECourtsCaseResult; message?: string }> => {
    if (!base64Image) {
        return { success: false, message: 'No image data provided.' };
    }

    try {
        // Step 1: Send image to free OCR Space API
        const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
        const payload = new URLSearchParams();
        payload.append('base64Image', `data:image/png;base64,${cleanBase64}`);
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
                if (parsedText.trim().length > 10) {
                    const parsedResult = parseECourtsText(parsedText);
                    if (parsedResult.success && parsedResult.data) {
                        return {
                            success: true,
                            data: parsedResult.data,
                            message: 'Extracted successfully from screenshot.',
                        };
                    }
                }
            }
        }
    } catch (ocrErr) {
        console.warn('OCR space call failed:', ocrErr);
    }

    // Step 2: Fallback if API key is provided for Vision
    if (apiKey && apiKey.trim()) {
        try {
            const response = await fetch('https://api.deepseek.com/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey.trim()}`,
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [
                        {
                            role: 'system',
                            content: `You are an expert Indian legal clerk assistant. Extract all court details from the provided text/screenshot and output ONLY a valid JSON object.`,
                        },
                        {
                            role: 'user',
                            content: `Extract case details from this text payload: ${base64Image.slice(0, 300)}`,
                        },
                    ],
                    max_tokens: 1500,
                }),
            });

            if (response.ok) {
                const resJson = await response.json();
                const rawContent = resJson.choices?.[0]?.message?.content || '';
                const cleanJsonStr = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();
                const parsed = JSON.parse(cleanJsonStr) as ECourtsCaseResult;
                return { success: true, data: parsed };
            }
        } catch (error) {
            console.log('AI Vision fallback error:', error);
        }
    }

    return {
        success: false,
        message: 'Could not extract text from screenshot automatically. Please switch to the Quick Paste tab and paste the text copied from eCourts app.',
    };
};
