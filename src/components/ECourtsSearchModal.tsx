import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Image,
    Platform,
    Animated,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { useAppStore } from '../store/useAppStore';
import { ECourtsCaseResult } from '../models/ECourts';
import { convertECourtsToAdvocatCase, ECourtsClientSide } from '../services/eCourtsService';
import {
    pickECourtsScreenshots,
    captureECourtsPhoto,
    extractCaseFromScreenshots,
    SelectedImageItem,
} from '../services/eCourtsVisionService';
import { SmoothPressable } from './SmoothPressable';
import dayjs from 'dayjs';

interface Props {
    visible: boolean;
    onClose: () => void;
    onCaseImported: (caseId: string) => void;
}

type ScanStep = 'IDLE' | 'OCR' | 'VALIDATING' | 'STRUCTURING' | 'SUCCESS' | 'ERROR';

export const ECourtsSearchModal: React.FC<Props> = ({
    visible,
    onClose,
    onCaseImported,
}) => {
    const { colors, spacing, mode } = useTheme();
    const isDark = mode === 'dark';
    const addCase = useAppStore(state => state.addCase);
    const addDeadline = useAppStore(state => state.addDeadline);
    const advocateProfile = useAppStore(state => state.advocateProfile);

    // Multi-Screenshot State (1 to 5 images)
    const [selectedImages, setSelectedImages] = useState<SelectedImageItem[]>([]);
    const [activePreviewIndex, setActivePreviewIndex] = useState<number>(0);

    // Processing State
    const [loading, setLoading] = useState(false);
    const [scanStep, setScanStep] = useState<ScanStep>('IDLE');
    const [loadingMsg, setLoadingMsg] = useState('Extracting court details...');
    const [searchResult, setSearchResult] = useState<ECourtsCaseResult | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Client Representation State (Who does the advocate represent?)
    const [clientSide, setClientSide] = useState<ECourtsClientSide>('PETITIONER');
    const [customClientName, setCustomClientName] = useState<string>('');
    const [customClientPhone, setCustomClientPhone] = useState<string>('');
    const [showCustomInput, setShowCustomInput] = useState<boolean>(false);

    // Animations
    const scanLineAnim = React.useRef(new Animated.Value(0)).current;
    const progressAnim = React.useRef(new Animated.Value(0.1)).current;
    const errorFadeAnim = React.useRef(new Animated.Value(0)).current;

    // Trigger Laser Scan Animation
    React.useEffect(() => {
        if (loading) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(scanLineAnim, {
                        toValue: 1,
                        duration: 1600,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scanLineAnim, {
                        toValue: 0,
                        duration: 1600,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            scanLineAnim.setValue(0);
        }
    }, [loading]);

    // Animate Progress Bar per Step
    React.useEffect(() => {
        let target = 0.15;
        if (scanStep === 'OCR') target = 0.35;
        else if (scanStep === 'VALIDATING') target = 0.68;
        else if (scanStep === 'STRUCTURING') target = 0.95;
        else if (scanStep === 'SUCCESS') target = 1.0;

        Animated.spring(progressAnim, {
            toValue: target,
            tension: 80,
            friction: 12,
            useNativeDriver: false,
        }).start();
    }, [scanStep]);

    // Animate Error Card entrance
    React.useEffect(() => {
        if (errorMsg) {
            errorFadeAnim.setValue(0);
            Animated.timing(errorFadeAnim, {
                toValue: 1,
                duration: 350,
                useNativeDriver: true,
            }).start();
        }
    }, [errorMsg]);

    // Reset state & Clear all images
    const handleReset = () => {
        setSelectedImages([]);
        setActivePreviewIndex(0);
        setSearchResult(null);
        setErrorMsg(null);
        setLoading(false);
        setScanStep('IDLE');
        setClientSide('PETITIONER');
        setCustomClientName('');
        setCustomClientPhone('');
        setShowCustomInput(false);
    };

    // Handle Screenshot Selection from Gallery (1 to 5 total)
    const handlePickScreenshots = async () => {
        const remaining = 5 - selectedImages.length;
        if (remaining <= 0) return;

        setErrorMsg(null);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        const pick = await pickECourtsScreenshots(remaining);
        if (!pick.cancelled && pick.images && pick.images.length > 0) {
            const current = [...selectedImages];
            for (const img of pick.images) {
                if (current.length < 5 && !current.some(x => x.uri === img.uri)) {
                    current.push(img);
                }
            }
            setSelectedImages(current);
            // Default to first page so it starts cleanly from Page 1 of N
            setActivePreviewIndex(0);
            await processScreenshots(current);
        } else if (pick.error) {
            setErrorMsg(pick.error);
            setScanStep('ERROR');
        }
    };

    // Handle Camera Snap for physical cause list / court board
    const handleCapturePhoto = async () => {
        if (selectedImages.length >= 5) return;

        setErrorMsg(null);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        const pick = await captureECourtsPhoto();
        if (!pick.cancelled && pick.images && pick.images.length > 0) {
            const current = [...selectedImages, ...pick.images].slice(0, 5);
            setSelectedImages(current);
            setActivePreviewIndex(selectedImages.length === 0 ? 0 : current.length - 1);
            await processScreenshots(current);
        } else if (pick.error) {
            setErrorMsg(pick.error);
            setScanStep('ERROR');
        }
    };

    // Remove single image accidentally selected
    const handleRemoveImage = (indexToRemove: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const updated = selectedImages.filter((_, idx) => idx !== indexToRemove);
        setSelectedImages(updated);
        setLoading(false);
        setScanStep('IDLE');
        setSearchResult(null);
        setErrorMsg(null);
        setClientSide('PETITIONER');
        setCustomClientName('');
        setCustomClientPhone('');
        setShowCustomInput(false);

        if (updated.length === 0) {
            handleReset();
        } else {
            const newIndex = Math.min(activePreviewIndex, updated.length - 1);
            setActivePreviewIndex(newIndex);
        }
    };

    // Process 1 to 5 Screenshots with Combined OCR & AI Extraction
    const processScreenshots = async (imagesToProcess: SelectedImageItem[]) => {
        if (imagesToProcess.length === 0) return;

        setLoading(true);
        setErrorMsg(null);
        setSearchResult(null);
        setScanStep('OCR');
        setLoadingMsg(
            imagesToProcess.length > 1
                ? `Scanning ${imagesToProcess.length} screenshots with Multi-Language OCR...`
                : 'Scanning screenshot with Multi-Language OCR...'
        );
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const res = await extractCaseFromScreenshots(
                imagesToProcess.map(img => img.base64),
                advocateProfile?.deepseekApiKey,
                (status, pageIndex) => {
                    setLoadingMsg(status);
                    if (typeof pageIndex === 'number') {
                        setActivePreviewIndex(pageIndex);
                    }
                    if (status.includes('Verifying')) setScanStep('VALIDATING');
                    if (status.includes('Structuring') || status.includes('AI')) setScanStep('STRUCTURING');
                }
            );

            if (res.success && res.data) {
                setSearchResult(res.data);
                setScanStep('SUCCESS');
                setActivePreviewIndex(0);

                // Auto-suggest client side based on advocate profile or criminal state prosecution
                const myName = (advocateProfile?.name || '').toLowerCase().trim();
                const respAdv = (res.data.respondent?.advocate || '').toLowerCase();
                const petAdv = (res.data.petitioner?.advocate || '').toLowerCase();

                if (myName.length > 2 && respAdv.includes(myName)) {
                    setClientSide('RESPONDENT');
                } else if (myName.length > 2 && petAdv.includes(myName)) {
                    setClientSide('PETITIONER');
                } else {
                    const isStatePetitioner = /state|police|inspector|station|union of india|prosecution|complainant/i.test(res.data.petitioner?.name || '');
                    if (isStatePetitioner && res.data.respondent?.name) {
                        setClientSide('RESPONDENT');
                    } else {
                        setClientSide('PETITIONER');
                    }
                }
                setShowCustomInput(false);
                setCustomClientName('');
                setCustomClientPhone('');

                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                const err = res.message || 'The selected screenshots do not contain recognized court case details, eCourts status, or judicial records.';
                setErrorMsg(err);
                setScanStep('ERROR');
                setSearchResult(null);
            }
        } catch (err: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            const errText = err?.message || 'Error processing screenshots. Please try again.';
            setErrorMsg(errText);
            setScanStep('ERROR');
            setSearchResult(null);
        } finally {
            setLoading(false);
        }
    };

    // Import extracted case into Advocat store with explicit client representation
    const handleImport = () => {
        if (!searchResult) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        const { newCase, deadline } = convertECourtsToAdvocatCase(
            searchResult,
            clientSide,
            clientSide === 'CUSTOM'
                ? { name: customClientName, phone: customClientPhone }
                : undefined
        );

        addCase(newCase);

        if (deadline) {
            addDeadline(deadline);
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onClose();
        onCaseImported(newCase.id);
    };

    const styles = createStyles(colors, spacing, isDark);

    const scanLineTranslateY = scanLineAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 150],
    });

    const isStep1Done = scanStep === 'VALIDATING' || scanStep === 'STRUCTURING' || scanStep === 'SUCCESS';
    const isStep2Done = scanStep === 'STRUCTURING' || scanStep === 'SUCCESS';
    const isStep3Done = scanStep === 'SUCCESS';

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
                {/* Header Bar */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <View style={styles.headerIconBox}>
                            <MaterialCommunityIcons name="image-search-outline" size={20} color="#D4AF37" />
                        </View>
                        <View>
                            <Text style={styles.headerTitle}>eCourts Screenshot Importer</Text>
                            <Text style={styles.headerSubtitle}>AI Case Screenshot Scanner & Extractor</Text>
                        </View>
                    </View>
                    <SmoothPressable
                        onPress={onClose}
                        style={styles.closeButton}
                        accessibilityLabel="Close modal"
                        hitSlop={12}
                        haptic="light"
                        scaleTo={0.88}
                    >
                        <Ionicons name="close" size={18} color={isDark ? '#E5E7EB' : '#374151'} />
                    </SmoothPressable>
                </View>

                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                    
                    {/* Primary Hero Dropzone Card */}
                    <View style={styles.dropzoneCard}>
                        {selectedImages.length === 0 ? (
                            <SmoothPressable
                                style={styles.uploadDropBox}
                                onPress={handlePickScreenshots}
                                disabled={loading}
                                haptic="medium"
                                scaleTo={0.98}
                            >
                                <View style={styles.uploadIconOuterRing}>
                                    <View style={styles.uploadIconCircle}>
                                        <MaterialCommunityIcons name="image-multiple-outline" size={28} color="#D4AF37" />
                                    </View>
                                </View>
                                <Text style={styles.uploadTitle}>Upload Case Screenshots (1 to 5)</Text>
                                <Text style={styles.uploadSubtitle}>
                                    Select 1 to 5 screenshots of eCourts app, High Court cause list, Police FIR, or case notice
                                </Text>
                                <View style={styles.uploadFeaturesRow}>
                                    <View style={styles.uploadFeatureBadge}>
                                        <Ionicons name="scan-outline" size={12} color="#D4AF37" />
                                        <Text style={styles.uploadFeatureBadgeText}>OCR Vision AI</Text>
                                    </View>
                                    <View style={styles.uploadFeatureBadge}>
                                        <Ionicons name="layers-outline" size={12} color="#D4AF37" />
                                        <Text style={styles.uploadFeatureBadgeText}>Multi-Page Merge</Text>
                                    </View>
                                    <View style={styles.uploadFeatureBadge}>
                                        <Ionicons name="shield-checkmark-outline" size={12} color="#10B981" />
                                        <Text style={[styles.uploadFeatureBadgeText, { color: '#10B981' }]}>100% Private</Text>
                                    </View>
                                </View>
                            </SmoothPressable>
                        ) : (
                            <View style={styles.previewBox}>
                                <Image
                                    source={{ uri: selectedImages[activePreviewIndex]?.uri || selectedImages[0].uri }}
                                    style={styles.imagePreview}
                                />
                                
                                {/* High-contrast Top Gradient Overlay for Header Buttons */}
                                <LinearGradient
                                    colors={['rgba(0, 0, 0, 0.85)', 'rgba(0, 0, 0, 0.4)', 'transparent']}
                                    style={styles.previewTopGradient}
                                    pointerEvents="none"
                                />

                                {/* Animated Laser Scanner Sweep Beam */}
                                {loading && (
                                    <Animated.View
                                        style={[
                                            styles.scannerLaserBeam,
                                            { transform: [{ translateY: scanLineTranslateY }] },
                                        ]}
                                    >
                                        <LinearGradient
                                            colors={['rgba(212, 175, 55, 0)', 'rgba(212, 175, 55, 0.85)', 'rgba(212, 175, 55, 0)']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={styles.laserLine}
                                        />
                                    </Animated.View>
                                )}

                                <View style={styles.previewTopBar}>
                                    <View style={styles.previewTagPill}>
                                        <Ionicons name="images" size={11} color="#D4AF37" />
                                        <Text style={styles.previewTagText}>
                                            Page {activePreviewIndex + 1}/{selectedImages.length}
                                        </Text>
                                    </View>
                                    <View style={styles.previewActionsRow}>
                                        {selectedImages.length < 5 && (
                                            <>
                                                <SmoothPressable
                                                    onPress={handlePickScreenshots}
                                                    disabled={loading}
                                                    style={styles.changeImageBtn}
                                                    haptic="light"
                                                    scaleTo={0.92}
                                                >
                                                    <Ionicons name="images-outline" size={11} color="#FFFFFF" />
                                                    <Text style={styles.changeImageText}>Gallery</Text>
                                                </SmoothPressable>
                                                <SmoothPressable
                                                    onPress={handleCapturePhoto}
                                                    disabled={loading}
                                                    style={styles.changeImageBtn}
                                                    haptic="light"
                                                    scaleTo={0.92}
                                                >
                                                    <Ionicons name="camera-outline" size={11} color="#FFFFFF" />
                                                    <Text style={styles.changeImageText}>Camera</Text>
                                                </SmoothPressable>
                                            </>
                                        )}
                                        <SmoothPressable
                                            onPress={handleReset}
                                            disabled={loading}
                                            style={styles.clearAllBtn}
                                            haptic="light"
                                            scaleTo={0.92}
                                        >
                                            <Ionicons name="trash-outline" size={11} color="#FFFFFF" />
                                            <Text style={styles.changeImageText}>Clear</Text>
                                        </SmoothPressable>
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* Selected Images Horizontal Thumbnail Strip (1 to 5) */}
                        {selectedImages.length > 0 && (
                            <View style={styles.thumbnailsContainer}>
                                <View style={styles.thumbnailsHeaderRow}>
                                    <Text style={styles.thumbnailsTitle}>
                                        SELECTED SCREENSHOTS ({selectedImages.length}/5)
                                    </Text>
                                    <Text style={styles.thumbnailsHint}>
                                        Tap to view • (✕) to remove
                                    </Text>
                                </View>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.thumbnailsScrollContent}
                                >
                                    {selectedImages.map((img, index) => {
                                        const isActive = activePreviewIndex === index;
                                        return (
                                            <View key={img.uri + index} style={[styles.thumbnailWrapper, isActive && styles.thumbnailWrapperActive]}>
                                                <SmoothPressable
                                                    onPress={() => {
                                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                        setActivePreviewIndex(index);
                                                    }}
                                                    haptic="selection"
                                                    scaleTo={0.94}
                                                    style={styles.thumbnailPressable}
                                                >
                                                    <Image source={{ uri: img.uri }} style={styles.thumbnailImg} />
                                                    <View style={styles.thumbnailPageBadge}>
                                                        <Text style={styles.thumbnailPageText}>#{index + 1}</Text>
                                                    </View>
                                                </SmoothPressable>
                                                <SmoothPressable
                                                    onPress={() => handleRemoveImage(index)}
                                                    disabled={loading}
                                                    style={styles.thumbnailRemoveBtn}
                                                    hitSlop={8}
                                                    haptic="medium"
                                                    scaleTo={0.88}
                                                    accessibilityLabel={`Remove screenshot ${index + 1}`}
                                                >
                                                    <Ionicons name="close" size={12} color="#FFFFFF" />
                                                </SmoothPressable>
                                            </View>
                                        );
                                    })}

                                    {selectedImages.length < 5 && (
                                        <SmoothPressable
                                            onPress={handlePickScreenshots}
                                            disabled={loading}
                                            style={styles.thumbnailAddBtn}
                                            haptic="light"
                                            scaleTo={0.94}
                                        >
                                            <Ionicons name="add-circle-outline" size={22} color="#D4AF37" />
                                            <Text style={styles.thumbnailAddText}>Add ({selectedImages.length}/5)</Text>
                                        </SmoothPressable>
                                    )}
                                </ScrollView>
                            </View>
                        )}

                        {/* Interactive Dual Action Buttons when no images selected */}
                        {selectedImages.length === 0 && !loading && (
                            <View style={styles.actionButtonsRow}>
                                <SmoothPressable
                                    style={styles.primaryButton}
                                    onPress={handlePickScreenshots}
                                    haptic="medium"
                                    scaleTo={0.96}
                                >
                                    <LinearGradient
                                        colors={['#D4AF37', '#B8860B']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.primaryGradient}
                                    >
                                        <MaterialCommunityIcons name="image-multiple" size={18} color="#000000" />
                                        <Text style={styles.primaryButtonText} numberOfLines={1}>Select Screenshots</Text>
                                    </LinearGradient>
                                </SmoothPressable>

                                <SmoothPressable
                                    style={styles.secondaryButton}
                                    onPress={handleCapturePhoto}
                                    haptic="medium"
                                    scaleTo={0.96}
                                >
                                    <Ionicons name="camera-outline" size={18} color="#D4AF37" />
                                    <Text style={styles.secondaryButtonText} numberOfLines={1}>Take Photo</Text>
                                </SmoothPressable>
                            </View>
                        )}

                        {/* Manual Re-Analyze Trigger if images attached & not loading & no success result */}
                        {selectedImages.length > 0 && !loading && !searchResult && (
                            <View style={{ marginTop: 12 }}>
                                <SmoothPressable
                                    style={styles.primaryButton}
                                    onPress={() => processScreenshots(selectedImages)}
                                    haptic="heavy"
                                    scaleTo={0.96}
                                >
                                    <LinearGradient
                                        colors={['#D4AF37', '#B8860B']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.primaryGradient}
                                    >
                                        <MaterialCommunityIcons name="lightning-bolt" size={18} color="#000000" />
                                        <Text style={styles.primaryButtonText}>
                                            Scan & Extract ({selectedImages.length} Image{selectedImages.length > 1 ? 's' : ''})
                                        </Text>
                                    </LinearGradient>
                                </SmoothPressable>
                            </View>
                        )}

                        {/* Live Step Progress Display (Modern Holographic HUD) */}
                        {loading && (
                            <View style={styles.scanningHud}>
                                <View style={styles.hudHeader}>
                                    <View style={styles.hudBeaconIconBox}>
                                        <MaterialCommunityIcons name="radar" size={18} color="#D4AF37" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.hudTitle} numberOfLines={1}>{loadingMsg}</Text>
                                        <Text style={styles.hudSubtext}>Multi-Language OCR Engine Active</Text>
                                    </View>
                                    <ActivityIndicator size="small" color="#D4AF37" />
                                </View>

                                {/* Animated Gradient Track Progress Line */}
                                <View style={styles.progressTrackBg}>
                                    <Animated.View
                                        style={[
                                            styles.progressTrackFill,
                                            {
                                                width: progressAnim.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: ['0%', '100%'],
                                                }),
                                            },
                                        ]}
                                    />
                                </View>

                                {/* 3 Stage Status Badges */}
                                <View style={styles.stepsRow}>
                                    {/* Step 1: OCR */}
                                    <View style={[styles.stepItem, (scanStep === 'OCR' || isStep1Done) && styles.stepActive]}>
                                        <View style={[styles.stepDotCircle, isStep1Done ? styles.stepDotDone : scanStep === 'OCR' ? styles.stepDotCurrent : styles.stepDotPending]}>
                                            {isStep1Done ? (
                                                <Ionicons name="checkmark" size={10} color="#000000" />
                                            ) : (
                                                <Text style={[styles.stepDotNum, scanStep === 'OCR' && { color: '#000000' }]}>1</Text>
                                            )}
                                        </View>
                                        <Text style={[styles.stepText, (scanStep === 'OCR' || isStep1Done) && styles.stepTextActive]}>
                                            OCR Scan
                                        </Text>
                                    </View>

                                    <View style={[styles.stepConnector, isStep1Done && styles.stepConnectorActive]} />

                                    {/* Step 2: Legal Validation */}
                                    <View style={[styles.stepItem, (scanStep === 'VALIDATING' || isStep2Done) && styles.stepActive]}>
                                        <View style={[styles.stepDotCircle, isStep2Done ? styles.stepDotDone : scanStep === 'VALIDATING' ? styles.stepDotCurrent : styles.stepDotPending]}>
                                            {isStep2Done ? (
                                                <Ionicons name="checkmark" size={10} color="#000000" />
                                            ) : (
                                                <Text style={[styles.stepDotNum, scanStep === 'VALIDATING' && { color: '#000000' }]}>2</Text>
                                            )}
                                        </View>
                                        <Text style={[styles.stepText, (scanStep === 'VALIDATING' || isStep2Done) && styles.stepTextActive]}>
                                            Legal Check
                                        </Text>
                                    </View>

                                    <View style={[styles.stepConnector, isStep2Done && styles.stepConnectorActive]} />

                                    {/* Step 3: AI Structuring */}
                                    <View style={[styles.stepItem, (scanStep === 'STRUCTURING' || isStep3Done) && styles.stepActive]}>
                                        <View style={[styles.stepDotCircle, isStep3Done ? styles.stepDotDone : scanStep === 'STRUCTURING' ? styles.stepDotCurrent : styles.stepDotPending]}>
                                            {isStep3Done ? (
                                                <Ionicons name="checkmark" size={10} color="#000000" />
                                            ) : (
                                                <Text style={[styles.stepDotNum, scanStep === 'STRUCTURING' && { color: '#000000' }]}>3</Text>
                                            )}
                                        </View>
                                        <Text style={[styles.stepText, (scanStep === 'STRUCTURING' || isStep3Done) && styles.stepTextActive]}>
                                            AI Extraction
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Executive AI Guardrail: No Judicial Records Detected */}
                    {errorMsg && !loading && (
                        <Animated.View style={[styles.errorCard, { opacity: errorFadeAnim }]}>
                            <View style={styles.errorHeader}>
                                <View style={styles.errorIconBadge}>
                                    <MaterialCommunityIcons name="shield-alert-outline" size={20} color="#F87171" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.errorTitle}>No Judicial Records Detected</Text>
                                    <Text style={styles.errorSubtitle}>Please upload an authentic court screenshot or document</Text>
                                </View>
                            </View>

                            <Text style={styles.errorBodyText}>
                                The uploaded screenshot does not contain recognizable case numbers, party names, CNR, FIR numbers, or cause list entries.
                            </Text>

                            {/* 4 Supported Case Formats Cards */}
                            <View style={styles.supportedFormatsBox}>
                                <Text style={styles.supportedFormatsHeader}>Supported Case Screenshot Formats:</Text>
                                <View style={styles.formatPillsGrid}>
                                    <View style={styles.formatPill}>
                                        <Ionicons name="checkmark-circle" size={13} color="#10B981" />
                                        <Text style={styles.formatPillText}>eCourts App Case Details</Text>
                                    </View>
                                    <View style={styles.formatPill}>
                                        <Ionicons name="checkmark-circle" size={13} color="#10B981" />
                                        <Text style={styles.formatPillText}>High Court / Cause Lists</Text>
                                    </View>
                                    <View style={styles.formatPill}>
                                        <Ionicons name="checkmark-circle" size={13} color="#10B981" />
                                        <Text style={styles.formatPillText}>Police FIR / Crime Copy</Text>
                                    </View>
                                    <View style={styles.formatPill}>
                                        <Ionicons name="checkmark-circle" size={13} color="#10B981" />
                                        <Text style={styles.formatPillText}>138 Cheque Notice / Memo</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Harmonious Retry Action Buttons */}
                            <View style={styles.errorActionRow}>
                                <SmoothPressable
                                    style={styles.errorPrimaryBtn}
                                    onPress={handlePickScreenshots}
                                    haptic="medium"
                                    scaleTo={0.96}
                                >
                                    <LinearGradient
                                        colors={['#D4AF37', '#B8860B']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.errorPrimaryGradient}
                                    >
                                        <MaterialCommunityIcons name="image-plus" size={16} color="#000000" />
                                        <Text style={styles.errorPrimaryText}>Choose from Gallery</Text>
                                    </LinearGradient>
                                </SmoothPressable>

                                <SmoothPressable
                                    style={styles.errorSecondaryBtn}
                                    onPress={handleCapturePhoto}
                                    haptic="medium"
                                    scaleTo={0.96}
                                >
                                    <Ionicons name="camera-outline" size={16} color="#D4AF37" />
                                    <Text style={styles.errorSecondaryText}>Take Photo</Text>
                                </SmoothPressable>
                            </View>
                        </Animated.View>
                    )}

                    {/* Verified Case Result Card */}
                    {searchResult && !loading && (
                        <View style={styles.resultCard}>
                            <View style={styles.resultTopBar}>
                                <View style={styles.courtBadgePill}>
                                    <MaterialCommunityIcons name="bank" size={13} color="#D4AF37" />
                                    <Text style={styles.courtBadgeText} numberOfLines={1}>
                                        {searchResult.courtName || 'Court of Competent Jurisdiction'}
                                    </Text>
                                </View>
                                <View style={styles.liveVerifiedBadge}>
                                    <View style={styles.liveDot} />
                                    <Text style={styles.liveVerifiedText}>VERIFIED</Text>
                                </View>
                            </View>

                            <Text style={styles.caseTitleText}>
                                {searchResult.caseTitle || `${searchResult.petitioner?.name || 'Petitioner'} vs. ${searchResult.respondent?.name || 'Respondent'}`}
                            </Text>

                            {/* Quick Badges */}
                            <View style={styles.quickBadgesRow}>
                                {searchResult.cnr ? (
                                    <View style={styles.cnrPill}>
                                        <Text style={styles.cnrPillLabel}>CNR</Text>
                                        <Text style={styles.cnrPillVal}>{searchResult.cnr}</Text>
                                    </View>
                                ) : null}
                                {searchResult.caseNumber ? (
                                    <View style={styles.caseNumPill}>
                                        <Text style={styles.caseNumPillText}>{searchResult.caseNumber}</Text>
                                    </View>
                                ) : null}
                            </View>

                            {/* Next Hearing Card */}
                            {searchResult.nextHearing?.date && (
                                <View style={styles.hearingInfoCard}>
                                    <View style={styles.hearingHeaderRow}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <MaterialCommunityIcons name="calendar-clock" size={16} color="#F59E0B" />
                                            <Text style={styles.hearingLabel}>Next Court Hearing</Text>
                                        </View>
                                        <Text style={styles.hearingDateText}>
                                            {dayjs(searchResult.nextHearing.date).format('DD MMMM YYYY')}
                                        </Text>
                                    </View>
                                    {searchResult.nextHearing.purpose ? (
                                        <Text style={styles.hearingPurposeText}>
                                            Stage: <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{searchResult.nextHearing.purpose}</Text>
                                        </Text>
                                    ) : null}
                                </View>
                            )}

                            {/* Who is your Client? Interactive Representation Selector */}
                            <View style={styles.clientSelectionSection}>
                                <View style={styles.clientSelectionHeader}>
                                    <View style={styles.clientSelectionIconBox}>
                                        <MaterialCommunityIcons name="account-tie" size={18} color="#D4AF37" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.clientSelectionTitle}>Who is your Client?</Text>
                                        <Text style={styles.clientSelectionSubtitle}>
                                            Select which party your chamber represents in this case
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.clientOptionsContainer}>
                                    {/* OPTION A: Petitioner / Complainant / Victim */}
                                    <SmoothPressable
                                        style={[
                                            styles.clientOptionCard,
                                            clientSide === 'PETITIONER' && styles.clientOptionCardActive,
                                        ]}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setClientSide('PETITIONER');
                                            setShowCustomInput(false);
                                        }}
                                        haptic="light"
                                        scaleTo={0.98}
                                    >
                                        <View style={styles.clientOptionRadio}>
                                            <Ionicons
                                                name={clientSide === 'PETITIONER' ? 'radio-button-on' : 'radio-button-off'}
                                                size={20}
                                                color={clientSide === 'PETITIONER' ? '#D4AF37' : colors.textTertiary}
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <View style={styles.clientOptionBadgeRow}>
                                                <View style={[styles.clientSideBadge, clientSide === 'PETITIONER' && styles.clientSideBadgeActive]}>
                                                    <Text style={[styles.clientSideBadgeText, clientSide === 'PETITIONER' && styles.clientSideBadgeTextActive]}>
                                                        {searchResult.caseCategory === 'CRIMINAL' ? 'PETITIONER / VICTIM' : 'PETITIONER / PLAINTIFF'}
                                                    </Text>
                                                </View>
                                                {clientSide === 'PETITIONER' && (
                                                    <View style={styles.representingBadge}>
                                                        <MaterialCommunityIcons name="check-decagram" size={12} color="#D4AF37" />
                                                        <Text style={styles.representingBadgeText}>MY CLIENT</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <Text style={styles.clientOptionName} numberOfLines={2}>
                                                {searchResult.petitioner?.name || 'Petitioner'}
                                            </Text>
                                            {searchResult.petitioner?.advocate ? (
                                                <Text style={styles.clientOptionAdvocate} numberOfLines={1}>
                                                    Adv. on Record: {searchResult.petitioner.advocate}
                                                </Text>
                                            ) : null}
                                        </View>
                                        <TouchableOpacity
                                            style={styles.inlineEditNameBtn}
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                setCustomClientName(searchResult.petitioner?.name || '');
                                                setClientSide('CUSTOM');
                                                setShowCustomInput(true);
                                            }}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        >
                                            <Ionicons name="pencil" size={13} color="#D4AF37" />
                                            <Text style={styles.inlineEditNameText}>Edit</Text>
                                        </TouchableOpacity>
                                    </SmoothPressable>

                                    {/* OPTION B: Respondent / Accused / Defendant */}
                                    <SmoothPressable
                                        style={[
                                            styles.clientOptionCard,
                                            clientSide === 'RESPONDENT' && styles.clientOptionCardActive,
                                        ]}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setClientSide('RESPONDENT');
                                            setShowCustomInput(false);
                                        }}
                                        haptic="light"
                                        scaleTo={0.98}
                                    >
                                        <View style={styles.clientOptionRadio}>
                                            <Ionicons
                                                name={clientSide === 'RESPONDENT' ? 'radio-button-on' : 'radio-button-off'}
                                                size={20}
                                                color={clientSide === 'RESPONDENT' ? '#D4AF37' : colors.textTertiary}
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <View style={styles.clientOptionBadgeRow}>
                                                <View style={[styles.clientSideBadge, clientSide === 'RESPONDENT' && styles.clientSideBadgeActive]}>
                                                    <Text style={[styles.clientSideBadgeText, clientSide === 'RESPONDENT' && styles.clientSideBadgeTextActive]}>
                                                        {searchResult.caseCategory === 'CRIMINAL' ? 'ACCUSED / RESPONDENT' : 'DEFENDANT / RESPONDENT'}
                                                    </Text>
                                                </View>
                                                {clientSide === 'RESPONDENT' && (
                                                    <View style={styles.representingBadge}>
                                                        <MaterialCommunityIcons name="check-decagram" size={12} color="#D4AF37" />
                                                        <Text style={styles.representingBadgeText}>MY CLIENT</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <Text style={styles.clientOptionName} numberOfLines={2}>
                                                {searchResult.respondent?.name || 'Respondent'}
                                            </Text>
                                            {searchResult.respondent?.advocate ? (
                                                <Text style={styles.clientOptionAdvocate} numberOfLines={1}>
                                                    Adv. on Record: {searchResult.respondent.advocate}
                                                </Text>
                                            ) : null}
                                        </View>
                                        <TouchableOpacity
                                            style={styles.inlineEditNameBtn}
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                setCustomClientName(searchResult.respondent?.name || '');
                                                setClientSide('CUSTOM');
                                                setShowCustomInput(true);
                                            }}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        >
                                            <Ionicons name="pencil" size={13} color="#D4AF37" />
                                            <Text style={styles.inlineEditNameText}>Edit</Text>
                                        </TouchableOpacity>
                                    </SmoothPressable>

                                    {/* OPTION C: Specific Client Name / Co-Accused */}
                                    <SmoothPressable
                                        style={[
                                            styles.clientOptionCard,
                                            clientSide === 'CUSTOM' && styles.clientOptionCardActive,
                                        ]}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            if (!customClientName.trim()) {
                                                setCustomClientName(
                                                    clientSide === 'RESPONDENT'
                                                        ? (searchResult.respondent?.name || '')
                                                        : (searchResult.petitioner?.name || '')
                                                );
                                            }
                                            setClientSide('CUSTOM');
                                            setShowCustomInput(true);
                                        }}
                                        haptic="light"
                                        scaleTo={0.98}
                                    >
                                        <View style={styles.clientOptionRadio}>
                                            <Ionicons
                                                name={clientSide === 'CUSTOM' ? 'radio-button-on' : 'radio-button-off'}
                                                size={20}
                                                color={clientSide === 'CUSTOM' ? '#D4AF37' : colors.textTertiary}
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <View style={styles.clientOptionBadgeRow}>
                                                <View style={[styles.clientSideBadge, clientSide === 'CUSTOM' && styles.clientSideBadgeActive]}>
                                                    <Text style={[styles.clientSideBadgeText, clientSide === 'CUSTOM' && styles.clientSideBadgeTextActive]}>
                                                        SPECIFIC CLIENT / CO-ACCUSED
                                                    </Text>
                                                </View>
                                                {clientSide === 'CUSTOM' && (
                                                    <View style={styles.representingBadge}>
                                                        <MaterialCommunityIcons name="check-decagram" size={12} color="#D4AF37" />
                                                        <Text style={styles.representingBadgeText}>MY CLIENT</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <Text style={styles.clientOptionName}>
                                                {customClientName.trim() ? customClientName : 'Enter specific client or co-accused name...'}
                                            </Text>
                                        </View>
                                    </SmoothPressable>

                                    {/* Custom Input Fields when CUSTOM is active */}
                                    {clientSide === 'CUSTOM' && (
                                        <View style={styles.customClientInputBox}>
                                            <Text style={styles.customInputLabel}>Client Full Name *</Text>
                                            <TextInput
                                                style={styles.customInput}
                                                placeholder="e.g., Mule Santhosh Reddy / Co-Accused"
                                                placeholderTextColor={colors.textTertiary}
                                                value={customClientName}
                                                onChangeText={setCustomClientName}
                                            />
                                            <Text style={styles.customInputLabel}>Client Contact Number (Optional)</Text>
                                            <TextInput
                                                style={styles.customInput}
                                                placeholder="e.g., +91 98765 43210"
                                                placeholderTextColor={colors.textTertiary}
                                                value={customClientPhone}
                                                onChangeText={setCustomClientPhone}
                                                keyboardType="phone-pad"
                                            />
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* Statutory Sections */}
                            {searchResult.sections && searchResult.sections.length > 0 && (
                                <View style={styles.sectionsContainer}>
                                    <Text style={styles.sectionsHeader}>Active Statutory Codes</Text>
                                    <View style={styles.sectionsChipsRow}>
                                        {searchResult.sections.map((act, idx) => (
                                            <View key={idx} style={styles.sectionChipPill}>
                                                <MaterialCommunityIcons name="gavel" size={11} color="#D4AF37" />
                                                <Text style={styles.sectionChipText}>
                                                    {act.act} {act.section}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Extraction Audit & Transparency Summary */}
                            <View style={styles.auditContainer}>
                                <View style={styles.auditHeaderRow}>
                                    <MaterialCommunityIcons name="shield-check-outline" size={14} color="#D4AF37" />
                                    <Text style={styles.auditHeaderText}>EXTRACTION ACCURACY & AUDIT</Text>
                                </View>
                                <View style={styles.auditGrid}>
                                    {/* Detected items */}
                                    <View style={styles.auditSection}>
                                        <Text style={styles.auditDetectedTitle}>✓ Extracted Verified Case Data:</Text>
                                        {searchResult.caseNumber ? (
                                            <Text style={styles.auditItemDetected}>• Case No: {searchResult.caseNumber}</Text>
                                        ) : null}
                                        {searchResult.courtName ? (
                                            <Text style={styles.auditItemDetected}>• Court: {searchResult.courtName}</Text>
                                        ) : null}
                                        {searchResult.petitioner?.name ? (
                                            <Text style={styles.auditItemDetected}>• Petitioner: {searchResult.petitioner.name}</Text>
                                        ) : null}
                                        {searchResult.respondent?.name ? (
                                            <Text style={styles.auditItemDetected}>• Respondent: {searchResult.respondent.name}</Text>
                                        ) : null}
                                        {searchResult.firDetails?.firNumber ? (
                                            <Text style={styles.auditItemDetected}>• FIR: {searchResult.firDetails.firNumber} ({searchResult.firDetails.policeStation || 'Station'})</Text>
                                        ) : null}
                                        {searchResult.nextHearing?.date ? (
                                            <Text style={styles.auditItemDetected}>• Next Date: {searchResult.nextHearing.date} ({searchResult.nextHearing.purpose || 'Hearing'})</Text>
                                        ) : null}
                                    </View>

                                    {/* Undetected / missing items */}
                                    {(!searchResult.cnr || !searchResult.sections?.length || !searchResult.firDetails?.firNumber || !searchResult.nextHearing?.date) && (
                                        <View style={[styles.auditSection, { marginTop: 6 }]}>
                                            <Text style={styles.auditMissingTitle}>• Not in Screenshot (Can edit after import):</Text>
                                            {!searchResult.cnr ? (
                                                <Text style={styles.auditItemMissing}>• CNR Number: Not shown in image</Text>
                                            ) : null}
                                            {!searchResult.sections?.length ? (
                                                <Text style={styles.auditItemMissing}>• Statutory Sections: Not shown in image</Text>
                                            ) : null}
                                            {!searchResult.firDetails?.firNumber ? (
                                                <Text style={styles.auditItemMissing}>• FIR / Crime No: Not shown in image</Text>
                                            ) : null}
                                            {!searchResult.nextHearing?.date ? (
                                                <Text style={styles.auditItemMissing}>• Next Hearing Date: Not specified</Text>
                                            ) : null}
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* Primary Import CTA with clean structured hierarchy */}
                            <SmoothPressable
                                style={styles.importActionBtn}
                                onPress={handleImport}
                                haptic="heavy"
                                scaleTo={0.96}
                            >
                                <LinearGradient
                                    colors={['#D4AF37', '#B8860B']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.importActionGradient}
                                >
                                    <View style={styles.importActionIconCircle}>
                                        <MaterialCommunityIcons name="download-box" size={20} color="#000000" />
                                    </View>
                                    <View style={styles.importActionContent}>
                                        <Text style={styles.importActionTitle}>Import Case to Chambers</Text>
                                        <Text style={styles.importActionSubtitle} numberOfLines={1} ellipsizeMode="tail">
                                            Client: {clientSide === 'CUSTOM' ? (customClientName.trim() || 'Specific Client') : clientSide === 'RESPONDENT' ? (searchResult.respondent?.name || 'Respondent') : (searchResult.petitioner?.name || 'Petitioner')}
                                        </Text>
                                    </View>
                                    <Ionicons name="arrow-forward-circle" size={22} color="#000000" style={{ opacity: 0.85 }} />
                                </LinearGradient>
                            </SmoothPressable>
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
};

const createStyles = (colors: any, spacing: any, isDark: boolean) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            backgroundColor: colors.surface,
        },
        headerLeft: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
        },
        headerIconBox: {
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: 'rgba(212, 175, 55, 0.15)',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: 'rgba(212, 175, 55, 0.3)',
        },
        headerTitle: {
            fontSize: 16,
            fontWeight: '700',
            color: colors.textPrimary,
            letterSpacing: 0.1,
        },
        headerSubtitle: {
            fontSize: 11,
            color: colors.textSecondary,
            marginTop: 1,
        },
        closeButton: {
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.15,
            shadowRadius: 2,
            elevation: 2,
        },
        content: {
            padding: 16,
            paddingBottom: 40,
        },
        dropzoneCard: {
            borderRadius: 18,
            padding: 16,
            backgroundColor: isDark ? '#141822' : '#FFFFFF',
            borderWidth: 1.2,
            borderColor: isDark ? 'rgba(212, 175, 55, 0.25)' : 'rgba(212, 175, 55, 0.2)',
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.2,
            shadowRadius: 12,
            elevation: 5,
            marginBottom: 16,
        },
        uploadDropBox: {
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: isDark ? 'rgba(212, 175, 55, 0.45)' : 'rgba(212, 175, 55, 0.5)',
            borderRadius: 14,
            paddingVertical: 24,
            paddingHorizontal: 16,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDark ? 'rgba(212, 175, 55, 0.03)' : '#FDFBF7',
        },
        uploadIconOuterRing: {
            width: 62,
            height: 62,
            borderRadius: 31,
            backgroundColor: isDark ? 'rgba(212, 175, 55, 0.08)' : 'rgba(212, 175, 55, 0.06)',
            borderWidth: 1,
            borderColor: 'rgba(212, 175, 55, 0.22)',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
        },
        uploadIconCircle: {
            width: 46,
            height: 46,
            borderRadius: 23,
            backgroundColor: 'rgba(212, 175, 55, 0.16)',
            alignItems: 'center',
            justifyContent: 'center',
        },
        uploadTitle: {
            fontSize: 15.5,
            fontWeight: '800',
            color: colors.textPrimary,
            marginBottom: 4,
            textAlign: 'center',
            letterSpacing: 0.1,
        },
        uploadSubtitle: {
            fontSize: 12,
            color: colors.textSecondary,
            textAlign: 'center',
            lineHeight: 17,
            paddingHorizontal: 8,
            marginBottom: 14,
        },
        uploadFeaturesRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
        },
        uploadFeatureBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4.5,
            paddingHorizontal: 9,
            paddingVertical: 4.5,
            borderRadius: 20,
            backgroundColor: isDark ? 'rgba(212, 175, 55, 0.1)' : 'rgba(212, 175, 55, 0.08)',
            borderWidth: 1,
            borderColor: 'rgba(212, 175, 55, 0.2)',
        },
        uploadFeatureBadgeText: {
            fontSize: 10.5,
            fontWeight: '700',
            color: '#D4AF37',
            letterSpacing: 0.2,
        },
        previewBox: {
            borderRadius: 12,
            overflow: 'hidden',
            marginBottom: 12,
            height: 160,
            backgroundColor: '#000000',
            position: 'relative',
        },
        imagePreview: {
            width: '100%',
            height: '100%',
            resizeMode: 'cover',
            opacity: 0.85,
        },
        previewTopGradient: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 54,
            zIndex: 10,
        },
        previewTopBar: {
            position: 'absolute',
            top: 8,
            left: 8,
            right: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 15,
        },
        previewTagPill: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4.5,
            backgroundColor: 'rgba(15, 18, 26, 0.94)',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 7,
            borderWidth: 1.2,
            borderColor: 'rgba(212, 175, 55, 0.6)',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.3,
            shadowRadius: 2,
            elevation: 3,
        },
        previewTagText: {
            color: '#FFFFFF',
            fontSize: 10.5,
            fontWeight: '800',
        },
        previewActionsRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
        },
        changeImageBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: 'rgba(15, 18, 26, 0.94)',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 7,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.25)',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.3,
            shadowRadius: 2,
            elevation: 3,
        },
        clearAllBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: '#DC2626',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 7,
            borderWidth: 1,
            borderColor: '#EF4444',
            shadowColor: '#DC2626',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.4,
            shadowRadius: 2,
            elevation: 3,
        },
        changeImageText: {
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: '700',
        },
        thumbnailsContainer: {
            marginTop: 4,
            marginBottom: 4,
        },
        thumbnailsHeaderRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
            paddingHorizontal: 2,
        },
        thumbnailsTitle: {
            color: isDark ? '#D4AF37' : '#92400E',
            fontSize: 10.5,
            fontWeight: '800',
            letterSpacing: 0.5,
        },
        thumbnailsHint: {
            color: isDark ? '#9CA3AF' : '#6B7280',
            fontSize: 10,
            fontWeight: '500',
        },
        thumbnailsScrollContent: {
            gap: 10,
            paddingVertical: 4,
            paddingHorizontal: 2,
        },
        thumbnailWrapper: {
            position: 'relative',
            width: 62,
            height: 80,
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
            overflow: 'visible',
        },
        thumbnailWrapperActive: {
            borderColor: '#D4AF37',
            shadowColor: '#D4AF37',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.4,
            shadowRadius: 5,
            elevation: 4,
        },
        thumbnailPressable: {
            width: '100%',
            height: '100%',
            borderRadius: 10,
            overflow: 'hidden',
            backgroundColor: isDark ? '#1C1F2B' : '#F3F4F6',
        },
        thumbnailImg: {
            width: '100%',
            height: '100%',
            resizeMode: 'cover',
        },
        thumbnailPageBadge: {
            position: 'absolute',
            bottom: 3,
            left: 3,
            backgroundColor: 'rgba(0,0,0,0.75)',
            paddingHorizontal: 5,
            paddingVertical: 1.5,
            borderRadius: 4,
        },
        thumbnailPageText: {
            color: '#FFFFFF',
            fontSize: 8.5,
            fontWeight: '800',
        },
        thumbnailRemoveBtn: {
            position: 'absolute',
            top: -6,
            right: -6,
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: '#EF4444',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 3,
            elevation: 5,
            borderWidth: 1.5,
            borderColor: colors.surface,
            zIndex: 20,
        },
        thumbnailAddBtn: {
            width: 68,
            height: 80,
            borderRadius: 12,
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: 'rgba(212, 175, 55, 0.5)',
            backgroundColor: isDark ? 'rgba(212, 175, 55, 0.06)' : 'rgba(212, 175, 55, 0.04)',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            paddingHorizontal: 4,
        },
        thumbnailAddText: {
            color: '#D4AF37',
            fontSize: 8.5,
            fontWeight: '700',
            textAlign: 'center',
        },
        actionButtonsRow: {
            flexDirection: 'row',
            gap: 8,
            marginTop: 12,
            width: '100%',
        },
        primaryButton: {
            flex: 1.15,
            borderRadius: 12,
            overflow: 'hidden',
        },
        primaryGradient: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            paddingVertical: 12,
            paddingHorizontal: 6,
        },
        primaryButtonText: {
            color: '#000000',
            fontSize: 12.5,
            fontWeight: '800',
            letterSpacing: 0.1,
            flexShrink: 1,
        },
        secondaryButton: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            paddingVertical: 12,
            paddingHorizontal: 6,
            borderRadius: 12,
            backgroundColor: isDark ? 'rgba(212, 175, 55, 0.12)' : 'rgba(212, 175, 55, 0.1)',
            borderWidth: 1.5,
            borderColor: 'rgba(212, 175, 55, 0.4)',
        },
        secondaryButtonText: {
            color: '#D4AF37',
            fontSize: 12.5,
            fontWeight: '800',
            letterSpacing: 0.1,
            flexShrink: 1,
        },
        scannerLaserBeam: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 24,
            zIndex: 10,
        },
        laserLine: {
            width: '100%',
            height: 3,
            shadowColor: '#D4AF37',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.9,
            shadowRadius: 6,
            elevation: 8,
        },
        scanningHud: {
            marginTop: 14,
            padding: 14,
            borderRadius: 14,
            backgroundColor: isDark ? 'rgba(212, 175, 55, 0.07)' : '#FFFDF5',
            borderWidth: 1.2,
            borderColor: 'rgba(212, 175, 55, 0.3)',
        },
        hudHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            marginBottom: 12,
        },
        hudBeaconIconBox: {
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: 'rgba(212, 175, 55, 0.15)',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: 'rgba(212, 175, 55, 0.3)',
        },
        hudTitle: {
            fontSize: 13,
            fontWeight: '800',
            color: isDark ? '#FFFFFF' : '#1F2937',
            letterSpacing: 0.1,
        },
        hudSubtext: {
            fontSize: 10.5,
            color: '#D4AF37',
            fontWeight: '600',
            marginTop: 1,
        },
        progressTrackBg: {
            height: 4,
            borderRadius: 2,
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
            marginBottom: 12,
            overflow: 'hidden',
        },
        progressTrackFill: {
            height: '100%',
            backgroundColor: '#D4AF37',
            borderRadius: 2,
        },
        stepsRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        stepItem: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            opacity: 0.45,
        },
        stepActive: {
            opacity: 1,
        },
        stepDotCircle: {
            width: 18,
            height: 18,
            borderRadius: 9,
            alignItems: 'center',
            justifyContent: 'center',
        },
        stepDotCurrent: {
            backgroundColor: '#D4AF37',
        },
        stepDotDone: {
            backgroundColor: '#10B981',
        },
        stepDotPending: {
            backgroundColor: isDark ? '#374151' : '#E5E7EB',
        },
        stepDotNum: {
            fontSize: 9.5,
            fontWeight: '800',
            color: isDark ? '#9CA3AF' : '#6B7280',
        },
        stepText: {
            fontSize: 10.5,
            fontWeight: '600',
            color: isDark ? '#9CA3AF' : '#6B7280',
        },
        stepTextActive: {
            color: isDark ? '#FFFFFF' : '#111827',
            fontWeight: '800',
        },
        stepConnector: {
            flex: 1,
            height: 1.5,
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            marginHorizontal: 4,
        },
        stepConnectorActive: {
            backgroundColor: '#10B981',
        },
        errorCard: {
            backgroundColor: isDark ? '#1C1618' : '#FFF5F5',
            borderRadius: 16,
            padding: 16,
            borderWidth: 1.2,
            borderColor: isDark ? 'rgba(248, 113, 113, 0.25)' : 'rgba(239, 68, 68, 0.25)',
            marginBottom: 14,
        },
        errorHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            marginBottom: 10,
        },
        errorIconBadge: {
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: 'rgba(239, 68, 68, 0.3)',
        },
        errorTitle: {
            fontSize: 14,
            fontWeight: '800',
            color: '#F87171',
            letterSpacing: 0.1,
        },
        errorSubtitle: {
            fontSize: 11,
            color: isDark ? '#9CA3AF' : '#6B7280',
            marginTop: 1,
        },
        errorBodyText: {
            fontSize: 12,
            color: isDark ? '#D1D5DB' : '#374151',
            lineHeight: 18,
            marginBottom: 12,
        },
        supportedFormatsBox: {
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.8)',
            borderRadius: 12,
            padding: 10,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
            marginBottom: 14,
        },
        supportedFormatsHeader: {
            fontSize: 10.5,
            fontWeight: '800',
            color: isDark ? '#9CA3AF' : '#6B7280',
            textTransform: 'uppercase',
            letterSpacing: 0.3,
            marginBottom: 8,
        },
        formatPillsGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 6,
        },
        formatPill: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            paddingHorizontal: 8,
            paddingVertical: 5,
            borderRadius: 6,
            backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ECFDF5',
            borderWidth: 1,
            borderColor: 'rgba(16, 185, 129, 0.2)',
        },
        formatPillText: {
            fontSize: 10.5,
            fontWeight: '600',
            color: isDark ? '#A7F3D0' : '#065F46',
        },
        errorActionRow: {
            flexDirection: 'row',
            gap: 10,
        },
        errorPrimaryBtn: {
            flex: 1.2,
            borderRadius: 10,
            overflow: 'hidden',
        },
        errorPrimaryGradient: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            paddingVertical: 11,
            paddingHorizontal: 8,
        },
        errorPrimaryText: {
            color: '#000000',
            fontSize: 12.5,
            fontWeight: '800',
        },
        errorSecondaryBtn: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            paddingVertical: 11,
            paddingHorizontal: 8,
            borderRadius: 10,
            backgroundColor: isDark ? 'rgba(212, 175, 55, 0.12)' : 'rgba(212, 175, 55, 0.08)',
            borderWidth: 1.2,
            borderColor: 'rgba(212, 175, 55, 0.4)',
        },
        errorSecondaryText: {
            color: '#D4AF37',
            fontSize: 12.5,
            fontWeight: '800',
        },
        resultCard: {
            backgroundColor: isDark ? '#181C26' : '#FFFFFF',
            borderRadius: 16,
            padding: 16,
            borderWidth: 1.5,
            borderColor: 'rgba(16, 185, 129, 0.4)',
            marginBottom: 16,
        },
        resultTopBar: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
        },
        courtBadgePill: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            backgroundColor: 'rgba(212, 175, 55, 0.15)',
            paddingHorizontal: 8,
            paddingVertical: 3.5,
            borderRadius: 6,
            flex: 1,
            marginRight: 8,
        },
        courtBadgeText: {
            fontSize: 11,
            fontWeight: '700',
            color: '#D4AF37',
            flex: 1,
        },
        liveVerifiedBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            borderColor: 'rgba(16, 185, 129, 0.4)',
            borderWidth: 1,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 10,
        },
        liveDot: {
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: '#10B981',
        },
        liveVerifiedText: {
            color: '#10B981',
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 0.4,
        },
        caseTitleText: {
            fontSize: 16,
            fontWeight: '700',
            color: isDark ? '#FFFFFF' : '#111827',
            lineHeight: 22,
            marginBottom: 10,
        },
        quickBadgesRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 6,
            marginBottom: 12,
        },
        cnrPill: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 6,
            backgroundColor: isDark ? '#232836' : '#F3F4F6',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        },
        cnrPillLabel: {
            fontSize: 9,
            fontWeight: '800',
            color: '#D4AF37',
        },
        cnrPillVal: {
            fontSize: 11,
            fontWeight: '700',
            color: isDark ? '#E5E7EB' : '#374151',
            fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        },
        caseNumPill: {
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 6,
            backgroundColor: 'rgba(212, 175, 55, 0.15)',
            borderWidth: 1,
            borderColor: 'rgba(212, 175, 55, 0.3)',
        },
        caseNumPillText: {
            fontSize: 11,
            color: '#D4AF37',
            fontWeight: '700',
        },
        hearingInfoCard: {
            backgroundColor: isDark ? 'rgba(245, 158, 11, 0.08)' : '#FFFBEB',
            borderColor: 'rgba(245, 158, 11, 0.3)',
            borderWidth: 1,
            borderRadius: 10,
            padding: 10,
            marginBottom: 12,
        },
        hearingHeaderRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 2,
        },
        hearingLabel: {
            fontSize: 11,
            fontWeight: '700',
            color: '#F59E0B',
            textTransform: 'uppercase',
        },
        hearingDateText: {
            fontSize: 13,
            fontWeight: '700',
            color: isDark ? '#FFFFFF' : '#111827',
        },
        hearingPurposeText: {
            fontSize: 11,
            color: isDark ? '#9CA3AF' : '#6B7280',
            marginTop: 2,
        },
        clientSelectionSection: {
            backgroundColor: isDark ? '#1C212D' : '#F8FAFC',
            borderRadius: 14,
            padding: 14,
            marginBottom: 14,
            borderWidth: 1.2,
            borderColor: isDark ? 'rgba(212, 175, 55, 0.25)' : 'rgba(212, 175, 55, 0.35)',
        },
        clientSelectionHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
        },
        clientSelectionIconBox: {
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: 'rgba(212, 175, 55, 0.15)',
            alignItems: 'center',
            justifyContent: 'center',
        },
        clientSelectionTitle: {
            fontSize: 14,
            fontWeight: '800',
            color: '#D4AF37',
            letterSpacing: 0.2,
        },
        clientSelectionSubtitle: {
            fontSize: 11,
            color: isDark ? '#9CA3AF' : '#6B7280',
            marginTop: 1,
        },
        clientOptionsContainer: {
            gap: 10,
        },
        clientOptionCard: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 10,
            backgroundColor: isDark ? '#141822' : '#FFFFFF',
            borderRadius: 12,
            padding: 12,
            borderWidth: 1.2,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
        },
        clientOptionCardActive: {
            borderColor: '#D4AF37',
            backgroundColor: isDark ? 'rgba(212, 175, 55, 0.08)' : 'rgba(212, 175, 55, 0.05)',
            shadowColor: '#D4AF37',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 6,
            elevation: 3,
        },
        clientOptionRadio: {
            marginTop: 2,
        },
        clientOptionBadgeRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginBottom: 4,
        },
        clientSideBadge: {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            paddingHorizontal: 7,
            paddingVertical: 2.5,
            borderRadius: 4,
        },
        clientSideBadgeActive: {
            backgroundColor: '#D4AF37',
        },
        clientSideBadgeText: {
            fontSize: 9.5,
            fontWeight: '800',
            color: isDark ? '#9CA3AF' : '#6B7280',
            letterSpacing: 0.3,
        },
        clientSideBadgeTextActive: {
            color: '#000000',
        },
        representingBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 3,
            backgroundColor: isDark ? 'rgba(212, 175, 55, 0.18)' : 'rgba(212, 175, 55, 0.14)',
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 4,
            borderWidth: 1,
            borderColor: 'rgba(212, 175, 55, 0.4)',
        },
        representingBadgeText: {
            fontSize: 9,
            fontWeight: '800',
            color: '#D4AF37',
            letterSpacing: 0.4,
        },
        clientOptionName: {
            fontSize: 13.5,
            fontWeight: '700',
            color: isDark ? '#FFFFFF' : '#111827',
            lineHeight: 18,
        },
        clientOptionAdvocate: {
            fontSize: 11.5,
            color: '#D4AF37',
            fontWeight: '600',
            marginTop: 2,
        },
        customClientInputBox: {
            marginTop: 6,
            backgroundColor: isDark ? '#141822' : '#FFFFFF',
            borderRadius: 10,
            padding: 12,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(212, 175, 55, 0.3)' : 'rgba(212, 175, 55, 0.4)',
            gap: 6,
        },
        customInputLabel: {
            fontSize: 11,
            fontWeight: '700',
            color: isDark ? '#D1D5DB' : '#374151',
            marginTop: 4,
        },
        customInput: {
            backgroundColor: isDark ? '#1E2536' : '#F3F4F6',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: Platform.OS === 'ios' ? 10 : 8,
            fontSize: 13,
            color: isDark ? '#FFFFFF' : '#111827',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
        sectionsContainer: {
            marginBottom: 14,
        },
        sectionsHeader: {
            fontSize: 10,
            fontWeight: '700',
            color: isDark ? '#9CA3AF' : '#6B7280',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            marginBottom: 6,
        },
        sectionsChipsRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 6,
        },
        sectionChipPill: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: 'rgba(212, 175, 55, 0.12)',
            borderColor: 'rgba(212, 175, 55, 0.3)',
            borderWidth: 1,
            paddingHorizontal: 8,
            paddingVertical: 3.5,
            borderRadius: 6,
        },
        sectionChipText: {
            fontSize: 11,
            color: '#D4AF37',
            fontWeight: '700',
        },
        auditContainer: {
            backgroundColor: isDark ? '#181C26' : '#F3F4F6',
            borderRadius: 10,
            padding: 10,
            marginBottom: 14,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(212, 175, 55, 0.2)' : 'rgba(212, 175, 55, 0.3)',
        },
        auditHeaderRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginBottom: 6,
        },
        auditHeaderText: {
            fontSize: 10,
            fontWeight: '800',
            color: '#D4AF37',
            letterSpacing: 0.8,
        },
        auditGrid: {
            gap: 4,
        },
        auditSection: {
            gap: 2,
        },
        auditDetectedTitle: {
            fontSize: 10.5,
            fontWeight: '700',
            color: '#10B981',
            marginBottom: 2,
        },
        auditItemDetected: {
            fontSize: 11,
            color: isDark ? '#E5E7EB' : '#374151',
            lineHeight: 16,
            paddingLeft: 4,
        },
        auditMissingTitle: {
            fontSize: 10.5,
            fontWeight: '700',
            color: '#F59E0B',
            marginBottom: 2,
        },
        auditItemMissing: {
            fontSize: 11,
            color: isDark ? '#9CA3AF' : '#6B7280',
            lineHeight: 16,
            paddingLeft: 4,
        },
        inlineEditNameBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 6,
            backgroundColor: 'rgba(212, 175, 55, 0.12)',
            borderWidth: 1,
            borderColor: 'rgba(212, 175, 55, 0.3)',
            alignSelf: 'center',
        },
        inlineEditNameText: {
            color: '#D4AF37',
            fontSize: 11,
            fontWeight: '700',
        },
        importActionBtn: {
            borderRadius: 14,
            overflow: 'hidden',
            marginTop: 6,
            marginBottom: 20,
            shadowColor: '#D4AF37',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 8,
            elevation: 6,
        },
        importActionGradient: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 12,
            paddingHorizontal: 16,
            gap: 12,
        },
        importActionIconCircle: {
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: 'rgba(0, 0, 0, 0.12)',
            alignItems: 'center',
            justifyContent: 'center',
        },
        importActionContent: {
            flex: 1,
            justifyContent: 'center',
        },
        importActionTitle: {
            color: '#000000',
            fontSize: 15,
            fontWeight: '800',
            letterSpacing: 0.2,
        },
        importActionSubtitle: {
            color: 'rgba(0, 0, 0, 0.75)',
            fontSize: 12,
            fontWeight: '600',
            marginTop: 1,
        },
    });
