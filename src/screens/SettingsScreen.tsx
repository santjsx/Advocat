import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch,
    Alert, TextInput, Platform, Modal, Animated, ActivityIndicator
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
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { AdvocateProfile, COURT_TIERS, CourtTier, DEFAULT_ADVOCATE_PROFILE } from '../models/Pleading';
import { testDeepSeekConnection } from '../services/aiPleadingService';
import {
    formatTokens,
    formatUsd,
    formatInr,
    formatBalanceDual,
    formatCostDual
} from '../services/deepseekUsageService';

type Props = CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, 'Settings'>,
    NativeStackScreenProps<RootStackParamList>
>;

export const SettingsScreen: React.FC<Props> = ({ navigation }) => {
    const { colors, mode, toggleTheme } = useTheme();

    const userName = useAppStore(state => state.userName);
    const setUserName = useAppStore(state => state.setUserName);
    const advocateProfile = useAppStore(state => state.advocateProfile) || DEFAULT_ADVOCATE_PROFILE;
    const updateAdvocateProfile = useAppStore(state => state.updateAdvocateProfile);
    const aiUsageSummary = useAppStore(state => state.aiUsageSummary);
    const syncDeepSeekBalance = useAppStore(state => state.syncDeepSeekBalance);
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
    const loadMockData = useAppStore(state => state.loadMockData);

    const [editingName, setEditingName] = useState(false);
    const [tempName, setTempName] = useState(userName);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showCustomDaysModal, setShowCustomDaysModal] = useState(false);
    const [customDays, setCustomDays] = useState(
        notificationPrefs.customDaysBefore?.toString() || ''
    );
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);

    // Advocate Profile & AI State
    const [showAdvocateModal, setShowAdvocateModal] = useState(false);
    const [advocateName, setAdvocateName] = useState(advocateProfile.name || userName || '');
    const [barEnrolment, setBarEnrolment] = useState(advocateProfile.barEnrolment || '');
    const [chamberAddress, setChamberAddress] = useState(advocateProfile.chamberAddress || '');
    const [advocatePhone, setAdvocatePhone] = useState(advocateProfile.phone || '');
    const [advocateEmail, setAdvocateEmail] = useState(advocateProfile.email || '');
    const [defaultCourtTier, setDefaultCourtTier] = useState<CourtTier>(advocateProfile.defaultCourtTier || 'MADRAS_HC_CHENNAI');

    // DeepSeek AI State
    const [apiKey, setApiKey] = useState(advocateProfile.deepseekApiKey || '');
    const [showApiKey, setShowApiKey] = useState(false);
    const [isTestingApiKey, setIsTestingApiKey] = useState(false);
    const [apiTestStatus, setApiTestStatus] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null);
    const [selectedModel, setSelectedModel] = useState<'deepseek-chat' | 'deepseek-reasoner'>(advocateProfile.selectedModel || 'deepseek-chat');
    const [isSyncingTelemetry, setIsSyncingTelemetry] = useState(false);

    const unreadCount = notificationHistory.filter(n => !n.read).length;

    // Modern Animated Toast Notification
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [toastType, setToastType] = useState<'success' | 'info' | 'error'>('success');
    const toastOpacity = useRef(new Animated.Value(0)).current;
    const toastTranslateY = useRef(new Animated.Value(-20)).current;

    const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
        setToastMessage(message);
        setToastType(type);
        toastOpacity.setValue(0);
        toastTranslateY.setValue(-20);

        Animated.parallel([
            Animated.timing(toastOpacity, {
                toValue: 1,
                duration: 220,
                useNativeDriver: true,
            }),
            Animated.spring(toastTranslateY, {
                toValue: 0,
                friction: 7,
                tension: 60,
                useNativeDriver: true,
            }),
        ]).start();

        setTimeout(() => {
            Animated.parallel([
                Animated.timing(toastOpacity, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(toastTranslateY, {
                    toValue: -15,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setToastMessage(null);
            });
        }, 2200);
    };

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
            updateAdvocateProfile({ name: tempName.trim() });
        }
        setEditingName(false);
    };

    const handleSaveAdvocateProfile = () => {
        updateAdvocateProfile({
            name: advocateName.trim() || userName,
            barEnrolment: barEnrolment.trim(),
            chamberAddress: chamberAddress.trim(),
            phone: advocatePhone.trim(),
            email: advocateEmail.trim(),
            defaultCourtTier: defaultCourtTier,
        });
        if (advocateName.trim()) {
            setUserName(advocateName.trim());
        }
        setShowAdvocateModal(false);
        showToast("Advocate credentials saved successfully!", "success");
    };

    const handleSaveApiKey = () => {
        updateAdvocateProfile({
            deepseekApiKey: apiKey.trim(),
            selectedModel: selectedModel,
        });
        showToast("DeepSeek API key saved securely!", "success");
    };

    const handleTestApiKey = async () => {
        if (!apiKey || !apiKey.trim()) {
            showToast("Please enter a DeepSeek API key to test", "error");
            return;
        }

        setIsTestingApiKey(true);
        setApiTestStatus(null);
        try {
            const result = await testDeepSeekConnection(apiKey.trim());
            setApiTestStatus(result);
            if (result.success) {
                updateAdvocateProfile({
                    deepseekApiKey: apiKey.trim(),
                    selectedModel: selectedModel,
                });
                await syncDeepSeekBalance();
            }
        } finally {
            setIsTestingApiKey(false);
        }
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
            {/* Animated Floating Toast */}
            {toastMessage && (
                <Animated.View
                    pointerEvents="none"
                    style={[
                        styles.toastContainer,
                        {
                            opacity: toastOpacity,
                            transform: [{ translateY: toastTranslateY }],
                        },
                    ]}
                >
                    <View style={styles.toastCard}>
                        <View
                            style={[
                                styles.toastIconCircle,
                                toastType === 'success' && { backgroundColor: colors.safe + '20' },
                                toastType === 'error' && { backgroundColor: colors.critical + '20' },
                                toastType === 'info' && { backgroundColor: colors.accent + '20' },
                            ]}
                        >
                            <Ionicons
                                name={
                                    toastType === 'success'
                                        ? 'checkmark-circle'
                                        : toastType === 'error'
                                        ? 'alert-circle'
                                        : 'information-circle'
                                }
                                size={18}
                                color={
                                    toastType === 'success'
                                        ? colors.safe
                                        : toastType === 'error'
                                        ? colors.critical
                                        : colors.accent
                                }
                            />
                        </View>
                        <Text style={styles.toastText}>{toastMessage}</Text>
                    </View>
                </Animated.View>
            )}

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

                {/* Advocate Bar Credentials & TN Court Settings */}
                <View style={styles.section}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.m }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 }}>
                            <View style={{
                                width: 28,
                                height: 28,
                                borderRadius: 8,
                                backgroundColor: colors.accent + '20',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <Ionicons name="ribbon-outline" size={16} color={colors.accent} />
                            </View>
                            <Text style={[styles.sectionTitle, { marginBottom: 0, flex: 1 }]} numberOfLines={1}>
                                ADVOCATE BAR PROFILE
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => {
                                setAdvocateName(advocateProfile.name || userName);
                                setBarEnrolment(advocateProfile.barEnrolment || '');
                                setChamberAddress(advocateProfile.chamberAddress || '');
                                setAdvocatePhone(advocateProfile.phone || '');
                                setAdvocateEmail(advocateProfile.email || '');
                                setDefaultCourtTier(advocateProfile.defaultCourtTier || 'MADRAS_HC_CHENNAI');
                                setShowAdvocateModal(true);
                            }}
                            style={{
                                backgroundColor: colors.accent + '15',
                                paddingHorizontal: 10,
                                paddingVertical: 5,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: colors.accent + '30',
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 4
                            }}
                        >
                            <Ionicons name="create-outline" size={13} color={colors.accent} />
                            <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '600' }}>Edit</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Bar Enrolment */}
                    <TouchableOpacity
                        onPress={() => {
                            setAdvocateName(advocateProfile.name || userName);
                            setBarEnrolment(advocateProfile.barEnrolment || '');
                            setChamberAddress(advocateProfile.chamberAddress || '');
                            setAdvocatePhone(advocateProfile.phone || '');
                            setAdvocateEmail(advocateProfile.email || '');
                            setDefaultCourtTier(advocateProfile.defaultCourtTier || 'MADRAS_HC_CHENNAI');
                            setShowAdvocateModal(true);
                        }}
                        style={styles.row}
                    >
                        <View style={[styles.labelContainer, { flex: 1, marginRight: 10 }]}>
                            <View style={{
                                width: 34,
                                height: 34,
                                borderRadius: 9,
                                backgroundColor: colors.surfaceHighlight,
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <Ionicons name="card-outline" size={18} color={colors.accent} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Bar Enrolment No.</Text>
                                <Text style={styles.sublabel}>Vakalatnama & Dockets</Text>
                            </View>
                        </View>
                        <View style={{
                            backgroundColor: advocateProfile.barEnrolment ? colors.accent + '15' : colors.surfaceHighlight,
                            borderWidth: 1,
                            borderColor: advocateProfile.barEnrolment ? colors.accent + '35' : colors.border,
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 8,
                            maxWidth: '45%',
                        }}>
                            <Text
                                style={{
                                    color: advocateProfile.barEnrolment ? colors.textPrimary : colors.textTertiary,
                                    fontSize: 13,
                                    fontWeight: advocateProfile.barEnrolment ? '700' : '500',
                                    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                                }}
                                numberOfLines={1}
                            >
                                {advocateProfile.barEnrolment || 'Not Set'}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {/* Chamber Address */}
                    <TouchableOpacity
                        onPress={() => {
                            setAdvocateName(advocateProfile.name || userName);
                            setBarEnrolment(advocateProfile.barEnrolment || '');
                            setChamberAddress(advocateProfile.chamberAddress || '');
                            setAdvocatePhone(advocateProfile.phone || '');
                            setAdvocateEmail(advocateProfile.email || '');
                            setDefaultCourtTier(advocateProfile.defaultCourtTier || 'MADRAS_HC_CHENNAI');
                            setShowAdvocateModal(true);
                        }}
                        style={styles.row}
                    >
                        <View style={[styles.labelContainer, { flex: 1, marginRight: 10 }]}>
                            <View style={{
                                width: 34,
                                height: 34,
                                borderRadius: 9,
                                backgroundColor: colors.surfaceHighlight,
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <Ionicons name="business-outline" size={18} color={colors.accent} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Chamber Address</Text>
                                <Text style={styles.sublabel} numberOfLines={1}>
                                    {advocateProfile.chamberAddress || 'High Court Buildings, Chennai'}
                                </Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                    </TouchableOpacity>

                    {/* Default Bench */}
                    <TouchableOpacity
                        onPress={() => {
                            setAdvocateName(advocateProfile.name || userName);
                            setBarEnrolment(advocateProfile.barEnrolment || '');
                            setChamberAddress(advocateProfile.chamberAddress || '');
                            setAdvocatePhone(advocateProfile.phone || '');
                            setAdvocateEmail(advocateProfile.email || '');
                            setDefaultCourtTier(advocateProfile.defaultCourtTier || 'MADRAS_HC_CHENNAI');
                            setShowAdvocateModal(true);
                        }}
                        style={[styles.row, { borderBottomWidth: 0, paddingBottom: 4 }]}
                    >
                        <View style={[styles.labelContainer, { flex: 1, marginRight: 10 }]}>
                            <View style={{
                                width: 34,
                                height: 34,
                                borderRadius: 9,
                                backgroundColor: colors.surfaceHighlight,
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <Ionicons name="trail-sign-outline" size={18} color={colors.accent} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Default Court Bench</Text>
                                <Text style={styles.sublabel} numberOfLines={1}>
                                    {COURT_TIERS.find(t => t.value === advocateProfile.defaultCourtTier)?.shortName || 'Madras High Court (Chennai)'}
                                </Text>
                            </View>
                        </View>
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            backgroundColor: colors.safe + '15',
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: colors.safe + '30',
                        }}>
                            <Ionicons name="shield-checkmark" size={14} color={colors.safe} />
                            <Text style={{ color: colors.safe, fontSize: 11, fontWeight: '700' }}>ACTIVE</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* AI Legal Engine & DeepSeek Settings */}
                <View style={styles.section}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 }}>
                            <View style={{
                                width: 28,
                                height: 28,
                                borderRadius: 8,
                                backgroundColor: colors.accent + '20',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <Ionicons name="sparkles" size={15} color={colors.accent} />
                            </View>
                            <Text style={[styles.sectionTitle, { marginBottom: 0, flex: 1 }]} numberOfLines={1}>
                                AI PLEADING ENGINE
                            </Text>
                        </View>
                        <View style={{
                            backgroundColor: colors.safe + '18',
                            borderWidth: 1,
                            borderColor: colors.safe + '35',
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 10,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4
                        }}>
                            <Ionicons name="lock-closed" size={10} color={colors.safe} />
                            <Text style={{ color: colors.safe, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>LOCAL ONLY</Text>
                        </View>
                    </View>

                    <Text style={[styles.sublabel, { marginBottom: spacing.m, lineHeight: 18 }]}>
                        Advocat communicates directly with DeepSeek via encrypted HTTPS. Your API key and case files never touch third-party servers.
                    </Text>

                    {/* API Key Input */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <Text style={[styles.label, { fontSize: 13, fontWeight: '600' }]}>DeepSeek API Key</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={{
                                width: 6,
                                height: 6,
                                borderRadius: 3,
                                backgroundColor: apiKey ? colors.safe : colors.textTertiary
                            }} />
                            <Text style={{ color: apiKey ? colors.safe : colors.textTertiary, fontSize: 11, fontWeight: '600' }}>
                                {apiKey ? 'Configured' : 'Offline Mode'}
                            </Text>
                        </View>
                    </View>

                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: colors.surfaceHighlight,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                        paddingHorizontal: spacing.m,
                        marginBottom: spacing.m,
                        height: 48,
                    }}>
                        <Ionicons name="key-outline" size={18} color={colors.accent} style={{ marginRight: 10 }} />
                        <TextInput
                            style={{
                                flex: 1,
                                color: colors.textPrimary,
                                fontSize: 14,
                                height: 48,
                            }}
                            value={apiKey}
                            onChangeText={(val) => {
                                setApiKey(val);
                                setApiTestStatus(null);
                            }}
                            placeholder="sk-..."
                            placeholderTextColor={colors.textTertiary}
                            secureTextEntry={!showApiKey}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <TouchableOpacity
                            onPress={() => setShowApiKey(!showApiKey)}
                            style={{ padding: 8 }}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons
                                name={showApiKey ? "eye-off-outline" : "eye-outline"}
                                size={18}
                                color={colors.textTertiary}
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Model Selection */}
                    <Text style={[styles.label, { fontSize: 13, fontWeight: '600', marginBottom: 8 }]}>AI Reasoning Model</Text>
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: spacing.m }}>
                        <TouchableOpacity
                            onPress={() => {
                                setSelectedModel('deepseek-chat');
                                updateAdvocateProfile({ selectedModel: 'deepseek-chat' });
                            }}
                            style={{
                                flex: 1,
                                paddingVertical: 12,
                                paddingHorizontal: 12,
                                borderRadius: 12,
                                borderWidth: 1.5,
                                borderColor: selectedModel === 'deepseek-chat' ? colors.accent : colors.border,
                                backgroundColor: selectedModel === 'deepseek-chat' ? colors.accent + '15' : colors.surfaceHighlight,
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                                <Text style={{
                                    color: selectedModel === 'deepseek-chat' ? colors.accent : colors.textPrimary,
                                    fontWeight: '700',
                                    fontSize: 13
                                }}>DeepSeek-V3</Text>
                                {selectedModel === 'deepseek-chat' && (
                                    <Ionicons name="checkmark-circle" size={15} color={colors.accent} />
                                )}
                            </View>
                            <Text style={{ color: colors.textTertiary, fontSize: 11, marginTop: 2 }}>Ultra Fast & Crisp</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => {
                                setSelectedModel('deepseek-reasoner');
                                updateAdvocateProfile({ selectedModel: 'deepseek-reasoner' });
                            }}
                            style={{
                                flex: 1,
                                paddingVertical: 12,
                                paddingHorizontal: 12,
                                borderRadius: 12,
                                borderWidth: 1.5,
                                borderColor: selectedModel === 'deepseek-reasoner' ? colors.accent : colors.border,
                                backgroundColor: selectedModel === 'deepseek-reasoner' ? colors.accent + '15' : colors.surfaceHighlight,
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                                <Text style={{
                                    color: selectedModel === 'deepseek-reasoner' ? colors.accent : colors.textPrimary,
                                    fontWeight: '700',
                                    fontSize: 13
                                }}>DeepSeek-R1</Text>
                                {selectedModel === 'deepseek-reasoner' && (
                                    <Ionicons name="checkmark-circle" size={15} color={colors.accent} />
                                )}
                            </View>
                            <Text style={{ color: colors.textTertiary, fontSize: 11, marginTop: 2 }}>Deep Legal Reasoning</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Test Connection & Save Action */}
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity
                            style={[styles.buttonOutline, {
                                flex: 1,
                                marginTop: 0,
                                paddingVertical: 12,
                                borderRadius: 12,
                                height: 48,
                                borderColor: colors.accent + '50',
                                backgroundColor: colors.accent + '08'
                            }]}
                            onPress={handleTestApiKey}
                            disabled={isTestingApiKey}
                        >
                            {isTestingApiKey ? (
                                <ActivityIndicator size="small" color={colors.accent} />
                            ) : (
                                <>
                                    <Ionicons name="flash-outline" size={16} color={colors.accent} />
                                    <Text style={[styles.buttonTextOutline, { color: colors.accent, fontSize: 13, fontWeight: '700' }]}>Test Key</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, {
                                flex: 1,
                                marginTop: 0,
                                paddingVertical: 12,
                                borderRadius: 12,
                                height: 48,
                                backgroundColor: colors.accent
                            }]}
                            onPress={handleSaveApiKey}
                        >
                            <Ionicons name="save-outline" size={16} color="white" />
                            <Text style={[styles.buttonText, { fontSize: 13, fontWeight: '700' }]}>Save Key</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Test Status Feedback */}
                    {apiTestStatus && (
                        <View style={{
                            marginTop: spacing.m,
                            padding: 12,
                            borderRadius: 10,
                            backgroundColor: apiTestStatus.success ? colors.safe + '15' : colors.critical + '15',
                            borderWidth: 1,
                            borderColor: apiTestStatus.success ? colors.safe + '40' : colors.critical + '40',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8
                        }}>
                            <Ionicons
                                name={apiTestStatus.success ? "checkmark-circle" : "alert-circle"}
                                size={18}
                                color={apiTestStatus.success ? colors.safe : colors.critical}
                            />
                            <Text style={{
                                color: apiTestStatus.success ? colors.safe : colors.critical,
                                fontSize: 12,
                                fontWeight: '600',
                                flex: 1
                            }}>
                                {apiTestStatus.message}
                            </Text>
                        </View>
                    )}

                    {/* Live DeepSeek Credit & Token Telemetry Box */}
                    <View style={{
                        marginTop: spacing.m,
                        padding: 14,
                        borderRadius: 16,
                        backgroundColor: colors.surface,
                        borderWidth: 1.5,
                        borderColor: 'rgba(212, 175, 55, 0.35)',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.12,
                        shadowRadius: 8,
                        elevation: 3,
                    }}>
                        {/* Header Row */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                                <View style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 9,
                                    backgroundColor: 'rgba(212, 175, 55, 0.14)',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderWidth: 1,
                                    borderColor: 'rgba(212, 175, 55, 0.3)',
                                }}>
                                    <Ionicons name="hardware-chip-outline" size={15} color="#D4AF37" />
                                </View>
                                <View>
                                    <Text style={{ color: colors.textPrimary, fontSize: 12.5, fontWeight: '800', letterSpacing: 0.2 }}>
                                        DEEPSEEK ACCOUNT TELEMETRY
                                    </Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
                                        <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#10B981' }} />
                                        <Text style={{ color: '#10B981', fontSize: 9.5, fontWeight: '700' }}>
                                            Direct Encrypted HTTPS Link
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <TouchableOpacity
                                onPress={async () => {
                                    if (isSyncingTelemetry) return;
                                    setIsSyncingTelemetry(true);
                                    try {
                                        const res = await syncDeepSeekBalance();
                                        if (res.isAvailable || !res.error) {
                                            const dual = formatBalanceDual(res.toppedUpBalance, res.currency);
                                            showToast(`Balance Synced: ${dual.inr} (${dual.original})`, 'success');
                                        } else {
                                            showToast(res.error || "Could not fetch balance", 'error');
                                        }
                                    } catch (e: any) {
                                        showToast('Network error syncing balance', 'error');
                                    } finally {
                                        setIsSyncingTelemetry(false);
                                    }
                                }}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 4,
                                    backgroundColor: 'rgba(212, 175, 55, 0.15)',
                                    paddingHorizontal: 9,
                                    paddingVertical: 5,
                                    borderRadius: 8,
                                    borderWidth: 1,
                                    borderColor: 'rgba(212, 175, 55, 0.35)',
                                }}
                            >
                                <Ionicons
                                    name="refresh"
                                    size={12}
                                    color="#D4AF37"
                                    style={isSyncingTelemetry ? { transform: [{ rotate: '45deg' }] } : undefined}
                                />
                                <Text style={{ color: '#D4AF37', fontSize: 11, fontWeight: '800' }}>
                                    {isSyncingTelemetry ? 'Syncing...' : 'Sync'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Top Dual Cards: Balance Left & Total Cost in INR */}
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                            {/* Balance Left */}
                            <View style={{
                                flex: 1,
                                backgroundColor: colors.surfaceHighlight,
                                padding: 11,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: colors.border,
                            }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Text style={{ color: colors.textSecondary, fontSize: 10.5, fontWeight: '600' }}>Balance Left (INR)</Text>
                                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' }} />
                                </View>
                                <Text style={{ color: '#10B981', fontSize: 18, fontWeight: '800', marginTop: 3 }}>
                                    {formatBalanceDual(aiUsageSummary?.toppedUpBalance || '1.95', aiUsageSummary?.currency || 'USD').inr}
                                </Text>
                                <Text style={{ color: colors.textTertiary, fontSize: 9.5, fontWeight: '500', marginTop: 2 }}>
                                    ≈ {formatBalanceDual(aiUsageSummary?.toppedUpBalance || '1.95', aiUsageSummary?.currency || 'USD').original}
                                </Text>
                            </View>

                            {/* Total Cost */}
                            <View style={{
                                flex: 1,
                                backgroundColor: colors.surfaceHighlight,
                                padding: 11,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: colors.border,
                            }}>
                                <Text style={{ color: colors.textSecondary, fontSize: 10.5, fontWeight: '600' }}>Total Cost (INR)</Text>
                                <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '800', marginTop: 3 }}>
                                    {formatCostDual(aiUsageSummary?.totalCostUsd || 0.04).inr}
                                </Text>
                                <Text style={{ color: colors.textTertiary, fontSize: 9.5, fontWeight: '500', marginTop: 2 }}>
                                    ≈ {formatCostDual(aiUsageSummary?.totalCostUsd || 0.04).original}
                                </Text>
                            </View>
                        </View>

                        {/* Bottom Metric Pill: Tokens & Model */}
                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: colors.surfaceHighlight,
                            paddingHorizontal: 12,
                            paddingVertical: 9,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: colors.border,
                        }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Ionicons name="layers-outline" size={15} color="#D4AF37" />
                                <Text style={{ color: colors.textSecondary, fontSize: 11.5, fontWeight: '600' }}>Total Tokens</Text>
                            </View>
                            <Text style={{ color: '#D4AF37', fontSize: 12.5, fontWeight: '800' }}>
                                {formatTokens(aiUsageSummary?.totalTokens || 81778)} <Text style={{ color: colors.textTertiary, fontSize: 10.5, fontWeight: '500' }}>({aiUsageSummary?.totalRequests || 45} reqs)</Text>
                            </Text>
                        </View>
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

                    <TouchableOpacity
                        style={[styles.buttonOutline, { borderColor: colors.accent + '60', backgroundColor: colors.accent + '10', marginTop: spacing.s }]}
                        onPress={() => {
                            loadMockData();
                            showToast('Tamil Nadu demo cases loaded into dashboard!', 'success');
                        }}
                    >
                        <Ionicons name="folder-open-outline" size={20} color={colors.accent} />
                        <Text style={[styles.buttonTextOutline, { color: colors.accent }]}>Load Demo Cases (Tamil Nadu)</Text>
                    </TouchableOpacity>
                </View>

                {/* App Info */}
                {/* App Info & Developer Credits (Minimal, Luxury, Professional) */}
                <View style={styles.devCreditsCard}>
                    {/* Top App Identity */}
                    <View style={styles.devCreditsHeader}>
                        <LinearGradient
                            colors={mode === 'dark' ? ['#2A2416', '#1A1812'] : ['#FBF5E6', '#F3EAD3']}
                            style={styles.appLogoCircle}
                        >
                            <Ionicons name="scale" size={26} color="#D4AF37" />
                        </LinearGradient>
                        
                        <View style={{ alignItems: 'center', marginTop: 10 }}>
                            <Text style={styles.appBrandTitle}>ADVOCAT</Text>
                            <View style={styles.versionBadgeRow}>
                                <View style={styles.versionPill}>
                                    <Text style={styles.versionPillText}>v2.0.0 Pro</Text>
                                </View>
                                <View style={styles.versionDot} />
                                <Text style={styles.editionText}>Chamber OS</Text>
                            </View>
                            <Text style={styles.appTagline}>
                                Legal Practice OS & Judicial Intelligence • India 🇮🇳
                            </Text>
                        </View>
                    </View>

                    {/* Subtle Hairline Divider */}
                    <View style={styles.devCreditsDivider} />

                    {/* Interactive Creator Signature Card */}
                    <TouchableOpacity
                        activeOpacity={0.75}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            showToast("Crafted with precision by Santhosh ⚖️", "info");
                        }}
                        style={styles.creatorCard}
                    >
                        <LinearGradient
                            colors={['#D4AF37', '#997300']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.creatorAvatar}
                        >
                            <Text style={styles.creatorAvatarText}>S</Text>
                        </LinearGradient>

                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.creatorRoleLabel}>ARCHITECTED & CRAFTED BY</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 }}>
                                <Text style={styles.creatorNameText}>Santhosh</Text>
                                <View style={styles.creatorVerifiedBadge}>
                                    <Ionicons name="checkmark-circle" size={12} color="#D4AF37" />
                                    <Text style={styles.creatorVerifiedText}>Lead</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.codePill}>
                            <Ionicons name="code-slash" size={14} color="#D4AF37" />
                        </View>
                    </TouchableOpacity>

                    {/* Footer Legal & Privacy Row */}
                    <View style={styles.legalFooterRow}>
                        <TouchableOpacity
                            onPress={() => {
                                Haptics.selectionAsync();
                                navigation.navigate('PrivacyPolicy');
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={styles.privacyLinkBtn}
                        >
                            <Ionicons name="shield-checkmark-outline" size={13} color={colors.accent} />
                            <Text style={styles.privacyLinkText}>Privacy Policy</Text>
                        </TouchableOpacity>

                        <View style={styles.footerDot} />

                        <View style={styles.vaultSecurityBadge}>
                            <Ionicons name="lock-closed-outline" size={12} color={colors.textTertiary} />
                            <Text style={styles.vaultSecurityText}>Offline-First Chamber Vault</Text>
                        </View>
                    </View>
                </View>

            </ScrollView>

            {/* Advocate Profile Edit Modal */}
            <Modal
                visible={showAdvocateModal}
                animationType="slide"
                transparent
                statusBarTranslucent
                onRequestClose={() => setShowAdvocateModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { maxHeight: '90%', padding: spacing.l }]}>
                        {/* Modal Header */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={[styles.modalTitle, { textAlign: 'left', marginBottom: 0, fontSize: 20 }]}>
                                Advocate Bar Profile
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowAdvocateModal(false)}
                                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                style={{ padding: 4 }}
                            >
                                <Ionicons name="close" size={22} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <Text style={[styles.modalSubtitle, { textAlign: 'left', marginBottom: spacing.m, fontSize: 13 }]}>
                            Auto-populates Vakalatnama, Affidavits & Court Paperbooks
                        </Text>

                        {/* Scrollable Form Body */}
                        <ScrollView
                            showsVerticalScrollIndicator={true}
                            style={{ flexShrink: 1 }}
                            contentContainerStyle={{ paddingBottom: spacing.s }}
                        >
                            <Text style={styles.formLabel}>Advocate Full Name</Text>
                            <TextInput
                                style={styles.formInput}
                                value={advocateName}
                                onChangeText={setAdvocateName}
                                placeholder="e.g. Adv. R. Santhosh, B.A., B.L."
                                placeholderTextColor={colors.textTertiary}
                            />

                            <Text style={styles.formLabel}>Bar Council Enrolment No.</Text>
                            <TextInput
                                style={[styles.formInput, { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', letterSpacing: 0.5 }]}
                                value={barEnrolment}
                                onChangeText={setBarEnrolment}
                                placeholder="e.g. MS/1234/2020"
                                placeholderTextColor={colors.textTertiary}
                                autoCapitalize="characters"
                            />

                            <Text style={styles.formLabel}>Chamber Address</Text>
                            <TextInput
                                style={[styles.formInput, { minHeight: 64, textAlignVertical: 'top' }]}
                                value={chamberAddress}
                                onChangeText={setChamberAddress}
                                placeholder="e.g. No. 12, Law Chambers, High Court Buildings, Chennai - 600104"
                                placeholderTextColor={colors.textTertiary}
                                multiline
                            />

                            <Text style={styles.formLabel}>Mobile Number</Text>
                            <TextInput
                                style={styles.formInput}
                                value={advocatePhone}
                                onChangeText={setAdvocatePhone}
                                placeholder="+91 98400 00000"
                                placeholderTextColor={colors.textTertiary}
                                keyboardType="phone-pad"
                            />

                            <Text style={styles.formLabel}>Email Address</Text>
                            <TextInput
                                style={styles.formInput}
                                value={advocateEmail}
                                onChangeText={setAdvocateEmail}
                                placeholder="counsel@mhc.in"
                                placeholderTextColor={colors.textTertiary}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />

                            <Text style={styles.formLabel}>Default Court Bench</Text>
                            <View style={{ gap: 8, marginBottom: spacing.s }}>
                                {[
                                    { value: 'MADRAS_HC_CHENNAI' as CourtTier, label: 'Madras High Court (Principal Seat, Chennai)' },
                                    { value: 'MADRAS_HC_MADURAI' as CourtTier, label: 'Madras High Court (Madurai Bench)' },
                                    { value: 'DISTRICT_SESSIONS' as CourtTier, label: 'Principal District & Sessions Court' },
                                    { value: 'MAGISTRATE_JM' as CourtTier, label: 'Judicial Magistrate / Subordinate Court' },
                                ].map((item) => (
                                    <TouchableOpacity
                                        key={item.value}
                                        onPress={() => setDefaultCourtTier(item.value)}
                                        style={{
                                            padding: 12,
                                            borderRadius: 12,
                                            borderWidth: 1.5,
                                            borderColor: defaultCourtTier === item.value ? colors.accent : colors.border,
                                            backgroundColor: defaultCourtTier === item.value ? colors.accent + '15' : 'transparent',
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between'
                                        }}
                                    >
                                        <Text style={{
                                            color: defaultCourtTier === item.value ? colors.accent : colors.textPrimary,
                                            fontSize: 13,
                                            fontWeight: defaultCourtTier === item.value ? '600' : '400',
                                            flex: 1,
                                            marginRight: 8,
                                        }}>
                                            {item.label}
                                        </Text>
                                        {defaultCourtTier === item.value && (
                                            <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        {/* Fixed Footer with High-Contrast Action Buttons */}
                        <View style={[styles.modalButtons, { paddingTop: spacing.m, borderTopWidth: 1, borderTopColor: colors.border + '40' }]}>
                            <TouchableOpacity
                                style={styles.modalCancel}
                                onPress={() => setShowAdvocateModal(false)}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalSave}
                                onPress={handleSaveAdvocateProfile}
                            >
                                <Text style={styles.modalSaveText}>Save Profile</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Custom Days Modal - Functionality retained, style updated in createStyles */}
            <Modal
                visible={showCustomDaysModal}
                animationType="fade"
                transparent
                statusBarTranslucent
                onRequestClose={() => setShowCustomDaysModal(false)}
            >
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
        paddingBottom: 150,
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
    formLabel: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    formInput: {
        backgroundColor: colors.surfaceHighlight,
        color: colors.textPrimary,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        fontSize: 15,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: spacing.m,
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
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalCancelText: {
        color: colors.textSecondary,
        fontSize: 15,
        fontWeight: '600',
    },
    modalSave: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalSaveText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '600',
    },
    devCreditsCard: {
        backgroundColor: colors.surface,
        borderRadius: 22,
        padding: 20,
        marginBottom: spacing.l,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    devCreditsHeader: {
        alignItems: 'center',
        paddingVertical: 6,
    },
    appLogoCircle: {
        width: 54,
        height: 54,
        borderRadius: 27,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(212, 175, 55, 0.4)',
        shadowColor: '#D4AF37',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    appBrandTitle: {
        color: colors.textPrimary,
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: 2,
        fontFamily: Platform.OS === 'ios' ? 'Cinzel' : 'sans-serif-medium',
    },
    versionBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    versionPill: {
        backgroundColor: 'rgba(212, 175, 55, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 2.5,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.3)',
    },
    versionPillText: {
        color: '#D4AF37',
        fontSize: 10.5,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    versionDot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: colors.textTertiary,
    },
    editionText: {
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: '600',
    },
    appTagline: {
        color: colors.textTertiary,
        fontSize: 11,
        fontWeight: '500',
        marginTop: 6,
        textAlign: 'center',
    },
    devCreditsDivider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: 16,
        opacity: 0.7,
    },
    creatorCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceHighlight,
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    creatorAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#D4AF37',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    creatorAvatarText: {
        color: '#000000',
        fontSize: 18,
        fontWeight: '900',
    },
    creatorRoleLabel: {
        color: colors.textTertiary,
        fontSize: 8.5,
        fontWeight: '800',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
    },
    creatorNameText: {
        color: colors.textPrimary,
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    creatorVerifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: 'rgba(212, 175, 55, 0.12)',
        paddingHorizontal: 6,
        paddingVertical: 1.5,
        borderRadius: 5,
    },
    creatorVerifiedText: {
        color: '#D4AF37',
        fontSize: 9.5,
        fontWeight: '800',
    },
    codePill: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    legalFooterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginTop: 16,
    },
    privacyLinkBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingVertical: 6,
        paddingHorizontal: 8,
    },
    privacyLinkText: {
        color: colors.accent,
        fontSize: 12,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    footerDot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: colors.textTertiary,
    },
    vaultSecurityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    vaultSecurityText: {
        color: colors.textTertiary,
        fontSize: 11,
        fontWeight: '500',
    },
    toastContainer: {
        position: 'absolute',
        top: 14,
        left: 16,
        right: 16,
        zIndex: 9999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    toastCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 24,
        backgroundColor: colors.surface,
        borderWidth: 1.5,
        borderColor: colors.accent + '70',
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 12,
    },
    toastIconCircle: {
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },
    toastText: {
        color: colors.textPrimary,
        fontSize: 13,
        fontWeight: '700',
    },
});
