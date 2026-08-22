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
import { SmoothPressable } from '../components/SmoothPressable';
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
        if (hour >= 4 && hour < 12) return 'Good Morning';
        if (hour >= 12 && hour < 17) return 'Good Afternoon';
        if (hour >= 17 && hour < 22) return 'Good Evening';
        return 'Good Night'; // 10:00 PM to 03:59 AM
    };

    const handleToggle = React.useCallback((id: string) => {
        toggleDeadline(id);
    }, [toggleDeadline]);

    const handleRefresh = React.useCallback(() => {
        setIsRefreshing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setTimeout(() => {
            setIsRefreshing(false);
        }, 600);
    }, []);

    const handleDraftQuickPaperbook = React.useCallback(() => {
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
    }, [cases]);

    const formattedBarEnrolment = useMemo(() => {
        const raw = advocateProfile?.barEnrolment?.trim();
        if (!raw || raw.includes('/       /20')) {
            return 'Tamil Nadu Bar Council • Enrolled';
        }
        return `Enrolment: ${raw}`;
    }, [advocateProfile]);

    const styles = createStyles(colors, spacing, insets);

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            {/* 1. EXECUTIVE ADVOCATE HEADER */}
            <View style={styles.profileHeaderRow}>
                <View style={styles.avatarCircle}>
                    <LinearGradient
                        colors={['rgba(212, 175, 55, 0.35)', 'rgba(212, 175, 55, 0.08)']}
                        style={styles.avatarGradient}
                    >
                        <MaterialCommunityIcons name="scale-balance" size={22} color="#D4AF37" />
                    </LinearGradient>
                </View>
                <View style={{ flex: 1 }}>
                    <View style={styles.welcomeRow}>
                        <Text style={styles.greetingText} numberOfLines={1}>
                            {getGreeting()}, Adv. {advocateProfile.name || userName || 'Counsel'}
                        </Text>
                    </View>
                    <View style={styles.barEnrolmentRow}>
                        <View style={styles.verifiedDot} />
                        <Text style={styles.enrolmentText} numberOfLines={1}>
                            {formattedBarEnrolment}
                        </Text>
                        <Text style={styles.dateTickerText}>• {dayjs().format('ddd, D MMM')}</Text>
                    </View>
                </View>
                <SmoothPressable
                    onPress={() => navigation.navigate('Settings')}
                    style={styles.settingsIconBtn}
                    hitSlop={8}
                    haptic="light"
                    scaleTo={0.9}
                >
                    <Ionicons name="settings-outline" size={19} color={colors.textSecondary} />
                </SmoothPressable>
            </View>

            {/* 2. THREE-TIER LEGAL TELEMETRY CARDS */}
            <View style={styles.telemetryGrid}>
                {/* Card 1: Today's Cause List */}
                <SmoothPressable
                    style={[
                        styles.telemetryCard,
                        { borderColor: stats.todayCount > 0 ? colors.critical + '70' : colors.border }
                    ]}
                    onPress={() => navigation.navigate('Deadlines')}
                    haptic="light"
                    scaleTo={0.96}
                >
                    <View style={[styles.cardTopIndicator, { backgroundColor: stats.todayCount > 0 ? colors.critical : colors.border }]} />
                    <View style={styles.telemetryHeader}>
                        <View style={[styles.telemetryIconBox, { backgroundColor: colors.critical + '18' }]}>
                            <MaterialCommunityIcons name="gavel" size={17} color={colors.critical} />
                        </View>
                        <View style={[styles.microBadge, { backgroundColor: stats.todayCount > 0 ? colors.critical + '20' : colors.safe + '20' }]}>
                            <Text style={[styles.microBadgeText, { color: stats.todayCount > 0 ? colors.critical : colors.safe }]}>
                                {stats.todayCount > 0 ? 'ACTIVE' : 'CLEAR'}
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.telemetryCount}>{stats.todayCount}</Text>
                    <Text style={styles.telemetryLabel}>Today's Board</Text>
                    <Text style={styles.telemetrySubtext}>Cause List Items</Text>
                </SmoothPressable>

                {/* Card 2: 7-Day Limitations & Urgent Hearings */}
                <SmoothPressable
                    style={[
                        styles.telemetryCard,
                        { borderColor: stats.urgent + stats.upcoming > 0 ? colors.warning + '70' : colors.border }
                    ]}
                    onPress={() => navigation.navigate('Deadlines')}
                    haptic="light"
                    scaleTo={0.96}
                >
                    <View style={[styles.cardTopIndicator, { backgroundColor: stats.urgent + stats.upcoming > 0 ? colors.warning : colors.border }]} />
                    <View style={styles.telemetryHeader}>
                        <View style={[styles.telemetryIconBox, { backgroundColor: colors.warning + '18' }]}>
                            <MaterialCommunityIcons name="clock-alert-outline" size={17} color={colors.warning} />
                        </View>
                        <View style={[styles.microBadge, { backgroundColor: colors.warning + '20' }]}>
                            <Text style={[styles.microBadgeText, { color: colors.warning }]}>
                                7 DAYS
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.telemetryCount}>{stats.urgent + stats.upcoming}</Text>
                    <Text style={styles.telemetryLabel}>Limitations</Text>
                    <Text style={styles.telemetrySubtext}>Statutory Window</Text>
                </SmoothPressable>

                {/* Card 3: Active Cases & Paperbooks */}
                <SmoothPressable
                    style={[
                        styles.telemetryCard,
                        { borderColor: 'rgba(212, 175, 55, 0.45)' }
                    ]}
                    onPress={() => navigation.navigate('Cases')}
                    haptic="light"
                    scaleTo={0.96}
                >
                    <View style={[styles.cardTopIndicator, { backgroundColor: '#D4AF37' }]} />
                    <View style={styles.telemetryHeader}>
                        <View style={[styles.telemetryIconBox, { backgroundColor: 'rgba(212, 175, 55, 0.18)' }]}>
                            <MaterialCommunityIcons name="briefcase-outline" size={17} color="#D4AF37" />
                        </View>
                        <View style={[styles.microBadge, { backgroundColor: 'rgba(212, 175, 55, 0.18)' }]}>
                            <Text style={[styles.microBadgeText, { color: '#D4AF37' }]}>
                                {stats.totalBundles} PB
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.telemetryCount}>{stats.activeCases}</Text>
                    <Text style={styles.telemetryLabel}>Active Cases</Text>
                    <Text style={styles.telemetrySubtext}>In Chamber Vault</Text>
                </SmoothPressable>
            </View>

            {/* 3. AI CASE SCREENSHOT SCANNER & IMPORTER BANNER */}
            <SmoothPressable
                style={styles.eCourtsBanner}
                onPress={() => setShowECourtsModal(true)}
                haptic="medium"
                scaleTo={0.98}
            >
                <LinearGradient
                    colors={mode === 'dark'
                        ? ['#141926', '#0E131F']
                        : ['#FFFFFF', '#F8FAFC']}
                    style={styles.eCourtsBannerGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    {/* Top Row: Icon, Title, Live Pill, and Scan Screenshot CTA */}
                    <View style={styles.eCourtsTopRow}>
                        <View style={styles.eCourtsIconCircle}>
                            <MaterialCommunityIcons name="image-search-outline" size={22} color="#D4AF37" />
                        </View>
                        <View style={styles.eCourtsTitleBlock}>
                            <View style={styles.eCourtsHeaderTitleRow}>
                                <Text style={styles.eCourtsTitle}>eCourts Screenshot Importer</Text>
                                <View style={styles.livePill}>
                                    <View style={styles.liveGreenDot} />
                                    <Text style={styles.livePillText}>AI OCR</Text>
                                </View>
                            </View>
                            <Text style={styles.eCourtsSubtitle} numberOfLines={2}>
                                Upload or photograph an eCourts app, High Court cause list, or FIR screenshot to auto-import case.
                            </Text>
                        </View>
                        <View style={styles.eCourtsCtaBtn}>
                            <Ionicons name="scan-outline" size={13} color="#000000" />
                            <Text style={styles.eCourtsCtaText}>Scan</Text>
                        </View>
                    </View>

                    {/* Bottom Row: Quick Capability Feature Badges */}
                    <View style={styles.eCourtsPillsRow}>
                        <View style={styles.eCourtsChip}>
                            <MaterialCommunityIcons name="cellphone-screenshot" size={12} color={colors.accent} />
                            <Text style={styles.eCourtsChipText}>eCourts App</Text>
                        </View>
                        <View style={styles.eCourtsChip}>
                            <MaterialCommunityIcons name="file-document-outline" size={12} color="#D4AF37" />
                            <Text style={styles.eCourtsChipText}>Daily Cause List</Text>
                        </View>
                        <View style={styles.eCourtsChip}>
                            <MaterialCommunityIcons name="lightning-bolt" size={12} color={colors.safe} />
                            <Text style={styles.eCourtsChipText}>AI Extract</Text>
                        </View>
                    </View>
                </LinearGradient>
            </SmoothPressable>

            {/* 4. SPEED-DIAL QUICK ACTION LAUNCHPAD */}
            <View style={styles.launchpadContainer}>
                <Text style={styles.sectionHeaderLabel}>QUICK LEGAL LAUNCHPAD</Text>
                <View style={styles.launchpadRow}>
                    <SmoothPressable
                        style={styles.launchpadBtn}
                        onPress={() => navigation.navigate('AddCase')}
                        haptic="medium"
                        scaleTo={0.94}
                    >
                        <LinearGradient
                            colors={[colors.accent + '25', colors.accent + '08']}
                            style={styles.launchpadIconBox}
                        >
                            <Ionicons name="add-circle" size={20} color={colors.accent} />
                        </LinearGradient>
                        <Text style={styles.launchpadBtnText}>Add Case</Text>
                    </SmoothPressable>

                    <SmoothPressable
                        style={styles.launchpadBtn}
                        onPress={() => navigation.navigate('ImageToPdf')}
                        haptic="medium"
                        scaleTo={0.94}
                    >
                        <LinearGradient
                            colors={['rgba(212, 175, 55, 0.25)', 'rgba(212, 175, 55, 0.08)']}
                            style={[styles.launchpadIconBox, { borderColor: 'rgba(212, 175, 55, 0.4)' }]}
                        >
                            <MaterialCommunityIcons name="file-pdf-box" size={21} color="#D4AF37" />
                        </LinearGradient>
                        <Text style={styles.launchpadBtnText}>Img to PDF</Text>
                    </SmoothPressable>

                    <SmoothPressable
                        style={styles.launchpadBtn}
                        onPress={() => setShowECourtsModal(true)}
                        haptic="medium"
                        scaleTo={0.94}
                    >
                        <LinearGradient
                            colors={['rgba(59, 130, 246, 0.25)', 'rgba(59, 130, 246, 0.08)']}
                            style={[styles.launchpadIconBox, { borderColor: 'rgba(59, 130, 246, 0.4)' }]}
                        >
                            <MaterialCommunityIcons name="image-search-outline" size={20} color="#3B82F6" />
                        </LinearGradient>
                        <Text style={styles.launchpadBtnText}>OCR Scan</Text>
                    </SmoothPressable>

                    <SmoothPressable
                        style={styles.launchpadBtn}
                        onPress={() => setShowPleadingModal(true)}
                        haptic="medium"
                        scaleTo={0.94}
                    >
                        <LinearGradient
                            colors={[colors.safe + '25', colors.safe + '08']}
                            style={[styles.launchpadIconBox, { borderColor: colors.safe + '40' }]}
                        >
                            <MaterialCommunityIcons name="feather" size={20} color={colors.safe} />
                        </LinearGradient>
                        <Text style={styles.launchpadBtnText}>AI Drafter</Text>
                    </SmoothPressable>

                    <SmoothPressable
                        style={styles.launchpadBtn}
                        onPress={() => navigation.navigate('AddDeadline', {})}
                        haptic="medium"
                        scaleTo={0.94}
                    >
                        <LinearGradient
                            colors={[colors.warning + '25', colors.warning + '08']}
                            style={[styles.launchpadIconBox, { borderColor: colors.warning + '40' }]}
                        >
                            <Ionicons name="alarm-outline" size={20} color={colors.warning} />
                        </LinearGradient>
                        <Text style={styles.launchpadBtnText}>Deadline</Text>
                    </SmoothPressable>
                </View>
            </View>

            {/* 5. SECTION HEADER: HEARINGS & CAUSE LIST */}
            <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionHeaderLabel}>UPCOMING HEARINGS & SCHEDULE</Text>
                <SmoothPressable
                    onPress={() => navigation.navigate('Deadlines')}
                    hitSlop={8}
                    haptic="light"
                    scaleTo={0.95}
                >
                    <Text style={styles.viewAllText}>View All ({upcomingDeadlines.length})</Text>
                </SmoothPressable>
            </View>
        </View>
    );

    const renderDeadlineItem = React.useCallback(({ item }: { item: any }) => (
        <DeadlineItem
            deadline={item}
            caseName={item.caseName}
            onToggleComplete={() => handleToggle(item.id)}
            onPress={() => navigation.navigate('CaseDetail', { caseId: item.caseId })}
        />
    ), [handleToggle, navigation]);

    // Top active cases for quick hub
    const activeCaseList = useMemo(() => {
        return cases.filter(c => c.status === 'ACTIVE').slice(0, 3);
    }, [cases]);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar
                barStyle={mode === 'dark' ? 'light-content' : 'dark-content'}
                backgroundColor={colors.background}
            />

            <FlatList
                data={upcomingDeadlines}
                keyExtractor={item => item.id}
                renderItem={renderDeadlineItem}
                ListHeaderComponent={renderHeader}
                removeClippedSubviews={Platform.OS === 'android'}
                maxToRenderPerBatch={10}
                windowSize={5}
                initialNumToRender={8}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        {/* Clean All-Clear Board Banner */}
                        <View style={styles.clearBoardCard}>
                            <View style={styles.emptyIconCircle}>
                                <MaterialCommunityIcons name="calendar-check-outline" size={26} color="#D4AF37" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.clearBoardTitle}>Your Daily Board is Clear</Text>
                                <Text style={styles.clearBoardSubtitle}>
                                    No court hearings or limitation alerts scheduled for today.
                                </Text>
                            </View>
                            <SmoothPressable
                                style={styles.quickAddHearingBtn}
                                onPress={() => navigation.navigate('AddDeadline', {})}
                                haptic="light"
                            >
                                <Ionicons name="add" size={16} color="#000000" />
                                <Text style={styles.quickAddHearingBtnText}>Schedule</Text>
                            </SmoothPressable>
                        </View>

                        {/* Active Matters Quick Vault Hub */}
                        {activeCaseList.length > 0 && (
                            <View style={styles.activeMattersSection}>
                                <View style={styles.mattersHeaderRow}>
                                    <Text style={styles.sectionHeaderLabel}>ACTIVE CHAMBER MATTERS ({cases.length})</Text>
                                    <SmoothPressable
                                        onPress={() => navigation.navigate('Cases')}
                                        hitSlop={8}
                                        haptic="light"
                                    >
                                        <Text style={styles.viewAllText}>View All ({cases.length})</Text>
                                    </SmoothPressable>
                                </View>

                                {activeCaseList.map(c => (
                                    <SmoothPressable
                                        key={c.id}
                                        style={styles.matterCard}
                                        onPress={() => navigation.navigate('CaseDetail', { caseId: c.id })}
                                        haptic="light"
                                        scaleTo={0.98}
                                    >
                                        <View style={styles.matterIconBox}>
                                            <MaterialCommunityIcons name="gavel" size={18} color="#D4AF37" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <View style={styles.matterTitleRow}>
                                                <Text style={styles.matterTitle} numberOfLines={1}>
                                                    {c.name || 'Untitled Matter'}
                                                </Text>
                                                <View style={styles.matterTypeBadge}>
                                                    <Text style={styles.matterTypeBadgeText}>{c.caseType || 'CIVIL'}</Text>
                                                </View>
                                            </View>
                                            <Text style={styles.matterSubtext} numberOfLines={1}>
                                                {c.caseNumber || 'CNR Pending'} • {c.courtName || 'District Court'}
                                            </Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                                    </SmoothPressable>
                                ))}

                                {cases.length > 3 && (
                                    <SmoothPressable
                                        style={styles.moreMattersBtn}
                                        onPress={() => navigation.navigate('Cases')}
                                        haptic="light"
                                    >
                                        <Text style={styles.moreMattersText}>
                                            + {cases.length - 3} more case{cases.length - 3 > 1 ? 's' : ''} in Chamber Vault • View All
                                        </Text>
                                        <Ionicons name="arrow-forward" size={13} color={colors.accent} />
                                    </SmoothPressable>
                                )}
                            </View>
                        )}

                        {cases.length === 0 && (
                            <SmoothPressable
                                style={styles.loadMockBtn}
                                onPress={() => {
                                    loadMockData();
                                }}
                                haptic="success"
                                scaleTo={0.96}
                            >
                                <Ionicons name="sparkles" size={16} color="white" />
                                <Text style={styles.loadMockText}>Load Madras HC Sample Cases</Text>
                            </SmoothPressable>
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
            overflow: 'hidden',
            borderWidth: 1.5,
            borderColor: 'rgba(212, 175, 55, 0.4)',
        },
        avatarGradient: {
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
        },
        welcomeRow: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        greetingText: {
            color: colors.textPrimary,
            fontSize: 16,
            fontWeight: '800',
            letterSpacing: -0.2,
        },
        barEnrolmentRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
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
            fontWeight: '600',
        },
        dateTickerText: {
            color: colors.textTertiary,
            fontSize: 11,
            fontWeight: '500',
        },
        settingsIconBtn: {
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: colors.surface,
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
            padding: 11,
            borderWidth: 1,
            position: 'relative',
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.15,
            shadowRadius: 6,
            elevation: 3,
        },
        cardTopIndicator: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2.5,
        },
        telemetryHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
        },
        telemetryIconBox: {
            width: 28,
            height: 28,
            borderRadius: 9,
            alignItems: 'center',
            justifyContent: 'center',
        },
        microBadge: {
            paddingHorizontal: 5,
            paddingVertical: 2,
            borderRadius: 5,
        },
        microBadgeText: {
            fontSize: 8.5,
            fontWeight: '800',
            letterSpacing: 0.3,
        },
        telemetryCount: {
            color: colors.textPrimary,
            fontSize: 22,
            fontWeight: '800',
            lineHeight: 26,
            letterSpacing: -0.5,
        },
        telemetryLabel: {
            color: colors.textPrimary,
            fontSize: 11.5,
            fontWeight: '700',
            marginTop: 2,
        },
        telemetrySubtext: {
            color: colors.textTertiary,
            fontSize: 9.5,
            fontWeight: '500',
            marginTop: 1,
        },
        eCourtsBanner: {
            marginHorizontal: spacing.m,
            borderRadius: 18,
            overflow: 'hidden',
            marginBottom: spacing.m,
            borderWidth: 1.5,
            borderColor: 'rgba(212, 175, 55, 0.35)',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.18,
            shadowRadius: 8,
            elevation: 4,
        },
        eCourtsBannerGradient: {
            padding: 14,
            gap: 10,
        },
        eCourtsTopRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        eCourtsIconCircle: {
            width: 42,
            height: 42,
            borderRadius: 13,
            backgroundColor: 'rgba(212, 175, 55, 0.14)',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderColor: 'rgba(212, 175, 55, 0.4)',
        },
        eCourtsTitleBlock: {
            flex: 1,
            marginLeft: 10,
            marginRight: 8,
        },
        eCourtsHeaderTitleRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap',
        },
        eCourtsTitle: {
            color: colors.textPrimary,
            fontSize: 13.5,
            fontWeight: '800',
            letterSpacing: 0.1,
        },
        livePill: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 5,
            paddingVertical: 2,
            borderRadius: 5,
            backgroundColor: 'rgba(16, 185, 129, 0.16)',
            borderWidth: 1,
            borderColor: 'rgba(16, 185, 129, 0.35)',
        },
        liveGreenDot: {
            width: 5,
            height: 5,
            borderRadius: 2.5,
            backgroundColor: '#10B981',
        },
        livePillText: {
            color: '#10B981',
            fontSize: 8.5,
            fontWeight: '800',
            letterSpacing: 0.3,
        },
        eCourtsSubtitle: {
            color: colors.textSecondary,
            fontSize: 11,
            lineHeight: 15,
            marginTop: 2,
        },
        eCourtsCtaBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: '#D4AF37',
            paddingHorizontal: 9,
            paddingVertical: 6,
            borderRadius: 8,
            shadowColor: '#D4AF37',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 2,
        },
        eCourtsCtaText: {
            color: '#000000',
            fontSize: 11,
            fontWeight: '800',
            letterSpacing: 0.2,
        },
        eCourtsPillsRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingTop: 8,
            borderTopWidth: 1,
            borderTopColor: colors.border + '50',
            flexWrap: 'wrap',
        },
        eCourtsChip: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: colors.surface,
            paddingHorizontal: 8,
            paddingVertical: 3.5,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: colors.border,
        },
        eCourtsChipText: {
            color: colors.textSecondary,
            fontSize: 10,
            fontWeight: '600',
        },
        launchpadContainer: {
            marginHorizontal: spacing.m,
            marginBottom: spacing.m,
        },
        launchpadRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 6,
            marginTop: 8,
        },
        launchpadBtn: {
            flex: 1,
            alignItems: 'center',
            paddingVertical: 9,
            paddingHorizontal: 2,
            borderRadius: 14,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
        },
        launchpadIconBox: {
            width: 38,
            height: 38,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 5,
            borderWidth: 1,
            borderColor: colors.border,
        },
        launchpadBtnText: {
            color: colors.textPrimary,
            fontSize: 10,
            fontWeight: '700',
            textAlign: 'center',
            letterSpacing: -0.2,
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
            fontSize: 10.5,
            fontWeight: '800',
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
            paddingTop: spacing.xs,
        },
        clearBoardCard: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 14,
            borderWidth: 1,
            borderColor: 'rgba(212, 175, 55, 0.3)',
            marginBottom: spacing.m,
        },
        emptyIconCircle: {
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: 'rgba(212, 175, 55, 0.14)',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: 'rgba(212, 175, 55, 0.3)',
        },
        clearBoardTitle: {
            color: colors.textPrimary,
            fontSize: 13.5,
            fontWeight: '700',
        },
        clearBoardSubtitle: {
            color: colors.textTertiary,
            fontSize: 11,
            marginTop: 1,
            lineHeight: 15,
        },
        quickAddHearingBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 3,
            backgroundColor: '#D4AF37',
            paddingHorizontal: 9,
            paddingVertical: 6,
            borderRadius: 8,
        },
        quickAddHearingBtnText: {
            color: '#000000',
            fontSize: 11,
            fontWeight: '800',
        },
        activeMattersSection: {
            marginTop: spacing.xs,
        },
        mattersHeaderRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: spacing.s,
        },
        matterCard: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: colors.surface,
            borderRadius: 14,
            padding: 12,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: 8,
        },
        matterIconBox: {
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: 'rgba(212, 175, 55, 0.12)',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: 'rgba(212, 175, 55, 0.25)',
        },
        matterTitleRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 6,
        },
        matterTitle: {
            color: colors.textPrimary,
            fontSize: 13,
            fontWeight: '700',
            flex: 1,
        },
        matterTypeBadge: {
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 4,
            borderWidth: 0.5,
            borderColor: 'rgba(59, 130, 246, 0.3)',
        },
        matterTypeBadgeText: {
            color: '#60A5FA',
            fontSize: 9,
            fontWeight: '700',
        },
        matterSubtext: {
            color: colors.textTertiary,
            fontSize: 11,
            marginTop: 2,
        },
        moreMattersBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            backgroundColor: colors.surface,
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            borderStyle: 'dashed',
            marginTop: 2,
        },
        moreMattersText: {
            color: colors.accent,
            fontSize: 11.5,
            fontWeight: '700',
        },
        loadMockBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
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

