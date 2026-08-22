import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    LayoutAnimation,
    Platform,
    UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import * as Haptics from 'expo-haptics';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental && !(global as any).nativeFabricUIManager) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = NativeStackScreenProps<RootStackParamList, 'Help'>;

interface SectionItem {
    id: string;
    title: string;
    icon: any;
    iconType?: 'ionicons' | 'material';
    badge: string;
    badgeColor?: string;
    keywords: string[];
    content: React.ReactNode;
}

export const HelpScreen: React.FC<Props> = ({ navigation }) => {
    const { colors, spacing } = useTheme();
    const [searchQuery, setSearchQuery] = useState('');
    
    // Default open sections: AI Pleading and Dashboard
    const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({
        'ai-pleading': true,
        'dashboard': true,
    });

    const toggleSection = (id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedIds(prev => ({
            ...prev,
            [id]: !prev[id],
        }));
    };

    const expandAll = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        const allOpen: Record<string, boolean> = {};
        sections.forEach(s => {
            allOpen[s.id] = true;
        });
        setExpandedIds(allOpen);
    };

    const collapseAll = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedIds({});
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
        searchContainer: {
            paddingHorizontal: spacing.m,
            paddingTop: spacing.m,
            paddingBottom: spacing.s,
            backgroundColor: colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: colors.border + '60',
        },
        searchBar: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surfaceHighlight,
            borderRadius: 10,
            paddingHorizontal: spacing.m,
            paddingVertical: Platform.OS === 'ios' ? 10 : 8,
            borderWidth: 1,
            borderColor: colors.border,
            gap: 8,
        },
        searchInput: {
            flex: 1,
            color: colors.textPrimary,
            fontSize: 14,
            padding: 0,
        },
        clearButton: {
            padding: 2,
        },
        controlsBar: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing.m,
            paddingVertical: spacing.s,
        },
        resultsCount: {
            fontSize: 12,
            color: colors.textTertiary,
            fontWeight: '500',
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
        content: {
            padding: spacing.m,
            paddingBottom: 140,
        },
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
            backgroundColor: colors.accent,
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
        codeText: {
            fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
            backgroundColor: colors.surfaceHighlight,
            color: colors.accent,
            fontSize: 12,
            fontWeight: '600',
        },
        calloutBox: {
            marginVertical: spacing.s,
            padding: spacing.m,
            borderRadius: 10,
            borderWidth: 1,
        },
        calloutTip: {
            backgroundColor: colors.accent + '10',
            borderColor: colors.accent + '35',
        },
        calloutWarning: {
            backgroundColor: colors.warning + '12',
            borderColor: colors.warning + '35',
        },
        calloutSuccess: {
            backgroundColor: colors.safe + '12',
            borderColor: colors.safe + '35',
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
        stepBadgeContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginTop: 8,
            marginBottom: 4,
        },
        stepNumBadge: {
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
        },
        stepNumText: {
            color: 'white',
            fontSize: 11,
            fontWeight: '700',
        },
        stepTitleText: {
            fontSize: 13.5,
            fontWeight: '700',
            color: colors.textPrimary,
        },
        tableRow: {
            flexDirection: 'row',
            paddingVertical: 6,
            borderBottomWidth: 1,
            borderBottomColor: colors.border + '30',
        },
        tableHeader: {
            backgroundColor: colors.surfaceHighlight + '60',
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            paddingVertical: 8,
        },
        tableCol1: {
            flex: 1.2,
            fontSize: 12,
            fontWeight: '600',
            color: colors.textPrimary,
        },
        tableCol2: {
            flex: 1,
            fontSize: 12,
            color: colors.textSecondary,
            textAlign: 'center',
        },
        tableCol3: {
            flex: 1,
            fontSize: 12,
            fontWeight: '700',
            color: colors.safe,
            textAlign: 'right',
        },
    });

    const Bullet = ({ children }: { children: React.ReactNode }) => (
        <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>{children}</Text>
        </View>
    );

    const Callout = ({
        type = 'tip',
        title,
        children,
    }: {
        type?: 'tip' | 'warning' | 'success';
        title: string;
        children: React.ReactNode;
    }) => {
        const typeStyle =
            type === 'warning'
                ? styles.calloutWarning
                : type === 'success'
                ? styles.calloutSuccess
                : styles.calloutTip;
        const color =
            type === 'warning'
                ? colors.warning
                : type === 'success'
                ? colors.safe
                : colors.accent;
        const iconName =
            type === 'warning'
                ? 'alert-circle-outline'
                : type === 'success'
                ? 'shield-checkmark-outline'
                : 'bulb-outline';

        return (
            <View style={[styles.calloutBox, typeStyle]}>
                <View style={styles.calloutHeader}>
                    <Ionicons name={iconName} size={15} color={color} />
                    <Text style={[styles.calloutTitle, { color }]}>{title}</Text>
                </View>
                <Text style={styles.calloutText}>{children}</Text>
            </View>
        );
    };

    const StepRow = ({ num, title, desc }: { num: number; title: string; desc: string }) => (
        <View style={{ marginBottom: 8, paddingLeft: 2 }}>
            <View style={styles.stepBadgeContainer}>
                <View style={styles.stepNumBadge}>
                    <Text style={styles.stepNumText}>{num}</Text>
                </View>
                <Text style={styles.stepTitleText}>{title}</Text>
            </View>
            <Text style={[styles.bulletText, { paddingLeft: 30 }]}>{desc}</Text>
        </View>
    );

    // All Help Sections
    const sections: SectionItem[] = useMemo(
        () => [
            {
                id: 'ai-pleading',
                title: 'AI Legal Paperbook Engine',
                icon: 'scale-balance',
                iconType: 'material',
                badge: 'AI Engine',
                badgeColor: colors.accent,
                keywords: [
                    'ai',
                    'pleading',
                    'paperbook',
                    'deepseek',
                    'docx',
                    'drafting',
                    'madras',
                    'high court',
                    'bail',
                    'anticipatory bail',
                    'quash',
                    'bns',
                    'bnss',
                    'cost',
                    'api',
                    'tokens',
                    'pricing',
                ],
                content: (
                    <>
                        <Text style={styles.paragraph}>
                            The AI Pleading Engine automates the synthesis and compilation of full, court-compliant
                            <Text style={styles.boldText}> 5-Document Madras High Court Paperbooks</Text> in seconds.
                        </Text>

                        <Callout type="tip" title="What gets compiled into the Paperbook?">
                            Each generated Paperbook packet includes:
                            {'\n'}1. <Text style={styles.boldText}>Index Sheet</Text> (Chronological table with S.No., Document, Date, Page No., Court Fee)
                            {'\n'}2. <Text style={styles.boldText}>Synopsis & List of Dates</Text> (Factual timeline for the Judge)
                            {'\n'}3. <Text style={styles.boldText}>Memorandum of Main Petition</Text> (Cause title, numbered facts, lettered grounds A, B, C..., mandatory HC declarations & prayer)
                            {'\n'}4. <Text style={styles.boldText}>Supporting Verification Affidavit</Text> (Sworn attestation clause at Chennai/Madurai)
                            {'\n'}5. <Text style={styles.boldText}>Vakalatnama & Back Docket</Text> (Counsel details, Bar Council No., Chamber address & Welfare stamp box)
                        </Callout>

                        <Text style={styles.subHeader}>How to Generate a Paperbook Step-by-Step</Text>
                        <StepRow
                            num={1}
                            title="Open Any Case & Tap 'Generate Court Paperbook'"
                            desc="Navigate to the case detail screen and tap the glowing 'Generate Court Paperbook' button."
                        />
                        <StepRow
                            num={2}
                            title="Select Court Tier & Pleading Type"
                            desc="Choose Principal Seat (Chennai), Madurai Bench, or District Sessions Court. Select Bail (Sec 483 BNSS), Anticipatory Bail (Sec 482 BNSS), Quash (Sec 528 BNSS), Crl. Revision, or Writ."
                        />
                        <StepRow
                            num={3}
                            title="Add Specific Grounds or Interim Relief"
                            desc="Optionally input custom defense arguments or specific prayers. If left blank, the AI synthesizes grounds from your case notes, timeline, and charges."
                        />
                        <StepRow
                            num={4}
                            title="Verify Advocate Profile"
                            desc="Ensure your Bar Council Enrolment No. (e.g. MS/1234/2020) and Chamber Address are set so they auto-populate into the Vakalatnama."
                        />
                        <StepRow
                            num={5}
                            title="Compile & Export (.docx)"
                            desc="Tap 'Compile Legal Paperbook'. In seconds, review all 5 sections in-app, copy to clipboard, or export the court-ready .docx file."
                        />

                        <Text style={styles.subHeader}>API Key Setup & Token Economics</Text>
                        <Text style={styles.paragraph}>
                            Advocat uses the ultra-efficient <Text style={styles.boldText}>DeepSeek-V3 / R1</Text> engine under a Bring-Your-Own-Key (BYOK) model.
                        </Text>

                        {/* Pricing Table */}
                        <View style={{ marginVertical: 6 }}>
                            <View style={[styles.tableRow, styles.tableHeader]}>
                                <Text style={styles.tableCol1}>USAGE VOLUME</Text>
                                <Text style={styles.tableCol2}>DRAFTS / MO</Text>
                                <Text style={styles.tableCol3}>EST. COST (INR)</Text>
                            </View>
                            <View style={styles.tableRow}>
                                <Text style={styles.tableCol1}>1 Paperbook</Text>
                                <Text style={styles.tableCol2}>1 case</Text>
                                <Text style={styles.tableCol3}>~₹0.08 (8 paise)</Text>
                            </View>
                            <View style={styles.tableRow}>
                                <Text style={styles.tableCol1}>Solo Practice</Text>
                                <Text style={styles.tableCol2}>25 cases</Text>
                                <Text style={styles.tableCol3}>~₹2.10 / mo</Text>
                            </View>
                            <View style={styles.tableRow}>
                                <Text style={styles.tableCol1}>Busy Chambers</Text>
                                <Text style={styles.tableCol2}>100 cases</Text>
                                <Text style={styles.tableCol3}>~₹8.50 / mo</Text>
                            </View>
                        </View>

                        <Text style={styles.subHeader}>DeepSeek-V3 vs. DeepSeek-R1 (Which Model to Use?)</Text>
                        <Text style={styles.paragraph}>
                            Advocat lets you switch between two specialized AI reasoning models under <Text style={styles.boldText}>Settings → AI Reasoning Model</Text>:
                        </Text>

                        <Bullet>
                            <Text style={styles.boldText}>⚡ DeepSeek-V3 (Ultra Fast & Crisp - Default):</Text>
                            {'\n'}• <Text style={styles.boldText}>Speed:</Text> 2 to 4 seconds per 5-document packet.
                            {'\n'}• <Text style={styles.boldText}>Cost:</Text> ~₹0.08 INR (less than 10 paise per case).
                            {'\n'}• <Text style={styles.boldText}>Best For:</Text> 90% of everyday legal practice—Regular Bail (Sec 483 BNSS), Anticipatory Bail (Sec 482 BNSS), Section 138 NI Act complaints, standard civil/criminal petitions, and rapid paperbook drafting.
                        </Bullet>

                        <Bullet>
                            <Text style={styles.boldText}>🧠 DeepSeek-R1 (Deep Legal Reasoning):</Text>
                            {'\n'}• <Text style={styles.boldText}>Speed:</Text> 8 to 15 seconds (evaluates step-by-step legal chain-of-thought logic before drafting).
                            {'\n'}• <Text style={styles.boldText}>Cost:</Text> ~₹0.25 to ₹0.35 INR (approx. 30 paise per case).
                            {'\n'}• <Text style={styles.boldText}>Best For:</Text> High-stakes Quashing Petitions (Sec 528 BNSS / 482 CrPC), High Court Writs (Art 226/227), Criminal Appeals & Revisions challenging trial court judgments, and complex commercial or NDPS matters with intricate factual disputes.
                        </Bullet>

                        {/* Model Comparison Matrix Table */}
                        <View style={{ marginVertical: 8 }}>
                            <View style={[styles.tableRow, styles.tableHeader]}>
                                <Text style={styles.tableCol1}>CASE / PLEADING TYPE</Text>
                                <Text style={styles.tableCol2}>RECOMMENDED MODEL</Text>
                                <Text style={styles.tableCol3}>REASON</Text>
                            </View>
                            <View style={styles.tableRow}>
                                <Text style={styles.tableCol1}>Regular Bail (Sec 480/483)</Text>
                                <Text style={[styles.tableCol2, { fontWeight: '700', color: colors.accent }]}>DeepSeek-V3 ⚡</Text>
                                <Text style={[styles.tableCol3, { color: colors.textSecondary }]}>Fast & standard statutory rules</Text>
                            </View>
                            <View style={styles.tableRow}>
                                <Text style={styles.tableCol1}>Anticipatory Bail (Sec 482)</Text>
                                <Text style={[styles.tableCol2, { fontWeight: '700', color: colors.accent }]}>DeepSeek-V3 ⚡</Text>
                                <Text style={[styles.tableCol3, { color: colors.textSecondary }]}>Quick generation & parity grounds</Text>
                            </View>
                            <View style={styles.tableRow}>
                                <Text style={styles.tableCol1}>Quash FIR / Charge Sheet</Text>
                                <Text style={[styles.tableCol2, { fontWeight: '700', color: colors.safe }]}>DeepSeek-R1 🧠</Text>
                                <Text style={[styles.tableCol3, { color: colors.textSecondary }]}>Deep non-cognizable grounds</Text>
                            </View>
                            <View style={styles.tableRow}>
                                <Text style={styles.tableCol1}>High Court Writs (Art 226)</Text>
                                <Text style={[styles.tableCol2, { fontWeight: '700', color: colors.safe }]}>DeepSeek-R1 🧠</Text>
                                <Text style={[styles.tableCol3, { color: colors.textSecondary }]}>Constitutional jurisprudence</Text>
                            </View>
                            <View style={styles.tableRow}>
                                <Text style={styles.tableCol1}>Criminal Appeal / Revision</Text>
                                <Text style={[styles.tableCol2, { fontWeight: '700', color: colors.safe }]}>DeepSeek-R1 🧠</Text>
                                <Text style={[styles.tableCol3, { color: colors.textSecondary }]}>Dissects trial court errors</Text>
                            </View>
                            <View style={styles.tableRow}>
                                <Text style={styles.tableCol1}>General Daily Drafting</Text>
                                <Text style={[styles.tableCol2, { fontWeight: '700', color: colors.accent }]}>DeepSeek-V3 ⚡</Text>
                                <Text style={[styles.tableCol3, { color: colors.textSecondary }]}>Instant, dependable & ultra-cheap</Text>
                            </View>
                        </View>

                        <Callout type="success" title="⚡ What does $2 USD (~₹170 INR) Credit Give You?">
                            A modest $2 credit on DeepSeek yields <Text style={styles.boldText}>~2,100 complete 5-document Paperbooks</Text> with DeepSeek-V3. For a typical solo advocate filing 20–30 cases/month, this easily lasts <Text style={styles.boldText}>5 to 7 years</Text>!
                        </Callout>

                        <Text style={styles.subHeader}>Offline Template Mode (₹0 Cost)</Text>
                        <Bullet>
                            If you don't enter an API key or have no internet in court, Advocat automatically switches to its <Text style={styles.boldText}>High-Fidelity Offline Legal Template Engine</Text> for 100% free compilation.
                        </Bullet>

                        <Text style={styles.subHeader}>Madras High Court Rule Compliance</Text>
                        <Bullet>
                            <Text style={styles.boldText}>Court Margins:</Text> Formatted with 1.75" Left margin (for docket stitching/binding) and 1.0" Right/Top/Bottom margins.
                        </Bullet>
                        <Bullet>
                            <Text style={styles.boldText}>Continuous Line Numbers:</Text> Every 5 lines numbered along the left margin in accordance with Madras HC Appellate Side Rules.
                        </Bullet>
                        <Bullet>
                            <Text style={styles.boldText}>Active Criminal Laws:</Text> Exclusively applies BNS 2023, BNSS 2023, and BSA 2023 with mandatory non-filing declarations.
                        </Bullet>

                        <Callout type="warning" title="🔒 100% Confidentiality & Security">
                            Your client facts, chamber details, and generated drafts are processed securely and saved exclusively on your local device. Nothing is logged or retained on third-party servers.
                        </Callout>
                    </>
                ),
            },
            {
                id: 'ecourts-sync',
                title: 'eCourts India Search & Live Sync',
                icon: 'scale-balance',
                iconType: 'material',
                badge: 'eCourts Sync',
                badgeColor: colors.safe,
                keywords: [
                    'ecourts',
                    'cnr',
                    'import',
                    'madras high court',
                    'case number',
                    'sync',
                    'nic',
                    'hearing',
                    'cause list',
                    'parties',
                    'bns',
                    'district court',
                ],
                content: (
                    <>
                        <Text style={styles.paragraph}>
                            Advocat connects seamlessly with the national eCourts judiciary system so you can search any matter across the <Text style={styles.boldText}>Madras High Court (Principal Seat & Madurai Bench)</Text> and <Text style={styles.boldText}>Tamil Nadu District Courts</Text> and import full case profiles with 1 tap.
                        </Text>

                        <Callout type="tip" title="3 Multi-Modal Import Methods">
                            • <Text style={styles.boldText}>📸 Screenshot Upload:</Text> Take a screenshot of the official eCourts mobile app, High Court site, or WhatsApp case alert → Upload to extract all fields automatically.
                            {'\n'}• <Text style={styles.boldText}>📋 Smart Quick-Paste:</Text> Copy text from the eCourts app, SMS alerts, or cause lists and tap "Paste from Clipboard" for 1-second auto-parsing.
                            {'\n'}• <Text style={styles.boldText}>🔍 16-Digit CNR & Portal:</Text> Enter your 16-character CNR (e.g. <Text style={styles.codeText}>TNHC01-001829-2026</Text>) or use the in-app link to open the official government portal.
                        </Callout>

                        <Text style={styles.subHeader}>What Gets Auto-Populated on Import?</Text>
                        <Bullet>
                            <Text style={styles.boldText}>"Who is your Client?" Selection:</Text> Choose whether your chamber represents the Petitioner/Victim or Accused/Respondent with 1-tap, or specify a specific co-accused name.
                        </Bullet>
                        <Bullet>
                            <Text style={styles.boldText}>Full Cause Title & Parties:</Text> Petitioner and Respondent names, counsel on record, and chamber addresses.
                        </Bullet>
                        <Bullet>
                            <Text style={styles.boldText}>Bench & Court Hall:</Text> Pre-assigns the Presiding Judge and Court Hall number.
                        </Bullet>
                        <Bullet>
                            <Text style={styles.boldText}>Statutory Sections:</Text> Auto-maps criminal and civil sections (BNS, BNSS, IPC, CPC) with official marginal notes.
                        </Bullet>
                        <Bullet>
                            <Text style={styles.boldText}>Next Hearing & Deadlines:</Text> Automatically creates a scheduled deadline with notification alarm for your morning cause list.
                        </Bullet>
                        <Bullet>
                            <Text style={styles.boldText}>Hearing Timeline History:</Text> Imports prior orders, notices of motion, and interim stay orders.
                        </Bullet>

                        <Callout type="success" title="⚡ 100% Free & No Subscriptions Needed">
                            Advocat connects directly to public registries and official eCourts services without requiring paid third-party API subscriptions or recurring monthly charges.
                        </Callout>
                    </>
                ),
            },
            {
                id: 'dashboard',
                title: 'Dashboard & Practice Overview',
                icon: 'home-outline',
                badge: 'Core',
                keywords: ['dashboard', 'summary', 'urgent', 'deadlines', 'analytics', 'cases', 'stats'],
                content: (
                    <>
                        <Text style={styles.paragraph}>
                            The Dashboard is your morning command center giving you immediate visibility over active matters.
                        </Text>
                        <Text style={styles.subHeader}>Summary Cards</Text>
                        <Bullet>
                            <Text style={styles.boldText}>Total Active Cases:</Text> Real-time tally of all ongoing matters.
                        </Bullet>
                        <Bullet>
                            <Text style={styles.boldText}>Active Deadlines:</Text> Count of scheduled court dates and limitation deadlines.
                        </Bullet>
                        <Bullet>
                            <Text style={styles.boldText}>Pending Documents:</Text> Attachments and paperbooks awaiting action.
                        </Bullet>

                        <Text style={styles.subHeader}>Urgent Cause List & Deadlines</Text>
                        <Bullet>
                            Matters scheduled within the next <Text style={styles.boldText}>7 days</Text> appear in the priority alert queue with direct tap-to-view navigation.
                        </Bullet>
                    </>
                ),
            },
            {
                id: 'managing-cases',
                title: 'Managing Cases & Stage Pipeline',
                icon: 'briefcase-outline',
                badge: 'Cases',
                keywords: ['cases', 'client', 'pipeline', 'stages', 'edit', 'delete', 'create', 'filter', 'sort'],
                content: (
                    <>
                        <Text style={styles.paragraph}>
                            Organize client portfolios, track stage progress, and store full court timelines.
                        </Text>
                        <Text style={styles.subHeader}>Creating & Editing</Text>
                        <Bullet>
                            Tap the <Text style={styles.boldText}>+ Button</Text> on the Cases screen to create a matter.
                        </Bullet>
                        <Bullet>
                            Specify Case Title (e.g. <Text style={styles.codeText}>Sundaram vs. State</Text>), Case Number (e.g. <Text style={styles.codeText}>Crl.O.P. 1829/2026</Text>), and Client Contact.
                        </Bullet>
                        <Bullet>
                            Set case stage: <Text style={styles.boldText}>Intake → Pleadings → Evidence → Arguments → Judgment</Text>.
                        </Bullet>

                        <Text style={styles.subHeader}>Interactive Stage Stepper</Text>
                        <Bullet>
                            In Case Detail, tap any stage chip along the top pipeline to update the case's current status instantly.
                        </Bullet>

                        <Text style={styles.subHeader}>Search, Sort & Filter</Text>
                        <Bullet>
                            Filter cases by Active, Pending, or Closed. Sort by Next Deadline, Date Created, or Alphabetical.
                        </Bullet>
                    </>
                ),
            },
            {
                id: 'legal-sections',
                title: 'Legal Sections Database (BNS / BNSS / IPC)',
                icon: 'scale-outline',
                badge: 'Statutes',
                keywords: ['sections', 'acts', 'bns', 'bnss', 'bsa', 'ipc', 'crpc', 'cpc', 'pocso', 'ndps', 'statutes'],
                content: (
                    <>
                        <Text style={styles.paragraph}>
                            Advocat includes a comprehensive offline database of over 500+ Indian & Tamil Nadu legal provisions.
                        </Text>
                        <Text style={styles.subHeader}>Adding Sections to Cases</Text>
                        <Bullet>
                            Tap <Text style={styles.boldText}>Add Section</Text> inside any case.
                        </Bullet>
                        <Bullet>
                            Select the Act (<Text style={styles.boldText}>BNS, BNSS, BSA, IPC, CrPC, CPC, POCSO, NI Act, DV Act, MV Act, NDPS</Text>).
                        </Bullet>
                        <Bullet>
                            Enter multiple sections separated by commas (e.g., <Text style={styles.codeText}>302, 354A, 420</Text>).
                        </Bullet>
                        <Bullet>
                            The app automatically auto-fills official legal descriptions (marginal notes) from its database.
                        </Bullet>

                        <Callout type="tip" title="BNS / BNSS Instant Conversion">
                            The AI Pleading engine automatically cross-references old IPC/CrPC sections and converts them to the corresponding new BNS/BNSS statutory provisions during paperbook compilation.
                        </Callout>
                    </>
                ),
            },
            {
                id: 'deadlines',
                title: 'Deadlines, Hearings & Urgency Alarms',
                icon: 'timer-outline',
                badge: 'Deadlines',
                keywords: ['deadlines', 'reminders', 'notifications', 'hearings', 'urgency', 'critical', 'dates'],
                content: (
                    <>
                        <Text style={styles.paragraph}>
                            Never miss a limitation period, bail surrender date, or court hearing.
                        </Text>
                        <Text style={styles.subHeader}>Color-Coded Urgency Tiers</Text>
                        <Bullet>
                            <Text style={[styles.boldText, { color: colors.critical }]}>CRITICAL (Red):</Text> Due within 3 days. Immediate priority.
                        </Bullet>
                        <Bullet>
                            <Text style={[styles.boldText, { color: colors.warning }]}>HIGH (Orange):</Text> Due within 7 days.
                        </Bullet>
                        <Bullet>
                            <Text style={[styles.boldText, { color: colors.accent }]}>MEDIUM (Blue):</Text> Due within 30 days.
                        </Bullet>
                        <Bullet>
                            <Text style={[styles.boldText, { color: colors.safe }]}>LOW (Green):</Text> Due in more than 30 days.
                        </Bullet>

                        <Text style={styles.subHeader}>Daily Cause List Notifications</Text>
                        <Bullet>
                            Local device notifications remind you of impending deadlines at your chosen morning hour. Configure reminder times under Settings.
                        </Bullet>
                    </>
                ),
            },
            {
                id: 'image-to-pdf',
                title: 'Image to Court-Ready PDF Converter & Scanner',
                icon: 'images-outline',
                badge: 'PDF Scanner',
                badgeColor: colors.accent,
                keywords: [
                    'image',
                    'pdf',
                    'converter',
                    'scan',
                    'scanner',
                    'gallery',
                    'camera',
                    'annexure',
                    'sort',
                    'reorder',
                    'margins',
                    'compression',
                    'save',
                    'export',
                    'court',
                    'case',
                ],
                content: (
                    <>
                        <Text style={styles.paragraph}>
                            The native <Text style={styles.boldText}>Image to PDF Converter</Text> allows advocates to rapidly compile FIR copies, typed petitions, witness statements, and trial court exhibits into court-compliant PDF documents in seconds—100% offline.
                        </Text>

                        <Callout type="tip" title="✨ Key Capabilities">
                            • <Text style={styles.boldText}>Multi-Image Selection:</Text> Select single or multiple photos directly from your device gallery or camera.
                            {'\n'}• <Text style={styles.boldText}>Visual Reordering & Sorting:</Text> Move images up or down to arrange perfect annexure sequence (Annexure A-1, A-2...).
                            {'\n'}• <Text style={styles.boldText}>Tap-to-Preview Modal:</Text> Tap any thumbnail to inspect high-resolution full-screen image before compiling.
                            {'\n'}• <Text style={styles.boldText}>Court Margin Toggle:</Text> Choose Standard Court Margins (for docket binding) or Full-Bleed 0-Margin.
                            {'\n'}• <Text style={styles.boldText}>Image Quality Optimization:</Text> Choose Original (Lossless), Balanced (Standard), or High Compression (for e-filing file size limits).
                        </Callout>

                        <Text style={styles.subHeader}>How to Convert Images to PDF Step-by-Step</Text>
                        <StepRow
                            num={1}
                            title="Launch from Homescreen or Case File"
                            desc="Tap the 'Image to PDF' shortcut button on the Dashboard or tap '+' in the Documents tab of any matter."
                        />
                        <StepRow
                            num={2}
                            title="Pick Photos from Gallery or Camera"
                            desc="Tap '+ Pick Images from Gallery' or '+ Capture with Camera' to select evidence photographs and scanned pages."
                        />
                        <StepRow
                            num={3}
                            title="Arrange & Inspect Sequence"
                            desc="Use 'Move Up' / 'Move Down' arrows to arrange pages chronologically. Tap any picture to open the high-resolution zoomable preview modal."
                        />
                        <StepRow
                            num={4}
                            title="Configure PDF Document Settings"
                            desc="Enter your document title (e.g. 'FIR_Annexure_Bundle_Case_1829.pdf'), select Page Margins, and pick compression quality."
                        />
                        <StepRow
                            num={5}
                            title="Generate & Save"
                            desc="Tap 'Generate Court-Ready PDF'. Once compiled, tap 'Save to Gallery / Downloads' or 'Attach to Case File' to link it directly to your client folder."
                        />

                        <Callout type="success" title="🔒 100% Offline & Zero Server Processing">
                            All PDF compilation is performed using native on-device rendering. Your confidential evidence images never leave your smartphone.
                        </Callout>
                    </>
                ),
            },
            {
                id: 'ai-research',
                title: 'AI Legal Research & Case Precedent Studio',
                icon: 'library-outline',
                badge: 'Legal AI',
                badgeColor: colors.safe,
                keywords: [
                    'research',
                    'precedents',
                    'judgments',
                    'supreme court',
                    'high court',
                    'bns',
                    'bnss',
                    'bsa',
                    'ipc',
                    'crpc',
                    'citations',
                    'notes',
                    'legal search',
                ],
                content: (
                    <>
                        <Text style={styles.paragraph}>
                            The AI Legal Research Studio provides instantaneous judicial reasoning, landmark citations, and statutory cross-mappings between old colonial codes (IPC, CrPC, IEA) and modern criminal statutes (<Text style={styles.boldText}>BNS 2023, BNSS 2023, BSA 2023</Text>).
                        </Text>

                        <Text style={styles.subHeader}>What You Can Ask the AI Research Engine</Text>
                        <Bullet>
                            <Text style={styles.boldText}>Statutory Mapping:</Text> E.g. "What is the equivalent of Section 302 IPC / 438 CrPC under BNS/BNSS?"
                        </Bullet>
                        <Bullet>
                            <Text style={styles.boldText}>Landmark High Court Ratios:</Text> E.g. "Latest Madras High Court precedents on Anticipatory Bail parity in financial fraud matters."
                        </Bullet>
                        <Bullet>
                            <Text style={styles.boldText}>Drafting Arguments:</Text> E.g. "Draft 5 maintainability grounds to quash Section 138 NI Act complaint against non-signatory director."
                        </Bullet>

                        <Text style={styles.subHeader}>Saving Research Directly to Case Files</Text>
                        <Bullet>
                            Every generated research summary features a <Text style={styles.boldText}>"Pin to Case File"</Text> action. Select any active case from the dropdown to permanently store citations and arguments inside that matter's Research Binders.
                        </Bullet>
                    </>
                ),
            },
            {
                id: 'deepseek-telemetry',
                title: 'DeepSeek AI Telemetry & Indian Rupee (INR ₹) Meter',
                icon: 'hardware-chip-outline',
                badge: 'AI Telemetry',
                badgeColor: '#D4AF37',
                keywords: [
                    'deepseek',
                    'api key',
                    'inr',
                    'rupees',
                    'currency',
                    'balance',
                    'cost',
                    'tokens',
                    'prompt',
                    'completion',
                    'sync',
                    'telemetry',
                ],
                content: (
                    <>
                        <Text style={styles.paragraph}>
                            Advocat features a transparent, real-time <Text style={styles.boldText}>AI Telemetry & Credit Meter</Text> configured natively in Indian Rupees (<Text style={styles.boldText}>INR - ₹</Text>).
                        </Text>

                        <Callout type="tip" title="📊 Live Telemetry Capabilities">
                            • <Text style={styles.boldText}>Live Account Balance:</Text> When you tap 'Sync', Advocat connects directly via encrypted HTTPS to DeepSeek's official balance server and fetches your exact remaining credit.
                            {'\n'}• <Text style={styles.boldText}>Indian Rupee Conversion:</Text> Automatically converts USD ($) balance to Indian Rupees (₹) at standard benchmark rates (e.g. $1.95 USD = ₹170.63 INR).
                            {'\n'}• <Text style={styles.boldText}>Exact Token Ledger:</Text> Tracks exact prompt (input) and completion (output) tokens with every legal pleading or research query.
                            {'\n'}• <Text style={styles.boldText}>Compute Spend:</Text> Computes your lifetime practice AI spend down to single paise.
                        </Callout>

                        <Text style={styles.subHeader}>How to Configure Your DeepSeek API Key</Text>
                        <StepRow
                            num={1}
                            title="Get Your DeepSeek API Key"
                            desc="Visit platform.deepseek.com on your computer/phone and generate an API key (starts with 'sk-...')."
                        />
                        <StepRow
                            num={2}
                            title="Save Key in Settings"
                            desc="Navigate to Settings → DeepSeek AI Configuration, paste your API key, and tap 'Save API Key'."
                        />
                        <StepRow
                            num={3}
                            title="Test Connection & Sync"
                            desc="Tap 'Test Connection' to verify end-to-end latency. Your live balance in INR (₹) will immediately populate in Settings and Analytics."
                        />
                    </>
                ),
            },
            {
                id: 'practice-analytics',
                title: 'Chamber Practice Intelligence & Analytics',
                icon: 'stats-chart-outline',
                badge: 'Analytics',
                badgeColor: colors.accent,
                keywords: [
                    'analytics',
                    'chamber score',
                    'rating',
                    'disposal',
                    'duration',
                    'punctuality',
                    'intake',
                    'velocity',
                    'cause list',
                ],
                content: (
                    <>
                        <Text style={styles.paragraph}>
                            The Practice Intelligence tab provides macro analytics to monitor chamber efficiency, litigation velocity, and disposal ratios.
                        </Text>

                        <Text style={styles.subHeader}>Key Practice Metrics</Text>
                        <Bullet>
                            <Text style={styles.boldText}>Chamber Rating (0–100):</Text> Composite health index calculated from on-time hearing punctuality, active matter disposal, and deadline compliance.
                        </Bullet>
                        <Bullet>
                            <Text style={styles.boldText}>Disposal Efficiency:</Text> Percentage of instituted matters successfully concluded, settled, or won.
                        </Bullet>
                        <Bullet>
                            <Text style={styles.boldText}>Average Case Lifecycle:</Text> Mean duration (in days) from initial case intake to final disposal.
                        </Bullet>
                        <Bullet>
                            <Text style={styles.boldText}>Intake Velocity Curve:</Text> Line chart tracking month-over-month new matters instituted in your chamber over the last 6 months.
                        </Bullet>
                    </>
                ),
            },
            {
                id: 'documents',
                title: 'Document Vault & Evidence Management',
                icon: 'document-text-outline',
                badge: 'Docs',
                keywords: ['documents', 'files', 'pdf', 'docx', 'storage', 'vault', 'evidence', 'attachments'],
                content: (
                    <>
                        <Text style={styles.paragraph}>
                            Securely link FIR copies, charge sheets, impugned orders, and generated DOCX paperbooks to matters.
                        </Text>
                        <Text style={styles.subHeader}>Supported Formats & Storage</Text>
                        <Bullet>
                            Supports <Text style={styles.boldText}>PDF, DOCX, Images (JPG/PNG), and Plain Text</Text>.
                        </Bullet>
                        <Bullet>
                            All files are copied to the app's sandboxed local filesystem.
                        </Bullet>
                        <Bullet>
                            1-Tap viewing or sharing via Android Share Sheet (Google Drive, Gmail, WhatsApp).
                        </Bullet>
                    </>
                ),
            },
            {
                id: 'research',
                title: 'Research & Case Precedent Notes',
                icon: 'library-outline',
                badge: 'Research',
                keywords: ['research', 'notes', 'citations', 'precedents', 'judgments', 'case law'],
                content: (
                    <>
                        <Text style={styles.paragraph}>
                            Maintain a personal repository of case law citations, judicial ratios, and drafting notes.
                        </Text>
                        <Bullet>
                            Create tagged entries with case citations (e.g. <Text style={styles.codeText}>(2024) 4 SCC 120</Text>).
                        </Bullet>
                        <Bullet>
                            Instant search across all saved research notes by statute, bench, or keyword.
                        </Bullet>
                    </>
                ),
            },
            {
                id: 'backup',
                title: 'Data Backup, Export & Restoral',
                icon: 'cloud-download-outline',
                badge: 'Backup',
                keywords: ['backup', 'export', 'import', 'restore', 'json', 'data', 'transfer'],
                content: (
                    <>
                        <Text style={styles.paragraph}>
                            Keep complete control of your practice data with full JSON archive exports.
                        </Text>
                        <Text style={styles.subHeader}>Creating a Backup</Text>
                        <Bullet>
                            Go to <Text style={styles.boldText}>Settings → Data Management → Export Data</Text>.
                        </Bullet>
                        <Bullet>
                            Save the exported backup file to your Google Drive, email, or external drive.
                        </Bullet>

                        <Text style={styles.subHeader}>Restoring on a New Device</Text>
                        <Bullet>
                            Install Advocat, go to <Text style={styles.boldText}>Settings → Import Backup</Text>, and select your JSON backup file to restore all cases, documents, notes, and deadlines.
                        </Bullet>
                    </>
                ),
            },
            {
                id: 'settings',
                title: 'Settings & Advocate Profile',
                icon: 'cog-outline',
                badge: 'Settings',
                keywords: ['settings', 'profile', 'bar', 'enrolment', 'chamber', 'theme', 'dark mode', 'notifications'],
                content: (
                    <>
                        <Text style={styles.paragraph}>
                            Personalize chamber information for automated court filings.
                        </Text>
                        <Bullet>
                            <Text style={styles.boldText}>Advocate Profile:</Text> Set your Name, Bar Council Enrolment Number (e.g. MS/1234/2018), Chamber Address, and Contact numbers.
                        </Bullet>
                        <Bullet>
                            <Text style={styles.boldText}>DeepSeek API Key:</Text> Securely store your API key for instant paperbook generation.
                        </Bullet>
                        <Bullet>
                            <Text style={styles.boldText}>Visual Theme:</Text> Toggle Dark Mode or Light Mode with high-contrast legal styling.
                        </Bullet>
                    </>
                ),
            },
        ],
        [colors]
    );

    // Filter sections based on search
    const filteredSections = useMemo(() => {
        if (!searchQuery.trim()) return sections;
        const q = searchQuery.toLowerCase().trim();
        return sections.filter(
            s =>
                s.title.toLowerCase().includes(q) ||
                s.badge.toLowerCase().includes(q) ||
                s.keywords.some(k => k.toLowerCase().includes(q))
        );
    }, [sections, searchQuery]);

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
                    <Text style={styles.headerTitle}>User Guide & Docs</Text>
                    <Text style={styles.headerSubtitle}>Advocat Legal Practice & AI Engine Manual</Text>
                </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search-outline" size={18} color={colors.textTertiary} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search topics (e.g. AI Pleading, BNS, Cost, Margins)..."
                        placeholderTextColor={colors.textTertiary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        clearButtonMode="while-editing"
                        autoCapitalize="none"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Quick Actions & Count */}
            <View style={styles.controlsBar}>
                <Text style={styles.resultsCount}>
                    {filteredSections.length} {filteredSections.length === 1 ? 'topic' : 'topics'} available
                </Text>
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

            {/* Accordion Sections List */}
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {filteredSections.map(section => {
                    const isExpanded = !!expandedIds[section.id];
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

                {filteredSections.length === 0 && (
                    <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                        <Ionicons name="search-outline" size={48} color={colors.textTertiary} />
                        <Text style={[styles.paragraph, { marginTop: 12, textAlign: 'center' }]}>
                            No topics matched "{searchQuery}"
                        </Text>
                        <TouchableOpacity
                            onPress={() => setSearchQuery('')}
                            style={[styles.toggleButton, { marginTop: 8 }]}
                        >
                            <Text style={styles.toggleButtonText}>Clear Search</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};
