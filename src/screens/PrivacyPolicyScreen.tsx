import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    LayoutAnimation,
    Platform,
    UIManager,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import * as Haptics from 'expo-haptics';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental && !(global as any).nativeFabricUIManager) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = NativeStackScreenProps<RootStackParamList, 'PrivacyPolicy'>;

interface PolicySection {
    id: string;
    num: string;
    title: string;
    badge: string;
    icon: any;
    iconType?: 'ionicons' | 'material';
    content: React.ReactNode;
}

export const PrivacyPolicyScreen: React.FC<Props> = ({ navigation }) => {
    const { colors, spacing } = useTheme();

    // Default open: Core Promise and AI Privacy
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        'local-storage': true,
        'ai-privacy': true,
        'legal-privilege': true,
    });

    const toggleSection = (id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedSections(prev => ({
            ...prev,
            [id]: !prev[id],
        }));
    };

    const expandAll = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        const all: Record<string, boolean> = {};
        sections.forEach(s => (all[s.id] = true));
        setExpandedSections(all);
    };

    const collapseAll = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedSections({});
    };

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: spacing.m,
            paddingVertical: spacing.s,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            backgroundColor: colors.surface,
        },
        backButton: {
            padding: spacing.s,
            marginRight: spacing.xs,
            borderRadius: 8,
        },
        headerTitle: {
            fontSize: 20,
            fontWeight: '700',
            color: colors.textPrimary,
            letterSpacing: -0.3,
        },
        headerSubtitle: {
            fontSize: 12,
            color: colors.textTertiary,
            marginTop: 1,
        },
        content: {
            padding: spacing.m,
            paddingBottom: 140,
        },
        // Hero Shield Card
        heroBanner: {
            borderRadius: 16,
            padding: spacing.m,
            marginBottom: spacing.m,
            borderWidth: 1,
            borderColor: colors.safe + '40',
            overflow: 'hidden',
        },
        heroTopRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            marginBottom: spacing.s,
        },
        shieldCircle: {
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: colors.safe + '20',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.safe + '50',
        },
        heroTitle: {
            fontSize: 16,
            fontWeight: '700',
            color: colors.textPrimary,
            letterSpacing: 0.2,
        },
        heroSubtitle: {
            fontSize: 12,
            color: colors.safe,
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            marginTop: 2,
        },
        heroDesc: {
            fontSize: 13.5,
            color: colors.textSecondary,
            lineHeight: 20,
            marginBottom: spacing.m,
        },
        heroPillsRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 6,
        },
        heroPill: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 6,
            backgroundColor: colors.surface + '90',
            borderWidth: 1,
            borderColor: colors.border + '60',
        },
        heroPillText: {
            fontSize: 11,
            color: colors.textSecondary,
            fontWeight: '600',
        },
        controlsBar: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: spacing.m,
        },
        controlsLabel: {
            fontSize: 12,
            color: colors.textTertiary,
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
        },
        toggleButtonsRow: {
            flexDirection: 'row',
            gap: 8,
        },
        toggleButton: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 8,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
        },
        toggleButtonText: {
            fontSize: 11,
            fontWeight: '600',
            color: colors.accent,
        },
        // Policy Card
        sectionCard: {
            marginBottom: spacing.m,
            backgroundColor: colors.surface,
            borderRadius: 14,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 6,
            elevation: 2,
        },
        sectionCardExpanded: {
            borderColor: colors.accent + '40',
        },
        sectionHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: spacing.m,
            backgroundColor: colors.surface,
            gap: 12,
        },
        sectionIconBox: {
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: colors.accent + '15',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.accent + '30',
        },
        sectionHeaderContent: {
            flex: 1,
        },
        sectionTitleRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
        },
        sectionTitle: {
            fontSize: 15,
            fontWeight: '700',
            color: colors.textPrimary,
            letterSpacing: 0.2,
        },
        badgePill: {
            paddingHorizontal: 7,
            paddingVertical: 2,
            borderRadius: 6,
            backgroundColor: colors.accent + '15',
            borderWidth: 1,
            borderColor: colors.accent + '30',
        },
        badgeText: {
            fontSize: 10,
            fontWeight: '700',
            color: colors.accent,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
        },
        chevronBox: {
            padding: 4,
        },
        sectionBody: {
            paddingHorizontal: spacing.m,
            paddingBottom: spacing.m,
            paddingTop: spacing.xs,
            borderTopWidth: 1,
            borderTopColor: colors.border + '40',
        },
        paragraph: {
            fontSize: 14,
            color: colors.textSecondary,
            lineHeight: 22,
            marginBottom: spacing.s,
        },
        subHeader: {
            fontSize: 14,
            fontWeight: '700',
            color: colors.accent,
            marginTop: spacing.s,
            marginBottom: spacing.xs,
            letterSpacing: 0.2,
        },
        bulletRow: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            marginBottom: 6,
            paddingLeft: 4,
        },
        bulletDot: {
            width: 5,
            height: 5,
            borderRadius: 2.5,
            backgroundColor: colors.safe,
            marginTop: 8,
            marginRight: 10,
        },
        bulletText: {
            flex: 1,
            fontSize: 13.5,
            color: colors.textSecondary,
            lineHeight: 20,
        },
        boldText: {
            fontWeight: '700',
            color: colors.textPrimary,
        },
        calloutBox: {
            marginVertical: spacing.s,
            padding: spacing.m,
            borderRadius: 10,
            borderWidth: 1,
        },
        calloutSafe: {
            backgroundColor: colors.safe + '12',
            borderColor: colors.safe + '35',
        },
        calloutTip: {
            backgroundColor: colors.accent + '10',
            borderColor: colors.accent + '35',
        },
        calloutHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginBottom: 4,
        },
        calloutTitle: {
            fontSize: 12,
            fontWeight: '700',
            letterSpacing: 0.5,
            textTransform: 'uppercase',
        },
        calloutText: {
            fontSize: 13,
            color: colors.textSecondary,
            lineHeight: 19,
        },
        footerCard: {
            alignItems: 'center',
            padding: spacing.l,
            marginTop: spacing.m,
            borderRadius: 12,
            backgroundColor: colors.surfaceHighlight + '40',
            borderWidth: 1,
            borderColor: colors.border + '60',
        },
        footerText: {
            fontSize: 12,
            color: colors.textTertiary,
            textAlign: 'center',
            lineHeight: 18,
        },
        contactLink: {
            marginTop: 6,
            color: colors.accent,
            fontWeight: '700',
            fontSize: 13,
        },
    });

    const Bullet = ({ children }: { children: React.ReactNode }) => (
        <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>{children}</Text>
        </View>
    );

    const Callout = ({
        type = 'safe',
        title,
        children,
    }: {
        type?: 'safe' | 'tip';
        title: string;
        children: React.ReactNode;
    }) => {
        const isSafe = type === 'safe';
        return (
            <View style={[styles.calloutBox, isSafe ? styles.calloutSafe : styles.calloutTip]}>
                <View style={styles.calloutHeader}>
                    <Ionicons
                        name={isSafe ? 'shield-checkmark-outline' : 'bulb-outline'}
                        size={15}
                        color={isSafe ? colors.safe : colors.accent}
                    />
                    <Text style={[styles.calloutTitle, { color: isSafe ? colors.safe : colors.accent }]}>
                        {title}
                    </Text>
                </View>
                <Text style={styles.calloutText}>{children}</Text>
            </View>
        );
    };

    const sections: PolicySection[] = [
        {
            id: 'local-storage',
            num: '1',
            title: '1. Local-First Architecture',
            badge: 'Zero Cloud Storage',
            icon: 'server-off',
            iconType: 'material',
            content: (
                <>
                    <Text style={styles.paragraph}>
                        Advocat operates on an uncompromising <Text style={styles.boldText}>"Local-First" architecture</Text>. All information you input—including client portfolios, sensitive case facts, hearing dates, and internal research notes—is persisted strictly inside your device's sandboxed local storage.
                    </Text>
                    <Bullet>
                        <Text style={styles.boldText}>No Database Servers:</Text> We do not operate or maintain remote database servers. Your client records are never mirrored to any cloud server managed by us.
                    </Bullet>
                    <Bullet>
                        <Text style={styles.boldText}>Offline Independence:</Text> You can create cases, calculate limitation periods, browse legal sections, and draft pleadings completely offline without an active internet connection.
                    </Bullet>
                </>
            ),
        },
        {
            id: 'ai-privacy',
            num: '2',
            title: '2. AI Drafting & DeepSeek API Privacy',
            badge: 'BYOK Encryption',
            icon: 'scale-balance',
            iconType: 'material',
            content: (
                <>
                    <Text style={styles.paragraph}>
                        Advocat offers an optional, high-performance legal drafting engine using the DeepSeek V3/R1 API under a <Text style={styles.boldText}>Bring-Your-Own-Key (BYOK)</Text> model.
                    </Text>
                    <Bullet>
                        <Text style={styles.boldText}>Direct Encrypted Pipeline:</Text> When you trigger paperbook compilation, the case prompt is sent over TLS 1.3 encrypted HTTPS directly to the DeepSeek API endpoint using your personal API key.
                    </Bullet>
                    <Bullet>
                        <Text style={styles.boldText}>Zero Data Training:</Text> Under DeepSeek's enterprise API terms, data sent via commercial API endpoints is strictly processed for generation and is <Text style={styles.boldText}>never used to train future AI models</Text>.
                    </Bullet>
                    <Bullet>
                        <Text style={styles.boldText}>Offline Template Fallback:</Text> If you prefer not to use external APIs or are in a court room without connectivity, Advocat automatically defaults to its built-in rule-based offline template engine for 100% private, local ₹0 compilation.
                    </Bullet>

                    <Callout type="safe" title="🔒 Key Confidentiality Guarantee">
                        Your DeepSeek API Key is stored securely within your device's private app preferences. It is never logged, intercepted, or transmitted to any third party.
                    </Callout>
                </>
            ),
        },
        {
            id: 'legal-privilege',
            num: '3',
            title: '3. Legal Professional Privilege & Confidentiality',
            badge: 'Sec 126 BSA / IEA',
            icon: 'shield-lock-outline',
            iconType: 'material',
            content: (
                <>
                    <Text style={styles.paragraph}>
                        We acknowledge the solemn statutory obligation of <Text style={styles.boldText}>Professional Communication Privilege</Text> governing advocates and legal practitioners under Section 126 of the Indian Evidence Act, 1872 / Bharatiya Sakshya Adhiniyam, 2023 (BSA).
                    </Text>
                    <Bullet>
                        <Text style={styles.boldText}>Absolute Non-Disclosure:</Text> Because Advocat does not harvest or transmit case data, your client-attorney communications remain fully protected within the sacred ambit of professional privilege.
                    </Bullet>
                    <Bullet>
                        <Text style={styles.boldText}>No Third-Party Access:</Text> No employee, developer, or automated crawler can inspect, read, or monetize your legal briefs.
                    </Bullet>
                </>
            ),
        },
        {
            id: 'data-collection',
            num: '4',
            title: '4. Zero Tracking & Telemetry',
            badge: 'No Analytics',
            icon: 'eye-off-outline',
            content: (
                <>
                    <Text style={styles.paragraph}>
                        Advocat respects your privacy by omitting tracking libraries entirely:
                    </Text>
                    <Bullet>
                        <Text style={styles.boldText}>No Behavioral Analytics:</Text> We do not bundle Google Analytics, Mixpanel, Firebase Crashlytics telemetry, or Facebook SDKs.
                    </Bullet>
                    <Bullet>
                        <Text style={styles.boldText}>No Advertising IDs:</Text> We do not read your device Advertising ID or sell usage data to data brokers.
                    </Bullet>
                    <Bullet>
                        <Text style={styles.boldText}>No Account Creation Required:</Text> You can use the full suite of Advocat features without submitting your email, phone number, or personal identity.
                    </Bullet>
                </>
            ),
        },
        {
            id: 'permissions',
            num: '5',
            title: '5. Device Permissions & Purpose',
            badge: 'Minimal Access',
            icon: 'key-outline',
            content: (
                <>
                    <Text style={styles.paragraph}>
                        Advocat requests only the minimum OS permissions necessary for legal practice tools:
                    </Text>
                    <Bullet>
                        <Text style={styles.boldText}>Files & Storage (READ/WRITE):</Text> Used exclusively when you select an FIR copy, charge sheet, or document attachment from your storage, and to save compiled `.docx` paperbooks to your download folder.
                    </Bullet>
                    <Bullet>
                        <Text style={styles.boldText}>Local Notifications:</Text> Used solely by the device OS to fire morning cause list and deadline reminders at the time you configured in Settings.
                    </Bullet>
                    <Bullet>
                        <Text style={styles.boldText}>Haptic Feedback:</Text> Used to provide tactile confirmation on buttons, steppers, and accordion dropdowns.
                    </Bullet>
                </>
            ),
        },
        {
            id: 'backup-control',
            num: '6',
            title: '6. Data Ownership, Portability & Deletion',
            badge: 'Full Ownership',
            icon: 'cloud-download-outline',
            content: (
                <>
                    <Text style={styles.paragraph}>
                        You retain 100% legal and technical ownership of all data created in Advocat.
                    </Text>
                    <Bullet>
                        <Text style={styles.boldText}>Full JSON Export:</Text> Export a complete, unencrypted JSON archive of your practice at any time via <Text style={styles.boldText}>Settings → Data Management → Export Data</Text>.
                    </Bullet>
                    <Bullet>
                        <Text style={styles.boldText}>Complete Local Deletion:</Text> Uninstalling the app or clearing application data from Android settings permanently deletes all stored cases, documents, and preferences from your device.
                    </Bullet>
                </>
            ),
        },
        {
            id: 'pdf-scanner-privacy',
            num: '7',
            title: '7. On-Device Image to PDF & Document Scanner',
            badge: '100% Offline Processing',
            icon: 'document-text-outline',
            content: (
                <>
                    <Text style={styles.paragraph}>
                        Advocat includes a native <Text style={styles.boldText}>Image to PDF Converter & Scanner</Text> for assembling court annexures, FIR copies, and judicial records.
                    </Text>
                    <Bullet>
                        <Text style={styles.boldText}>Zero Cloud Uploads:</Text> All image rendering, aspect-ratio scaling, page margins, and PDF compilation execute 100% locally on your device's native CPU.
                    </Bullet>
                    <Bullet>
                        <Text style={styles.boldText}>No Image Caching on Remote Servers:</Text> Selected photographs from your camera or gallery are processed entirely in sandboxed volatile memory and saved only to your designated case file or local gallery.
                    </Bullet>
                    <Callout type="safe" title="⚖️ Annexure Confidentiality Guarantee">
                        Your confidential evidence documents, witness photos, and court exhibits never touch third-party servers or external OCR APIs.
                    </Callout>
                </>
            ),
        },
    ];

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>Privacy Policy</Text>
                    <Text style={styles.headerSubtitle}>Legal Confidentiality & Data Protection</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Hero Shield Banner */}
                <LinearGradient
                    colors={[colors.safe + '25', colors.surfaceHighlight + '90', colors.surface]}
                    style={styles.heroBanner}
                >
                    <View style={styles.heroTopRow}>
                        <View style={styles.shieldCircle}>
                            <Ionicons name="shield-checkmark" size={24} color={colors.safe} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.heroTitle}>Privacy by Architecture</Text>
                            <Text style={styles.heroSubtitle}>100% Local-First & Confidential</Text>
                        </View>
                    </View>

                    <Text style={styles.heroDesc}>
                        Advocat is engineered specifically for advocates and legal professionals. Your case briefs, client identities, and legal research are strictly stored on your device and are never harvested or monetized.
                    </Text>

                    <View style={styles.heroPillsRow}>
                        <View style={styles.heroPill}>
                            <Ionicons name="server-outline" size={12} color={colors.safe} />
                            <Text style={styles.heroPillText}>Zero Cloud Servers</Text>
                        </View>
                        <View style={styles.heroPill}>
                            <Ionicons name="eye-off-outline" size={12} color={colors.safe} />
                            <Text style={styles.heroPillText}>No Tracking SDKs</Text>
                        </View>
                        <View style={styles.heroPill}>
                            <Ionicons name="key-outline" size={12} color={colors.safe} />
                            <Text style={styles.heroPillText}>BYOK AI Privacy</Text>
                        </View>
                    </View>
                </LinearGradient>

                {/* Controls Bar */}
                <View style={styles.controlsBar}>
                    <Text style={styles.controlsLabel}>Policy Clauses ({sections.length})</Text>
                    <View style={styles.toggleButtonsRow}>
                        <TouchableOpacity onPress={expandAll} style={styles.toggleButton}>
                            <Ionicons name="chevron-down-outline" size={12} color={colors.accent} />
                            <Text style={styles.toggleButtonText}>Expand All</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={collapseAll} style={styles.toggleButton}>
                            <Ionicons name="chevron-up-outline" size={12} color={colors.accent} />
                            <Text style={styles.toggleButtonText}>Collapse All</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Policy Clauses Accordions */}
                {sections.map(section => {
                    const isExpanded = !!expandedSections[section.id];
                    return (
                        <View
                            key={section.id}
                            style={[
                                styles.sectionCard,
                                isExpanded && styles.sectionCardExpanded,
                            ]}
                        >
                            {/* Accordion Header */}
                            <TouchableOpacity
                                onPress={() => toggleSection(section.id)}
                                style={styles.sectionHeader}
                                activeOpacity={0.8}
                            >
                                <View style={styles.sectionIconBox}>
                                    {section.iconType === 'material' ? (
                                        <MaterialCommunityIcons
                                            name={section.icon}
                                            size={20}
                                            color={colors.accent}
                                        />
                                    ) : (
                                        <Ionicons name={section.icon} size={19} color={colors.accent} />
                                    )}
                                </View>

                                <View style={styles.sectionHeaderContent}>
                                    <View style={styles.sectionTitleRow}>
                                        <Text style={styles.sectionTitle}>{section.title}</Text>
                                        <View style={styles.badgePill}>
                                            <Text style={styles.badgeText}>{section.badge}</Text>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.chevronBox}>
                                    <Ionicons
                                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                        size={20}
                                        color={isExpanded ? colors.accent : colors.textTertiary}
                                    />
                                </View>
                            </TouchableOpacity>

                            {/* Accordion Content */}
                            {isExpanded && (
                                <View style={styles.sectionBody}>
                                    {section.content}
                                </View>
                            )}
                        </View>
                    );
                })}

                {/* Footer Info */}
                <View style={styles.footerCard}>
                    <Ionicons name="checkmark-done-circle-outline" size={28} color={colors.safe} />
                    <Text style={[styles.footerText, { marginTop: 8 }]}>
                        Last Verified & Updated: August 2026
                        {'\n'}Advocat Legal Practice Suite for Android & iOS
                    </Text>
                    <TouchableOpacity
                        onPress={() => Linking.openURL('mailto:heysanthoshreddy@gmail.com?subject=Advocat%20Privacy%20Inquiry')}
                    >
                        <Text style={styles.contactLink}>Contact Developer: heysanthoshreddy@gmail.com</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};
