import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../theme/ThemeContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Document, DocumentType, DOCUMENT_TYPES, DocumentVersion } from '../models/Document';
import { useToast } from '../context/ToastContext';
import { pickDocuments, scanDocument, saveDocumentFile, performOCR } from '../services/documentStorage';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

type Props = NativeStackScreenProps<RootStackParamList, 'AddDocument'>;

export const AddDocumentScreen: React.FC<Props> = ({ navigation, route }) => {
    const { colors, spacing, layout } = useTheme();
    const { showToast } = useToast();
    const cases = useAppStore(state => state.cases);
    const addDocument = useAppStore(state => state.addDocument);

    const [selectedFiles, setSelectedFiles] = useState<{ uri: string; name: string; mimeType: string }[]>([]);
    const [name, setName] = useState('');
    const [selectedCaseId, setSelectedCaseId] = useState(route.params?.caseId || '');
    const [docType, setDocType] = useState<DocumentType>('OTHER');
    const [tags, setTags] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const activeCases = cases.filter(c => c.status === 'ACTIVE');
    const styles = createStyles(colors, spacing, layout);

    const handlePickFile = async () => {
        const results = await pickDocuments();
        if (results && results.length > 0) {
            setSelectedFiles(prev => [...prev, ...results]);
            // If only one file is selected and no name is set, preset the name
            if (results.length === 1 && !name && selectedFiles.length === 0) {
                setName(results[0].name.split('.')[0]);
            }
        }
    };

    const handleScanDocument = async () => {
        const result = await scanDocument();
        if (result) {
            setSelectedFiles(prev => [...prev, result]);
            if (!name && selectedFiles.length === 0) {
                setName(result.name.split('.')[0]);
            }
        }
    };

    const handleRemoveFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
        if (selectedFiles.length === 2) { // 2 becoming 1
            // Optional: could auto-fill name again but better to leave it
        }
    };

    const handleSave = async () => {
        if (!selectedCaseId) {
            showToast({
                message: 'Please select a case first.',
                type: 'error'
            });
            return;
        }

        if (selectedFiles.length === 0) {
            showToast({
                message: 'Please select at least one document.',
                type: 'error'
            });
            return;
        }

        setLoading(true);
        try {
            await Promise.all(selectedFiles.map(async (file, index) => {
                const docId = uuidv4();
                const versionId = uuidv4();

                let docName = file.name.split('.')[0];
                if (selectedFiles.length === 1 && name.trim()) {
                    docName = name.trim();
                }

                const { uri, fileSize } = await saveDocumentFile(file.uri, docId, 1, file.name);

                let ocrText = '';
                if (file.mimeType.startsWith('image/')) {
                    ocrText = await performOCR(uri);
                }

                const version: DocumentVersion = {
                    id: versionId,
                    versionNumber: 1,
                    uri,
                    createdAt: new Date().toISOString(),
                    notes: notes.trim() || undefined,
                    fileSize,
                };

                const doc: Document = {
                    id: docId,
                    caseId: selectedCaseId,
                    name: docName,
                    type: docType,
                    mimeType: file.mimeType,
                    currentVersionId: versionId,
                    versions: [version],
                    tags: tags.split(',').map(t => t.trim()).filter(Boolean),
                    ocrText,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };

                addDocument(doc);
            }));

            showToast({
                message: "Documents saved successfully!",
                type: 'success'
            });
            navigation.goBack();
        } catch (e) {
            console.error('Save error:', e);
            showToast({
                message: 'Failed to save documents.',
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };



    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            navigation.goBack();
                        }}
                        style={[styles.headerButton, styles.cancelButton]}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="close" size={15} color={colors.critical} />
                        <Text style={[styles.headerButtonText, styles.cancelButtonText]}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Add Document</Text>
                    <View style={{ width: 60 }} />
                </View>

                {/* Case Selection */}
                <Text style={styles.label}>Case *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                    {activeCases.map(c => (
                        <TouchableOpacity
                            key={c.id}
                            style={[styles.chip, selectedCaseId === c.id && styles.chipActive]}
                            onPress={() => setSelectedCaseId(c.id)}
                        >
                            <Text style={[styles.chipText, selectedCaseId === c.id && styles.chipTextActive]}>
                                {c.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Document Name - Only show if 0 or 1 file selected */}
                {selectedFiles.length <= 1 && (
                    <>
                        <Text style={styles.label}>Document Name</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="e.g., Petition Draft v2"
                            placeholderTextColor={colors.textTertiary}
                        />
                    </>
                )}

                {/* Selected Files List */}
                <Text style={styles.label}>Files ({selectedFiles.length})</Text>
                {selectedFiles.length === 0 ? (
                    <View style={styles.emptyFilesBox}>
                        <Text style={styles.emptyFilesText}>No files selected</Text>
                    </View>
                ) : (
                    <View style={styles.fileList}>
                        {selectedFiles.map((file, index) => (
                            <View key={index} style={styles.fileItem}>
                                <MaterialCommunityIcons name="file-document-outline" size={24} color={colors.accent} />
                                <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                                <TouchableOpacity onPress={() => handleRemoveFile(index)}>
                                    <MaterialCommunityIcons name="close-circle" size={20} color={colors.textTertiary} />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}

                <View style={styles.fileActions}>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.scanBtn]}
                        onPress={handleScanDocument}
                        disabled={loading}
                    >
                        <MaterialCommunityIcons name="camera" size={24} color={colors.textPrimary} />
                        <Text style={styles.actionBtnText}>Scan</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionBtn, styles.pickBtn]}
                        onPress={handlePickFile}
                        disabled={loading}
                    >
                        <MaterialCommunityIcons name="folder-open" size={24} color={colors.background} />
                        <Text style={[styles.actionBtnText, { color: colors.background }]}>Add Files</Text>
                    </TouchableOpacity>
                </View>

                {/* Document Type */}
                <Text style={styles.label}>Document Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                    {DOCUMENT_TYPES.map(type => (
                        <TouchableOpacity
                            key={type}
                            style={[styles.chip, docType === type && styles.chipActive]}
                            onPress={() => setDocType(type)}
                        >
                            <Text style={[styles.chipText, docType === type && styles.chipTextActive]}>
                                {type.replace('_', ' ')}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Tags */}
                <Text style={styles.label}>Tags (comma separated)</Text>
                <TextInput
                    style={styles.input}
                    value={tags}
                    onChangeText={setTags}
                    placeholder="e.g., important, draft, signed"
                    placeholderTextColor={colors.textTertiary}
                />

                {/* Notes */}
                <Text style={styles.label}>Version Notes</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Optional notes about this version..."
                    placeholderTextColor={colors.textTertiary}
                    multiline
                    numberOfLines={3}
                />

                {/* Action Buttons */}
                {/* Save Button */}
                <TouchableOpacity
                    style={[styles.saveBtn, selectedFiles.length === 0 && styles.saveBtnDisabled]}
                    onPress={handleSave}
                    disabled={loading || selectedFiles.length === 0}
                >
                    <Text style={styles.saveBtnText}>Save {selectedFiles.length > 1 ? `${selectedFiles.length} Documents` : 'Document'}</Text>
                </TouchableOpacity>

                {loading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color={colors.accent} />
                        <Text style={styles.loadingText}>Saving document...</Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const createStyles = (colors: any, spacing: any, layout: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.m, paddingBottom: 140 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.l },
    headerButton: { paddingHorizontal: spacing.l, paddingVertical: 8, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    cancelButton: {
        backgroundColor: colors.critical + '14',
        borderWidth: 1,
        borderColor: colors.critical + '40',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 18,
    },
    headerButtonText: { fontSize: 13, fontWeight: '600' },
    cancelButtonText: { color: colors.critical, fontWeight: '700' },
    title: { color: colors.textPrimary, fontSize: 20, fontWeight: '600' },
    label: { color: colors.textSecondary, fontSize: 14, fontWeight: '500', marginTop: spacing.m, marginBottom: spacing.s },
    input: { backgroundColor: colors.surface, color: colors.textPrimary, padding: spacing.m, borderRadius: layout.borderRadius, fontSize: 16, borderWidth: 1, borderColor: colors.border },
    textArea: { height: 80, textAlignVertical: 'top' },
    chipScroll: { marginBottom: spacing.s },
    chip: { paddingHorizontal: spacing.m, paddingVertical: spacing.s, borderRadius: 20, backgroundColor: colors.surface, marginRight: spacing.s, borderWidth: 1, borderColor: colors.border },
    chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    chipText: { color: colors.textSecondary, fontSize: 14 },
    chipTextActive: { color: colors.background, fontWeight: '600' },
    actions: { flexDirection: 'row', gap: spacing.m, marginTop: spacing.xl },
    fileActions: { flexDirection: 'row', gap: spacing.m, marginTop: spacing.s, marginBottom: spacing.m },
    actionBtn: { flex: 1, flexDirection: 'row', padding: spacing.m, borderRadius: layout.borderRadius, alignItems: 'center', justifyContent: 'center', gap: spacing.s },
    scanBtn: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    pickBtn: { backgroundColor: colors.accent },
    actionBtnText: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
    emptyFilesBox: { padding: spacing.l, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', borderRadius: layout.borderRadius, marginBottom: spacing.m },
    emptyFilesText: { color: colors.textTertiary, fontStyle: 'italic' },
    fileList: { marginBottom: spacing.m },
    fileItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.m, borderRadius: layout.borderRadius, marginBottom: spacing.s, borderWidth: 1, borderColor: colors.border, gap: spacing.s },
    fileName: { flex: 1, color: colors.textPrimary, fontSize: 14 },
    saveBtn: { backgroundColor: colors.accent, padding: spacing.l, borderRadius: layout.borderRadius, alignItems: 'center', marginTop: spacing.l },
    saveBtnDisabled: { opacity: 0.5 },
    saveBtnText: { color: colors.background, fontSize: 16, fontWeight: '600' },
    loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: colors.textPrimary, marginTop: spacing.m },
});
