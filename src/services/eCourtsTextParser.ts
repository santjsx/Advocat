import { ECourtsCaseResult } from '../models/ECourts';
import { LegalActType, CaseStage } from '../models/Case';
import { cleanCNR, formatCNRDisplay } from './eCourtsService';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

export interface ParsedECourtsTextResult {
    success: boolean;
    data?: ECourtsCaseResult;
    message?: string;
    rawText: string;
}

// Parse dates in various Indian court formats
const parseIndianCourtDate = (dateStr?: string): string | undefined => {
    if (!dateStr || !dateStr.trim()) return undefined;

    // Clean ordinal suffixes: 4th -> 4, 22nd -> 22, 1st -> 1, 3rd -> 3
    const cleaned = dateStr
        .trim()
        .replace(/(\d+)(st|nd|rd|th)/gi, '$1')
        .replace(/[\,\.]/g, '')
        .trim();

    const formats = [
        'DD-MM-YYYY',
        'DD/MM/YYYY',
        'YYYY-MM-DD',
        'DD MMMM YYYY',
        'DD MMM YYYY',
        'D MMMM YYYY',
        'D MMM YYYY',
        'MMMM DD YYYY',
    ];

    for (const fmt of formats) {
        const parsed = dayjs(cleaned, fmt);
        if (parsed.isValid() && parsed.year() >= 2000 && parsed.year() <= 2040) {
            return parsed.format('YYYY-MM-DD');
        }
    }

    // Try standard fallback
    const fallback = dayjs(cleaned);
    if (fallback.isValid() && fallback.year() >= 2000 && fallback.year() <= 2040) {
        return fallback.format('YYYY-MM-DD');
    }

    return undefined;
};

const mapCourtStageToCaseStage = (courtStage?: string): CaseStage => {
    if (!courtStage) return 'PLEADING';
    const lower = courtStage.toLowerCase();
    if (lower.includes('evidence') || lower.includes('cross') || lower.includes('witness') || lower.includes('pw') || lower.includes('dw') || lower.includes('trial')) {
        return 'TRIAL';
    }
    if (lower.includes('argument') || lower.includes('judgment') || lower.includes('order')) {
        return 'POST_TRIAL';
    }
    if (lower.includes('summons') || lower.includes('notice') || lower.includes('appearance') || lower.includes('intake')) {
        return 'INTAKE';
    }
    if (lower.includes('investigation') || lower.includes('fir') || lower.includes('charge')) {
        return 'INVESTIGATION';
    }
    if (lower.includes('appeal') || lower.includes('revision') || lower.includes('crl.a')) {
        return 'APPEAL';
    }
    if (lower.includes('settlement') || lower.includes('lok adalat') || lower.includes('compromise')) {
        return 'SETTLEMENT';
    }
    if (lower.includes('closed') || lower.includes('disposed')) {
        return 'CLOSED';
    }
    return 'PLEADING';
};

// Main Smart Text & Clipboard Parser
export const parseECourtsText = (rawText: string): ParsedECourtsTextResult => {
    if (!rawText || !rawText.trim()) {
        return {
            success: false,
            message: 'No text provided to parse.',
            rawText,
        };
    }

    const text = rawText.trim();

    // 1. Extract CNR Number (16 characters)
    let cnr = '';
    const cnrMatch = text.match(/(?:CNR(?:\s*Number)?\s*[:\-\s]?\s*)([A-Za-z0-9]{16})/i);
    if (cnrMatch && cnrMatch[1]) {
        cnr = cleanCNR(cnrMatch[1]);
    } else {
        const standaloneCnr = text.match(/\b([A-Z]{4}\d{2}\d{6}\d{4})\b/i);
        if (standaloneCnr && standaloneCnr[1]) {
            cnr = cleanCNR(standaloneCnr[1]);
        }
    }

    // 2. Extract Case Type and Case Number
    let caseNumber = '';
    let caseTypeName = 'Criminal / Civil Petition';

    const regMatch = text.match(/(?:Registration\s*Number\s*[:\-\s]?\s*)([A-Za-z\.\s]+?)(?:No\.?|\/|\s)\s*([0-9]+)\s*(?:\/|\s*of\s*|\s*-\s*)\s*(20[12][0-9])/i);
    const filingMatch = text.match(/(?:Filing\s*Number\s*[:\-\s]?\s*)([A-Za-z\.\s]+?)(?:No\.?|\/|\s)\s*([0-9]+)\s*(?:\/|\s*of\s*|\s*-\s*)\s*(20[12][0-9])/i);

    if (filingMatch) {
        caseNumber = `${filingMatch[1].trim()} No. ${filingMatch[2].trim()} / ${filingMatch[3].trim()}`;
        caseTypeName = filingMatch[1].trim();
    } else if (regMatch) {
        caseNumber = `${regMatch[1].trim()} No. ${regMatch[2].trim()} / ${regMatch[3].trim()}`;
        caseTypeName = regMatch[1].trim();
    } else {
        const genMatch = text.match(/(?:Case\s*(?:Type|Number|No)?\s*[:\-\s]?\s*)([A-Za-z\.\s]+?)(?:No\.?|\/|\s)\s*([0-9]+)\s*(?:\/|\s*of\s*|\s*-\s*)\s*(20[12][0-9])/i);
        if (genMatch) {
            caseNumber = `${genMatch[1].trim()} No. ${genMatch[2].trim()} / ${genMatch[3].trim()}`;
            caseTypeName = genMatch[1].trim();
        } else {
            // Check standard short formats e.g. Crl.O.P. 245/2024, CRLMP/833/2026, WP/1829/2026
            const shortMatch = text.match(/\b(Crl\.O\.P\.?|CRLMP|W\.P\.?|C\.M\.A\.?|Crl\.A\.?|Crl\.R\.C\.?|O\.S\.?|C\.C\.?|S\.C\.?|E\.P\.?|M\.C\.?|C\.R\.P\.?)\s*(?:No\.?)?\s*([0-9]+)\s*\/\s*(20[12][0-9])\b/i);
            if (shortMatch) {
                caseNumber = `${shortMatch[1].toUpperCase()} No. ${shortMatch[2]} / ${shortMatch[3]}`;
                caseTypeName = shortMatch[1];
            }
        }
    }

    // 3. Extract Petitioner Name & Advocate
    let petitionerName = 'Petitioner';
    let petitionerAdvocate = '';

    const petBlock = text.match(/(?:Petitioner(?:\s*and\s*Advocate(?:\s*Details)?)?\s*[:\-\s]*)([\s\S]*?)(?=Respondent|Act|FIR|Case History|Case Status|$)/i);
    if (petBlock && petBlock[1]) {
        const lines = petBlock[1].split('\n').map(l => l.trim()).filter(l => l && !l.toLowerCase().startsWith('qr code'));
        for (const line of lines) {
            const cleanLine = line.replace(/^\d+[\)\.\-]\s*/, '').trim();
            if (cleanLine && !cleanLine.toLowerCase().includes('advocate') && petitionerName === 'Petitioner') {
                petitionerName = cleanLine;
            } else if (cleanLine.toLowerCase().includes('advocate') || cleanLine.toLowerCase().includes('bar')) {
                petitionerAdvocate = cleanLine.replace(/advocate\s*[:\-\s]*/i, '').trim();
            }
        }
    }

    // Fallback for single line petitioner
    if (petitionerName === 'Petitioner') {
        const petMatch = text.match(/(?:Petitioner(?:\s*Details)?\s*[:\-\s]?\s*)(?:1\)\s*)?([^\n\r]+)/i);
        if (petMatch && petMatch[1]) {
            const clean = petMatch[1].replace(/Advocate[\s\-\:]+.*$/i, '').trim();
            if (clean && clean.toLowerCase() !== 'and advocate') {
                petitionerName = clean;
            }
        }
    }

    // 4. Extract Respondent Name & Advocate
    let respondentName = 'Respondent / State';
    let respondentAdvocate = '';

    const respBlock = text.match(/(?:Respondent(?:\s*and\s*Advocate(?:\s*Details)?)?\s*[:\-\s]*)([\s\S]*?)(?=Act|FIR|Case History|Case Status|Under Act|$)/i);
    if (respBlock && respBlock[1]) {
        const lines = respBlock[1].split('\n').map(l => l.trim()).filter(l => l && !l.toLowerCase().startsWith('qr code'));
        for (const line of lines) {
            const cleanLine = line.replace(/^\d+[\)\.\-]\s*/, '').trim();
            if (cleanLine && !cleanLine.toLowerCase().includes('advocate') && respondentName === 'Respondent / State') {
                respondentName = cleanLine;
            } else if (cleanLine.toLowerCase().includes('advocate') || cleanLine.toLowerCase().includes('bar')) {
                respondentAdvocate = cleanLine.replace(/advocate\s*[:\-\s]*/i, '').trim();
            }
        }
    }

    // Quick check for "X vs. Y" format in raw text
    const vsMatch = text.match(/([A-Za-z0-9\.\s\,\&]+?)\s+(?:vs\.?|v\.|versus)\s+([A-Za-z0-9\.\s\,\&]+)/i);
    if (vsMatch && (petitionerName === 'Petitioner' || petitionerName === 'and Advocate')) {
        petitionerName = vsMatch[1].trim();
        respondentName = vsMatch[2].split('\n')[0].trim();
    }

    // 5. Extract Next Hearing Date & Purpose
    let nextHearingDate: string | undefined;
    let nextHearingPurpose = 'For Hearing / Proceedings';

    const nextDateMatch = text.match(/(?:Next\s*(?:Hearing\s*)?Date\s*[:\-\s]?\s*)([0-9A-Za-z\s\,\/\-]+?)(?:\s*(?:for|in|\n|\r|$))/i);
    if (nextDateMatch && nextDateMatch[1]) {
        nextHearingDate = parseIndianCourtDate(nextDateMatch[1]);
    } else {
        // Search any date mentioned with "Next Date" in SMS
        const smsDateMatch = text.match(/(?:Next\s*Date\s*[:\-\s]?\s*)([0-9]{1,2}[\-\/\.][0-9]{1,2}[\-\/\.][0-9]{2,4})/i);
        if (smsDateMatch && smsDateMatch[1]) {
            nextHearingDate = parseIndianCourtDate(smsDateMatch[1]);
        }
    }

    // Case Stage
    let stage = 'PLEADING';
    const stageMatch = text.match(/(?:Case\s*Stage\s*[:\-\s]?\s*)([^\n\r]+)/i);
    if (stageMatch && stageMatch[1]) {
        stage = stageMatch[1].trim();
        nextHearingPurpose = stage;
    }

    // Next hearing purpose
    const purposeMatch = text.match(/(?:for\s+)([A-Za-z\s\&]+?)(?:in\s+Court|\n|\r|$)/i);
    if (purposeMatch && purposeMatch[1]) {
        nextHearingPurpose = `For ${purposeMatch[1].trim()}`;
    }

    // 6. Extract Court Hall & Presiding Judge
    let courtHall = 'Court Hall';
    let presidingJudge = "Hon'ble Court";
    const judgeMatch = text.match(/(?:Court\s*(?:Number\s*and\s*)?Judge\s*[:\-\s]?\s*)([^\n\r]+)/i);
    if (judgeMatch && judgeMatch[1]) {
        const cleanJudge = judgeMatch[1].replace(/Last\s*Business\s*Date.*$/i, '').trim();
        presidingJudge = cleanJudge;
        courtHall = cleanJudge;
    } else {
        const hallMatch = text.match(/(Court\s*Hall\s*(?:No\.?)?\s*[0-9A-Za-z]+)/i);
        if (hallMatch) {
            courtHall = hallMatch[1].trim();
        }
    }

    // 7. Extract Statutory Acts & Sections (CrPC, IPC, BNSS, BNS, CPC, NI Act, POCSO)
    const sections: Array<{ act: LegalActType; section: string; description?: string }> = [];

    // Check specific eCourts layout: "Under Act(s): ... Under Section(s): ..."
    const underActMatch = text.match(/(?:Under\s*Act\(s\)\s*[:\-\s]?\s*)([^\n\r]+)/i);
    const underSecMatch = text.match(/(?:Under\s*Section\(s\)\s*[:\-\s]?\s*)([^\n\r]+)/i);

    if (underActMatch || underSecMatch) {
        const actStr = (underActMatch ? underActMatch[1] : '').toUpperCase();
        const secStr = underSecMatch ? underSecMatch[1].trim() : '156';

        let actType: LegalActType = 'CRPC';
        if (actStr.includes('CRIMINAL PROCEDURE') || actStr.includes('CRPC')) actType = 'CRPC';
        else if (actStr.includes('PENAL CODE') || actStr.includes('IPC')) actType = 'IPC';
        else if (actStr.includes('BHARATIYA NYAYA') || actStr.includes('BNS')) actType = 'BNS';
        else if (actStr.includes('BHARATIYA NAGARIK') || actStr.includes('BNSS')) actType = 'BNSS';
        else if (actStr.includes('CIVIL PROCEDURE') || actStr.includes('CPC')) actType = 'CPC';

        sections.push({
            act: actType,
            section: secStr,
            description: `Section ${secStr} of ${underActMatch ? underActMatch[1].trim() : 'Code of Criminal Procedure'}`
        });
    }

    // Match BNS sections
    const bnsMatches = text.matchAll(/(?:BNS|Bharatiya\s*Nyaya\s*Sanhita)(?:\s*2023)?(?:\s*-\s*|\s*Sec(?:tion)?\s*|\s*)([0-9]+(?:\([0-9a-zA-Z]+\))?)/gi);
    for (const match of bnsMatches) {
        if (!sections.some(s => s.act === 'BNS' && s.section === match[1])) {
            sections.push({
                act: 'BNS',
                section: match[1],
                description: `Section ${match[1]} of Bharatiya Nyaya Sanhita, 2023`,
            });
        }
    }

    // Match BNSS sections
    const bnssMatches = text.matchAll(/(?:BNSS|Bharatiya\s*Nagarik\s*Suraksha)(?:\s*2023)?(?:\s*-\s*|\s*Sec(?:tion)?\s*|\s*)([0-9]+(?:\([0-9a-zA-Z]+\))?)/gi);
    for (const match of bnssMatches) {
        if (!sections.some(s => s.act === 'BNSS' && s.section === match[1])) {
            sections.push({
                act: 'BNSS',
                section: match[1],
                description: `Section ${match[1]} of Bharatiya Nagarik Suraksha Sanhita, 2023`,
            });
        }
    }

    // Match IPC sections
    const ipcMatches = text.matchAll(/(?:IPC|Indian\s*Penal\s*Code)(?:\s*-\s*|\s*Sec(?:tion)?\s*|\s*)([0-9]+[A-Za-z]?)/gi);
    for (const match of ipcMatches) {
        if (!sections.some(s => s.act === 'IPC' && s.section === match[1])) {
            sections.push({
                act: 'IPC',
                section: match[1],
                description: `Section ${match[1]} of Indian Penal Code`,
            });
        }
    }

    // Match CrPC sections
    const crpcMatches = text.matchAll(/(?:CrPC|Cr\.P\.C\.)(?:\s*-\s*|\s*Sec(?:tion)?\s*|\s*)([0-9]+[A-Za-z]?)/gi);
    for (const match of crpcMatches) {
        if (!sections.some(s => s.act === 'CRPC' && s.section === match[1])) {
            sections.push({
                act: 'CRPC',
                section: match[1],
                description: `Section ${match[1]} of Code of Criminal Procedure`,
            });
        }
    }

    // Match CPC sections
    const cpcMatches = text.matchAll(/(?:CPC|Code\s*of\s*Civil\s*Procedure)(?:\s*-\s*|\s*Sec(?:tion)?\s*|\s*)([0-9]+|Order\s*[0-9A-Za-z\s]+)/gi);
    for (const match of cpcMatches) {
        if (!sections.some(s => s.act === 'CPC' && s.section === match[1])) {
            sections.push({
                act: 'CPC',
                section: match[1],
                description: `Civil Procedure: ${match[1]}`,
            });
        }
    }

    // Default if no sections detected
    if (sections.length === 0) {
        if (caseTypeName.toLowerCase().includes('crl') || text.toLowerCase().includes('bail') || text.toLowerCase().includes('police') || text.toLowerCase().includes('magistrate')) {
            sections.push({ act: 'BNSS', section: '482', description: 'Anticipatory Bail / Procedure under BNSS 2023' });
        } else {
            sections.push({ act: 'CPC', section: 'Sec 9', description: 'Civil Jurisdiction' });
        }
    }

    // 8. Determine Court Name
    let courtName = '';
    const firstLines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const headerLine = firstLines[0] || '';
    if (headerLine.toLowerCase().includes('magistrate') || headerLine.toLowerCase().includes('court') || headerLine.toLowerCase().includes('judge')) {
        courtName = headerLine;
    }

    if (!courtName && cnr) {
        if (cnr.startsWith('TNTR28')) courtName = 'Judicial Magistrate Court - Tiruvottiyur (Tiruvallur District)';
        else if (cnr.startsWith('TNTR')) courtName = 'Principal District & Sessions Court - Tiruvallur';
        else if (cnr.startsWith('TNHC')) courtName = 'Madras High Court - Principal Seat (Chennai)';
        else if (cnr.startsWith('TNMD')) courtName = 'Madras High Court - Madurai Bench';
        else if (cnr.startsWith('TNCP')) courtName = 'Principal District & Sessions Court - Chengalpattu';
        else if (cnr.startsWith('TNKC')) courtName = 'Principal District & Sessions Court - Kancheepuram';
        else if (cnr.startsWith('TNCB')) courtName = 'Principal District & Sessions Court - Coimbatore';
        else if (cnr.startsWith('TNSL')) courtName = 'Principal District & Sessions Court - Salem';
        else if (cnr.startsWith('TNTR')) courtName = 'Principal District & Sessions Court - Tiruchirappalli';
        else if (cnr.startsWith('TNTN')) courtName = 'Principal District & Sessions Court - Tirunelveli';
    }

    if (!courtName) {
        const lower = text.toLowerCase();
        if (lower.includes('tiruvottiyur') || lower.includes('thiruvottiyur')) {
            courtName = 'Judicial Magistrate Court - Tiruvottiyur (Tiruvallur District)';
        } else if (lower.includes('madurai bench')) {
            courtName = 'Madras High Court - Madurai Bench';
        } else if (lower.includes('city civil') || lower.includes('high court campus')) {
            courtName = 'City Civil Court & Sessions Court - Chennai (HC Campus)';
        } else if (lower.includes('egmore') || lower.includes('cmm')) {
            courtName = 'Chief Metropolitan Magistrate Court - Egmore, Chennai';
        } else if (lower.includes('saidapet')) {
            courtName = 'Metropolitan Magistrate Courts Complex - Saidapet, Chennai';
        } else if (lower.includes('george town') || lower.includes('georgetown')) {
            courtName = 'Metropolitan Magistrate Courts Complex - George Town, Chennai';
        } else if (lower.includes('tiruvallur') || lower.includes('thiruvallur')) {
            courtName = 'Principal District & Sessions Court - Tiruvallur';
        } else if (lower.includes('chengalpattu') || lower.includes('chengalpet')) {
            courtName = 'Principal District & Sessions Court - Chengalpattu';
        } else if (lower.includes('kancheepuram') || lower.includes('kanchipuram')) {
            courtName = 'Principal District & Sessions Court - Kancheepuram';
        } else if (lower.includes('coimbatore')) {
            courtName = 'Principal District & Sessions Court - Coimbatore';
        } else {
            courtName = 'District & Sessions Court';
        }
    }

    // 9. FIR Details (if present)
    const firMatch = text.match(/(?:Police\s*Station\s*[:\-\s]?\s*)([^\n\r]+)/i);
    const firNumMatch = text.match(/(?:FIR\s*Number\s*[:\-\s]?\s*)([0-9]+)/i);
    const firYrMatch = text.match(/(?:Year\s*[:\-\s]?\s*)(20[12][0-9])/i);
    let firNotes = '';
    if (firMatch) {
        firNotes = `PS: ${firMatch[1].trim()}`;
        if (firNumMatch) firNotes += ` | FIR: ${firNumMatch[1].trim()}/${firYrMatch ? firYrMatch[1].trim() : ''}`;
    }

    // 10. Extract Case History (Multi-Hearing Rows)
    const hearings: Array<{ id: string; date: string; business: string; judge?: string; courtHall?: string }> = [];
    const lines = text.split('\n');
    for (const line of lines) {
        const rowMatch = line.match(/(?:Judicial\s*Magistrate|Judge|Metropolitan\s*Magistrate|\d+)\s*\|\s*([0-9\-]+)\s*\|\s*([0-9\-]+)\s*\|\s*([^\n\r]+)/i);
        if (rowMatch) {
            const bDate = parseIndianCourtDate(rowMatch[1]) || rowMatch[1];
            const nDate = parseIndianCourtDate(rowMatch[2]) || rowMatch[2];
            const purp = rowMatch[3].trim();
            hearings.push({
                id: `h_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                date: bDate,
                business: `Next Date: ${nDate} | Purpose: ${purp}`,
                judge: presidingJudge,
                courtHall,
            });
        }
    }

    // If no multi-rows parsed, create initial hearing
    if (hearings.length === 0) {
        hearings.push({
            id: 'h1',
            date: new Date().toISOString().split('T')[0],
            business: firNotes || 'Imported from eCourts record.',
            judge: presidingJudge,
            courtHall,
        });
    }

    // 11. Build Case Title
    const caseTitle = `${petitionerName} vs. ${respondentName}`;
    const safeCaseNo = caseNumber || (cnr ? `Case (${formatCNRDisplay(cnr)})` : 'New Court Matter');

    const result: ECourtsCaseResult = {
        cnr: cnr || `TNHC01${Date.now().toString().slice(-6)}2026`,
        caseNumber: safeCaseNo,
        caseTypeName,
        filingDate: parseIndianCourtDate(text.match(/Filing\s*Date\s*[:\-\s]?\s*([0-9A-Za-z\s\,\/\-]+)/i)?.[1]) || new Date().toISOString().split('T')[0],
        registrationDate: parseIndianCourtDate(text.match(/Registration\s*Date\s*[:\-\s]?\s*([0-9A-Za-z\s\,\/\-]+)/i)?.[1]),
        courtName,
        courtHall,
        presidingJudge,
        caseTitle,
        petitioner: {
            name: petitionerName,
            advocate: petitionerAdvocate || undefined,
        },
        respondent: {
            name: respondentName,
            advocate: respondentAdvocate || undefined,
        },
        caseCategory: caseTypeName.toLowerCase().includes('crl') || text.toLowerCase().includes('police') || text.toLowerCase().includes('magistrate') ? 'CRIMINAL' : 'CIVIL',
        stage: mapCourtStageToCaseStage(stage),
        status: 'ACTIVE',
        sections,
        nextHearing: nextHearingDate
            ? {
                  date: nextHearingDate,
                  purpose: nextHearingPurpose,
                  courtHall,
              }
            : undefined,
        hearings,
    };

    return {
        success: true,
        data: result,
        rawText,
    };
};

