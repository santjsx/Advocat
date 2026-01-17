import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity, Alert,
    ScrollView, Platform, Modal, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAppStore } from '../store/useAppStore';
import { colors, spacing, layout } from '../theme/colors';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { DeadlineType, DEADLINE_TYPES, UrgencyLevel, URGENCY_LEVELS } from '../models/Deadline';
import { cancelNotifications, scheduleDeadlineNotifications } from '../services/notifications';

type Props = NativeStackScreenProps<RootStackParamList, 'EditDeadline'>;

const URGENCY_COLORS: Record<UrgencyLevel, string> = {
    CRITICAL: colors.critical,
    HIGH: colors.warning,
    MEDIUM: colors.accent,
    LOW: colors.safe,
};

export const EditDeadlineScreen: React.FC<Props> = ({ navigation, route }) => {
    const { deadlineId } = route.params;
    const deadlines = useAppStore(state => state.deadlines);
    const cases = useAppStore(state => state.cases);
    const updateDeadline = useAppStore(state => state.updateDeadline);
    const deleteDeadline = useAppStore(state => state.deleteDeadline);
    const notificationPrefs = useAppStore(state => state.notificationPrefs);

    const currentDeadline = deadlines.find(d => d.id === deadlineId);

    const [title, setTitle] = useState('');
    const [type, setType] = useState<DeadlineType>('HEARING');
    const [date, setDate] = useState(new Date());
    const [urgency, setUrgency] = useState<UrgencyLevel>('MEDIUM');
    const [description, setDescription] = useState('');
    const [isCompleted, setIsCompleted] = useState(false);

    const [showPicker, setShowPicker] = useState(false);
    const [showTypeModal, setShowTypeModal] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (currentDeadline) {
            setTitle(currentDeadline.title);
            setType(currentDeadline.type);
            setDate(new Date(currentDeadline.dueDate));
            setUrgency(currentDeadline.urgency);
            setDescription(currentDeadline.description || '');
            setIsCompleted(currentDeadline.isCompleted);
        }
    }, [currentDeadline]);

    if (!currentDeadline) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>Deadline not found.</Text>
            </View>
        );
    }

    const caseName = cases.find(c => c.id === currentDeadline.caseId)?.name || 'Unknown Case';

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!title.trim()) newErrors.title = 'Title is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) {
            Alert.alert("Validation Error", "Please fill all required fields.");
            return;
        }

        // Cancel old notifications
        if (currentDeadline.notificationIds.length > 0) {
            await cancelNotifications(currentDeadline.notificationIds);
        }

        const updatedDeadline = {
            ...currentDeadline,
            title: title.trim(),
            type,
            dueDate: date.toISOString(),
            urgency,
            description: description.trim() || undefined,
            isCompleted,
            notificationIds: [] as string[],
            updatedAt: new Date().toISOString(),
        };

        // Schedule new notifications if enabled and not completed
        if (notificationPrefs.enabled && !isCompleted) {
            try {
                const notifIds = await scheduleDeadlineNotifications({
                    deadline: updatedDeadline,
                    caseName: caseName,
                    prefs: notificationPrefs
                });
                updatedDeadline.notificationIds = notifIds;
            } catch (e) {
                console.warn("Failed to schedule notifications", e);
            }
        }

        updateDeadline(updatedDeadline);
        navigation.goBack();
    };

    const handleDelete = () => {
        Alert.alert(
            "Delete Deadline",
            "Are you sure you want to delete this deadline?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        // Cancel notifications
                        if (currentDeadline.notificationIds.length > 0) {
                            await cancelNotifications(currentDeadline.notificationIds);
                        }
                        deleteDeadline(deadlineId);
                        navigation.goBack();
                    }
                }
            ]
        );
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
                <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.headerButton, styles.cancelButton]}>
                    <Text style={[styles.headerButtonText, styles.cancelButtonText]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Deadline</Text>
                <TouchableOpacity onPress={handleSave} style={[styles.headerButton, styles.saveButton]}>
                    <Text style={[styles.headerButtonText, styles.saveButtonText]}>Save</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
                {/* Case (Read Only) */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>CASE</Text>
                    <View style={styles.readOnlyField}>
                        <Text style={styles.readOnlyText}>{caseName}</Text>
                    </View>
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
                    <Text style={styles.label}>TYPE</Text>
                    <TouchableOpacity style={styles.dropdown} onPress={() => setShowTypeModal(true)}>
                        <Text style={styles.dropdownText}>{type.replace('_', ' ')}</Text>
                        <Text style={styles.dropdownArrow}>▼</Text>
                    </TouchableOpacity>
                </View>

                {/* Due Date */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>DUE DATE</Text>
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
                                <Text style={[styles.urgencyText, urgency === u && styles.urgencyTextActive]}>
                                    {u}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Status Toggle */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>STATUS</Text>
                    <View style={styles.statusRow}>
                        <TouchableOpacity
                            style={[styles.statusChip, !isCompleted && styles.statusChipActive]}
                            onPress={() => setIsCompleted(false)}
                        >
                            <Text style={[styles.statusText, !isCompleted && styles.statusTextActive]}>PENDING</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.statusChip, isCompleted && styles.statusChipCompleted]}
                            onPress={() => setIsCompleted(true)}
                        >
                            <Text style={[styles.statusText, isCompleted && styles.statusTextActive]}>COMPLETED</Text>
                        </TouchableOpacity>
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

                {/* Delete Button */}
                <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                    <Text style={styles.deleteText}>Delete Deadline</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Type Selection Modal */}
            <Modal visible={showTypeModal} animationType="slide" transparent>
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    errorText: {
        color: colors.textSecondary,
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
        backgroundColor: 'transparent',
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
        fontSize: 14,
        fontWeight: '600',
    },
    cancelButtonText: {
        color: colors.textSecondary,
    },
    saveButtonText: {
        color: '#FFFFFF',
    },
    form: {
        padding: spacing.m,
        paddingBottom: spacing.xxl,
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
    readOnlyField: {
        backgroundColor: colors.surfaceHighlight,
        padding: spacing.m,
        borderRadius: layout.borderRadius,
        borderWidth: 1,
        borderColor: colors.border,
    },
    readOnlyText: {
        color: colors.textSecondary,
        fontSize: 16,
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
    statusRow: {
        flexDirection: 'row',
        gap: spacing.s,
    },
    statusChip: {
        flex: 1,
        paddingVertical: spacing.m,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    statusChipActive: {
        backgroundColor: colors.warning,
        borderColor: colors.warning,
    },
    statusChipCompleted: {
        backgroundColor: colors.safe,
        borderColor: colors.safe,
    },
    statusText: {
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: '600',
    },
    statusTextActive: {
        color: colors.background,
    },
    deleteButton: {
        marginTop: spacing.l,
        padding: spacing.m,
        borderRadius: layout.borderRadius,
        borderWidth: 1,
        borderColor: colors.critical,
        alignItems: 'center',
    },
    deleteText: {
        color: colors.critical,
        fontSize: 16,
        fontWeight: '600',
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
