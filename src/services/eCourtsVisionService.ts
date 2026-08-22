// eCourts Screenshot Upload & Vision AI Extraction Service
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { ECourtsCaseResult } from '../models/ECourts';
import { parseECourtsText } from './eCourtsTextParser';

export interface SelectedImageItem {
    uri: string;
    base64: string;
}

export interface ImagePickResult {
    cancelled: boolean;
    uri?: string;
    base64?: string;
    error?: string;
}

export interface MultiImagePickResult {
    cancelled: boolean;
    images?: SelectedImageItem[];
    error?: string;
}

// 1. Pick up to 5 screenshots from device photo gallery
export const pickECourtsScreenshots = async (maxLimit: number = 5): Promise<MultiImagePickResult> => {
    try {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            return {
                cancelled: true,
                error: 'Gallery permission is required to select eCourts screenshots. Please allow photo access in Settings.',
            };
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            selectionLimit: Math.min(Math.max(maxLimit, 1), 5),
            quality: 0.8,
            base64: true,
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
            return { cancelled: true };
        }

        const images: SelectedImageItem[] = [];
        for (const asset of result.assets) {
            let base64 = asset.base64;
            if (!base64 && asset.uri) {
                try {
                    base64 = await FileSystem.readAsStringAsync(asset.uri, {
                        encoding: FileSystem.EncodingType.Base64,
                    });
                } catch (readErr) {
                    console.warn('Failed to read image as base64:', readErr);
                }
            }
            if (asset.uri && base64) {
                images.push({
                    uri: asset.uri,
                    base64: base64,
                });
            }
        }

        return {
            cancelled: false,
            images,
        };
    } catch (err: any) {
        return {
            cancelled: true,
            error: err?.message || 'Failed to select images from gallery.',
        };
    }
};

// 1.1 Pick single screenshot (for backward compatibility)
export const pickECourtsScreenshot = async (): Promise<ImagePickResult> => {
    const res = await pickECourtsScreenshots(1);
    if (res.images && res.images.length > 0) {
        return {
            cancelled: false,
            uri: res.images[0].uri,
            base64: res.images[0].base64,
        };
    }
    return {
        cancelled: res.cancelled,
        error: res.error,
    };
};

// 1.2 Capture photo using Camera
export const captureECourtsPhoto = async (): Promise<MultiImagePickResult> => {
    try {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
            return {
                cancelled: true,
                error: 'Camera permission is required to photograph physical court notices or cause lists.',
            };
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: false,
            quality: 0.8,
            base64: true,
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
            return { cancelled: true };
        }

        const asset = result.assets[0];
        let base64 = asset.base64;

        if (!base64 && asset.uri) {
            try {
                base64 = await FileSystem.readAsStringAsync(asset.uri, {
                    encoding: FileSystem.EncodingType.Base64,
                });
            } catch (readErr) {
                console.warn('Failed to read camera photo as base64:', readErr);
            }
        }

        if (asset.uri && base64) {
            return {
                cancelled: false,
                images: [{ uri: asset.uri, base64 }],
            };
        }
        return { cancelled: true };
    } catch (err: any) {
        return {
            cancelled: true,
            error: err?.message || 'Failed to capture photo from camera.',
        };
    }
};

/**
 * Strict validation: Tests if OCR text from screenshots contains authentic court / eCourts indicators
 */
export const validateECourtsScreenshotText = (text: string): { isValid: boolean; reason?: string } => {
    if (!text || text.trim().length < 15) {
        return {
            isValid: false,
            reason: 'Invalid Screenshot: The uploaded image did not contain readable text. Please upload a clear case screenshot.',
        };
    }

    // 1. High-Confidence Legal Anchors (Word-boundary matching)
    const strongAnchors: RegExp[] = [
        /\bcnr(?:\s*number)?\b/i,
        /\b[a-z]{4}\d{2}\d{6}\d{4}\b/i, // 16-character Indian CNR regex
        /\b(?:filing|registration)\s*number\b/i,
        /\b(?:high\s*court|district\s*court|sessions\s*court|magistrate\s*court|judicial\s*magistrate|civil\s*court)\b/i,
        /\b(?:crl\.?\s*o\.?\s*p|w\.?\s*p|o\.?\s*s|c\.?\s*c|crl\.?\s*a|c\.?\s*r\.?\s*p|s\.?\s*t\.?\s*c)\b/i,
        /\b(?:petitioner|respondent|plaintiff|defendant|appellant|accused|complainant)\s*(?:and\s*advocate|details|name|vs\.?|\:)/i,
        /\b(?:cause\s*list|daily\s*orders|next\s*hearing\s*date|case\s*status|stage\s*of\s*case)\b/i,
        /\b(?:fir\s*number|crime\s*no|police\s*station|first\s*information\s*report)\b/i,
        /\b(?:under\s*act|bns\s*section|bnss\s*section|ipc\s*section|crpc\s*section|ni\s*act|negotiable\s*instruments)\b/i,
        /(?:நீதிமன்றம்|முதல்\s*தகவல்\s*அறிக்கை|குற்ற\s*எண்|மனுதாரர்|எதிர்மனுதாரர்|கிரய\s*பத்திரம்|காசோலை)/
    ];

    for (const anchor of strongAnchors) {
        if (anchor.test(text)) {
            return { isValid: true };
        }
    }

    // 2. Secondary Legal Terminology Scoring (Requires >= 2 distinct judicial matches with strict word boundaries)
    const secondaryTerms: RegExp[] = [
        /\bpetitioner\b/i,
        /\brespondent\b/i,
        /\badvocate\b/i,
        /\bhearing\b/i,
        /\bprosecution\b/i,
        /\bbail\b/i,
        /\bchargesheet\b/i,
        /\banticipatory\b/i,
        /\bvakalat\b/i,
        /\bjurisdiction\b/i,
        /\binterlocutory\b/i,
        /\bplaint\b/i,
        /\baverment\b/i,
        /\bmagistrate\b/i,
        /\bjudgement\b/i,
        /\bdecree\b/i,
        /\becourts\b/i,
        /\binterim\b/i,
        /\bcourt\b/i,
    ];

    let matchCount = 0;
    for (const term of secondaryTerms) {
        if (term.test(text)) {
            matchCount++;
        }
    }

    if (matchCount >= 2) {
        return { isValid: true };
    }

    return {
        isValid: false,
        reason: 'Invalid Screenshot: The uploaded image does not contain recognizable court case details, eCourts status, or judicial records. Please upload a valid case screenshot.',
    };
};

/**
 * OCR helper for a single image with English + Tamil fallback
 */
async function ocrSingleImage(base64Image: string): Promise<string> {
    let extractedText = '';
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

    // Attempt 1: English OCR
    try {
        const payload = new URLSearchParams();
        payload.append('base64Image', `data:image/jpeg;base64,${cleanBase64}`);
        payload.append('language', 'eng');
        payload.append('isOverlayRequired', 'false');
        payload.append('detectOrientation', 'true');
        payload.append('scale', 'true');
        payload.append('OCREngine', '2');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
            method: 'POST',
            headers: {
                apikey: 'K88358249488957',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: payload.toString(),
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (ocrResponse.ok) {
            const ocrJson = await ocrResponse.json();
            if (ocrJson.ParsedResults && ocrJson.ParsedResults.length > 0) {
                extractedText = ocrJson.ParsedResults[0].ParsedText || '';
            }
        }
    } catch (ocrErr) {
        console.warn('OCR single image engine 1 failed:', ocrErr);
    }

    // Attempt 2: Tamil OCR fallback if English had low yield
    if (extractedText.trim().length < 20) {
        try {
            const payload = new URLSearchParams();
            payload.append('base64Image', `data:image/jpeg;base64,${cleanBase64}`);
            payload.append('language', 'tam');
            payload.append('isOverlayRequired', 'false');
            payload.append('detectOrientation', 'true');
            payload.append('scale', 'true');
            payload.append('OCREngine', '2');

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
                method: 'POST',
                headers: {
                    apikey: 'K88358249488957',
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: payload.toString(),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (ocrResponse.ok) {
                const ocrJson = await ocrResponse.json();
                if (ocrJson.ParsedResults && ocrJson.ParsedResults.length > 0) {
                    extractedText = ocrJson.ParsedResults[0].ParsedText || '';
                }
            }
        } catch (ocrErr2) {
            console.warn('OCR single image engine 2 failed:', ocrErr2);
        }
    }

    return extractedText;
}

// 2. Extract structured case from 1 to 5 eCourts screenshots using multi-engine OCR & AI Vision
export const extractCaseFromScreenshots = async (
    base64Images: string[],
    apiKey?: string,
    onProgress?: (msg: string, pageIndex?: number) => void
): Promise<{ success: boolean; data?: ECourtsCaseResult; message?: string }> => {
    if (!base64Images || base64Images.length === 0) {
        return { success: false, message: 'No screenshot images provided.' };
    }

    const totalImages = Math.min(base64Images.length, 5);
    const extractedPages: string[] = [];

    // Step 1: Perform OCR across all selected screenshots (1 to 5)
    for (let i = 0; i < totalImages; i++) {
        if (totalImages > 1) {
            onProgress?.(`Scanning screenshot ${i + 1} of ${totalImages} with Multi-Language OCR...`, i);
        } else {
            onProgress?.('Scanning screenshot with Multi-Language OCR...', 0);
        }
        const pageText = await ocrSingleImage(base64Images[i]);
        if (pageText && pageText.trim().length > 5) {
            extractedPages.push(`--- SCREENSHOT / PAGE ${i + 1} OF ${totalImages} ---\n${pageText.trim()}`);
        }
    }

    const combinedText = extractedPages.join('\n\n');

    if (!combinedText || combinedText.trim().length < 10) {
        return {
            success: false,
            message: 'Could not detect readable text in the selected screenshot(s). Please make sure the images are clear and in focus.',
        };
    }

    // Step 2: Validate if combined text contains genuine court / legal records
    onProgress?.(`Verifying judicial records across ${totalImages} screenshot${totalImages > 1 ? 's' : ''}...`);
    const validation = validateECourtsScreenshotText(combinedText);
    if (!validation.isValid) {
        return {
            success: false,
            message: validation.reason || 'Invalid Screenshot: The uploaded images do not contain recognizable court case details or judicial records.',
        };
    }

    // Step 3: Deep AI Extraction if API key is provided
    if (apiKey && apiKey.trim()) {
        try {
            onProgress?.(`Structuring combined case data from ${totalImages} image${totalImages > 1 ? 's' : ''} with AI...`);
            const aiController = new AbortController();
            const aiTimeoutId = setTimeout(() => aiController.abort(), 16000);

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
                            content: `You are an expert Indian legal registry clerk. Parse the raw text extracted from ${totalImages} Indian court / eCourts screenshots (or WhatsApp / FIR records) and combine all details across all pages into ONLY a valid JSON object matching this schema:
{
  "cnr": "string (16 chars alphanumeric)",
  "caseNumber": "string",
  "caseTypeName": "string",
  "filingNumber": "string",
  "filingDate": "YYYY-MM-DD",
  "registrationDate": "YYYY-MM-DD",
  "courtName": "string",
  "caseTitle": "string",
  "petitioner": {
    "name": "string",
    "advocate": "string"
  },
  "respondent": {
    "name": "string",
    "advocate": "string"
  },
  "caseCategory": "CRIMINAL" | "CIVIL" | "WRIT" | "FAMILY" | "COMMERCIAL",
  "stage": "PLEADING" | "INVESTIGATION" | "TRIAL" | "POST_TRIAL" | "APPEAL",
  "status": "ACTIVE" | "PENDING" | "DISPOSED",
  "sections": [
    { "act": "IPC" | "CrPC" | "BNS" | "BNSS" | "CPC" | "NI_ACT", "section": "string", "description": "string" }
  ],
  "firDetails": {
    "policeStation": "string",
    "firNumber": "string",
    "firYear": "string"
  },
  "nextHearing": {
    "date": "YYYY-MM-DD",
    "purpose": "string"
  },
  "hearings": []
}

IMPORTANT: Combine facts, party names, CNR, sections, FIR and next hearing dates found across ANY of the pages. If the text is NOT a genuine court document or case record, return { "isInvalid": true }.`,
                        },
                        {
                            role: 'user',
                            content: `Extract and combine all case details across all ${totalImages} screenshot pages:\n\n${combinedText.slice(0, 12000)}`,
                        },
                    ],
                    response_format: { type: 'json_object' },
                    temperature: 0.1,
                    max_tokens: 2000,
                }),
                signal: aiController.signal,
            });
            clearTimeout(aiTimeoutId);

            if (response.ok) {
                const resJson = await response.json();
                const rawContent = resJson.choices?.[0]?.message?.content || '{}';
                const cleanJsonStr = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();
                const parsed = JSON.parse(cleanJsonStr);
                if (parsed.isInvalid) {
                    return {
                        success: false,
                        message: 'Invalid Screenshot: The uploaded images do not contain recognizable court case details or eCourts records.',
                    };
                }
                if (parsed.petitioner?.name || parsed.caseNumber || parsed.cnr) {
                    return { success: true, data: parsed as ECourtsCaseResult, message: 'Extracted successfully with AI.' };
                }
            }
        } catch (error) {
            console.warn('AI Vision extraction failed, using deterministic parser:', error);
        }
    }

    // Step 4: Deterministic fallback using robust regular expression parser
    onProgress?.('Parsing court dates, CNR and parties across pages with offline parser...');
    const parsedResult = parseECourtsText(combinedText);
    if (parsedResult.success && parsedResult.data) {
        return {
            success: true,
            data: parsedResult.data,
            message: 'Extracted successfully from screenshots.',
        };
    }

    return {
        success: false,
        message: parsedResult.message || 'Invalid Screenshot: Could not extract case details. Please make sure the screenshots show case title, CNR, or court status clearly.',
    };
};

export const extractCaseFromScreenshot = async (
    base64Image: string,
    apiKey?: string,
    onProgress?: (msg: string) => void
) => {
    return extractCaseFromScreenshots([base64Image], apiKey, onProgress);
};
