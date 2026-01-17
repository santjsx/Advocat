import React, { useMemo, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../theme/ThemeContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, MainTabParamList } from '../navigation/types';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import dayjs from 'dayjs';
import { Case, CaseStatus } from '../models/Case';

type Props = CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, 'Cases'>,
    NativeStackScreenProps<RootStackParamList>
>;

type SortOption = 'deadline' | 'created' | 'name';

export const CaseListScreen: React.FC<Props> = ({ navigation }) => {
    const { colors, spacing, layout } = useTheme();

    const STATUS_COLORS: Record<CaseStatus, string> = {
        ACTIVE: colors.safe,
        PENDING: colors.warning,
        CLOSED: colors.textTertiary,
    };

    const cases = useAppStore(state => state.cases);
    const deadlines = useAppStore(state => state.deadlines);

    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('deadline');
    const [showSortModal, setShowSortModal] = useState(false);
    const [filterStatus, setFilterStatus] = useState<CaseStatus | 'ALL'>('ALL');

    const filteredCases = useMemo(() => {
        let result = [...cases];

        if (filterStatus === 'ALL') {
            result = result.filter(c => c.status !== 'CLOSED');
        } else {
            result = result.filter(c => c.status === filterStatus);
        }

        if (search) {
            const q = search.toLowerCase();
            const getClientName = (c: Case) => c.client?.name || c.clientName || '';
            result = result.filter(c =>
                c.name.toLowerCase().includes(q) ||
                getClientName(c).toLowerCase().includes(q) ||
                c.caseNumber?.toLowerCase().includes(q)
            );
        }

        return result.sort((a, b) => {
            if (sortBy === 'name') {
                return a.name.localeCompare(b.name);
            }

            if (sortBy === 'created') {
                return dayjs(b.createdAt).diff(dayjs(a.createdAt));
            }

            const nextA = deadlines
                .filter(d => d.caseId === a.id && !d.isCompleted)
                .sort((d1, d2) => dayjs(d1.dueDate).diff(dayjs(d2.dueDate)))[0];

            const nextB = deadlines
                .filter(d => d.caseId === b.id && !d.isCompleted)
                .sort((d1, d2) => dayjs(d1.dueDate).diff(dayjs(d2.dueDate)))[0];

            if (!nextA && !nextB) return 0;
            if (!nextA) return 1;
            if (!nextB) return -1;

            return dayjs(nextA.dueDate).diff(dayjs(nextB.dueDate));
        });
    }, [cases, deadlines, search, sortBy, filterStatus]);

    const getNextDeadline = (caseId: string) => {
        return deadlines
            .filter(d => d.caseId === caseId && !d.isCompleted)
            .sort((d1, d2) => dayjs(d1.dueDate).diff(dayjs(d2.dueDate)))[0];
    };

    const styles = createStyles(colors, spacing, layout);

    const getUniqueColor = (text: string) => {
        // Generate a consistent color based on string char code sum
        const colorsList = [
            '#4E7AC7', // Blue
            '#C74E4E', // Red
            '#4EC791', // Green
            '#C78E4E', // Orange
            '#9B4EC7', // Purple
            '#4EC7C5', // Teal
            '#C74E86', // Pink
            '#734EC7', // Indigo
        ];
        let sum = 0;
        for (let i = 0; i < text.length; i++) {
            sum += text.charCodeAt(i);
        }
        return colorsList[sum % colorsList.length];
    };

    const renderItem = ({ item }: { item: Case }) => {
        const nextDeadline = getNextDeadline(item.id);
        const clientName = item.client?.name || item.clientName || 'Unknown';
        const stageLabel = item.stage?.replace('_', ' ') || 'Intake';
        const typeColor = getUniqueColor(item.caseType || 'General');
        const caseNoColor = getUniqueColor(item.caseNumber || '000'); // Unique color for case number

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('CaseDetail', { caseId: item.id })}
                activeOpacity={0.9}
            >
                {/* Colored Status Strip */}
                <View style={[styles.statusStrip, { backgroundColor: STATUS_COLORS[item.status] }]} />

                <View style={styles.cardContent}>
                    {/* Header: Type Badge & Case No */}
                    <View style={styles.cardTopRow}>
                        <View style={[styles.typeBadge, { backgroundColor: typeColor + '20' }]}>
                            <Text style={[styles.typeText, { color: typeColor }]}>{item.caseType}</Text>
                        </View>
                        {item.caseNumber && (
                            <View style={[styles.caseNumberBadge, { borderColor: caseNoColor + '50', backgroundColor: caseNoColor + '10' }]}>
                                <Text style={[styles.caseNumberLabel, { color: caseNoColor }]}>CASE NO.</Text>
                                <Text style={[styles.caseNumberText, { color: caseNoColor }]}>{item.caseNumber}</Text>
                            </View>
                        )}
                    </View>

                    {/* Main Title */}
                    <Text style={styles.caseName} numberOfLines={2}>{item.name}</Text>

                    {/* Client Info */}
                    <View style={styles.clientRow}>
                        <MaterialCommunityIcons name="account-tie" size={16} color={colors.textSecondary} />
                        <Text style={styles.clientLabel}>Client:</Text>
                        <Text style={styles.clientName} numberOfLines={1}>{clientName}</Text>
                    </View>

                    <View style={styles.divider} />

                    {/* Footer: Stage & Deadline or Closed Status */}
                    {item.status === 'CLOSED' ? (
                        <View style={styles.closedFooter}>
                            <View style={styles.closedBadge}>
                                <MaterialCommunityIcons name="check-circle-outline" size={14} color={colors.textTertiary} />
                                <Text style={styles.closedText}>CASE CLOSED</Text>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.cardFooter}>
                            <View style={styles.footerItem}>
                                <Text style={styles.footerLabel}>Stage</Text>
                                <Text style={[styles.stageText, { color: colors.accent }]}>{stageLabel}</Text>
                            </View>

                            <View style={styles.footerItemRight}>
                                <Text style={styles.footerLabel}>Next Deadline</Text>
                                {nextDeadline ? (
                                    <View style={styles.deadlineContainer}>
                                        <MaterialCommunityIcons name="clock-outline" size={12} color={colors.warning} style={{ marginRight: 4 }} />
                                        <Text style={styles.deadlineText}>
                                            {dayjs(nextDeadline.dueDate).format('DD MMM')}
                                        </Text>
                                    </View>
                                ) : (
                                    <Text style={styles.noDeadline}>None</Text>
                                )}
                            </View>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const SORT_OPTIONS: { key: SortOption; label: string }[] = [
        { key: 'deadline', label: 'By Next Deadline' },
        { key: 'created', label: 'By Date Created' },
        { key: 'name', label: 'By Name (A-Z)' },
    ];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.title}>Cases</Text>

                <TextInput
                    style={styles.searchInput}
                    placeholder="Search cases, clients..."
                    placeholderTextColor={colors.textTertiary}
                    value={search}
                    onChangeText={setSearch}
                />

                <View style={styles.filtersRow}>
                    <View style={styles.statusFilters}>
                        {(['ALL', 'ACTIVE', 'PENDING', 'CLOSED'] as const).map(s => (
                            <TouchableOpacity
                                key={s}
                                style={[styles.filterChip, filterStatus === s && styles.filterChipActive]}
                                onPress={() => setFilterStatus(s)}
                            >
                                <Text style={[styles.filterText, filterStatus === s && styles.filterTextActive]}>
                                    {s}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity style={styles.sortButton} onPress={() => setShowSortModal(true)}>
                        <Text style={styles.sortButtonText}>Sort ▼</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={filteredCases}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>
                        {search ? 'No cases match your search.' : 'No cases yet. Tap + to add one.'}
                    </Text>
                }
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                windowSize={5}
                initialNumToRender={10}
            />

            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('AddCase')}
            >
                <MaterialCommunityIcons name="plus" size={24} color="white" />
                <Text style={styles.fabText}>New Case</Text>
            </TouchableOpacity>

            <Modal visible={showSortModal} animationType="fade" transparent>
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowSortModal(false)}
                >
                    <View style={styles.sortModal}>
                        <Text style={styles.sortModalTitle}>Sort By</Text>
                        {SORT_OPTIONS.map(opt => (
                            <TouchableOpacity
                                key={opt.key}
                                style={styles.sortOption}
                                onPress={() => {
                                    setSortBy(opt.key);
                                    setShowSortModal(false);
                                }}
                            >
                                <Text style={[
                                    styles.sortOptionText,
                                    sortBy === opt.key && styles.sortOptionActive
                                ]}>
                                    {opt.label}
                                </Text>
                                {sortBy === opt.key && <Text style={styles.checkMark}>✓</Text>}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
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
        padding: spacing.m,
        paddingBottom: spacing.s,
    },
    title: {
        color: colors.textPrimary,
        fontSize: 38,
        fontWeight: '200',
        letterSpacing: -1,
        marginBottom: spacing.m,
    },
    searchInput: {
        backgroundColor: colors.surface,
        color: colors.textPrimary,
        padding: spacing.m,
        borderRadius: layout.borderRadius,
        fontSize: 16,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: spacing.m,
    },
    filtersRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statusFilters: {
        flexDirection: 'row',
        gap: spacing.xs,
    },
    filterChip: {
        paddingHorizontal: spacing.s,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: colors.surface,
    },
    filterChipActive: {
        backgroundColor: colors.accent,
    },
    filterText: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '500',
    },
    filterTextActive: {
        color: colors.background,
    },
    sortButton: {
        padding: spacing.s,
    },
    sortButtonText: {
        color: colors.textSecondary,
        fontSize: 14,
    },
    list: {
        padding: spacing.m,
        paddingBottom: 120, // Increased to ensure FAB never covers the last item
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: layout.borderRadius,
        marginBottom: spacing.m,
        overflow: 'hidden',
        // Increased elevation for pop
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        borderWidth: 1,
        borderColor: colors.border,
        flexDirection: 'row', // For status strip
    },
    statusStrip: {
        width: 6,
        height: '100%',
    },
    cardContent: {
        flex: 1,
        padding: spacing.m,
    },
    cardTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.s,
    },
    caseNumberBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 6,
        borderWidth: 1,
        gap: 6,
    },
    caseNumberLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        opacity: 0.8,
    },
    caseNumberText: {
        fontSize: 14, // Increased from 11
        fontFamily: 'monospace',
        fontWeight: '700',
    },
    caseName: {
        color: colors.textPrimary,
        fontSize: 20,
        fontWeight: 'bold',
        letterSpacing: 0.5,
        marginBottom: spacing.s,
    },
    clientRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: spacing.m,
    },
    clientLabel: {
        color: colors.textTertiary,
        fontSize: 13,
        fontWeight: '400',
        flexShrink: 0,
    },
    clientName: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: spacing.s,
        opacity: 0.5,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: spacing.xs,
    },
    footerItem: {

    },
    footerItemRight: {
        alignItems: 'flex-end',
    },
    footerLabel: {
        color: colors.textTertiary,
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 2,
    },
    typeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    typeText: {
        fontSize: 11,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    stageText: {
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    deadlineContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.warning + '15',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    deadlineText: {
        color: colors.warning,
        fontSize: 12,
        fontWeight: '600',
    },
    noDeadline: {
        color: colors.textTertiary,
        fontSize: 12,
        fontStyle: 'italic',
    },
    closedFooter: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 8,
    },
    closedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.textTertiary + '15',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6,
    },
    closedText: {
        color: colors.textTertiary,
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    emptyText: {
        color: colors.textTertiary,
        textAlign: 'center',
        marginTop: spacing.xxl,
        fontSize: 14,
    },
    fab: {
        position: 'absolute',
        bottom: spacing.l,
        right: spacing.l,
        flexDirection: 'row',
        paddingHorizontal: 20,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        gap: 8,
    },
    fabText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sortModal: {
        backgroundColor: colors.surface,
        borderRadius: layout.borderRadius,
        padding: spacing.m,
        width: '80%',
    },
    sortModalTitle: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: spacing.m,
        textAlign: 'center',
    },
    sortOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    sortOptionText: {
        color: colors.textPrimary,
        fontSize: 16,
    },
    sortOptionActive: {
        color: colors.accent,
        fontWeight: 'bold',
    },
    checkMark: {
        color: colors.accent,
        fontSize: 18,
    },
});
