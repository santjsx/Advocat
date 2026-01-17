import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch,
    Alert, TextInput, Platform, Modal, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../theme/ThemeContext';
import { spacing, layout } from '../theme/colors';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, MainTabParamList } from '../navigation/types';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import * as DocumentPicker from 'expo-document-picker';

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { cancelAllNotifications } from '../services/notifications';
import { Ionicons } from '@expo/vector-icons';
import { exportFullBackup, importFullBackup, estimateBackupSize, formatBackupSize } from '../services/backupService';

type Props = CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, 'Settings'>,
    NativeStackScreenProps<RootStackParamList>
>;

export const SettingsScreen: React.FC<Props> = ({ navigation }) => {
    const { colors, mode, toggleTheme } = useTheme();

    const userName = useAppStore(state => state.userName);
    const setUserName = useAppStore(state => state.setUserName);
    const notificationPrefs = useAppStore(state => state.notificationPrefs);
    const updateNotificationPrefs = useAppStore(state => state.updateNotificationPrefs);
    const notificationHistory = useAppStore(state => state.notificationHistory);

    const cases = useAppStore(state => state.cases);
    const deadlines = useAppStore(state => state.deadlines);
    const documents = useAppStore(state => state.documents);
    const citations = useAppStore(state => state.citations);
    const researchNotes = useAppStore(state => state.researchNotes);
    const searchHistory = useAppStore(state => state.searchHistory);
    const importData = useAppStore(state => state.importData);

    const [editingName, setEditingName] = useState(false);
    const [tempName, setTempName] = useState(userName);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showCustomDaysModal, setShowCustomDaysModal] = useState(false);
    const [customDays, setCustomDays] = useState(
        notificationPrefs.customDaysBefore?.toString() || ''
    );
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);

    const unreadCount = notificationHistory.filter(n => !n.read).length;

    // Futuristic glow animation for dev credits
    const glowAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(glowAnim, {
                    toValue: 1,
                    duration: 2000,
                    useNativeDriver: false,
                }),
                Animated.timing(glowAnim, {
                    toValue: 0,
                    duration: 2000,
                    useNativeDriver: false,
                }),
            ])
        ).start();
    }, []);

    const glowColor = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [colors.accent + '40', colors.accent + 'FF'],
    });

    const handleSaveName = () => {
        if (tempName.trim()) {
            setUserName(tempName.trim());
        }
        setEditingName(false);
    };

    const handleExportData = async () => {
        try {
            setIsBackingUp(true);

            // Estimate size first
            const estimatedSize = estimateBackupSize(documents);
            const sizeStr = formatBackupSize(estimatedSize);

            if (estimatedSize > 500 * 1024 * 1024) { // 500MB warning
                Alert.alert(
                    "Large Backup",
                    `Your backup will be approximately ${sizeStr}. This may take a while. Continue?`,
                    [
                        { text: "Cancel", style: "cancel", onPress: () => setIsBackingUp(false) },
                        { text: "Continue", onPress: async () => await performExport() }
                    ]
                );
            } else {
                await performExport();
            }
        } catch (e) {
            setIsBackingUp(false);
            Alert.alert("Export Failed", "Could not export data.");
        }
    };

    const performExport = async () => {
        try {
            const backupData = await exportFullBackup({
                cases,
                deadlines,
                documents,
                citations,
                researchNotes,
                searchHistory,
                userName,
                notificationPrefs,
            });

            const json = JSON.stringify(backupData);
            const fileUri = FileSystem.documentDirectory + 'advocat_backup.json';
            await FileSystem.writeAsStringAsync(fileUri, json);
            await Sharing.shareAsync(fileUri);
        } finally {
            setIsBackingUp(false);
        }
    };

    const handleImportData = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/json',
                copyToCacheDirectory: true
            });

            if (result.canceled) return;

            const file = result.assets[0];
            const content = await FileSystem.readAsStringAsync(file.uri);
            const data = JSON.parse(content);

            if (!data.cases && !data.deadlines) {
                Alert.alert("Invalid Backup", "The selected file does not appear to be a valid Advocat backup.");
                return;
            }

            const hasFiles = data.includesFiles === true;

            Alert.alert(
                "Restoring Backup",
                `Found:
• ${data.cases?.length || 0} Cases
• ${data.deadlines?.length || 0} Deadlines
• ${data.documents?.length || 0} Documents${hasFiles ? ' (with files)' : ' (metadata only)'}
• ${data.citations?.length || 0} Citations

This will REPLACE your current data. Are you sure?`,
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Import & Replace",
                        style: "destructive",
                        onPress: async () => {
                            try {
                                setIsRestoring(true);

                                if (hasFiles) {
                                    // Use full restore with file extraction
                                    const restoredData = await importFullBackup(data);
                                    importData(restoredData);
                                } else {
                                    // Legacy backup without files
                                    importData(data);
                                }

                                Alert.alert("Success", "Data imported successfully.");
                            } catch (err) {
                                Alert.alert("Import Error", "Some data may not have been restored.");
                            } finally {
                                setIsRestoring(false);
                            }
                        }
                    }
                ]
            );

        } catch (e) {
            console.error(e);
            Alert.alert("Import Failed", "Could not read or parse the backup file.");
        }
    };



    const handleTimeChange = (event: any, date?: Date) => {
        setShowTimePicker(Platform.OS === 'ios');
        if (date) {
            updateNotificationPrefs({ reminderTime: dayjs(date).format('HH:mm') });
        }
        if (Platform.OS === 'android') setShowTimePicker(false);
    };

    const handleSaveCustomDays = () => {
        const days = parseInt(customDays, 10);
        if (customDays === '' || customDays === '0') {
            updateNotificationPrefs({ customDaysBefore: null });
        } else if (!isNaN(days) && days > 0 && days <= 30) {
            updateNotificationPrefs({ customDaysBefore: days });
        } else {
            Alert.alert("Invalid", "Please enter a number between 1 and 30.");
            return;
        }
        setShowCustomDaysModal(false);
    };

    const handleDisableAllNotifications = async () => {
        Alert.alert(
            "Disable Notifications",
            "This will cancel all scheduled reminders. Continue?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Disable",
                    style: "destructive",
                    onPress: async () => {
                        updateNotificationPrefs({ enabled: false });
                        await cancelAllNotifications();
                    }
                }
            ]
        );
    };

    const [hours, minutes] = notificationPrefs.reminderTime.split(':').map(Number);
    const reminderTimeDate = new Date();
    reminderTimeDate.setHours(hours, minutes);

    const styles = createStyles(colors);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl, marginTop: spacing.s }}>
                    <Text style={{ color: colors.textPrimary, fontSize: 34, fontWeight: 'bold' }}>Settings</Text>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Help')}
                        style={{
                            paddingVertical: 8,
                            paddingHorizontal: 16,
                            backgroundColor: colors.surfaceHighlight,
                            borderRadius: 20,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6
                        }}
                    >
                        <Text style={{ color: colors.accent, fontWeight: '600', fontSize: 14 }}>Help</Text>
                        <Ionicons name="help-circle-outline" size={20} color={colors.accent} />
                    </TouchableOpacity>
                </View>

                {/* Appearance Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>APPEARANCE</Text>

                    <View style={styles.row}>
                        <View style={styles.labelContainer}>
                            <Ionicons name={mode === 'dark' ? "moon" : "sunny"} size={22} color={colors.accent} />
                            <View>
                                <Text style={styles.label}>Dark Mode</Text>
                                <Text style={styles.sublabel}>
                                    {mode === 'dark' ? 'Applied' : 'Disabled'}
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={mode === 'dark'}
                            onValueChange={() => toggleTheme()}
                            trackColor={{ false: colors.border, true: colors.accent }}
                            thumbColor={'white'}
                            ios_backgroundColor={colors.border}
                        />
                    </View>
                </View>

                {/* Profile Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>PROFILE</Text>

                    <View style={styles.row}>
                        <View style={styles.labelContainer}>
                            <Ionicons name="person" size={22} color={colors.accent} />
                            <Text style={styles.label}>Name</Text>
                        </View>
                        {editingName ? (
                            <View style={styles.editRow}>
                                <TextInput
                                    style={styles.input}
                                    value={tempName}
                                    onChangeText={setTempName}
                                    autoFocus
                                    onBlur={handleSaveName}
                                    onSubmitEditing={handleSaveName}
                                />
                            </View>
                        ) : (
                            <TouchableOpacity onPress={() => { setTempName(userName); setEditingName(true); }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <Text style={styles.value}>{userName}</Text>
                                    <View style={{
                                        backgroundColor: colors.accent + '20',
                                        paddingHorizontal: 10,
                                        paddingVertical: 6,
                                        borderRadius: 16,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 4
                                    }}>
                                        <Ionicons name="create-outline" size={14} color={colors.accent} />
                                        <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '600' }}>Edit</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Notification Preferences */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>

                    <View style={styles.row}>
                        <View style={styles.labelContainer}>
                            <Ionicons name="notifications" size={22} color={colors.accent} />
                            <Text style={styles.label}>Enable Reminders</Text>
                        </View>
                        <Switch
                            value={notificationPrefs.enabled}
                            onValueChange={(val) => {
                                if (!val) {
                                    handleDisableAllNotifications();
                                } else {
                                    updateNotificationPrefs({ enabled: true });
                                }
                            }}
                            trackColor={{ false: colors.border, true: colors.accent }}
                            thumbColor={'white'}
                            ios_backgroundColor={colors.border}
                        />
                    </View>

                    {notificationPrefs.enabled && (
                        <>
                            <View style={styles.row}>
                                <View style={styles.labelContainer}>
                                    <Ionicons name="today-outline" size={20} color={colors.textSecondary} />
                                    <Text style={styles.label}>Same Day</Text>
                                </View>
                                <Switch
                                    value={notificationPrefs.sameDayReminder}
                                    onValueChange={(val) => updateNotificationPrefs({ sameDayReminder: val })}
                                    trackColor={{ false: colors.border, true: colors.accent }}
                                    thumbColor={'white'}
                                />
                            </View>

                            <View style={styles.row}>
                                <View style={styles.labelContainer}>
                                    <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
                                    <Text style={styles.label}>1 Day Before</Text>
                                </View>
                                <Switch
                                    value={notificationPrefs.oneDayBefore}
                                    onValueChange={(val) => updateNotificationPrefs({ oneDayBefore: val })}
                                    trackColor={{ false: colors.border, true: colors.accent }}
                                    thumbColor={'white'}
                                />
                            </View>

                            <View style={styles.row}>
                                <View style={styles.labelContainer}>
                                    <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                                    <Text style={styles.label}>3 Days Before</Text>
                                </View>
                                <Switch
                                    value={notificationPrefs.threeDaysBefore}
                                    onValueChange={(val) => updateNotificationPrefs({ threeDaysBefore: val })}
                                    trackColor={{ false: colors.border, true: colors.accent }}
                                    thumbColor={'white'}
                                />
                            </View>

                            <TouchableOpacity style={styles.row} onPress={() => setShowCustomDaysModal(true)}>
                                <View style={styles.labelContainer}>
                                    <Ionicons name="construct-outline" size={20} color={colors.textSecondary} />
                                    <Text style={styles.label}>Custom Reminder</Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Text style={styles.value}>
                                        {notificationPrefs.customDaysBefore
                                            ? `${notificationPrefs.customDaysBefore} days`
                                            : 'Off'}
                                    </Text>
                                    <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.row} onPress={() => setShowTimePicker(true)}>
                                <View style={styles.labelContainer}>
                                    <Ionicons name="alarm-outline" size={20} color={colors.textSecondary} />
                                    <Text style={styles.label}>Reminder Time</Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Text style={styles.value}>
                                        {dayjs().hour(hours).minute(minutes).format('h:mm A')}
                                    </Text>
                                    <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                                </View>
                            </TouchableOpacity>

                            {(showTimePicker || Platform.OS === 'ios') && (
                                <DateTimePicker
                                    value={reminderTimeDate}
                                    mode="time"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={handleTimeChange}
                                    textColor={mode === 'dark' ? 'white' : 'black'}
                                />
                            )}
                        </>
                    )}
                </View>

                {/* Notification Center Link */}
                <TouchableOpacity
                    style={styles.linkSection}
                    onPress={() => navigation.navigate('Notifications')}
                >
                    <View style={styles.linkContent}>
                        <View style={{ backgroundColor: colors.accent + '20', padding: 8, borderRadius: 10 }}>
                            <Ionicons name="notifications" size={24} color={colors.accent} />
                        </View>
                        <View>
                            <Text style={styles.linkText}>Notification Center</Text>
                            {unreadCount > 0 ? (
                                <Text style={[styles.sublabel, { color: colors.critical }]}>
                                    {unreadCount} unread messages
                                </Text>
                            ) : (
                                <Text style={styles.sublabel}>No new notifications</Text>
                            )}
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color={colors.textTertiary} />
                </TouchableOpacity>

                {/* Data Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>DATA MANAGEMENT</Text>

                    <View style={styles.row}>
                        <View style={styles.labelContainer}>
                            <Ionicons name="briefcase-outline" size={20} color={colors.textSecondary} />
                            <Text style={styles.label}>Total Cases</Text>
                        </View>
                        <Text style={styles.value}>{cases.length}</Text>
                    </View>

                    <View style={styles.row}>
                        <View style={styles.labelContainer}>
                            <Ionicons name="timer-outline" size={20} color={colors.textSecondary} />
                            <Text style={styles.label}>Active Deadlines</Text>
                        </View>
                        <Text style={styles.value}>{deadlines.length}</Text>
                    </View>

                    <TouchableOpacity style={styles.button} onPress={handleExportData}>
                        <Ionicons name="download-outline" size={20} color="white" />
                        <Text style={styles.buttonText}>Export Data (JSON)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.buttonOutline} onPress={handleImportData}>
                        <Ionicons name="cloud-upload-outline" size={20} color={colors.textPrimary} />
                        <Text style={styles.buttonTextOutline}>Import Backup</Text>
                    </TouchableOpacity>
                </View>

                {/* App Info */}
                {/* App Info & Credits */}
                <View style={[styles.section, { alignItems: 'center', paddingVertical: 30 }]}>
                    <Ionicons name="prism" size={40} color={colors.accent} style={{ marginBottom: 16 }} />
                    <Text style={[styles.label, { fontSize: 24, fontWeight: 'bold', marginBottom: 4 }]}>Advocat</Text>
                    <Text style={[styles.sublabel, { fontSize: 14, marginBottom: 24 }]}>Version 2.0.0</Text>

                    <View style={{ height: 1, backgroundColor: colors.border, width: '40%', marginBottom: 24 }} />

                    <View style={{ alignItems: 'center' }}>
                        <Text style={[styles.sublabel, { fontSize: 11, textTransform: 'uppercase', letterSpacing: 3, marginBottom: 12, opacity: 0.6 }]}>Developed by</Text>
                        <Animated.View style={{
                            backgroundColor: colors.surfaceHighlight,
                            paddingHorizontal: 24,
                            paddingVertical: 12,
                            borderRadius: 30,
                            borderWidth: 1.5,
                            borderColor: glowColor,
                            shadowColor: colors.accent,
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.5,
                            shadowRadius: 15,
                            elevation: 10,
                            marginBottom: 24,
                        }}>
                            <Text style={{
                                color: colors.accent,
                                fontSize: 20,
                                fontWeight: '300',
                                letterSpacing: 4,
                                textTransform: 'uppercase',
                            }}>SANTHOSH</Text>
                        </Animated.View>

                        <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
                            <Text style={[styles.sublabel, { color: colors.accent, fontSize: 13, textDecorationLine: 'underline' }]}>
                                Privacy Policy
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

            </ScrollView>

            {/* Custom Days Modal - Functionality retained, style updated in createStyles */}
            <Modal visible={showCustomDaysModal} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Custom Reminder</Text>
                        <Text style={styles.modalSubtitle}>How many days before the deadline?</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={customDays}
                            onChangeText={setCustomDays}
                            keyboardType="number-pad"
                            placeholder="e.g. 7"
                            placeholderTextColor={colors.textTertiary}
                            autoFocus
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalCancel}
                                onPress={() => setShowCustomDaysModal(false)}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalSave}
                                onPress={handleSaveCustomDays}
                            >
                                <Text style={styles.modalSaveText}>Save Goal</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        padding: spacing.m,
        paddingBottom: 120,
    },
    title: {
        color: colors.textPrimary,
        fontSize: 34,
        fontWeight: 'bold',
        marginBottom: spacing.xl,
        marginTop: spacing.s,
    },
    section: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: spacing.m,
        marginBottom: spacing.l,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    sectionTitle: {
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 1.2,
        marginBottom: spacing.m,
        textTransform: 'uppercase',
        opacity: 0.8,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border + '40', // Very subtle border
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    label: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '500',
    },
    sublabel: {
        color: colors.textTertiary,
        fontSize: 13,
        marginTop: 2,
    },
    value: {
        color: colors.textSecondary,
        fontSize: 16,
        fontWeight: '500',
    },
    editRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    input: {
        backgroundColor: colors.surfaceHighlight,
        color: colors.textPrimary,
        paddingHorizontal: spacing.m,
        paddingVertical: spacing.s,
        borderRadius: 8,
        minWidth: 150,
        textAlign: 'right',
        fontSize: 16,
    },
    button: {
        marginTop: spacing.m,
        padding: 16,
        backgroundColor: colors.accent,
        borderRadius: 12,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonOutline: {
        marginTop: spacing.s,
        padding: 16,
        backgroundColor: 'transparent',
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: colors.border,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    buttonTextOutline: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '600',
    },
    linkSection: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: spacing.m, // 16
        marginBottom: spacing.l, // 24
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        paddingVertical: 20,
    },
    linkContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    linkText: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: '600',
    },
    linkArrow: {
        color: colors.textTertiary,
        fontSize: 18,
    },
    unreadBadge: {
        backgroundColor: colors.critical,
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    unreadCount: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        padding: spacing.l,
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderRadius: 24,
        padding: spacing.xl,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    modalTitle: {
        color: colors.textPrimary,
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: spacing.xs,
        textAlign: 'center',
    },
    modalSubtitle: {
        color: colors.textSecondary,
        fontSize: 15,
        marginBottom: spacing.l,
        textAlign: 'center',
    },
    modalInput: {
        backgroundColor: colors.surfaceHighlight,
        color: colors.textPrimary,
        padding: spacing.m,
        borderRadius: 12,
        fontSize: 20,
        textAlign: 'center',
        marginBottom: spacing.l,
        fontWeight: '600',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: spacing.m,
    },
    modalCancel: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    modalCancelText: {
        color: colors.textSecondary,
        fontSize: 16,
        fontWeight: '600',
    },
    modalSave: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        backgroundColor: colors.accent,
        alignItems: 'center',
    },
    modalSaveText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});
