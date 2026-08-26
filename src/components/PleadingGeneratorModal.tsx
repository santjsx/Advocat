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
    KeyboardAvoidingView,
    Easing,
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
import { shareDocument, openInMsWord } from '../services/documentStorage';
import { SmoothPressable } from './SmoothPressable';
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

const DOC_STACK_ITEMS = [
    { id: 'index', title: '1. Index to Paperbook', sub: 'Pagination & court filing stamps' },
    { id: 'synopsis', title: '2. Synopsis & List of Dates', sub: 'Chronological events & timeline' },
    { id: 'petition', title: '3. Main Petition / Application', sub: 'Grounds of law & prayer for relief' },
    { id: 'affidavit', title: '4. Supporting Affidavit', sub: 'Solemn affirmation & verification' },
    { id: 'vakalat', title: '5. Vakalatnama', sub: 'Counsel authorization & Welfare Fund' },
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
    const styles = useMemo(
        () => createStyles(colors, spacing, layout, insets, bottomNavPadding, mode),
        [colors, spacing, layout, insets, bottomNavPadding, mode]
    );

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
    const [activeDraftingDocIndex, setActiveDraftingDocIndex] = useState<number>(0);
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

    // Chamber Generation Animations & Real-Time Telemetry
    const generatingProgressAnim = useRef(new Animated.Value(0.15)).current;
    const pulseGlowAnim = useRef(new Animated.Value(0.95)).current;
    const spinAnim = useRef(new Animated.Value(0)).current;
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    React.useEffect(() => {
        let timer: any;
        if (step === 'GENERATING') {
            setElapsedSeconds(0);
            const startTime = Date.now();
            timer = setInterval(() => {
                setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
            }, 1000);

            // Pulsing Glow Loop
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseGlowAnim, {
                        toValue: 1.08,
                        duration: 1100,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseGlowAnim, {
                        toValue: 0.95,
                        duration: 1100,
                        useNativeDriver: true,
                    }),
                ])
            ).start();

            // Smooth 360 Spin Loop
            Animated.loop(
                Animated.timing(spinAnim, {
                    toValue: 1,
                    duration: 5000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            ).start();
        } else {
            spinAnim.setValue(0);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [step]);

    const progressPercent = useMemo(() => {
        if (activeDraftingDocIndex === 0) return 15;
        if (activeDraftingDocIndex === 1) return 35;
        if (activeDraftingDocIndex === 2) return 55;
        if (activeDraftingDocIndex === 3) return 75;
        if (activeDraftingDocIndex === 4) return 90;
        return 100;
    }, [activeDraftingDocIndex]);

    React.useEffect(() => {
        if (step === 'GENERATING') {
            Animated.spring(generatingProgressAnim, {
                toValue: progressPercent / 100,
                tension: 45,
                friction: 8,
                useNativeDriver: false,
            }).start();
        }
    }, [progressPercent, step]);

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
            return 'Tamil Nadu Bar Council • Enrolled';
        }
        return raw;
    }, [advocateProfile.barEnrolment]);

    const handleGenerate = async () => {
        let timer1: any;
        let timer2: any;

        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setStep('GENERATING');
            setActiveDraftingDocIndex(0);
            setProgressStatus('Drafting 1. Index to Paperbook...');

            timer1 = setTimeout(() => {
                setActiveDraftingDocIndex(1);
                setProgressStatus('Drafting 2. Synopsis & List of Dates...');
            }, 600);

            timer2 = setTimeout(() => {
                setActiveDraftingDocIndex(2);
                setProgressStatus(`Drafting 3. Main Petition for ${caseData.client?.name || caseData.clientName || caseData.name}...`);
            }, 1200);

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
                }
            );

            clearTimeout(timer1);
            clearTimeout(timer2);

            setActiveDraftingDocIndex(3);
            setProgressStatus('Drafting 4. Supporting Affidavit...');
            await new Promise(r => setTimeout(r, 450));

            setActiveDraftingDocIndex(4);
            setProgressStatus('Drafting 5. Vakalatnama & Welfare Stamp...');
            await new Promise(r => setTimeout(r, 450));

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

            setActiveDraftingDocIndex(5);
            setProgressStatus('All 5 Documents Ready!');
            await new Promise(r => setTimeout(r, 350));

            setStep('REVIEW');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error: any) {
            clearTimeout(timer1);
            clearTimeout(timer2);
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

    const handleOpenWord = async () => {
        if (!generatedDocxUri) {
            Alert.alert('Document not ready', 'Please generate the paperbook first.');
            return;
        }
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            showToast('Opening in Microsoft Word...', 'info');
            await openInMsWord(generatedDocxUri, generatedDocxName || 'Court_Document.docx');
        } catch (e: any) {
            Alert.alert('Word Launch Error', e?.message || 'Could not launch MS Word.');
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

    const renderFormattedLegalDocument = (text: string) => {
        if (!text) return null;

        const lines = text.split('\n');

        return (
            <View style={styles.documentBody}>
                {lines.map((rawLine, idx) => {
                    const line = rawLine.trim();

                    if (!line) {
                        return <View key={`spacer-${idx}`} style={{ height: 6 }} />;
                    }

                    // Clean out markdown bold asterisks
                    const cleanText = line.replace(/\*\*/g, '').trim();

                    // 1. Primary Court Heading (e.g., IN THE HIGH COURT OF JUDICATURE AT MADRAS)
                    const isMainCourtHeading =
                        cleanText.toUpperCase().startsWith('IN THE HIGH COURT') ||
                        cleanText.toUpperCase().startsWith('IN THE SUPREME COURT') ||
                        cleanText.toUpperCase().startsWith('IN THE COURT OF') ||
                        cleanText.toUpperCase().startsWith('BEFORE THE HON\'BLE') ||
                        cleanText.toUpperCase().startsWith('BEFORE THE');

                    if (isMainCourtHeading) {
                        return (
                            <Text key={`main-head-${idx}`} style={styles.courtMainTitle}>
                                {cleanText}
                            </Text>
                        );
                    }

                    // 2. Jurisdiction Sub-heading (e.g., (CRIMINAL / WRIT / APPELLATE JURISDICTION))
                    const isJurisdiction =
                        cleanText.startsWith('(CRIMINAL') ||
                        cleanText.startsWith('(APPELLATE') ||
                        cleanText.startsWith('(CIVIL') ||
                        cleanText.startsWith('(SPECIAL') ||
                        cleanText.startsWith('(EXTRAORDINARY') ||
                        cleanText.startsWith('(WRIT') ||
                        cleanText.toUpperCase().includes('JURISDICTION)');

                    if (isJurisdiction) {
                        return (
                            <Text key={`juris-${idx}`} style={styles.courtJurisdictionTitle}>
                                {cleanText}
                            </Text>
                        );
                    }

                    // 3. Case Number Heading (e.g., CRL.O.P. NO. 18492 OF 2026, C.R.P. (NPD) NO. 4120 OF 2026)
                    const isCaseNumber =
                        cleanText.toUpperCase().startsWith('CRL.M.P.') ||
                        cleanText.toUpperCase().startsWith('CRL.O.P.') ||
                        cleanText.toUpperCase().startsWith('C.R.P.') ||
                        cleanText.toUpperCase().startsWith('CRP') ||
                        cleanText.toUpperCase().startsWith('W.P.') ||
                        cleanText.toUpperCase().startsWith('O.S.') ||
                        cleanText.toUpperCase().startsWith('I.A.') ||
                        cleanText.toUpperCase().startsWith('C.M.A.') ||
                        cleanText.toUpperCase().startsWith('A.S.') ||
                        cleanText.toUpperCase().startsWith('S.A.') ||
                        cleanText.toUpperCase().startsWith('C.C.') ||
                        cleanText.startsWith('(In Crime') ||
                        cleanText.startsWith('(Crime No.') ||
                        cleanText.toUpperCase().startsWith('BAIL APPLICATION') ||
                        cleanText.toUpperCase().startsWith('M.P. NO.');

                    if (isCaseNumber) {
                        return (
                            <Text key={`case-num-${idx}`} style={styles.courtCaseNumberTitle}>
                                {cleanText}
                            </Text>
                        );
                    }

                    // 4. Centered Versus divider
                    const isVersus =
                        cleanText.toLowerCase() === 'versus' ||
                        cleanText.toLowerCase() === '-versus-' ||
                        cleanText === '-Vs-' ||
                        cleanText === '— VERSUS —' ||
                        cleanText === '... VERSUS ...' ||
                        cleanText === '-VS-' ||
                        cleanText === 'VS.' ||
                        cleanText === 'V.';

                    if (isVersus) {
                        return (
                            <View key={`vs-${idx}`} style={styles.versusContainer}>
                                <View style={styles.versusLine} />
                                <Text style={styles.versusText}>— VERSUS —</Text>
                                <View style={styles.versusLine} />
                            </View>
                        );
                    }

                    // 5. Right-Aligned Role (... Petitioner / Accused / Respondent)
                    const isRole =
                        cleanText.includes('... Petitioner') ||
                        cleanText.includes('... Respondent') ||
                        cleanText.includes('... Accused') ||
                        cleanText.includes('... Complainant') ||
                        cleanText.includes('... Defendant') ||
                        cleanText.includes('... Plaintiff') ||
                        cleanText.includes('... Appellant') ||
                        cleanText.includes('... Deponent');

                    if (isRole) {
                        return (
                            <View key={`role-${idx}`} style={styles.rightAlignedRoleContainer}>
                                <Text style={styles.roleText}>{cleanText}</Text>
                            </View>
                        );
                    }

                    // 6. Stamp Boxes (e.g. [ADVOCATES' WELFARE FUND STAMP: ₹30 / ₹100])
                    const isStampBox =
                        cleanText.startsWith('[ADVOCATES\' WELFARE FUND STAMP') ||
                        cleanText.startsWith('[COURT FEE STAMP') ||
                        cleanText.startsWith('[WELFARE FUND STAMP');

                    if (isStampBox) {
                        return (
                            <View key={`stamp-${idx}`} style={styles.stampPlaceholderCard}>
                                <MaterialCommunityIcons name="stamper" size={15} color="#D4AF37" />
                                <Text style={styles.stampPlaceholderText}>{cleanText.replace(/[\[\]]/g, '')}</Text>
                            </View>
                        );
                    }

                    // 7. Dual Signature Row (Petitioner on left, Counsel on right)
                    const isDualSignature =
                        (cleanText.includes('Petitioner') && cleanText.includes('Counsel for Petitioner')) ||
                        (cleanText.includes('SIGNATURE OF CLIENT') && cleanText.includes('ACCEPTED & SIGNED BY COUNSEL')) ||
                        (cleanText.includes('DEPONENT') && cleanText.includes('BEFORE ME'));

                    if (isDualSignature) {
                        // Extract left and right labels
                        let leftLabel = 'Petitioner.';
                        let rightLabel = 'Counsel for Petitioner.';

                        if (cleanText.includes('SIGNATURE OF CLIENT')) {
                            leftLabel = 'SIGNATURE OF CLIENT\n(Petitioner / Accused)';
                            rightLabel = 'ACCEPTED & SIGNED BY COUNSEL';
                        } else if (cleanText.includes('DEPONENT') && cleanText.includes('BEFORE ME')) {
                            leftLabel = 'DEPONENT / PETITIONER';
                            rightLabel = 'BEFORE ME\nADVOCATE / NOTARY PUBLIC';
                        }

                        return (
                            <View key={`dual-sig-${idx}`} style={styles.dualSignatureContainer}>
                                <View style={styles.signatureColLeft}>
                                    <View style={styles.signatureLine} />
                                    <Text style={styles.signatureColText}>{leftLabel}</Text>
                                </View>
                                <View style={styles.signatureColRight}>
                                    <View style={styles.signatureLine} />
                                    <Text style={styles.signatureColTextRight}>{rightLabel}</Text>
                                </View>
                            </View>
                        );
                    }

                    // 8. Centered Major Pleading Header Banner (e.g. PETITION, AFFIDAVIT, SYNOPSIS, PRAYER, VERIFICATION, VAKALATNAMA)
                    const isMajorSection =
                        cleanText.toUpperCase().startsWith('MEMORANDUM OF') ||
                        cleanText.toUpperCase().startsWith('PETITION UNDER') ||
                        cleanText.toUpperCase().startsWith('PLAINT FILED UNDER') ||
                        cleanText.toUpperCase().startsWith('SUPPORTING VERIFICATION AFFIDAVIT') ||
                        cleanText.toUpperCase().startsWith('AFFIDAVIT') ||
                        cleanText.toUpperCase().startsWith('SYNOPSIS') ||
                        cleanText.toUpperCase().startsWith('VAKALATNAMA') ||
                        cleanText.toUpperCase().startsWith('PRAYER') ||
                        cleanText.toUpperCase().startsWith('VERIFICATION') ||
                        cleanText.toUpperCase().startsWith('MEMO OF GROUNDS') ||
                        cleanText.toUpperCase().startsWith('LIST OF DOCUMENTS') ||
                        cleanText.toUpperCase().startsWith('DOCKET / BACKSHEET');

                    if (isMajorSection) {
                        return (
                            <View key={`plead-title-${idx}`} style={styles.petitionTitleContainer}>
                                <Text style={styles.petitionTitleText}>{cleanText}</Text>
                            </View>
                        );
                    }

                    // 9. IN THE MATTER OF:
                    if (cleanText.toUpperCase().startsWith('IN THE MATTER OF:')) {
                        return (
                            <View key={`matter-${idx}`} style={styles.matterOfContainer}>
                                <Text style={styles.matterOfText}>IN THE MATTER OF:</Text>
                            </View>
                        );
                    }

                    // 10. Formal Opening Salutations
                    const isSalutation =
                        cleanText.includes('most respectfully begs to submit as follows:') ||
                        cleanText.includes('respectfully submits as follows:') ||
                        cleanText.includes('do hereby solemnly affirm and sincerely state as follows:');

                    if (isSalutation) {
                        return (
                            <View key={`salutation-${idx}`} style={styles.salutationContainer}>
                                <Text style={styles.salutationText}>{cleanText}</Text>
                            </View>
                        );
                    }

                    // 11. Dated at / Verified at lines
                    const isDatedLine =
                        cleanText.startsWith('Dated at') ||
                        cleanText.startsWith('Verified at') ||
                        cleanText.startsWith('Solemnly affirmed at') ||
                        cleanText.startsWith('Executed by me at');

                    if (isDatedLine) {
                        return (
                            <Text key={`dated-${idx}`} style={styles.datedAtText}>
                                {cleanText}
                            </Text>
                        );
                    }

                    // 12. Sub-clauses / Prayer Bullets (e.g. a) , (a) , (i) )
                    const subClauseMatch = cleanText.match(/^(\([a-z0-9ivx]+\)|[a-z0-9]\))\s+(.*)$/i);
                    if (subClauseMatch) {
                        const [, clauseNum, rest] = subClauseMatch;
                        const parts = rest.split('**');
                        return (
                            <View key={`sub-clause-${idx}`} style={styles.prayerClauseRow}>
                                <Text style={styles.prayerBullet}>{clauseNum}</Text>
                                <Text style={styles.prayerClauseText}>
                                    {parts.map((p, pIdx) => (
                                        <Text key={pIdx} style={pIdx % 2 === 1 ? styles.legalBoldSpan : undefined}>
                                            {p}
                                        </Text>
                                    ))}
                                </Text>
                            </View>
                        );
                    }

                    // 13. Numbered Paragraphs or Capital Letter Grounds (e.g. 1. , 2. , A. , B. )
                    const match = cleanText.match(/^(\d+[\.\)]|[A-Z][\.\)])\s+(.*)$/);
                    if (match) {
                        const [, num, rest] = match;
                        const parts = rest.split('**');
                        return (
                            <View key={`num-para-${idx}`} style={styles.numberedParaRow}>
                                <Text style={styles.paraNumber}>{num}</Text>
                                <Text style={styles.paraText}>
                                    {parts.map((p, pIdx) => (
                                        <Text key={pIdx} style={pIdx % 2 === 1 ? styles.legalBoldSpan : undefined}>
                                            {p}
                                        </Text>
                                    ))}
                                </Text>
                            </View>
                        );
                    }

                    // 14. Signature and Verification solo blocks
                    const isSignature =
                        cleanText.includes('Counsel for Petitioner') ||
                        cleanText.includes('Counsel for Respondent') ||
                        cleanText.includes('Advocate for') ||
                        cleanText.includes('Petitioner.') ||
                        cleanText.includes('DEPONENT / PETITIONER') ||
                        cleanText.includes('BEFORE ME') ||
                        cleanText.includes('ADVOCATE / NOTARY PUBLIC');

                    if (isSignature) {
                        return (
                            <Text key={`sig-${idx}`} style={styles.signatureText}>
                                {cleanText}
                            </Text>
                        );
                    }

                    // 15. General Paragraphs with inline bold handling
                    const parts = line.split('**');
                    return (
                        <Text key={`p-${idx}`} style={styles.legalBodyParagraph}>
                            {parts.map((part, pIdx) => {
                                const isBold = pIdx % 2 === 1;
                                return (
                                    <Text key={pIdx} style={isBold ? styles.legalBoldSpan : undefined}>
                                        {part}
                                    </Text>
                                );
                            })}
                        </Text>
                    );
                })}
            </View>
        );
    };

    return (
        <>
            <Modal
                visible={visible}
                animationType="slide"
                transparent
                statusBarTranslucent
                onRequestClose={onClose}
            >
                <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    {/* Animated Floating Toast */}
                    {toastMessage && (
                        <Animated.View
                            pointerEvents="none"
                            style={[
                                styles.toastContainer,
                                {
                                    top: (insets?.top || 0) + (Platform.OS === 'android' ? 16 : 8),
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
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, paddingRight: 8 }}>
                            <View style={styles.iconContainer}>
                                <MaterialCommunityIcons name="scale-balance" size={20} color={colors.accent} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.title} numberOfLines={1}>Court Drafting Chambers</Text>
                                <Text style={styles.subtitle} numberOfLines={1}>
                                    {caseData.name}{caseData.caseNumber ? ` • ${caseData.caseNumber}` : ''}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Close modal">
                            <Ionicons name="close" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {step === 'CONFIG' && (
                        <ScrollView style={styles.body} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomNavPadding + 32 }}>
                            <View style={styles.sectionHeaderRow}>
                                <Text style={styles.sectionHeading}>1. TARGET COURT & JURISDICTION</Text>
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
                                <Text style={styles.sectionHeading}>2. PRACTICE AREA & CATEGORY</Text>
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
                                <Text style={styles.sectionHeading}>3. SELECT COURT FILING / DOCUMENT</Text>
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
                        <ScrollView
                            style={{ flex: 1 }}
                            contentContainerStyle={styles.generatingContainer}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* 1. Filing & Bench Overview Card */}
                            <View style={styles.generatingContextCard}>
                                <View style={styles.generatingContextTopRow}>
                                    <View style={styles.generatingCourtTag}>
                                        <MaterialCommunityIcons name="bank" size={13} color={colors.accent} />
                                        <Text style={styles.generatingCourtTagText} numberOfLines={1}>
                                            {activeCourtInfo.label}
                                        </Text>
                                    </View>
                                    <View style={styles.generatingTimerBadge}>
                                        <Ionicons name="timer-outline" size={12} color={colors.accent} />
                                        <Text style={styles.generatingTimerText}>
                                            {elapsedSeconds < 10 ? `00:0${elapsedSeconds}` : `00:${elapsedSeconds}`}s
                                        </Text>
                                    </View>
                                </View>

                                <Text style={styles.generatingDocTitle} numberOfLines={1}>
                                    {activePleadingInfo.label}
                                </Text>
                                <Text style={styles.generatingCasePartyText} numberOfLines={1}>
                                    {activePleadingInfo.statutoryRef} • {caseData.client?.name || caseData.clientName || caseData.name}
                                </Text>
                            </View>

                            {/* 2. Unified Precision Progress Bar & Live Status */}
                            <View style={styles.generatingProgressHeader}>
                                <View style={styles.progressLabelRow}>
                                    <View style={styles.statusLiveRow}>
                                        <View style={styles.statusLiveDot} />
                                        <Text style={styles.generatingSubtitle} numberOfLines={1}>
                                            {progressStatus}
                                        </Text>
                                    </View>
                                    <Text style={styles.progressBarPercent}>{progressPercent}%</Text>
                                </View>
                                <View style={styles.progressBarTrack}>
                                    <Animated.View
                                        style={[
                                            styles.progressBarFillContainer,
                                            {
                                                width: generatingProgressAnim.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: ['0%', '100%'],
                                                }),
                                            },
                                        ]}
                                    >
                                        <LinearGradient
                                            colors={['#D4AF37', '#F59E0B']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={styles.progressBarGradient}
                                        />
                                    </Animated.View>
                                </View>
                            </View>

                            {/* 3. The 5-Document Court Bundle Drafting Stack */}
                            <View style={styles.docStackContainer}>
                                <Text style={styles.docStackHeader}>DRAFTING 5-DOCUMENT COURT BUNDLE</Text>
                                {DOC_STACK_ITEMS.map((doc, idx) => {
                                    const isDone = activeDraftingDocIndex > idx;
                                    const isCurrent = activeDraftingDocIndex === idx;

                                    return (
                                        <View
                                            key={doc.id}
                                            style={[
                                                styles.docStackItem,
                                                isCurrent && styles.docStackItemActive,
                                                isDone && styles.docStackItemDone,
                                            ]}
                                        >
                                            <View
                                                style={[
                                                    styles.docStackIconCircle,
                                                    isCurrent && styles.docStackIconCircleActive,
                                                    isDone && styles.docStackIconCircleDone,
                                                ]}
                                            >
                                                {isDone ? (
                                                    <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                                                ) : isCurrent ? (
                                                    <ActivityIndicator size="small" color={colors.accent} />
                                                ) : (
                                                    <Text style={styles.docStackNumberText}>{idx + 1}</Text>
                                                )}
                                            </View>

                                            <View style={{ flex: 1 }}>
                                                <Text
                                                    style={[
                                                        styles.docStackTitle,
                                                        isCurrent && styles.docStackTitleActive,
                                                        isDone && styles.docStackTitleDone,
                                                    ]}
                                                    numberOfLines={1}
                                                >
                                                    {doc.title}
                                                </Text>
                                                <Text style={styles.docStackSub} numberOfLines={1}>
                                                    {doc.sub}
                                                </Text>
                                            </View>

                                            <View
                                                style={[
                                                    styles.docStackStatusPill,
                                                    isCurrent && styles.docStackStatusPillActive,
                                                    isDone && styles.docStackStatusPillDone,
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.docStackStatusText,
                                                        isCurrent && styles.docStackStatusTextActive,
                                                        isDone && styles.docStackStatusTextDone,
                                                    ]}
                                                >
                                                    {isDone ? 'Drafted' : isCurrent ? 'Drafting' : 'Queued'}
                                                </Text>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>

                            {/* 4. Minimal Court Standard Trust Seal */}
                            <View style={styles.privacyBadge}>
                                <MaterialCommunityIcons name="shield-check-outline" size={13} color={colors.safe} />
                                <Text style={styles.privacyBadgeText}>
                                    Madras High Court 1.75" Margins • Double Spacing • Local .docx Package
                                </Text>
                            </View>
                        </ScrollView>
                    )}

                    {/* STEP 3: REVIEW & EXPORT */}
                    {step === 'REVIEW' && generatedSections && (
                        <View style={{ flex: 1 }}>
                            {/* Horizontal Scrollable Document Tabs (Zero Truncation) */}
                            <View style={styles.docTabBarContainer}>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.docTabBarScrollContent}
                                >
                                    {[
                                        { tab: 'petition' as SectionTab, label: 'Petition', icon: 'file-document-outline' },
                                        { tab: 'affidavit' as SectionTab, label: 'Affidavit', icon: 'certificate-outline' },
                                        { tab: 'synopsis' as SectionTab, label: 'Synopsis', icon: 'clock-outline' },
                                        { tab: 'index' as SectionTab, label: 'Index Table', icon: 'format-list-numbered' },
                                        { tab: 'vakalat' as SectionTab, label: 'Vakalatnama', icon: 'feather' },
                                    ].map(t => (
                                        <SmoothPressable
                                            key={t.tab}
                                            onPress={() => setActiveTab(t.tab)}
                                            style={[
                                                styles.docTab,
                                                activeTab === t.tab && styles.docTabActive,
                                            ]}
                                            haptic="light"
                                            scaleTo={0.94}
                                        >
                                            <MaterialCommunityIcons
                                                name={t.icon as any}
                                                size={16}
                                                color={activeTab === t.tab ? '#000000' : colors.textTertiary}
                                            />
                                            <Text
                                                style={[
                                                    styles.docTabText,
                                                    activeTab === t.tab && styles.docTabTextActive,
                                                ]}
                                            >
                                                {t.label}
                                            </Text>
                                        </SmoothPressable>
                                    ))}
                                </ScrollView>
                            </View>

                            {/* Section Preview Box */}
                            <ScrollView
                                style={styles.previewContainer}
                                showsVerticalScrollIndicator={true}
                                contentContainerStyle={{ paddingBottom: 24 }}
                            >
                                <View style={styles.paperSheet}>
                                    <View style={styles.courtBadgeHeader}>
                                        <View style={styles.courtFolioLeft}>
                                            <MaterialCommunityIcons name="scale-balance" size={15} color={colors.accent} />
                                            <Text style={styles.courtBadgeText}>MADRAS HIGH COURT PAPERBOOK</Text>
                                        </View>
                                        <View style={styles.draftBadgePill}>
                                            <Text style={styles.draftBadgeText}>LEGAL DRAFT</Text>
                                        </View>
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

                                    {activeTab === 'synopsis' && renderFormattedLegalDocument(generatedSections.synopsis)}

                                    {activeTab === 'petition' && renderFormattedLegalDocument(generatedSections.petition)}

                                    {activeTab === 'affidavit' && renderFormattedLegalDocument(generatedSections.affidavit)}

                                    {activeTab === 'vakalat' && renderFormattedLegalDocument(generatedSections.vakalat)}
                                </View>
                            </ScrollView>

                            {/* Executive 2-Tier Export / Share Actions Bar */}
                            <View style={styles.actionBar}>
                                {/* Row 1: Primary Full-Width Export Action */}
                                <SmoothPressable
                                    style={styles.actionBtnPrimary}
                                    onPress={handleShareDocx}
                                    haptic="medium"
                                    scaleTo={0.98}
                                >
                                    <LinearGradient
                                        colors={['#D4AF37', '#B8860B']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.actionGradient}
                                    >
                                        <Ionicons name="share-social" size={18} color="#000000" />
                                        <Text style={styles.actionBtnTextPrimary}>Share & Export Court .docx</Text>
                                    </LinearGradient>
                                </SmoothPressable>

                                {/* Row 2: 3 Equal-Width Tool Actions */}
                                <View style={styles.actionToolsRow}>
                                    <SmoothPressable
                                        style={styles.actionToolBtn}
                                        onPress={handleCopySection}
                                        haptic="light"
                                        scaleTo={0.95}
                                    >
                                        <Ionicons name="copy-outline" size={16} color={colors.textPrimary} />
                                        <Text style={styles.actionToolBtnText}>Copy</Text>
                                    </SmoothPressable>

                                    <SmoothPressable
                                        style={[styles.actionToolBtn, { borderColor: '#2B579A', backgroundColor: '#2B579A15' }]}
                                        onPress={handleOpenWord}
                                        haptic="light"
                                        scaleTo={0.95}
                                    >
                                        <MaterialCommunityIcons name="file-word-box" size={17} color="#2B579A" />
                                        <Text style={[styles.actionToolBtnText, { color: '#2B579A', fontWeight: '700' }]}>MS Word</Text>
                                    </SmoothPressable>

                                    <SmoothPressable
                                        style={[styles.actionToolBtn, isSaved && { borderColor: colors.safe, backgroundColor: colors.safe + '15' }]}
                                        onPress={handleSaveToCase}
                                        disabled={isSaving || isSaved}
                                        haptic="medium"
                                        scaleTo={0.95}
                                    >
                                        {isSaving ? (
                                            <ActivityIndicator size="small" color={colors.accent} />
                                        ) : (
                                            <>
                                                <Ionicons
                                                    name={isSaved ? 'checkmark-circle' : 'bookmark-outline'}
                                                    size={16}
                                                    color={isSaved ? colors.safe : colors.textPrimary}
                                                />
                                                <Text style={[styles.actionToolBtnText, isSaved && { color: colors.safe, fontWeight: '700' }]}>
                                                    {isSaved ? 'Saved' : 'Save'}
                                                </Text>
                                            </>
                                        )}
                                    </SmoothPressable>
                                </View>
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
                                <Ionicons name="close-circle-outline" size={18} color={colors.critical} />
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
                                    <Text style={styles.generateBtnText}>Draft Court Document</Text>
                                    <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.8)" style={{ marginLeft: 2 }} />
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* In-Modal Sub-Sheet: Searchable Court Tier Picker */}
                    {/* In-Modal Sub-Sheet: Searchable Court Tier Picker */}
                    {isCourtPickerOpen && (
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                            style={styles.subModalOverlay}
                            pointerEvents="box-none"
                        >
                            <View style={styles.subModalContent} pointerEvents="auto">
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
                                        <Ionicons name="close" size={18} color={colors.critical} />
                                    </TouchableOpacity>
                                </View>

                                {/* Search in courts */}
                                <View style={[
                                    styles.searchBarContainer,
                                    { marginHorizontal: spacing.m, marginBottom: spacing.s },
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
                                    keyboardShouldPersistTaps="always"
                                    keyboardDismissMode="on-drag"
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
                        </KeyboardAvoidingView>
                    )}

                    {/* In-Modal Sub-Sheet: Searchable 75+ Pleading Document Picker */}
                    {isPleadingPickerOpen && (
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                            style={styles.subModalOverlay}
                            pointerEvents="box-none"
                        >
                            <View style={[styles.subModalContent, { height: '88%' }]} pointerEvents="auto">
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
                                        <Ionicons name="close" size={18} color={colors.critical} />
                                    </TouchableOpacity>
                                </View>

                                {/* Sub-modal Body with Search and Category Dropdown Filter */}
                                <View style={{ flex: 1, paddingHorizontal: spacing.m }}>
                                    {/* Search Bar */}
                                    <View style={[styles.searchBarContainer, { marginTop: spacing.s }]}>
                                        <View style={styles.searchIconBadge}>
                                            <Ionicons name="search" size={16} color={colors.accent} />
                                        </View>
                                        <TextInput
                                            style={styles.searchInput}
                                            placeholder="Search section (482, 138), name (Bail, Injunction)..."
                                            placeholderTextColor={colors.textTertiary}
                                            value={searchQuery}
                                            onChangeText={setSearchQuery}
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
                                        keyboardShouldPersistTaps="always"
                                        keyboardDismissMode="on-drag"
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
                        </KeyboardAvoidingView>
                    )}

                    {/* In-Modal Sub-Sheet: Searchable Practice Category Picker */}
                    {isCategoryPickerOpen && (
                        <View style={[styles.subModalOverlay, { zIndex: 1010, elevation: 30 }]}>
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
                                        <Ionicons name="close" size={18} color={colors.critical} />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView
                                    style={{ flex: 1, paddingHorizontal: spacing.m }}
                                    contentContainerStyle={{ paddingBottom: bottomNavPadding + 32 }}
                                    showsVerticalScrollIndicator={true}
                                    keyboardShouldPersistTaps="always"
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
                    )}
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
) => {
    const isDark = mode === 'dark';
    return StyleSheet.create({
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
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            paddingBottom: spacing.m,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.border + '60',
        },
        iconContainer: {
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: colors.accent + '20',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.accent + '30',
        },
        title: {
            color: colors.textPrimary,
            fontSize: 17,
            fontWeight: '700',
            letterSpacing: 0.2,
            lineHeight: 22,
        },
        subtitle: {
            color: colors.textSecondary,
            fontSize: 12,
            lineHeight: 17,
            marginTop: 3,
        },
        headerCaseNumberPill: {
            alignSelf: 'flex-start',
            backgroundColor: colors.accent + '18',
            paddingHorizontal: 7,
            paddingVertical: 2,
            borderRadius: 6,
            marginTop: 4,
            borderWidth: 0.8,
            borderColor: colors.accent + '35',
        },
        headerCaseNumberText: {
            color: colors.accent,
            fontSize: 11,
            fontWeight: '700',
        },
        closeBtn: {
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: colors.surfaceHighlight,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.border,
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
            borderColor: colors.critical + '50',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            backgroundColor: colors.critical + '14',
        },
        cancelBtnText: {
            color: colors.critical,
            fontSize: 14,
            fontWeight: '700',
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
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(0,0,0,0.85)',
            justifyContent: 'flex-end',
            zIndex: 1000,
            elevation: 24,
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
            paddingHorizontal: spacing.m,
            paddingTop: spacing.s,
            paddingBottom: bottomNavPadding + 24,
        },
        generatingContextCard: {
            width: '100%',
            backgroundColor: colors.surfaceHighlight,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 12,
            marginBottom: spacing.m,
        },
        generatingContextTopRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 6,
        },
        generatingCourtTag: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: colors.accent + '15',
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 6,
            flex: 1,
            marginRight: 8,
        },
        generatingCourtTagText: {
            color: colors.accent,
            fontSize: 11,
            fontWeight: '700',
            flex: 1,
        },
        generatingTimerBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: colors.surface,
            paddingHorizontal: 7,
            paddingVertical: 3,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: colors.border,
        },
        generatingTimerText: {
            color: colors.accent,
            fontSize: 11,
            fontWeight: '700',
            fontVariant: ['tabular-nums'],
        },
        generatingDocTitle: {
            color: colors.textPrimary,
            fontSize: 14,
            fontWeight: '700',
            letterSpacing: 0.2,
        },
        generatingCasePartyText: {
            color: colors.textSecondary,
            fontSize: 11.5,
            marginTop: 2,
        },
        generatingProgressHeader: {
            width: '100%',
            backgroundColor: colors.surfaceHighlight + '70',
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border + '80',
            padding: 12,
            marginBottom: spacing.m,
        },
        progressLabelRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
        },
        statusLiveRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            flex: 1,
            marginRight: 8,
        },
        statusLiveDot: {
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: colors.safe,
        },
        generatingSubtitle: {
            color: colors.textPrimary,
            fontSize: 11.5,
            fontWeight: '600',
            flex: 1,
        },
        progressBarPercent: {
            color: colors.accent,
            fontSize: 12,
            fontWeight: '800',
            fontVariant: ['tabular-nums'],
        },
        progressBarTrack: {
            width: '100%',
            height: 5,
            borderRadius: 3,
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
            overflow: 'hidden',
        },
        progressBarFillContainer: {
            height: '100%',
            borderRadius: 3,
            overflow: 'hidden',
        },
        progressBarGradient: {
            flex: 1,
            height: '100%',
        },
        docStackContainer: {
            width: '100%',
            backgroundColor: colors.surfaceHighlight + '50',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border + '70',
            padding: 14,
            marginBottom: spacing.m,
        },
        docStackHeader: {
            color: colors.textTertiary,
            fontSize: 10,
            fontWeight: '700',
            letterSpacing: 0.8,
            marginBottom: 10,
        },
        docStackItem: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingVertical: 10,
            paddingHorizontal: 10,
            borderRadius: 12,
            marginBottom: 6,
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: 'transparent',
        },
        docStackItemActive: {
            backgroundColor: colors.accent + '10',
            borderColor: colors.accent + '35',
        },
        docStackItemDone: {
            backgroundColor: colors.surfaceHighlight + '40',
            borderColor: colors.border + '40',
        },
        docStackIconCircle: {
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderColor: colors.border,
        },
        docStackIconCircleActive: {
            backgroundColor: colors.accent + '20',
            borderColor: colors.accent,
        },
        docStackIconCircleDone: {
            backgroundColor: colors.safe,
            borderColor: colors.safe,
        },
        docStackNumberText: {
            color: colors.textTertiary,
            fontSize: 11,
            fontWeight: '700',
        },
        docStackTitle: {
            color: colors.textSecondary,
            fontSize: 13,
            fontWeight: '600',
        },
        docStackTitleActive: {
            color: colors.textPrimary,
            fontWeight: '700',
        },
        docStackTitleDone: {
            color: colors.textPrimary,
            fontWeight: '600',
        },
        docStackSub: {
            color: colors.textTertiary,
            fontSize: 11,
            marginTop: 1,
        },
        docStackStatusPill: {
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 6,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border + '50',
        },
        docStackStatusPillActive: {
            backgroundColor: colors.accent + '18',
            borderColor: colors.accent + '50',
        },
        docStackStatusPillDone: {
            backgroundColor: colors.safe + '18',
            borderColor: colors.safe + '40',
        },
        docStackStatusText: {
            color: colors.textTertiary,
            fontSize: 10,
            fontWeight: '600',
        },
        docStackStatusTextActive: {
            color: colors.accent,
            fontWeight: '700',
        },
        docStackStatusTextDone: {
            color: colors.safe,
            fontWeight: '700',
        },
        privacyBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            paddingVertical: 4,
        },
        privacyBadgeText: {
            color: colors.textTertiary,
            fontSize: 10.5,
            fontWeight: '500',
        },
        docTabBarContainer: {
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.border + '60',
            paddingVertical: spacing.s,
            marginHorizontal: -spacing.m,
        },
        docTabBarScrollContent: {
            paddingHorizontal: spacing.m,
            gap: 8,
            flexDirection: 'row',
            alignItems: 'center',
        },
        docTab: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 10,
            backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
            borderWidth: 1,
            borderColor: colors.border + '40',
        },
        docTabActive: {
            backgroundColor: '#D4AF37',
            borderColor: '#D4AF37',
        },
        docTabText: {
            color: colors.textTertiary,
            fontSize: 12.5,
            fontWeight: '600',
        },
        docTabTextActive: {
            color: '#000000',
            fontWeight: '800',
        },
        previewContainer: {
            flex: 1,
            paddingVertical: spacing.m,
        },
        paperSheet: {
            backgroundColor: mode === 'dark' ? '#0E131F' : '#FCFCFA',
            padding: 18,
            borderRadius: 16,
            borderWidth: 1.5,
            borderColor: mode === 'dark' ? 'rgba(212, 175, 55, 0.28)' : 'rgba(212, 175, 55, 0.38)',
            minHeight: 320,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 10,
            elevation: 4,
        },
        courtBadgeHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: 12,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: mode === 'dark' ? 'rgba(212, 175, 55, 0.25)' : 'rgba(212, 175, 55, 0.35)',
            marginBottom: 16,
        },
        courtFolioLeft: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
        },
        courtBadgeText: {
            color: colors.accent,
            fontSize: 10.5,
            fontWeight: '800',
            letterSpacing: 0.8,
        },
        draftBadgePill: {
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 6,
            backgroundColor: colors.accent + '15',
            borderWidth: 1,
            borderColor: colors.accent + '35',
        },
        draftBadgeText: {
            color: colors.accent,
            fontSize: 9.5,
            fontWeight: '800',
            letterSpacing: 0.5,
        },
        paperHeading: {
            color: colors.textPrimary,
            fontSize: 13,
            fontWeight: '800',
            textAlign: 'center',
            marginBottom: 14,
            letterSpacing: 0.5,
        },
        documentBody: {
            paddingLeft: 12,
            borderLeftWidth: 2,
            borderLeftColor: 'rgba(212, 175, 55, 0.35)',
            marginVertical: 4,
        },
        courtMainTitle: {
            color: colors.accent,
            fontSize: 13.5,
            fontWeight: '800',
            textAlign: 'center',
            marginVertical: 3,
            letterSpacing: 0.8,
            lineHeight: 20,
            textTransform: 'uppercase',
        },
        courtJurisdictionTitle: {
            color: colors.textSecondary,
            fontSize: 11,
            fontWeight: '700',
            fontStyle: 'italic',
            textAlign: 'center',
            marginVertical: 2,
            letterSpacing: 0.5,
        },
        courtCaseNumberTitle: {
            color: colors.textPrimary,
            fontSize: 13,
            fontWeight: '800',
            textAlign: 'center',
            marginVertical: 4,
            letterSpacing: 0.6,
        },
        courtCenteredHeading: {
            color: colors.textPrimary,
            fontSize: 13,
            fontWeight: '700',
            textAlign: 'center',
            marginVertical: 3,
            letterSpacing: 0.4,
        },
        matterOfContainer: {
            marginVertical: 8,
            paddingVertical: 4,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.border + '60',
            borderBottomColor: colors.border + '60',
        },
        matterOfText: {
            color: colors.accent,
            fontSize: 11,
            fontWeight: '800',
            letterSpacing: 1.2,
        },
        versusContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginVertical: 12,
            gap: 10,
        },
        versusLine: {
            flex: 1,
            height: 1,
            backgroundColor: colors.border + '90',
        },
        versusText: {
            color: colors.accent,
            fontSize: 11,
            fontWeight: '800',
            letterSpacing: 2,
        },
        rightAlignedRoleContainer: {
            alignItems: 'flex-end',
            marginVertical: 4,
            paddingRight: 4,
        },
        roleText: {
            color: colors.accent,
            fontSize: 12,
            fontWeight: '700',
            fontStyle: 'italic',
        },
        petitionTitleContainer: {
            alignItems: 'center',
            justifyContent: 'center',
            marginVertical: 14,
            paddingVertical: 8,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderTopColor: colors.accent + '35',
            borderBottomColor: colors.accent + '35',
            backgroundColor: colors.accent + '08',
            borderRadius: 6,
        },
        petitionTitleText: {
            color: colors.accent,
            fontSize: 12.5,
            fontWeight: '800',
            textAlign: 'center',
            letterSpacing: 1.5,
            textTransform: 'uppercase',
        },
        numberedParaRow: {
            flexDirection: 'row',
            marginVertical: 5,
            alignItems: 'flex-start',
        },
        paraNumber: {
            color: colors.accent,
            fontSize: 13.5,
            fontWeight: '700',
            width: 28,
            marginTop: 1,
        },
        paraText: {
            flex: 1,
            color: colors.textPrimary,
            fontSize: 13.5,
            lineHeight: 21,
        },
        prayerClauseRow: {
            flexDirection: 'row',
            marginVertical: 4,
            paddingLeft: 12,
            alignItems: 'flex-start',
        },
        prayerBullet: {
            color: colors.accent,
            fontSize: 12.5,
            fontWeight: '700',
            fontStyle: 'italic',
            width: 24,
            marginTop: 1,
        },
        prayerClauseText: {
            flex: 1,
            color: colors.textPrimary,
            fontSize: 13,
            lineHeight: 20,
        },
        signatureText: {
            color: colors.textPrimary,
            fontSize: 12,
            fontWeight: '700',
            marginVertical: 3,
            textAlign: 'right',
            letterSpacing: 0.3,
        },
        stampPlaceholderCard: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginVertical: 10,
            paddingVertical: 9,
            paddingHorizontal: 14,
            borderWidth: 1.5,
            borderColor: 'rgba(212, 175, 55, 0.45)',
            borderStyle: 'dashed',
            borderRadius: 8,
            backgroundColor: mode === 'dark' ? 'rgba(212, 175, 55, 0.08)' : 'rgba(212, 175, 55, 0.06)',
        },
        stampPlaceholderText: {
            color: colors.accent,
            fontSize: 11,
            fontWeight: '800',
            letterSpacing: 0.8,
            textTransform: 'uppercase',
        },
        dualSignatureContainer: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginVertical: 14,
            paddingTop: 8,
            gap: 16,
        },
        signatureColLeft: {
            flex: 1,
            alignItems: 'flex-start',
        },
        signatureColRight: {
            flex: 1,
            alignItems: 'flex-end',
        },
        signatureLine: {
            width: '85%',
            height: 1,
            backgroundColor: colors.border + '90',
            marginBottom: 6,
        },
        signatureColText: {
            color: colors.textPrimary,
            fontSize: 11.5,
            fontWeight: '700',
            letterSpacing: 0.3,
            lineHeight: 17,
        },
        signatureColTextRight: {
            color: colors.textPrimary,
            fontSize: 11.5,
            fontWeight: '700',
            letterSpacing: 0.3,
            textAlign: 'right',
            lineHeight: 17,
        },
        salutationContainer: {
            marginVertical: 8,
            paddingVertical: 3,
        },
        salutationText: {
            color: colors.textPrimary,
            fontSize: 13,
            fontWeight: '700',
            fontStyle: 'italic',
            lineHeight: 20,
        },
        datedAtText: {
            color: colors.textSecondary,
            fontSize: 12,
            fontWeight: '600',
            marginVertical: 6,
            fontStyle: 'italic',
        },
        legalBodyParagraph: {
            color: colors.textPrimary,
            fontSize: 13.5,
            lineHeight: 21,
            marginVertical: 3,
        },
        legalBoldSpan: {
            fontWeight: '700',
            color: colors.textPrimary,
        },
        legalBodyText: {
            color: colors.textPrimary,
            fontSize: 13.5,
            lineHeight: 21,
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
            flexDirection: 'column',
            gap: 10,
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
        actionBtnPrimary: {
            width: '100%',
            height: 48,
            borderRadius: 12,
            overflow: 'hidden',
            shadowColor: '#D4AF37',
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
            gap: 8,
            paddingHorizontal: 12,
        },
        actionBtnTextPrimary: {
            color: '#000000',
            fontSize: 13.5,
            fontWeight: '800',
            letterSpacing: 0.2,
        },
        actionToolsRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            width: '100%',
        },
        actionToolBtn: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            height: 42,
            borderRadius: 10,
            borderWidth: 1.2,
            borderColor: colors.border,
            backgroundColor: colors.surfaceHighlight,
        },
        actionToolBtnText: {
            color: colors.textPrimary,
            fontSize: 12.5,
            fontWeight: '700',
        },
    });
};
