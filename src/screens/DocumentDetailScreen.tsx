import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Alert, ActivityIndicator, Linking, Platform, Image, Modal, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../theme/ThemeContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { DocumentVersion } from '../models/Document';
import {
    shareDocument,
    deleteAllVersions,
    formatFileSize,
    pickDocument,
    scanDocument,
    saveDocumentFile
} from '../services/documentStorage';
import * as IntentLauncher from 'expo-intent-launcher';
import * as FileSystem from 'expo-file-system/legacy';
import * as Clipboard from 'expo-clipboard';
import dayjs from 'dayjs';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { GradientButton } from '../components/GradientButton';

type Props = NativeStackScreenProps<RootStackParamList, 'DocumentDetail'>;

export const DocumentDetailScreen: React.FC<Props> = ({ navigation, route }) => {
    const { colors, spacing, layout } = useTheme();
    const documents = useAppStore(state => state.documents);
    const cases = useAppStore(state => state.cases);
    const deleteDocument = useAppStore(state => state.deleteDocument);
    const renameDocument = useAppStore(state => state.renameDocument);
    const addDocumentVersion = useAppStore(state => state.addDocumentVersion);

    const [loading, setLoading] = useState(false);
    const [renameModalVisible, setRenameModalVisible] = useState(false);
    const [newName, setNewName] = useState('');

    const doc = documents.find(d => d.id === route.params.documentId);
    const caseName = cases.find(c => c.id === doc?.caseId)?.name || 'Unknown Case';

    const styles = createStyles(colors, spacing, layout);

    if (!doc) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <Text style={styles.errorText}>Document not found</Text>
            </SafeAreaView>
        );
    }

    const currentVersion = doc.versions.find(v => v.id === doc.currentVersionId);
    const sortedVersions = [...doc.versions].sort((a, b) => b.versionNumber - a.versionNumber);

    const handleOpenDocument = async () => {
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
            console.warn('Intent open failed, falling back to share sheet:', e?.message || e);
            try {
                await shareDocument(currentVersion.uri, doc.name, doc.mimeType);
            } catch (shareErr) {
                Alert.alert(
                    'No Office App Found',
                    'Could not open Word (.docx) directly because no Word processor app (Google Docs, MS Word, WPS Office) is installed on this device. You can share or export this file to view it on your PC.',
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

    const handleShare = async () => {
        if (currentVersion) {
            try {
                await shareDocument(currentVersion.uri, doc.name, doc.mimeType);
            } catch (e) {
                Alert.alert('Error', 'Failed to share document.');
            }
        }
    };

    const handleRename = () => {
        setNewName(doc.name);
        setRenameModalVisible(true);
    };

    const confirmRename = () => {
        if (newName.trim()) {
            renameDocument(doc.id, newName.trim());
            setRenameModalVisible(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Document',
            'This will permanently delete the document and all versions. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteAllVersions(doc.versions);
                        deleteDocument(doc.id);
                        navigation.goBack();
                    }
                }
            ]
        );
    };

    const handleAddVersion = async (sourceUri: string, fileName: string) => {
        setLoading(true);
        try {
            const newVersionNum = doc.versions.length + 1;
            const versionId = uuidv4();

            const { uri, fileSize } = await saveDocumentFile(
                sourceUri,
                doc.id,
                newVersionNum,
                fileName
            );

            const version: DocumentVersion = {
                id: versionId,
                versionNumber: newVersionNum,
                uri,
                createdAt: new Date().toISOString(),
                fileSize,
            };

            addDocumentVersion(doc.id, version);
            Alert.alert('Success', `Version ${newVersionNum} added!`);
        } catch (e) {
            Alert.alert('Error', 'Failed to add version.');
        } finally {
            setLoading(false);
        }
    };

    const handlePickNewVersion = async () => {
        const result = await pickDocument();
        if (result) {
            await handleAddVersion(result.uri, result.name);
        }
    };

    const handleScanNewVersion = async () => {
        const result = await scanDocument();
        if (result) {
            await handleAddVersion(result.uri, result.name);
        }
    };

    const getDocIcon = (mimeType: string): string => {
        if (mimeType.includes('pdf')) return 'file-pdf-box';
        if (mimeType.includes('image')) return 'file-image';
        if (mimeType.includes('word') || mimeType.includes('document')) return 'file-word';
        if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'file-excel';
        return 'file-document';
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView contentContainerStyle={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={styles.backBtn}>← Back</Text>
                    </TouchableOpacity>
                </View>

                {/* Document Info */}
                <View style={styles.docHeader}>
                    {doc.mimeType.startsWith('image/') && currentVersion ? (
                        <Image
                            source={{ uri: currentVersion.uri }}
                            style={styles.docImagePreview}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={styles.docIconLarge}>
                            <MaterialCommunityIcons name={getDocIcon(doc.mimeType) as any} size={40} color={colors.accent} />
                        </View>
                    )}
                    <View style={styles.docHeaderInfo}>
                        <Text style={styles.docName}>{doc.name}</Text>
                        <Text style={styles.caseName}>{caseName}</Text>
                    </View>
                </View>

                <View style={styles.metaRow}>
                    <View style={styles.typeBadge}>
                        <Text style={styles.typeBadgeText}>{doc.type.replace('_', ' ')}</Text>
                    </View>
                    <Text style={styles.metaText}>
                        {doc.versions.length} version{doc.versions.length > 1 ? 's' : ''}
                    </Text>
                </View>

                {/* Tags */}
                {doc.tags.length > 0 && (
                    <View style={styles.tagsRow}>
                        {doc.tags.map((tag, index) => (
                            <View key={index} style={styles.tag}>
                                <Text style={styles.tagText}>{tag}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Open Document Button */}
                <GradientButton
                    title="View Document"
                    onPress={handleOpenDocument}
                    style={{ marginBottom: spacing.l }}
                />

                {/* Current Version */}
                {currentVersion && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>CURRENT VERSION</Text>
                        <View style={styles.versionCard}>
                            <Text style={styles.versionNumber}>v{currentVersion.versionNumber}</Text>
                            <View style={styles.versionInfo}>
                                <Text style={styles.versionDate}>
                                    {dayjs(currentVersion.createdAt).format('MMM D, YYYY h:mm A')}
                                </Text>
                                <Text style={styles.versionSize}>
                                    {formatFileSize(currentVersion.fileSize)}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ACTIONS</Text>

                    <TouchableOpacity style={styles.actionRow} onPress={handleShare}>
                        <MaterialCommunityIcons name="share-variant" size={22} color={colors.textPrimary} />
                        <Text style={styles.actionText}>Share Document</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionRow} onPress={handleRename}>
                        <MaterialCommunityIcons name="pencil" size={22} color={colors.textPrimary} />
                        <Text style={styles.actionText}>Rename Document</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionRow} onPress={handlePickNewVersion}>
                        <MaterialCommunityIcons name="folder-plus" size={22} color={colors.textPrimary} />
                        <Text style={styles.actionText}>Add New Version (File)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionRow} onPress={handleScanNewVersion}>
                        <MaterialCommunityIcons name="camera-plus" size={22} color={colors.textPrimary} />
                        <Text style={styles.actionText}>Add New Version (Scan)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.actionRow, styles.deleteRow]} onPress={handleDelete}>
                        <MaterialCommunityIcons name="delete" size={22} color={colors.critical} />
                        <Text style={[styles.actionText, styles.deleteText]}>Delete Document</Text>
                    </TouchableOpacity>
                </View>

                {/* Version History */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>VERSION HISTORY</Text>
                    {sortedVersions.map((version) => (
                        <View key={version.id} style={styles.historyItem}>
                            <View style={styles.historyDot} />
                            <View style={styles.historyContent}>
                                <Text style={styles.historyVersion}>Version {version.versionNumber}</Text>
                                <Text style={styles.historyDate}>
                                    {dayjs(version.createdAt).format('MMM D, YYYY')} · {formatFileSize(version.fileSize)}
                                </Text>
                                {version.notes && (
                                    <Text style={styles.historyNotes}>{version.notes}</Text>
                                )}
                            </View>
                        </View>
                    ))}
                </View>

                {loading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color={colors.accent} />
                    </View>
                )}
            </ScrollView>

            {/* Rename Modal */}
            <Modal
                visible={renameModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setRenameModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Rename Document</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={newName}
                            onChangeText={setNewName}
                            placeholder="Enter new name"
                            placeholderTextColor={colors.textTertiary}
                            autoFocus
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setRenameModalVisible(false)}>
                                <Text style={styles.modalBtnCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalBtnConfirm} onPress={confirmRename}>
                                <Text style={styles.modalBtnConfirmText}>Rename</Text>
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
    content: { padding: spacing.m, paddingBottom: 100 },
    header: { marginBottom: spacing.m },
    backBtn: { color: colors.accent, fontSize: 16 },
    errorText: { color: colors.textTertiary, textAlign: 'center', marginTop: spacing.xxl },
    docHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.m },
    docImagePreview: { width: 64, height: 64, borderRadius: 12, marginRight: spacing.m, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    docIconLarge: { width: 64, height: 64, borderRadius: 12, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', marginRight: spacing.m, borderWidth: 1, borderColor: colors.border },
    docHeaderInfo: { flex: 1 },
    docName: { color: colors.textPrimary, fontSize: 22, fontWeight: '500', marginBottom: 4 },
    caseName: { color: colors.textSecondary, fontSize: 14 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, marginBottom: spacing.m },
    typeBadge: { backgroundColor: colors.accent, paddingHorizontal: spacing.s, paddingVertical: 4, borderRadius: 4 },
    typeBadgeText: { color: colors.background, fontSize: 12, fontWeight: '600' },
    metaText: { color: colors.textTertiary, fontSize: 14 },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.l },
    tag: { backgroundColor: colors.surfaceHighlight, paddingHorizontal: spacing.s, paddingVertical: 4, borderRadius: 12 },
    tagText: { color: colors.textSecondary, fontSize: 12 },
    openBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent, padding: spacing.m, borderRadius: layout.borderRadius, marginBottom: spacing.l, gap: spacing.s },
    openBtnText: { color: colors.background, fontSize: 16, fontWeight: '600' },
    section: { backgroundColor: colors.surface, borderRadius: layout.borderRadius, padding: spacing.m, marginBottom: spacing.m, borderWidth: 1, borderColor: colors.border },
    sectionTitle: { color: colors.textSecondary, fontSize: 12, fontWeight: '600', letterSpacing: 1, marginBottom: spacing.m },
    versionCard: { flexDirection: 'row', alignItems: 'center' },
    versionNumber: { color: colors.accent, fontSize: 24, fontWeight: '600', marginRight: spacing.m },
    versionInfo: { flex: 1 },
    versionDate: { color: colors.textPrimary, fontSize: 14 },
    versionSize: { color: colors.textTertiary, fontSize: 12, marginTop: 2 },
    actionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.m, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.m },
    actionText: { color: colors.textPrimary, fontSize: 16 },
    deleteRow: { borderBottomWidth: 0 },
    deleteText: { color: colors.critical },
    historyItem: { flexDirection: 'row', marginBottom: spacing.m },
    historyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent, marginTop: 6, marginRight: spacing.m },
    historyContent: { flex: 1 },
    historyVersion: { color: colors.textPrimary, fontSize: 14, fontWeight: '500' },
    historyDate: { color: colors.textTertiary, fontSize: 12, marginTop: 2 },
    historyNotes: { color: colors.textSecondary, fontSize: 12, marginTop: 4, fontStyle: 'italic' },
    loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: spacing.l },
    modalContent: { backgroundColor: colors.surface, borderRadius: layout.borderRadius, padding: spacing.l, width: '100%', maxWidth: 400 },
    modalTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '600', marginBottom: spacing.m },
    modalInput: { backgroundColor: colors.background, borderRadius: layout.borderRadius, padding: spacing.m, color: colors.textPrimary, fontSize: 16, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.m },
    modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.s },
    modalBtnCancel: { paddingVertical: spacing.s, paddingHorizontal: spacing.m },
    modalBtnCancelText: { color: colors.textTertiary, fontSize: 14 },
    modalBtnConfirm: { backgroundColor: colors.accent, paddingVertical: spacing.s, paddingHorizontal: spacing.m, borderRadius: layout.borderRadius },
    modalBtnConfirmText: { color: colors.background, fontSize: 14, fontWeight: '600' },
});
