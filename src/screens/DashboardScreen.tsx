import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from '../store/useAppStore';
import { SummaryCard } from '../components/SummaryCard';
import { DeadlineItem } from '../components/DeadlineItem';
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

    const cases = useAppStore(state => state.cases);
    const deadlines = useAppStore(state => state.deadlines);
    const toggleDeadline = useAppStore(state => state.toggleDeadlineComplete);
    const userName = useAppStore(state => state.userName);

    const stats = useMemo(() => {
        const activeCases = cases.filter(c => c.status === 'ACTIVE').length;
        const completedDeadlines = deadlines.filter(d => d.isCompleted).length;

        let urgent = 0;
        let upcoming = 0;

        const now = dayjs();

        deadlines.forEach(d => {
            if (!d.isCompleted) {
                const daysUntil = dayjs(d.dueDate).diff(now, 'day');
                const isOverdue = daysUntil < 0;

                if (isOverdue || d.urgency === 'CRITICAL' || d.urgency === 'HIGH') {
                    urgent++;
                } else if (daysUntil <= 7) {
                    upcoming++;
                }
            }
        });

        return { activeCases, completedDeadlines, urgent, upcoming };
    }, [cases, deadlines]);

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
        toggleDeadline(id);
    };

    // Gradient colors based on theme
    const headerGradient: [string, string, string] = mode === 'dark'
        ? [colors.background, colors.surface, colors.background]
        : ['#ffffff', '#fcfcfc', '#f5f5f5']; // Cleaner white-to-light-grey for light mode

    const styles = createStyles(colors, spacing);

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            <LinearGradient
                colors={headerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerGradient}
            >
                <Text style={styles.greeting}>{getGreeting()}, {userName}</Text>
                <Text style={styles.subtext}>{dayjs().format('dddd, MMMM D')}</Text>
            </LinearGradient>

            <View style={styles.grid}>
                <View style={styles.row}>
                    <SummaryCard title="Urgent" count={stats.urgent} color={colors.critical} />
                    <SummaryCard title="This Week" count={stats.upcoming} color={colors.warning} />
                </View>
                <View style={styles.row}>
                    <SummaryCard title="Active Cases" count={stats.activeCases} color={colors.accent} />
                    <SummaryCard title="Completed" count={stats.completedDeadlines} color={colors.safe} />
                </View>
            </View>

            <Text style={styles.sectionTitle}>UPCOMING DEADLINES</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
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
                ListEmptyComponent={<Text style={styles.emptyText}>No upcoming deadlines. Add one to get started!</Text>}
                contentContainerStyle={styles.listContent}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                windowSize={5}
            />
        </SafeAreaView>
    );
};

const createStyles = (colors: any, spacing: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    headerContainer: {
        marginBottom: spacing.l,
    },
    headerGradient: {
        paddingTop: spacing.xl,
        paddingBottom: spacing.xl,
        paddingHorizontal: spacing.m,
        marginBottom: spacing.m,
    },
    greeting: {
        color: colors.textPrimary,
        fontSize: 38,
        fontWeight: '200',
        letterSpacing: -1,
    },
    subtext: {
        color: colors.accent,
        fontSize: 12,
        marginTop: spacing.xs,
        fontWeight: '600',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    grid: {
        marginHorizontal: spacing.s,
        marginBottom: spacing.xl,
    },
    row: {
        flexDirection: 'row',
    },
    sectionTitle: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
        marginLeft: spacing.m,
        marginBottom: spacing.m,
        letterSpacing: 1,
    },
    listContent: {
        paddingBottom: 100,
        paddingHorizontal: spacing.m,
    },
    emptyText: {
        color: colors.textTertiary,
        textAlign: 'center',
        marginTop: spacing.xxl,
        fontSize: 14,
        fontStyle: 'italic',
    },
});
