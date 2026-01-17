import React, { useMemo, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../theme/ThemeContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, MainTabParamList } from '../navigation/types';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import dayjs from 'dayjs';
import { Deadline, UrgencyLevel } from '../models/Deadline';
import { cancelNotifications } from '../services/notifications';

type Props = CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, 'Deadlines'>,
    NativeStackScreenProps<RootStackParamList>
>;

type FilterStatus = 'ALL' | 'PENDING' | 'COMPLETED' | 'OVERDUE';

export const AllDeadlinesScreen: React.FC<Props> = ({ navigation }) => {
    const { colors, spacing, layout } = useTheme();

    const URGENCY_COLORS: Record<UrgencyLevel, string> = {
        CRITICAL: colors.critical,
        HIGH: colors.warning,
        MEDIUM: colors.accent,
        LOW: colors.safe,
    };

    const getUrgencyBackground = (urgency: UrgencyLevel): string => {
        switch (urgency) {
            case 'CRITICAL': return 'rgba(239, 68, 68, 0.15)';
            case 'HIGH': return 'rgba(234, 179, 8, 0.12)';
            case 'MEDIUM': return 'rgba(59, 130, 246, 0.1)';
            case 'LOW': return 'rgba(34, 197, 94, 0.1)';
            default: return colors.surface;
        }
    };

    const cases = useAppStore(state => state.cases);
    const deadlines = useAppStore(state => state.deadlines);
    const toggleDeadline = useAppStore(state => state.toggleDeadlineComplete);
    const deleteDeadline = useAppStore(state => state.deleteDeadline);

    const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
    const [filterCaseId, setFilterCaseId] = useState<string | null>(null);
    const [showCaseFilter, setShowCaseFilter] = useState(false);
    const [undoDeadline, setUndoDeadline] = useState<Deadline | null>(null);

    const isOverdue = (dueDate: string, isCompleted: boolean) => {
        if (isCompleted) return false;
        return dayjs(dueDate).isBefore(dayjs(), 'day');
    };

    const getDaysRemaining = (dueDate: string) => {
        const diff = dayjs(dueDate).diff(dayjs(), 'day');
        if (diff < 0) return `${Math.abs(diff)} days overdue`;
        if (diff === 0) return 'Due today';
        if (diff === 1) return 'Due tomorrow';
        return `${diff} days left`;
    };

    const filteredDeadlines = useMemo(() => {
        let result = [...deadlines];

        if (filterCaseId) {
            result = result.filter(d => d.caseId === filterCaseId);
        }

        if (filterStatus === 'PENDING') {
            result = result.filter(d => !d.isCompleted && !isOverdue(d.dueDate, d.isCompleted));
        } else if (filterStatus === 'COMPLETED') {
            result = result.filter(d => d.isCompleted);
        } else if (filterStatus === 'OVERDUE') {
            result = result.filter(d => isOverdue(d.dueDate, d.isCompleted));
        }

        return result.sort((a, b) => dayjs(a.dueDate).diff(dayjs(b.dueDate)));
    }, [deadlines, filterStatus, filterCaseId]);

    const handleToggle = useCallback((deadline: Deadline) => {
        toggleDeadline(deadline.id);
    }, [toggleDeadline]);

    const handleDelete = useCallback(async (deadline: Deadline) => {
        setUndoDeadline(deadline);
        if (deadline.notificationIds.length > 0) {
            await cancelNotifications(deadline.notificationIds);
        }
        deleteDeadline(deadline.id);
        setTimeout(() => setUndoDeadline(null), 5000);
    }, [deleteDeadline]);

    const handleUndo = useCallback(() => {
        if (undoDeadline) {
            useAppStore.getState().addDeadline(undoDeadline);
            setUndoDeadline(null);
        }
    }, [undoDeadline]);

    const getCaseName = (caseId: string) => {
        return cases.find(c => c.id === caseId)?.name || 'Unknown';
    };

    const filterCaseName = filterCaseId ? getCaseName(filterCaseId) : 'All Cases';
    const styles = createStyles(colors, spacing, layout);

    const renderItem = ({ item }: { item: Deadline }) => {
        const overdue = isOverdue(item.dueDate, item.isCompleted);
        const bgColor = item.isCompleted ? 'transparent' : getUrgencyBackground(item.urgency);
        const borderColor = item.isCompleted ? colors.border : (overdue ? colors.critical : URGENCY_COLORS[item.urgency]);

        return (
            <TouchableOpacity
                style={[styles.card, { backgroundColor: bgColor, borderColor }, item.isCompleted && styles.completedCard]}
                onPress={() => navigation.navigate('EditDeadline', { deadlineId: item.id })}
                activeOpacity={0.7}
            >
                <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                        <Text style={[styles.deadlineTitle, item.isCompleted && styles.completedText]} numberOfLines={1}>
                            {item.title}
                        </Text>
                        {!item.isCompleted && (
                            <View style={[styles.urgencyDot, { backgroundColor: URGENCY_COLORS[item.urgency] }]} />
                        )}
                    </View>

                    <Text style={styles.caseName}>{getCaseName(item.caseId)}</Text>

                    <View style={styles.cardFooter}>
                        <Text style={styles.typeText}>{item.type.replace('_', ' ')}</Text>
                        <Text style={[styles.daysText, overdue && styles.overdueText, item.isCompleted && styles.completedDays]}>
                            {item.isCompleted ? 'Completed' : getDaysRemaining(item.dueDate)}
                        </Text>
                    </View>
                </View>

                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.actionBtn, item.isCompleted && styles.actionBtnCompleted]}
                        onPress={() => handleToggle(item)}
                    >
                        <Text style={styles.actionIcon}>{item.isCompleted ? '↩' : '✓'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionBtn, styles.deleteBtn]}
                        onPress={() => handleDelete(item)}
                    >
                        <Text style={styles.actionIcon}>✕</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.title}>Deadlines</Text>

                <View style={styles.filtersRow}>
                    <View style={styles.statusFilters}>
                        {(['ALL', 'PENDING', 'OVERDUE', 'COMPLETED'] as FilterStatus[]).map(s => (
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
                </View>

                <TouchableOpacity style={styles.caseFilterButton} onPress={() => setShowCaseFilter(true)}>
                    <Text style={styles.caseFilterText}>{filterCaseName}</Text>
                    <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={filteredDeadlines}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>
                        {filterStatus === 'ALL' ? 'No deadlines yet.' : `No ${filterStatus.toLowerCase()} deadlines.`}
                    </Text>
                }
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                windowSize={5}
                initialNumToRender={10}
            />

            {undoDeadline && (
                <View style={styles.undoToast}>
                    <Text style={styles.undoText}>Deadline deleted</Text>
                    <TouchableOpacity onPress={handleUndo}>
                        <Text style={styles.undoButton}>UNDO</Text>
                    </TouchableOpacity>
                </View>
            )}

            <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddDeadline', {})}>
                <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>

            <Modal visible={showCaseFilter} animationType="fade" transparent>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCaseFilter(false)}>
                    <View style={styles.filterModal}>
                        <Text style={styles.modalTitle}>Filter by Case</Text>

                        <TouchableOpacity
                            style={[styles.modalItem, !filterCaseId && styles.modalItemSelected]}
                            onPress={() => { setFilterCaseId(null); setShowCaseFilter(false); }}
                        >
                            <Text style={[styles.modalItemText, !filterCaseId && styles.modalItemTextSelected]}>
                                All Cases
                            </Text>
                        </TouchableOpacity>

                        {cases.filter(c => c.status === 'ACTIVE').map(c => (
                            <TouchableOpacity
                                key={c.id}
                                style={[styles.modalItem, filterCaseId === c.id && styles.modalItemSelected]}
                                onPress={() => { setFilterCaseId(c.id); setShowCaseFilter(false); }}
                            >
                                <Text style={[styles.modalItemText, filterCaseId === c.id && styles.modalItemTextSelected]}>
                                    {c.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
};

const createStyles = (colors: any, spacing: any, layout: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { padding: spacing.m, paddingBottom: spacing.s },
    title: { color: colors.textPrimary, fontSize: 38, fontWeight: '200', letterSpacing: -1, marginBottom: spacing.m },
    filtersRow: { marginBottom: spacing.s },
    statusFilters: { flexDirection: 'row', gap: spacing.xs },
    filterChip: { paddingHorizontal: spacing.s, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.surface },
    filterChipActive: { backgroundColor: colors.accent },
    filterText: { color: colors.textSecondary, fontSize: 12, fontWeight: '500' },
    filterTextActive: { color: colors.background },
    caseFilterButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.m, borderRadius: layout.borderRadius, borderWidth: 1, borderColor: colors.border },
    caseFilterText: { color: colors.textPrimary, fontSize: 14 },
    dropdownArrow: { color: colors.textSecondary, fontSize: 12 },
    list: { padding: spacing.m, paddingBottom: 100 },
    card: { flexDirection: 'row', padding: spacing.m, borderRadius: layout.borderRadius, marginBottom: spacing.s, borderWidth: 1.5, alignItems: 'center' },
    completedCard: { opacity: 0.6 },
    cardContent: { flex: 1, marginRight: spacing.m },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    deadlineTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '500', flex: 1, marginRight: spacing.s },
    completedText: { textDecorationLine: 'line-through', color: colors.textSecondary },
    urgencyDot: { width: 10, height: 10, borderRadius: 5 },
    caseName: { color: colors.textSecondary, fontSize: 13, marginBottom: spacing.xs },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    typeText: { color: colors.textTertiary, fontSize: 12 },
    daysText: { color: colors.textSecondary, fontSize: 12, fontWeight: '500' },
    overdueText: { color: colors.critical, fontWeight: 'bold' },
    completedDays: { color: colors.safe },
    actions: { flexDirection: 'row', gap: spacing.xs },
    actionBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.safe, justifyContent: 'center', alignItems: 'center' },
    actionBtnCompleted: { backgroundColor: colors.warning },
    deleteBtn: { backgroundColor: colors.critical },
    actionIcon: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    emptyText: { color: colors.textTertiary, textAlign: 'center', marginTop: spacing.xxl, fontSize: 14 },
    undoToast: { position: 'absolute', bottom: 100, left: spacing.m, right: spacing.m, backgroundColor: colors.surface, padding: spacing.m, borderRadius: layout.borderRadius, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    undoText: { color: colors.textPrimary },
    undoButton: { color: colors.accent, fontWeight: 'bold' },
    fab: { position: 'absolute', bottom: spacing.l, right: spacing.l, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', elevation: 4 },
    fabText: { color: 'white', fontSize: 28, fontWeight: '300' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
    filterModal: { backgroundColor: colors.surface, borderRadius: layout.borderRadius, padding: spacing.m, width: '80%', maxHeight: '60%' },
    modalTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: 'bold', marginBottom: spacing.m, textAlign: 'center' },
    modalItem: { paddingVertical: spacing.m, borderBottomWidth: 1, borderBottomColor: colors.border },
    modalItemSelected: { backgroundColor: colors.surfaceHighlight },
    modalItemText: { color: colors.textPrimary, fontSize: 16 },
    modalItemTextSelected: { color: colors.accent, fontWeight: 'bold' },
});
