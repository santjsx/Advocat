import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Help'>;

export const HelpScreen: React.FC<Props> = ({ navigation }) => {
    const { colors, spacing } = useTheme();

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: spacing.m,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            backgroundColor: colors.surface,
        },
        backButton: {
            padding: spacing.s,
            marginRight: spacing.s,
        },
        headerTitle: {
            fontSize: 20,
            fontWeight: 'bold',
            color: colors.textPrimary,
        },
        content: {
            padding: spacing.m,
            paddingBottom: 40,
        },
        section: {
            marginBottom: spacing.l,
            backgroundColor: colors.surface,
            borderRadius: 12,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.border,
        },
        sectionHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: spacing.m,
            backgroundColor: colors.surfaceHighlight,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        sectionIcon: {
            marginRight: spacing.m,
        },
        sectionTitle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: colors.textPrimary,
            flex: 1,
            textTransform: 'uppercase',
            letterSpacing: 1,
        },
        sectionBody: {
            padding: spacing.m,
        },
        paragraph: {
            fontSize: 15,
            color: colors.textSecondary,
            lineHeight: 24,
            marginBottom: spacing.s,
        },
        bulletRow: {
            flexDirection: 'row',
            marginBottom: spacing.s,
            paddingLeft: spacing.s,
        },
        bulletDot: {
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: colors.accent,
            marginTop: 9,
            marginRight: spacing.m,
        },
        bulletText: {
            flex: 1,
            fontSize: 15,
            color: colors.textSecondary,
            lineHeight: 24,
        },
        subHeader: {
            fontSize: 15,
            fontWeight: 'bold',
            color: colors.accent,
            marginBottom: spacing.s,
            marginTop: spacing.s,
        }
    });

    const GuideSection = ({ title, icon, children }: { title: string, icon: any, children: React.ReactNode }) => (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Ionicons name={icon} size={20} color={colors.accent} style={styles.sectionIcon} />
                <Text style={styles.sectionTitle}>{title}</Text>
            </View>
            <View style={styles.sectionBody}>
                {children}
            </View>
        </View>
    );

    const Bullet = ({ text }: { text: React.ReactNode }) => (
        <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>{text}</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>User Guide</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                <GuideSection title="Dashboard" icon="home-outline">
                    <Text style={styles.paragraph}>
                        The Dashboard is your command center. It gives you an immediate overview of your practice.
                    </Text>
                    <Text style={styles.subHeader}>Summary Cards</Text>
                    <Bullet text="View your Total Cases, Active Deadlines, and Pending Documents at a glance." />
                    <Bullet text="These numbers update automatically as you add or complete tasks." />

                    <Text style={styles.subHeader}>Urgent Deadlines</Text>
                    <Bullet text="Check the list below the summary cards for upcoming due dates." />
                    <Bullet text="Items due within 7 days appear here to prevent missed deadlines." />
                </GuideSection>

                <GuideSection title="Managing Cases" icon="briefcase-outline">
                    <Text style={styles.paragraph}>
                        The Cases tab allows you to organize your legal matters efficiently.
                    </Text>
                    <Text style={styles.subHeader}>Creating a Case</Text>
                    <Bullet text="Tap the plus button (+) in the top right corner." />
                    <Bullet text="Enter the Case Title (e.g., Client Name) and Case Number." />
                    <Bullet text="Set the initial status (Active, Closed, or Pending)." />

                    <Text style={styles.subHeader}>Viewing & Editing</Text>
                    <Bullet text="Tap on any case to view its full timeline and documents." />
                    <Bullet text="Use the Edit button inside a case to modify details." />
                    <Bullet text="Swipe left on a case in the list to delete it." />
                </GuideSection>

                <GuideSection title="Legal Sections" icon="scale-outline">
                    <Text style={styles.paragraph}>
                        Attach applicable legal sections (IPC, BNS, CRPC, etc.) to cases for quick reference.
                    </Text>
                    <Text style={styles.subHeader}>Adding Sections</Text>
                    <Bullet text="In Case Detail or Add/Edit Case, tap 'Add Section'." />
                    <Bullet text="Select the Act (e.g., IPC, BNS) from the dropdown." />
                    <Bullet text="Enter multiple section numbers separated by commas (e.g., 302, 354A, 420)." />
                    <Bullet text="The app auto-fills professional legal descriptions (marginal notes) from its database." />

                    <Text style={styles.subHeader}>Viewing Sections</Text>
                    <Bullet text="Section chips display both the number and the crime name." />
                    <Bullet text="The Case Info card shows a list of applied section numbers." />

                    <Text style={styles.subHeader}>Tips</Text>
                    <Bullet text="Section input is case-insensitive: '354a' becomes '354A'." />
                    <Bullet text="You can add a custom description if the section is not in the database." />
                </GuideSection>

                <GuideSection title="Deadlines & Reminders" icon="timer-outline">
                    <Text style={styles.paragraph}>
                        Deadlines are categorized by urgency to help you prioritize.
                    </Text>
                    <Text style={styles.subHeader}>Urgency Levels</Text>
                    <Bullet text={<Text>Critical (Red): Due within 3 days. Immediate action required.</Text>} />
                    <Bullet text={<Text>High (Orange): Due within 7 days.</Text>} />
                    <Bullet text={<Text>Medium (Blue): Due within 30 days.</Text>} />
                    <Bullet text={<Text>Low (Green): Due in more than 30 days.</Text>} />

                    <Text style={styles.subHeader}>Notifications</Text>
                    <Bullet text="The app automatically schedules reminders based on these dates." />
                    <Bullet text="Customize your daily reminder time in Settings." />
                </GuideSection>

                <GuideSection title="Documents" icon="document-text-outline">
                    <Text style={styles.paragraph}>
                        Attach files directly to cases to keep your evidence органіzed.
                    </Text>

                    <Text style={styles.subHeader}>Adding & Storing</Text>
                    <Bullet text="In Case Detail, tap 'Add Document' to pick a file." />
                    <Bullet text="Select PDFs, Images, or Text files from your device." />
                    <Bullet text="Files are copied to local secure storage." />
                    <Bullet text="Nothing is uploaded to the cloud." />
                </GuideSection>

                <GuideSection title="Research & Notes" icon="scale-balance">
                    <Text style={styles.paragraph}>
                        Keep track of precedents and statutes.
                    </Text>
                    <Bullet text="Use the Research tab to add detailed legal notes." />
                    <Bullet text="Add a title and body text for each entry." />
                    <Bullet text="Use the search bar to find notes instantly." />
                </GuideSection>

                <GuideSection title="Data Backup" icon="cloud-download-outline">
                    <Text style={styles.paragraph}>
                        Protect your data by backing up regularly.
                    </Text>
                    <Text style={styles.subHeader}>Exporting</Text>
                    <Bullet text="Go to Settings > Data Management > Export Data." />
                    <Bullet text="Save the generated backup file to Google Drive or Email." />

                    <Text style={styles.subHeader}>Restoring</Text>
                    <Bullet text="If you reinstall the app, use 'Import Backup' in Settings." />
                    <Bullet text="Select your previous backup file to restore all data." />
                </GuideSection>

                <GuideSection title="Settings" icon="cog-outline">
                    <Text style={styles.paragraph}>
                        Customize your workspace experience.
                    </Text>
                    <Bullet text="Switch between Dark Mode and Light Mode." />
                    <Bullet text="Update your profile name." />
                    <Bullet text="Configure notification preferences." />
                    <Bullet text="View Privacy Policy and App Info." />
                </GuideSection>

            </ScrollView>
        </SafeAreaView>
    );
};
