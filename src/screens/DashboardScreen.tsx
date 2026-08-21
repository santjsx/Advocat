import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    StatusBar,
    TouchableOpacity,
    Platform,
    RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../store/useAppStore';
import { DeadlineItem } from '../components/DeadlineItem';
import { ECourtsSearchModal } from '../components/ECourtsSearchModal';
import { PleadingGeneratorModal } from '../components/PleadingGeneratorModal';
import { useTheme } from '../theme/ThemeContext';
import dayjs from 'dayjs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, MainTabParamList } from '../navigation/types';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

type Props = CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, 'Dashboard'>,
    NativeStackScreenProps<RootStackParamList>
>;

export const DashboardScreen: React.FC<Props> = ({ navigation }) => {
    const { colors, spacing, mode } = useTheme();
    const insets = useSafeAreaInsets();

    const cases = useAppStore(state => state.cases);
    const deadlines = useAppStore(state => state.deadlines);
    const paperbookBundles = useAppStore(state => state.paperbookBundles);
    const toggleDeadline = useAppStore(state => state.toggleDeadlineComplete);
    const userName = useAppStore(state => state.userName);
    const advocateProfile = useAppStore(state => state.advocateProfile);
    const loadMockData = useAppStore(state => state.loadMockData);

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showECourtsModal, setShowECourtsModal] = useState(false);
    const [showPleadingModal, setShowPleadingModal] = useState(false);
    const [selectedCaseForDraft, setSelectedCaseForDraft] = useState<any>(null);

    // Filter and compute executive legal stats
    const stats = useMemo(() => {
        const activeCases = cases.filter(c => c.status === 'ACTIVE').length;
        const totalBundles = paperbookBundles.length;

        let todayCount = 0;
        let urgent = 0;
        let upcoming = 0;

        const now = dayjs();

        deadlines.forEach(d => {
            if (!d.isCompleted) {
                const diffDays = dayjs(d.dueDate).diff(now, 'day');
                const isToday = dayjs(d.dueDate).isSame(now, 'day');
                const isOverdue = diffDays < 0;

                if (isToday) {
                    todayCount++;
                }

                if (isOverdue || d.urgency === 'CRITICAL' || d.urgency === 'HIGH') {
                    urgent++;
                } else if (diffDays <= 7) {
                    upcoming++;
                }
            }
        });

        return {
            activeCases,
            todayCount,
            urgent,
            upcoming,
            totalBundles,
        };
    }, [cases, deadlines, paperbookBundles]);

    const upcomingDeadlines = useMemo(() => {
        return deadlines
            .filter(d => !d.isCompleted)
            .sort((a, b) => dayjs(a.dueDate).diff(dayjs(b.dueDate)))
            .map(d => ({
                ...d,
                caseName: cases.find(c => c.id === d.caseId)?.name,
            }));
    }, [cases, deadlines]);

    const getGreeting = () => {
        const hour = dayjs().hour();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    };

    const handleToggle = (id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        toggleDeadline(id);
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setTimeout(() => {
            setIsRefreshing(false);
        }, 600);
    };

    const handleDraftQuickPaperbook = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Default to first active case or fallback
        const targetCase = cases.find(c => c.status === 'ACTIVE') || cases[0] || {
            id: 'quick-draft',
            name: 'State vs Accused',
            caseNumber: 'Crl.O.P. No.         / 2026',
            clientName: 'Petitioner',
            status: 'ACTIVE',
            court: 'Madras High Court',
        };
        setSelectedCaseForDraft(targetCase);
        setShowPleadingModal(true);
    };

    const formattedBarEnrolment = useMemo(() => {
        const raw = advocateProfile?.barEnrolment?.trim();
        if (!raw || raw.includes('/       /20')) {
            return 'Bar Council of TN & PY • Enrolled';
        }
        return `Enrolment: ${raw}`;
    }, [advocateProfile]);

    const styles = createStyles(colors, spacing, insets);

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            {/* 1. EXECUTIVE ADVOCATE HEADER */}
            <View style={styles.profileHeaderRow}>
                <View style={styles.avatarCircle}>
                    <MaterialCommunityIcons name="scale-balance" size={24} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                    <View style={styles.welcomeRow}>
                        <Text style={styles.greetingText}>
                            {getGreeting()}, Adv. {advocateProfile.name || userName || 'Counsel'}
                        </Text>
                    </View>
                    <View style={styles.barEnrolmentRow}>
                        <View style={styles.verifiedDot} />
                        <Text style={styles.enrolmentText} numberOfLines={1}>
                            {formattedBarEnrolment}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        navigation.navigate('Settings');
                    }}
                    style={styles.settingsIconBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* 2. THREE-TIER LEGAL TELEMETRY CARDS */}
            <View style={styles.telemetryGrid}>
                {/* Card 1: Today's Cause List */}
                <TouchableOpacity
                    style={[styles.telemetryCard, { borderColor: stats.todayCount > 0 ? colors.critical + '60' : colors.border }]}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        navigation.navigate('Deadlines');
                    }}
                    activeOpacity={0.75}
                >
                    <View style={styles.telemetryHeader}>
                        <View style={[styles.telemetryIconBox, { backgroundColor: colors.critical + '20' }]}>
                            <MaterialCommunityIcons name="gavel" size={18} color={colors.critical} />
                        </View>
                        {stats.todayCount > 0 && <View style={styles.urgentPulseDot} />}
                    </View>
                    <Text style={styles.telemetryCount}>{stats.todayCount}</Text>
                    <Text style={styles.telemetryLabel}>Today's Board</Text>
                    <Text style={styles.telemetrySubtext}>Cause List Items</Text>
                </TouchableOpacity>

                {/* Card 2: 7-Day Limitations & Urgent Hearings */}
                <TouchableOpacity
                    style={[styles.telemetryCard, { borderColor: stats.urgent > 0 ? colors.warning + '60' : colors.border }]}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        navigation.navigate('Deadlines');
                    }}
                    activeOpacity={0.75}
                >
                    <View style={styles.telemetryHeader}>
                        <View style={[styles.telemetryIconBox, { backgroundColor: colors.warning + '20' }]}>
                            <MaterialCommunityIcons name="clock-alert-outline" size={18} color={colors.warning} />
                        </View>
                    </View>
                    <Text style={styles.telemetryCount}>{stats.urgent + stats.upcoming}</Text>
                    <Text style={styles.telemetryLabel}>Limitations</Text>
                    <Text style={styles.telemetrySubtext}>Next 7 Days</Text>
                </TouchableOpacity>

                {/* Card 3: Active Cases & Paperbooks */}
                <TouchableOpacity
                    style={[styles.telemetryCard, { borderColor: colors.accent + '40' }]}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        navigation.navigate('Cases');
                    }}
                    activeOpacity={0.75}
                >
                    <View style={styles.telemetryHeader}>
                        <View style={[styles.telemetryIconBox, { backgroundColor: colors.accent + '20' }]}>
                            <MaterialCommunityIcons name="folder-text-outline" size={18} color={colors.accent} />
                        </View>
                    </View>
                    <Text style={styles.telemetryCount}>{stats.activeCases}</Text>
                    <Text style={styles.telemetryLabel}>Active Cases</Text>
                    <Text style={styles.telemetrySubtext}>{stats.totalBundles} Paperbooks</Text>
                </TouchableOpacity>
            </View>

            {/* 3. LIVE ECOURTS SCRAPER & SYNC BANNER */}
            <TouchableOpacity
                style={styles.eCourtsBanner}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowECourtsModal(true);
                }}
                activeOpacity={0.8}
            >
                <LinearGradient
                    colors={[colors.surfaceHighlight, colors.surface]}
                    style={styles.eCourtsBannerGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={styles.eCourtsIconCircle}>
                        <MaterialCommunityIcons name="bank" size={20} color={colors.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.eCourtsTitle}>eCourts Live Scraper</Text>
                            <View style={styles.livePill}>
                                <View style={styles.liveGreenDot} />
                                <Text style={styles.livePillText}>Auto-Sync</Text>
                            </View>
                        </View>
                        <Text style={styles.eCourtsSubtitle}>
                            Track CNR, Case Number & Cause Lists across Madras HC & Subordinate Courts
                        </Text>
                    </View>
                    <View style={styles.eCourtsActionArrow}>
                        <Ionicons name="search" size={16} color={colors.accent} />
                    </View>
                </LinearGradient>
            </TouchableOpacity>

            {/* 4. SPEED-DIAL QUICK ACTION LAUNCHPAD */}
            <View style={styles.launchpadContainer}>
                <Text style={styles.sectionHeaderLabel}>QUICK LEGAL LAUNCHPAD</Text>
                <View style={styles.launchpadRow}>
                    <TouchableOpacity
                        style={styles.launchpadBtn}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            navigation.navigate('AddCase');
                        }}
                        activeOpacity={0.75}
                    >
                        <LinearGradient
                            colors={[colors.accent + '25', colors.accent + '08']}
                            style={styles.launchpadIconBox}
                        >
                            <Ionicons name="add-circle" size={22} color={colors.accent} />
                        </LinearGradient>
                        <Text style={styles.launchpadBtnText}>Add Case</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.launchpadBtn}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setShowECourtsModal(true);
                        }}
                        activeOpacity={0.75}
                    >
                        <LinearGradient
                            colors={[colors.primary + '25', colors.primary + '08']}
                            style={styles.launchpadIconBox}
                        >
                            <MaterialCommunityIcons name="bank-transfer" size={22} color={colors.primary} />
                        </LinearGradient>
                        <Text style={styles.launchpadBtnText}>eCourts</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.launchpadBtn}
                        onPress={handleDraftQuickPaperbook}
                        activeOpacity={0.75}
                    >
                        <LinearGradient
                            colors={['#8B5CF6' + '25', '#8B5CF6' + '08']}
                            style={styles.launchpadIconBox}
                        >
                            <MaterialCommunityIcons name="file-document-edit" size={22} color="#A78BFA" />
                        </LinearGradient>
                        <Text style={styles.launchpadBtnText}>Paperbook</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.launchpadBtn}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            navigation.navigate('AddDeadline', {});
                        }}
                        activeOpacity={0.75}
                    >
                        <LinearGradient
                            colors={[colors.warning + '25', colors.warning + '08']}
                            style={styles.launchpadIconBox}
                        >
                            <MaterialCommunityIcons name="calendar-clock" size={22} color={colors.warning} />
                        </LinearGradient>
                        <Text style={styles.launchpadBtnText}>Deadline</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* 5. SECTION HEADER: HEARINGS & CAUSE LIST */}
            <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionHeaderLabel}>UPCOMING HEARINGS & LIMITATION SCHEDULE</Text>
                <TouchableOpacity
                    onPress={() => navigation.navigate('Deadlines')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Text style={styles.viewAllText}>View All ({upcomingDeadlines.length})</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar
                barStyle={mode === 'dark' ? 'light-content' : 'dark-content'}
                backgroundColor={colors.background}
            />

            <FlatList
                data={upcomingDeadlines}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <DeadlineItem
                        deadline={item}
                        caseName={item.caseName}
                        onToggleComplete={() => handleToggle(item.id)}
                        onPress={() => navigation.navigate('CaseDetail', { caseId: item.caseId })}
                    />
                )}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconCircle}>
                            <MaterialCommunityIcons name="calendar-check-outline" size={36} color={colors.accent} />
                        </View>
                        <Text style={styles.emptyTitle}>Your Board is Clear</Text>
                        <Text style={styles.emptySubtitle}>
                            No upcoming court hearings or statutory deadlines in the schedule.
                        </Text>
                        {cases.length === 0 && (
                            <TouchableOpacity
                                style={styles.loadMockBtn}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    loadMockData();
                                }}
                                activeOpacity={0.75}
                            >
                                <Ionicons name="sparkles" size={16} color="white" />
                                <Text style={styles.loadMockText}>Load Madras HC Sample Cases</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                }
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.accent}
                        colors={[colors.accent]}
                    />
                }
            />

            {/* eCourts Scraper Modal */}
            <ECourtsSearchModal
                visible={showECourtsModal}
                onClose={() => setShowECourtsModal(false)}
                onCaseImported={(caseId: string) => {
                    setShowECourtsModal(false);
                    navigation.navigate('CaseDetail', { caseId });
                }}
            />

            {/* Paperbook Factory Modal */}
            {selectedCaseForDraft && (
                <PleadingGeneratorModal
                    visible={showPleadingModal}
                    onClose={() => {
                        setShowPleadingModal(false);
                        setSelectedCaseForDraft(null);
                    }}
                    caseData={selectedCaseForDraft}
                />
            )}
        </SafeAreaView>
    );
};

const createStyles = (colors: any, spacing: any, insets: any) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        headerContainer: {
            paddingTop: spacing.xs,
        },
        profileHeaderRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingHorizontal: spacing.m,
            paddingVertical: spacing.s,
            marginBottom: spacing.xs,
        },
        avatarCircle: {
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: colors.accent + '18',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderColor: colors.accent + '35',
        },
        welcomeRow: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        greetingText: {
            color: colors.textPrimary,
            fontSize: 16,
            fontWeight: '700',
            letterSpacing: 0.2,
        },
        barEnrolmentRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginTop: 2,
        },
        verifiedDot: {
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: colors.safe,
        },
        enrolmentText: {
            color: colors.textSecondary,
            fontSize: 11,
            fontWeight: '500',
        },
        settingsIconBtn: {
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: colors.surfaceHighlight,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
        },
        telemetryGrid: {
            flexDirection: 'row',
            gap: 8,
            paddingHorizontal: spacing.m,
            marginTop: spacing.s,
            marginBottom: spacing.m,
        },
        telemetryCard: {
            flex: 1,
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 12,
            borderWidth: 1.5,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
        },
        telemetryHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
        },
        telemetryIconBox: {
            width: 30,
            height: 30,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
        },
        urgentPulseDot: {
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: colors.critical,
        },
        telemetryCount: {
            color: colors.textPrimary,
            fontSize: 22,
            fontWeight: '800',
            lineHeight: 26,
        },
        telemetryLabel: {
            color: colors.textPrimary,
            fontSize: 12,
            fontWeight: '700',
            marginTop: 2,
        },
        telemetrySubtext: {
            color: colors.textTertiary,
            fontSize: 10,
            fontWeight: '500',
            marginTop: 1,
        },
        eCourtsBanner: {
            marginHorizontal: spacing.m,
            borderRadius: 16,
            overflow: 'hidden',
            marginBottom: spacing.m,
            borderWidth: 1.5,
            borderColor: colors.accent + '40',
        },
        eCourtsBannerGradient: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            padding: 14,
        },
        eCourtsIconCircle: {
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: colors.accent + '20',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.accent + '40',
        },
        eCourtsTitle: {
            color: colors.textPrimary,
            fontSize: 14,
            fontWeight: '700',
        },
        livePill: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 8,
            backgroundColor: colors.safe + '20',
        },
        liveGreenDot: {
            width: 5,
            height: 5,
            borderRadius: 2.5,
            backgroundColor: colors.safe,
        },
        livePillText: {
            color: colors.safe,
            fontSize: 9,
            fontWeight: '700',
        },
        eCourtsSubtitle: {
            color: colors.textSecondary,
            fontSize: 11,
            lineHeight: 15,
            marginTop: 2,
        },
        eCourtsActionArrow: {
            width: 28,
            height: 28,
            borderRadius: 9,
            backgroundColor: colors.accent + '15',
            alignItems: 'center',
            justifyContent: 'center',
        },
        launchpadContainer: {
            marginHorizontal: spacing.m,
            marginBottom: spacing.m,
        },
        launchpadRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 8,
            marginTop: 8,
        },
        launchpadBtn: {
            flex: 1,
            alignItems: 'center',
            paddingVertical: 10,
            paddingHorizontal: 4,
            borderRadius: 14,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
        },
        launchpadIconBox: {
            width: 42,
            height: 42,
            borderRadius: 13,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 6,
        },
        launchpadBtnText: {
            color: colors.textPrimary,
            fontSize: 11,
            fontWeight: '600',
        },
        sectionTitleRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing.m,
            marginBottom: spacing.s,
            marginTop: spacing.xs,
        },
        sectionHeaderLabel: {
            color: colors.textSecondary,
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 0.8,
            textTransform: 'uppercase',
        },
        viewAllText: {
            color: colors.accent,
            fontSize: 11,
            fontWeight: '700',
        },
        listContent: {
            paddingBottom: Math.max(insets.bottom, 24) + 80,
            paddingHorizontal: spacing.m,
        },
        emptyContainer: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: spacing.xl,
            paddingHorizontal: spacing.l,
        },
        emptyIconCircle: {
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: colors.accent + '15',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.m,
        },
        emptyTitle: {
            color: colors.textPrimary,
            fontSize: 16,
            fontWeight: '700',
            marginBottom: 4,
        },
        emptySubtitle: {
            color: colors.textTertiary,
            fontSize: 13,
            textAlign: 'center',
            lineHeight: 18,
        },
        loadMockBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: colors.accent,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 14,
            marginTop: spacing.m,
            shadowColor: colors.accent,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
        },
        loadMockText: {
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: '700',
        },
    });

