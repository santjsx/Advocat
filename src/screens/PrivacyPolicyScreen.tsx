import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PrivacyPolicy'>;

export const PrivacyPolicyScreen: React.FC<Props> = ({ navigation }) => {
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
            padding: spacing.l,
            paddingBottom: 40,
        },
        section: {
            marginBottom: spacing.xl,
        },
        sectionTitle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: colors.textPrimary,
            marginBottom: spacing.s,
            marginTop: spacing.s,
        },
        paragraph: {
            fontSize: 16,
            color: colors.textSecondary,
            lineHeight: 24,
            marginBottom: spacing.m,
        },
        bulletPoint: {
            flexDirection: 'row',
            marginBottom: spacing.s,
            paddingLeft: spacing.s,
        },
        bulletDot: {
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: colors.accent,
            marginTop: 10,
            marginRight: spacing.s,
        },
        bulletText: {
            flex: 1,
            fontSize: 16,
            color: colors.textSecondary,
            lineHeight: 24,
        },
        highlightBox: {
            backgroundColor: colors.surfaceHighlight,
            padding: spacing.m,
            borderRadius: 12,
            borderLeftWidth: 4,
            borderLeftColor: colors.success,
            marginBottom: spacing.l,
        },
        highlightText: {
            fontSize: 16,
            color: colors.textPrimary,
            fontWeight: '500',
            lineHeight: 24,
        },
        version: {
            fontSize: 14,
            color: colors.textTertiary,
            textAlign: 'center',
            marginTop: spacing.xl,
            marginBottom: spacing.m,
        }
    });

    const Bullet = ({ text }: { text: string }) => (
        <View style={styles.bulletPoint}>
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
                <Text style={styles.headerTitle}>Privacy Policy</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.highlightBox}>
                    <Text style={styles.highlightText}>
                        Advocat is designed with a "Local-First" architecture. Your data stays on your device and is not collected by us.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>1. Data Storage</Text>
                    <Text style={styles.paragraph}>
                        All information you enter into Advocat, including case details, deadlines, documents, and notes, is stored locally on your device's internal storage.
                    </Text>
                    <Text style={styles.paragraph}>
                        We do not operate a cloud server, and we do not have access to your data.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>2. Data Collection</Text>
                    <Text style={styles.paragraph}>
                        We do not collect, track, or sell any personal information.
                    </Text>
                    <Bullet text="No analytics tracking" />
                    <Bullet text="No advertising tracking" />
                    <Bullet text="No user behavior monitoring" />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>3. Backup & Export</Text>
                    <Text style={styles.paragraph}>
                        You are responsible for backing up your data. The "Export Backup" feature creates a file that you can save to a secure location (like Google Drive or iCloud).
                    </Text>
                    <Text style={styles.paragraph}>
                        Backups verify purely technical data integrity and do not transmit data to us.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>4. Documents & Files</Text>
                    <Text style={styles.paragraph}>
                        Documents attached to cases are stored in your device's secure app sandbox. Permissions are requested only to access files you explicitly select for import.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>5. Contact Us</Text>
                    <Text style={styles.paragraph}>
                        If you have any questions about this privacy policy, please contact the developer at heysanthoshreddy@gmail.com.
                    </Text>
                </View>

                <Text style={styles.version}>Last Updated: January 12, 2026</Text>
            </ScrollView>
        </SafeAreaView>
    );
};
