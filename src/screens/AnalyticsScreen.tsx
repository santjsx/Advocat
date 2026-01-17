import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../theme/ThemeContext';
import dayjs from 'dayjs';
import { CaseType, CASE_TYPES, CaseStatus } from '../models/Case';
import { BarChart, PieChart, LineChart, ContributionGraph } from 'react-native-chart-kit';
import { AbstractChartConfig } from 'react-native-chart-kit/dist/AbstractChart';
import { Ionicons } from '@expo/vector-icons';

const screenWidth = Dimensions.get('window').width;

const TYPE_COLORS: Record<CaseType, string> = {
    CIVIL: '#3b82f6',
    CRIMINAL: '#ef4444',
    FAMILY: '#ec4899',
    CORPORATE: '#8b5cf6',
    PROPERTY: '#f59e0b',
    LABOR: '#10b981',
    OTHER: '#6b7280',
};

export const AnalyticsScreen: React.FC = () => {
    const { colors, spacing, layout } = useTheme();

    const cases = useAppStore(state => state.cases);
    const deadlines = useAppStore(state => state.deadlines);

    const analytics = useMemo(() => {
        const now = dayjs();

        const totalCases = cases.length;
        const activeCases = cases.filter(c => c.status === 'ACTIVE').length;
        const closedCases = cases.filter(c => c.status === 'CLOSED').length;
        const pendingCases = cases.filter(c => c.status === 'PENDING').length;

        const caseCompletionRate = totalCases > 0 ? (closedCases / totalCases) : 0;

        // Avg Duration (Closed cases)
        let avgDuration = 0;
        const closedCasesWithDuration = cases.filter(c => c.status === 'CLOSED');
        if (closedCasesWithDuration.length > 0) {
            const totalDays = closedCasesWithDuration.reduce((sum, c) => {
                return sum + dayjs(c.updatedAt).diff(dayjs(c.filingDate), 'day');
            }, 0);
            avgDuration = Math.round(totalDays / closedCasesWithDuration.length);
        }

        // Deadlines Stats
        const totalDeadlines = deadlines.length;
        const completedDeadlines = deadlines.filter(d => d.isCompleted).length;
        const overdueDeadlines = deadlines.filter(d =>
            !d.isCompleted && dayjs(d.dueDate).isBefore(now, 'day')
        ).length;
        const upcomingDeadlines = deadlines.filter(d =>
            !d.isCompleted && !dayjs(d.dueDate).isBefore(now, 'day')
        ).length;

        // Cases by Type (Pie Chart Data)
        const casesByTypeData = CASE_TYPES.map(type => {
            const count = cases.filter(c => c.caseType === type).length;
            if (count === 0) return null;
            return {
                name: type,
                population: count,
                color: TYPE_COLORS[type],
                legendFontColor: colors.textSecondary,
                legendFontSize: 10
            };
        }).filter(Boolean) as any[];

        // Cases Last 6 Months (Line Chart Data)
        const last6Months = [];
        const monthlyCaseCounts = [];
        for (let i = 5; i >= 0; i--) {
            const monthStart = now.subtract(i, 'month').startOf('month');
            const monthEnd = monthStart.endOf('month');
            const count = cases.filter(c => {
                const created = dayjs(c.createdAt);
                return created.isAfter(monthStart) && created.isBefore(monthEnd);
            }).length;
            last6Months.push(monthStart.format('MMM'));
            monthlyCaseCounts.push(count);
        }

        // Deadline Trends (Line Chart Data)
        const deadlineCompletedCounts = [];
        const deadlineMissedCounts = [];
        for (let i = 5; i >= 0; i--) {
            const monthStart = now.subtract(i, 'month').startOf('month');
            const monthEnd = monthStart.endOf('month');
            const completed = deadlines.filter(d => {
                const dueDate = dayjs(d.dueDate);
                return d.isCompleted && dueDate.isAfter(monthStart) && dueDate.isBefore(monthEnd);
            }).length;
            const missed = deadlines.filter(d => {
                const dueDate = dayjs(d.dueDate);
                return !d.isCompleted && dueDate.isBefore(now, 'day') && dueDate.isAfter(monthStart) && dueDate.isBefore(monthEnd); // Assuming missed based on due date in past and not done
            }).length;
            deadlineCompletedCounts.push(completed);
            deadlineMissedCounts.push(missed);
        }

        return {
            totalCases, activeCases, closedCases, pendingCases, caseCompletionRate, avgDuration,
            totalDeadlines, completedDeadlines, overdueDeadlines, upcomingDeadlines,
            casesByTypeData,
            lineChartData: {
                labels: last6Months,
                datasets: [
                    { data: monthlyCaseCounts, color: (opacity = 1) => colors.accent, strokeWidth: 2 }
                ]
            },
            deadlineTrendData: {
                labels: last6Months,
                datasets: [
                    { data: deadlineCompletedCounts, color: (opacity = 1) => colors.safe, strokeWidth: 2, withDots: true },
                    { data: deadlineMissedCounts, color: (opacity = 1) => colors.critical, strokeWidth: 2, withDots: true }
                ],
                legend: ['Completed', 'Missed']
            }
        };
    }, [cases, deadlines, colors]);

    const styles = createStyles(colors, spacing, layout);

    const chartConfig: AbstractChartConfig = {
        backgroundGradientFrom: colors.surface,
        backgroundGradientTo: colors.surface,
        color: (opacity = 1) => colors.accent,
        labelColor: (opacity = 1) => colors.textSecondary,
        strokeWidth: 2,
        barPercentage: 0.7,
        useShadowColorFromDataset: false,
        decimalPlaces: 0,
        propsForDots: {
            r: "5",
            strokeWidth: "2",
            stroke: colors.surface
        },
        propsForBackgroundLines: {
            strokeDasharray: "", // solid lines
            stroke: colors.border + '40', // subtle lines
            strokeWidth: 0.5
        }
    };

    const StatCard = ({ title, value, subtitle, color = colors.textPrimary, size = 'normal' }: any) => (
        <View style={[styles.statCard, size === 'large' && styles.statCardLarge]}>
            <Text style={styles.statTitle}>{title}</Text>
            <Text style={[styles.statValue, { color }, size === 'large' && { fontSize: 36 }]}>{value}</Text>
            {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.headerTitle}>Analytics</Text>
                <Text style={styles.headerSubtitle}>Performance Insights</Text>

                {/* Key Metrics Row */}
                <View style={styles.row}>
                    <StatCard
                        title="Completion Rate"
                        value={`${Math.round(analytics.caseCompletionRate * 100)}%`}
                        subtitle="cases closed"
                        color={colors.safe}
                    />
                    <StatCard
                        title="Avg Duration"
                        value={`${analytics.avgDuration}d`}
                        subtitle="per case"
                        color={colors.accent}
                    />
                    <StatCard
                        title="Overdue"
                        value={analytics.overdueDeadlines}
                        subtitle="deadlines"
                        color={colors.critical}
                    />
                </View>

                {/* Case Status Distribution */}
                <View style={styles.chartSection}>
                    <Text style={styles.chartTitle}>CASE STATUS OVERVIEW</Text>
                    <View style={styles.statusRow}>
                        <View style={styles.statusItem}>
                            <Text style={[styles.statusCount, { color: colors.safe }]}>{analytics.activeCases}</Text>
                            <Text style={styles.statusLabel}>Active</Text>
                        </View>
                        <View style={styles.statusItem}>
                            <Text style={[styles.statusCount, { color: colors.warning }]}>{analytics.pendingCases}</Text>
                            <Text style={styles.statusLabel}>Pending</Text>
                        </View>
                        <View style={styles.statusItem}>
                            <Text style={[styles.statusCount, { color: colors.textTertiary }]}>{analytics.closedCases}</Text>
                            <Text style={styles.statusLabel}>Closed</Text>
                        </View>
                    </View>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${(analytics.activeCases / (analytics.totalCases || 1)) * 100}%`, backgroundColor: colors.safe }]} />
                        <View style={[styles.progressBarFill, { width: `${(analytics.pendingCases / (analytics.totalCases || 1)) * 100}%`, backgroundColor: colors.warning }]} />
                        <View style={[styles.progressBarFill, { width: `${(analytics.closedCases / (analytics.totalCases || 1)) * 100}%`, backgroundColor: colors.textTertiary }]} />
                    </View>
                </View>

                {/* Cases by Type Pie Chart */}
                {analytics.casesByTypeData.length > 0 && (
                    <View style={styles.chartSection}>
                        <Text style={styles.chartTitle}>CASES BY TYPE</Text>
                        <PieChart
                            data={analytics.casesByTypeData}
                            width={screenWidth - spacing.m * 2 - 32} // padding adjustments
                            height={220}
                            chartConfig={chartConfig}
                            accessor={"population"}
                            backgroundColor={"transparent"}
                            paddingLeft={"15"}
                            center={[10, 0]}
                            absolute
                        />
                    </View>
                )}

                {/* Case Growth Line Chart */}
                <View style={styles.chartSection}>
                    <Text style={styles.chartTitle}>NEW CASES (Last 6 Months)</Text>
                    <LineChart
                        data={analytics.lineChartData}
                        width={screenWidth - spacing.m * 2 - 2} // adjusted width
                        height={220}
                        chartConfig={{
                            ...chartConfig,
                            strokeWidth: 3,
                        }}
                        bezier
                        style={styles.chartStyle}
                    />
                </View>

                {/* Deadline Perf Line Chart */}
                <View style={styles.chartSection}>
                    <Text style={styles.chartTitle}>DEADLINE PERFORMANCE</Text>
                    <Text style={styles.chartSubtitle}>Completed vs Missed</Text>
                    <LineChart
                        data={analytics.deadlineTrendData}
                        width={screenWidth - spacing.m * 2 - 2}
                        height={220}
                        chartConfig={{
                            ...chartConfig,
                            // Custom color handling needs care in Chart Kit, relying on dataset colors
                        }}
                        bezier
                        style={styles.chartStyle}
                    />
                    <View style={styles.legendContainer}>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: colors.safe }]} />
                            <Text style={styles.legendText}>Completed</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: colors.critical }]} />
                            <Text style={styles.legendText}>Missed</Text>
                        </View>
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
};

const createStyles = (colors: any, spacing: any, layout: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        padding: spacing.m,
        paddingBottom: 100,
    },
    headerTitle: {
        color: colors.textPrimary,
        fontSize: 34,
        fontWeight: 'bold',
        marginTop: spacing.s,
    },
    headerSubtitle: {
        color: colors.textSecondary,
        fontSize: 14,
        marginTop: 4,
        marginBottom: spacing.l,
        letterSpacing: 0.5,
    },
    row: {
        flexDirection: 'row',
        gap: spacing.s,
        marginBottom: spacing.l,
    },
    statCard: {
        flex: 1,
        backgroundColor: colors.surface,
        padding: spacing.m,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    statCardLarge: {
        flex: 2,
    },
    statTitle: {
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: 8,
        letterSpacing: 0.5,
        textAlign: 'center',
    },
    statValue: {
        fontSize: 26,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    statSubtitle: {
        color: colors.textTertiary,
        fontSize: 11,
        marginTop: 2,
        fontWeight: '500',
    },
    chartSection: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: spacing.m,
        marginBottom: spacing.l,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 4,
    },
    chartTitle: {
        color: colors.textPrimary,
        fontSize: 15,
        fontWeight: '700',
        alignSelf: 'flex-start',
        marginBottom: spacing.m,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        opacity: 0.9,
    },
    chartSubtitle: {
        color: colors.textSecondary,
        fontSize: 12,
        alignSelf: 'flex-start',
        marginBottom: spacing.s,
        marginTop: -spacing.s + 4,
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginBottom: spacing.l,
    },
    statusItem: {
        alignItems: 'center',
    },
    statusCount: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    statusLabel: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '500',
    },
    progressBarBg: {
        flexDirection: 'row',
        height: 14,
        width: '100%',
        backgroundColor: colors.surfaceHighlight,
        borderRadius: 7,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
    },
    chartStyle: {
        borderRadius: 16,
        marginVertical: 8,
    },
    legendContainer: {
        flexDirection: 'row',
        gap: spacing.l,
        marginTop: spacing.s,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    legendText: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '500',
    },
});
