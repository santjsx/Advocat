import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
    Alert,
    Linking,
    Image,
    Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../theme/ThemeContext';
import { useAppStore } from '../store/useAppStore';
import {
    ECourtsCaseResult,
    TAMIL_NADU_COURTS,
    COMMON_CASE_TYPES,
} from '../models/ECourts';
import {
    fetchECourtsByCNR,
    fetchECourtsByCaseNumber,
    convertECourtsToAdvocatCase,
    formatCNRDisplay,
    cleanCNR,
} from '../services/eCourtsService';
import { parseECourtsText } from '../services/eCourtsTextParser';
import { pickECourtsScreenshot, extractCaseFromScreenshot } from '../services/eCourtsVisionService';
import dayjs from 'dayjs';

interface Props {
    visible: boolean;
    onClose: () => void;
    onCaseImported: (caseId: string) => void;
}

type TabMode = 'SCREENSHOT' | 'PASTE' | 'CNR';

export const ECourtsSearchModal: React.FC<Props> = ({
    visible,
    onClose,
    onCaseImported,
}) => {
    const { colors, spacing } = useTheme();
    const insets = useSafeAreaInsets();
    const addCase = useAppStore(state => state.addCase);
    const addDeadline = useAppStore(state => state.addDeadline);
    const advocateProfile = useAppStore(state => state.advocateProfile);

    const [activeTab, setActiveTab] = useState<TabMode>('SCREENSHOT');

    // Screenshot Tab State
    const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
    const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);

    // Quick-Paste Tab State
    const [pasteText, setPasteText] = useState('');

    // CNR Tab State
    const [cnrInput, setCnrInput] = useState('');
    const [selectedCourtId, setSelectedCourtId] = useState(TAMIL_NADU_COURTS[0].id);
    const [selectedCaseType, setSelectedCaseType] = useState(COMMON_CASE_TYPES[0].code);
    const [caseNumberInput, setCaseNumberInput] = useState('');
    const [caseYearInput, setCaseYearInput] = useState(new Date().getFullYear().toString());

    // Processing State
    const [loading, setLoading] = useState(false);
    const [loadingMsg, setLoadingMsg] = useState('Extracting court details...');
    const [searchResult, setSearchResult] = useState<ECourtsCaseResult | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Handle Screenshot Picking
    const handlePickScreenshot = async () => {
        setErrorMsg(null);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        const pick = await pickECourtsScreenshot();
        if (!pick.cancelled && pick.uri && pick.base64) {
            setSelectedImageUri(pick.uri);
            setSelectedImageBase64(pick.base64);
            // Auto extract on pick
            await processScreenshot(pick.base64);
        } else if (pick.error) {
            setErrorMsg(pick.error);
        }
    };

    const processScreenshot = async (base64: string) => {
        setLoading(true);
        setLoadingMsg('Scanning eCourts screenshot...');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const res = await extractCaseFromScreenshot(base64, advocateProfile?.deepseekApiKey);
            if (res.success && res.data) {
                setSearchResult(res.data);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                setErrorMsg(res.message || 'Could not parse screenshot details.');
                setSearchResult(null);
            }
        } catch (err: any) {
            setErrorMsg(err?.message || 'Error processing image.');
            setSearchResult(null);
        } finally {
            setLoading(false);
        }
    };

    // Handle Clipboard Paste
    const handlePasteFromClipboard = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const text = await Clipboard.getStringAsync();
        if (text && text.trim()) {
            setPasteText(text);
            handleParseText(text);
        } else {
            Alert.alert('Clipboard Empty', 'Please copy case text from eCourts, WhatsApp, or SMS first.');
        }
    };

    const handleParseText = (textToParse?: string) => {
        const text = textToParse || pasteText;
        if (!text.trim()) {
            setErrorMsg('Please paste case text to parse.');
            return;
        }

        setErrorMsg(null);
        setLoading(true);
        setLoadingMsg('Parsing eCourts text...');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        setTimeout(() => {
            const res = parseECourtsText(text);
            if (res.success && res.data) {
                setSearchResult(res.data);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                setErrorMsg(res.message || 'Could not recognize case text format.');
                setSearchResult(null);
            }
            setLoading(false);
        }, 300);
    };

    // Handle CNR / Case Number Search
    const handleSearchCNR = async () => {
        setErrorMsg(null);
        setLoading(true);
        setLoadingMsg('Searching eCourts registry...');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            if (cnrInput.trim()) {
                const res = await fetchECourtsByCNR(cnrInput);
                if (res.success && res.data) {
                    setSearchResult(res.data);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                } else {
                    setErrorMsg(res.message || 'No case found for this CNR Number.');
                    setSearchResult(null);
                }
            } else {
                const res = await fetchECourtsByCaseNumber(
                    selectedCourtId,
                    selectedCaseType,
                    caseNumberInput,
                    caseYearInput
                );
                if (res.success && res.data) {
                    setSearchResult(res.data);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                } else {
                    setErrorMsg(res.message || 'No case found matching these parameters.');
                    setSearchResult(null);
                }
            }
        } catch (err: any) {
            setErrorMsg(err?.message || 'Error querying eCourts.');
            setSearchResult(null);
        } finally {
            setLoading(false);
        }
    };

    // Import into Native Advocat Store
    const handleImport = () => {
        if (!searchResult) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        const { newCase, deadline } = convertECourtsToAdvocatCase(searchResult);

        addCase(newCase);

        if (deadline) {
            addDeadline(deadline);
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
            'Case Imported Successfully! ⚖️',
            `"${searchResult.caseTitle}" has been added to your active practice matters with statutory sections and scheduled court hearings.`,
            [
                {
                    text: 'View Case',
                    onPress: () => {
                        onClose();
                        onCaseImported(newCase.id);
                    },
                },
            ]
        );
    };

    // Sample Text Loaders
    const loadSampleText = () => {
        const sample = `Judicial Magistrate,Tiruvottiyur

Case Details
Filing Number: CRLMP/833/2026
Filing Date: 13-03-2026
Registration Number: CRLMP/203/2026
Registration Date: 13-03-2026
CNR Number: TNTR280008372026

Case Status
First Hearing Date: 13-03-2026
Next Hearing Date: 07-09-2026
Case Stage: Evidence
Court Number and Judge: 2 - Judicial Magistrate
Last Business Date: 21-08-2026

Petitioner and Advocate
1) Thilagam

Respondent and Advocate
1) M8 Sathangadu

Act
Under Act(s): CODE OF CRIMINAL PROCEDURE, 1973
Under Section(s): 156

FIR Details
Police Station: Sathangadu P.S
FIR Number: 2370
Year: 2020`;

        setPasteText(sample);
        handleParseText(sample);
    };

    const openOfficialPortal = () => {
        Linking.openURL('https://services.ecourts.gov.in/ecourtindia_v6/#/cases/cnr').catch(() => {
            Linking.openURL('https://services.ecourts.gov.in');
        });
    };

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing.m,
            paddingVertical: spacing.s,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
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
            backgroundColor: colors.accent + '20',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.accent + '40',
        },
        headerTitle: {
            fontSize: 18,
            fontWeight: '700',
            color: colors.textPrimary,
            letterSpacing: -0.2,
        },
        headerSubtitle: {
            fontSize: 11,
            color: colors.accent,
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
        },
        closeButton: {
            padding: spacing.s,
            borderRadius: 8,
        },
        content: {
            padding: spacing.m,
            paddingBottom: Math.max(insets.bottom, 24) + 60,
        },
        // 3-Way Tabs
        tabContainer: {
            flexDirection: 'row',
            backgroundColor: colors.surfaceHighlight,
            borderRadius: 12,
            padding: 4,
            marginBottom: spacing.m,
            borderWidth: 1,
            borderColor: colors.border,
        },
        tabButton: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            paddingVertical: 9,
            borderRadius: 8,
        },
        tabButtonActive: {
            backgroundColor: colors.surface,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
        },
        tabText: {
            fontSize: 12,
            color: colors.textTertiary,
            fontWeight: '600',
        },
        tabTextActive: {
            color: colors.accent,
            fontWeight: '700',
        },
        // Form Card
        formCard: {
            backgroundColor: colors.surface,
            borderRadius: 14,
            padding: spacing.m,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: spacing.m,
        },
        fieldLabel: {
            fontSize: 12,
            fontWeight: '700',
            color: colors.textSecondary,
            marginBottom: 6,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
        },
        textInput: {
            backgroundColor: colors.surfaceHighlight,
            borderRadius: 10,
            paddingHorizontal: spacing.m,
            paddingVertical: Platform.OS === 'ios' ? 12 : 10,
            color: colors.textPrimary,
            fontSize: 14,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: spacing.m,
        },
        textAreaInput: {
            minHeight: 110,
            textAlignVertical: 'top',
            fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
            fontSize: 13,
            lineHeight: 18,
        },
        cnrInput: {
            fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
            letterSpacing: 1.5,
            fontWeight: '700',
            fontSize: 15,
            color: colors.accent,
        },
        // Screenshot Upload Box
        uploadDropBox: {
            borderWidth: 2,
            borderColor: colors.accent + '50',
            borderStyle: 'dashed',
            borderRadius: 14,
            backgroundColor: colors.accent + '08',
            padding: spacing.l,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.m,
        },
        uploadIconCircle: {
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: colors.accent + '20',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.s,
            borderWidth: 1,
            borderColor: colors.accent + '40',
        },
        uploadTitle: {
            fontSize: 15,
            fontWeight: '700',
            color: colors.textPrimary,
            marginBottom: 4,
        },
        uploadSubtitle: {
            fontSize: 12,
            color: colors.textTertiary,
            textAlign: 'center',
            lineHeight: 17,
        },
        imagePreviewContainer: {
            borderRadius: 10,
            overflow: 'hidden',
            marginBottom: spacing.m,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceHighlight,
            alignItems: 'center',
            padding: spacing.s,
        },
        imagePreview: {
            width: '100%',
            height: 160,
            borderRadius: 8,
            resizeMode: 'contain',
        },
        actionRow: {
            flexDirection: 'row',
            gap: 10,
            marginBottom: spacing.m,
        },
        secondaryActionBtn: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            backgroundColor: colors.surfaceHighlight,
            borderColor: colors.border,
            borderWidth: 1,
            paddingVertical: 10,
            borderRadius: 10,
        },
        secondaryActionText: {
            fontSize: 12,
            fontWeight: '600',
            color: colors.textPrimary,
        },
        primaryButton: {
            borderRadius: 12,
            overflow: 'hidden',
        },
        primaryGradient: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingVertical: 13,
        },
        primaryButtonText: {
            color: 'white',
            fontSize: 15,
            fontWeight: '700',
            letterSpacing: 0.3,
        },
        portalLinkRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            marginTop: spacing.m,
            paddingVertical: 4,
        },
        portalLinkText: {
            fontSize: 12,
            color: colors.textTertiary,
            textDecorationLine: 'underline',
        },
        // Result Preview Card
        resultCard: {
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: spacing.m,
            borderWidth: 1.5,
            borderColor: colors.safe + '60',
            shadowColor: colors.safe,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 10,
            elevation: 4,
            marginBottom: spacing.m,
        },
        resultHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottomWidth: 1,
            borderBottomColor: colors.border + '60',
            paddingBottom: spacing.s,
            marginBottom: spacing.m,
        },
        resultCourtText: {
            fontSize: 12,
            fontWeight: '700',
            color: colors.accent,
            flex: 1,
        },
        liveBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: colors.safe + '20',
            borderColor: colors.safe + '60',
            borderWidth: 1,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 10,
        },
        liveDot: {
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: colors.safe,
        },
        liveBadgeText: {
            color: colors.safe,
            fontSize: 10,
            fontWeight: '700',
            letterSpacing: 0.5,
        },
        caseTitle: {
            fontSize: 17,
            fontWeight: '700',
            color: colors.textPrimary,
            lineHeight: 23,
            marginBottom: spacing.s,
        },
        badgeRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 6,
            marginBottom: spacing.m,
        },
        cnrBadge: {
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 6,
            backgroundColor: colors.surfaceHighlight,
            borderWidth: 1,
            borderColor: colors.border,
        },
        cnrText: {
            fontSize: 11,
            color: colors.textSecondary,
            fontWeight: '700',
            fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        },
        nextHearingCard: {
            backgroundColor: colors.warning + '12',
            borderColor: colors.warning + '40',
            borderWidth: 1,
            borderRadius: 10,
            padding: spacing.s,
            marginBottom: spacing.m,
        },
        nextHearingHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 4,
        },
        nextHearingLabel: {
            fontSize: 11,
            fontWeight: '700',
            color: colors.warning,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
        },
        nextHearingDate: {
            fontSize: 14,
            fontWeight: '700',
            color: colors.textPrimary,
        },
        nextHearingPurpose: {
            fontSize: 12,
            color: colors.textSecondary,
            marginTop: 2,
        },
        sectionBlock: {
            marginBottom: spacing.m,
        },
        sectionBlockTitle: {
            fontSize: 11,
            fontWeight: '700',
            color: colors.textTertiary,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            marginBottom: 6,
        },
        sectionsPills: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 6,
        },
        sectionChip: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: colors.accent + '15',
            borderColor: colors.accent + '35',
            borderWidth: 1,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 6,
        },
        sectionChipText: {
            fontSize: 11,
            color: colors.accent,
            fontWeight: '700',
        },
        partiesContainer: {
            backgroundColor: colors.surfaceHighlight + '60',
            borderRadius: 10,
            padding: spacing.s,
            marginBottom: spacing.m,
            gap: 8,
        },
        partyRow: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 8,
        },
        partyLabel: {
            fontSize: 11,
            fontWeight: '700',
            color: colors.textTertiary,
            width: 75,
            textTransform: 'uppercase',
        },
        partyValue: {
            flex: 1,
            fontSize: 13,
            color: colors.textPrimary,
            fontWeight: '600',
        },
        importButton: {
            borderRadius: 12,
            overflow: 'hidden',
            marginTop: spacing.xs,
        },
        importGradient: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingVertical: 14,
        },
        importButtonText: {
            color: 'white',
            fontSize: 16,
            fontWeight: '700',
            letterSpacing: 0.3,
        },
        errorCard: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: colors.critical + '15',
            borderColor: colors.critical + '40',
            borderWidth: 1,
            padding: spacing.m,
            borderRadius: 12,
            marginBottom: spacing.m,
        },
        errorText: {
            flex: 1,
            color: colors.critical,
            fontSize: 13,
            lineHeight: 18,
        },
    });

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.container} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <View style={styles.headerIconBox}>
                            <MaterialCommunityIcons name="scale-balance" size={20} color={colors.accent} />
                        </View>
                        <View>
                            <Text style={styles.headerTitle}>eCourts India Sync</Text>
                            <Text style={styles.headerSubtitle}>Live High Court & District Court Sync</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                    {/* 3-Way Tab Selector */}
                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[styles.tabButton, activeTab === 'SCREENSHOT' && styles.tabButtonActive]}
                            onPress={() => {
                                setActiveTab('SCREENSHOT');
                                setErrorMsg(null);
                            }}
                        >
                            <MaterialCommunityIcons
                                name="camera-outline"
                                size={16}
                                color={activeTab === 'SCREENSHOT' ? colors.accent : colors.textTertiary}
                            />
                            <Text style={[styles.tabText, activeTab === 'SCREENSHOT' && styles.tabTextActive]}>
                                Screenshot
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.tabButton, activeTab === 'PASTE' && styles.tabButtonActive]}
                            onPress={() => {
                                setActiveTab('PASTE');
                                setErrorMsg(null);
                            }}
                        >
                            <MaterialCommunityIcons
                                name="clipboard-text-outline"
                                size={16}
                                color={activeTab === 'PASTE' ? colors.accent : colors.textTertiary}
                            />
                            <Text style={[styles.tabText, activeTab === 'PASTE' && styles.tabTextActive]}>
                                Quick Paste
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.tabButton, activeTab === 'CNR' && styles.tabButtonActive]}
                            onPress={() => {
                                setActiveTab('CNR');
                                setErrorMsg(null);
                            }}
                        >
                            <MaterialCommunityIcons
                                name="barcode-scan"
                                size={16}
                                color={activeTab === 'CNR' ? colors.accent : colors.textTertiary}
                            />
                            <Text style={[styles.tabText, activeTab === 'CNR' && styles.tabTextActive]}>
                                CNR Search
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* TAB 1: SCREENSHOT UPLOAD */}
                    {activeTab === 'SCREENSHOT' && (
                        <View style={styles.formCard}>
                            <TouchableOpacity
                                style={styles.uploadDropBox}
                                onPress={handlePickScreenshot}
                                activeOpacity={0.8}
                            >
                                <View style={styles.uploadIconCircle}>
                                    <MaterialCommunityIcons name="image-plus" size={26} color={colors.accent} />
                                </View>
                                <Text style={styles.uploadTitle}>
                                    {selectedImageUri ? 'Change Screenshot' : 'Upload eCourts Screenshot'}
                                </Text>
                                <Text style={styles.uploadSubtitle}>
                                    Take a screenshot of the official eCourts app, High Court site, or WhatsApp message
                                </Text>
                            </TouchableOpacity>

                            {selectedImageUri && (
                                <View style={styles.imagePreviewContainer}>
                                    <Image source={{ uri: selectedImageUri }} style={styles.imagePreview} />
                                </View>
                            )}

                            <TouchableOpacity
                                style={styles.primaryButton}
                                onPress={() => {
                                    if (selectedImageBase64) {
                                        processScreenshot(selectedImageBase64);
                                    } else {
                                        handlePickScreenshot();
                                    }
                                }}
                                disabled={loading}
                                activeOpacity={0.85}
                            >
                                <LinearGradient
                                    colors={[colors.primary, colors.accent]}
                                    style={styles.primaryGradient}
                                >
                                    {loading ? (
                                        <>
                                            <ActivityIndicator size="small" color="white" />
                                            <Text style={styles.primaryButtonText}>{loadingMsg}</Text>
                                        </>
                                    ) : (
                                        <>
                                            <MaterialCommunityIcons name="scan-helper" size={18} color="white" />
                                            <Text style={styles.primaryButtonText}>
                                                {selectedImageUri ? 'Scan & Extract Details' : 'Select Screenshot from Gallery'}
                                            </Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* TAB 2: SMART QUICK-PASTE */}
                    {activeTab === 'PASTE' && (
                        <View style={styles.formCard}>
                            <Text style={styles.fieldLabel}>Paste eCourts Text / SMS / Cause List</Text>
                            <TextInput
                                style={[styles.textInput, styles.textAreaInput]}
                                placeholder="Paste copied text from eCourts app, SMS alert, or WhatsApp message here..."
                                placeholderTextColor={colors.textTertiary}
                                value={pasteText}
                                onChangeText={setPasteText}
                                multiline
                                numberOfLines={5}
                            />

                            <View style={styles.actionRow}>
                                <TouchableOpacity
                                    style={styles.secondaryActionBtn}
                                    onPress={handlePasteFromClipboard}
                                >
                                    <Ionicons name="clipboard-outline" size={16} color={colors.accent} />
                                    <Text style={[styles.secondaryActionText, { color: colors.accent }]}>
                                        Paste from Clipboard
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.secondaryActionBtn}
                                    onPress={loadSampleText}
                                >
                                    <MaterialCommunityIcons name="text-box-search-outline" size={16} color={colors.textSecondary} />
                                    <Text style={styles.secondaryActionText}>Load Sample</Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={styles.primaryButton}
                                onPress={() => handleParseText()}
                                disabled={loading || !pasteText.trim()}
                                activeOpacity={0.85}
                            >
                                <LinearGradient
                                    colors={[colors.primary, colors.accent]}
                                    style={styles.primaryGradient}
                                >
                                    {loading ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <>
                                            <MaterialCommunityIcons name="auto-fix" size={18} color="white" />
                                            <Text style={styles.primaryButtonText}>Parse & Extract Details</Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* TAB 3: CNR SEARCH & OFFICIAL PORTAL */}
                    {activeTab === 'CNR' && (
                        <View style={styles.formCard}>
                            <Text style={styles.fieldLabel}>16-Character CNR Number</Text>
                            <TextInput
                                style={[styles.textInput, styles.cnrInput]}
                                placeholder="e.g. TNHC010018292026"
                                placeholderTextColor={colors.textTertiary}
                                value={cnrInput}
                                onChangeText={setCnrInput}
                                autoCapitalize="characters"
                                maxLength={19}
                            />

                            <TouchableOpacity
                                style={styles.primaryButton}
                                onPress={handleSearchCNR}
                                disabled={loading}
                                activeOpacity={0.85}
                            >
                                <LinearGradient
                                    colors={[colors.primary, colors.accent]}
                                    style={styles.primaryGradient}
                                >
                                    {loading ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <>
                                            <Ionicons name="search" size={18} color="white" />
                                            <Text style={styles.primaryButtonText}>Search CNR Registry</Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.portalLinkRow} onPress={openOfficialPortal}>
                                <Ionicons name="open-outline" size={14} color={colors.textTertiary} />
                                <Text style={styles.portalLinkText}>
                                    Open Official eCourts Services Portal (NIC)
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Error Banner & Guidance */}
                    {errorMsg && (
                        <View style={styles.errorCard}>
                            <Ionicons name="information-circle-outline" size={24} color={colors.warning} />
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.errorText, { color: colors.textPrimary }]}>{errorMsg}</Text>
                                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                                    <TouchableOpacity
                                        style={{
                                            backgroundColor: colors.accent,
                                            paddingHorizontal: 12,
                                            paddingVertical: 7,
                                            borderRadius: 8,
                                        }}
                                        onPress={() => {
                                            setErrorMsg(null);
                                            setActiveTab('PASTE');
                                        }}
                                    >
                                        <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>
                                            📋 Go to Quick Paste Tab
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={{
                                            backgroundColor: colors.surfaceHighlight,
                                            borderColor: colors.border,
                                            borderWidth: 1,
                                            paddingHorizontal: 10,
                                            paddingVertical: 7,
                                            borderRadius: 8,
                                        }}
                                        onPress={openOfficialPortal}
                                    >
                                        <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 12 }}>
                                            🌐 Open Portal
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Result Preview Card */}
                    {searchResult && (
                        <View style={styles.resultCard}>
                            <View style={styles.resultHeader}>
                                <Text style={styles.resultCourtText} numberOfLines={1}>
                                    {searchResult.courtName}
                                </Text>
                                <View style={styles.liveBadge}>
                                    <View style={styles.liveDot} />
                                    <Text style={styles.liveBadgeText}>VERIFIED ECOURTS RECORD</Text>
                                </View>
                            </View>

                            <Text style={styles.caseTitle}>{searchResult.caseTitle}</Text>

                            <View style={styles.badgeRow}>
                                <View style={styles.cnrBadge}>
                                    <Text style={styles.cnrText}>CNR: {formatCNRDisplay(searchResult.cnr)}</Text>
                                </View>
                                <View style={[styles.cnrBadge, { borderColor: colors.accent + '50' }]}>
                                    <Text style={[styles.cnrText, { color: colors.accent }]}>
                                        {searchResult.caseNumber}
                                    </Text>
                                </View>
                            </View>

                            {/* Next Hearing Countdown */}
                            {searchResult.nextHearing && (
                                <View style={styles.nextHearingCard}>
                                    <View style={styles.nextHearingHeader}>
                                        <Text style={styles.nextHearingLabel}>Next Listed Hearing</Text>
                                        <Text style={styles.nextHearingDate}>
                                            {dayjs(searchResult.nextHearing.date).format('DD MMMM YYYY')}
                                        </Text>
                                    </View>
                                    <Text style={styles.nextHearingPurpose}>
                                        Purpose: {searchResult.nextHearing.purpose}
                                        {searchResult.nextHearing.courtHall ? ` • ${searchResult.nextHearing.courtHall}` : ''}
                                    </Text>
                                </View>
                            )}

                            {/* Parties Info */}
                            <View style={styles.partiesContainer}>
                                <View style={styles.partyRow}>
                                    <Text style={styles.partyLabel}>Petitioner:</Text>
                                    <Text style={styles.partyValue} numberOfLines={2}>
                                        {searchResult.petitioner.name}
                                    </Text>
                                </View>
                                <View style={styles.partyRow}>
                                    <Text style={styles.partyLabel}>Respondent:</Text>
                                    <Text style={styles.partyValue} numberOfLines={2}>
                                        {searchResult.respondent.name}
                                    </Text>
                                </View>
                                {searchResult.presidingJudge && (
                                    <View style={styles.partyRow}>
                                        <Text style={styles.partyLabel}>Bench:</Text>
                                        <Text style={styles.partyValue} numberOfLines={1}>
                                            {searchResult.presidingJudge}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Statutory Sections */}
                            {searchResult.sections && searchResult.sections.length > 0 && (
                                <View style={styles.sectionBlock}>
                                    <Text style={styles.sectionBlockTitle}>Statutory Acts & Sections</Text>
                                    <View style={styles.sectionsPills}>
                                        {searchResult.sections.map((s, idx) => (
                                            <View key={idx} style={styles.sectionChip}>
                                                <MaterialCommunityIcons name="scale" size={12} color={colors.accent} />
                                                <Text style={styles.sectionChipText}>
                                                    {s.act} Sec {s.section}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Import Button */}
                            <TouchableOpacity
                                style={styles.importButton}
                                onPress={handleImport}
                                activeOpacity={0.85}
                            >
                                <LinearGradient
                                    colors={[colors.safe, '#15803d']}
                                    style={styles.importGradient}
                                >
                                    <Ionicons name="download-outline" size={20} color="white" />
                                    <Text style={styles.importButtonText}>Import to My Practice</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
};
