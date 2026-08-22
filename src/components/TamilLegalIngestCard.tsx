// Minimal & Premium AI Case Screenshot Ingestion Component - UI/UX Pro Max Edition
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Image,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import {
    TamilLegalExtractionResult,
} from '../models/TamilLegal';
import {
    pickLegalScreenshot,
    extractTamilTextFromImage,
} from '../services/tamilLegalOcrService';
import {
    translateAndExtractTamilLegalDoc,
    formatExtractedFactsForPleading,
    validateLegalScreenshotText,
} from '../services/tamilTranslationService';
import { PleadingType, CourtTier } from '../models/Pleading';

interface Props {
    apiKey?: string;
    onFactsExtracted: (params: {
        customFacts: string;
        prayerNotes: string;
        suggestedPleading?: PleadingType;
        suggestedCourtTier?: CourtTier;
        extractionResult: TamilLegalExtractionResult;
    }) => void;
}

export const TamilLegalIngestCard: React.FC<Props> = ({ apiKey, onFactsExtracted }) => {
    const { colors, mode } = useTheme();
    const isDark = mode === 'dark';

    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedUri, setSelectedUri] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [lastResult, setLastResult] = useState<TamilLegalExtractionResult | null>(null);

    const handleProcessText = async (text: string) => {
        if (!text || !text.trim()) {
            setErrorMessage('No readable text found in screenshot. Please upload a clearer image.');
            return;
        }

        try {
            setIsProcessing(true);
            setErrorMessage(null);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            // 1. Strict Validation: verify if text contains genuine legal case details
            setStatusMessage('Verifying case facts & judicial indicators...');
            const validation = validateLegalScreenshotText(text);
            if (!validation.isValid) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                const errorMsg = validation.reason || 'The uploaded screenshot does not contain recognizable court case details or FIR records.';
                setErrorMessage(errorMsg);
                return;
            }

            // 2. Deep AI / Lexicon translation & fact extraction
            setStatusMessage('Extracting parties, facts & active BNS/BNSS codes...');
            const result = await translateAndExtractTamilLegalDoc(
                text.trim(),
                apiKey,
                (msg) => setStatusMessage(msg)
            );

            setLastResult(result);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            const formatted = formatExtractedFactsForPleading(result);
            const suggestedPleading = result.suggestedPleadings?.[0];

            onFactsExtracted({
                customFacts: formatted.customFacts,
                prayerNotes: formatted.prayerNotes,
                suggestedPleading,
                extractionResult: result,
            });
        } catch (err: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            const errMsg = err?.message || 'Failed to process case screenshot.';
            setErrorMessage(errMsg);
        } finally {
            setIsProcessing(false);
            setStatusMessage('');
        }
    };

    /**
     * Pick and scan a legal case screenshot
     */
    const handlePickScreenshot = async () => {
        try {
            setErrorMessage(null);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const pickRes = await pickLegalScreenshot();
            if (pickRes.cancelled || !pickRes.base64) return;

            if (pickRes.uri) {
                setSelectedUri(pickRes.uri);
            }

            setIsProcessing(true);
            setStatusMessage('Scanning screenshot with Tamil & English OCR...');
            const ocrRes = await extractTamilTextFromImage(pickRes.base64, (m) => setStatusMessage(m));

            if (ocrRes.success && ocrRes.text) {
                await handleProcessText(ocrRes.text);
            } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                const err = ocrRes.message || 'Could not detect readable text in the selected screenshot. Please make sure the screenshot is clear.';
                setErrorMessage(err);
            }
        } catch (e: any) {
            setErrorMessage(e?.message || 'Failed to select screenshot.');
        } finally {
            setIsProcessing(false);
            setStatusMessage('');
        }
    };

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: isDark ? 'rgba(212, 175, 55, 0.05)' : '#FAF8F4',
                    borderColor: isDark ? 'rgba(212, 175, 55, 0.25)' : 'rgba(212, 175, 55, 0.35)',
                },
            ]}
        >
            {/* Main Interactive Bar */}
            <View style={styles.mainRow}>
                <View style={[styles.iconBadge, { backgroundColor: isDark ? 'rgba(212, 175, 55, 0.15)' : '#FFF0D0' }]}>
                    <MaterialCommunityIcons name="image-search-outline" size={20} color={colors.accent} />
                </View>

                <View style={styles.textCol}>
                    <View style={styles.titleRow}>
                        <Text style={[styles.title, { color: colors.textPrimary }]}>
                            Auto-Fill from Screenshot
                        </Text>
                        <View style={[styles.pillBadge, { backgroundColor: isDark ? 'rgba(212, 175, 55, 0.15)' : '#F5E6BE' }]}>
                            <Text style={styles.pillBadgeText}>AI SCAN</Text>
                        </View>
                    </View>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                        Upload FIR, Court Order, Sale Deed, or 138 Notice
                    </Text>
                </View>

                <TouchableOpacity
                    style={[styles.uploadButton, isProcessing && { opacity: 0.6 }]}
                    onPress={handlePickScreenshot}
                    disabled={isProcessing}
                    activeOpacity={0.8}
                >
                    <Ionicons name="cloud-upload-outline" size={14} color="#000000" />
                    <Text style={styles.uploadButtonText}>
                        {selectedUri ? 'Change' : 'Upload'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Thumbnail Preview when image is selected */}
            {selectedUri && (
                <View style={styles.previewContainer}>
                    <Image source={{ uri: selectedUri }} style={styles.previewThumb} />
                    <View style={styles.previewInfoCol}>
                        <Text style={styles.previewTitle} numberOfLines={1}>Selected Document Screenshot</Text>
                        <Text style={styles.previewSubtitle}>High-Resolution Legal Image</Text>
                    </View>
                    <TouchableOpacity
                        onPress={handlePickScreenshot}
                        disabled={isProcessing}
                        style={styles.changeThumbBtn}
                    >
                        <Text style={styles.changeThumbText}>Replace</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Processing Indicator */}
            {isProcessing && (
                <View style={[styles.statusBox, { backgroundColor: isDark ? 'rgba(212, 175, 55, 0.1)' : '#FFF8E6' }]}>
                    <ActivityIndicator size="small" color={colors.accent} />
                    <Text style={[styles.statusText, { color: colors.textPrimary }]} numberOfLines={1}>
                        {statusMessage || 'Analyzing screenshot with Legal OCR...'}
                    </Text>
                </View>
            )}

            {/* Error Banner for Non-Legal Screenshot */}
            {errorMessage && !isProcessing && (
                <View style={[styles.errorCard, { backgroundColor: isDark ? '#231517' : '#FEF2F2' }]}>
                    <View style={styles.errorHeader}>
                        <Ionicons name="alert-circle" size={16} color="#EF4444" />
                        <Text style={styles.errorTitle}>Non-Case Screenshot Detected</Text>
                    </View>
                    <Text style={styles.errorText}>
                        {errorMessage}
                    </Text>
                    <TouchableOpacity
                        onPress={handlePickScreenshot}
                        style={styles.retryBtn}
                    >
                        <Ionicons name="image-outline" size={13} color="#FFFFFF" />
                        <Text style={styles.retryBtnText}>Select Valid Case Screenshot</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Success Summary Pill */}
            {lastResult && !isProcessing && !errorMessage && (
                <View style={[styles.successBox, { backgroundColor: colors.safe + '12', borderColor: colors.safe + '35' }]}>
                    <Ionicons name="checkmark-circle" size={15} color={colors.safe} />
                    <Text style={[styles.successText, { color: colors.textPrimary }]} numberOfLines={1}>
                        <Text style={{ fontWeight: '700', color: colors.safe }}>Verified: </Text>
                        {lastResult.englishDocumentTitle} • Facts Auto-Filled
                    </Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderWidth: 1,
        borderRadius: 14,
        padding: 12,
        marginBottom: 16,
    },
    mainRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    iconBadge: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textCol: {
        flex: 1,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    title: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.1,
    },
    pillBadge: {
        paddingHorizontal: 5,
        paddingVertical: 1.5,
        borderRadius: 4,
    },
    pillBadgeText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#D4AF37',
        letterSpacing: 0.4,
    },
    subtitle: {
        fontSize: 11,
        marginTop: 2,
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#D4AF37',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 8,
        shadowColor: '#D4AF37',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 2,
    },
    uploadButtonText: {
        color: '#000000',
        fontSize: 12,
        fontWeight: '700',
    },
    previewContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 8,
        padding: 8,
        marginTop: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    previewThumb: {
        width: 44,
        height: 44,
        borderRadius: 6,
        resizeMode: 'cover',
    },
    previewInfoCol: {
        flex: 1,
    },
    previewTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    previewSubtitle: {
        fontSize: 10,
        color: '#9CA3AF',
        marginTop: 1,
    },
    changeThumbBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    changeThumbText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#D4AF37',
    },
    statusBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 8,
        borderRadius: 8,
        marginTop: 10,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
        flex: 1,
    },
    errorCard: {
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.35)',
        marginTop: 10,
        gap: 6,
    },
    errorHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    errorTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#EF4444',
    },
    errorText: {
        fontSize: 11,
        color: '#D1D5DB',
        lineHeight: 15,
    },
    retryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        backgroundColor: '#DC2626',
        paddingVertical: 6,
        borderRadius: 6,
        marginTop: 2,
    },
    retryBtnText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    successBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        padding: 8,
        borderRadius: 8,
        borderWidth: 1,
        marginTop: 10,
    },
    successText: {
        fontSize: 11,
        flex: 1,
    },
});
