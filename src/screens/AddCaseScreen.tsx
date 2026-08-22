import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity, Alert,
    ScrollView, Platform, Modal, FlatList, KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../theme/ThemeContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import * as Crypto from 'expo-crypto';
import { CaseType, CASE_TYPES, CaseStatus, CaseStage, CASE_STAGES, Case, TimelineEvent, LegalSection, LegalActType, LEGAL_ACTS } from '../models/Case';
import { SECTION_DATABASE } from '../data/legalSections';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '../context/ToastContext';

type Props = NativeStackScreenProps<RootStackParamList, 'AddCase'>;

export const AddCaseScreen: React.FC<Props> = ({ navigation }) => {
    const { colors, spacing, layout } = useTheme();
    const { showToast } = useToast();
    const addCase = useAppStore(state => state.addCase);

    const [name, setName] = useState('');
    const [caseNumber, setCaseNumber] = useState('');
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [clientCompany, setClientCompany] = useState('');
    const [court, setCourt] = useState('');
    const [caseType, setCaseType] = useState<CaseType>('CIVIL');
    const [stage, setStage] = useState<CaseStage>('INTAKE');
    const [date, setDate] = useState(new Date());
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<CaseStatus>('ACTIVE');

    const [showPicker, setShowPicker] = useState(false);
    const [showTypeModal, setShowTypeModal] = useState(false);
    const [showStageModal, setShowStageModal] = useState(false);

    // Sections State
    const [sections, setSections] = useState<LegalSection[]>([]);
    const [showSectionModal, setShowSectionModal] = useState(false);
    const [sectionAct, setSectionAct] = useState<LegalActType>('IPC');
    const [sectionNumber, setSectionNumber] = useState('');
    const [sectionDesc, setSectionDesc] = useState('');
    const [showActPicker, setShowActPicker] = useState(false);

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);

    const styles = createStyles(colors, spacing, layout);

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!name.trim()) newErrors.name = 'Case Name is required';
        if (!clientName.trim()) newErrors.client = 'Client Name is required';
        if (!court.trim()) newErrors.court = 'Court Name is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (isSaving) return;

        if (!validate()) {
            showToast({
                message: 'Please fill all required fields.',
                type: 'error'
            });
            return;
        }

        setIsSaving(true);
        const now = new Date().toISOString();
        const caseId = Crypto.randomUUID();

        const initialTimeline: TimelineEvent = {
            id: `tl_${Date.now()}`,
            type: 'CASE_CREATED',
            title: 'Case Created',
            description: `Case "${name.trim()}" was created`,
            date: now,
        };

        const newCase: Case = {
            id: caseId,
            name: name.trim(),
            caseNumber: caseNumber.trim() || undefined,
            client: {
                name: clientName.trim(),
                phone: clientPhone.trim() || undefined,
                email: clientEmail.trim() || undefined,
                companyName: clientCompany.trim() || undefined,
            },
            courtName: court.trim(),
            caseType,
            stage,
            filingDate: date.toISOString(),
            description: description.trim() || undefined,
            status,
            sections: sections,
            notes: [],
            timeline: [initialTimeline],
            createdAt: now,
            updatedAt: now,
        };

        addCase(newCase);
        showToast({
            message: 'Case created successfully.',
            type: 'success'
        });
        navigation.goBack();
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        const currentDate = selectedDate || date;
        setShowPicker(Platform.OS === 'ios');
        setDate(currentDate);
        if (Platform.OS === 'android') setShowPicker(false);
    };

    const handleAddSection = () => {
        if (!sectionNumber.trim()) return;

        const sectionsToAdd = sectionNumber.split(',').map(s => s.trim().toUpperCase()).filter(s => s);
        const newSections: LegalSection[] = [];

        sectionsToAdd.forEach(secNum => {
            // Lookup description from DB
            const dbDesc = SECTION_DATABASE[sectionAct]?.[secNum];
            // Use user input description if provided, otherwise DB description
            const finalDesc = sectionDesc.trim() || dbDesc;

            newSections.push({
                id: uuidv4(),
                act: sectionAct,
                section: secNum,
                description: finalDesc,
            });
        });

        setSections([...sections, ...newSections]);
        setSectionNumber('');
        setSectionDesc('');
        setShowSectionModal(false);
    };

    const handleRemoveSection = (id: string) => {
        setSections(sections.filter(s => s.id !== id));
    };

    const renderInput = (
        label: string,
        value: string,
        setter: (v: string) => void,
        options?: {
            placeholder?: string;
            required?: boolean;
            multiline?: boolean;
            keyboardType?: 'default' | 'phone-pad' | 'email-address';
            errorKey?: string;
        }
    ) => (
        <View style={styles.inputGroup}>
            <Text style={styles.label}>
                {label.toUpperCase()} {options?.required && <Text style={styles.required}>*</Text>}
            </Text>
            <TextInput
                style={[
                    styles.input,
                    options?.multiline && styles.textArea,
                    errors[options?.errorKey || ''] && styles.inputError
                ]}
                placeholder={options?.placeholder}
                placeholderTextColor={colors.textTertiary}
                value={value}
                onChangeText={setter}
                multiline={options?.multiline}
                numberOfLines={options?.multiline ? 4 : 1}
                keyboardType={options?.keyboardType || 'default'}
            />
            {errors[options?.errorKey || ''] && (
                <Text style={styles.errorText}>{errors[options?.errorKey || '']}</Text>
            )}
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        navigation.goBack();
                    }}
                    style={[styles.headerButton, styles.cancelButton]}
                    activeOpacity={0.7}
                    accessibilityLabel="Cancel creating new case"
                >
                    <Ionicons name="close" size={15} color={colors.critical} />
                    <Text style={[styles.headerButtonText, styles.cancelButtonText]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.title}>New Case</Text>
                <TouchableOpacity
                    onPress={handleSave}
                    disabled={isSaving}
                    style={[styles.headerButton, styles.saveButton, isSaving && { opacity: 0.6 }]}
                    activeOpacity={0.85}
                >
                    <Text style={[styles.headerButtonText, styles.saveButtonText]}>
                        {isSaving ? 'Saving...' : 'Save'}
                    </Text>
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
                    {/* Case Info Section */}
                    <Text style={styles.sectionTitle}>CASE INFORMATION</Text>

                    {renderInput('Case Name', name, setName, {
                        placeholder: 'e.g. State vs. John Doe',
                        required: true,
                        errorKey: 'name'
                    })}

                    {renderInput('Case Number', caseNumber, setCaseNumber, {
                        placeholder: 'e.g. CIV/2024/001'
                    })}

                    {/* Case Type Dropdown */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>CASE TYPE <Text style={styles.required}>*</Text></Text>
                        <TouchableOpacity style={styles.dropdown} onPress={() => setShowTypeModal(true)}>
                            <Text style={styles.dropdownText}>{caseType}</Text>
                            <Text style={styles.dropdownArrow}>▼</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Case Stage Dropdown */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>CASE STAGE <Text style={styles.required}>*</Text></Text>
                        <TouchableOpacity style={styles.dropdown} onPress={() => setShowStageModal(true)}>
                            <Text style={styles.dropdownText}>{CASE_STAGES.find(s => s.value === stage)?.label || stage}</Text>
                            <Text style={styles.dropdownArrow}>▼</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Filing Date */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>FILING DATE <Text style={styles.required}>*</Text></Text>
                        <TouchableOpacity style={styles.dropdown} onPress={() => setShowPicker(true)}>
                            <Text style={styles.dropdownText}>{dayjs(date).format('DD MMM YYYY')}</Text>
                        </TouchableOpacity>
                        {(showPicker || Platform.OS === 'ios') && (
                            <View style={styles.pickerContainer}>
                                {Platform.OS === 'ios' ? (
                                    <DateTimePicker
                                        value={date}
                                        mode="date"
                                        display="spinner"
                                        onChange={onDateChange}
                                        textColor={colors.textPrimary}
                                    />
                                ) : showPicker && (
                                    <DateTimePicker
                                        value={date}
                                        mode="date"
                                        display="default"
                                        onChange={onDateChange}
                                    />
                                )}
                            </View>
                        )}
                    </View>

                    {renderInput('Court Name', court, setCourt, {
                        placeholder: 'e.g. Madras High Court / Tiruvallur District Court',
                        required: true,
                        errorKey: 'court'
                    })}

                    {/* Quick Court Suggestions */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginBottom: spacing.m, marginTop: -spacing.xs }}>
                        {[
                            'Madras High Court (Chennai)',
                            'Madras HC (Madurai Bench)',
                            'City Civil Court - Chennai',
                            'District Court - Tiruvallur',
                            'District Court - Chengalpattu',
                            'District Court - Coimbatore',
                            'District Court - Madurai',
                            'District Court - Salem',
                        ].map((cName, idx) => (
                            <TouchableOpacity
                                key={idx}
                                style={{
                                    backgroundColor: court === cName ? colors.accent + '25' : colors.surface,
                                    borderColor: court === cName ? colors.accent : colors.border,
                                    borderWidth: 1,
                                    paddingHorizontal: 10,
                                    paddingVertical: 5,
                                    borderRadius: 8,
                                    marginRight: 6,
                                }}
                                onPress={() => setCourt(cName)}
                            >
                                <Text style={{ fontSize: 11, color: court === cName ? colors.accent : colors.textSecondary, fontWeight: '600' }}>
                                    {cName}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Client Info Section */}
                    <Text style={styles.sectionTitle}>CLIENT INFORMATION</Text>

                    {renderInput('Client Name', clientName, setClientName, {
                        placeholder: 'e.g. John Doe',
                        required: true,
                        errorKey: 'client'
                    })}

                    {renderInput('Company Name', clientCompany, setClientCompany, {
                        placeholder: 'e.g. ABC Corporation'
                    })}

                    {renderInput('Client Phone', clientPhone, setClientPhone, {
                        placeholder: '+91 9876543210',
                        keyboardType: 'phone-pad'
                    })}

                    {renderInput('Client Email', clientEmail, setClientEmail, {
                        placeholder: 'client@example.com',
                        keyboardType: 'email-address'
                    })}

                    {/* Additional Details */}
                    <Text style={styles.sectionTitle}>ADDITIONAL DETAILS</Text>

                    {renderInput('Description', description, setDescription, {
                        placeholder: 'Brief summary of the case...',
                        multiline: true
                    })}

                    {/* Status Toggle */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>STATUS</Text>
                        <View style={styles.statusRow}>
                            {(['ACTIVE', 'PENDING', 'CLOSED'] as CaseStatus[]).map(s => (
                                <TouchableOpacity
                                    key={s}
                                    style={[styles.statusChip, status === s && styles.statusChipActive]}
                                    onPress={() => setStatus(s)}
                                >
                                    <Text style={[styles.statusText, status === s && styles.statusTextActive]}>{s}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Legal Sections (Optional) */}
                    <Text style={styles.sectionTitle}>LEGAL SECTIONS (OPTIONAL)</Text>
                    <View style={styles.inputGroup}>
                        <TouchableOpacity
                            style={styles.addSectionBtn}
                            onPress={() => setShowSectionModal(true)}
                        >
                            <MaterialCommunityIcons name="plus" size={20} color={colors.accent} />
                            <Text style={styles.addSectionBtnText}>Add Section</Text>
                        </TouchableOpacity>

                        {sections.length > 0 && (
                            <View style={styles.sectionsList}>
                                {sections.map((sec) => (
                                    <View key={sec.id} style={styles.sectionChip}>
                                        <Text style={styles.sectionChipText}>
                                            {sec.act} {sec.section}{sec.description ? ` - ${sec.description}` : ''}
                                        </Text>
                                        <TouchableOpacity onPress={() => handleRemoveSection(sec.id)}>
                                            <MaterialCommunityIcons name="close-circle" size={18} color={colors.textTertiary} />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>

            {/* Case Type Modal */}
            <Modal
                visible={showTypeModal}
                animationType="slide"
                transparent
                statusBarTranslucent
                onRequestClose={() => setShowTypeModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Case Type</Text>
                        <FlatList
                            data={CASE_TYPES}
                            keyExtractor={item => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.modalItem, caseType === item && styles.modalItemSelected]}
                                    onPress={() => {
                                        setCaseType(item);
                                        setShowTypeModal(false);
                                    }}
                                >
                                    <Text style={[styles.modalItemText, caseType === item && styles.modalItemTextSelected]}>
                                        {item}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        />
                        <TouchableOpacity style={styles.closeButton} onPress={() => setShowTypeModal(false)}>
                            <Text style={styles.closeText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Case Stage Modal */}
            <Modal
                visible={showStageModal}
                animationType="slide"
                transparent
                statusBarTranslucent
                onRequestClose={() => setShowStageModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Case Stage</Text>
                        <FlatList
                            data={CASE_STAGES}
                            keyExtractor={item => item.value}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.modalItem, stage === item.value && styles.modalItemSelected]}
                                    onPress={() => {
                                        setStage(item.value);
                                        setShowStageModal(false);
                                    }}
                                >
                                    <Text style={[styles.modalItemText, stage === item.value && styles.modalItemTextSelected]}>
                                        {item.label}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        />
                        <TouchableOpacity style={styles.closeButton} onPress={() => setShowStageModal(false)}>
                            <Text style={styles.closeText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Add Section Modal */}
            <Modal
                visible={showSectionModal}
                animationType="slide"
                transparent
                statusBarTranslucent
                onRequestClose={() => setShowSectionModal(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Add Legal Section</Text>

                            <Text style={styles.label}>ACT</Text>
                            <TouchableOpacity style={styles.dropdown} onPress={() => setShowActPicker(true)}>
                                <Text style={styles.dropdownText}>
                                    {LEGAL_ACTS.find(a => a.value === sectionAct)?.label || 'Select Act'}
                                </Text>
                                <Text style={styles.dropdownArrow}>▼</Text>
                            </TouchableOpacity>

                            <Text style={[styles.label, { marginTop: spacing.m }]}>SECTION NUMBER</Text>
                            <TextInput
                                style={styles.input}
                                value={sectionNumber}
                                onChangeText={setSectionNumber}
                                placeholder="e.g., 302, 420, 34"
                                placeholderTextColor={colors.textTertiary}
                            />

                            <Text style={[styles.label, { marginTop: spacing.m }]}>DESCRIPTION (Optional)</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={sectionDesc}
                                onChangeText={setSectionDesc}
                                placeholder="Brief description..."
                                placeholderTextColor={colors.textTertiary}
                                multiline
                            />

                            <View style={[styles.statusRow, { marginTop: spacing.m }]}>
                                <TouchableOpacity style={[styles.statusChip, { flex: 1, alignItems: 'center', backgroundColor: colors.surface }]} onPress={() => setShowSectionModal(false)}>
                                    <Text style={styles.statusText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.statusChip, styles.statusChipActive, { flex: 1, alignItems: 'center' }]} onPress={handleAddSection}>
                                    <Text style={styles.statusTextActive}>Add</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Act Picker Modal */}
            <Modal
                visible={showActPicker}
                animationType="fade"
                transparent
                statusBarTranslucent
                onRequestClose={() => setShowActPicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Act</Text>
                        <FlatList
                            data={LEGAL_ACTS}
                            keyExtractor={item => item.value}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.modalItem, sectionAct === item.value && styles.modalItemSelected]}
                                    onPress={() => {
                                        setSectionAct(item.value);
                                        setShowActPicker(false);
                                    }}
                                >
                                    <Text style={[styles.modalItemText, sectionAct === item.value && styles.modalItemTextSelected]}>
                                        {item.label}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        />
                        <TouchableOpacity style={styles.closeButton} onPress={() => setShowActPicker(false)}>
                            <Text style={styles.closeText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView >
    );
};

const createStyles = (colors: any, spacing: any, layout: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.m, paddingVertical: spacing.s, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
    title: { color: colors.textPrimary, fontSize: 18, fontWeight: 'bold' },
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
    saveButton: { backgroundColor: colors.accent, shadowColor: colors.accent, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
    headerButtonText: { fontSize: 13, fontWeight: '600' },
    cancelButtonText: { color: colors.critical, fontWeight: '700' },
    saveButtonText: { color: colors.background === '#0A192F' ? '#FFFFFF' : '#FFFFFF' }, // Always white text on accent
    form: { padding: spacing.m, paddingBottom: 140 },
    sectionTitle: { color: colors.accent, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginTop: spacing.l, marginBottom: spacing.m },
    inputGroup: { marginBottom: spacing.l },
    label: { color: colors.textSecondary, fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: spacing.s },
    required: { color: colors.critical },
    input: { backgroundColor: colors.surface, color: colors.textPrimary, padding: spacing.m, borderRadius: layout.borderRadius, fontSize: 16, borderWidth: 1, borderColor: colors.border },
    inputError: { borderColor: colors.critical },
    textArea: { minHeight: 60, textAlignVertical: 'top' },
    errorText: { color: colors.critical, fontSize: 12, marginTop: 4 },
    dropdown: { backgroundColor: colors.surface, padding: spacing.m, borderRadius: layout.borderRadius, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    dropdownText: { color: colors.textPrimary, fontSize: 16 },
    dropdownArrow: { color: colors.textSecondary, fontSize: 12 },
    pickerContainer: { marginTop: spacing.s, backgroundColor: Platform.OS === 'ios' ? colors.surface : 'transparent', borderRadius: layout.borderRadius },
    statusRow: { flexDirection: 'row', gap: spacing.s, flexShrink: 0 },
    statusChip: { paddingHorizontal: spacing.m, paddingVertical: spacing.s, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
    statusChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    statusText: { color: colors.textSecondary, fontSize: 14 },
    statusTextActive: { color: colors.background, fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: spacing.l },
    modalContent: { backgroundColor: colors.surface, borderRadius: layout.borderRadius, maxHeight: '70%', padding: spacing.m },
    modalTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: 'bold', marginBottom: spacing.m, textAlign: 'center' },
    modalItem: { padding: spacing.m, borderBottomWidth: 1, borderBottomColor: colors.border },
    modalItemSelected: { backgroundColor: colors.surfaceHighlight },
    modalItemText: { color: colors.textPrimary, fontSize: 16 },
    modalItemTextSelected: { color: colors.accent, fontWeight: 'bold' },
    closeButton: { marginTop: spacing.m, alignItems: 'center', padding: spacing.m },
    closeText: { color: colors.accent, fontSize: 16, fontWeight: 'bold' },
    addSectionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.s,
        backgroundColor: colors.surface,
        padding: spacing.m,
        borderRadius: layout.borderRadius,
        borderWidth: 1,
        borderColor: colors.border,
        borderStyle: 'dashed',
    },
    addSectionBtnText: { color: colors.accent, fontSize: 14, fontWeight: '500' },
    sectionsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.s,
        marginTop: spacing.m,
    },
    sectionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.s,
        backgroundColor: colors.accent + '15',
        paddingHorizontal: spacing.m,
        paddingVertical: spacing.s,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.accent + '30',
    },
    sectionChipText: { color: colors.accent, fontSize: 13, fontWeight: '600' },
});
