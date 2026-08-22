import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity, Alert,
    ScrollView, Platform, Modal, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../theme/ThemeContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import * as Crypto from 'expo-crypto';
import { Deadline, DeadlineType, DEADLINE_TYPES, UrgencyLevel, URGENCY_LEVELS } from '../models/Deadline';
import { scheduleDeadlineNotifications } from '../services/notifications';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '../context/ToastContext';
import 'react-native-get-random-values';

type Props = NativeStackScreenProps<RootStackParamList, 'AddDeadline'>;

export const AddDeadlineScreen: React.FC<Props> = ({ navigation, route }) => {
    const { colors, spacing, layout } = useTheme();
    const { caseId: initialCaseId } = route.params || {};
    const cases = useAppStore(state => state.cases);
    const addDeadline = useAppStore(state => state.addDeadline);
    const notificationPrefs = useAppStore(state => state.notificationPrefs);

    const URGENCY_COLORS: Record<UrgencyLevel, string> = {
        CRITICAL: colors.critical,
        HIGH: colors.warning,
        MEDIUM: colors.accent,
        LOW: colors.safe,
    };

    const styles = createStyles(colors, spacing, layout);

    const [title, setTitle] = useState('');
    const [caseId, setCaseId] = useState(route.params?.caseId || '');
    const [type, setType] = useState<DeadlineType>('HEARING');
    const [date, setDate] = useState(new Date());
    const [urgency, setUrgency] = useState<UrgencyLevel>('MEDIUM');
    const [description, setDescription] = useState('');

    const [showPicker, setShowPicker] = useState(false);
    const [showTypeModal, setShowTypeModal] = useState(false);
    const [showCaseModal, setShowCaseModal] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const { showToast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const activeCases = cases.filter(c => c.status === 'ACTIVE');
    const selectedCase = cases.find(c => c.id === caseId);

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!title.trim()) newErrors.title = 'Title is required';
        if (!caseId) newErrors.caseId = 'Case is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (isSaving) return;

        if (!validate()) {
            showToast({
                message: 'Please fill all required fields.',
                type: 'error'
            });
            return;
        }

        setIsSaving(true);
        const newDeadline: Deadline = {
            id: uuidv4(),
            caseId,
            title: title.trim(),
            type,
            dueDate: date.toISOString(),
            urgency,
            description: description.trim() || undefined,
            isCompleted: false,
            notificationIds: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        // Schedule Notifications if enabled
        if (notificationPrefs.enabled) {
            try {
                const caseName = cases.find(c => c.id === caseId)?.name || 'Unknown Case';
                const notifIds = await scheduleDeadlineNotifications({
                    deadline: newDeadline,
                    caseName: caseName,
                    prefs: notificationPrefs
                });
                newDeadline.notificationIds = notifIds;
            } catch (e) {
                console.warn("Failed to schedule notifications", e);
            }
        }

        addDeadline(newDeadline);
        showToast({
            message: 'Deadline scheduled successfully.',
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
                >
                    <Ionicons name="close" size={15} color={colors.critical} />
                    <Text style={[styles.headerButtonText, styles.cancelButtonText]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Deadline</Text>
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

            <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
                {/* Case Selection */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>CASE <Text style={styles.required}>*</Text></Text>
                    <TouchableOpacity
                        style={[styles.dropdown, errors.case && styles.inputError]}
                        onPress={() => !initialCaseId && setShowCaseModal(true)}
                        disabled={!!initialCaseId}
                    >
                        <Text style={[styles.dropdownText, !selectedCase && styles.placeholder]}>
                            {selectedCase ? selectedCase.name : "Select Case"}
                        </Text>
                        {!initialCaseId && <Text style={styles.dropdownArrow}>▼</Text>}
                    </TouchableOpacity>
                </View>

                {/* Title */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>TITLE <Text style={styles.required}>*</Text></Text>
                    <TextInput
                        style={[styles.input, errors.title && styles.inputError]}
                        placeholder="e.g. Submit Rejoinder"
                        placeholderTextColor={colors.textTertiary}
                        value={title}
                        onChangeText={setTitle}
                    />
                </View>

                {/* Deadline Type */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>TYPE <Text style={styles.required}>*</Text></Text>
                    <TouchableOpacity style={styles.dropdown} onPress={() => setShowTypeModal(true)}>
                        <Text style={styles.dropdownText}>{type.replace('_', ' ')}</Text>
                        <Text style={styles.dropdownArrow}>▼</Text>
                    </TouchableOpacity>
                </View>

                {/* Due Date */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>DUE DATE <Text style={styles.required}>*</Text></Text>
                    <TouchableOpacity style={styles.dropdown} onPress={() => setShowPicker(true)}>
                        <Text style={styles.dropdownText}>{dayjs(date).format('ddd, DD MMM YYYY')}</Text>
                    </TouchableOpacity>
                    {(showPicker || Platform.OS === 'ios') && (
                        <View style={styles.pickerContainer}>
                            {Platform.OS === 'ios' ? (
                                <DateTimePicker
                                    value={date}
                                    mode="date"
                                    display="spinner"
                                    onChange={onDateChange}
                                    textColor="white"
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

                {/* Urgency Level */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>URGENCY</Text>
                    <View style={styles.urgencyRow}>
                        {URGENCY_LEVELS.map(u => (
                            <TouchableOpacity
                                key={u}
                                style={[
                                    styles.urgencyChip,
                                    urgency === u && { backgroundColor: URGENCY_COLORS[u], borderColor: URGENCY_COLORS[u] }
                                ]}
                                onPress={() => setUrgency(u)}
                            >
                                <Text style={[
                                    styles.urgencyText,
                                    urgency === u && styles.urgencyTextActive
                                ]}>
                                    {u}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Description */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>NOTES</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Additional details..."
                        placeholderTextColor={colors.textTertiary}
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={4}
                    />
                </View>
            </ScrollView>

            {/* Case Selection Modal */}
            <Modal
                visible={showCaseModal}
                animationType="slide"
                transparent
                statusBarTranslucent
                onRequestClose={() => setShowCaseModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Case</Text>
                        <FlatList
                            data={cases.filter(c => c.status === 'ACTIVE')}
                            keyExtractor={item => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.modalItem}
                                    onPress={() => {
                                        setCaseId(item.id);
                                        setShowCaseModal(false);
                                    }}
                                >
                                    <Text style={styles.modalItemText}>{item.name}</Text>
                                    <Text style={styles.modalItemSub}>{item.clientName}</Text>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <Text style={styles.emptyText}>No active cases. Create a case first.</Text>
                            }
                        />
                        <TouchableOpacity style={styles.closeButton} onPress={() => setShowCaseModal(false)}>
                            <Text style={styles.closeText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Type Selection Modal */}
            <Modal
                visible={showTypeModal}
                animationType="slide"
                transparent
                statusBarTranslucent
                onRequestClose={() => setShowTypeModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Deadline Type</Text>
                        <FlatList
                            data={DEADLINE_TYPES}
                            keyExtractor={item => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.modalItem, type === item && styles.modalItemSelected]}
                                    onPress={() => {
                                        setType(item);
                                        setShowTypeModal(false);
                                    }}
                                >
                                    <Text style={[styles.modalItemText, type === item && styles.modalItemTextSelected]}>
                                        {item.replace('_', ' ')}
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
        </SafeAreaView>
    );
};

const createStyles = (colors: any, spacing: any, layout: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.m,
        paddingVertical: spacing.s,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.surface,
    },
    headerTitle: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: 'bold',
    },
    headerButton: {
        paddingHorizontal: spacing.l,
        paddingVertical: 8,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
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
    saveButton: {
        backgroundColor: colors.accent,
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    headerButtonText: {
        fontSize: 13,
        fontWeight: '600',
    },
    cancelButtonText: {
        color: colors.critical,
        fontWeight: '700',
    },
    saveButtonText: {
        color: '#FFFFFF',
    },
    form: {
        padding: spacing.m,
        paddingBottom: 140,
    },
    inputGroup: {
        marginBottom: spacing.l,
    },
    label: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.5,
        marginBottom: spacing.s,
    },
    required: {
        color: colors.critical,
    },
    input: {
        backgroundColor: colors.surface,
        color: colors.textPrimary,
        padding: spacing.m,
        borderRadius: layout.borderRadius,
        fontSize: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    inputError: {
        borderColor: colors.critical,
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    dropdown: {
        backgroundColor: colors.surface,
        padding: spacing.m,
        borderRadius: layout.borderRadius,
        borderWidth: 1,
        borderColor: colors.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dropdownText: {
        color: colors.textPrimary,
        fontSize: 16,
    },
    dropdownArrow: {
        color: colors.textSecondary,
        fontSize: 12,
    },
    placeholder: {
        color: colors.textTertiary,
        fontStyle: 'italic',
    },
    pickerContainer: {
        marginTop: spacing.s,
        backgroundColor: Platform.OS === 'ios' ? colors.surface : 'transparent',
        borderRadius: layout.borderRadius,
    },
    urgencyRow: {
        flexDirection: 'row',
        gap: spacing.s,
    },
    urgencyChip: {
        flex: 1,
        paddingVertical: spacing.s,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    urgencyText: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
    },
    urgencyTextActive: {
        color: colors.background,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        padding: spacing.l,
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderRadius: layout.borderRadius,
        maxHeight: '70%',
        padding: spacing.m,
    },
    modalTitle: {
        color: colors.textPrimary,
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: spacing.m,
        textAlign: 'center',
    },
    modalItem: {
        padding: spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalItemSelected: {
        backgroundColor: colors.surfaceHighlight,
    },
    modalItemText: {
        color: colors.textPrimary,
        fontSize: 16,
    },
    modalItemTextSelected: {
        color: colors.accent,
        fontWeight: 'bold',
    },
    modalItemSub: {
        color: colors.textSecondary,
        fontSize: 14,
        marginTop: 2,
    },
    emptyText: {
        color: colors.textTertiary,
        textAlign: 'center',
        padding: spacing.l,
    },
    closeButton: {
        marginTop: spacing.m,
        alignItems: 'center',
        padding: spacing.m,
    },
    closeText: {
        color: colors.accent,
        fontSize: 16,
        fontWeight: 'bold',
    },
});
