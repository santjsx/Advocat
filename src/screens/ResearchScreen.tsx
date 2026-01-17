import React, { useState, useMemo } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Alert, Modal, Linking, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, MainTabParamList } from '../navigation/types';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../theme/ThemeContext';
import { Citation, ResearchNote, LEGAL_DATABASES, LegalDatabase, ResearchType, SearchHistory } from '../models/Research';
import dayjs from 'dayjs';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

type Props = CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, 'Research'>,
    NativeStackScreenProps<RootStackParamList>
>;

type TabType = 'citations' | 'databases' | 'notes';

export const ResearchScreen: React.FC<Props> = ({ navigation }) => {
    const { colors, spacing, layout, mode } = useTheme();
    const [activeTab, setActiveTab] = useState<TabType>('citations');
    const [search, setSearch] = useState('');
    const [showAddCitation, setShowAddCitation] = useState(false);
    const [showAddNote, setShowAddNote] = useState(false);

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
    const addCitation = useAppStore(state => state.addCitation);
    const deleteCitation = useAppStore(state => state.deleteCitation);
    const toggleCitationFavorite = useAppStore(state => state.toggleCitationFavorite);
    const addResearchNote = useAppStore(state => state.addResearchNote);
    const deleteResearchNote = useAppStore(state => state.deleteResearchNote);
    const addSearchHistory = useAppStore(state => state.addSearchHistory);

    const styles = createStyles(colors, spacing, layout);

    const filteredCitations = useMemo(() => {
        if (!search) return citations;
        const q = search.toLowerCase();
        return citations.filter(c =>
            c.title.toLowerCase().includes(q) ||
            c.citation.toLowerCase().includes(q) ||
            c.court?.toLowerCase().includes(q) ||
            c.tags.some(t => t.toLowerCase().includes(q))
        );
    }, [citations, search]);

    const favoriteCitations = useMemo(() => {
        return citations.filter(c => c.isFavorite);
    }, [citations]);

    const handleOpenDatabase = async (db: typeof LEGAL_DATABASES[0], searchQuery?: string) => {
        let url = db.url;

        if (db.value === 'OTHER' || !url) {
            url = 'https://www.google.com/search?q=' + encodeURIComponent(searchQuery || 'legal research');
        } else if (searchQuery && db.value === 'INDIAN_KANOON') {
            url = `https://indiankanoon.org/search/?formInput=${encodeURIComponent(searchQuery)}`;
        }

        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                Alert.alert("Error", "Cannot open this database URL");
            }
        } catch (error) {
            Alert.alert("Error", "An unexpected error occurred while opening the link");
        }

        if (searchQuery) {
            addSearchHistory({
                id: uuidv4(),
                query: searchQuery,
                database: db.value,
                timestamp: new Date().toISOString(),
            });
        }
    };

    const handleAddCitation = () => {
        if (!citationTitle.trim() || !citationRef.trim()) {
            Alert.alert('Error', 'Title and citation reference are required');
            return;
        }

        const citation: Citation = {
            id: uuidv4(),
            type: citationType,
            title: citationTitle.trim(),
            citation: citationRef.trim(),
            court: citationCourt.trim() || undefined,
            year: citationYear ? parseInt(citationYear) : undefined,
            url: citationUrl.trim() || undefined,
            source: citationSource,
            summary: citationSummary.trim() || undefined,
            linkedCaseIds: [],
            tags: [],
            isFavorite: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        addCitation(citation);
        resetCitationForm();
        setShowAddCitation(false);
    };

    const handleAddNote = () => {
        if (!noteTitle.trim() || !noteContent.trim()) {
            Alert.alert('Error', 'Title and content are required');
            return;
        }

        const note: ResearchNote = {
            id: uuidv4(),
            title: noteTitle.trim(),
            content: noteContent.trim(),
            linkedCitationIds: [],
            linkedCaseIds: [],
            tags: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        addResearchNote(note);
        setNoteTitle('');
        setNoteContent('');
        setShowAddNote(false);
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

    const handleDeleteCitation = (id: string) => {
        Alert.alert('Delete Citation', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteCitation(id) }
        ]);
    };

    const handleDeleteNote = (id: string) => {
        Alert.alert('Delete Note', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteResearchNote(id) }
        ]);
    };

    const headerGradient: [string, string] = mode === 'dark'
        ? [colors.surface, colors.background]
        : ['#f8f5f0', colors.background];

    const renderTab = (tab: TabType, label: string, icon: string) => (
        <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
        >
            <MaterialCommunityIcons name={icon as any} size={20} color={activeTab === tab ? colors.accent : colors.textTertiary} />
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <LinearGradient colors={headerGradient} style={styles.header}>
                <Text style={styles.title}>Legal Research</Text>
                <Text style={styles.subtitle}>Case laws, statutes & citations</Text>
            </LinearGradient>

            {/* Tabs */}
            <View style={styles.tabBar}>
                {renderTab('citations', 'Citations', 'bookmark-multiple')}
                {renderTab('databases', 'Databases', 'database-search')}
                {renderTab('notes', 'Notes', 'note-text-outline')}
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Citations Tab */}
                {activeTab === 'citations' && (
                    <View>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search citations..."
                            placeholderTextColor={colors.textTertiary}
                            value={search}
                            onChangeText={setSearch}
                        />

                        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddCitation(true)}>
                            <MaterialCommunityIcons name="plus" size={20} color={colors.accent} />
                            <Text style={styles.addBtnText}>Add Citation</Text>
                        </TouchableOpacity>

                        {/* Favorites Section */}
                        {favoriteCitations.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>FAVORITES</Text>
                                {favoriteCitations.map(citation => (
                                    <TouchableOpacity
                                        key={citation.id}
                                        style={styles.citationCard}
                                        onPress={() => citation.url && Linking.openURL(citation.url)}
                                    >
                                        <View style={styles.citationHeader}>
                                            <View style={styles.typeBadge}>
                                                <Text style={styles.typeBadgeText}>{citation.type.replace('_', ' ')}</Text>
                                            </View>
                                            <TouchableOpacity onPress={() => toggleCitationFavorite(citation.id)}>
                                                <MaterialCommunityIcons name="star" size={20} color={colors.warning} />
                                            </TouchableOpacity>
                                        </View>
                                        <Text style={styles.citationTitle}>{citation.title}</Text>
                                        <Text style={styles.citationRef}>{citation.citation}</Text>
                                        {citation.court && <Text style={styles.citationMeta}>{citation.court} · {citation.year}</Text>}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {/* All Citations */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>ALL CITATIONS ({filteredCitations.length})</Text>
                            {filteredCitations.length === 0 ? (
                                <Text style={styles.emptyText}>No citations saved yet</Text>
                            ) : (
                                filteredCitations.map(citation => (
                                    <TouchableOpacity
                                        key={citation.id}
                                        style={styles.citationCard}
                                        onPress={() => citation.url && Linking.openURL(citation.url)}
                                        onLongPress={() => handleDeleteCitation(citation.id)}
                                    >
                                        <View style={styles.citationHeader}>
                                            <View style={[styles.typeBadge, { backgroundColor: colors.surfaceHighlight }]}>
                                                <Text style={[styles.typeBadgeText, { color: colors.textSecondary }]}>{citation.type.replace('_', ' ')}</Text>
                                            </View>
                                            <View style={styles.citationActions}>
                                                <TouchableOpacity onPress={() => toggleCitationFavorite(citation.id)}>
                                                    <MaterialCommunityIcons
                                                        name={citation.isFavorite ? "star" : "star-outline"}
                                                        size={18}
                                                        color={citation.isFavorite ? colors.warning : colors.textTertiary}
                                                    />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                        <Text style={styles.citationTitle}>{citation.title}</Text>
                                        <Text style={styles.citationRef}>{citation.citation}</Text>
                                        {citation.court && <Text style={styles.citationMeta}>{citation.court}{citation.year ? ` · ${citation.year}` : ''}</Text>}
                                        {citation.summary && <Text style={styles.citationSummary} numberOfLines={2}>{citation.summary}</Text>}
                                    </TouchableOpacity>
                                ))
                            )}
                        </View>
                    </View>
                )}

                {/* Databases Tab */}
                {activeTab === 'databases' && (
                    <View>
                        <View style={styles.quickSearchCard}>
                            <Text style={styles.quickSearchTitle}>Quick Search</Text>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search case laws, statutes..."
                                placeholderTextColor={colors.textTertiary}
                                value={search}
                                onChangeText={setSearch}
                            />
                            <View style={styles.quickSearchBtns}>
                                <TouchableOpacity
                                    style={styles.quickSearchBtn}
                                    onPress={() => handleOpenDatabase(LEGAL_DATABASES[0], search)}
                                >
                                    <Text style={styles.quickSearchBtnText}>Search Indian Kanoon</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <Text style={styles.sectionTitle}>LEGAL DATABASES</Text>
                        {LEGAL_DATABASES.map(db => (
                            <TouchableOpacity
                                key={db.value}
                                style={styles.databaseCard}
                                onPress={() => handleOpenDatabase(db)}
                            >
                                <View style={styles.databaseIcon}>
                                    <MaterialCommunityIcons name="database" size={24} color={colors.accent} />
                                </View>
                                <View style={styles.databaseInfo}>
                                    <Text style={styles.databaseName}>{db.label}</Text>
                                    <Text style={styles.databaseUrl}>{db.url}</Text>
                                </View>
                                <MaterialCommunityIcons name="open-in-new" size={18} color={colors.textTertiary} />
                            </TouchableOpacity>
                        ))}

                        {/* Recent Searches */}
                        {searchHistory.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>RECENT SEARCHES</Text>
                                {searchHistory.slice(0, 5).map(item => (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={styles.historyItem}
                                        onPress={() => {
                                            const db = LEGAL_DATABASES.find(d => d.value === item.database);
                                            if (db) handleOpenDatabase(db, item.query);
                                        }}
                                    >
                                        <MaterialCommunityIcons name="history" size={16} color={colors.textTertiary} />
                                        <Text style={styles.historyText}>{item.query}</Text>
                                        <Text style={styles.historyMeta}>{item.database}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                )}

                {/* Notes Tab */}
                {activeTab === 'notes' && (
                    <View>
                        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddNote(true)}>
                            <MaterialCommunityIcons name="plus" size={20} color={colors.accent} />
                            <Text style={styles.addBtnText}>Add Research Note</Text>
                        </TouchableOpacity>

                        {researchNotes.length === 0 ? (
                            <Text style={styles.emptyText}>No research notes yet</Text>
                        ) : (
                            researchNotes.map(note => (
                                <TouchableOpacity
                                    key={note.id}
                                    style={styles.noteCard}
                                    onLongPress={() => handleDeleteNote(note.id)}
                                >
                                    <Text style={styles.noteTitle}>{note.title}</Text>
                                    <Text style={styles.noteContent} numberOfLines={3}>{note.content}</Text>
                                    <Text style={styles.noteMeta}>{dayjs(note.createdAt).format('MMM D, YYYY')}</Text>
                                </TouchableOpacity>
                            ))
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Add Citation Modal */}
            <Modal visible={showAddCitation} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <ScrollView>
                            <Text style={styles.modalTitle}>Add Citation</Text>

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
                                placeholder="e.g., Kesavananda Bharati vs State of Kerala"
                                placeholderTextColor={colors.textTertiary}
                            />

                            <Text style={styles.inputLabel}>Citation Reference *</Text>
                            <TextInput
                                style={styles.input}
                                value={citationRef}
                                onChangeText={setCitationRef}
                                placeholder="e.g., AIR 1973 SC 1461"
                                placeholderTextColor={colors.textTertiary}
                            />

                            <View style={styles.row}>
                                <View style={styles.halfInput}>
                                    <Text style={styles.inputLabel}>Court</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={citationCourt}
                                        onChangeText={setCitationCourt}
                                        placeholder="Supreme Court"
                                        placeholderTextColor={colors.textTertiary}
                                    />
                                </View>
                                <View style={styles.halfInput}>
                                    <Text style={styles.inputLabel}>Year</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={citationYear}
                                        onChangeText={setCitationYear}
                                        placeholder="2020"
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

                            <Text style={styles.inputLabel}>Summary / Key Points</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={citationSummary}
                                onChangeText={setCitationSummary}
                                placeholder="Brief summary of the judgment..."
                                placeholderTextColor={colors.textTertiary}
                                multiline
                            />

                            <View style={styles.modalActions}>
                                <TouchableOpacity style={styles.modalBtn} onPress={() => { resetCitationForm(); setShowAddCitation(false); }}>
                                    <Text style={styles.modalBtnText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={handleAddCitation}>
                                    <Text style={[styles.modalBtnText, styles.modalBtnTextPrimary]}>Save</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Add Note Modal */}
            <Modal visible={showAddNote} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add Research Note</Text>

                        <Text style={styles.inputLabel}>Title *</Text>
                        <TextInput
                            style={styles.input}
                            value={noteTitle}
                            onChangeText={setNoteTitle}
                            placeholder="Research topic..."
                            placeholderTextColor={colors.textTertiary}
                        />

                        <Text style={styles.inputLabel}>Content *</Text>
                        <TextInput
                            style={[styles.input, { minHeight: 150 }]}
                            value={noteContent}
                            onChangeText={setNoteContent}
                            placeholder="Your research notes..."
                            placeholderTextColor={colors.textTertiary}
                            multiline
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalBtn} onPress={() => setShowAddNote(false)}>
                                <Text style={styles.modalBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={handleAddNote}>
                                <Text style={[styles.modalBtnText, styles.modalBtnTextPrimary]}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const createStyles = (colors: any, spacing: any, layout: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: spacing.m, paddingTop: spacing.l, paddingBottom: spacing.m },
    title: { color: colors.textPrimary, fontSize: 32, fontWeight: '200', letterSpacing: -1 },
    subtitle: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },
    tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
    tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.m, gap: 4 },
    tabActive: { borderBottomWidth: 2, borderBottomColor: colors.accent },
    tabLabel: { color: colors.textTertiary, fontSize: 12, fontWeight: '500' },
    tabLabelActive: { color: colors.accent },
    content: { padding: spacing.m, paddingBottom: 100 },
    searchInput: { backgroundColor: colors.surface, color: colors.textPrimary, padding: spacing.m, borderRadius: layout.borderRadius, fontSize: 16, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.m },
    addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.s, backgroundColor: colors.surface, padding: spacing.m, borderRadius: layout.borderRadius, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', marginBottom: spacing.l },
    addBtnText: { color: colors.accent, fontSize: 14, fontWeight: '500' },
    section: { marginBottom: spacing.l },
    sectionTitle: { color: colors.textTertiary, fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: spacing.m },
    emptyText: { color: colors.textTertiary, textAlign: 'center', fontStyle: 'italic', marginTop: spacing.l },
    citationCard: { backgroundColor: colors.surface, borderRadius: layout.borderRadius, padding: spacing.m, marginBottom: spacing.s, borderWidth: 1, borderColor: colors.border },
    citationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.s },
    citationActions: { flexDirection: 'row', gap: spacing.s },
    typeBadge: { backgroundColor: colors.accent, paddingHorizontal: spacing.s, paddingVertical: 2, borderRadius: 4 },
    typeBadgeText: { color: colors.background, fontSize: 10, fontWeight: 'bold' },
    citationTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '600', marginBottom: 4 },
    citationRef: { color: colors.accent, fontSize: 13, fontWeight: '500' },
    citationMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
    citationSummary: { color: colors.textSecondary, fontSize: 12, marginTop: spacing.s, fontStyle: 'italic' },
    quickSearchCard: { backgroundColor: colors.surface, borderRadius: layout.borderRadius, padding: spacing.m, marginBottom: spacing.l, borderWidth: 1, borderColor: colors.border },
    quickSearchTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '600', marginBottom: spacing.m },
    quickSearchBtns: { flexDirection: 'row', gap: spacing.s },
    quickSearchBtn: { flex: 1, backgroundColor: colors.accent, padding: spacing.m, borderRadius: layout.borderRadius, alignItems: 'center' },
    quickSearchBtnText: { color: colors.background, fontSize: 14, fontWeight: '600' },
    databaseCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.m, borderRadius: layout.borderRadius, marginBottom: spacing.s, borderWidth: 1, borderColor: colors.border },
    databaseIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceHighlight, justifyContent: 'center', alignItems: 'center', marginRight: spacing.m },
    databaseInfo: { flex: 1 },
    databaseName: { color: colors.textPrimary, fontSize: 15, fontWeight: '500' },
    databaseUrl: { color: colors.textTertiary, fontSize: 12, marginTop: 2 },
    historyItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, paddingVertical: spacing.s, borderBottomWidth: 1, borderBottomColor: colors.border },
    historyText: { flex: 1, color: colors.textPrimary, fontSize: 14 },
    historyMeta: { color: colors.textTertiary, fontSize: 11 },
    noteCard: { backgroundColor: colors.surface, borderRadius: layout.borderRadius, padding: spacing.m, marginBottom: spacing.s, borderWidth: 1, borderColor: colors.border },
    noteTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '600', marginBottom: spacing.xs },
    noteContent: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
    noteMeta: { color: colors.textTertiary, fontSize: 11, marginTop: spacing.s },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.l, maxHeight: '90%' },
    modalTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '600', marginBottom: spacing.m },
    inputLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginTop: spacing.m, marginBottom: spacing.xs },
    input: { backgroundColor: colors.background, color: colors.textPrimary, padding: spacing.m, borderRadius: layout.borderRadius, fontSize: 16, borderWidth: 1, borderColor: colors.border },
    textArea: { minHeight: 80, textAlignVertical: 'top' },
    row: { flexDirection: 'row', gap: spacing.m },
    halfInput: { flex: 1 },
    typeRow: { flexDirection: 'row', gap: spacing.s },
    typeChip: { paddingHorizontal: spacing.m, paddingVertical: spacing.s, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
    typeChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    typeChipText: { color: colors.textSecondary, fontSize: 12 },
    typeChipTextActive: { color: colors.background, fontWeight: '600' },
    modalActions: { flexDirection: 'row', gap: spacing.m, marginTop: spacing.l },
    modalBtn: { flex: 1, padding: spacing.m, borderRadius: layout.borderRadius, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    modalBtnPrimary: { backgroundColor: colors.accent, borderColor: colors.accent },
    modalBtnText: { color: colors.textSecondary, fontSize: 16, fontWeight: '600' },
    modalBtnTextPrimary: { color: colors.background },
});
