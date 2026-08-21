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

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

export const MADRAS_HC_SYSTEM_PROMPT = `You are a meticulous Senior Advocate practicing at the Madras High Court (Principal Seat, Chennai / Madurai Bench) and Tamil Nadu District Judiciary.
Your task is to draft a professional, complete, court-compliant legal Paperbook packet based on the raw case facts provided.

MANDATORY TN FORMATTING & ARCHITECTURE RULES:
1. STRICT ACTIVE CRIMINAL CODES (NO OLD IPC/CrPC):
   - You must exclusively utilize active criminal codes:
     • Bharatiya Nyaya Sanhita, 2023 (BNS) [Replaces IPC]
     • Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS) [Replaces Cr.P.C.]
     • Bharatiya Sakshya Adhiniyam, 2023 (BSA) [Replaces Evidence Act]
   - Flag, convert, and update any input containing old IPC/CrPC provisions to their corresponding new BNS/BNSS sections.
   - For Investigation Direction / Complaint: Sec 175(3) BNSS [Formerly 156(3) Cr.P.C.].
   - For Regular Bail: Sec 483 BNSS (High Court/Sessions) or Sec 480 BNSS (Magistrate).
   - For Anticipatory Bail: Sec 482 BNSS.
   - For Quashing: Sec 528 BNSS (High Court) [Formerly 482 Cr.P.C.].
   - For Criminal Revision: Sec 438 & 442 BNSS.
   - For Criminal Appeal: Sec 415 BNSS.

2. EXACT COURT CAUSE TITLE & TEXT POSITIONS (STRICT COMPLIANCE):
   Every Petition and Affidavit must strictly follow this exact layout:
   - Centered Court Header: IN THE COURT OF THE HON'BLE [COURT_TIER_TITLE]
   - Centered Case Number: Crl.M.P. No. _____ of 2026 (or Crl.O.P. No. / W.P. No. / O.S. No.)
   - "In the matter of:" (Left aligned)
   - Petitioner Name & full address, with right-aligned role: "... Petitioner / defacto complainant"
   - Centered: "Versus"
   - 1st Respondent (e.g. The Inspector of Police, Police Station, City) with right-aligned role: "... Complainant / 1st Respondent."
   - Centered: "Versus"
   - 2nd Respondent / Accused with right-aligned role: "... Accused / 2nd Respondent."
   - Centered Bold Main Title: PETITION UNDER SECTION [XXX] OF THE [ACT], [YEAR]
   - Opening Statement: "The Petitioner respectfully submits as follows:"

3. STRUCTURED NARRATIVE & SUBHEADINGS:
   - Numbered paragraphs for factual background, matrimonial/transaction details, employment, income, cruelties/disputes, specific dates, WhatsApp/electronic evidence.
   - Structured subheadings in bold uppercase where applicable:
     • JEWELLERY / STRIDHAN (with tabular column breakdown: Sl. No., Description., Weight., Status.)
     • FAILURE TO TAKE EFFECTIVE POLICE ACTION
     • GROUNDS
   - Precedents: Reference landmark Supreme Court decisions (e.g., Lalita Kumari v. Govt of UP, Priyanka Srivastava v. State of UP) where relevant.

4. PRAYER, VERIFICATION & ANNEXURES:
   - PRAYER: Subheading "PRAYER" followed by "Therefore, it is most respectfully prayed that this Hon'ble Court may be pleased to:" with lettered clauses (a, b, c, d, e, f, g).
   - Date & Place: "Dated at [City] on this the day of [Date]."
   - Signatures: "Petitioner." on left, "Counsel for Petitioner." on right.
   - VERIFICATION: Centered heading "VERIFICATION." with solemn confirmation clause, verification place/date, and dual signatures.
   - LIST OF DOCUMENTS / ANNEXURES: Annexure–A, Annexure–B, Annexure–C, Annexure–D, Annexure–E, Annexure–F.

5. SEQUENTIAL SECTIONS WITH PROGRAMMATIC TAGS:
   Return the text split into distinct parts using clear string identifiers:
   [INDEX_SHEET]
   (Chronological Index Sheet in table format listing S.No, Description of Document, Date, Page No., Court Fee)
   [/INDEX_SHEET]

   [SYNOPSIS]
   (Crisp Synopsis of the case & Chronological List of Dates and Events for the Judge)
   [/SYNOPSIS]

   [PETITION]
   (Full Court Cause Title, Substantive Memorandum of Petition, Grounds, Precedents, Prayer, Verification, and Annexures list)
   [/PETITION]

   [AFFIDAVIT]
   (Supporting Verification Affidavit sworn by the Petitioner with solemn affirmation, deponent signature, and attestation clause)
   [/AFFIDAVIT]

   [VAKALAT]
   (Pre-compiled Vakalatnama & Back-sheet docket with Advocate details, Bar Council of Tamil Nadu Enrolment No., Chamber address, and Welfare Fund stamp space)
   [/VAKALAT]

6. TONE & NOMENCLATURE:
   - Completely objective, formal, authoritative legal drafting.
   - Refer to parties strictly by legal designations (Petitioner / Accused No. 1, Respondent / State represented by the Inspector of Police, Crime No., Police Station).
   - Clean paragraphing without conversational filler or Markdown symbols inside the tagged blocks.`;

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
- Petitioner / Client: ${clientName}, Address: ${clientAddress}, Contact: ${clientPhone}
- Legal Sections Charged / Applicable: ${sectionsList}
- Case Description: ${caseData.description || 'N/A'}
- Case Stage: ${caseData.stage}
- Filing Date: ${caseData.filingDate || new Date().toISOString().split('T')[0]}

ADVOCATE FOR PETITIONER:
- Name: ${advocateProfile.name || 'Counsel for Petitioner'}
- Bar Council Enrolment No.: ${advocateProfile.barEnrolment || 'MS/     /20  '}
- Chamber Address: ${advocateProfile.chamberAddress || 'High Court Buildings, Chennai'}
- Contact: ${advocateProfile.phone || ''} | ${advocateProfile.email || ''}

CASE TIMELINE & FACTS:
${timelineNotes || 'No timeline logged.'}

INTERNAL CASE NOTES:
${caseNotes || 'No additional notes.'}

ADDITIONAL GROUNDS & FACTS SPECIFIED BY ADVOCATE:
${customFacts || 'None provided. Elaborate grounds based on legal principles and facts above.'}

SPECIFIC PRAYER / INTERIM RELIEF:
${prayerNotes || 'Standard prayer as per statutory format.'}

Please generate the complete, comprehensive Madras High Court Paperbook packet now using the required sequential tags: [INDEX_SHEET], [SYNOPSIS], [PETITION], [AFFIDAVIT], [VAKALAT].`;
};

// Generate Pleading using DeepSeek API
export const generatePleadingPaperbook = async (
    params: GeneratePleadingParams,
    onProgress?: (status: string) => void
): Promise<{ sections: PaperbookSections; rawText: string; indexItems: IndexTableItem[] }> => {
    const apiKey = params.apiKey || params.advocateProfile.deepseekApiKey;

    // If no API key is set, use the high-fidelity offline legal template engine
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
                'Authorization': `Bearer ${apiKey.trim()}`,
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: 'system', content: MADRAS_HC_SYSTEM_PROMPT },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.2,
                max_tokens: 4000,
            }),
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => null);
            throw new Error(errData?.error?.message || `DeepSeek API Error: HTTP ${response.status}`);
        }

        onProgress?.('Parsing and structuring paperbook sections...');
        const data = await response.json();
        const rawContent = data.choices?.[0]?.message?.content || '';

        const sections = parsePaperbookTags(rawContent);

        // If tag parsing failed due to format deviation, fallback gracefully
        if (!sections.petition) {
            sections.petition = rawContent;
        }

        const indexItems = generateDefaultIndexItems(params, sections);

        return {
            sections,
            rawText: rawContent,
            indexItems,
        };
    } catch (error: any) {
        console.warn('DeepSeek API call failed, falling back to offline generator:', error);
        onProgress?.('API connection issue, generating structured template...');
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

// High-Fidelity Offline Madras HC Legal Template Generator
export const generateOfflineSamplePaperbook = (
    params: GeneratePleadingParams
): { sections: PaperbookSections; rawText: string; indexItems: IndexTableItem[] } => {
    const { caseData, pleadingType, courtTier, advocateProfile, customFacts, prayerNotes } = params;
    const tierInfo = COURT_TIERS.find(t => t.value === courtTier) || COURT_TIERS[0];
    const pleadingInfo = PLEADING_TYPES.find(p => p.value === pleadingType) || PLEADING_TYPES[0];

    const clientName = (caseData.client?.name || caseData.clientName || 'ACCUSED / PETITIONER').toUpperCase();
    const clientAddress = caseData.client?.address || 'Chennai, Tamil Nadu';
    const caseNo = caseData.caseNumber || 'Crl.O.P. No.       / 2026';
    const advocateName = advocateProfile.name || 'COUNSEL FOR PETITIONER';
    const barEnrolment = advocateProfile.barEnrolment || 'MS/1234/2020';
    const chamberAddress = advocateProfile.chamberAddress || 'High Court Buildings, Chennai - 600104';

    const sectionsList = (caseData.sections || [])
        .map(s => `${s.act} Sec. ${s.section}`)
        .join(', ') || 'Sec. 103(1), 318(4) BNS, 2023';

    const todayStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    // 1. Synopsis
    const synopsis = `SYNOPSIS AND CHRONOLOGICAL LIST OF DATES AND EVENTS

1. BRIEF FACTS:
The Petitioner has approached this Hon'ble Court seeking ${pleadingInfo.label.toLowerCase()} in connection with Crime No.       / 2026 registered on the file of the Respondent Police for alleged offences under ${sectionsList}.

2. SUBSTANTIVE GROUNDS:
• The Petitioner is completely innocent and has been falsely implicated due to prior animosity.
• No specific overt act is attributed to the Petitioner in the FIR.
• The Petitioner is a permanent resident of Tamil Nadu with deep family roots and has no previous bad antecedents.
• The Petitioner undertakes to strictly abide by any conditions imposed by this Hon'ble Court.

3. CHRONOLOGICAL LIST OF DATES:
${(caseData.timeline || []).map(t => `${t.date ? t.date.split('T')[0] : 'DATE'}: ${t.title} - ${t.description || ''}`).join('\n') ||
`01.08.2026: Alleged date of occurrence.
03.08.2026: FIR registered by Respondent Police.
10.08.2026: Petitioner apprehends arrest / was remanded to judicial custody.
${todayStr}: Present ${pleadingInfo.label} presented before this Hon'ble Court.`}`;

    // 2. Petition (Exact Madras High Court & TN Judiciary Cause Title and Text Positions)
    const petition = `${tierInfo.headerTitle.toUpperCase()}
${caseNo}

In the matter of:

${clientName},
W/o. / S/o. / D/o. 
${clientAddress}.
                                                        ... Petitioner / defacto complainant

                                            Versus

The Inspector of Police,
Police Station,
${tierInfo.city}.
                                                        ... Complainant / 1st Respondent.

                                            Versus

Accused / 2nd Respondent,
${clientAddress}.
                                                        ... Accused / 2nd Respondent.

PETITION UNDER ${pleadingInfo.statutoryRef.toUpperCase()}

The Petitioner respectfully submits as follows:

1. The Petitioner is the legally wedded wife / petitioner in the present matter and is residing at the aforementioned address within the territorial jurisdiction of this Hon'ble Court.

2. The case of the Petitioner in brief is that ${caseData.description || 'an alleged incident took place resulting in the present grievance and cause of action'}. The offences complained of attract provisions under ${sectionsList}.

3. The Petitioner states that from the inception of the matrimonial / transactional dispute, the 2nd Respondent has subjected the Petitioner to continuous physical, mental, emotional, and economic harassment, creating an atmosphere of insecurity and distress.

4. The Petitioner states that on several occasions, the 2nd Respondent has used abusive and threatening communications through WhatsApp messages, voice calls, and other electronic media. The Petitioner possesses electronic records, messages, and call recordings in support of these assertions.

${customFacts ? `5. SPECIFIC CASE FACTS & GROUNDS:\n${customFacts}\n` : ''}FAILURE TO TAKE EFFECTIVE POLICE ACTION:
The Petitioner had approached the 1st Respondent police authorities seeking appropriate inquiry and registration of FIR. However, no effective criminal investigation or registration has been undertaken to the satisfaction of the Petitioner.

The Petitioner therefore has no other effective and efficacious remedy except to approach this Hon'ble Court seeking appropriate directions under ${pleadingInfo.statutoryRef}.

The Hon'ble Supreme Court of India has consistently held that where information discloses cognizable offences, a fair investigation must be ensured. The principles laid down in Lalita Kumari v. Government of Uttar Pradesh and Priyanka Srivastava v. State of Uttar Pradesh continue to govern the exercise of powers by the Magistrate and Court while considering petitions under the Sanhita.

PRAYER

Therefore, it is most respectfully prayed that this Hon'ble Court may be pleased to:

a) direct the 1st Respondent/Inspector of Police to register an FIR on the basis of the Petitioner's complaint and conduct a fair, impartial, and effective investigation;
b) direct the Investigating Officer to secure, preserve, and subject the relevant electronic devices, communications, and evidence to appropriate forensic examination;
c) ${prayerNotes || 'direct the police authorities to take appropriate steps for the safety and protection of the Petitioner in accordance with law;'}
d) direct the Investigating Officer to file the final report before the competent Court within a stipulated time frame; and
e) pass such further or other orders as this Hon'ble Court may deem fit and proper in the interests of justice.

Dated at ${tierInfo.city} on this the ${todayStr}.

Petitioner.                                                                     Counsel for Petitioner.

VERIFICATION.

I, ${clientName}, the Petitioner herein, do hereby verify that the contents of paragraphs 1 to 10 above are true and correct to the best of my knowledge, information, and belief and that I have not suppressed any material fact.

Verified at ${tierInfo.city} on this ${todayStr}.

Petitioner.                                                                     Counsel for Petitioner.

LIST OF DOCUMENTS / ANNEXURES

Annexure–A: Copies of WhatsApp communications, chats, and screenshots relating to the allegations.
Annexure–B: Statement/list of property, particulars, and monetary transactions.
Annexure–C: Electronic evidence, call recordings, and messages.
Annexure–D: Copy of the complaint submitted before the Police Station.
Annexure–E: Copies of representations submitted to higher police authorities.
Annexure–F: Supporting identity and relationship documents.`;

    // 3. Affidavit (Exact Deponent Verification Format)
    const affidavit = `${tierInfo.headerTitle.toUpperCase()}
${caseNo}

In the matter of:

${clientName},
W/o. / S/o. / D/o. 
${clientAddress}.
                                                        ... Petitioner / Deponent

                                            Versus

The Inspector of Police,
Police Station,
${tierInfo.city}.
                                                        ... Complainant / 1st Respondent.

                                            Versus

Accused / 2nd Respondent,
${clientAddress}.
                                                        ... Accused / 2nd Respondent.

SUPPORTING VERIFICATION AFFIDAVIT OF THE PETITIONER

I, ${clientName}, son/daughter/wife of, aged about years, residing at ${clientAddress}, do hereby solemnly affirm and sincerely state as follows:

1. I am the Petitioner / Deponent herein and as such I am well acquainted with the facts and circumstances of the case.

2. I have read and understood the contents of the accompanying Memorandum of Petition and I state that the facts narrated in Paragraphs 1 to 10 are true and correct to the best of my knowledge, information, and belief.

3. I solemnly state that I have not filed any other application or petition before this Hon'ble Court or any other Subordinate Court for the same relief or cause of action.

4. I therefore pray that this Hon'ble Court may be pleased to accept this affidavit and allow the accompanying petition as prayed for and thus render justice.

Solemnly affirmed at ${tierInfo.city}
on this ${todayStr}
and signed their name in my presence.
                                                                                DEPONENT / PETITIONER

BEFORE ME
ADVOCATE / NOTARY PUBLIC / OATH COMMISSIONER`;

    // 4. Vakalatnama & Backsheet Docket
    const vakalat = `${tierInfo.headerTitle.toUpperCase()}
${caseNo}

In the matter of:
${clientName}                                          ... Petitioner / Accused
                                            -Versus-
THE STATE REP. BY INSPECTOR OF POLICE                   ... Respondent

VAKALATNAMA / MEMORANDUM OF APPEARANCE

I, ${clientName}, the Petitioner in the above matter, do hereby nominate, constitute, and appoint:

${advocateName}, Advocate
Enrolment No.: ${barEnrolment}
Chamber Address: ${chamberAddress}
Mobile: ${advocateProfile.phone || '+91 98400 00000'} | Email: ${advocateProfile.email || 'counsel@madrashighcourt.in'}

to be my Advocate in the above matter, to appear, plead, act, file petitions, receive documents, inspect records, and conduct all proceedings in this Hon'ble Court on my behalf.

Executed by me at ${tierInfo.city} on this ${todayStr}.

[ADVOCATES' WELFARE FUND STAMP: ₹30 / ₹100]
[COURT FEE STAMP]

________________________                                ________________________
SIGNATURE OF CLIENT                                      ACCEPTED & SIGNED BY COUNSEL
(Petitioner / Accused)                                  ${advocateName} (${barEnrolment})


DOCKET / BACKSHEET ENDORSEMENT:

${tierInfo.headerTitle.toUpperCase()}
${caseNo}

${clientName}
                                                        ... Petitioner / Deponent

                                            Versus

The Inspector of Police,
                                                        ... Complainant

                                            Versus

Accused / 2nd Respondent,
                                                        ... Accused / Respondent.

PETITION UNDER ${pleadingInfo.statutoryRef.toUpperCase()}

${advocateName} (${barEnrolment})
Counsel for petitioner / defacto complainant.`;

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
