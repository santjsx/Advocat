import React, { useState, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    TextInput,
    ActivityIndicator,
    Alert,
    Platform,
    TouchableWithoutFeedback,
    Animated,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { Case } from '../models/Case';
import {
    CourtTier,
    COURT_TIERS,
    PleadingType,
    PLEADING_TYPES,
    PleadingCategory,
    PLEADING_CATEGORIES,
    PaperbookSections,
    IndexTableItem,
    AdvocateProfile,
    PaperbookBundle,
    DEFAULT_ADVOCATE_PROFILE,
} from '../models/Pleading';
import { generatePleadingPaperbook } from '../services/aiPleadingService';
import { buildMadrasHCPaperbookDocx, savePaperbookDocxFile } from '../services/paperbookDocxService';
import { shareDocument } from '../services/documentStorage';
import { useAppStore } from '../store/useAppStore';
import { v4 as uuidv4 } from 'uuid';

interface Props {
    visible: boolean;
    caseData: Case;
    onClose: () => void;
    onSaved?: (docId: string, docxUri: string) => void;
}

type ModalStep = 'CONFIG' | 'GENERATING' | 'REVIEW';
type SectionTab = 'index' | 'synopsis' | 'petition' | 'affidavit' | 'vakalat';

const QUICK_FILTERS: {
    label: string;
    category: PleadingCategory | 'ALL';
    icon: string;
}[] = [
    { label: 'All (75+)', category: 'ALL', icon: 'apps' },
    { label: 'Bail (BNSS)', category: 'CRIMINAL_BAIL', icon: 'scale-balance' },
    { label: 'Quash 528', category: 'CRIMINAL_QUASH', icon: 'lightning-bolt' },
    { label: 'Writs (226)', category: 'HIGH_COURT_WRIT', icon: 'bank' },
    { label: 'Civil Suits', category: 'CIVIL_SUIT_PLAINT', icon: 'file-document-edit-outline' },
    { label: 'Injunction IA', category: 'CIVIL_INTERLOCUTORY_IA', icon: 'shield-alert-outline' },
    { label: 'Sec 138 NI', category: 'COMMERCIAL_NI_ACT', icon: 'credit-card-outline' },
    { label: 'Family & Div', category: 'FAMILY_MATRIMONIAL', icon: 'account-heart-outline' },
    { label: 'MACT Claim', category: 'MACT_CONSUMER', icon: 'car-side' },
];

export const PleadingGeneratorModal: React.FC<Props> = ({
    visible,
    caseData,
    onClose,
    onSaved,
}) => {
    const { colors, spacing, layout, mode } = useTheme();
    const insets = useSafeAreaInsets();
    
    const bottomNavPadding = Math.max(insets?.bottom || 0, Platform.OS === 'android' ? 32 : 16);
    const styles = createStyles(colors, spacing, layout, insets, bottomNavPadding, mode);

    const advocateProfile = useAppStore(state => state.advocateProfile) || DEFAULT_ADVOCATE_PROFILE;
    const addTimelineEvent = useAppStore(state => state.addTimelineEvent);
    const addPaperbookBundle = useAppStore(state => state.addPaperbookBundle);

    const [step, setStep] = useState<ModalStep>('CONFIG');
    const [activeTab, setActiveTab] = useState<SectionTab>('petition');

    const [selectedTier, setSelectedTier] = useState<CourtTier>(
        advocateProfile.defaultCourtTier || 'MADRAS_HC_CHENNAI'
    );
    const [selectedCategory, setSelectedCategory] = useState<PleadingCategory | 'ALL'>('ALL');
    const [selectedPleading, setSelectedPleading] = useState<PleadingType>('BNSS_483_REGULAR_BAIL');
    const [customFacts, setCustomFacts] = useState('');
    const [isFactsFocused, setIsFactsFocused] = useState(false);
    const [prayerNotes, setPrayerNotes] = useState('');
    const [isPrayerFocused, setIsPrayerFocused] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    const [isCourtPickerOpen, setIsCourtPickerOpen] = useState(false);
    const [courtSearchQuery, setCourtSearchQuery] = useState('');
    const [isCourtSearchFocused, setIsCourtSearchFocused] = useState(false);
    const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
    const [isPleadingPickerOpen, setIsPleadingPickerOpen] = useState(false);

    const [progressStatus, setProgressStatus] = useState('Initializing Madras HC Legal Engine...');
    const [currentStepIndex, setCurrentStepIndex] = useState(1);
    const [generatedSections, setGeneratedSections] = useState<PaperbookSections | null>(null);
    const [generatedIndexItems, setGeneratedIndexItems] = useState<IndexTableItem[]>([]);
    const [generatedDocxUri, setGeneratedDocxUri] = useState<string | null>(null);
    const [generatedDocxName, setGeneratedDocxName] = useState<string | null>(null);
    const [generatedFileSize, setGeneratedFileSize] = useState<number>(0);
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    // Modern Animated Toast Notification
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [toastType, setToastType] = useState<'success' | 'info' | 'error'>('success');
    const toastOpacity = useRef(new Animated.Value(0)).current;
    const toastTranslateY = useRef(new Animated.Value(-20)).current;

    const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
        setToastMessage(message);
        setToastType(type);
        toastOpacity.setValue(0);
        toastTranslateY.setValue(-20);

        Animated.parallel([
            Animated.timing(toastOpacity, {
                toValue: 1,
                duration: 220,
                useNativeDriver: true,
            }),
            Animated.spring(toastTranslateY, {
                toValue: 0,
                friction: 7,
                tension: 60,
                useNativeDriver: true,
            }),
        ]).start();

        setTimeout(() => {
            Animated.parallel([
                Animated.timing(toastOpacity, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(toastTranslateY, {
                    toValue: -15,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setToastMessage(null);
            });
        }, 2200);
    };

    const filteredCourtTiers = useMemo(() => {
        if (!courtSearchQuery.trim()) return COURT_TIERS;
        const q = courtSearchQuery.toLowerCase();
        return COURT_TIERS.filter(
            t =>
                t.label.toLowerCase().includes(q) ||
                t.shortName.toLowerCase().includes(q) ||
                t.city.toLowerCase().includes(q) ||
                t.headerTitle.toLowerCase().includes(q)
        );
    }, [courtSearchQuery]);

    const filteredPleadings = useMemo(() => {
        return PLEADING_TYPES.filter(p => {
            const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
            const q = searchQuery.trim().toLowerCase();
            const matchesSearch =
                !q ||
                p.label.toLowerCase().includes(q) ||
                p.statutoryRef.toLowerCase().includes(q) ||
                (p.oldRef && p.oldRef.toLowerCase().includes(q)) ||
                p.description.toLowerCase().includes(q);
            return matchesCategory && matchesSearch;
        });
    }, [selectedCategory, searchQuery]);

    const activePleadingInfo = useMemo(() => {
        return PLEADING_TYPES.find(p => p.value === selectedPleading) || PLEADING_TYPES[0];
    }, [selectedPleading]);

    const activeCourtInfo = useMemo(() => {
        return COURT_TIERS.find(t => t.value === selectedTier) || COURT_TIERS[0];
    }, [selectedTier]);

    const activeCategoryInfo = useMemo(() => {
        if (selectedCategory === 'ALL') return null;
        return PLEADING_CATEGORIES.find(c => c.value === selectedCategory);
    }, [selectedCategory]);

    const formattedBarEnrolment = useMemo(() => {
        const raw = advocateProfile.barEnrolment?.trim();
        if (!raw || raw === 'MS/       /20' || raw === 'MS/       /20  ' || raw === 'MS/' || raw.includes('       ')) {
            return 'Bar Council of TN & PY • Enrolled';
        }
        return raw;
    }, [advocateProfile.barEnrolment]);

    const handleGenerate = async () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setStep('GENERATING');
            setCurrentStepIndex(1);
            setProgressStatus('Verifying BNS/BNSS statutory provisions...');

            setTimeout(() => setCurrentStepIndex(2), 800);

            const aiResult = await generatePleadingPaperbook(
                {
                    caseData,
                    pleadingType: selectedPleading,
                    courtTier: selectedTier,
                    advocateProfile,
                    customFacts: customFacts.trim(),
                    prayerNotes: prayerNotes.trim(),
                },
                (status) => {
                    setProgressStatus(status);
                    if (status.includes('Drafting')) setCurrentStepIndex(2);
                    if (status.includes('Parsing')) setCurrentStepIndex(3);
                }
            );

            setCurrentStepIndex(3);
            setProgressStatus('Compiling Madras High Court .docx document...');

            const docxResult = await buildMadrasHCPaperbookDocx({
                caseData,
                pleadingType: selectedPleading,
                courtTier: selectedTier,
                advocateProfile,
                sections: aiResult.sections,
                indexItems: aiResult.indexItems,
            });

            const saveResult = await savePaperbookDocxFile(docxResult.base64, docxResult.fileName);

            setGeneratedSections(aiResult.sections);
            setGeneratedIndexItems(aiResult.indexItems);
            setGeneratedDocxUri(saveResult.uri);
            setGeneratedDocxName(docxResult.fileName);
            setGeneratedFileSize(saveResult.fileSize);

            setCurrentStepIndex(4);
            setProgressStatus('Ready for Court Filing!');

            setTimeout(() => {
                setStep('REVIEW');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }, 600);
        } catch (error: any) {
            console.error('Pleading generation failed:', error);
            Alert.alert(
                'Generation Error',
                error?.message || 'Failed to generate legal paperbook. Please try again.',
                [{ text: 'OK', onPress: () => setStep('CONFIG') }]
            );
        }
    };

    const handleShareDocx = async () => {
        if (!generatedDocxUri) {
            Alert.alert('Document not ready', 'Please generate the paperbook first.');
            return;
        }
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            await shareDocument(generatedDocxUri, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        } catch (e: any) {
            Alert.alert('Share Error', e?.message || 'Could not share file.');
        }
    };

    const handleSaveToCase = async () => {
        if (!generatedDocxUri || !generatedDocxName) return;

        try {
            setIsSaving(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            const docId = uuidv4();
            const now = new Date().toISOString();

            const bundle: PaperbookBundle = {
                id: uuidv4(),
                caseId: caseData.id,
                pleadingType: selectedPleading,
                courtTier: selectedTier,
                bench: activeCourtInfo.shortName,
                title: `${activePleadingInfo.label} - ${caseData.name}`,
                caseNumber: caseData.caseNumber,
                petitionerName: caseData.client?.name || caseData.clientName || 'Petitioner',
                respondentName: 'State / Respondent',
                sections: generatedSections!,
                indexItems: generatedIndexItems,
                docxUri: generatedDocxUri,
                docxFileName: generatedDocxName,
                fileSize: generatedFileSize,
                generatedAt: now,
                updatedAt: now,
                status: 'SAVED',
            };
            addPaperbookBundle(bundle);

            addTimelineEvent(caseData.id, {
                id: uuidv4(),
                type: 'DOCUMENT_ADDED',
                title: `Paperbook Generated: ${activePleadingInfo.label}`,
                description: `Created 5-document Madras High Court Word bundle (${generatedDocxName})`,
                date: now,
            });

            setIsSaved(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast('Saved to case documents & timeline!', 'success');
            onSaved?.(docId, generatedDocxUri);
        } catch (e: any) {
            showToast(e?.message || 'Could not save document.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCopySection = async () => {
        if (!generatedSections) return;
        let textToCopy = '';
        let sectionName = 'Section';
        switch (activeTab) {
            case 'synopsis': textToCopy = generatedSections.synopsis; sectionName = 'Synopsis'; break;
            case 'petition': textToCopy = generatedSections.petition; sectionName = 'Petition'; break;
            case 'affidavit': textToCopy = generatedSections.affidavit; sectionName = 'Affidavit'; break;
            case 'vakalat': textToCopy = generatedSections.vakalat; sectionName = 'Vakalatnama'; break;
            case 'index':
                textToCopy = generatedIndexItems.map(i => `${i.sNo}. ${i.description} | ${i.date || '—'} | Page: ${i.pageNo} | Fee: ${i.courtFee || '—'}`).join('\n');
                sectionName = 'Index Sheet';
                break;
        }
        if (textToCopy) {
            await Clipboard.setStringAsync(textToCopy);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast(`${sectionName} copied to clipboard!`, 'success');
        }
    };

    return (
        <>
            <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
                <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    {/* Animated Floating Toast */}
                    {toastMessage && (
                        <Animated.View
                            pointerEvents="none"
                            style={[
                                styles.toastContainer,
                                {
                                    opacity: toastOpacity,
                                    transform: [{ translateY: toastTranslateY }],
                                },
                            ]}
                        >
                            <View style={styles.toastCard}>
                                <View
                                    style={[
                                        styles.toastIconCircle,
                                        toastType === 'success' && { backgroundColor: colors.safe + '20' },
                                        toastType === 'error' && { backgroundColor: colors.critical + '20' },
                                        toastType === 'info' && { backgroundColor: colors.accent + '20' },
                                    ]}
                                >
                                    <Ionicons
                                        name={
                                            toastType === 'success'
                                                ? 'checkmark-circle'
                                                : toastType === 'error'
                                                ? 'alert-circle'
                                                : 'information-circle'
                                        }
                                        size={18}
                                        color={
                                            toastType === 'success'
                                                ? colors.safe
                                                : toastType === 'error'
                                                ? colors.critical
                                                : colors.accent
                                        }
                                    />
                                </View>
                                <Text style={styles.toastText}>{toastMessage}</Text>
                            </View>
                        </Animated.View>
                    )}

                    <View style={styles.dragHandleContainer}>
                        <View style={styles.dragHandle} />
                    </View>

                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                            <View style={styles.iconContainer}>
                                <MaterialCommunityIcons name="scale-balance" size={22} color={colors.accent} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.title} numberOfLines={1}>Paperbook Factory</Text>
                                <Text style={styles.subtitle} numberOfLines={1}>
                                    {caseData.name} {caseData.caseNumber ? `• ${caseData.caseNumber}` : ''}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Close modal">
                            <Ionicons name="close" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {step === 'CONFIG' && (
                        <ScrollView style={styles.body} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomNavPadding + 32 }}>
                            <View style={styles.sectionHeaderRow}>
                                <Text style={styles.sectionHeading}>1. TARGET COURT & BENCH</Text>
                                <View style={styles.countPill}>
                                    <Text style={styles.countPillText}>{COURT_TIERS.length} Tiers</Text>
                                </View>
                            </View>

                            <TouchableOpacity style={styles.dropdownCard} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setIsCourtPickerOpen(true); }} activeOpacity={0.7}>
                                <View style={styles.dropdownIconCircle}>
                                    <MaterialCommunityIcons name={activeCourtInfo.isHighCourt ? 'bank' : 'gavel'} size={20} color={colors.accent} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.dropdownSubLabel}>Target Court</Text>
                                    <Text style={styles.dropdownMainText} numberOfLines={1}>{activeCourtInfo.label}</Text>
                                    <Text style={styles.dropdownCityText}>{activeCourtInfo.city} • {activeCourtInfo.isHighCourt ? 'High Court' : 'District Judiciary'}</Text>
                                </View>
                                <View style={styles.dropdownArrowBox}>
                                    <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                                </View>
                            </TouchableOpacity>

                            <View style={[styles.sectionHeaderRow, { marginTop: spacing.m }]}>
                                <Text style={styles.sectionHeading}>2. PRACTICE AREA CATEGORY</Text>
                                <View style={[styles.countPill, { backgroundColor: colors.primary + '20' }]}>
                                    <Text style={[styles.countPillText, { color: colors.primary }]}>{PLEADING_CATEGORIES.length} Categories</Text>
                                </View>
                            </View>

                            <TouchableOpacity style={styles.dropdownCard} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setIsCategoryPickerOpen(true); }} activeOpacity={0.7}>
                                <View style={[styles.dropdownIconCircle, { backgroundColor: colors.primary + '20' }]}>
                                    <MaterialCommunityIcons name={(activeCategoryInfo?.icon as any) || 'folder-multiple-outline'} size={20} color={colors.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.dropdownSubLabel}>Practice Area Filter</Text>
                                    <Text style={styles.dropdownMainText} numberOfLines={1}>
                                        {selectedCategory === 'ALL' ? 'All Categories (75+ Legal Filings)' : activeCategoryInfo?.label}
                                    </Text>
                                    <Text style={styles.dropdownCityText} numberOfLines={1}>
                                        {selectedCategory === 'ALL' ? 'Searching across Criminal, Civil, Writs, Family, Commercial & MACT' : activeCategoryInfo?.description}
                                    </Text>
                                </View>
                                <View style={styles.dropdownArrowBox}>
                                    <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                                </View>
                            </TouchableOpacity>

                            <View style={[styles.sectionHeaderRow, { marginTop: spacing.m }]}>
                                <Text style={styles.sectionHeading}>3. SELECT PLEADING DOCUMENT</Text>
                                <View style={[styles.countPill, { backgroundColor: colors.accent + '20' }]}>
                                    <Text style={[styles.countPillText, { color: colors.accent }]}>
                                        {PLEADING_TYPES.length} Templates
                                    </Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={styles.dropdownCard}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setIsPleadingPickerOpen(true);
                                }}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.dropdownIconCircle, { backgroundColor: colors.accent + '20' }]}>
                                    <MaterialCommunityIcons name="file-document-edit-outline" size={20} color={colors.accent} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.dropdownSubLabel}>Pleading Template</Text>
                                    <Text style={styles.dropdownMainText} numberOfLines={1}>
                                        {activePleadingInfo.label}
                                    </Text>
                                    <Text style={styles.dropdownCityText} numberOfLines={1}>
                                        {activePleadingInfo.statutoryRef}{activePleadingInfo.oldRef ? ` • Formerly ${activePleadingInfo.oldRef}` : ''}
                                    </Text>
                                </View>
                                <View style={styles.dropdownArrowBox}>
                                    <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                                </View>
                            </TouchableOpacity>

                            <View style={[styles.selectedPleadingCallout, { marginTop: spacing.s }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Ionicons name="checkmark-circle" size={18} color={colors.safe} />
                                        <Text style={styles.calloutHeading}>Active Selection</Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setIsPleadingPickerOpen(true);
                                        }}
                                        style={styles.activePleadingTag}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.activePleadingTagText}>Change Template ▾</Text>
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.calloutTitle}>{activePleadingInfo.label}</Text>
                                <View style={styles.badgeRow}>
                                    <View style={styles.statutoryBadge}>
                                        <Text style={styles.statutoryText}>{activePleadingInfo.statutoryRef}</Text>
                                    </View>
                                    {activePleadingInfo.oldRef && (
                                        <View style={styles.oldRefBadge}>
                                            <Text style={styles.oldRefBadgeText}>{activePleadingInfo.oldRef}</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={styles.calloutDesc}>{activePleadingInfo.description}</Text>
                            </View>

                            {/* SECTION 4: CASE FACTS & GROUNDS */}
                            <View style={[styles.sectionHeaderRow, { marginTop: spacing.m }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <MaterialCommunityIcons name="text-box-search-outline" size={15} color={colors.accent} />
                                    <Text style={styles.sectionHeading}>4. CUSTOM CASE FACTS & GROUNDS</Text>
                                </View>
                                <View style={styles.optionalPill}>
                                    <Text style={styles.optionalPillText}>Optional</Text>
                                </View>
                            </View>

                            <View style={[styles.inputBoxContainer, isFactsFocused && styles.inputBoxFocused]}>
                                <TextInput
                                    style={styles.textAreaPro}
                                    placeholder="E.g., Accused falsely implicated in property dispute; medical ground of acute cardiac ailment; no overt act in FIR..."
                                    placeholderTextColor={colors.textTertiary}
                                    value={customFacts}
                                    onChangeText={setCustomFacts}
                                    onFocus={() => setIsFactsFocused(true)}
                                    onBlur={() => setIsFactsFocused(false)}
                                    multiline
                                    numberOfLines={3}
                                />
                                {customFacts.length > 0 && (
                                    <TouchableOpacity
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setCustomFacts('');
                                        }}
                                        style={styles.inputClearBtn}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                        <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Quick Prompt Suggestions */}
                            <View style={styles.quickPromptRow}>
                                {[
                                    { label: 'Medical Grounds', snippet: 'Petitioner suffers from serious medical condition requiring continuous specialized treatment; ' },
                                    { label: 'False Implication', snippet: 'Petitioner is falsely implicated due to prior civil enmity and property dispute; ' },
                                    { label: 'No Overt Act', snippet: 'No specific overt act or role is attributed to the petitioner in the FIR/complaint; ' },
                                ].map(prompt => (
                                    <TouchableOpacity
                                        key={prompt.label}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setCustomFacts(prev => (prev ? prev.trim() + ' ' + prompt.snippet : prompt.snippet));
                                        }}
                                        style={styles.quickPromptChip}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="add-circle-outline" size={12} color={colors.accent} />
                                        <Text style={styles.quickPromptText}>{prompt.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* SECTION 5: SPECIFIC PRAYER / RELIEF */}
                            <View style={[styles.sectionHeaderRow, { marginTop: spacing.s }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <MaterialCommunityIcons name="gavel" size={15} color={colors.accent} />
                                    <Text style={styles.sectionHeading}>5. SPECIFIC PRAYER / RELIEF</Text>
                                </View>
                                <View style={styles.optionalPill}>
                                    <Text style={styles.optionalPillText}>Optional</Text>
                                </View>
                            </View>

                            <View style={[styles.inputBoxContainer, isPrayerFocused && styles.inputBoxFocused]}>
                                <TextInput
                                    style={styles.textAreaPro}
                                    placeholder="E.g., Grant interim bail for 4 weeks for medical treatment; or direct completion of investigation within 2 months..."
                                    placeholderTextColor={colors.textTertiary}
                                    value={prayerNotes}
                                    onChangeText={setPrayerNotes}
                                    onFocus={() => setIsPrayerFocused(true)}
                                    onBlur={() => setIsPrayerFocused(false)}
                                    multiline
                                    numberOfLines={2}
                                />
                                {prayerNotes.length > 0 && (
                                    <TouchableOpacity
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setPrayerNotes('');
                                        }}
                                        style={styles.inputClearBtn}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                        <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Quick Prayer Suggestions */}
                            <View style={styles.quickPromptRow}>
                                {[
                                    { label: 'Interim Bail', snippet: 'Grant interim bail pending disposal of the main application; ' },
                                    { label: 'Stay Proceedings', snippet: 'Stay all further proceedings and coercive steps pending final hearing; ' },
                                    { label: 'Expedite Trial', snippet: 'Direct trial court to complete proceedings within a stipulated time frame; ' },
                                ].map(prompt => (
                                    <TouchableOpacity
                                        key={prompt.label}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setPrayerNotes(prev => (prev ? prev.trim() + ' ' + prompt.snippet : prompt.snippet));
                                        }}
                                        style={styles.quickPromptChip}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="add-circle-outline" size={12} color={colors.accent} />
                                        <Text style={styles.quickPromptText}>{prompt.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* ADVOCATE VERIFIED FILING PROFILE */}
                            <View style={styles.advocateCardPro}>
                                <View style={styles.advocateIconBadge}>
                                    <MaterialCommunityIcons name="shield-account" size={22} color={colors.accent} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <View style={styles.advocateHeaderLine}>
                                        <Text style={styles.advocateBadgeTag}>FILING COUNSEL ON RECORD</Text>
                                        <View style={styles.verifiedBadge}>
                                            <Ionicons name="checkmark-circle" size={13} color={colors.safe} />
                                            <Text style={styles.verifiedBadgeText}>Bar Verified</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.advocateNameText}>
                                        Advocate {advocateProfile.name || 'Counsel'}
                                    </Text>
                                    <View style={styles.advocateMetaRow}>
                                        <MaterialCommunityIcons name="certificate-outline" size={13} color={colors.accent} />
                                        <Text style={styles.advocateEnrolmentText}>
                                            {formattedBarEnrolment}
                                        </Text>
                                    </View>
                                    <View style={styles.advocateMetaRow}>
                                        <Ionicons name="location-outline" size={13} color={colors.textTertiary} />
                                        <Text style={styles.advocateAddressText} numberOfLines={1}>
                                            {advocateProfile.chamberAddress || 'High Court Buildings, Chennai'}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </ScrollView>
                    )}

                    {step === 'GENERATING' && (
                        <View style={styles.generatingContainer}>
                            <View style={styles.engineBadge}>
                                <MaterialCommunityIcons name="scale-balance" size={14} color={colors.accent} />
                                <Text style={styles.engineBadgeText}>MADRAS HIGH COURT COMPILER</Text>
                            </View>
                            <View style={styles.orbContainer}>
                                <LinearGradient colors={[colors.primary + '40', colors.accent + '25']} style={styles.outerGlowOrb}>
                                    <View style={styles.innerGlowOrb}>
                                        <ActivityIndicator size="large" color={colors.accent} />
                                    </View>
                                </LinearGradient>
                            </View>
                            <Text style={styles.generatingTitle}>Compiling Legal Paperbook</Text>
                            <View style={styles.statusLivePill}>
                                <View style={styles.statusLiveDot} />
                                <Text style={styles.generatingSubtitle} numberOfLines={1}>{progressStatus}</Text>
                            </View>
                            <View style={styles.progressBarWrapper}>
                                <View style={styles.progressBarTrack}>
                                    <LinearGradient colors={[colors.primary, colors.accent]} style={[styles.progressBarFill, { width: `${Math.min(100, (currentStepIndex / 4) * 100)}%` }]} />
                                </View>
                                <Text style={styles.progressBarPercent}>{Math.round((currentStepIndex / 4) * 100)}%</Text>
                            </View>
                            <View style={styles.progressSteps}>
                                {[
                                    { step: 1, label: 'Statutory Verification (BNS/BNSS/CPC)', desc: 'Validating procedural rules, court tier & jurisdiction' },
                                    { step: 2, label: 'Drafting 5-Document Stack', desc: 'Index, Synopsis, Petition, Affidavit & Vakalatnama' },
                                    { step: 3, label: 'Madras HC DOCX Compilation', desc: 'Court margins (1.75" left), line spacing & font styles' },
                                    { step: 4, label: 'Ready for Court Filing', desc: 'Finalized offline Word bundle with index tables' },
                                ].map(s => {
                                    const isDone = currentStepIndex > s.step;
                                    const isCurrent = currentStepIndex === s.step;
                                    return (
                                        <View key={s.step} style={[styles.stepCard, isCurrent && styles.stepCardActive, isDone && styles.stepCardDone]}>
                                            <View style={[styles.stepCircle, isCurrent && styles.stepCircleActive, isDone && styles.stepCircleCompleted]}>
                                                {isDone ? <Ionicons name="checkmark" size={14} color="white" /> : isCurrent ? <ActivityIndicator size="small" color={colors.accent} /> : <Text style={styles.stepNumber}>{s.step}</Text>}
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.stepLabel, isCurrent && styles.stepLabelActive, isDone && styles.stepLabelDone]}>{s.label}</Text>
                                                <Text style={styles.stepDesc} numberOfLines={1}>{s.desc}</Text>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>

                            <View style={styles.privacyBadge}>
                                <MaterialCommunityIcons name="shield-lock-outline" size={14} color={colors.safe} />
                                <Text style={styles.privacyBadgeText}>100% On-Device & Private Local Processing</Text>
                            </View>
                        </View>
                    )}

                    {/* STEP 3: REVIEW & EXPORT */}
                    {step === 'REVIEW' && generatedSections && (
                        <View style={{ flex: 1 }}>
                            {/* Document Tabs */}
                            <View style={styles.docTabBar}>
                                {[
                                    { tab: 'petition' as SectionTab, label: 'Petition', icon: 'file-document' },
                                    { tab: 'affidavit' as SectionTab, label: 'Affidavit', icon: 'certificate' },
                                    { tab: 'synopsis' as SectionTab, label: 'Synopsis', icon: 'clock-outline' },
                                    { tab: 'index' as SectionTab, label: 'Index', icon: 'format-list-numbered' },
                                    { tab: 'vakalat' as SectionTab, label: 'Vakalat', icon: 'feather' },
                                ].map(t => (
                                    <TouchableOpacity
                                        key={t.tab}
                                        onPress={() => setActiveTab(t.tab)}
                                        style={[
                                            styles.docTab,
                                            activeTab === t.tab && styles.docTabActive,
                                        ]}
                                    >
                                        <MaterialCommunityIcons
                                            name={t.icon as any}
                                            size={16}
                                            color={activeTab === t.tab ? colors.accent : colors.textTertiary}
                                        />
                                        <Text
                                            style={[
                                                styles.docTabText,
                                                activeTab === t.tab && styles.docTabTextActive,
                                            ]}
                                        >
                                            {t.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Section Preview Box */}
                            <ScrollView
                                style={styles.previewContainer}
                                showsVerticalScrollIndicator={true}
                                contentContainerStyle={{ paddingBottom: 24 }}
                            >
                                <View style={styles.paperSheet}>
                                    <View style={styles.courtBadgeHeader}>
                                        <Text style={styles.courtBadgeText}>
                                            {activeCourtInfo.headerTitle.split('\n')[0]}
                                        </Text>
                                    </View>

                                    {activeTab === 'index' && (
                                        <View>
                                            <Text style={styles.paperHeading}>CHRONOLOGICAL INDEX / MEMO OF FILING</Text>
                                            <View style={styles.indexTablePreview}>
                                                <View style={[styles.indexTableRow, styles.indexTableHeader]}>
                                                    <Text style={[styles.indexTableCell, { flex: 0.6, fontWeight: 'bold' }]}>S.No</Text>
                                                    <Text style={[styles.indexTableCell, { flex: 2.5, fontWeight: 'bold' }]}>Document Description</Text>
                                                    <Text style={[styles.indexTableCell, { flex: 1, fontWeight: 'bold' }]}>Date</Text>
                                                    <Text style={[styles.indexTableCell, { flex: 0.8, fontWeight: 'bold' }]}>Page</Text>
                                                    <Text style={[styles.indexTableCell, { flex: 0.8, fontWeight: 'bold' }]}>Fee</Text>
                                                </View>
                                                {generatedIndexItems.map(item => (
                                                    <View key={item.sNo} style={styles.indexTableRow}>
                                                        <Text style={[styles.indexTableCell, { flex: 0.6 }]}>{item.sNo}</Text>
                                                        <Text style={[styles.indexTableCell, { flex: 2.5 }]}>{item.description}</Text>
                                                        <Text style={[styles.indexTableCell, { flex: 1 }]}>{item.date || '—'}</Text>
                                                        <Text style={[styles.indexTableCell, { flex: 0.8, fontWeight: 'bold', color: colors.accent }]}>
                                                            {item.pageNo}
                                                        </Text>
                                                        <Text style={[styles.indexTableCell, { flex: 0.8 }]}>{item.courtFee || '—'}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </View>
                                    )}

                                    {activeTab === 'synopsis' && (
                                        <Text style={styles.legalBodyText}>{generatedSections.synopsis}</Text>
                                    )}

                                    {activeTab === 'petition' && (
                                        <Text style={styles.legalBodyText}>{generatedSections.petition}</Text>
                                    )}

                                    {activeTab === 'affidavit' && (
                                        <Text style={styles.legalBodyText}>{generatedSections.affidavit}</Text>
                                    )}

                                    {activeTab === 'vakalat' && (
                                        <Text style={styles.legalBodyText}>{generatedSections.vakalat}</Text>
                                    )}
                                </View>
                            </ScrollView>

                            {/* Export / Share Actions Bar */}
                            <View style={styles.actionBar}>
                                <TouchableOpacity
                                    style={styles.actionBtnOutline}
                                    onPress={handleCopySection}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="copy-outline" size={17} color={colors.textPrimary} />
                                    <Text style={styles.actionBtnTextOutline}>Copy</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.actionBtnOutline, isSaved && { borderColor: colors.safe, backgroundColor: colors.safe + '15' }]}
                                    onPress={handleSaveToCase}
                                    disabled={isSaving || isSaved}
                                    activeOpacity={0.7}
                                >
                                    {isSaving ? (
                                        <ActivityIndicator size="small" color={colors.accent} />
                                    ) : (
                                        <>
                                            <Ionicons
                                                name={isSaved ? 'checkmark-circle' : 'bookmark-outline'}
                                                size={17}
                                                color={isSaved ? colors.safe : colors.textPrimary}
                                            />
                                            <Text style={[styles.actionBtnTextOutline, isSaved && { color: colors.safe, fontWeight: '700' }]}>
                                                {isSaved ? 'Saved' : 'Save to Case'}
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.actionBtnPrimary}
                                    onPress={handleShareDocx}
                                    activeOpacity={0.85}
                                >
                                    <LinearGradient
                                        colors={[colors.accent, colors.primary]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.actionGradient}
                                    >
                                        <Ionicons name="share-social" size={17} color="white" />
                                        <Text style={styles.actionBtnTextPrimary}>Share .docx</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Footer Actions for CONFIG step */}
                    {step === 'CONFIG' && (
                        <View style={styles.footer}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={onClose}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="close-circle-outline" size={18} color={colors.textSecondary} />
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.generateBtn}
                                onPress={handleGenerate}
                                activeOpacity={0.85}
                            >
                                <LinearGradient
                                    colors={[colors.accent, colors.primary]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.generateGradient}
                                >
                                    <View style={styles.generateIconBadge}>
                                        <MaterialCommunityIcons name="lightning-bolt" size={16} color="white" />
                                    </View>
                                    <Text style={styles.generateBtnText}>Generate Paperbook</Text>
                                    <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.8)" style={{ marginLeft: 2 }} />
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        </Modal>

        {/* Sub-Modal: Searchable Court Tier Picker with 3-Button Nav Protection */}
        <Modal visible={isCourtPickerOpen} animationType="slide" transparent onRequestClose={() => setIsCourtPickerOpen(false)}>
                <View style={styles.subModalOverlay}>
                    <View style={styles.subModalContent}>
                        {/* Drag handle */}
                        <View style={styles.dragHandleContainer}>
                            <View style={styles.dragHandle} />
                        </View>

                        <View style={styles.subModalHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <View style={styles.subModalIconBox}>
                                    <MaterialCommunityIcons name="bank" size={18} color={colors.accent} />
                                </View>
                                <View>
                                    <Text style={styles.subModalTitle}>Select Target Court & Bench</Text>
                                    <Text style={styles.subModalSubtitle}>Tamil Nadu & Puducherry Jurisdiction</Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                onPress={() => setIsCourtPickerOpen(false)}
                                style={styles.closeBtn}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Ionicons name="close" size={18} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Search in courts */}
                        <View style={[
                            styles.searchBarContainer,
                            { marginHorizontal: spacing.m, marginBottom: spacing.s },
                            isCourtSearchFocused && styles.searchBarFocused,
                        ]}>
                            <View style={styles.searchIconBadge}>
                                <Ionicons name="search" size={15} color={colors.accent} />
                            </View>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search by name, bench or district (Chennai, Madurai...)"
                                placeholderTextColor={colors.textTertiary}
                                value={courtSearchQuery}
                                onChangeText={setCourtSearchQuery}
                                onFocus={() => setIsCourtSearchFocused(true)}
                                onBlur={() => setIsCourtSearchFocused(false)}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            {courtSearchQuery.length > 0 && (
                                <TouchableOpacity
                                    onPress={() => setCourtSearchQuery('')}
                                    style={styles.searchClearBtn}
                                >
                                    <Ionicons name="close" size={14} color={colors.textPrimary} />
                                </TouchableOpacity>
                            )}
                        </View>

                        <ScrollView
                            style={{ flex: 1, paddingHorizontal: spacing.m }}
                            contentContainerStyle={{ paddingBottom: bottomNavPadding + 32 }}
                            showsVerticalScrollIndicator={true}
                        >
                            {filteredCourtTiers.map(tier => {
                                const isSelected = selectedTier === tier.value;
                                return (
                                    <TouchableOpacity
                                        key={tier.value}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setSelectedTier(tier.value);
                                            setIsCourtPickerOpen(false);
                                        }}
                                        style={[
                                            styles.pickerRowItem,
                                            isSelected && styles.pickerRowItemActive,
                                        ]}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.dropdownIconCircle, isSelected && { backgroundColor: colors.accent + '25' }]}>
                                            <MaterialCommunityIcons
                                                name={tier.isHighCourt ? 'bank' : 'gavel'}
                                                size={18}
                                                color={isSelected ? colors.accent : colors.textSecondary}
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.pickerItemLabel, isSelected && { color: colors.accent, fontWeight: '700' }]}>
                                                {tier.label}
                                            </Text>
                                            <Text style={styles.pickerItemSubtext}>
                                                {tier.city} • {tier.isHighCourt ? 'High Court' : 'District Judiciary'}
                                            </Text>
                                        </View>
                                        {isSelected && (
                                            <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Sub-Modal: Searchable Category Picker with 3-Button Nav Protection */}
            <Modal visible={isCategoryPickerOpen} animationType="slide" transparent onRequestClose={() => setIsCategoryPickerOpen(false)}>
                <View style={styles.subModalOverlay}>
                    <View style={styles.subModalContent}>
                        {/* Drag handle */}
                        <View style={styles.dragHandleContainer}>
                            <View style={styles.dragHandle} />
                        </View>

                        <View style={styles.subModalHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <View style={[styles.subModalIconBox, { backgroundColor: colors.primary + '20' }]}>
                                    <MaterialCommunityIcons name="folder-multiple" size={18} color={colors.primary} />
                                </View>
                                <View>
                                    <Text style={styles.subModalTitle}>Select Practice Category</Text>
                                    <Text style={styles.subModalSubtitle}>Filter 75+ Indian Court Document Types</Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                onPress={() => setIsCategoryPickerOpen(false)}
                                style={styles.closeBtn}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Ionicons name="close" size={18} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={{ flex: 1, paddingHorizontal: spacing.m }}
                            contentContainerStyle={{ paddingBottom: bottomNavPadding + 32 }}
                            showsVerticalScrollIndicator={true}
                        >
                            {/* All Categories option */}
                            <TouchableOpacity
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setSelectedCategory('ALL');
                                    setIsCategoryPickerOpen(false);
                                }}
                                style={[
                                    styles.pickerRowItem,
                                    selectedCategory === 'ALL' && styles.pickerRowItemActive,
                                ]}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.dropdownIconCircle, selectedCategory === 'ALL' && { backgroundColor: colors.accent + '25' }]}>
                                    <MaterialCommunityIcons
                                        name="apps"
                                        size={18}
                                        color={selectedCategory === 'ALL' ? colors.accent : colors.textSecondary}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.pickerItemLabel, selectedCategory === 'ALL' && { color: colors.accent, fontWeight: '700' }]}>
                                        All Categories (All 75+ Legal Filings)
                                    </Text>
                                    <Text style={styles.pickerItemSubtext}>
                                        Search across Criminal, Civil, Writs, Family, Commercial, MACT & Notices
                                    </Text>
                                </View>
                                {selectedCategory === 'ALL' && (
                                    <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                                )}
                            </TouchableOpacity>

                            {PLEADING_CATEGORIES.map(cat => {
                                const isSelected = selectedCategory === cat.value;
                                return (
                                    <TouchableOpacity
                                        key={cat.value}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setSelectedCategory(cat.value);
                                            setIsCategoryPickerOpen(false);
                                        }}
                                        style={[
                                            styles.pickerRowItem,
                                            isSelected && styles.pickerRowItemActive,
                                        ]}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.dropdownIconCircle, isSelected && { backgroundColor: colors.primary + '25' }]}>
                                            <MaterialCommunityIcons
                                                name={cat.icon as any}
                                                size={18}
                                                color={isSelected ? colors.primary : colors.textSecondary}
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.pickerItemLabel, isSelected && { color: colors.primary, fontWeight: '700' }]}>
                                                {cat.label}
                                            </Text>
                                            <Text style={styles.pickerItemSubtext}>
                                                {cat.description}
                                            </Text>
                                        </View>
                                        {isSelected && (
                                            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Sub-Modal: Searchable 75+ Pleading Document Picker */}
            <Modal
                visible={isPleadingPickerOpen}
                animationType="slide"
                transparent
                onRequestClose={() => setIsPleadingPickerOpen(false)}
            >
                <View style={styles.subModalOverlay}>
                    <View style={[styles.subModalContent, { height: '88%' }]}>
                        {/* Drag Handle */}
                        <View style={styles.dragHandleContainer}>
                            <View style={styles.dragHandle} />
                        </View>

                        {/* Header */}
                        <View style={styles.subModalHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <View style={styles.subModalIconBox}>
                                    <MaterialCommunityIcons name="file-document-multiple-outline" size={18} color={colors.accent} />
                                </View>
                                <View>
                                    <Text style={styles.subModalTitle}>Select Pleading Document</Text>
                                    <Text style={styles.subModalSubtitle}>
                                        {filteredPleadings.length} of {PLEADING_TYPES.length} Indian Court Templates
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                onPress={() => setIsPleadingPickerOpen(false)}
                                style={styles.closeBtn}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Ionicons name="close" size={18} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Sub-modal Body with Search and Category Dropdown Filter */}
                        <View style={{ flex: 1, paddingHorizontal: spacing.m }}>
                            {/* Search Bar */}
                            <View style={[styles.searchBarContainer, isSearchFocused && styles.searchBarFocused, { marginTop: spacing.s }]}>
                                <View style={styles.searchIconBadge}>
                                    <Ionicons name="search" size={16} color={colors.accent} />
                                </View>
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search section (482, 138), name (Bail, Injunction)..."
                                    placeholderTextColor={colors.textTertiary}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    onFocus={() => setIsSearchFocused(true)}
                                    onBlur={() => setIsSearchFocused(false)}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    returnKeyType="search"
                                />
                                {searchQuery.length > 0 && (
                                    <TouchableOpacity
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setSearchQuery('');
                                        }}
                                        style={styles.searchClearBtn}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                        <Ionicons name="close" size={14} color={colors.textPrimary} />
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Filter by Category Dropdown Row */}
                            <TouchableOpacity
                                style={styles.filterCategoryDropdownRow}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setIsCategoryPickerOpen(true);
                                }}
                                activeOpacity={0.7}
                            >
                                <MaterialCommunityIcons name="filter-variant" size={16} color={colors.accent} />
                                <Text style={styles.filterCategoryText} numberOfLines={1}>
                                    Practice Area: <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{selectedCategory === 'ALL' ? 'All Categories (75+ Filings)' : activeCategoryInfo?.label}</Text>
                                </Text>
                                <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
                            </TouchableOpacity>

                            {/* Scrollable list of filtered pleadings */}
                            <ScrollView
                                style={{ flex: 1 }}
                                contentContainerStyle={{ paddingBottom: bottomNavPadding + 32 }}
                                showsVerticalScrollIndicator={true}
                            >
                                {filteredPleadings.map(pleading => {
                                    const isSelected = selectedPleading === pleading.value;
                                    return (
                                        <TouchableOpacity
                                            key={pleading.value}
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                setSelectedPleading(pleading.value);
                                                setIsPleadingPickerOpen(false);
                                            }}
                                            style={[
                                                styles.pickerRowItem,
                                                isSelected && styles.pickerRowItemActive,
                                            ]}
                                            activeOpacity={0.7}
                                        >
                                            <View style={{ flex: 1 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                    <Text style={[styles.pickerItemLabel, isSelected && { color: colors.accent, fontWeight: '700' }]}>
                                                        {pleading.label}
                                                    </Text>
                                                    <View style={styles.statutoryBadge}>
                                                        <Text style={styles.statutoryText}>{pleading.statutoryRef}</Text>
                                                    </View>
                                                </View>
                                                <Text style={styles.pickerItemSubtext} numberOfLines={2}>
                                                    {pleading.description}
                                                </Text>
                                                {pleading.oldRef && (
                                                    <Text style={styles.oldRefText}>Replaces: {pleading.oldRef}</Text>
                                                )}
                                            </View>
                                            <Ionicons
                                                name={isSelected ? 'checkmark-circle' : 'radio-button-off'}
                                                size={20}
                                                color={isSelected ? colors.accent : colors.textTertiary}
                                            />
                                        </TouchableOpacity>
                                    );
                                })}

                                {filteredPleadings.length === 0 && (
                                    <View style={styles.emptySearchBox}>
                                        <Ionicons name="search-outline" size={36} color={colors.accent} />
                                        <Text style={styles.emptySearchText}>No matching pleadings found</Text>
                                        <Text style={styles.emptySearchSubtext}>
                                            No legal documents matched "{searchQuery}". Try searching with section (482, 138, Order 39) or switch category.
                                        </Text>
                                        <TouchableOpacity
                                            style={styles.emptyResetBtn}
                                            onPress={() => {
                                                setSearchQuery('');
                                                setSelectedCategory('ALL');
                                            }}
                                        >
                                            <Text style={styles.emptyResetText}>Reset Filters & Search All 75+</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </ScrollView>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
};

const createStyles = (
    colors: any,
    spacing: any,
    layout: any,
    insets: any,
    bottomNavPadding: number,
    mode: string
) =>
    StyleSheet.create({
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.75)',
            justifyContent: 'flex-end',
        },
        modalContent: {
            backgroundColor: colors.surface,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            height: '95%',
            paddingHorizontal: spacing.m,
            paddingTop: spacing.xs,
            paddingBottom: 0,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -6 },
            shadowOpacity: 0.35,
            shadowRadius: 18,
            elevation: 24,
            borderTopWidth: 1,
            borderColor: colors.border + '60',
            overflow: 'hidden',
        },
        toastContainer: {
            position: 'absolute',
            top: 14,
            left: 16,
            right: 16,
            zIndex: 9999,
            alignItems: 'center',
            justifyContent: 'center',
        },
        toastCard: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 24,
            backgroundColor: colors.surface,
            borderWidth: 1.5,
            borderColor: colors.accent + '70',
            shadowColor: colors.accent,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 10,
            elevation: 12,
        },
        toastIconCircle: {
            width: 26,
            height: 26,
            borderRadius: 13,
            alignItems: 'center',
            justifyContent: 'center',
        },
        toastText: {
            color: colors.textPrimary,
            fontSize: 13,
            fontWeight: '700',
        },
        dragHandleContainer: {
            alignItems: 'center',
            paddingVertical: 8,
        },
        dragHandle: {
            width: 36,
            height: 4,
            borderRadius: 2,
            backgroundColor: colors.border,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: spacing.m,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.border + '60',
        },
        iconContainer: {
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: colors.accent + '20',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.accent + '30',
        },
        title: {
            color: colors.textPrimary,
            fontSize: 18,
            fontWeight: '700',
            letterSpacing: 0.2,
        },
        subtitle: {
            color: colors.textSecondary,
            fontSize: 12,
            marginTop: 2,
        },
        closeBtn: {
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: colors.surfaceHighlight,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.border + '40',
        },
        body: {
            flex: 1,
            paddingTop: spacing.m,
        },
        sectionHeaderRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: spacing.s,
        },
        sectionHeading: {
            color: colors.textSecondary,
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 1.1,
            textTransform: 'uppercase',
        },
        countPill: {
            backgroundColor: colors.accent + '20',
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 8,
        },
        countPillText: {
            color: colors.accent,
            fontSize: 10,
            fontWeight: '700',
        },
        dropdownCard: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            padding: 12,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceHighlight,
        },
        dropdownIconCircle: {
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: colors.accent + '15',
            alignItems: 'center',
            justifyContent: 'center',
        },
        dropdownSubLabel: {
            color: colors.textTertiary,
            fontSize: 10,
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
        },
        dropdownMainText: {
            color: colors.textPrimary,
            fontSize: 14,
            fontWeight: '700',
            marginTop: 1,
        },
        dropdownCityText: {
            color: colors.textSecondary,
            fontSize: 11,
            marginTop: 2,
        },
        dropdownArrowBox: {
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: colors.background + '80',
            alignItems: 'center',
            justifyContent: 'center',
        },
        searchBarContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 10,
            paddingVertical: Platform.OS === 'ios' ? 8 : 4,
            borderRadius: 14,
            backgroundColor: colors.surfaceHighlight,
            borderWidth: 1.5,
            borderColor: colors.border,
            marginBottom: spacing.s,
            minHeight: 48,
        },
        searchBarFocused: {
            borderColor: colors.accent,
            backgroundColor: colors.surfaceHighlight,
            shadowColor: colors.accent,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.2,
            shadowRadius: 6,
            elevation: 4,
        },
        searchIconBadge: {
            width: 28,
            height: 28,
            borderRadius: 8,
            backgroundColor: colors.accent + '15',
            alignItems: 'center',
            justifyContent: 'center',
        },
        searchInput: {
            flex: 1,
            color: colors.textPrimary,
            fontSize: 13,
            paddingVertical: 4,
            paddingHorizontal: 2,
        },
        searchClearBtn: {
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.border,
        },
        quickFilterBar: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingTop: 2,
            paddingBottom: spacing.s,
            paddingRight: spacing.m,
        },
        quickFilterChip: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: 12,
            backgroundColor: colors.surfaceHighlight,
            borderWidth: 1.5,
            borderColor: colors.border,
            minHeight: 36,
        },
        quickFilterChipActive: {
            backgroundColor: colors.accent + '18',
            borderColor: colors.accent,
            shadowColor: colors.accent,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 3,
        },
        quickFilterText: {
            color: colors.textSecondary,
            fontSize: 12,
            fontWeight: '600',
            letterSpacing: 0.1,
        },
        quickFilterTextActive: {
            color: colors.accent,
            fontWeight: '700',
        },
        quickFilterActiveDot: {
            width: 5,
            height: 5,
            borderRadius: 2.5,
            backgroundColor: colors.accent,
            marginLeft: 2,
        },
        selectedPleadingCallout: {
            padding: 14,
            borderRadius: 16,
            backgroundColor: colors.accent + '12',
            borderWidth: 1.5,
            borderColor: colors.accent + '40',
            marginBottom: spacing.m,
        },
        calloutHeading: {
            color: colors.safe,
            fontSize: 11,
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
        },
        activePleadingTag: {
            backgroundColor: colors.safe + '20',
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 8,
        },
        activePleadingTagText: {
            color: colors.safe,
            fontSize: 10,
            fontWeight: '700',
        },
        calloutTitle: {
            color: colors.textPrimary,
            fontSize: 15,
            fontWeight: '700',
            marginTop: 4,
        },
        badgeRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginTop: 6,
            flexWrap: 'wrap',
        },
        calloutDesc: {
            color: colors.textSecondary,
            fontSize: 12,
            lineHeight: 17,
            marginTop: 6,
        },
        pleadingCard: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 12,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceHighlight,
            minHeight: 56,
        },
        pleadingCardActive: {
            borderColor: colors.accent,
            backgroundColor: colors.accent + '12',
            borderWidth: 1.5,
        },
        pleadingTitle: {
            color: colors.textPrimary,
            fontSize: 14,
            fontWeight: '600',
        },
        statutoryBadge: {
            backgroundColor: colors.primary + '20',
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 6,
        },
        statutoryText: {
            color: colors.primary,
            fontSize: 11,
            fontWeight: '700',
        },
        oldRefBadge: {
            backgroundColor: colors.accent + '20',
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 6,
        },
        oldRefBadgeText: {
            color: colors.accent,
            fontSize: 11,
            fontWeight: '600',
        },
        pleadingDesc: {
            color: colors.textSecondary,
            fontSize: 12,
            marginTop: 4,
            lineHeight: 16,
        },
        oldRefText: {
            color: colors.accent,
            fontSize: 11,
            fontWeight: '500',
            marginTop: 3,
        },
        emptySearchBox: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 32,
            paddingHorizontal: spacing.l,
            gap: 8,
            borderRadius: 16,
            backgroundColor: colors.surfaceHighlight + '40',
            borderWidth: 1,
            borderColor: colors.border + '60',
            marginTop: spacing.s,
        },
        emptySearchText: {
            color: colors.textPrimary,
            fontSize: 15,
            fontWeight: '700',
        },
        emptySearchSubtext: {
            color: colors.textTertiary,
            fontSize: 12,
            textAlign: 'center',
            lineHeight: 18,
        },
        emptyResetBtn: {
            marginTop: 6,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 10,
            backgroundColor: colors.accent + '20',
            borderWidth: 1,
            borderColor: colors.accent + '50',
        },
        emptyResetText: {
            color: colors.accent,
            fontSize: 12,
            fontWeight: '700',
        },
        optionalPill: {
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 8,
            backgroundColor: colors.surfaceHighlight,
            borderWidth: 1,
            borderColor: colors.border + '60',
        },
        optionalPillText: {
            color: colors.textTertiary,
            fontSize: 10,
            fontWeight: '600',
        },
        inputBoxContainer: {
            position: 'relative',
            backgroundColor: colors.surfaceHighlight,
            borderWidth: 1.5,
            borderColor: colors.border,
            borderRadius: 16,
            padding: 12,
            marginBottom: 6,
        },
        inputBoxFocused: {
            borderColor: colors.accent,
            backgroundColor: colors.surfaceHighlight,
            shadowColor: colors.accent,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 6,
            elevation: 3,
        },
        textAreaPro: {
            color: colors.textPrimary,
            fontSize: 13,
            lineHeight: 20,
            textAlignVertical: 'top',
            minHeight: 64,
            paddingRight: 24,
        },
        inputClearBtn: {
            position: 'absolute',
            top: 10,
            right: 10,
            width: 20,
            height: 20,
            alignItems: 'center',
            justifyContent: 'center',
        },
        quickPromptRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 6,
            marginBottom: spacing.m,
            marginTop: 2,
        },
        quickPromptChip: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 10,
            backgroundColor: colors.accent + '12',
            borderWidth: 1,
            borderColor: colors.accent + '35',
        },
        quickPromptText: {
            color: colors.accent,
            fontSize: 11,
            fontWeight: '600',
        },

        // Pro Advocate Card
        advocateCardPro: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 12,
            padding: 14,
            borderRadius: 16,
            backgroundColor: colors.surfaceHighlight,
            borderWidth: 1.5,
            borderColor: colors.border + '90',
            marginTop: spacing.s,
            marginBottom: spacing.m,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
        },
        advocateIconBadge: {
            width: 40,
            height: 40,
            borderRadius: 14,
            backgroundColor: colors.accent + '18',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.accent + '35',
        },
        advocateHeaderLine: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 4,
        },
        advocateBadgeTag: {
            color: colors.accent,
            fontSize: 10,
            fontWeight: '700',
            letterSpacing: 0.6,
            textTransform: 'uppercase',
        },
        verifiedBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: colors.safe + '18',
            paddingHorizontal: 7,
            paddingVertical: 2,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.safe + '40',
        },
        verifiedBadgeText: {
            color: colors.safe,
            fontSize: 10,
            fontWeight: '700',
        },
        advocateNameText: {
            color: colors.textPrimary,
            fontSize: 14,
            fontWeight: '700',
            marginBottom: 4,
        },
        advocateMetaRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginTop: 2,
        },
        advocateEnrolmentText: {
            color: colors.textSecondary,
            fontSize: 11,
            fontWeight: '600',
        },
        advocateAddressText: {
            color: colors.textTertiary,
            fontSize: 11,
            flex: 1,
        },
        footer: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingTop: 12,
            paddingBottom: bottomNavPadding,
            paddingHorizontal: spacing.m,
            marginHorizontal: -spacing.m,
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border + '70',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 12,
        },
        cancelBtn: {
            flex: 1,
            height: 52,
            borderRadius: 16,
            borderWidth: 1.5,
            borderColor: colors.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            backgroundColor: colors.surfaceHighlight,
        },
        cancelBtnText: {
            color: colors.textPrimary,
            fontSize: 14,
            fontWeight: '600',
        },
        generateBtn: {
            flex: 2.2,
            height: 52,
            borderRadius: 16,
            overflow: 'hidden',
            shadowColor: colors.accent,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 10,
            elevation: 6,
        },
        generateGradient: {
            flex: 1,
            height: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingHorizontal: 12,
        },
        generateIconBadge: {
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: 'rgba(255,255,255,0.2)',
            alignItems: 'center',
            justifyContent: 'center',
        },
        generateBtnText: {
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: '700',
            letterSpacing: 0.2,
        },
        subModalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.75)',
            justifyContent: 'flex-end',
        },
        subModalContent: {
            backgroundColor: colors.surface,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            height: '80%',
            paddingTop: spacing.xs,
            paddingBottom: bottomNavPadding,
            borderTopWidth: 1,
            borderColor: colors.border + '60',
        },
        subModalIconBox: {
            width: 32,
            height: 32,
            borderRadius: 10,
            backgroundColor: colors.accent + '20',
            alignItems: 'center',
            justifyContent: 'center',
        },
        subModalHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing.m,
            paddingBottom: spacing.m,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.border + '60',
        },
        subModalTitle: {
            color: colors.textPrimary,
            fontSize: 16,
            fontWeight: '700',
        },
        subModalSubtitle: {
            color: colors.textTertiary,
            fontSize: 11,
            marginTop: 1,
        },
        pickerRowItem: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingVertical: 12,
            paddingHorizontal: 12,
            borderRadius: 14,
            marginBottom: 6,
            backgroundColor: colors.surfaceHighlight + '40',
            borderWidth: 1,
            borderColor: colors.border + '30',
        },
        pickerRowItemActive: {
            backgroundColor: colors.accent + '15',
            borderColor: colors.accent + '60',
        },
        pickerItemLabel: {
            color: colors.textPrimary,
            fontSize: 14,
            fontWeight: '600',
        },
        pickerItemSubtext: {
            color: colors.textSecondary,
            fontSize: 11,
            marginTop: 2,
        },
        filterCategoryDropdownRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 12,
            backgroundColor: colors.surfaceHighlight,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: spacing.s,
        },
        filterCategoryText: {
            flex: 1,
            color: colors.textSecondary,
            fontSize: 12,
        },
        generatingContainer: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: spacing.l,
            paddingBottom: bottomNavPadding + 16,
        },
        engineBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 8,
            backgroundColor: colors.accent + '20',
            marginBottom: spacing.m,
        },
        engineBadgeText: {
            color: colors.accent,
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 1,
        },
        orbContainer: {
            marginVertical: spacing.m,
        },
        outerGlowOrb: {
            width: 88,
            height: 88,
            borderRadius: 44,
            alignItems: 'center',
            justifyContent: 'center',
        },
        innerGlowOrb: {
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
        },
        generatingTitle: {
            color: colors.textPrimary,
            fontSize: 18,
            fontWeight: '700',
            marginTop: spacing.s,
        },
        statusLivePill: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginTop: 4,
            paddingHorizontal: 10,
            paddingVertical: 3,
            borderRadius: 12,
            backgroundColor: colors.surfaceHighlight,
        },
        statusLiveDot: {
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: colors.safe,
        },
        generatingSubtitle: {
            color: colors.textSecondary,
            fontSize: 12,
        },
        progressBarWrapper: {
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            marginVertical: spacing.m,
        },
        progressBarTrack: {
            flex: 1,
            height: 6,
            borderRadius: 3,
            backgroundColor: colors.surfaceHighlight,
            overflow: 'hidden',
        },
        progressBarFill: {
            height: '100%',
            borderRadius: 3,
        },
        progressBarPercent: {
            color: colors.accent,
            fontSize: 12,
            fontWeight: '700',
            width: 36,
            textAlign: 'right',
        },
        progressSteps: {
            width: '100%',
            gap: 8,
            marginVertical: spacing.s,
        },
        stepCard: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            padding: 10,
            borderRadius: 12,
            backgroundColor: colors.surfaceHighlight + '40',
            borderWidth: 1,
            borderColor: colors.border + '40',
        },
        stepCardActive: {
            borderColor: colors.accent,
            backgroundColor: colors.accent + '10',
        },
        stepCardDone: {
            borderColor: colors.safe + '40',
        },
        stepCircle: {
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
        },
        stepCircleActive: {
            backgroundColor: colors.accent + '30',
        },
        stepCircleCompleted: {
            backgroundColor: colors.safe,
        },
        stepNumber: {
            color: colors.textTertiary,
            fontSize: 11,
            fontWeight: '700',
        },
        stepLabel: {
            color: colors.textSecondary,
            fontSize: 12,
            fontWeight: '600',
        },
        stepLabelActive: {
            color: colors.textPrimary,
            fontWeight: '700',
        },
        stepLabelDone: {
            color: colors.textPrimary,
        },
        stepDesc: {
            color: colors.textTertiary,
            fontSize: 10,
        },
        privacyBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginTop: spacing.m,
        },
        privacyBadgeText: {
            color: colors.safe,
            fontSize: 11,
            fontWeight: '500',
        },
        docTabBar: {
            flexDirection: 'row',
            paddingVertical: spacing.s,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.border + '60',
            gap: 6,
        },
        docTab: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 8,
            backgroundColor: colors.surfaceHighlight + '60',
        },
        docTabActive: {
            backgroundColor: colors.accent + '20',
        },
        docTabText: {
            color: colors.textTertiary,
            fontSize: 12,
            fontWeight: '500',
        },
        docTabTextActive: {
            color: colors.accent,
            fontWeight: '700',
        },
        previewContainer: {
            flex: 1,
            paddingVertical: spacing.m,
        },
        paperSheet: {
            backgroundColor: colors.surfaceHighlight + '30',
            padding: 16,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            minHeight: 300,
        },
        courtBadgeHeader: {
            alignItems: 'center',
            paddingBottom: 10,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.border,
            marginBottom: 12,
        },
        courtBadgeText: {
            color: colors.accent,
            fontSize: 12,
            fontWeight: '700',
            textAlign: 'center',
        },
        paperHeading: {
            color: colors.textPrimary,
            fontSize: 13,
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: 12,
        },
        legalBodyText: {
            color: colors.textPrimary,
            fontSize: 12,
            lineHeight: 20,
            fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        },
        indexTablePreview: {
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 8,
            overflow: 'hidden',
        },
        indexTableRow: {
            flexDirection: 'row',
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.border,
            paddingVertical: 6,
            paddingHorizontal: 8,
        },
        indexTableHeader: {
            backgroundColor: colors.surfaceHighlight,
        },
        indexTableCell: {
            color: colors.textPrimary,
            fontSize: 11,
        },
        actionBar: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingTop: 12,
            paddingBottom: bottomNavPadding,
            paddingHorizontal: spacing.m,
            marginHorizontal: -spacing.m,
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border + '70',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 12,
        },
        actionBtnOutline: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 14,
            height: 50,
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: colors.border,
            backgroundColor: colors.surfaceHighlight,
            justifyContent: 'center',
        },
        actionBtnTextOutline: {
            color: colors.textPrimary,
            fontSize: 13,
            fontWeight: '600',
        },
        actionBtnPrimary: {
            flex: 1,
            height: 50,
            borderRadius: 14,
            overflow: 'hidden',
            shadowColor: colors.accent,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 5,
        },
        actionGradient: {
            flex: 1,
            height: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            paddingHorizontal: 12,
        },
        actionBtnTextPrimary: {
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: '700',
        },
    });
