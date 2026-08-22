import React, { useState, useMemo } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Modal, Image, ActivityIndicator, Platform,
    Alert, Switch
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { v4 as uuidv4 } from 'uuid';
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../theme/ThemeContext';
import { useToast } from '../context/ToastContext';
import { SmoothPressable } from '../components/SmoothPressable';
import {
    convertImagesToPdf,
    ImageToPdfItem,
    PdfConversionOptions,
    GeneratedPdfResult,
    formatBytes,
} from '../services/imageToPdfService';
import { Document, DocumentType } from '../models/Document';

type Props = NativeStackScreenProps<RootStackParamList, 'ImageToPdf'>;

export const ImageToPdfScreen: React.FC<Props> = ({ navigation, route }) => {
    const { colors, spacing, layout, mode } = useTheme();
    const isDark = mode === 'dark';
    const insets = useSafeAreaInsets();
    const { showToast } = useToast();

    const cases = useAppStore(state => state.cases);
    const addDocument = useAppStore(state => state.addDocument);

    // Initial pre-selected case if passed in route params
    const initialCaseId = (route.params as any)?.caseId;

    // Image list state
    const [images, setImages] = useState<ImageToPdfItem[]>([]);
    
    // PDF Configuration state
    const [pdfTitle, setPdfTitle] = useState('Court_Annexure_Doc');
    const [pageSize, setPageSize] = useState<'A4' | 'LEGAL'>('A4');
    const [pageOrientation, setPageOrientation] = useState<'PORTRAIT' | 'LANDSCAPE'>('PORTRAIT');
    const [marginStyle, setMarginStyle] = useState<'COURT' | 'COMPACT' | 'ZERO'>('COURT');
    const [includePageNumbers, setIncludePageNumbers] = useState(true);
    const [includeHeader, setIncludeHeader] = useState(true);
    const [headerText, setHeaderText] = useState('IN THE HIGH COURT OF JUDICATURE AT MADRAS');
    const [annexureLabel, setAnnexureLabel] = useState('ANNEXURE - P');

    // Conversion progress & result state
    const [isConverting, setIsConverting] = useState(false);
    const [progressStage, setProgressStage] = useState('');
    const [progressPercent, setProgressPercent] = useState(0);
    const [generatedResult, setGeneratedResult] = useState<GeneratedPdfResult | null>(null);

    // Modal visibility states
    const [showCaseSelectorModal, setShowCaseSelectorModal] = useState(false);
    const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
    const [selectedDocType, setSelectedDocType] = useState<DocumentType>('EVIDENCE');

    // Bottom padding for Android 3-button navbar / iOS home bar
    const modalBottomPadding = insets.bottom > 0 ? insets.bottom + 16 : (Platform.OS === 'android' ? 28 : 16);

    // Preview & Sorting modal state
    const [previewIndex, setPreviewIndex] = useState<number | null>(null);

    // Pick multiple images from gallery
    const handlePickFromGallery = async () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                showToast({ message: 'Gallery access permission is required.', type: 'error' });
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsMultipleSelection: true,
                quality: 1,
                selectionLimit: 50,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const newItems: ImageToPdfItem[] = result.assets.map(asset => ({
                    id: uuidv4(),
                    uri: asset.uri,
                    rotation: 0,
                    fileName: asset.fileName || `IMG_${Date.now()}`,
                    fileSize: asset.fileSize,
                }));
                setImages(prev => [...prev, ...newItems]);
                showToast({ message: `Added ${newItems.length} image${newItems.length > 1 ? 's' : ''}`, type: 'success' });
            }
        } catch (err: any) {
            console.error('[ImageToPdf] Gallery Pick Error:', err);
            showToast({ message: 'Failed to pick images from gallery', type: 'error' });
        }
    };

    // Capture photo from camera
    const handleCaptureCamera = async () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                showToast({ message: 'Camera access permission is required.', type: 'error' });
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                quality: 1,
                allowsEditing: false,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                const newItem: ImageToPdfItem = {
                    id: uuidv4(),
                    uri: asset.uri,
                    rotation: 0,
                    fileName: `CAM_${Date.now()}`,
                    fileSize: asset.fileSize,
                };
                setImages(prev => [...prev, newItem]);
                showToast({ message: 'Photo added to document', type: 'success' });
            }
        } catch (err: any) {
            console.error('[ImageToPdf] Camera Capture Error:', err);
            showToast({ message: 'Failed to capture photo', type: 'error' });
        }
    };

    // Reorder: Move Up
    const handleMoveUp = (index: number) => {
        if (index <= 0) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setImages(prev => {
            const list = [...prev];
            const temp = list[index];
            list[index] = list[index - 1];
            list[index - 1] = temp;
            return list;
        });
    };

    // Reorder: Move Down
    const handleMoveDown = (index: number) => {
        if (index >= images.length - 1) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setImages(prev => {
            const list = [...prev];
            const temp = list[index];
            list[index] = list[index + 1];
            list[index + 1] = temp;
            return list;
        });
    };

    // Rotate 90 degrees clockwise
    const handleRotate = (index: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setImages(prev => {
            const list = [...prev];
            list[index] = {
                ...list[index],
                rotation: (list[index].rotation + 90) % 360,
            };
            return list;
        });
    };

    // Delete single image
    const handleDeleteImage = (index: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    // Preview specific sorting handlers
    const handlePreviewMoveUp = () => {
        if (previewIndex === null || previewIndex <= 0) return;
        handleMoveUp(previewIndex);
        setPreviewIndex(previewIndex - 1);
    };

    const handlePreviewMoveDown = () => {
        if (previewIndex === null || previewIndex >= images.length - 1) return;
        handleMoveDown(previewIndex);
        setPreviewIndex(previewIndex + 1);
    };

    const handlePreviewRotate = () => {
        if (previewIndex === null) return;
        handleRotate(previewIndex);
    };

    const handlePreviewDelete = () => {
        if (previewIndex === null) return;
        const curIdx = previewIndex;
        handleDeleteImage(curIdx);
        if (images.length <= 1) {
            setPreviewIndex(null);
        } else if (curIdx >= images.length - 1) {
            setPreviewIndex(curIdx - 1);
        }
    };

    const handlePreviewPrev = () => {
        if (previewIndex === null || previewIndex <= 0) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setPreviewIndex(Math.max(0, previewIndex - 1));
    };

    const handlePreviewNext = () => {
        if (previewIndex === null || previewIndex >= images.length - 1) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setPreviewIndex(Math.min(images.length - 1, previewIndex + 1));
    };

    // Clear all images (opens luxury confirmation dialog)
    const handleClearAll = () => {
        if (images.length === 0) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowClearConfirmModal(true);
    };

    // Start PDF Generation
    const handleGeneratePdf = async () => {
        if (images.length === 0) {
            showToast({ message: 'Please select at least 1 image to convert', type: 'error' });
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setIsConverting(true);
        setProgressPercent(5);
        setProgressStage('Initializing PDF engine...');

        try {
            const options: PdfConversionOptions = {
                title: pdfTitle.trim() || 'Court_Document',
                pageSize,
                pageOrientation,
                marginStyle,
                includePageNumbers,
                includeHeader,
                headerText: headerText.trim(),
                annexureLabel: annexureLabel.trim(),
            };

            const result = await convertImagesToPdf(images, options, (p) => {
                setProgressStage(p.stage);
                setProgressPercent(p.percent);
            });

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setGeneratedResult(result);
        } catch (err: any) {
            console.error('[ImageToPdf] Generation error:', err);
            showToast({ message: err.message || 'Failed to generate PDF', type: 'error' });
        } finally {
            setIsConverting(false);
        }
    };

    // Share PDF
    const handleSharePdf = async () => {
        if (!generatedResult) return;
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(generatedResult.uri, {
                    mimeType: 'application/pdf',
                    dialogTitle: 'Share Court PDF Document',
                    UTI: 'com.adobe.pdf',
                });
            } else {
                showToast({ message: 'Sharing is not available on this device', type: 'error' });
            }
        } catch (err) {
            console.error('[ImageToPdf] Share error:', err);
        }
    };

    // Open PDF in system viewer
    const handleOpenPdf = async () => {
        if (!generatedResult) return;
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (Platform.OS === 'android') {
                try {
                    const contentUri = await FileSystem.getContentUriAsync(generatedResult.uri);
                    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
                        data: contentUri,
                        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
                        type: 'application/pdf',
                    });
                    return;
                } catch {
                    // Fallback to Sharing
                }
            }
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(generatedResult.uri, {
                    mimeType: 'application/pdf',
                    UTI: 'com.adobe.pdf',
                });
            }
        } catch (err) {
            console.error('[ImageToPdf] Open PDF error:', err);
            showToast({ message: 'Could not open PDF viewer', type: 'error' });
        }
    };

    // Save PDF directly to an Advocat Case
    const handleSaveToCase = (targetCaseId: string) => {
        if (!generatedResult) return;
        try {
            const targetCase = cases.find(c => c.id === targetCaseId);
            if (!targetCase) {
                showToast({ message: 'Case not found', type: 'error' });
                return;
            }

            const docId = uuidv4();
            const newDoc: Document = {
                id: docId,
                caseId: targetCaseId,
                name: generatedResult.fileName.replace(/\.pdf$/, '') || 'Converted_PDF',
                type: selectedDocType,
                mimeType: 'application/pdf',
                currentVersionId: `${docId}_v1`,
                versions: [
                    {
                        id: `${docId}_v1`,
                        versionNumber: 1,
                        uri: generatedResult.uri,
                        createdAt: new Date().toISOString(),
                        notes: `Converted from ${generatedResult.pageCount} scanned images.`,
                        fileSize: generatedResult.fileSize,
                    }
                ],
                tags: ['IMAGE_TO_PDF', 'SCANNED_ANNEXURE', 'COURT_READY'],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            addDocument(newDoc);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setShowCaseSelectorModal(false);
            showToast({
                message: `Saved to ${targetCase.name || targetCase.caseNumber}!`,
                type: 'success'
            });
        } catch (err: any) {
            console.error('[ImageToPdf] Save to Case error:', err);
            showToast({ message: 'Failed to save document to case', type: 'error' });
        }
    };

    const styles = createStyles(colors, spacing, layout, isDark, modalBottomPadding);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* 1. TOP APP BAR */}
            <View style={styles.header}>
                <SmoothPressable
                    onPress={() => navigation.goBack()}
                    style={styles.backBtn}
                    hitSlop={10}
                    haptic="light"
                >
                    <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
                </SmoothPressable>

                <View style={styles.headerTitleBox}>
                    <Text style={styles.headerTitle}>Image to PDF Studio</Text>
                    <Text style={styles.headerSubtitle}>High-Res Court Standard Scanner</Text>
                </View>

                {images.length > 0 && (
                    <SmoothPressable
                        onPress={handleClearAll}
                        style={styles.clearBtn}
                        hitSlop={8}
                        haptic="medium"
                    >
                        <Text style={styles.clearBtnText}>Clear</Text>
                    </SmoothPressable>
                )}
            </View>

            <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* 2. SOURCE PICKER HERO CARDS */}
                <View style={styles.pickerRow}>
                    <SmoothPressable
                        style={[styles.pickerActionCard, { borderColor: '#3B82F6' }]}
                        onPress={handlePickFromGallery}
                        haptic="medium"
                        scaleTo={0.96}
                    >
                        <LinearGradient
                            colors={['rgba(59, 130, 246, 0.18)', 'rgba(59, 130, 246, 0.05)']}
                            style={styles.pickerCardGradient}
                        >
                            <View style={[styles.pickerIconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
                                <Ionicons name="images-outline" size={24} color="#3B82F6" />
                            </View>
                            <Text style={styles.pickerCardTitle}>Pick from Gallery</Text>
                            <Text style={styles.pickerCardDesc}>Multi-Select Photos & Docs</Text>
                        </LinearGradient>
                    </SmoothPressable>

                    <SmoothPressable
                        style={[styles.pickerActionCard, { borderColor: '#D4AF37' }]}
                        onPress={handleCaptureCamera}
                        haptic="medium"
                        scaleTo={0.96}
                    >
                        <LinearGradient
                            colors={['rgba(212, 175, 55, 0.18)', 'rgba(212, 175, 55, 0.05)']}
                            style={styles.pickerCardGradient}
                        >
                            <View style={[styles.pickerIconCircle, { backgroundColor: 'rgba(212, 175, 55, 0.2)' }]}>
                                <Ionicons name="camera-outline" size={24} color="#D4AF37" />
                            </View>
                            <Text style={styles.pickerCardTitle}>Camera Scan</Text>
                            <Text style={styles.pickerCardDesc}>Snap Evidence / Papers</Text>
                        </LinearGradient>
                    </SmoothPressable>
                </View>

                {/* 3. SELECTED IMAGES LIST & ARRANGER */}
                <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionTitleRow}>
                        <Text style={styles.sectionLabel}>PAGES & SEQUENCE</Text>
                        <View style={styles.countBadge}>
                            <Text style={styles.countBadgeText}>{images.length} {images.length === 1 ? 'Page' : 'Pages'}</Text>
                        </View>
                    </View>
                    {images.length > 1 && (
                        <Text style={styles.reorderHint}>Use ▲ ▼ to arrange page order</Text>
                    )}
                </View>

                {images.length === 0 ? (
                    <View style={styles.emptyStateBox}>
                        <View style={styles.emptyIconCircle}>
                            <MaterialCommunityIcons name="file-pdf-box" size={40} color={colors.textTertiary} />
                        </View>
                        <Text style={styles.emptyTitle}>No Images Selected</Text>
                        <Text style={styles.emptyDesc}>
                            Add scanned pages, photocopies, or evidence photos from your gallery or camera to build your PDF bundle.
                        </Text>
                    </View>
                ) : (
                    <View style={styles.imageList}>
                        {images.map((item, index) => (
                            <View key={item.id} style={styles.imageCard}>
                                <TouchableOpacity
                                    style={styles.imageCardTouchable}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setPreviewIndex(index);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    {/* Page Number Badge */}
                                    <View style={styles.pageNumberBadge}>
                                        <Text style={styles.pageNumberText}>{index + 1}</Text>
                                    </View>

                                    {/* Image Thumbnail with Rotation & Preview Eye */}
                                    <View style={styles.thumbWrapper}>
                                        <Image
                                            source={{ uri: item.uri }}
                                            style={[
                                                styles.thumbImage,
                                                { transform: [{ rotate: `${item.rotation}deg` }] }
                                            ]}
                                            resizeMode="cover"
                                        />
                                        <View style={styles.thumbEyeOverlay}>
                                            <Ionicons name="expand" size={10} color="#FFFFFF" />
                                        </View>
                                        {item.rotation > 0 && (
                                            <View style={styles.rotationBadge}>
                                                <Text style={styles.rotationBadgeText}>{item.rotation}°</Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Meta Info */}
                                    <View style={styles.imageInfo}>
                                        <Text style={styles.imageName} numberOfLines={1}>
                                            Page {index + 1} • {item.fileName || 'Scanned Image'}
                                        </Text>
                                        <Text style={styles.imageMeta}>
                                            {item.fileSize ? formatBytes(item.fileSize) : 'High-Res Scan'}
                                            {item.rotation !== 0 ? ` • ${item.rotation}°` : ''}
                                        </Text>
                                        <View style={styles.previewTagRow}>
                                            <Ionicons name="eye-outline" size={11} color="#D4AF37" />
                                            <Text style={styles.previewTagText}>Tap to preview & sort</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>

                                {/* Quick Tools: Reorder, Rotate, Delete */}
                                <View style={styles.cardToolsRow}>
                                    <SmoothPressable
                                        onPress={() => handleMoveUp(index)}
                                        style={[styles.toolBtn, index === 0 && styles.toolBtnDisabled]}
                                        disabled={index === 0}
                                        hitSlop={6}
                                        haptic="light"
                                    >
                                        <Ionicons
                                            name="chevron-up"
                                            size={18}
                                            color={index === 0 ? colors.textTertiary : colors.textPrimary}
                                        />
                                    </SmoothPressable>

                                    <SmoothPressable
                                        onPress={() => handleMoveDown(index)}
                                        style={[styles.toolBtn, index === images.length - 1 && styles.toolBtnDisabled]}
                                        disabled={index === images.length - 1}
                                        hitSlop={6}
                                        haptic="light"
                                    >
                                        <Ionicons
                                            name="chevron-down"
                                            size={18}
                                            color={index === images.length - 1 ? colors.textTertiary : colors.textPrimary}
                                        />
                                    </SmoothPressable>

                                    <SmoothPressable
                                        onPress={() => handleRotate(index)}
                                        style={styles.toolBtn}
                                        hitSlop={6}
                                        haptic="light"
                                    >
                                        <MaterialCommunityIcons name="rotate-right" size={18} color="#D4AF37" />
                                    </SmoothPressable>

                                    <SmoothPressable
                                        onPress={() => handleDeleteImage(index)}
                                        style={[styles.toolBtn, styles.toolBtnDelete]}
                                        hitSlop={6}
                                        haptic="medium"
                                    >
                                        <Ionicons name="trash-outline" size={17} color={colors.critical} />
                                    </SmoothPressable>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* 4. PDF FORMATTING & COURT OPTIONS */}
                <View style={styles.settingsSection}>
                    <Text style={styles.sectionLabel}>PDF & COURT SETTINGS</Text>

                    {/* Document Title */}
                    <Text style={styles.inputLabel}>Document Title / File Name</Text>
                    <TextInput
                        style={styles.textInput}
                        value={pdfTitle}
                        onChangeText={setPdfTitle}
                        placeholder="e.g. Crime_45_Annexure_P1"
                        placeholderTextColor={colors.textTertiary}
                    />

                    {/* Page Size & Orientation Row */}
                    <View style={styles.configGrid}>
                        <View style={styles.configCol}>
                            <Text style={styles.inputLabel}>Page Size</Text>
                            <View style={styles.pillGroup}>
                                <TouchableOpacity
                                    style={[styles.pill, pageSize === 'A4' && styles.pillActive]}
                                    onPress={() => setPageSize('A4')}
                                >
                                    <Text style={[styles.pillText, pageSize === 'A4' && styles.pillTextActive]}>A4 Standard</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.pill, pageSize === 'LEGAL' && styles.pillActive]}
                                    onPress={() => setPageSize('LEGAL')}
                                >
                                    <Text style={[styles.pillText, pageSize === 'LEGAL' && styles.pillTextActive]}>Legal (Court)</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.configCol}>
                            <Text style={styles.inputLabel}>Orientation</Text>
                            <View style={styles.pillGroup}>
                                <TouchableOpacity
                                    style={[styles.pill, pageOrientation === 'PORTRAIT' && styles.pillActive]}
                                    onPress={() => setPageOrientation('PORTRAIT')}
                                >
                                    <Text style={[styles.pillText, pageOrientation === 'PORTRAIT' && styles.pillTextActive]}>Portrait</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.pill, pageOrientation === 'LANDSCAPE' && styles.pillActive]}
                                    onPress={() => setPageOrientation('LANDSCAPE')}
                                >
                                    <Text style={[styles.pillText, pageOrientation === 'LANDSCAPE' && styles.pillTextActive]}>Landscape</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* Margin Style */}
                    <Text style={styles.inputLabel}>Margin Layout</Text>
                    <View style={styles.pillGroup}>
                        <TouchableOpacity
                            style={[styles.pill, marginStyle === 'COURT' && styles.pillActive]}
                            onPress={() => setMarginStyle('COURT')}
                        >
                            <Text style={[styles.pillText, marginStyle === 'COURT' && styles.pillTextActive]}>Court Margin (Clean)</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.pill, marginStyle === 'COMPACT' && styles.pillActive]}
                            onPress={() => setMarginStyle('COMPACT')}
                        >
                            <Text style={[styles.pillText, marginStyle === 'COMPACT' && styles.pillTextActive]}>Compact</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.pill, marginStyle === 'ZERO' && styles.pillActive]}
                            onPress={() => setMarginStyle('ZERO')}
                        >
                            <Text style={[styles.pillText, marginStyle === 'ZERO' && styles.pillTextActive]}>Full Bleed</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Toggles: Page Numbers & Header */}
                    <View style={styles.toggleRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.toggleLabel}>Court Page Numbering</Text>
                            <Text style={styles.toggleSub}>Adds "Page X of N" to bottom footer</Text>
                        </View>
                        <Switch
                            value={includePageNumbers}
                            onValueChange={setIncludePageNumbers}
                            trackColor={{ false: colors.border, true: '#D4AF37' }}
                            thumbColor="#FFFFFF"
                        />
                    </View>

                    <View style={styles.toggleRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.toggleLabel}>Court Header & Annexure Tag</Text>
                            <Text style={styles.toggleSub}>Adds top banner & annexure reference</Text>
                        </View>
                        <Switch
                            value={includeHeader}
                            onValueChange={setIncludeHeader}
                            trackColor={{ false: colors.border, true: '#D4AF37' }}
                            thumbColor="#FFFFFF"
                        />
                    </View>

                    {includeHeader && (
                        <View style={styles.headerInputsBox}>
                            <Text style={styles.inputLabel}>Annexure Label</Text>
                            <TextInput
                                style={styles.textInput}
                                value={annexureLabel}
                                onChangeText={setAnnexureLabel}
                                placeholder="e.g. ANNEXURE - P1"
                                placeholderTextColor={colors.textTertiary}
                            />

                            <Text style={styles.inputLabel}>Court Header Title</Text>
                            <TextInput
                                style={styles.textInput}
                                value={headerText}
                                onChangeText={setHeaderText}
                                placeholder="IN THE HIGH COURT OF JUDICATURE AT MADRAS"
                                placeholderTextColor={colors.textTertiary}
                            />
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* 5. BOTTOM FLOATING ACTION BAR */}
            <View style={styles.bottomBar}>
                <SmoothPressable
                    style={[
                        styles.generateBtn,
                        images.length === 0 && styles.generateBtnDisabled
                    ]}
                    onPress={handleGeneratePdf}
                    disabled={images.length === 0}
                    haptic="heavy"
                    scaleTo={0.97}
                >
                    <LinearGradient
                        colors={images.length > 0 ? ['#E5C058', '#D4AF37', '#B89025'] : ['#4B5563', '#374151']}
                        style={styles.generateBtnGradient}
                    >
                        <MaterialCommunityIcons name="lightning-bolt" size={20} color="#000000" />
                        <Text style={styles.generateBtnText}>
                            Generate Court PDF ({images.length} {images.length === 1 ? 'Page' : 'Pages'})
                        </Text>
                    </LinearGradient>
                </SmoothPressable>
            </View>

            {/* 6. CONVERSION PROGRESS ANIMATION MODAL */}
            <Modal visible={isConverting} transparent animationType="fade" statusBarTranslucent>
                <View style={styles.progressOverlay}>
                    <View style={styles.progressCard}>
                        <ActivityIndicator size="large" color="#D4AF37" style={{ marginBottom: 16 }} />
                        <Text style={styles.progressTitle}>Generating High-Res PDF</Text>
                        <Text style={styles.progressStageText}>{progressStage}</Text>

                        <View style={styles.progressBarTrack}>
                            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                        </View>
                        <Text style={styles.progressPercentText}>{progressPercent}%</Text>
                    </View>
                </View>
            </Modal>

            {/* 7. PDF GENERATED SUCCESS & ACTION MODAL */}
            <Modal
                visible={!!generatedResult}
                transparent
                animationType="slide"
                statusBarTranslucent
                onRequestClose={() => setGeneratedResult(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.resultModalContent}>
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
                            <View style={styles.successIconBox}>
                                <Ionicons name="checkmark-circle" size={54} color="#10B981" />
                            </View>

                            <Text style={styles.resultTitle}>PDF Generated Successfully!</Text>
                            <Text style={styles.resultSubtitle}>Court-compliant, high-resolution document ready</Text>

                            {/* Summary Metadata Card */}
                            {generatedResult && (
                                <View style={styles.resultMetaCard}>
                                    <View style={styles.metaRow}>
                                        <Text style={styles.metaLabel}>File Name</Text>
                                        <Text style={styles.metaValue} numberOfLines={1}>{generatedResult.fileName}</Text>
                                    </View>
                                    <View style={styles.metaRow}>
                                        <Text style={styles.metaLabel}>Total Pages</Text>
                                        <Text style={styles.metaValue}>{generatedResult.pageCount} Pages</Text>
                                    </View>
                                    <View style={styles.metaRow}>
                                        <Text style={styles.metaLabel}>Document Size</Text>
                                        <Text style={styles.metaValue}>{formatBytes(generatedResult.fileSize)}</Text>
                                    </View>
                                    <View style={styles.metaRow}>
                                        <Text style={styles.metaLabel}>Page Standard</Text>
                                        <Text style={styles.metaValue}>{pageSize} • {pageOrientation}</Text>
                                    </View>
                                </View>
                            )}

                            {/* Main Action Buttons */}
                            <View style={styles.resultActionsGrid}>
                                <SmoothPressable
                                    style={[styles.actionBtn, styles.actionBtnPrimary]}
                                    onPress={handleSharePdf}
                                    haptic="medium"
                                >
                                    <Ionicons name="share-outline" size={19} color="#000000" />
                                    <Text style={styles.actionBtnTextPrimary}>Share / Export PDF</Text>
                                </SmoothPressable>

                                <SmoothPressable
                                    style={[styles.actionBtn, styles.actionBtnCase]}
                                    onPress={() => setShowCaseSelectorModal(true)}
                                    haptic="medium"
                                >
                                    <MaterialCommunityIcons name="briefcase-plus-outline" size={19} color="#D4AF37" />
                                    <Text style={styles.actionBtnTextGold}>Save to Case Vault</Text>
                                </SmoothPressable>

                                <SmoothPressable
                                    style={styles.actionBtn}
                                    onPress={handleOpenPdf}
                                    haptic="light"
                                >
                                    <Ionicons name="eye-outline" size={19} color={colors.textPrimary} />
                                    <Text style={styles.actionBtnText}>Open in PDF Viewer</Text>
                                </SmoothPressable>
                            </View>

                            <SmoothPressable
                                style={styles.doneBtn}
                                onPress={() => setGeneratedResult(null)}
                                haptic="light"
                            >
                                <Ionicons name="arrow-back-circle-outline" size={18} color={colors.textSecondary} />
                                <Text style={styles.doneBtnText}>Close & Return to Studio</Text>
                            </SmoothPressable>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* 8. CASE SELECTOR MODAL (Save to Case) */}
            <Modal
                visible={showCaseSelectorModal}
                transparent
                animationType="slide"
                statusBarTranslucent
                onRequestClose={() => setShowCaseSelectorModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.casePickerContent}>
                        <View style={styles.casePickerHeader}>
                            <Text style={styles.modalTitle}>Attach to Case Vault</Text>
                            <TouchableOpacity onPress={() => setShowCaseSelectorModal(false)} hitSlop={10}>
                                <Ionicons name="close" size={24} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>Select Document Category</Text>
                        <View style={styles.typeChipsRow}>
                            {(['EVIDENCE', 'ANNEXURE', 'PETITION', 'COURT_ORDER', 'OTHER'] as DocumentType[]).map(type => (
                                <TouchableOpacity
                                    key={type}
                                    style={[styles.typeChip, selectedDocType === type && styles.typeChipActive]}
                                    onPress={() => setSelectedDocType(type)}
                                >
                                    <Text style={[styles.typeChipText, selectedDocType === type && styles.typeChipTextActive]}>
                                        {type}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.inputLabel}>Select Destination Case ({cases.length} Active)</Text>
                        <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                            {cases.length === 0 ? (
                                <View style={{ padding: 20, alignItems: 'center' }}>
                                    <Text style={{ color: colors.textSecondary }}>No cases available in chamber.</Text>
                                </View>
                            ) : (
                                cases.map(c => (
                                    <TouchableOpacity
                                        key={c.id}
                                        style={styles.caseOptionCard}
                                        onPress={() => handleSaveToCase(c.id)}
                                    >
                                        <View style={styles.caseOptionIcon}>
                                            <MaterialCommunityIcons name="gavel" size={20} color="#D4AF37" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.caseOptionTitle} numberOfLines={1}>{c.name || 'Untitled Case'}</Text>
                                            <Text style={styles.caseOptionSub}>
                                                {c.caseNumber || 'No Number'} • {c.courtName || 'Court'}
                                            </Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                                    </TouchableOpacity>
                                ))
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* 9. FULL-SCREEN IMAGE PREVIEW & SORTING MODAL */}
            <Modal
                visible={previewIndex !== null && !!images[previewIndex]}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={() => setPreviewIndex(null)}
            >
                {previewIndex !== null && images[previewIndex] && (
                    <View style={styles.previewModalOverlay}>
                        <SafeAreaView style={styles.previewSafeArea} edges={['top']}>
                            {/* Header */}
                            <View style={styles.previewHeader}>
                                <View style={styles.previewTitleBlock}>
                                    <View style={styles.previewPageBadge}>
                                        <Text style={styles.previewPageBadgeText}>
                                            Page {previewIndex + 1} of {images.length}
                                        </Text>
                                    </View>
                                    <Text style={styles.previewFileName} numberOfLines={1}>
                                        {images[previewIndex].fileName || 'Page Document'}
                                    </Text>
                                </View>
                                <SmoothPressable
                                    onPress={() => setPreviewIndex(null)}
                                    style={styles.previewCloseBtn}
                                    hitSlop={10}
                                    haptic="light"
                                >
                                    <Ionicons name="close" size={22} color="#FFFFFF" />
                                </SmoothPressable>
                            </View>

                            {/* Main Large Image Canvas */}
                            <View style={styles.previewImageCanvas}>
                                {/* Left Page Arrow */}
                                <SmoothPressable
                                    onPress={handlePreviewPrev}
                                    disabled={previewIndex <= 0}
                                    style={[styles.navPageBtn, styles.navPageBtnLeft, previewIndex <= 0 && styles.navPageBtnDisabled]}
                                    hitSlop={10}
                                    haptic="light"
                                >
                                    <Ionicons name="chevron-back" size={24} color={previewIndex <= 0 ? 'rgba(255,255,255,0.2)' : '#FFFFFF'} />
                                </SmoothPressable>

                                <Image
                                    source={{ uri: images[previewIndex].uri }}
                                    style={[
                                        styles.previewLargeImage,
                                        { transform: [{ rotate: `${images[previewIndex].rotation}deg` }] }
                                    ]}
                                    resizeMode="contain"
                                />

                                {/* Right Page Arrow */}
                                <SmoothPressable
                                    onPress={handlePreviewNext}
                                    disabled={previewIndex >= images.length - 1}
                                    style={[styles.navPageBtn, styles.navPageBtnRight, previewIndex >= images.length - 1 && styles.navPageBtnDisabled]}
                                    hitSlop={10}
                                    haptic="light"
                                >
                                    <Ionicons name="chevron-forward" size={24} color={previewIndex >= images.length - 1 ? 'rgba(255,255,255,0.2)' : '#FFFFFF'} />
                                </SmoothPressable>
                            </View>

                            {/* Bottom Sorting & Action Toolbar */}
                            <View style={[styles.previewToolbar, { paddingBottom: modalBottomPadding }]}>
                                <Text style={styles.previewSortLabel}>PAGE ARRANGER & POSITION TOOLS</Text>
                                <View style={styles.previewSortBtnRow}>
                                    <SmoothPressable
                                        style={[styles.previewSortBtn, previewIndex <= 0 && styles.previewSortBtnDisabled]}
                                        onPress={handlePreviewMoveUp}
                                        disabled={previewIndex <= 0}
                                        haptic="light"
                                    >
                                        <Ionicons name="arrow-up" size={17} color={previewIndex <= 0 ? 'rgba(255,255,255,0.3)' : '#D4AF37'} />
                                        <Text style={[styles.previewSortBtnText, previewIndex <= 0 && styles.previewSortBtnTextDisabled]}>Move Up</Text>
                                    </SmoothPressable>

                                    <SmoothPressable
                                        style={[styles.previewSortBtn, previewIndex >= images.length - 1 && styles.previewSortBtnDisabled]}
                                        onPress={handlePreviewMoveDown}
                                        disabled={previewIndex >= images.length - 1}
                                        haptic="light"
                                    >
                                        <Ionicons name="arrow-down" size={17} color={previewIndex >= images.length - 1 ? 'rgba(255,255,255,0.3)' : '#D4AF37'} />
                                        <Text style={[styles.previewSortBtnText, previewIndex >= images.length - 1 && styles.previewSortBtnTextDisabled]}>Move Down</Text>
                                    </SmoothPressable>

                                    <SmoothPressable
                                        style={styles.previewSortBtn}
                                        onPress={handlePreviewRotate}
                                        haptic="light"
                                    >
                                        <MaterialCommunityIcons name="rotate-right" size={18} color="#D4AF37" />
                                        <Text style={styles.previewSortBtnText}>Rotate</Text>
                                    </SmoothPressable>

                                    <SmoothPressable
                                        style={[styles.previewSortBtn, styles.previewSortBtnDelete]}
                                        onPress={handlePreviewDelete}
                                        haptic="medium"
                                    >
                                        <Ionicons name="trash-outline" size={17} color="#EF4444" />
                                        <Text style={[styles.previewSortBtnText, { color: '#EF4444' }]}>Delete</Text>
                                    </SmoothPressable>
                                </View>
                            </View>
                        </SafeAreaView>
                    </View>
                )}
            </Modal>

            {/* 10. LUXURY CLEAR ALL CONFIRMATION DIALOG */}
            <Modal
                visible={showClearConfirmModal}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={() => setShowClearConfirmModal(false)}
            >
                <View style={styles.confirmModalOverlay}>
                    <View style={styles.confirmModalCard}>
                        <View style={styles.confirmIconCircle}>
                            <Ionicons name="trash-outline" size={26} color={colors.critical} />
                        </View>

                        <Text style={styles.confirmTitle}>Clear All Pages?</Text>
                        <Text style={styles.confirmDesc}>
                            Are you sure you want to remove all{' '}
                            <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                                {images.length} selected page{images.length > 1 ? 's' : ''}
                            </Text>{' '}
                            from this PDF bundle? This action cannot be undone.
                        </Text>

                        <View style={styles.confirmActionsRow}>
                            <SmoothPressable
                                style={styles.confirmCancelBtn}
                                onPress={() => setShowClearConfirmModal(false)}
                                haptic="light"
                            >
                                <Text style={styles.confirmCancelBtnText}>Cancel</Text>
                            </SmoothPressable>

                            <SmoothPressable
                                style={styles.confirmDangerBtn}
                                onPress={() => {
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                                    setImages([]);
                                    setShowClearConfirmModal(false);
                                    showToast({ message: 'All pages cleared', type: 'info' });
                                }}
                                haptic="medium"
                            >
                                <Ionicons name="trash" size={16} color="#FFFFFF" />
                                <Text style={styles.confirmDangerBtnText}>Clear All</Text>
                            </SmoothPressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const createStyles = (colors: any, spacing: any, layout: any, isDark: boolean, modalBottomPadding: number) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.m,
        paddingTop: spacing.xs,
        paddingBottom: spacing.s,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    headerTitleBox: {
        flex: 1,
        marginHorizontal: 12,
    },
    headerTitle: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    headerSubtitle: {
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: '500',
        marginTop: 1,
    },
    clearBtn: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)',
    },
    clearBtnText: {
        color: colors.critical,
        fontSize: 12,
        fontWeight: '700',
    },
    scrollArea: {
        flex: 1,
    },
    scrollContent: {
        padding: spacing.m,
        paddingBottom: 120,
    },
    pickerRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: spacing.l,
    },
    pickerActionCard: {
        flex: 1,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1.5,
    },
    pickerCardGradient: {
        padding: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pickerIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    pickerCardTitle: {
        color: colors.textPrimary,
        fontSize: 13.5,
        fontWeight: '800',
        textAlign: 'center',
    },
    pickerCardDesc: {
        color: colors.textTertiary,
        fontSize: 10.5,
        fontWeight: '500',
        marginTop: 2,
        textAlign: 'center',
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sectionLabel: {
        color: colors.textTertiary,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    countBadge: {
        backgroundColor: isDark ? 'rgba(212, 175, 55, 0.14)' : 'rgba(212, 175, 55, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.3)',
    },
    countBadgeText: {
        color: '#D4AF37',
        fontSize: 10.5,
        fontWeight: '700',
    },
    reorderHint: {
        color: colors.textTertiary,
        fontSize: 11,
        fontStyle: 'italic',
    },
    emptyStateBox: {
        backgroundColor: colors.surface,
        borderRadius: 18,
        padding: 30,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: colors.border,
        borderStyle: 'dashed',
        marginBottom: spacing.l,
    },
    emptyIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    emptyTitle: {
        color: colors.textPrimary,
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 4,
    },
    emptyDesc: {
        color: colors.textSecondary,
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 18,
        maxWidth: 280,
    },
    imageList: {
        gap: 10,
        marginBottom: spacing.l,
    },
    imageCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 14,
        padding: 10,
        borderWidth: 1,
        borderColor: colors.border,
    },
    pageNumberBadge: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: isDark ? '#232938' : '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    pageNumberText: {
        color: colors.textPrimary,
        fontSize: 11.5,
        fontWeight: '800',
    },
    thumbWrapper: {
        width: 50,
        height: 60,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#000000',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        position: 'relative',
    },
    thumbImage: {
        width: '100%',
        height: '100%',
    },
    rotationBadge: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4,
    },
    rotationBadgeText: {
        color: '#D4AF37',
        fontSize: 8.5,
        fontWeight: '800',
    },
    imageInfo: {
        flex: 1,
        paddingRight: 6,
    },
    imageName: {
        color: colors.textPrimary,
        fontSize: 13,
        fontWeight: '700',
    },
    imageMeta: {
        color: colors.textTertiary,
        fontSize: 11,
        marginTop: 2,
    },
    cardToolsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    toolBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    toolBtnDisabled: {
        opacity: 0.3,
    },
    toolBtnDelete: {
        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)',
    },
    settingsSection: {
        backgroundColor: colors.surface,
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 8,
    },
    inputLabel: {
        color: colors.textSecondary,
        fontSize: 11.5,
        fontWeight: '700',
        marginTop: 6,
        marginBottom: 4,
    },
    textInput: {
        backgroundColor: isDark ? '#141824' : '#F3F4F6',
        color: colors.textPrimary,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        fontSize: 13.5,
        borderWidth: 1,
        borderColor: colors.border,
    },
    configGrid: {
        flexDirection: 'row',
        gap: 10,
    },
    configCol: {
        flex: 1,
    },
    pillGroup: {
        flexDirection: 'row',
        gap: 6,
    },
    pill: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: isDark ? '#141824' : '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    pillActive: {
        backgroundColor: '#D4AF37',
        borderColor: '#D4AF37',
    },
    pillText: {
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: '600',
    },
    pillTextActive: {
        color: '#000000',
        fontWeight: '800',
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border,
        marginTop: 4,
    },
    toggleLabel: {
        color: colors.textPrimary,
        fontSize: 13,
        fontWeight: '700',
    },
    toggleSub: {
        color: colors.textTertiary,
        fontSize: 11,
        marginTop: 1,
    },
    headerInputsBox: {
        gap: 4,
        paddingTop: 4,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: spacing.m,
        paddingTop: 10,
        paddingBottom: modalBottomPadding,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    generateBtn: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    generateBtnDisabled: {
        opacity: 0.5,
    },
    generateBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
    },
    generateBtnText: {
        color: '#000000',
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    progressOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    progressCard: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 320,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    progressTitle: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 4,
    },
    progressStageText: {
        color: colors.textSecondary,
        fontSize: 12.5,
        textAlign: 'center',
        marginBottom: 16,
    },
    progressBarTrack: {
        width: '100%',
        height: 6,
        borderRadius: 3,
        backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
        overflow: 'hidden',
        marginBottom: 6,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#D4AF37',
        borderRadius: 3,
    },
    progressPercentText: {
        color: '#D4AF37',
        fontSize: 12,
        fontWeight: '800',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'flex-end',
    },
    resultModalContent: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: modalBottomPadding,
        maxHeight: '90%',
    },
    successIconBox: {
        alignItems: 'center',
        marginBottom: 8,
    },
    resultTitle: {
        color: colors.textPrimary,
        fontSize: 20,
        fontWeight: '800',
        textAlign: 'center',
    },
    resultSubtitle: {
        color: colors.textSecondary,
        fontSize: 12.5,
        textAlign: 'center',
        marginTop: 2,
        marginBottom: 16,
    },
    resultMetaCard: {
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
        borderRadius: 14,
        padding: 14,
        gap: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    metaLabel: {
        color: colors.textTertiary,
        fontSize: 12,
        fontWeight: '600',
    },
    metaValue: {
        color: colors.textPrimary,
        fontSize: 12.5,
        fontWeight: '700',
        maxWidth: '65%',
    },
    resultActionsGrid: {
        gap: 10,
        marginBottom: 12,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 13,
        borderRadius: 12,
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
        borderWidth: 1,
        borderColor: colors.border,
    },
    actionBtnPrimary: {
        backgroundColor: '#D4AF37',
        borderColor: '#D4AF37',
    },
    actionBtnCase: {
        backgroundColor: isDark ? 'rgba(212, 175, 55, 0.14)' : 'rgba(212, 175, 55, 0.1)',
        borderColor: 'rgba(212, 175, 55, 0.35)',
    },
    actionBtnText: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: '700',
    },
    actionBtnTextPrimary: {
        color: '#000000',
        fontSize: 14,
        fontWeight: '800',
    },
    actionBtnTextGold: {
        color: '#D4AF37',
        fontSize: 14,
        fontWeight: '800',
    },
    doneBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        paddingVertical: 13,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
        borderWidth: 1,
        borderColor: colors.border,
        marginTop: 6,
    },
    doneBtnText: {
        color: colors.textSecondary,
        fontSize: 13.5,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    casePickerContent: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: modalBottomPadding,
        maxHeight: '85%',
    },
    casePickerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    modalTitle: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: '800',
    },
    typeChipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 12,
    },
    typeChip: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: isDark ? '#141824' : '#F3F4F6',
    },
    typeChipActive: {
        backgroundColor: '#D4AF37',
        borderColor: '#D4AF37',
    },
    typeChipText: {
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: '600',
    },
    typeChipTextActive: {
        color: '#000000',
        fontWeight: '800',
    },
    caseOptionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    caseOptionIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: isDark ? 'rgba(212, 175, 55, 0.12)' : 'rgba(212, 175, 55, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    caseOptionTitle: {
        color: colors.textPrimary,
        fontSize: 13.5,
        fontWeight: '700',
    },
    caseOptionSub: {
        color: colors.textTertiary,
        fontSize: 11,
        marginTop: 2,
    },
    imageCardTouchable: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    thumbEyeOverlay: {
        position: 'absolute',
        top: 2,
        right: 2,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        borderRadius: 4,
        padding: 2,
    },
    previewTagRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3.5,
        marginTop: 2.5,
    },
    previewTagText: {
        color: '#D4AF37',
        fontSize: 10,
        fontWeight: '700',
    },
    previewModalOverlay: {
        flex: 1,
        backgroundColor: '#0B0F19',
    },
    previewSafeArea: {
        flex: 1,
        justifyContent: 'space-between',
    },
    previewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
    },
    previewTitleBlock: {
        flex: 1,
        paddingRight: 10,
    },
    previewPageBadge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(212, 175, 55, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 2.5,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.4)',
        marginBottom: 2,
    },
    previewPageBadgeText: {
        color: '#D4AF37',
        fontSize: 11,
        fontWeight: '800',
    },
    previewFileName: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
    },
    previewCloseBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewImageCanvas: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        paddingHorizontal: 12,
        marginVertical: 10,
    },
    previewLargeImage: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
    },
    navPageBtn: {
        position: 'absolute',
        top: '50%',
        marginTop: -22,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.65)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    navPageBtnLeft: {
        left: 14,
    },
    navPageBtnRight: {
        right: 14,
    },
    navPageBtnDisabled: {
        opacity: 0.3,
    },
    previewToolbar: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 16,
        paddingTop: 12,
    },
    previewSortLabel: {
        color: '#9CA3AF',
        fontSize: 10.5,
        fontWeight: '800',
        letterSpacing: 0.6,
        textAlign: 'center',
        marginBottom: 10,
    },
    previewSortBtnRow: {
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'space-between',
    },
    previewSortBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
    },
    previewSortBtnDisabled: {
        opacity: 0.3,
    },
    previewSortBtnDelete: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    previewSortBtnText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
    },
    previewSortBtnTextDisabled: {
        color: 'rgba(255,255,255,0.3)',
    },
    confirmModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    confirmModalCard: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: colors.surface,
        borderRadius: 22,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
        elevation: 12,
    },
    confirmIconCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)',
    },
    confirmTitle: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -0.2,
    },
    confirmDesc: {
        color: colors.textSecondary,
        fontSize: 13.5,
        lineHeight: 19,
        textAlign: 'center',
        marginBottom: 20,
    },
    confirmActionsRow: {
        flexDirection: 'row',
        gap: 10,
        width: '100%',
    },
    confirmCancelBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
        borderWidth: 1,
        borderColor: colors.border,
    },
    confirmCancelBtnText: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: '700',
    },
    confirmDangerBtn: {
        flex: 1.15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: colors.critical,
        shadowColor: colors.critical,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    confirmDangerBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
    },
});
