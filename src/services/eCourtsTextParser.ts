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
            message: 'Invalid Screenshot: No readable text found in image.',
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
    let caseTypeName = '';

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
            const shortMatch = text.match(/\b(Crl\.O\.P\.?|CRLMP|W\.P\.?|C\.M\.A\.?|Crl\.A\.?|Crl\.R\.C\.?|O\.S\.?|C\.C\.?|S\.C\.?|E\.P\.?|M\.C\.?|C\.R\.P\.?)\s*(?:No\.?)?\s*([0-9]+)\s*\/\s*(20[12][0-9])\b/i);
            if (shortMatch) {
                caseNumber = `${shortMatch[1].toUpperCase()} No. ${shortMatch[2]} / ${shortMatch[3]}`;
                caseTypeName = shortMatch[1];
            }
        }
    }

    // 3. Extract Petitioner Name & Advocate
    let petitionerName = '';
    let petitionerAdvocate = '';

    const petBlock = text.match(/(?:Petitioner(?:\s*and\s*Advocate(?:\s*Details)?)?\s*[:\-\s]*)([\s\S]*?)(?=Respondent|Act|FIR|Case History|Case Status|$)/i);
    if (petBlock && petBlock[1]) {
        const lines = petBlock[1].split('\n').map(l => l.trim()).filter(l => l && !l.toLowerCase().startsWith('qr code'));
        for (const line of lines) {
            const cleanLine = line.replace(/^\d+[\)\.\-]\s*/, '').trim();
            if (cleanLine && !cleanLine.toLowerCase().includes('advocate') && !petitionerName) {
                petitionerName = cleanLine;
            } else if (cleanLine.toLowerCase().includes('advocate') || cleanLine.toLowerCase().includes('bar')) {
                petitionerAdvocate = cleanLine.replace(/advocate\s*[:\-\s]*/i, '').trim();
            }
        }
    }

    if (!petitionerName) {
        const petMatch = text.match(/(?:Petitioner(?:\s*Details)?\s*[:\-\s]?\s*)(?:1\)\s*)?([^\n\r]+)/i);
        if (petMatch && petMatch[1]) {
            const clean = petMatch[1].replace(/Advocate[\s\-\:]+.*$/i, '').trim();
            if (clean && clean.toLowerCase() !== 'and advocate') {
                petitionerName = clean;
            }
        }
    }

    // 4. Extract Respondent Name & Advocate
    let respondentName = '';
    let respondentAdvocate = '';

    const respBlock = text.match(/(?:Respondent(?:\s*and\s*Advocate(?:\s*Details)?)?\s*[:\-\s]*)([\s\S]*?)(?=Act|FIR|Case History|Case Status|Under Act|$)/i);
    if (respBlock && respBlock[1]) {
        const lines = respBlock[1].split('\n').map(l => l.trim()).filter(l => l && !l.toLowerCase().startsWith('qr code'));
        for (const line of lines) {
            const cleanLine = line.replace(/^\d+[\)\.\-]\s*/, '').trim();
            if (cleanLine && !cleanLine.toLowerCase().includes('advocate') && !respondentName) {
                respondentName = cleanLine;
            } else if (cleanLine.toLowerCase().includes('advocate') || cleanLine.toLowerCase().includes('bar')) {
                respondentAdvocate = cleanLine.replace(/advocate\s*[:\-\s]*/i, '').trim();
            }
        }
    }

    // Quick check for "X vs. Y" format in raw text
    const vsMatch = text.match(/([A-Za-z0-9\.\s\,\&]+?)\s+(?:vs\.?|v\.|versus)\s+([A-Za-z0-9\.\s\,\&]+)/i);
    if (vsMatch && !petitionerName) {
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
        const smsDateMatch = text.match(/(?:Next\s*Date\s*[:\-\s]?\s*)([0-9]{1,2}[\-\/\.][0-9]{1,2}[\-\/\.][0-9]{2,4})/i);
        if (smsDateMatch && smsDateMatch[1]) {
            nextHearingDate = parseIndianCourtDate(smsDateMatch[1]);
        }
    }

    // 6. Purpose of Hearing & Case Stage
    const purpMatch = text.match(/(?:Purpose\s*(?:of\s*Hearing)?\s*[:\-\s]?\s*)([^\n\r]+)/i);
    if (purpMatch && purpMatch[1]) {
        nextHearingPurpose = purpMatch[1].trim();
    }

    let stage = 'Pleading / Appearance';
    const stageMatch = text.match(/(?:Case\s*Stage|Stage\s*of\s*Case)\s*[:\-\s]?\s*([^\n\r]+)/i);
    if (stageMatch && stageMatch[1]) {
        stage = stageMatch[1].trim();
    }

    // 7. Judge & Court Hall
    let presidingJudge: string | undefined;
    let courtHall: string | undefined;

    const judgeMatch = text.match(/(?:Court\s*Number\s*and\s*Judge|Coram|Hon'ble\s*Judge)\s*[:\-\s]?\s*([^\n\r]+)/i);
    if (judgeMatch && judgeMatch[1]) {
        const fullJudgeStr = judgeMatch[1].trim();
        if (fullJudgeStr.includes('-')) {
            const parts = fullJudgeStr.split('-');
            courtHall = parts[0].trim();
            presidingJudge = parts.slice(1).join('-').trim();
        } else {
            presidingJudge = fullJudgeStr;
        }
    }

    // 8. Sections & Acts
    const sections: Array<{ act: LegalActType; section: string; description?: string }> = [];

    const bnsMatches = text.matchAll(/(?:BNS|Bharatiya\s*Nyaya\s*Sanhita)(?:\s*-\s*|\s*Sec(?:tion)?\s*|\s*)([0-9]+[A-Za-z]?)(?:\(([0-9]+)\))?/gi);
    for (const match of bnsMatches) {
        const sec = match[2] ? `${match[1]}(${match[2]})` : match[1];
        if (!sections.some(s => s.act === 'BNS' && s.section === sec)) {
            sections.push({
                act: 'BNS',
                section: sec,
                description: `Section ${sec} of Bharatiya Nyaya Sanhita, 2023`,
            });
        }
    }

    const bnssMatches = text.matchAll(/(?:BNSS|Bharatiya\s*Nagarik\s*Suraksha\s*Sanhita)(?:\s*-\s*|\s*Sec(?:tion)?\s*|\s*)([0-9]+[A-Za-z]?)/gi);
    for (const match of bnssMatches) {
        if (!sections.some(s => s.act === 'BNSS' && s.section === match[1])) {
            sections.push({
                act: 'BNSS',
                section: match[1],
                description: `Section ${match[1]} of Bharatiya Nagarik Suraksha Sanhita, 2023`,
            });
        }
    }

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

    // 9. FIR Details (if present)
    let firDetails: { policeStation: string; firNumber: string; firYear: string } | undefined;
    const firMatch = text.match(/(?:Police\s*Station\s*[:\-\s]?\s*)([^\n\r]+)/i);
    const firNumMatch = text.match(/(?:FIR\s*Number|Crime\s*No\.?)\s*[:\-\s]?\s*([0-9]+)/i);
    const firYrMatch = text.match(/(?:Year\s*[:\-\s]?\s*)(20[12][0-9])/i);

    if (firMatch && firNumMatch) {
        firDetails = {
            policeStation: firMatch[1].trim(),
            firNumber: firNumMatch[1].trim(),
            firYear: firYrMatch ? firYrMatch[1].trim() : new Date().getFullYear().toString(),
        };
    }

    // 10. Determine Court Name
    let courtName = '';
    const firstLines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const headerLine = firstLines[0] || '';
    if (headerLine.toLowerCase().includes('magistrate') || headerLine.toLowerCase().includes('court') || headerLine.toLowerCase().includes('judge') || headerLine.toLowerCase().includes('high court')) {
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

    // STRICT REJECTION: If no CNR, no Case Number, no Petitioner, no Court Name, and no FIR were found,
    // this is 100% NOT a court case and must be rejected!
    const hasCoreEvidence = Boolean(
        cnr ||
        caseNumber ||
        (petitionerName && respondentName) ||
        (courtName && (petitionerName || caseNumber)) ||
        firDetails ||
        sections.length > 0
    );

    if (!hasCoreEvidence) {
        return {
            success: false,
            message: 'Invalid Screenshot: The uploaded image does not contain recognizable court case details, eCourts status, or judicial records. Please upload a valid case screenshot.',
            rawText,
        };
    }

    // Set fallbacks ONLY if genuine case evidence was proven
    if (!caseTypeName) {
        caseTypeName = text.toLowerCase().includes('crl') || firDetails ? 'Criminal Case' : 'Civil Case';
    }
    if (!petitionerName) {
        petitionerName = 'Petitioner';
    }
    if (!respondentName) {
        respondentName = 'Respondent / State';
    }
    if (!courtName) {
        courtName = 'Court of Competent Jurisdiction';
    }

    const caseTitle = `${petitionerName} vs. ${respondentName}`;
    const safeCaseNo = caseNumber || (cnr ? `CNR: ${formatCNRDisplay(cnr)}` : 'Court Case');

    const result: ECourtsCaseResult = {
        cnr: cnr || (cnrMatch ? cnrMatch[1] : ''),
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
        caseCategory: caseTypeName.toLowerCase().includes('crl') || firDetails || text.toLowerCase().includes('police') ? 'CRIMINAL' : 'CIVIL',
        stage: mapCourtStageToCaseStage(stage),
        status: 'ACTIVE',
        sections,
        firDetails,
        nextHearing: nextHearingDate
            ? {
                  date: nextHearingDate,
                  purpose: nextHearingPurpose,
                  courtHall,
              }
            : undefined,
        hearings: [],
    };

    return {
        success: true,
        data: result,
        rawText,
    };
};
