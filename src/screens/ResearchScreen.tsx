import React, { useState, useMemo } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Alert, Modal, Linking, StatusBar, ActivityIndicator, Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, MainTabParamList } from '../navigation/types';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../theme/ThemeContext';
import { Citation, ResearchNote, LEGAL_DATABASES, LegalDatabase, ResearchType, SearchHistory } from '../models/Research';
import {
    searchAILegalPrecedents,
    AIResearchResult,
    LANDMARK_CITATIONS
} from '../services/aiLegalResearchService';
import dayjs from 'dayjs';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '../context/ToastContext';
import { SmoothPressable } from '../components/SmoothPressable';
import * as Haptics from 'expo-haptics';

type Props = CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, 'Research'>,
    NativeStackScreenProps<RootStackParamList>
>;

type TabType = 'ai_copilot' | 'citations' | 'databases' | 'notes';
type VaultFilter = 'ALL' | 'FAVORITES' | 'LANDMARKS' | 'CRIMINAL' | 'CIVIL' | 'CONSTITUTIONAL';

const EXTENDED_DATABASES = [
    { value: 'INDIAN_KANOON', label: 'Indian Kanoon', desc: 'Case laws, High Court & SC judgments', url: 'https://indiankanoon.org', icon: 'scale-balance' },
    { value: 'SUPREME_COURT', label: 'Supreme Court of India', desc: 'Official e-SCR, Judgments & Cause Lists', url: 'https://main.sci.gov.in', icon: 'bank' },
    { value: 'HIGH_COURT', label: 'Madras High Court', desc: 'Principal Seat & Madurai Bench Orders', url: 'https://www.hcmadras.tn.gov.in', icon: 'shield-star' },
    { value: 'ECOURTS', label: 'eCourts Services', desc: 'National Judicial Data Grid & CNR Tracker', url: 'https://services.ecourts.gov.in', icon: 'laptop' },
    { value: 'BARE_ACTS', label: 'India Code (Bare Acts)', desc: 'Official Central & Tamil Nadu Acts', url: 'https://www.indiacode.nic.in', icon: 'book-open-variant' },
    { value: 'SCC_ONLINE', label: 'SCC Online', desc: 'Supreme Court & High Court Case Reporter', url: 'https://www.scconline.com', icon: 'book-search' },
    { value: 'LIVELAW', label: 'LiveLaw India', desc: 'Real-time Legal News & Bench Updates', url: 'https://www.livelaw.in', icon: 'newspaper-variant-outline' },
];

export const ResearchScreen: React.FC<Props> = ({ navigation }) => {
    const { colors, spacing, layout, mode } = useTheme();
    const isDark = mode === 'dark';
    const insets = useSafeAreaInsets();
    const { showToast } = useToast();

    const modalBottomPadding = insets.bottom > 0 ? insets.bottom + 16 : (Platform.OS === 'android' ? 28 : 16);

    const [activeTab, setActiveTab] = useState<TabType>('ai_copilot');
    const [vaultFilter, setVaultFilter] = useState<VaultFilter>('ALL');
    const [search, setSearch] = useState('');
    const [aiQuery, setAiQuery] = useState('');
    const [isSearchingAI, setIsSearchingAI] = useState(false);
    const [aiResult, setAiResult] = useState<AIResearchResult | null>(null);

    const [showAddCitation, setShowAddCitation] = useState(false);
    const [showAddNote, setShowAddNote] = useState(false);
    const [selectedCitationDetail, setSelectedCitationDetail] = useState<Citation | null>(null);

    // Citation form
    const [citationType, setCitationType] = useState<ResearchType>('CASE_LAW');
    const [citationTitle, setCitationTitle] = useState('');
    const [citationRef, setCitationRef] = useState('');
    const [citationCourt, setCitationCourt] = useState('');
    const [citationYear, setCitationYear] = useState('');
    const [citationUrl, setCitationUrl] = useState('');
    const [citationSummary, setCitationSummary] = useState('');
    const [citationSource, setCitationSource] = useState<LegalDatabase>('INDIAN_KANOON');

    // Note form
    const [noteTitle, setNoteTitle] = useState('');
    const [noteContent, setNoteContent] = useState('');

    const citations = useAppStore(state => state.citations);
    const researchNotes = useAppStore(state => state.researchNotes);
    const searchHistory = useAppStore(state => state.searchHistory);
    const advocateProfile = useAppStore(state => state.advocateProfile);
    const addCitation = useAppStore(state => state.addCitation);
    const deleteCitation = useAppStore(state => state.deleteCitation);
    const toggleCitationFavorite = useAppStore(state => state.toggleCitationFavorite);
    const addResearchNote = useAppStore(state => state.addResearchNote);
    const deleteResearchNote = useAppStore(state => state.deleteResearchNote);
    const addSearchHistory = useAppStore(state => state.addSearchHistory);

    const styles = createStyles(colors, spacing, layout, isDark, modalBottomPadding);

    // Combine user citations and curated landmarks (avoiding duplicates)
    const combinedVault = useMemo(() => {
        const userCitations = citations;
        const userTitles = new Set(userCitations.map(c => c.title.toLowerCase().trim()));
        const uniqueLandmarks = LANDMARK_CITATIONS.filter(l => !userTitles.has(l.title.toLowerCase().trim()));
        return [...userCitations, ...uniqueLandmarks];
    }, [citations]);

    const filteredVault = useMemo(() => {
        let list = combinedVault;

        if (vaultFilter === 'FAVORITES') {
            list = list.filter(c => c.isFavorite);
        } else if (vaultFilter === 'LANDMARKS') {
            list = list.filter(c => c.id.startsWith('landmark-'));
        } else if (vaultFilter === 'CRIMINAL') {
            list = list.filter(c =>
                c.tags.some(t => t.toLowerCase().includes('bail') || t.toLowerCase().includes('criminal') || t.toLowerCase().includes('bns') || t.toLowerCase().includes('arrest')) ||
                c.relevantSections?.some(s => s.toLowerCase().includes('bnss') || s.toLowerCase().includes('bns') || s.toLowerCase().includes('crpc') || s.toLowerCase().includes('ipc'))
            );
        } else if (vaultFilter === 'CIVIL') {
            list = list.filter(c =>
                c.tags.some(t => t.toLowerCase().includes('civil') || t.toLowerCase().includes('cpc') || t.toLowerCase().includes('injunction')) ||
                c.relevantSections?.some(s => s.toLowerCase().includes('cpc'))
            );
        } else if (vaultFilter === 'CONSTITUTIONAL') {
            list = list.filter(c =>
                c.tags.some(t => t.toLowerCase().includes('writ') || t.toLowerCase().includes('constitution') || t.toLowerCase().includes('article')) ||
                c.relevantSections?.some(s => s.toLowerCase().includes('article'))
            );
        }

        if (!search.trim()) return list;
        const q = search.trim().toLowerCase();
        return list.filter(c =>
            c.title.toLowerCase().includes(q) ||
            c.citation.toLowerCase().includes(q) ||
            (c.court && c.court.toLowerCase().includes(q)) ||
            (c.summary && c.summary.toLowerCase().includes(q)) ||
            (c.tags && c.tags.some(t => t.toLowerCase().includes(q))) ||
            (c.relevantSections && c.relevantSections.some(s => s.toLowerCase().includes(q)))
        );
    }, [combinedVault, vaultFilter, search]);

    // Handle AI Research Query
    const handleRunAISearch = async (queryToRun?: string) => {
        const target = (queryToRun || aiQuery).trim();
        if (!target) {
            showToast({ message: 'Enter a legal proposition or section to search', type: 'error' });
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsSearchingAI(true);
        try {
            const res = await searchAILegalPrecedents(target, advocateProfile.deepseekApiKey);
            setAiResult(res);
            addSearchHistory({
                id: uuidv4(),
                query: target,
                database: 'INDIAN_KANOON',
                timestamp: new Date().toISOString(),
            });
        } catch (error: any) {
            showToast({ message: error.message || 'AI Research search failed', type: 'error' });
        } finally {
            setIsSearchingAI(false);
        }
    };

    const handleSaveAIPrecedentToVault = (precedent: AIResearchResult['precedents'][0]) => {
        const newCitation: Citation = {
            id: uuidv4(),
            type: 'CASE_LAW',
            title: precedent.title,
            citation: precedent.citation,
            court: precedent.court,
            year: precedent.year,
            judge: precedent.bench,
            summary: precedent.ratio || precedent.keyHolding,
            relevantSections: precedent.relevantSections,
            tags: ['AI Researched', ...(precedent.relevantSections || [])],
            source: precedent.source || 'INDIAN_KANOON',
            url: precedent.url,
            linkedCaseIds: [],
            isFavorite: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        addCitation(newCitation);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast({ message: 'Saved to Chamber Vault!', type: 'success' });
    };

    const handleOpenDatabase = async (db: typeof EXTENDED_DATABASES[0], searchQuery?: string) => {
        let url = db.url;
        if (searchQuery && db.value === 'INDIAN_KANOON') {
            url = `https://indiankanoon.org/search/?formInput=${encodeURIComponent(searchQuery)}`;
        } else if (searchQuery && db.value === 'SUPREME_COURT') {
            url = `https://main.sci.gov.in/judgments`;
        }

        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                showToast({ message: 'Cannot open this legal database URL', type: 'error' });
            }
        } catch {
            showToast({ message: 'Failed to launch browser', type: 'error' });
        }

        if (searchQuery) {
            addSearchHistory({
                id: uuidv4(),
                query: searchQuery,
                database: db.value as LegalDatabase,
                timestamp: new Date().toISOString(),
            });
        }
    };

    const handleAddCitation = () => {
        if (!citationTitle.trim() || !citationRef.trim()) {
            showToast({ message: 'Case title and citation reference are required', type: 'error' });
            return;
        }

        const citation: Citation = {
            id: uuidv4(),
            type: citationType,
            title: citationTitle.trim(),
            citation: citationRef.trim(),
            court: citationCourt.trim() || 'High Court of Madras',
            year: citationYear ? parseInt(citationYear) : new Date().getFullYear(),
            url: citationUrl.trim() || undefined,
            source: citationSource,
            summary: citationSummary.trim() || undefined,
            linkedCaseIds: [],
            tags: ['Custom'],
            isFavorite: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        addCitation(citation);
        resetCitationForm();
        setShowAddCitation(false);
        showToast({ message: 'Citation saved to research vault!', type: 'success' });
    };

    const handleAddNote = () => {
        if (!noteTitle.trim() || !noteContent.trim()) {
            showToast({ message: 'Title and content are required', type: 'error' });
            return;
        }

        const note: ResearchNote = {
            id: uuidv4(),
            title: noteTitle.trim(),
            content: noteContent.trim(),
            linkedCitationIds: [],
            linkedCaseIds: [],
            tags: ['Research Memo'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        addResearchNote(note);
        setNoteTitle('');
        setNoteContent('');
        setShowAddNote(false);
        showToast({ message: 'Research memo saved!', type: 'success' });
    };

    const resetCitationForm = () => {
        setCitationType('CASE_LAW');
        setCitationTitle('');
        setCitationRef('');
        setCitationCourt('');
        setCitationYear('');
        setCitationUrl('');
        setCitationSummary('');
        setCitationSource('INDIAN_KANOON');
    };

    const handleDeleteCitation = (citation: Citation) => {
        if (citation.id.startsWith('landmark-')) {
            showToast({ message: 'Landmark citations are part of the core chamber vault.', type: 'info' });
            return;
        }
        Alert.alert('Delete Citation', `Remove "${citation.title}" from your vault?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteCitation(citation.id) }
        ]);
    };

    const handleDeleteNote = (id: string) => {
        Alert.alert('Delete Note', 'Are you sure you want to delete this memo?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteResearchNote(id) }
        ]);
    };

    const quickPills = [
        'Sec 482 Quash (Bhajan Lal)',
        'Anticipatory Bail BNS (Antil)',
        'Sec 138 NI Act Notice Defect',
        'Order 39 Injunction Tripartite',
        'Rajnesh v. Neha Maintenance',
        'Art 226 Alternate Remedy',
    ];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
            
            {/* Top Navigation Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Legal Research</Text>
                    <Text style={styles.subtitle}>Precedents, BNS Statutes & AI Vault</Text>
                </View>
                <View style={styles.headerBadge}>
                    <Ionicons name="sparkles" size={13} color="#D4AF37" />
                    <Text style={styles.headerBadgeText}>AI Live</Text>
                </View>
            </View>

            {/* Segmented Top Bar */}
            <View style={styles.tabBar}>
                <SmoothPressable
                    style={[styles.tab, activeTab === 'ai_copilot' && styles.tabActive]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab('ai_copilot'); }}
                    haptic="selection"
                    scaleTo={0.95}
                >
                    <MaterialCommunityIcons name="robot-confused-outline" size={19} color={activeTab === 'ai_copilot' ? '#D4AF37' : colors.textTertiary} />
                    <Text style={[styles.tabLabel, activeTab === 'ai_copilot' && styles.tabLabelActive]}>AI Copilot</Text>
                </SmoothPressable>

                <SmoothPressable
                    style={[styles.tab, activeTab === 'citations' && styles.tabActive]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab('citations'); }}
                    haptic="selection"
                    scaleTo={0.95}
                >
                    <MaterialCommunityIcons name="bookmark-box-multiple" size={19} color={activeTab === 'citations' ? '#D4AF37' : colors.textTertiary} />
                    <Text style={[styles.tabLabel, activeTab === 'citations' && styles.tabLabelActive]}>Precedents</Text>
                </SmoothPressable>

                <SmoothPressable
                    style={[styles.tab, activeTab === 'databases' && styles.tabActive]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab('databases'); }}
                    haptic="selection"
                    scaleTo={0.95}
                >
                    <MaterialCommunityIcons name="database-search" size={19} color={activeTab === 'databases' ? '#D4AF37' : colors.textTertiary} />
                    <Text style={[styles.tabLabel, activeTab === 'databases' && styles.tabLabelActive]}>Databases</Text>
                </SmoothPressable>

                <SmoothPressable
                    style={[styles.tab, activeTab === 'notes' && styles.tabActive]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab('notes'); }}
                    haptic="selection"
                    scaleTo={0.95}
                >
                    <MaterialCommunityIcons name="note-text-outline" size={19} color={activeTab === 'notes' ? '#D4AF37' : colors.textTertiary} />
                    <Text style={[styles.tabLabel, activeTab === 'notes' && styles.tabLabelActive]}>Notes</Text>
                </SmoothPressable>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* 1. AI RESEARCH COPILOT TAB */}
                {activeTab === 'ai_copilot' && (
                    <View>
                        {/* AI Search Card */}
                        <LinearGradient
                            colors={isDark ? ['#1E2538', '#121622'] : ['#FAF6EC', '#F4ECE0']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.aiSearchHero}
                        >
                            <View style={styles.aiHeroHeader}>
                                <View style={styles.aiPillBadge}>
                                    <MaterialCommunityIcons name="scale-balance" size={14} color="#D4AF37" />
                                    <Text style={styles.aiPillBadgeText}>AI PRECEDENT ENGINE</Text>
                                </View>
                                <Text style={styles.aiHeroSubtitle}>Instant Supreme Court & High Court Ratio</Text>
                            </View>

                            <View style={styles.aiInputRow}>
                                <TextInput
                                    style={styles.aiTextInput}
                                    placeholder="Search legal issue (e.g. Anticipatory Bail)..."
                                    placeholderTextColor={colors.textTertiary}
                                    value={aiQuery}
                                    onChangeText={setAiQuery}
                                    onSubmitEditing={() => handleRunAISearch()}
                                    returnKeyType="search"
                                    numberOfLines={1}
                                    multiline={false}
                                    autoCorrect={false}
                                />
                                <SmoothPressable
                                    style={styles.aiSubmitBtn}
                                    onPress={() => handleRunAISearch()}
                                    disabled={isSearchingAI}
                                    haptic="medium"
                                    scaleTo={0.93}
                                >
                                    {isSearchingAI ? (
                                        <ActivityIndicator size="small" color="#000000" />
                                    ) : (
                                        <Ionicons name="sparkles" size={18} color="#000000" />
                                    )}
                                </SmoothPressable>
                            </View>

                            {/* Quick Suggestion Pills */}
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickPillsRow}>
                                {quickPills.map(pill => (
                                    <SmoothPressable
                                        key={pill}
                                        style={styles.quickPill}
                                        onPress={() => {
                                            setAiQuery(pill);
                                            handleRunAISearch(pill);
                                        }}
                                        haptic="light"
                                        scaleTo={0.94}
                                    >
                                        <Text style={styles.quickPillText}>{pill}</Text>
                                    </SmoothPressable>
                                ))}
                            </ScrollView>
                        </LinearGradient>

                        {/* Search Results Display */}
                        {aiResult && (
                            <View style={styles.aiResultsContainer}>
                                {/* Legal Synthesis Card */}
                                <View style={styles.resultCard}>
                                    <View style={styles.resultCardHeader}>
                                        <Ionicons name="bulb" size={16} color="#D4AF37" />
                                        <Text style={styles.resultCardTitle}>LEGAL SYNTHESIS & RATIO</Text>
                                    </View>
                                    <Text style={styles.resultSummaryText}>{aiResult.summary}</Text>
                                </View>

                                {/* Precedent Judgments */}
                                <View style={styles.sectionHeaderRow}>
                                    <Text style={styles.sectionTitle}>AUTHORITATIVE PRECEDENTS ({aiResult.precedents.length})</Text>
                                </View>

                                {aiResult.precedents.map((p, idx) => (
                                    <View key={p.id || idx} style={styles.precedentCard}>
                                        <View style={styles.precedentTopRow}>
                                            <View style={styles.courtBadge}>
                                                <Text style={styles.courtBadgeText}>{p.court}</Text>
                                            </View>
                                            <Text style={styles.precedentYear}>{p.year}</Text>
                                        </View>

                                        <Text style={styles.precedentTitle}>{p.title}</Text>
                                        <Text style={styles.precedentCitation}>{p.citation}</Text>
                                        {p.bench && <Text style={styles.precedentBench}>Bench: {p.bench}</Text>}

                                        <View style={styles.ratioBox}>
                                            <Text style={styles.ratioLabel}>RATIO DECIDENDI:</Text>
                                            <Text style={styles.ratioText}>{p.ratio}</Text>
                                        </View>

                                        <View style={styles.precedentActionsRow}>
                                            {p.url && (
                                                <SmoothPressable
                                                    style={styles.precedentActionBtn}
                                                    onPress={() => p.url && Linking.openURL(p.url)}
                                                    haptic="light"
                                                    scaleTo={0.95}
                                                >
                                                    <Ionicons name="open-outline" size={15} color={colors.textSecondary} />
                                                    <Text style={styles.precedentActionText}>Read Judgment</Text>
                                                </SmoothPressable>
                                            )}

                                            <SmoothPressable
                                                style={[styles.precedentActionBtn, styles.precedentSaveBtn]}
                                                onPress={() => handleSaveAIPrecedentToVault(p)}
                                                haptic="medium"
                                                scaleTo={0.95}
                                            >
                                                <Ionicons name="bookmark" size={15} color="#D4AF37" />
                                                <Text style={[styles.precedentActionText, { color: '#D4AF37', fontWeight: '700' }]}>
                                                    Save to Vault
                                                </Text>
                                            </SmoothPressable>
                                        </View>
                                    </View>
                                ))}

                                {/* Applicable Statutes */}
                                {aiResult.applicableStatutes.length > 0 && (
                                    <View style={styles.resultCard}>
                                        <View style={styles.resultCardHeader}>
                                            <Ionicons name="book" size={16} color="#3B82F6" />
                                            <Text style={styles.resultCardTitle}>APPLICABLE STATUTES & BNS CROSS-REF</Text>
                                        </View>
                                        {aiResult.applicableStatutes.map((s, idx) => (
                                            <View key={idx} style={styles.statuteRow}>
                                                <Text style={styles.statuteTitle}>{s.act} — {s.section}</Text>
                                                {s.bnsCrossReference && (
                                                    <Text style={styles.statuteCrossref}>{s.bnsCrossReference}</Text>
                                                )}
                                                <Text style={styles.statuteKeyProvision}>{s.keyProvision}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {/* Chamber Advocacy Tips */}
                                {aiResult.practicalAdvocacyTips.length > 0 && (
                                    <View style={styles.resultCard}>
                                        <View style={styles.resultCardHeader}>
                                            <Ionicons name="shield-checkmark" size={16} color="#10B981" />
                                            <Text style={styles.resultCardTitle}>CHAMBER ADVOCACY GUIDANCE</Text>
                                        </View>
                                        {aiResult.practicalAdvocacyTips.map((tip, idx) => (
                                            <View key={idx} style={styles.tipRow}>
                                                <Ionicons name="checkmark-circle" size={14} color="#10B981" style={{ marginTop: 2 }} />
                                                <Text style={styles.tipText}>{tip}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                )}

                {/* 2. PRECEDENT VAULT TAB */}
                {activeTab === 'citations' && (
                    <View>
                        {/* Search Input */}
                        <View style={styles.searchBarContainer}>
                            <MaterialCommunityIcons name="magnify" size={18} color="#D4AF37" style={styles.searchBarIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search precedents, court, sections..."
                                placeholderTextColor={colors.textTertiary}
                                value={search}
                                onChangeText={setSearch}
                                autoCapitalize="none"
                                autoCorrect={false}
                                returnKeyType="search"
                            />
                            {search.length > 0 && (
                                <SmoothPressable onPress={() => setSearch('')} style={styles.searchClearBtn} haptic="light">
                                    <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
                                </SmoothPressable>
                            )}
                        </View>

                        {/* Filter Pills */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vaultFiltersRow}>
                            {(['ALL', 'FAVORITES', 'LANDMARKS', 'CRIMINAL', 'CIVIL', 'CONSTITUTIONAL'] as VaultFilter[]).map(filter => {
                                const active = vaultFilter === filter;
                                const labelMap: Record<VaultFilter, string> = {
                                    ALL: `All (${combinedVault.length})`,
                                    FAVORITES: '⭐ Favorites',
                                    LANDMARKS: '🏛️ Landmarks',
                                    CRIMINAL: 'Criminal (BNS)',
                                    CIVIL: 'Civil (CPC)',
                                    CONSTITUTIONAL: 'Constitutional',
                                };
                                return (
                                    <SmoothPressable
                                        key={filter}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setVaultFilter(filter);
                                        }}
                                        style={[styles.vaultFilterPill, active && styles.vaultFilterPillActive]}
                                        haptic="light"
                                        scaleTo={0.94}
                                    >
                                        <Text style={[styles.vaultFilterPillText, active && styles.vaultFilterPillTextActive]}>
                                            {labelMap[filter]}
                                        </Text>
                                    </SmoothPressable>
                                );
                            })}
                        </ScrollView>

                        {/* Add Citation Button */}
                        <SmoothPressable
                            style={styles.addBtn}
                            onPress={() => setShowAddCitation(true)}
                            haptic="medium"
                            scaleTo={0.97}
                        >
                            <Ionicons name="add-circle" size={19} color="#D4AF37" />
                            <Text style={styles.addBtnText}>Add Custom Precedent Citation</Text>
                        </SmoothPressable>

                        {/* Citations List */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>PRECEDENT VAULT ({filteredVault.length})</Text>

                            {filteredVault.map(citation => {
                                const isLandmark = citation.id.startsWith('landmark-');
                                return (
                                    <SmoothPressable
                                        key={citation.id}
                                        style={styles.citationCard}
                                        onPress={() => setSelectedCitationDetail(citation)}
                                        onLongPress={() => handleDeleteCitation(citation)}
                                        haptic="light"
                                        scaleTo={0.98}
                                    >
                                        <View style={styles.citationHeader}>
                                            <View style={styles.citationTagRow}>
                                                <View style={[styles.typeBadge, isLandmark && { backgroundColor: 'rgba(212, 175, 55, 0.15)', borderColor: '#D4AF37' }]}>
                                                    <Text style={[styles.typeBadgeText, isLandmark && { color: '#D4AF37' }]}>
                                                        {isLandmark ? 'LANDMARK' : citation.type.replace('_', ' ')}
                                                    </Text>
                                                </View>
                                                {citation.court && (
                                                    <Text style={styles.citationCourtText}>{citation.court}</Text>
                                                )}
                                            </View>

                                            <SmoothPressable
                                                onPress={() => toggleCitationFavorite(citation.id)}
                                                haptic="selection"
                                                hitSlop={8}
                                                scaleTo={0.88}
                                            >
                                                <MaterialCommunityIcons
                                                    name={citation.isFavorite ? "star" : "star-outline"}
                                                    size={20}
                                                    color={citation.isFavorite ? colors.warning : colors.textTertiary}
                                                />
                                            </SmoothPressable>
                                        </View>

                                        <Text style={styles.citationTitle}>{citation.title}</Text>
                                        <Text style={styles.citationRef}>{citation.citation}</Text>

                                        {citation.summary && (
                                            <Text style={styles.citationSummary} numberOfLines={2}>{citation.summary}</Text>
                                        )}

                                        {citation.relevantSections && citation.relevantSections.length > 0 && (
                                            <View style={styles.sectionPillsRow}>
                                                {citation.relevantSections.slice(0, 3).map((sec, idx) => (
                                                    <View key={idx} style={styles.sectionPill}>
                                                        <Text style={styles.sectionPillText}>{sec}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        )}
                                    </SmoothPressable>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* 3. LEGAL DATABASES TAB */}
                {activeTab === 'databases' && (
                    <View>
                        {/* Direct Search Card */}
                        <View style={styles.quickSearchCard}>
                            <Text style={styles.quickSearchTitle}>Indian Kanoon Direct Query</Text>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search case laws, sections, judges..."
                                placeholderTextColor={colors.textTertiary}
                                value={search}
                                onChangeText={setSearch}
                                onSubmitEditing={() => handleOpenDatabase(EXTENDED_DATABASES[0], search)}
                            />
                            <SmoothPressable
                                style={styles.quickSearchBtn}
                                onPress={() => handleOpenDatabase(EXTENDED_DATABASES[0], search)}
                                haptic="medium"
                                scaleTo={0.96}
                            >
                                <MaterialCommunityIcons name="magnify" size={18} color="#000000" />
                                <Text style={styles.quickSearchBtnText}>Search Indian Kanoon</Text>
                            </SmoothPressable>
                        </View>

                        <Text style={styles.sectionTitle}>JUDICIAL & STATUTE PORTALS</Text>
                        {EXTENDED_DATABASES.map(db => (
                            <SmoothPressable
                                key={db.value}
                                style={styles.databaseCard}
                                onPress={() => handleOpenDatabase(db)}
                                haptic="light"
                                scaleTo={0.98}
                            >
                                <View style={styles.databaseIcon}>
                                    <MaterialCommunityIcons name={db.icon as any} size={22} color="#D4AF37" />
                                </View>
                                <View style={styles.databaseInfo}>
                                    <Text style={styles.databaseName}>{db.label}</Text>
                                    <Text style={styles.databaseDesc}>{db.desc}</Text>
                                    <Text style={styles.databaseUrl} numberOfLines={1}>{db.url}</Text>
                                </View>
                                <MaterialCommunityIcons name="open-in-new" size={18} color={colors.textTertiary} />
                            </SmoothPressable>
                        ))}
                    </View>
                )}

                {/* 4. RESEARCH NOTES TAB */}
                {activeTab === 'notes' && (
                    <View>
                        <SmoothPressable
                            style={styles.addBtn}
                            onPress={() => setShowAddNote(true)}
                            haptic="medium"
                            scaleTo={0.97}
                        >
                            <MaterialCommunityIcons name="plus-circle" size={20} color="#D4AF37" />
                            <Text style={styles.addBtnText}>Add Research Memo</Text>
                        </SmoothPressable>

                        {researchNotes.length === 0 ? (
                            <View style={styles.emptyCardBox}>
                                <MaterialCommunityIcons name="note-text-outline" size={40} color={colors.textTertiary} />
                                <Text style={styles.emptyCardText}>No research notes saved yet.</Text>
                                <Text style={styles.emptyCardSub}>Document legal strategies, case research, and citations.</Text>
                            </View>
                        ) : (
                            researchNotes.map(note => (
                                <SmoothPressable
                                    key={note.id}
                                    style={styles.noteCard}
                                    onLongPress={() => handleDeleteNote(note.id)}
                                    haptic="light"
                                    scaleTo={0.98}
                                >
                                    <View style={styles.noteHeaderRow}>
                                        <Text style={styles.noteTitle}>{note.title}</Text>
                                        <Text style={styles.noteMeta}>{dayjs(note.createdAt).format('MMM D, YYYY')}</Text>
                                    </View>
                                    <Text style={styles.noteContent}>{note.content}</Text>
                                </SmoothPressable>
                            ))
                        )}
                    </View>
                )}

            </ScrollView>

            {/* Citation Details View Modal */}
            {selectedCitationDetail && (
                <Modal
                    visible={!!selectedCitationDetail}
                    animationType="slide"
                    transparent
                    statusBarTranslucent
                    onRequestClose={() => setSelectedCitationDetail(null)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
                                <View style={styles.detailModalHeader}>
                                    <View style={styles.courtBadge}>
                                        <Text style={styles.courtBadgeText}>{selectedCitationDetail.court || 'Court Precedent'}</Text>
                                    </View>
                                    <SmoothPressable onPress={() => setSelectedCitationDetail(null)} hitSlop={10}>
                                        <Ionicons name="close" size={24} color={colors.textPrimary} />
                                    </SmoothPressable>
                                </View>

                                <Text style={styles.detailTitle}>{selectedCitationDetail.title}</Text>
                                <Text style={styles.detailCitation}>{selectedCitationDetail.citation}</Text>
                                {selectedCitationDetail.judge && (
                                    <Text style={styles.detailJudge}>Bench: {selectedCitationDetail.judge}</Text>
                                )}

                                {selectedCitationDetail.summary && (
                                    <View style={styles.detailSectionBox}>
                                        <Text style={styles.detailSectionHeader}>RATIO DECIDENDI & HOLDING</Text>
                                        <Text style={styles.detailSummaryText}>{selectedCitationDetail.summary}</Text>
                                    </View>
                                )}

                                {selectedCitationDetail.keyPoints && selectedCitationDetail.keyPoints.length > 0 && (
                                    <View style={styles.detailSectionBox}>
                                        <Text style={styles.detailSectionHeader}>KEY LEGAL PRINCIPLES</Text>
                                        {selectedCitationDetail.keyPoints.map((point, idx) => (
                                            <View key={idx} style={styles.tipRow}>
                                                <Ionicons name="ellipse" size={6} color="#D4AF37" style={{ marginTop: 6 }} />
                                                <Text style={styles.detailPointText}>{point}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                <View style={styles.modalActions}>
                                    {selectedCitationDetail.url && (
                                        <SmoothPressable
                                            style={[styles.modalBtn, styles.modalBtnPrimary]}
                                            onPress={() => selectedCitationDetail.url && Linking.openURL(selectedCitationDetail.url)}
                                        >
                                            <Ionicons name="open-outline" size={16} color="#000000" />
                                            <Text style={styles.modalBtnTextPrimary}>Open Full Law Report</Text>
                                        </SmoothPressable>
                                    )}
                                    <SmoothPressable
                                        style={styles.modalBtn}
                                        onPress={() => setSelectedCitationDetail(null)}
                                    >
                                        <Text style={styles.modalBtnText}>Close</Text>
                                    </SmoothPressable>
                                </View>
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
            )}

            {/* Add Custom Citation Modal */}
            <Modal
                visible={showAddCitation}
                animationType="slide"
                transparent
                statusBarTranslucent
                onRequestClose={() => { resetCitationForm(); setShowAddCitation(false); }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
                            <Text style={styles.modalTitle}>Add Custom Precedent Citation</Text>

                            <Text style={styles.inputLabel}>Type</Text>
                            <View style={styles.typeRow}>
                                {(['CASE_LAW', 'STATUTE', 'ARTICLE'] as ResearchType[]).map(type => (
                                    <TouchableOpacity
                                        key={type}
                                        style={[styles.typeChip, citationType === type && styles.typeChipActive]}
                                        onPress={() => setCitationType(type)}
                                    >
                                        <Text style={[styles.typeChipText, citationType === type && styles.typeChipTextActive]}>
                                            {type.replace('_', ' ')}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.inputLabel}>Title / Case Name *</Text>
                            <TextInput
                                style={styles.input}
                                value={citationTitle}
                                onChangeText={setCitationTitle}
                                placeholder="e.g., Satender Kumar Antil v. CBI"
                                placeholderTextColor={colors.textTertiary}
                            />

                            <Text style={styles.inputLabel}>Citation Reference *</Text>
                            <TextInput
                                style={styles.input}
                                value={citationRef}
                                onChangeText={setCitationRef}
                                placeholder="e.g., (2022) 10 SCC 51 / AIR 2022 SC 3386"
                                placeholderTextColor={colors.textTertiary}
                            />

                            <View style={styles.row}>
                                <View style={styles.halfInput}>
                                    <Text style={styles.inputLabel}>Court</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={citationCourt}
                                        onChangeText={setCitationCourt}
                                        placeholder="Supreme Court / Madras HC"
                                        placeholderTextColor={colors.textTertiary}
                                    />
                                </View>
                                <View style={styles.halfInput}>
                                    <Text style={styles.inputLabel}>Year</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={citationYear}
                                        onChangeText={setCitationYear}
                                        placeholder="2022"
                                        keyboardType="numeric"
                                        placeholderTextColor={colors.textTertiary}
                                    />
                                </View>
                            </View>

                            <Text style={styles.inputLabel}>URL (Optional)</Text>
                            <TextInput
                                style={styles.input}
                                value={citationUrl}
                                onChangeText={setCitationUrl}
                                placeholder="https://indiankanoon.org/..."
                                placeholderTextColor={colors.textTertiary}
                            />

                            <Text style={styles.inputLabel}>Summary / Ratio Decidendi</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={citationSummary}
                                onChangeText={setCitationSummary}
                                placeholder="Core legal holding of the judgment..."
                                placeholderTextColor={colors.textTertiary}
                                multiline
                            />

                            <View style={styles.modalActions}>
                                <TouchableOpacity style={styles.modalBtn} onPress={() => { resetCitationForm(); setShowAddCitation(false); }}>
                                    <Text style={styles.modalBtnText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={handleAddCitation}>
                                    <Text style={styles.modalBtnTextPrimary}>Save to Vault</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Add Note Modal */}
            <Modal
                visible={showAddNote}
                animationType="slide"
                transparent
                statusBarTranslucent
                onRequestClose={() => setShowAddNote(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
                            <Text style={styles.modalTitle}>Add Research Memo</Text>

                            <Text style={styles.inputLabel}>Title *</Text>
                            <TextInput
                                style={styles.input}
                                value={noteTitle}
                                onChangeText={setNoteTitle}
                                placeholder="e.g., Sec 482 Quash Grounds for Crime No. 45"
                                placeholderTextColor={colors.textTertiary}
                            />

                            <Text style={styles.inputLabel}>Content *</Text>
                            <TextInput
                                style={[styles.input, { minHeight: 140, textAlignVertical: 'top' }]}
                                value={noteContent}
                                onChangeText={setNoteContent}
                                placeholder="Document your legal propositions, authorities, and case notes..."
                                placeholderTextColor={colors.textTertiary}
                                multiline
                            />

                            <View style={styles.modalActions}>
                                <TouchableOpacity style={styles.modalBtn} onPress={() => setShowAddNote(false)}>
                                    <Text style={styles.modalBtnText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={handleAddNote}>
                                    <Text style={styles.modalBtnTextPrimary}>Save Memo</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
};

const createStyles = (colors: any, spacing: any, layout: any, isDark: boolean, modalBottomPadding: number) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.m,
        paddingTop: spacing.s,
        paddingBottom: spacing.s,
    },
    title: {
        color: colors.textPrimary,
        fontSize: 26,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    subtitle: {
        color: colors.textSecondary,
        fontSize: 12.5,
        fontWeight: '600',
        marginTop: 2,
    },
    headerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4.5,
        backgroundColor: isDark ? 'rgba(212, 175, 55, 0.14)' : 'rgba(212, 175, 55, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.35)',
    },
    headerBadgeText: {
        color: '#D4AF37',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.4,
    },
    tabBar: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.surface,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        gap: 3,
    },
    tabActive: {
        borderBottomWidth: 2.5,
        borderBottomColor: '#D4AF37',
    },
    tabLabel: {
        color: colors.textTertiary,
        fontSize: 11.5,
        fontWeight: '600',
    },
    tabLabelActive: {
        color: isDark ? '#FFFFFF' : '#000000',
        fontWeight: '800',
    },
    content: {
        padding: spacing.m,
        paddingBottom: 130,
    },
    aiSearchHero: {
        borderRadius: 20,
        padding: 16,
        marginBottom: spacing.l,
        borderWidth: 1.5,
        borderColor: isDark ? 'rgba(212, 175, 55, 0.35)' : 'rgba(212, 175, 55, 0.45)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    aiHeroHeader: {
        marginBottom: 12,
    },
    aiPillBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        alignSelf: 'flex-start',
        backgroundColor: isDark ? 'rgba(212, 175, 55, 0.15)' : 'rgba(212, 175, 55, 0.18)',
        paddingHorizontal: 8,
        paddingVertical: 3.5,
        borderRadius: 6,
        marginBottom: 4,
    },
    aiPillBadgeText: {
        color: '#D4AF37',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.8,
    },
    aiHeroSubtitle: {
        color: colors.textPrimary,
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    aiInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    aiTextInput: {
        flex: 1,
        height: 48,
        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.4)' : '#FFFFFF',
        color: colors.textPrimary,
        paddingHorizontal: 14,
        paddingVertical: Platform.OS === 'ios' ? 12 : 0,
        borderRadius: 12,
        fontSize: 13.5,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
        textAlignVertical: 'center',
        includeFontPadding: false,
    },
    aiSubmitBtn: {
        backgroundColor: '#D4AF37',
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickPillsRow: {
        flexDirection: 'row',
        gap: 6,
        paddingVertical: 2,
    },
    quickPill: {
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
        paddingHorizontal: 11,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
    },
    quickPillText: {
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: '600',
    },
    aiResultsContainer: {
        gap: 12,
    },
    resultCard: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.border,
    },
    resultCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    resultCardTitle: {
        color: colors.textPrimary,
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.6,
    },
    resultSummaryText: {
        color: colors.textPrimary,
        fontSize: 13,
        lineHeight: 19,
    },
    precedentCard: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 15,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 6,
    },
    precedentTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    courtBadge: {
        backgroundColor: isDark ? 'rgba(212, 175, 55, 0.14)' : 'rgba(212, 175, 55, 0.12)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.3)',
    },
    courtBadgeText: {
        color: '#D4AF37',
        fontSize: 10.5,
        fontWeight: '800',
    },
    precedentYear: {
        color: colors.textTertiary,
        fontSize: 12,
        fontWeight: '600',
    },
    precedentTitle: {
        color: colors.textPrimary,
        fontSize: 15,
        fontWeight: '800',
        marginTop: 2,
    },
    precedentCitation: {
        color: '#3B82F6',
        fontSize: 12.5,
        fontWeight: '700',
    },
    precedentBench: {
        color: colors.textSecondary,
        fontSize: 11.5,
        fontStyle: 'italic',
    },
    ratioBox: {
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
        padding: 10,
        borderRadius: 10,
        marginTop: 4,
    },
    ratioLabel: {
        color: colors.textTertiary,
        fontSize: 9.5,
        fontWeight: '800',
        letterSpacing: 0.6,
        marginBottom: 2,
    },
    ratioText: {
        color: colors.textSecondary,
        fontSize: 12,
        lineHeight: 17,
    },
    precedentActionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 8,
        marginTop: 6,
        paddingTop: 8,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border,
    },
    precedentActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
    },
    precedentSaveBtn: {
        backgroundColor: isDark ? 'rgba(212, 175, 55, 0.14)' : 'rgba(212, 175, 55, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.3)',
    },
    precedentActionText: {
        color: colors.textSecondary,
        fontSize: 11.5,
        fontWeight: '600',
    },
    statuteRow: {
        paddingVertical: 6,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
    },
    statuteTitle: {
        color: colors.textPrimary,
        fontSize: 13,
        fontWeight: '700',
    },
    statuteCrossref: {
        color: '#D4AF37',
        fontSize: 11,
        fontWeight: '600',
        marginTop: 1,
    },
    statuteKeyProvision: {
        color: colors.textSecondary,
        fontSize: 11.5,
        marginTop: 2,
    },
    tipRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        paddingVertical: 3,
    },
    tipText: {
        color: colors.textSecondary,
        fontSize: 12,
        flex: 1,
        lineHeight: 17,
    },
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 14,
        marginBottom: 10,
        height: 46,
    },
    searchBarIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        color: colors.textPrimary,
        fontSize: 13.5,
        height: '100%',
        padding: 0,
    },
    searchClearBtn: {
        padding: 4,
    },
    vaultFiltersRow: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 12,
    },
    vaultFilterPill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    vaultFilterPillActive: {
        backgroundColor: '#D4AF37',
        borderColor: '#D4AF37',
    },
    vaultFilterPillText: {
        color: colors.textSecondary,
        fontSize: 11.5,
        fontWeight: '600',
    },
    vaultFilterPillTextActive: {
        color: '#000000',
        fontWeight: '800',
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: isDark ? 'rgba(212, 175, 55, 0.08)' : 'rgba(212, 175, 55, 0.06)',
        paddingVertical: 11,
        borderRadius: 12,
        borderWidth: 1.2,
        borderColor: 'rgba(212, 175, 55, 0.4)',
        borderStyle: 'dashed',
        marginBottom: spacing.l,
    },
    addBtnText: {
        color: '#D4AF37',
        fontSize: 13,
        fontWeight: '700',
    },
    section: {
        marginBottom: spacing.l,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    sectionTitle: {
        color: colors.textTertiary,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    citationCard: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: colors.border,
    },
    citationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    citationTagRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    typeBadge: {
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
        paddingHorizontal: 7,
        paddingVertical: 2.5,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: colors.border,
    },
    typeBadgeText: {
        color: colors.textSecondary,
        fontSize: 9.5,
        fontWeight: '800',
        letterSpacing: 0.4,
    },
    citationCourtText: {
        color: colors.textTertiary,
        fontSize: 11,
        fontWeight: '600',
    },
    citationTitle: {
        color: colors.textPrimary,
        fontSize: 14.5,
        fontWeight: '700',
        marginBottom: 2,
    },
    citationRef: {
        color: '#3B82F6',
        fontSize: 12.5,
        fontWeight: '700',
    },
    citationSummary: {
        color: colors.textSecondary,
        fontSize: 12,
        lineHeight: 16.5,
        marginTop: 6,
    },
    sectionPillsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 5,
        marginTop: 8,
    },
    sectionPill: {
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 4,
    },
    sectionPillText: {
        color: colors.textTertiary,
        fontSize: 10,
        fontWeight: '600',
    },
    quickSearchCard: {
        backgroundColor: colors.surface,
        borderRadius: 18,
        padding: 16,
        marginBottom: spacing.l,
        borderWidth: 1,
        borderColor: colors.border,
    },
    quickSearchTitle: {
        color: colors.textPrimary,
        fontSize: 14.5,
        fontWeight: '700',
        marginBottom: 10,
    },
    quickSearchBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#D4AF37',
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: 8,
    },
    quickSearchBtnText: {
        color: '#000000',
        fontSize: 13.5,
        fontWeight: '800',
    },
    databaseCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: 14,
        borderRadius: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    databaseIcon: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: isDark ? 'rgba(212, 175, 55, 0.12)' : 'rgba(212, 175, 55, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    databaseInfo: {
        flex: 1,
        paddingRight: 6,
    },
    databaseName: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: '700',
    },
    databaseDesc: {
        color: colors.textSecondary,
        fontSize: 11.5,
        marginTop: 1,
    },
    databaseUrl: {
        color: colors.textTertiary,
        fontSize: 10.5,
        marginTop: 2,
    },
    noteCard: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: colors.border,
    },
    noteHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    noteTitle: {
        color: colors.textPrimary,
        fontSize: 14.5,
        fontWeight: '700',
    },
    noteMeta: {
        color: colors.textTertiary,
        fontSize: 11,
        fontWeight: '500',
    },
    noteContent: {
        color: colors.textSecondary,
        fontSize: 12.5,
        lineHeight: 18,
    },
    emptyCardBox: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        gap: 6,
    },
    emptyCardText: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: '700',
    },
    emptyCardSub: {
        color: colors.textTertiary,
        fontSize: 12,
        textAlign: 'center',
        maxWidth: 240,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: modalBottomPadding,
        maxHeight: '90%',
    },
    modalTitle: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 12,
    },
    detailModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    detailTitle: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 4,
    },
    detailCitation: {
        color: '#3B82F6',
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 2,
    },
    detailJudge: {
        color: colors.textSecondary,
        fontSize: 12,
        fontStyle: 'italic',
        marginBottom: 12,
    },
    detailSectionBox: {
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
        padding: 12,
        borderRadius: 12,
        marginBottom: 12,
    },
    detailSectionHeader: {
        color: colors.textTertiary,
        fontSize: 10.5,
        fontWeight: '800',
        letterSpacing: 0.6,
        marginBottom: 6,
    },
    detailSummaryText: {
        color: colors.textPrimary,
        fontSize: 13,
        lineHeight: 19,
    },
    detailPointText: {
        color: colors.textSecondary,
        fontSize: 12.5,
        lineHeight: 18,
        flex: 1,
    },
    inputLabel: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '700',
        marginTop: 12,
        marginBottom: 4,
    },
    input: {
        backgroundColor: isDark ? '#141824' : '#F3F4F6',
        color: colors.textPrimary,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        fontSize: 14,
        borderWidth: 1,
        borderColor: colors.border,
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    row: {
        flexDirection: 'row',
        gap: 10,
    },
    halfInput: {
        flex: 1,
    },
    typeRow: {
        flexDirection: 'row',
        gap: 8,
    },
    typeChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    typeChipActive: {
        backgroundColor: '#D4AF37',
        borderColor: '#D4AF37',
    },
    typeChipText: {
        color: colors.textSecondary,
        fontSize: 11.5,
        fontWeight: '600',
    },
    typeChipTextActive: {
        color: '#000000',
        fontWeight: '800',
    },
    modalActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 20,
        marginBottom: Platform.OS === 'android' ? 8 : 4,
    },
    modalBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    modalBtnPrimary: {
        backgroundColor: '#D4AF37',
        borderColor: '#D4AF37',
    },
    modalBtnText: {
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: '700',
    },
    modalBtnTextPrimary: {
        color: '#000000',
        fontSize: 14,
        fontWeight: '800',
    },
});

