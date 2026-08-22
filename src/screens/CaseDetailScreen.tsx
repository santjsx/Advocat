import React, { useMemo, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView,
    TextInput, Alert, Modal, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../theme/ThemeContext';
import { DeadlineItem } from '../components/DeadlineItem';
import { ConfirmationModal } from '../components/ConfirmationModal';
import dayjs from 'dayjs';
import { CaseStatus, CaseStage, CASE_STAGES, CaseNote, TimelineEvent, LegalSection, LegalActType, LEGAL_ACTS } from '../models/Case';
import { SECTION_DATABASE } from '../data/legalSections';

import { formatFileSize, shareDocument, shareMultipleDocuments, ShareableDoc } from '../services/documentStorage';
import { PleadingGeneratorModal } from '../components/PleadingGeneratorModal';
import { SmoothPressable } from '../components/SmoothPressable';
import { useToast } from '../context/ToastContext';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import * as IntentLauncher from 'expo-intent-launcher';
import * as FileSystem from 'expo-file-system/legacy';
import * as Clipboard from 'expo-clipboard';

type Props = NativeStackScreenProps<RootStackParamList, 'CaseDetail'>;

type TabType = 'overview' | 'sections' | 'documents' | 'deadlines' | 'notes' | 'timeline';

export const CaseDetailScreen: React.FC<Props> = ({ route, navigation }) => {
    const { colors, spacing, layout, mode } = useTheme();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [noteModalVisible, setNoteModalVisible] = useState(false);
    const [sectionModalVisible, setSectionModalVisible] = useState(false);
    const [pleadingModalVisible, setPleadingModalVisible] = useState(false);
    const [newNote, setNewNote] = useState('');
    const [newSectionAct, setNewSectionAct] = useState<LegalActType>('IPC');
    const [newSectionNumber, setNewSectionNumber] = useState('');
    const [newSectionDesc, setNewSectionDesc] = useState('');

    // Auto-fill Description Removed

    const [showActPicker, setShowActPicker] = useState(false);

    // Document Search
    const [docSearchQuery, setDocSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

    // Multi-select state
    const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState({
        visible: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    const showConfirmation = (title: string, message: string, onConfirm: () => void) => {
        setConfirmModal({ visible: true, title, message, onConfirm });
    };

    const hideConfirmation = () => {
        setConfirmModal(prev => ({ ...prev, visible: false }));
    };

    const STATUS_COLORS: Record<CaseStatus, string> = {
        ACTIVE: colors.safe,
        PENDING: colors.warning,
        CLOSED: colors.textTertiary,
    };

    const { caseId } = route.params;
    const cases = useAppStore(state => state.cases);
    const deadlines = useAppStore(state => state.deadlines);
    const documents = useAppStore(state => state.documents);
    const toggleDeadline = useAppStore(state => state.toggleDeadlineComplete);
    const deleteCase = useAppStore(state => state.deleteCase);
    const addCaseNote = useAppStore(state => state.addCaseNote);
    const deleteCaseNote = useAppStore(state => state.deleteCaseNote);
    const deleteDocument = useAppStore(state => state.deleteDocument);
    const updateCaseStage = useAppStore(state => state.updateCaseStage);
    const addLegalSection = useAppStore(state => state.addLegalSection);
    const deleteLegalSection = useAppStore(state => state.deleteLegalSection);
    const updateCase = useAppStore(state => state.updateCase);

    const currentCase = cases.find(c => c.id === caseId);
    const insets = useSafeAreaInsets();
    const modalBottomPadding = insets.bottom > 0 ? insets.bottom + 16 : (Platform.OS === 'android' ? 28 : 16);
    const styles = createStyles(colors, spacing, layout, modalBottomPadding);

    if (!currentCase) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>Case not found.</Text>
            </View>
        );
    }

    // Backward compatibility
    const clientName = currentCase.client?.name || currentCase.clientName || 'Unknown';
    const clientPhone = currentCase.client?.phone || currentCase.clientPhone;
    const clientEmail = currentCase.client?.email;
    const stage = currentCase.stage || 'INTAKE';
    const notes = currentCase.notes || [];
    const timeline = currentCase.timeline || [];
    const sections = currentCase.sections || [];

    const caseDeadlines = useMemo(() => {
        return deadlines
            .filter(d => d.caseId === caseId)
            .sort((a, b) => dayjs(a.dueDate).diff(dayjs(b.dueDate)));
    }, [deadlines, caseId]);

    const caseDocuments = useMemo(() => {
        return documents.filter(d => d.caseId === caseId);
    }, [documents, caseId]);

    const filteredDocuments = useMemo(() => {
        let docs = caseDocuments;

        if (docSearchQuery.trim()) {
            const query = docSearchQuery.toLowerCase();
            docs = docs.filter(doc =>
                doc.name.toLowerCase().includes(query) ||
                doc.type.toLowerCase().replace('_', ' ').includes(query) ||
                doc.tags?.some(tag => tag.toLowerCase().includes(query))
            );
        }

        return docs.sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
        });
    }, [caseDocuments, docSearchQuery, sortBy]);

    const handleDeleteCase = () => {
        showConfirmation(
            'Delete Case',
            'This will permanently delete this case and all related data. This action cannot be undone.',
            () => {
                deleteCase(caseId);
                navigation.goBack();
            }
        );
    };

    const handleCallClient = () => {
        if (clientPhone) Linking.openURL(`tel:${clientPhone}`);
    };

    const handleEmailClient = () => {
        if (clientEmail) Linking.openURL(`mailto:${clientEmail}`);
    };

    const handleAddNote = () => {
        if (!newNote.trim()) return;
        const note: CaseNote = {
            id: uuidv4(),
            content: newNote.trim(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        addCaseNote(caseId, note);
        setNewNote('');
        setNoteModalVisible(false);
    };

    const handleDeleteNote = (noteId: string) => {
        showConfirmation(
            'Delete Note',
            'Are you sure you want to delete this note?',
            () => deleteCaseNote(caseId, noteId)
        );
    };

    const handleAddSection = () => {
        if (!newSectionNumber.trim()) return;

        const sectionsToAdd = newSectionNumber.split(',').map(s => s.trim().toUpperCase()).filter(s => s);
        const newSections: LegalSection[] = [];

        sectionsToAdd.forEach(secNum => {
            const dbDesc = SECTION_DATABASE[newSectionAct]?.[secNum];
            const finalDesc = newSectionDesc.trim() || dbDesc;

            newSections.push({
                id: uuidv4(),
                act: newSectionAct,
                section: secNum,
                description: finalDesc,
            });
        });

        updateCase({
            ...currentCase, // Changed from caseItem to currentCase
            sections: [...(currentCase.sections || []), ...newSections]
        });
        setNewSectionNumber('');
        setNewSectionDesc('');
        setSectionModalVisible(false);
    };

    const handleDeleteSection = (sectionId: string) => {
        showConfirmation(
            'Delete Section',
            'Are you sure you want to remove this section?',
            () => deleteLegalSection(caseId, sectionId)
        );
    };

    const handleStageChange = (newStage: CaseStage) => {
        updateCaseStage(caseId, newStage);
    };

    const toggleDocumentSelection = (docId: string) => {
        if (selectedDocIds.includes(docId)) {
            const newSelection = selectedDocIds.filter(id => id !== docId);
            setSelectedDocIds(newSelection);
            if (newSelection.length === 0) {
                setIsSelectionMode(false);
            }
        } else {
            setSelectedDocIds([...selectedDocIds, docId]);
        }
    };

    const enterSelectionMode = (docId: string) => {
        setIsSelectionMode(true);
        setSelectedDocIds([docId]);
    };

    const cancelSelectionMode = () => {
        setIsSelectionMode(false);
        setSelectedDocIds([]);
    };

    const handleMultiShare = async () => {
        const docsToShare = activeTab === 'documents'
            ? caseDocuments.filter(d => selectedDocIds.includes(d.id))
            : [];

        if (docsToShare.length === 0) return;

        // Build the list of shareable documents
        const shareableDocs: ShareableDoc[] = [];

        for (const doc of docsToShare) {
            const version = doc.versions.find(v => v.id === doc.currentVersionId) || doc.versions[0];
            if (version) {
                shareableDocs.push({
                    uri: version.uri,
                    fileName: doc.name,
                    mimeType: doc.mimeType,
                });
            }
        }

        // Share all documents at once
        await shareMultipleDocuments(shareableDocs);
        cancelSelectionMode();
    };

    const handleMultiDelete = () => {
        if (selectedDocIds.length === 0) return;

        showConfirmation(
            "Delete Documents",
            `Are you sure you want to delete ${selectedDocIds.length} document(s)? This cannot be undone.`,
            () => {
                selectedDocIds.forEach(id => deleteDocument(id));
                cancelSelectionMode();
            }
        );
    };

    const handleViewDocument = async (doc: any) => {
        const currentVersion = doc.versions.find((v: any) => v.id === doc.currentVersionId) || doc.versions[0];
        if (!currentVersion) return;

        try {
            if (Platform.OS === 'android') {
                const contentUri = await FileSystem.getContentUriAsync(currentVersion.uri);
                await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
                    data: contentUri,
                    flags: 1,
                    type: doc.mimeType,
                });
            } else {
                // iOS - Sharing provides a native 'Quick Look' experience
                await shareDocument(currentVersion.uri, doc.name, doc.mimeType);
            }
        } catch (e: any) {
            console.warn('Direct view failed, opening share sheet fallback:', e?.message || e);
            try {
                await shareDocument(currentVersion.uri, doc.name, doc.mimeType);
            } catch (shareErr) {
                Alert.alert(
                    'No Office App Found',
                    'Could not open Word (.docx) directly because no Word processor app (Google Docs, MS Word, WPS Office) is installed on this device. You can share or export this file to view it on your PC or another app.',
                    [
                        {
                            text: 'Share / Export',
                            onPress: () => shareDocument(currentVersion.uri, doc.name, doc.mimeType),
                        },
                        {
                            text: 'Copy File Path',
                            onPress: () => {
                                Clipboard.setStringAsync(currentVersion.uri);
                                Alert.alert('Copied', 'File path copied to clipboard.');
                            },
                        },
                        { text: 'OK', style: 'cancel' },
                    ]
                );
            }
        }
    };

    const getDocIcon = (mimeType: string): string => {
        if (mimeType.includes('pdf')) return 'file-pdf-box';
        if (mimeType.includes('image')) return 'file-image';
        if (mimeType.includes('word')) return 'file-word';
        return 'file-document';
    };

    const getTimelineIcon = (type: string): string => {
        switch (type) {
            case 'CASE_CREATED': return 'folder-plus';
            case 'STATUS_CHANGED': return 'swap-horizontal';
            case 'STAGE_CHANGED': return 'arrow-right-circle';
            case 'DEADLINE_ADDED': return 'clock-plus';
            case 'DEADLINE_COMPLETED': return 'check-circle';
            case 'DOCUMENT_ADDED': return 'file-plus';
            case 'NOTE_ADDED': return 'note-plus';
            case 'SECTION_ADDED': return 'scale-balance';
            case 'HEARING_SCHEDULED': return 'gavel';
            case 'CLIENT_MEETING': return 'account-clock';
            default: return 'circle';
        }
    };

    const headerGradient: [string, string] = mode === 'dark'
        ? [colors.surface, colors.background]
        : ['#f8f5f0', colors.background];

    const currentStageIndex = CASE_STAGES.findIndex(s => s.value === stage);

    const renderTab = (tab: TabType, label: string, icon: string, count?: number) => (
        <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
        >
            <View style={styles.tabInner}>
                <MaterialCommunityIcons
                    name={icon as any}
                    size={16}
                    color={activeTab === tab ? colors.accent : colors.textTertiary}
                />
                <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
                    {label}
                </Text>
                {typeof count === 'number' && count > 0 && (
                    <View style={[styles.tabBadge, activeTab === tab && styles.tabBadgeActive]}>
                        <Text style={[styles.tabBadgeText, activeTab === tab && styles.tabBadgeTextActive]}>
                            {count}
                        </Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {/* Header */}
            <LinearGradient colors={headerGradient} style={styles.header}>
                {/* Selection Mode Header Overlay */}
                {isSelectionMode && (
                    <View style={styles.selectionHeader}>
                        <TouchableOpacity onPress={cancelSelectionMode} style={styles.selectionCloseBtn}>
                            <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
                        </TouchableOpacity>
                        <Text style={styles.selectionTitle}>{selectedDocIds.length} Selected</Text>
                        <View style={styles.selectionActions}>
                            <TouchableOpacity onPress={handleMultiShare} style={styles.selectionPill}>
                                <MaterialCommunityIcons name="share-variant" size={16} color={colors.accent} />
                                <Text style={[styles.selectionPillText, { color: colors.accent }]}>Share</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleMultiDelete} style={styles.selectionPill}>
                                <MaterialCommunityIcons name="delete" size={16} color={colors.critical} />
                                <Text style={[styles.selectionPillText, { color: colors.critical }]}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
                <View style={styles.navBar}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <View style={styles.navActions}>
                        <TouchableOpacity onPress={() => navigation.navigate('EditCase', { caseId })} style={styles.navBtnPill}>
                            <MaterialCommunityIcons name="pencil" size={16} color={colors.accent} />
                            <Text style={[styles.navBtnText, { color: colors.accent }]}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleDeleteCase} style={[styles.navBtnPill, styles.deleteBtnPill]}>
                            <MaterialCommunityIcons name="delete" size={16} color={colors.critical} />
                            <Text style={[styles.navBtnText, { color: colors.critical }]}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                {/* Case Info Card */}
                {/* Unified Executive Header */}
                <View style={styles.heroCard}>
                    <Text style={styles.heroTitle} numberOfLines={2}>
                        {currentCase.name}
                    </Text>

                    <View style={styles.heroGrid}>
                        {currentCase.caseNumber && (
                            <TouchableOpacity
                                style={styles.caseNoChip}
                                onPress={async () => {
                                    await Clipboard.setStringAsync(currentCase.caseNumber!);
                                    showToast({ message: `Copied: ${currentCase.caseNumber}`, type: 'success' });
                                }}
                                activeOpacity={0.7}
                            >
                                <MaterialCommunityIcons name="file-document-outline" size={13} color={colors.accent} />
                                <Text style={styles.caseNoChipText}>{currentCase.caseNumber}</Text>
                                <MaterialCommunityIcons name="content-copy" size={11} color={colors.textTertiary} />
                            </TouchableOpacity>
                        )}
                        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[currentCase.status] + '18', borderColor: STATUS_COLORS[currentCase.status] + '50', borderWidth: 1 }]}>
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: STATUS_COLORS[currentCase.status] }} />
                            <Text style={[styles.statusText, { color: STATUS_COLORS[currentCase.status] }]}>{currentCase.status}</Text>
                        </View>
                        {currentCase.caseType && (
                            <View style={styles.typeBadge}>
                                <Text style={styles.typeBadgeText}>{currentCase.caseType}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Stage Progress Stepper */}
                <View style={styles.stageContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 2 }}>
                        {CASE_STAGES.map((s, index) => {
                            const isCurrent = s.value === currentCase.stage;
                            const isCompleted = index < currentStageIndex;
                            return (
                                <TouchableOpacity
                                    key={s.value}
                                    style={[
                                        styles.stagePill,
                                        isCurrent && { backgroundColor: colors.accent + '20', borderColor: colors.accent, borderWidth: 1 },
                                        isCompleted && { backgroundColor: colors.safe + '15', borderColor: colors.safe + '40', borderWidth: 1 },
                                    ]}
                                    onPress={() => handleStageChange(s.value)}
                                    activeOpacity={0.7}
                                >
                                    <MaterialCommunityIcons
                                        name={isCurrent ? 'record-circle' : isCompleted ? 'check-circle' : 'circle-outline'}
                                        size={12}
                                        color={isCurrent ? colors.accent : isCompleted ? colors.safe : colors.textTertiary}
                                    />
                                    <Text
                                        style={[
                                            styles.stagePillText,
                                            isCurrent && { color: colors.accent, fontWeight: '700' },
                                            isCompleted && { color: colors.safe, fontWeight: '600' },
                                        ]}
                                    >
                                        {s.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            </LinearGradient>

            <ConfirmationModal
                visible={confirmModal.visible}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={() => {
                    confirmModal.onConfirm();
                    hideConfirmation();
                }}
                onCancel={hideConfirmation}
            />

            {/* Tabs */}
            <View style={styles.tabBarContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarContent}>
                    {renderTab('overview', 'Overview', 'information')}
                    {renderTab('sections', 'Sections', 'scale-balance', sections.length)}
                    {renderTab('documents', 'Docs', 'file-document-multiple', caseDocuments.length)}
                    {renderTab('deadlines', 'Deadlines', 'clock-outline', caseDeadlines.filter(d => !d.isCompleted).length)}
                    {renderTab('notes', 'Notes', 'note-text', notes.length)}
                    {renderTab('timeline', 'Timeline', 'timeline-clock', timeline.length)}
                </ScrollView>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} style={{ flex: 1 }}>
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <>
                        {/* 1. AI Legal Drafting Chambers Card */}
                        <View style={[styles.card, { backgroundColor: colors.accent + '12', borderColor: colors.accent + '35', borderWidth: 1.5 }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.s, gap: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                                    <MaterialCommunityIcons name="scale-balance" size={18} color={colors.accent} />
                                    <Text
                                        style={[styles.cardTitle, { color: colors.accent, marginBottom: 0, fontSize: 12.5, letterSpacing: 0.3 }]}
                                        numberOfLines={1}
                                        ellipsizeMode="tail"
                                    >
                                        PLEADING & DOC DRAFTER
                                    </Text>
                                </View>
                                <View style={{ backgroundColor: colors.accent + '22', paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 8, borderWidth: 1, borderColor: colors.accent + '40', flexShrink: 0 }}>
                                    <Text style={{ color: colors.accent, fontSize: 9.5, fontWeight: '800', letterSpacing: 0.4 }}>BNSS / BNS</Text>
                                </View>
                            </View>
                            <Text style={{ color: colors.textSecondary, fontSize: 12.5, lineHeight: 18, marginBottom: spacing.m }}>
                                Draft court-ready filing bundles (Petitions, Affidavits, Notices & Vakalatnama) adhering to Madras High Court & District Court formatting rules.
                            </Text>
                            <SmoothPressable
                                onPress={() => setPleadingModalVisible(true)}
                                style={{
                                    borderRadius: 10,
                                    overflow: 'hidden',
                                }}
                                haptic="medium"
                                scaleTo={0.97}
                            >
                                <LinearGradient
                                    colors={[colors.accent, colors.primary]}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 8,
                                        paddingVertical: 12,
                                    }}
                                >
                                    <MaterialCommunityIcons name="lightning-bolt" size={18} color="white" />
                                    <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>
                                        Draft Court Pleading (.docx)
                                    </Text>
                                </LinearGradient>
                            </SmoothPressable>
                        </View>

                        {/* 2. Client Info Card */}
                        <View style={styles.card}>
                            <View style={styles.cardHeaderRow}>
                                <Text style={styles.cardTitle}>CLIENT PROFILE</Text>
                                <TouchableOpacity onPress={() => navigation.navigate('EditCase', { caseId })}>
                                    <Text style={styles.editLink}>Edit</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.clientProfile}>
                                <LinearGradient
                                    colors={[colors.primary, colors.accent]}
                                    style={styles.clientAvatarLarge}
                                >
                                    <Text style={styles.clientInitials}>
                                        {clientName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                                    </Text>
                                </LinearGradient>
                                <View style={styles.clientDetails}>
                                    <Text style={styles.clientNameLarge}>{clientName}</Text>
                                    {currentCase.client?.companyName && (
                                        <View style={styles.companyRow}>
                                            <MaterialCommunityIcons name="domain" size={14} color={colors.textTertiary} />
                                            <Text style={styles.clientCompanyText}>{currentCase.client.companyName}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            <View style={{ gap: 8 }}>
                                {clientPhone ? (
                                    <TouchableOpacity style={styles.contactRow} onPress={handleCallClient} activeOpacity={0.7}>
                                        <View style={[styles.contactIconCircle, { backgroundColor: colors.safe + '18' }]}>
                                            <MaterialCommunityIcons name="phone" size={18} color={colors.safe} />
                                        </View>
                                        <View style={{ flex: 1, marginRight: 8 }}>
                                            <Text style={styles.contactRowLabel}>PHONE</Text>
                                            <Text style={styles.contactRowValue}>{clientPhone}</Text>
                                        </View>
                                        <View style={[styles.contactActionBadge, { backgroundColor: colors.safe + '20', borderColor: colors.safe + '40' }]}>
                                            <MaterialCommunityIcons name="phone-outgoing" size={13} color={colors.safe} />
                                            <Text style={[styles.contactActionText, { color: colors.safe }]}>Call</Text>
                                        </View>
                                    </TouchableOpacity>
                                ) : null}
                                {clientEmail ? (
                                    <TouchableOpacity style={styles.contactRow} onPress={handleEmailClient} activeOpacity={0.7}>
                                        <View style={[styles.contactIconCircle, { backgroundColor: colors.accent + '18' }]}>
                                            <MaterialCommunityIcons name="email" size={18} color={colors.accent} />
                                        </View>
                                        <View style={{ flex: 1, marginRight: 8 }}>
                                            <Text style={styles.contactRowLabel}>EMAIL</Text>
                                            <Text style={styles.contactRowValue} numberOfLines={1} ellipsizeMode="middle">{clientEmail}</Text>
                                        </View>
                                        <View style={[styles.contactActionBadge, { backgroundColor: colors.accent + '20', borderColor: colors.accent + '40' }]}>
                                            <MaterialCommunityIcons name="send" size={13} color={colors.accent} />
                                            <Text style={[styles.contactActionText, { color: colors.accent }]}>Email</Text>
                                        </View>
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                        </View>

                        {/* 3. Case Essentials - Grid Layout */}
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>CASE ESSENTIALS</Text>
                            <View style={styles.essentialsGrid}>
                                <View style={styles.essentialItem}>
                                    <MaterialCommunityIcons name="bank" size={20} color={colors.accent} style={styles.essentialIcon} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.essentialLabel}>Court</Text>
                                        <Text style={styles.essentialValue}>{currentCase.courtName}</Text>
                                    </View>
                                </View>
                                <View style={styles.essentialItem}>
                                    <MaterialCommunityIcons name="calendar-range" size={20} color={colors.accent} style={styles.essentialIcon} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.essentialLabel}>Filing Date</Text>
                                        <Text style={styles.essentialValue}>{dayjs(currentCase.filingDate).format('DD MMM YYYY')}</Text>
                                    </View>
                                </View>
                            </View>

                            {currentCase.description && (
                                <View style={styles.descriptionContainer}>
                                    <Text style={styles.descriptionLabel}>DESCRIPTION & FACTS BRIEF</Text>
                                    <Text style={styles.descriptionContent}>{currentCase.description}</Text>
                                </View>
                            )}
                        </View>

                        {/* 4. Applied Legal Sections */}
                        <View style={styles.card}>
                            <View style={styles.cardHeaderRow}>
                                <Text style={styles.cardTitle}>APPLIED STATUTORY SECTIONS ({sections.length})</Text>
                                <TouchableOpacity onPress={() => setSectionModalVisible(true)} style={styles.addSectionPill}>
                                    <MaterialCommunityIcons name="plus" size={14} color={colors.accent} />
                                    <Text style={styles.addSectionPillText}>Add</Text>
                                </TouchableOpacity>
                            </View>

                            {sections.length === 0 ? (
                                <Text style={styles.emptyText}>No statutory sections linked. Tap Add to add IPC/BNS sections.</Text>
                            ) : (
                                <View style={{ gap: 8 }}>
                                    {sections.map(s => (
                                        <View key={s.id} style={styles.overviewSectionCard}>
                                            <View style={styles.overviewSectionHeader}>
                                                <View style={styles.overviewSectionBadge}>
                                                    <Text style={styles.overviewSectionBadgeText}>{s.act}</Text>
                                                </View>
                                                <Text style={styles.overviewSectionTitle}>Section {s.section}</Text>
                                                <TouchableOpacity onPress={() => handleDeleteSection(s.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                                    <MaterialCommunityIcons name="close-circle-outline" size={16} color={colors.textTertiary} />
                                                </TouchableOpacity>
                                            </View>
                                            {s.description ? (
                                                <Text style={styles.overviewSectionDesc}>{s.description}</Text>
                                            ) : null}
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    </>
                )}

                {/* Sections Tab */}
                {activeTab === 'sections' && (
                    <View>
                        <TouchableOpacity
                            style={styles.addBtn}
                            onPress={() => setSectionModalVisible(true)}
                        >
                            <MaterialCommunityIcons name="plus" size={20} color={colors.accent} />
                            <Text style={styles.addBtnText}>Add Section</Text>
                        </TouchableOpacity>
                        {sections.length === 0 ? (
                            <Text style={styles.emptyText}>No sections added yet</Text>
                        ) : (
                            sections.map((section: LegalSection) => (
                                <View key={section.id} style={styles.sectionCard}>
                                    <View style={styles.sectionHeader}>
                                        <View style={styles.sectionActBadge}>
                                            <Text style={styles.sectionActText}>{section.act}</Text>
                                        </View>
                                        <Text style={styles.sectionNumberText}>Section {section.section}</Text>
                                        <TouchableOpacity onPress={() => handleDeleteSection(section.id)} style={styles.deleteBtn}>
                                            <MaterialCommunityIcons name="close" size={18} color={colors.textTertiary} />
                                        </TouchableOpacity>
                                    </View>
                                    {section.description && (
                                        <Text style={styles.sectionDescText}>{section.description}</Text>
                                    )}
                                </View>
                            ))
                        )}
                    </View>
                )}

                {/* Documents Tab */}
                {activeTab === 'documents' && (
                    <View>
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.s }}>
                            <TouchableOpacity
                                style={[styles.addBtn, { flex: 1, marginTop: 0, paddingHorizontal: 6 }]}
                                onPress={() => navigation.navigate('AddDocument', { caseId })}
                            >
                                <MaterialCommunityIcons name="plus" size={16} color={colors.accent} />
                                <Text style={styles.addBtnText} numberOfLines={1}>Add Doc</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.addBtn, { flex: 1.2, marginTop: 0, backgroundColor: 'rgba(212, 175, 55, 0.12)', borderColor: 'rgba(212, 175, 55, 0.35)', borderWidth: 1, paddingHorizontal: 6 }]}
                                onPress={() => navigation.navigate('ImageToPdf', { caseId })}
                            >
                                <MaterialCommunityIcons name="file-pdf-box" size={16} color="#D4AF37" />
                                <Text style={[styles.addBtnText, { color: '#D4AF37', fontWeight: '700' }]} numberOfLines={1}>Images to PDF</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.addBtn, { flex: 1.1, marginTop: 0, backgroundColor: colors.accent + '15', borderColor: colors.accent + '40', borderWidth: 1, paddingHorizontal: 6 }]}
                                onPress={() => setPleadingModalVisible(true)}
                            >
                                <MaterialCommunityIcons name="scale-balance" size={16} color={colors.accent} />
                                <Text style={[styles.addBtnText, { color: colors.accent, fontWeight: '700' }]} numberOfLines={1}>AI Paperbook</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Search and Sort */}
                        {caseDocuments.length > 0 && (
                            <View>
                                {/* Search Bar */}
                                <View style={styles.searchContainer}>
                                    <MaterialCommunityIcons name="magnify" size={20} color={colors.accent} style={styles.searchIcon} />
                                    <TextInput
                                        style={styles.searchInput}
                                        placeholder="Search documents by name, type, tag..."
                                        placeholderTextColor={colors.textTertiary}
                                        value={docSearchQuery}
                                        onChangeText={setDocSearchQuery}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        returnKeyType="search"
                                    />
                                    {docSearchQuery.length > 0 && (
                                        <TouchableOpacity onPress={() => setDocSearchQuery('')} style={{ padding: 4 }}>
                                            <MaterialCommunityIcons name="close-circle" size={18} color={colors.textTertiary} />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {/* Sort Options */}
                                <View style={styles.sortRow}>
                                    <TouchableOpacity
                                        style={[styles.sortChip, sortBy === 'newest' && styles.sortChipActive]}
                                        onPress={() => setSortBy('newest')}
                                    >
                                        <Text style={[styles.sortChipText, sortBy === 'newest' && styles.sortChipTextActive]}>Newest First</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.sortChip, sortBy === 'oldest' && styles.sortChipActive]}
                                        onPress={() => setSortBy('oldest')}
                                    >
                                        <Text style={[styles.sortChipText, sortBy === 'oldest' && styles.sortChipTextActive]}>Oldest First</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {filteredDocuments.length === 0 ? (
                            <Text style={styles.emptyText}>
                                {docSearchQuery ? 'No documents found' : 'No documents yet'}
                            </Text>
                        ) : (
                            filteredDocuments.map(doc => {
                                const isSelected = selectedDocIds.includes(doc.id);
                                return (
                                    <View
                                        key={doc.id}
                                        style={[styles.docItem, isSelected && styles.docItemSelected]}
                                    >
                                        <TouchableOpacity
                                            style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                                            onPress={() => {
                                                if (isSelectionMode) {
                                                    toggleDocumentSelection(doc.id);
                                                } else {
                                                    navigation.navigate('DocumentDetail', { documentId: doc.id });
                                                }
                                            }}
                                            onLongPress={() => enterSelectionMode(doc.id)}
                                        >
                                            <View style={[styles.docIcon, isSelected && styles.docIconSelected]}>
                                                {isSelected ? (
                                                    <MaterialCommunityIcons name="check" size={24} color={colors.background} />
                                                ) : (
                                                    <MaterialCommunityIcons name={getDocIcon(doc.mimeType) as any} size={24} color={colors.accent} />
                                                )}
                                            </View>
                                            <View style={styles.docInfo}>
                                                <Text style={styles.docName}>{doc.name}</Text>
                                                <Text style={styles.docMeta}>
                                                    {doc.type.replace('_', ' ')} · {dayjs(doc.createdAt).format('MMM D, YYYY')}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>

                                        {!isSelectionMode && (
                                            <TouchableOpacity
                                                style={styles.viewBtn}
                                                onPress={() => handleViewDocument(doc)}
                                            >
                                                <Text style={styles.viewBtnText}>View</Text>
                                            </TouchableOpacity>
                                        )}

                                        {!isSelectionMode && <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textTertiary} />}
                                    </View>
                                )
                            })
                        )}
                    </View>
                )}

                {/* Deadlines Tab */}
                {activeTab === 'deadlines' && (
                    <View>
                        <TouchableOpacity
                            style={styles.addBtn}
                            onPress={() => navigation.navigate('AddDeadline', { caseId })}
                        >
                            <MaterialCommunityIcons name="plus" size={20} color={colors.accent} />
                            <Text style={styles.addBtnText}>Add Deadline</Text>
                        </TouchableOpacity>
                        {caseDeadlines.length === 0 ? (
                            <Text style={styles.emptyText}>No deadlines yet</Text>
                        ) : (
                            caseDeadlines.map(deadline => (
                                <DeadlineItem
                                    key={deadline.id}
                                    deadline={deadline}
                                    onToggleComplete={() => toggleDeadline(deadline.id)}
                                    onPress={() => navigation.navigate('EditDeadline', { deadlineId: deadline.id })}
                                />
                            ))
                        )}
                    </View>
                )}

                {/* Notes Tab */}
                {activeTab === 'notes' && (
                    <View>
                        <TouchableOpacity
                            style={styles.addBtn}
                            onPress={() => setNoteModalVisible(true)}
                        >
                            <MaterialCommunityIcons name="plus" size={20} color={colors.accent} />
                            <Text style={styles.addBtnText}>Add Note</Text>
                        </TouchableOpacity>
                        {notes.length === 0 ? (
                            <Text style={styles.emptyText}>No notes yet</Text>
                        ) : (
                            notes.map((note: CaseNote) => (
                                <View key={note.id} style={styles.noteCard}>
                                    <Text style={styles.noteContent}>{note.content}</Text>
                                    <View style={styles.noteFooter}>
                                        <Text style={styles.noteDate}>{dayjs(note.createdAt).format('MMM D, YYYY h:mm A')}</Text>
                                        <TouchableOpacity onPress={() => handleDeleteNote(note.id)}>
                                            <MaterialCommunityIcons name="delete-outline" size={18} color={colors.textTertiary} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                )}

                {/* Timeline Tab */}
                {activeTab === 'timeline' && (
                    <View style={styles.timelineContainer}>
                        {timeline.length === 0 ? (
                            <Text style={styles.emptyText}>No timeline events yet</Text>
                        ) : (
                            [...timeline].reverse().map((event: TimelineEvent, index: number) => (
                                <View key={event.id} style={styles.timelineItem}>
                                    <View style={styles.timelineLine}>
                                        <View style={styles.timelineDot}>
                                            <MaterialCommunityIcons
                                                name={getTimelineIcon(event.type) as any}
                                                size={14}
                                                color={colors.accent}
                                            />
                                        </View>
                                        {index < timeline.length - 1 && <View style={styles.timelineConnector} />}
                                    </View>
                                    <View style={styles.timelineContent}>
                                        <Text style={styles.timelineTitle}>{event.title}</Text>
                                        {event.description && (
                                            <Text style={styles.timelineDesc}>{event.description}</Text>
                                        )}
                                        <Text style={styles.timelineDate}>
                                            {dayjs(event.date).format('MMM D, YYYY h:mm A')}
                                        </Text>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Note Modal */}
            <Modal
                visible={noteModalVisible}
                animationType="slide"
                transparent
                statusBarTranslucent
                onRequestClose={() => setNoteModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add Note</Text>
                        <TextInput
                            style={styles.noteInput}
                            value={newNote}
                            onChangeText={setNewNote}
                            placeholder="Enter your note..."
                            placeholderTextColor={colors.textTertiary}
                            multiline
                            numberOfLines={5}
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalBtn} onPress={() => setNoteModalVisible(false)}>
                                <Text style={styles.modalBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={handleAddNote}>
                                <Text style={[styles.modalBtnText, styles.modalBtnTextPrimary]}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Section Modal */}
            <Modal
                visible={sectionModalVisible}
                animationType="slide"
                transparent
                statusBarTranslucent
                onRequestClose={() => setSectionModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Add Legal Section</Text>

                            <Text style={styles.inputLabel}>Act</Text>
                            <TouchableOpacity style={styles.dropdown} onPress={() => setShowActPicker(true)}>
                                <Text style={styles.dropdownText}>
                                    {LEGAL_ACTS.find(a => a.value === newSectionAct)?.label || 'Select Act'}
                                </Text>
                                <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>

                            <Text style={styles.inputLabel}>Section Number</Text>
                            <TextInput
                                style={styles.input}
                                value={newSectionNumber}
                                onChangeText={setNewSectionNumber}
                                placeholder="e.g., 302, 420, 34"
                                placeholderTextColor={colors.textTertiary}
                            />

                            <Text style={styles.inputLabel}>Description (Optional)</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={newSectionDesc}
                                onChangeText={setNewSectionDesc}
                                placeholder="Brief description..."
                                placeholderTextColor={colors.textTertiary}
                                multiline
                            />

                            <View style={styles.modalActions}>
                                <TouchableOpacity style={styles.modalBtn} onPress={() => setSectionModalVisible(false)}>
                                    <Text style={styles.modalBtnText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={handleAddSection}>
                                    <Text style={[styles.modalBtnText, styles.modalBtnTextPrimary]}>Add</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Pleading Generator Modal */}
            <PleadingGeneratorModal
                visible={pleadingModalVisible}
                caseData={currentCase}
                onClose={() => setPleadingModalVisible(false)}
            />

            {/* Act Picker Modal */}
            <Modal
                visible={showActPicker}
                animationType="fade"
                transparent
                statusBarTranslucent
                onRequestClose={() => setShowActPicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.pickerModal}>
                        <Text style={styles.modalTitle}>Select Act</Text>
                        {LEGAL_ACTS.map(act => (
                            <TouchableOpacity
                                key={act.value}
                                style={[styles.pickerItem, newSectionAct === act.value && styles.pickerItemActive]}
                                onPress={() => { setNewSectionAct(act.value); setShowActPicker(false); }}
                            >
                                <Text style={[styles.pickerItemText, newSectionAct === act.value && styles.pickerItemTextActive]}>
                                    {act.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity style={styles.closeBtn} onPress={() => setShowActPicker(false)}>
                            <Text style={styles.closeBtnText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const createStyles = (colors: any, spacing: any, layout: any, modalBottomPadding: number = 24) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    errorText: { color: colors.textSecondary },
    header: { paddingHorizontal: spacing.m, paddingBottom: spacing.m },
    navBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.s },
    navActions: { flexDirection: 'row', gap: spacing.m },
    navBtn: { padding: spacing.xs },
    navBtnPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 16,
        gap: 4,
        borderWidth: 1,
        borderColor: colors.border,
    },
    deleteBtnPill: {
        borderColor: colors.critical + '40',
        backgroundColor: colors.critical + '08',
    },
    navBtnText: {
        fontSize: 11,
        fontWeight: '600',
    },
    selectionActions: {
        flexDirection: 'row',
        gap: spacing.s,
    },
    selectionPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 16,
        gap: 4,
        borderWidth: 1,
        borderColor: colors.border,
        elevation: 1,
    },
    selectionPillText: {
        fontSize: 11,
        fontWeight: '600',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    stageContainer: { marginTop: spacing.s, marginBottom: spacing.xs },
    stageLabel: { color: colors.textTertiary, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
    stageTrack: { flexDirection: 'row', alignItems: 'center' },
    stagePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: colors.surfaceHighlight + '60',
        borderWidth: 1,
        borderColor: colors.border,
    },
    stagePillText: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    tabBarContainer: { height: 50, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
    tabBarContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.s },
    tab: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.s, paddingHorizontal: spacing.m, height: '100%' },
    tabActive: { borderBottomWidth: 2, borderBottomColor: colors.accent },
    tabInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    tabLabel: { color: colors.textTertiary, fontSize: 12, fontWeight: '500' },
    tabLabelActive: { color: colors.accent, fontWeight: '700' },
    tabBadge: {
        backgroundColor: colors.surfaceHighlight,
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 10,
        marginLeft: 2,
    },
    tabBadgeActive: {
        backgroundColor: colors.accent + '25',
    },
    tabBadgeText: {
        fontSize: 10,
        color: colors.textTertiary,
        fontWeight: '600',
    },
    tabBadgeTextActive: {
        color: colors.accent,
        fontWeight: '700',
    },
    scrollContent: { padding: spacing.m, paddingBottom: 140 },
    card: {
        backgroundColor: colors.surface,
        borderRadius: layout.borderRadius,
        padding: spacing.m,
        marginBottom: spacing.m,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    cardTitle: { color: colors.textTertiary, fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: spacing.m },
    clientRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.m },
    clientAvatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: colors.accent + '15',
        borderWidth: 2,
        borderColor: colors.accent + '30',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.m,
    },
    clientInfo: { flex: 1 },
    clientName: { color: colors.textPrimary, fontSize: 18, fontWeight: '500' },
    clientCompany: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
    clientActions: { gap: spacing.s },
    clientAction: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, paddingVertical: spacing.xs },
    clientActionText: { color: colors.accent, fontSize: 14 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.s, borderBottomWidth: 1, borderBottomColor: colors.border },
    detailLabel: { color: colors.textSecondary, fontSize: 14 },
    detailValue: { color: colors.textPrimary, fontSize: 14, fontWeight: '500' },
    descriptionBox: { marginTop: spacing.m },
    descriptionText: { color: colors.textPrimary, fontSize: 14, lineHeight: 20, marginTop: spacing.xs },
    sectionsPreview: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s, alignItems: 'center' },
    sectionChip: { backgroundColor: colors.accent + '15', paddingHorizontal: spacing.s, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: colors.accent + '30' },
    sectionChipText: { color: colors.accent, fontSize: 12, fontWeight: '600' },
    moreLink: { color: colors.accent, fontSize: 12, fontWeight: '500' },
    statsRow: { flexDirection: 'row', gap: spacing.s },
    statCard: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: layout.borderRadius,
        padding: spacing.m,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.accent + '20',
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
    },
    statNumber: { color: colors.accent, fontSize: 32, fontWeight: '200', letterSpacing: -1 },
    statLabel: { color: colors.textSecondary, fontSize: 11, marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.s, backgroundColor: colors.surface, padding: spacing.m, borderRadius: layout.borderRadius, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', marginBottom: spacing.m },
    addBtnText: { color: colors.accent, fontSize: 14, fontWeight: '500' },
    emptyText: { color: colors.textTertiary, textAlign: 'center', fontStyle: 'italic', marginTop: spacing.l },
    sectionCard: { backgroundColor: colors.surface, borderRadius: layout.borderRadius, padding: spacing.m, marginBottom: spacing.s, borderWidth: 1, borderColor: colors.border },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
    sectionActBadge: { backgroundColor: colors.accent, paddingHorizontal: spacing.s, paddingVertical: 2, borderRadius: 4 },
    sectionActText: { color: colors.background, fontSize: 11, fontWeight: 'bold' },
    sectionNumberText: { color: colors.textPrimary, fontSize: 16, fontWeight: '600', flex: 1 },
    sectionDescText: { color: colors.textSecondary, fontSize: 13, marginTop: spacing.s },
    deleteBtn: { padding: spacing.xs },
    docItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.m, borderRadius: layout.borderRadius, marginBottom: spacing.s, borderWidth: 1, borderColor: colors.border },
    docIcon: { width: 40, height: 40, borderRadius: 8, backgroundColor: colors.surfaceHighlight, justifyContent: 'center', alignItems: 'center', marginRight: spacing.m },
    docInfo: { flex: 1 },
    docName: { color: colors.textPrimary, fontSize: 15, fontWeight: '500' },
    docMeta: { color: colors.textTertiary, fontSize: 12, marginTop: 2 },
    noteCard: {
        backgroundColor: colors.surface,
        borderRadius: layout.borderRadius,
        padding: spacing.m,
        marginBottom: spacing.m,
        borderWidth: 1,
        borderColor: colors.border,
        borderLeftWidth: 3,
        borderLeftColor: colors.accent,
    },
    noteContent: { color: colors.textPrimary, fontSize: 14, lineHeight: 22 },
    noteFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.m, paddingTop: spacing.s, borderTopWidth: 1, borderTopColor: colors.border },
    noteDate: { color: colors.textTertiary, fontSize: 12 },
    timelineContainer: { paddingLeft: spacing.s },
    timelineItem: { flexDirection: 'row', marginBottom: spacing.m },
    timelineLine: { alignItems: 'center', marginRight: spacing.m },
    timelineDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surfaceHighlight, justifyContent: 'center', alignItems: 'center' },
    timelineConnector: { width: 2, flex: 1, backgroundColor: colors.border, marginTop: 4 },
    timelineContent: { flex: 1, paddingBottom: spacing.m },
    timelineTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '500' },
    timelineDesc: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
    timelineDate: { color: colors.textTertiary, fontSize: 11, marginTop: 4 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: spacing.l,
        paddingTop: spacing.l,
        paddingBottom: modalBottomPadding,
    },
    modalTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '600', marginBottom: spacing.m },
    inputLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginTop: spacing.m, marginBottom: spacing.xs },
    input: { backgroundColor: colors.background, color: colors.textPrimary, padding: spacing.m, borderRadius: layout.borderRadius, fontSize: 16, borderWidth: 1, borderColor: colors.border },
    textArea: { minHeight: 60, textAlignVertical: 'top' },
    dropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.background, padding: spacing.m, borderRadius: layout.borderRadius, borderWidth: 1, borderColor: colors.border },
    dropdownText: { color: colors.textPrimary, fontSize: 16 },
    noteInput: { backgroundColor: colors.background, color: colors.textPrimary, padding: spacing.m, borderRadius: layout.borderRadius, fontSize: 16, minHeight: 120, textAlignVertical: 'top', borderWidth: 1, borderColor: colors.border },
    modalActions: { flexDirection: 'row', gap: spacing.m, marginTop: spacing.l, marginBottom: Platform.OS === 'android' ? 6 : 0, flexShrink: 0 },
    modalBtn: { flex: 1, padding: spacing.m, borderRadius: layout.borderRadius, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    modalBtnPrimary: { backgroundColor: colors.accent, borderColor: colors.accent },
    modalBtnText: { color: colors.textSecondary, fontSize: 16, fontWeight: '600' },
    modalBtnTextPrimary: { color: colors.background },
    pickerModal: { backgroundColor: colors.surface, borderRadius: layout.borderRadius, margin: spacing.l, padding: spacing.m, maxHeight: '70%' },
    pickerItem: { padding: spacing.m, borderBottomWidth: 1, borderBottomColor: colors.border },
    pickerItemActive: { backgroundColor: colors.surfaceHighlight },
    pickerItemText: { color: colors.textPrimary, fontSize: 14 },
    pickerItemTextActive: { color: colors.accent, fontWeight: '600' },
    closeBtn: { alignItems: 'center', padding: spacing.m, marginTop: spacing.s },
    closeBtnText: { color: colors.accent, fontSize: 16, fontWeight: '600' },
    selectionHeader: { position: 'absolute', top: 0, left: 0, right: 0, height: 60, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.m, zIndex: 100, elevation: 5, borderBottomWidth: 1, borderBottomColor: colors.border },
    selectionTitle: { fontSize: 18, fontWeight: '600', color: colors.textPrimary },
    selectionCloseBtn: { padding: spacing.s },
    selectionActionBtn: { padding: spacing.s },
    docItemSelected: { backgroundColor: colors.accent + '15', borderColor: colors.accent },
    docIconSelected: { backgroundColor: colors.accent },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: layout.borderRadius, paddingHorizontal: spacing.m, marginBottom: spacing.m, borderWidth: 1, borderColor: colors.border },
    searchIcon: { marginRight: spacing.s },
    searchInput: { flex: 1, paddingVertical: spacing.m, color: colors.textPrimary, fontSize: 14 },
    sortRow: { flexDirection: 'row', gap: spacing.s, marginBottom: spacing.m },
    sortChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    sortChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    sortChipText: { fontSize: 12, color: colors.textSecondary },
    sortChipTextActive: { color: colors.background, fontWeight: '600' },
    minimalHeader: {
        paddingTop: spacing.s,
        paddingBottom: spacing.s,
        paddingHorizontal: spacing.xs,
    },
    minimalTitle: {
        color: colors.textPrimary,
        fontSize: 28,
        fontWeight: '300',
        letterSpacing: -0.5,
    },
    minimalBadge: {
        alignSelf: 'flex-start',
        backgroundColor: colors.surfaceHighlight,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginTop: 6,
        borderWidth: 1,
        borderColor: colors.border,
    },
    minimalBadgeText: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    // New Hero Styles
    // Sleek Executive Hero Card Styles
    heroCard: {
        backgroundColor: colors.surface,
        borderRadius: layout.borderRadiusLarge,
        padding: spacing.m,
        marginTop: spacing.s,
        marginBottom: spacing.xs,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 3,
    },
    heroTitle: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.2,
        lineHeight: 24,
        marginBottom: spacing.s,
    },
    heroGrid: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    caseNoChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.accent + '15',
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 8,
        gap: 5,
        borderWidth: 1,
        borderColor: colors.accent + '35',
    },
    caseNoChipText: {
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        fontSize: 12,
        color: colors.accent,
        fontWeight: '700',
    },
    typeBadge: {
        backgroundColor: colors.surfaceHighlight,
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    typeBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    addSectionPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.accent + '18',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.accent + '35',
    },
    addSectionPillText: {
        color: colors.accent,
        fontSize: 12,
        fontWeight: '700',
    },
    overviewSectionCard: {
        backgroundColor: colors.surfaceHighlight + '40',
        borderRadius: layout.borderRadiusSmall,
        padding: spacing.s + 2,
        borderWidth: 1,
        borderColor: colors.border + '50',
    },
    overviewSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    overviewSectionBadge: {
        backgroundColor: colors.accent + '25',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.accent + '40',
    },
    overviewSectionBadgeText: {
        color: colors.accent,
        fontSize: 10,
        fontWeight: '800',
    },
    overviewSectionTitle: {
        color: colors.textPrimary,
        fontSize: 13,
        fontWeight: '700',
        flex: 1,
    },
    overviewSectionDesc: {
        color: colors.textSecondary,
        fontSize: 12,
        marginTop: 4,
        lineHeight: 16,
        paddingLeft: 2,
    },
    // New Client & Details Styles
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.m,
    },
    editLink: {
        color: colors.accent,
        fontSize: 13,
        fontWeight: '600',
    },
    clientProfile: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.l,
    },
    clientAvatarLarge: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.m,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    clientInitials: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
    },
    clientDetails: {
        flex: 1,
    },
    clientNameLarge: {
        color: colors.textPrimary,
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 2,
    },
    companyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    clientCompanyText: {
        color: colors.textSecondary,
        fontSize: 14,
    },
    // New Client & Contact Styles
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        padding: spacing.m,
        borderRadius: layout.borderRadius,
        borderWidth: 1,
        borderColor: colors.border,
    },
    contactIconCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.m,
    },
    contactRowLabel: {
        color: colors.textTertiary,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    contactRowValue: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: '600',
    },
    contactActionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 14,
        borderWidth: 1,
    },
    contactActionText: {
        fontSize: 12,
        fontWeight: '700',
    },
    // Quick Stats Styles
    statIconBadge: {
        width: 34,
        height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statViewText: {
        color: colors.accent,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
        marginTop: 6,
    },
    essentialsGrid: {
        gap: spacing.m,
    },
    essentialItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceHighlight + '40',
        padding: spacing.m,
        borderRadius: layout.borderRadius,
    },
    essentialIcon: {
        marginRight: spacing.m,
        width: 30, // Fixed width for alignment
    },
    essentialLabel: {
        color: colors.textTertiary,
        fontSize: 11,
        marginBottom: 2,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    essentialValue: {
        color: colors.textPrimary,
        fontSize: 15,
        fontWeight: '500',
    },
    descriptionContainer: {
        marginTop: spacing.l,
        paddingTop: spacing.m,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    descriptionLabel: {
        color: colors.textTertiary,
        fontSize: 11,
        fontWeight: '700',
        marginBottom: spacing.s,
    },
    descriptionContent: {
        color: colors.textSecondary,
        fontSize: 14,
        lineHeight: 22,
    },
    viewBtn: {
        backgroundColor: colors.surfaceHighlight,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginRight: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    viewBtnText: {
        color: colors.accent,
        fontSize: 11,
        fontWeight: '600',
    },
});
