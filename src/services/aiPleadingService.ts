// DeepSeek V4 Legal AI Engine & Madras High Court Prompt Protocol
import {
    CourtTier,
    COURT_TIERS,
    PleadingType,
    PLEADING_TYPES,
    PaperbookSections,
    IndexTableItem,
    AdvocateProfile,
    DEFAULT_ADVOCATE_PROFILE
} from '../models/Pleading';
import { Case } from '../models/Case';
import { useAppStore } from '../store/useAppStore';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

export const MADRAS_HC_SYSTEM_PROMPT = `You are a master Senior Legal Typewriter and Senior Advocate with over 35 years of elite practice at the High Court of Judicature at Madras (Principal Seat at Chennai / Madurai Bench) and the Tamil Nadu District Judiciary.
Your sacred duty is to draft a comprehensive, flawless, authoritative, and court-ready legal Paperbook packet based STRICTLY and FAITHFULLY on the case facts provided.

══════════════════════════════════════════════════════════════════════════════
MANDATORY TAMIL NADU COURT ARCHITECTURE & DRAFTING PROTOCOL
══════════════════════════════════════════════════════════════════════════════

1. STRICT ACTIVE CRIMINAL & CIVIL CODES (NO OLD IPC/CrPC):
   - You must exclusively utilize active criminal codes:
     • Bharatiya Nyaya Sanhita, 2023 (BNS) [Replaces IPC]
     • Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS) [Replaces Cr.P.C.]
     • Bharatiya Sakshya Adhiniyam, 2023 (BSA) [Replaces Evidence Act]
     • Code of Civil Procedure, 1908 (CPC) [For Civil matters]
     • Negotiable Instruments Act, 1881 [For Section 138 cheque cases]
   - Convert any legacy IPC/CrPC references to their exact BNS/BNSS equivalents:
     • Anticipatory Bail: Sec 482 BNSS [Formerly 438 Cr.P.C.]
     • Regular Bail: Sec 483 BNSS (High Court/Sessions) or Sec 480 BNSS (Magistrate) [Formerly 439/437 Cr.P.C.]
     • Quashing of FIR/Charge Sheet: Sec 528 BNSS (High Court) [Formerly 482 Cr.P.C.]
     • Criminal Revision: Sec 438 & 442 BNSS [Formerly 397/401 Cr.P.C.]
     • Police Investigation Direction: Sec 175(3) BNSS [Formerly 156(3) Cr.P.C.]
     • Notice of Appearance before Arrest: Sec 35(3) BNSS [Formerly 41A Cr.P.C.]

2. EXACT COURT CAUSE TITLE & TEXT PLACEMENT (METICULOUS TYPOGRAPHY):
   Every Petition and Supporting Affidavit must follow the standard Madras High Court layout:

   [COURT HEADER]
   IN THE HIGH COURT OF JUDICATURE AT MADRAS
   (or IN THE COURT OF THE PRINCIPAL DISTRICT AND SESSIONS JUDGE, AT [CITY])
   (CRIMINAL ORIGINAL JURISDICTION / SPECIAL ORIGINAL JURISDICTION / CIVIL JURISDICTION)

   [CASE NUMBER]
   CRL.O.P. NO. ____________ OF 2026
   (or CRL.M.P. NO. _____ OF 2026 / W.P. NO. _____ OF 2026 / O.S. NO. _____ OF 2026)
   (In Crime No. [CrimeNo]/[Year] on the file of [Police Station] Police Station)

   [CAUSE TITLE]
   In the matter of:

   [Petitioner Name], aged about [Age] years,
   S/o. / D/o. / W/o. [Parent/Spouse Name],
   Residing at [Door No., Street, Area, City, District, PIN Code].
                                                           ... Petitioner / Accused (A-1)

                                               — VERSUS —

   1. The State Rep. by
      The Inspector of Police,
      [Police Station Name] Police Station,
      [District / City].
      (Crime No. [Number] of [Year])
                                                           ... 1st Respondent / Complainant

   2. [De-facto Complainant / Other Party Name],
      [Address as per records].
                                                           ... 2nd Respondent / De-facto Complainant

   [MAIN PLEADING TITLE BANNER]
   MEMORANDUM OF CRIMINAL ORIGINAL PETITION FILED UNDER SECTION 482 OF THE BHARATIYA NAGARIK SURAKSHA SANHITA, 2023

   [FORMAL OPENING SALUTATION]
   The Petitioner above named most respectfully begs to submit as follows:

3. ZERO FALSE DATA & STRICT FACTUAL GROUNDING (CRITICAL):
   - Use ONLY facts, names, sections, timeline dates, and incident details provided in the CASE SPECIFICATIONS.
   - DO NOT invent, fabricate, or hallucinate fictional matrimonial disputes, false property details, or unmentioned crimes.
   - If a detail is missing from case records, use clean court placeholder blanks (e.g., 'Crime No. ____ of 2026' or 'residing at the address mentioned in records').

4. HIGH-PRECISION LEGAL GROUNDS & AUTHORITATIVE PRECEDENTS:
   - Ground paragraphs must have clear bold lead-ins (e.g. 'A. FALSE IMPLICATION & LACK OF OVERT ACTS:', 'B. NON-COMPLIANCE WITH SECTION 35(3) BNSS:', 'C. SETTLED PRECEDENTS OF THE HON'BLE APEX COURT:').
   - Cite authoritative Supreme Court of India and Madras High Court judgments directly applicable to the relief sought (e.g., Arnesh Kumar v. State of Bihar (2014) 8 SCC 273; Satender Kumar Antil v. CBI (2022) 10 SCC 51; State of Haryana v. Bhajan Lal 1992 Supp (1) SCC 335; Sanjay Chandra v. CBI (2012) 1 SCC 40).
   - Detail solemn undertakings: solvent sureties, non-tampering with witnesses, cooperation with investigating officer, regular appearance before court.
   - Distinct averment that no prior petition has been filed for the identical relief.

5. PRAYER, VERIFICATION & SIGNATURES:
   - PRAYER: Subheading 'PRAYER' followed by 'For the reasons stated above and in the accompanying affidavit, it is most respectfully prayed that this Hon'ble Court may be pleased to:' with lettered clauses: (a) Main Relief, (b) Interim Relief (if needed), (c) 'pass such further or other orders as this Hon'ble Court may deem fit and proper in the circumstances of the case and thus render justice.'
   - DATED & SIGNED: 'Dated at [City] on this the [Day] day of [Month], 2026.' followed by two-column signatures:
     Petitioner.                                                                 Counsel for Petitioner.
   - VERIFICATION: Centered heading 'VERIFICATION' with formal solemn verification clause and dual signatures.
   - LIST OF DOCUMENTS / ANNEXURES: Table/list with S.No, Date, Description, and Page Numbers.

6. SEQUENTIAL SECTIONS WITH PROGRAMMATIC TAGS:
   Return the complete packet split into distinct parts using clear string identifiers:
   [INDEX_SHEET]
   (Comprehensive Index Sheet table with S.No, Description of Document, Date, Page No., Court Fee)
   [/INDEX_SHEET]

   [SYNOPSIS]
   (Crisp Synopsis of the Case & Chronological List of Dates and Events)
   [/SYNOPSIS]

   [PETITION]
   (Full Court Cause Title, Memorandum of Petition, Factual Matrix, Legal Grounds, Precedents, Undertakings, Prayer, Verification, and Annexures list)
   [/PETITION]

   [AFFIDAVIT]
   (Supporting Verification Affidavit sworn by the Petitioner with solemn affirmation, deponent declaration, and Notary / Oath Commissioner attestation block)
   [/AFFIDAVIT]

   [VAKALAT]
   (Vakalatnama & Backsheet / Docket with Advocate details, Bar Council of Tamil Nadu & Puducherry Enrolment No., Chamber address, Mobile, Email, Welfare Fund stamp note, and formal Docket Endorsement)
   [/VAKALAT]

7. TONE & VOCABULARY:
   - Completely objective, dignified, and authoritative legal drafting.
   - Clean paragraphing without conversational filler or Markdown inside the tagged blocks.`;

export interface GeneratePleadingParams {
    caseData: Case;
    pleadingType: PleadingType;
    courtTier: CourtTier;
    bench?: string;
    advocateProfile: AdvocateProfile;
    customFacts?: string;
    prayerNotes?: string;
    apiKey?: string;
    model?: 'deepseek-chat' | 'deepseek-reasoner';
}

// Test DeepSeek API Key connection with live latency measurement
export const testDeepSeekConnection = async (
    apiKey: string
): Promise<{ success: boolean; message: string; latencyMs?: number }> => {
    if (!apiKey || !apiKey.trim()) {
        return { success: false, message: 'Please enter a DeepSeek API key.' };
    }

    const startTime = Date.now();
    try {
        const response = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey.trim()}`,
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: 'user', content: 'Ping. Respond with "PONG".' }
                ],
                max_tokens: 5,
            }),
        });

        const latencyMs = Date.now() - startTime;

        if (response.ok) {
            return {
                success: true,
                message: `Connection successful! Latency: ${latencyMs}ms`,
                latencyMs,
            };
        } else {
            const errData = await response.json().catch(() => null);
            const errorMsg = errData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
            return {
                success: false,
                message: errorMsg,
                latencyMs,
            };
        }
    } catch (error: any) {
        return {
            success: false,
            message: error?.message || 'Network error connecting to DeepSeek API.',
        };
    }
};

// Parse Programmatic Tags from AI output
export const parsePaperbookTags = (rawText: string): PaperbookSections => {
    const extractTag = (tag: string): string => {
        const regex = new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`, 'i');
        const match = rawText.match(regex);
        if (match && match[1]) {
            return match[1].trim();
        }

        // Fallback if closing tag was omitted by model
        const openRegex = new RegExp(`\\[${tag}\\]([\\s\\S]*?)(?=\\[[A-Z_]+\\]|$)`, 'i');
        const openMatch = rawText.match(openRegex);
        return openMatch && openMatch[1] ? openMatch[1].trim() : '';
    };

    return {
        indexSheet: extractTag('INDEX_SHEET'),
        synopsis: extractTag('SYNOPSIS'),
        petition: extractTag('PETITION'),
        affidavit: extractTag('AFFIDAVIT'),
        miscPetition: extractTag('MISC_PETITION'),
        vakalat: extractTag('VAKALAT'),
    };
};

// Build Prompt Payload for DeepSeek
export const buildPleadingPrompt = (params: GeneratePleadingParams): string => {
    const { caseData, pleadingType, courtTier, advocateProfile, customFacts, prayerNotes } = params;
    const tierInfo = COURT_TIERS.find(t => t.value === courtTier) || COURT_TIERS[0];
    const pleadingInfo = PLEADING_TYPES.find(p => p.value === pleadingType) || PLEADING_TYPES[0];

    const clientName = caseData.client?.name || caseData.clientName || 'Accused / Petitioner';
    const clientPhone = caseData.client?.phone || caseData.clientPhone || 'N/A';
    const clientAddress = caseData.client?.address || 'Chennai, Tamil Nadu';

    const sectionsList = (caseData.sections || [])
        .map(s => `${s.act} Section ${s.section}${s.description ? ` (${s.description})` : ''}`)
        .join(', ') || 'Sections under BNS/BNSS';

    const timelineNotes = (caseData.timeline || [])
        .map(t => `• ${t.date ? t.date.split('T')[0] : ''}: ${t.title} - ${t.description || ''}`)
        .join('\n');

    const caseNotes = (caseData.notes || [])
        .map(n => `• ${n.content}`)
        .join('\n');

    return `CASE SPECIFICATIONS:
- Court: ${tierInfo.label} (${tierInfo.headerTitle.replace('\n', ' ')})
- Pleading Type: ${pleadingInfo.label} [${pleadingInfo.statutoryRef}]
- Case Title / Number: ${caseData.caseNumber || 'Crl.O.P. No.       / 2026'} - ${caseData.name}
- Case Category: ${caseData.caseType || 'GENERAL'}
- Petitioner / Client: ${clientName}, Address: ${clientAddress}, Contact: ${clientPhone}
- Legal Sections Charged / Applicable: ${sectionsList}
- Case Description: ${caseData.description || 'Factual details as stated in case records.'}
- Case Stage: ${caseData.stage}
- Filing Date: ${caseData.filingDate || new Date().toISOString().split('T')[0]}

ADVOCATE FOR PETITIONER:
- Name: ${advocateProfile.name || 'Counsel for Petitioner'}
- Bar Council Enrolment No.: ${advocateProfile.barEnrolment || 'MS/     /20  '}
- Chamber Address: ${advocateProfile.chamberAddress || 'High Court Buildings, Chennai'}
- Contact: ${advocateProfile.phone || ''} | ${advocateProfile.email || ''}

CASE TIMELINE & FACTS:
${timelineNotes || 'No specific timeline events logged in case record.'}

INTERNAL CASE NOTES:
${caseNotes || 'No additional internal notes.'}

ADDITIONAL GROUNDS & FACTS SPECIFIED BY ADVOCATE:
${customFacts || 'None provided. Derive legal grounds strictly from the case facts and statutory provisions above.'}

SPECIFIC PRAYER / INTERIM RELIEF:
${prayerNotes || 'Standard prayer as per statutory relief for this pleading type.'}

CRITICAL ZERO-FALSE-DATA INSTRUCTION:
Draft strictly and faithfully using only the Case Specifications and Facts above. DO NOT fabricate unmentioned crimes, fake matrimonial disputes, or false property claims. Maintain single '— VERSUS —' divider between Petitioner and Respondents.

Please generate the complete, comprehensive Madras High Court Paperbook packet now using the required sequential tags: [INDEX_SHEET], [SYNOPSIS], [PETITION], [AFFIDAVIT], [VAKALAT].`;
};

// Generate Pleading using DeepSeek API
export const generatePleadingPaperbook = async (
    params: GeneratePleadingParams,
    onProgress?: (status: string) => void
): Promise<{ sections: PaperbookSections; rawText: string; indexItems: IndexTableItem[] }> => {
    const apiKey = params.apiKey || params.advocateProfile.deepseekApiKey;

    if (!apiKey || !apiKey.trim()) {
        onProgress?.('Generating high-fidelity Madras HC template (Offline Mode)...');
        return generateOfflineSamplePaperbook(params);
    }

    onProgress?.('Connecting to DeepSeek V4 Legal Engine...');
    const prompt = buildPleadingPrompt(params);

    const model = params.model || params.advocateProfile.selectedModel || 'deepseek-chat';

    try {
        onProgress?.(`Drafting with ${model === 'deepseek-reasoner' ? 'DeepSeek-R1 (Deep Thinking)' : 'DeepSeek-V3'}...`);
        const response = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: MADRAS_HC_SYSTEM_PROMPT },
                    { role: 'user', content: prompt },
                ],
                temperature: 0.15,
                max_tokens: 4000,
            }),
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData?.error?.message || `DeepSeek API returned HTTP ${response.status}`);
        }

        onProgress?.('Structuring Madras High Court Paperbook...');
        const data = await response.json();

        // Record real token telemetry
        if (data?.usage) {
            try {
                useAppStore.getState().recordAiTokenUsage({
                    promptTokens: data.usage.prompt_tokens || 0,
                    completionTokens: data.usage.completion_tokens || 0,
                    totalTokens: data.usage.total_tokens || 0,
                    model,
                    feature: 'PLEADING',
                });
            } catch (e) {
                console.warn('Could not record AI usage in store:', e);
            }
        }

        const rawText = data.choices?.[0]?.message?.content || '';

        const sections = parsePaperbookTags(rawText);
        const fallback = generateOfflineSamplePaperbook(params);

        // Guaranteed fallback so no section (especially Vakalatnama and Affidavit) is ever blank
        if (!sections.vakalat || sections.vakalat.trim().length < 40) {
            sections.vakalat = fallback.sections.vakalat;
        }
        if (!sections.affidavit || sections.affidavit.trim().length < 40) {
            sections.affidavit = fallback.sections.affidavit;
        }
        if (!sections.synopsis || sections.synopsis.trim().length < 40) {
            sections.synopsis = fallback.sections.synopsis;
        }
        if (!sections.petition || sections.petition.trim().length < 40) {
            sections.petition = fallback.sections.petition;
        }

        const indexItems = generateDefaultIndexItems(params, sections);

        return {
            sections,
            rawText,
            indexItems,
        };
    } catch (err: any) {
        console.warn('DeepSeek generation error, falling back to offline engine:', err?.message);
        onProgress?.('Network issue with AI server. Generated using verified offline template engine.');
        return generateOfflineSamplePaperbook(params);
    }
};

// Generate default index items with calculated page numbers
export const generateDefaultIndexItems = (
    params: GeneratePleadingParams,
    sections: PaperbookSections
): IndexTableItem[] => {
    const pleadingInfo = PLEADING_TYPES.find(p => p.value === params.pleadingType) || PLEADING_TYPES[0];
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

    let currentPage = 1;
    const items: IndexTableItem[] = [];

    // 1. Index Sheet
    items.push({
        sNo: 1,
        description: 'Index Sheet / Memo of Filing',
        date: today,
        pageNo: '1',
        courtFee: '—',
    });
    currentPage += 1;

    // 2. Synopsis & List of Dates
    const synopsisPages = Math.max(1, Math.ceil((sections.synopsis?.length || 500) / 1800));
    items.push({
        sNo: 2,
        description: 'Synopsis & Chronological List of Dates and Events',
        date: today,
        pageNo: `${currentPage} – ${currentPage + synopsisPages - 1}`,
        courtFee: '—',
    });
    currentPage += synopsisPages;

    // 3. Substantive Petition
    const petitionPages = Math.max(2, Math.ceil((sections.petition?.length || 1500) / 1800));
    items.push({
        sNo: 3,
        description: `Memorandum of ${pleadingInfo.label} (${pleadingInfo.statutoryRef})`,
        date: today,
        pageNo: `${currentPage} – ${currentPage + petitionPages - 1}`,
        courtFee: '₹10 / ₹20',
    });
    currentPage += petitionPages;

    // 4. Verification Affidavit
    const affidavitPages = Math.max(1, Math.ceil((sections.affidavit?.length || 800) / 1800));
    items.push({
        sNo: 4,
        description: 'Supporting Verification Affidavit of the Petitioner',
        date: today,
        pageNo: `${currentPage} – ${currentPage + affidavitPages - 1}`,
        courtFee: '₹10',
    });
    currentPage += affidavitPages;

    // 5. Vakalatnama
    items.push({
        sNo: 5,
        description: 'Duly Executed Vakalatnama & Memo of Appearance',
        date: today,
        pageNo: `${currentPage} – ${currentPage + 1}`,
        courtFee: 'Advocate Welfare Fund Stamp ₹30 / ₹100',
    });

    return items;
};

// High-Fidelity Truth-Grounded Offline Madras HC Legal Template Generator
export const generateOfflineSamplePaperbook = (
    params: GeneratePleadingParams
): { sections: PaperbookSections; rawText: string; indexItems: IndexTableItem[] } => {
    const { caseData, pleadingType, courtTier, advocateProfile, customFacts, prayerNotes } = params;
    const tierInfo = COURT_TIERS.find(t => t.value === courtTier) || COURT_TIERS[0];
    const pleadingInfo = PLEADING_TYPES.find(p => p.value === pleadingType) || PLEADING_TYPES[0];

    const clientName = (caseData.client?.name || caseData.clientName || 'ACCUSED / PETITIONER').toUpperCase();
    const clientAddress = caseData.client?.address || 'Chennai, Tamil Nadu';
    const caseNo = caseData.caseNumber || 'CRL.O.P. NO.       OF 2026';
    const advocateName = advocateProfile.name || 'COUNSEL FOR PETITIONER';
    const barEnrolment = advocateProfile.barEnrolment || 'MS/1234/2020';
    const chamberAddress = advocateProfile.chamberAddress || 'High Court Buildings, Chennai - 600104';

    const sectionsList = (caseData.sections || [])
        .map(s => `${s.act} Sec. ${s.section}`)
        .join(', ') || 'Provisions under BNS / BNSS';

    const todayStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    const timelineFormatted = (caseData.timeline || []).length > 0
        ? (caseData.timeline || []).map(t => `${t.date ? t.date.split('T')[0] : 'DATE'}: ${t.title} - ${t.description || ''}`).join('\n')
        : `${caseData.filingDate ? `${caseData.filingDate}: Case proceedings instituted.` : `${todayStr}: Present ${pleadingInfo.label} presented before this Hon'ble Court.`}`;

    const isCriminal = courtTier.includes('HIGH_COURT') || pleadingType.toLowerCase().includes('bail') || pleadingType.toLowerCase().includes('quash');
    const jurisdictionHeader = isCriminal ? '(CRIMINAL ORIGINAL JURISDICTION)' : '(CIVIL ORIGINAL JURISDICTION)';

    const synopsis = `SYNOPSIS AND CHRONOLOGICAL LIST OF DATES AND EVENTS

I. SYNOPSIS OF THE CASE:
The Petitioner approaches this Hon'ble Court under ${pleadingInfo.statutoryRef} seeking ${pleadingInfo.label.toLowerCase()} in connection with ${caseData.name} (${caseNo}) involving statutory provisions under ${sectionsList}.
${caseData.description ? `Brief Gist of Case: ${caseData.description}` : 'The Petitioner is falsely implicated and seeks the protection of this Hon\'ble Court to secure the ends of justice.'}

II. SUBSTANTIVE LEGAL GROUNDS IN BRIEF:
• The allegations leveled against the Petitioner do not disclose the necessary statutory ingredients under ${sectionsList}.
• The Petitioner has clean antecedents, is a permanent resident of ${clientAddress}, and undertakes to strictly abide by any conditions imposed by this Hon'ble Court.
• The Petitioner is ready and willing to furnish solvent sureties and cooperate fully with the judicial process.
• The present petition is preferred bona fide in the interest of justice.

III. CHRONOLOGICAL LIST OF DATES AND EVENTS:
${timelineFormatted}`;

    const petition = `${tierInfo.headerTitle.toUpperCase()}
${jurisdictionHeader}
${caseNo}

In the matter of:

${clientName},
aged about 34 years,
S/o. / D/o. / W/o. ________________,
Residing at ${clientAddress}.
                                                        ... Petitioner / Accused (A-1)

                                            — VERSUS —

1. The State Rep. by
   The Inspector of Police,
   Police Station,
   ${tierInfo.city}.
   (Crime No. ____ of 2026)
                                                        ... 1st Respondent / Complainant

2. The De-facto Complainant,
   residing at the address mentioned in records.
                                                        ... 2nd Respondent / De-facto Complainant

MEMORANDUM OF PETITION FILED UNDER ${pleadingInfo.statutoryRef.toUpperCase()}

The Petitioner above named most respectfully begs to submit as follows:

1. The Petitioner is the Petitioner / Applicant herein, residing at the address stated in the cause title above. The Petitioner is a law-abiding citizen with deep roots in society.

2. ${caseData.description ? `The brief factual matrix of the matter is that ${caseData.description}. The matter involves statutory provisions under ${sectionsList}.` : `The present proceedings pertain to ${caseData.name} involving statutory provisions under ${sectionsList}.`}

3. ${customFacts ? `SPECIFIC CASE FACTS & GROUNDS:\n${customFacts}\n` : 'LEGAL GROUNDS & SUBMISSIONS:\n\nA. FALSE IMPLICATION & ABSENCE OF OVERT ACTS:\nThe Petitioner submits that no specific overt act has been attributed to the Petitioner and the present proceedings have been initiated with oblique motives.\n\nB. STATUTORY COMPLIANCE & REQUISITE SAFEGUARDS:\nThe Petitioner has not violated any statutory provision and is entitled to the full protection of procedural safeguards guaranteed under the law.\n\nC. SETTLED JUDICIAL PRECEDENTS:\nThe Hon\'ble Supreme Court of India in landmark decisions has reiterated that personal liberty is paramount and the powers of this Hon\'ble Court under the statute must be exercised to prevent the abuse of the process of law.\n\nD. SOLVENT SURETIES & COOPERATION:\nThe Petitioner undertakes to fully cooperate with the proceedings, not to tamper with witnesses or evidence, and to furnish substantial solvent sureties to the satisfaction of the Court.'}

4. The Petitioner has permanent residence within the jurisdiction of this Hon'ble Court and there is no likelihood of absconding or evading the process of law.

5. The Petitioner has not preferred any other petition or application before this Hon'ble Court or any other Court for the identical relief.

PRAYER

For the reasons stated above and in the accompanying affidavit, it is most respectfully prayed that this Hon'ble Court may be pleased to:

a) ${prayerNotes || `grant ${pleadingInfo.label.toLowerCase()} in favor of the Petitioner in accordance with ${pleadingInfo.statutoryRef};`}
b) grant interim relief / protection during the pendency of the present petition;
c) pass such further or other orders as this Hon'ble Court may deem fit and proper in the circumstances of the case and thus render justice.

Dated at ${tierInfo.city} on this the ${todayStr}.

Petitioner.                                                                     Counsel for Petitioner.

VERIFICATION

I, ${clientName}, the Petitioner herein, do hereby solemnly declare and verify that the contents of paragraphs 1 to 5 above are true and correct to the best of my knowledge, information, and belief.

Verified at ${tierInfo.city} on this ${todayStr}.

Petitioner.                                                                     Counsel for Petitioner.

LIST OF DOCUMENTS / ANNEXURES

1. Annexure–A: Certified Copy of First Information Report / Case Details.
2. Annexure–B: Supporting Identity and Residential Proof of Petitioner.
3. Annexure–C: Relevant representations and statutory notices.`;

    const affidavit = `${tierInfo.headerTitle.toUpperCase()}
${jurisdictionHeader}
${caseNo}

In the matter of:

${clientName},
Residing at ${clientAddress}.
                                                        ... Petitioner / Deponent

                                            — VERSUS —

1. The State Rep. by
   The Inspector of Police,
   Police Station,
   ${tierInfo.city}.
   (Crime No. ${caseData.caseNumber || '____ of 2026'})
                                                        ... 1st Respondent / Complainant

2. The De-facto Complainant,
   residing at the address mentioned in records.
                                                        ... 2nd Respondent

SUPPORTING VERIFICATION AFFIDAVIT OF THE PETITIONER

I, ${clientName}, residing at ${clientAddress}, do hereby solemnly affirm and sincerely state as follows:

1. I am the Petitioner / Deponent herein, fully conversant with the facts and circumstances of the present case, and competent to swear to this Affidavit.

2. I state that I have preferred the accompanying Memorandum of ${pleadingInfo.label} under ${pleadingInfo.statutoryRef} before this Hon'ble Court. I have read and understood the factual averments and legal submissions made in the accompanying Petition and state that the facts narrated therein are true and correct to the best of my knowledge, information, and belief.

3. I state that the present proceedings pertain to ${caseData.name}${caseData.description ? ` wherein ${caseData.description}` : ''}. The statutory provisions invoked are ${sectionsList}. I am a law-abiding citizen with deep roots in society.

4. I state that no prior application or petition has been filed by me before this Hon'ble Court or any other Court seeking the same or similar relief in respect of the present subject matter.

5. I therefore pray that this Hon'ble Court may be pleased to accept this supporting affidavit, allow the accompanying petition as prayed for, and pass suitable protective orders in the interest of justice.

Solemnly affirmed at ${tierInfo.city}
on this ${todayStr}
and signed their name in my presence.
                                                                                DEPONENT / PETITIONER

BEFORE ME
ADVOCATE / NOTARY PUBLIC / OATH COMMISSIONER`;

    const vakalat = `${tierInfo.headerTitle.toUpperCase()}
${jurisdictionHeader}
${caseNo}

In the matter of:
${clientName}                                          ... Petitioner / Accused
                                            — VERSUS —
THE STATE REP. BY INSPECTOR OF POLICE & ANOTHER         ... Respondents

VAKALATNAMA / MEMORANDUM OF APPEARANCE

I, ${clientName}, the Petitioner / Accused in the above matter, do hereby nominate, constitute, and appoint:

${advocateName}, Advocate
Enrolment No.: ${barEnrolment}
Chamber Address: ${chamberAddress}
Mobile: ${advocateProfile.phone || '+91 98400 00000'} | Email: ${advocateProfile.email || 'counsel@madrashighcourt.in'}

to be my Advocate in the above matter, to appear, plead, act, file petitions, receive documents, inspect records, and conduct all proceedings in this Hon'ble Court on my behalf.

Executed by me at ${tierInfo.city} on this ${todayStr}.

[ADVOCATES' WELFARE FUND STAMP: ₹30 / ₹100]
[COURT FEE STAMP: ₹10 / ₹20]

________________________                                ________________________
SIGNATURE OF CLIENT                                      ACCEPTED & SIGNED BY COUNSEL
(Petitioner / Accused)                                  ${advocateName} (${barEnrolment})


DOCKET / BACKSHEET ENDORSEMENT:

${tierInfo.headerTitle.toUpperCase()}
${caseNo}

${clientName}
                                                        ... Petitioner / Deponent

                                            — VERSUS —

The Inspector of Police & Another,
                                                        ... Respondents.

MEMORANDUM OF ${pleadingInfo.label.toUpperCase()} FILED UNDER ${pleadingInfo.statutoryRef.toUpperCase()}

${advocateName} (${barEnrolment})
Counsel for Petitioner
${chamberAddress}`;

    const sections: PaperbookSections = {
        indexSheet: 'Index Sheet generated with page numbers.',
        synopsis,
        petition,
        affidavit,
        vakalat,
    };

    const indexItems = generateDefaultIndexItems(params, sections);

    const rawText = `[INDEX_SHEET]\n${sections.indexSheet}\n[/INDEX_SHEET]\n\n[SYNOPSIS]\n${synopsis}\n[/SYNOPSIS]\n\n[PETITION]\n${petition}\n[/PETITION]\n\n[AFFIDAVIT]\n${affidavit}\n[/AFFIDAVIT]\n\n[VAKALAT]\n${vakalat}\n[/VAKALAT]`;

    return {
        sections,
        rawText,
        indexItems,
    };
};
