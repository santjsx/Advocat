// Tamil Legal Domain Models & Tamil Nadu Judiciary Lexicon

import { PleadingType } from './Pleading';

export type TamilDocumentCategory =
    | 'CRIMINAL_FIR_COMPLAINT'        // முதல் தகவல் அறிக்கை / காவல் நிலைய புகார்
    | 'CIVIL_SALE_DEED_PROPERTY'       // கிரய பத்திரம் / தான செட்டில்மென்ட் / பாகப்பிரிவினை
    | 'REVENUE_PATTA_CHITTA'          // பட்டா / சிட்டா / அடங்கல் / புல வரைபடம்
    | 'CHEQUE_DISHONOUR_138'          // காசோலை & வங்கி மறுப்பு குறிப்பு (138 NI Act)
    | 'LEGAL_NOTICE_DEMAND'           // வழக்கறிஞர் அறிவிப்பு / நோட்டீஸ்
    | 'FAMILY_MATRIMONIAL'            // திருமண பதிவு / ஜீவனாம்சம் / குடும்ப வன்முறை
    | 'COURT_ORDER_JUDGMENT'          // கீழமை நீதிமன்ற உத்தரவு / தீர்ப்பு
    | 'GENERAL_LEGAL_DOCUMENT';       // இதர சட்ட ஆவணங்கள்

export interface TamilDocumentCategoryInfo {
    id: TamilDocumentCategory;
    tamilLabel: string;
    englishLabel: string;
    icon: string;
    description: string;
    suggestedPleadings: PleadingType[];
}

export const TAMIL_DOCUMENT_CATEGORIES: TamilDocumentCategoryInfo[] = [
    {
        id: 'CRIMINAL_FIR_COMPLAINT',
        tamilLabel: 'முதல் தகவல் அறிக்கை / புகார்',
        englishLabel: 'FIR / Police Complaint',
        icon: 'shield-alert-outline',
        description: 'First Information Report, Police Station complaint, or Remand report',
        suggestedPleadings: [
            'BNSS_482_ANTICIPATORY_BAIL',
            'BNSS_483_REGULAR_BAIL',
            'BNSS_528_QUASH_FIR',
            'BNSS_175_DIRECTION_REGISTER_FIR',
        ],
    },
    {
        id: 'CIVIL_SALE_DEED_PROPERTY',
        tamilLabel: 'கிரய பத்திரம் / சொத்து ஆவணம்',
        englishLabel: 'Sale / Settlement / Property Deed',
        icon: 'home-city-outline',
        description: 'Sale deed, settlement deed, partition deed, mortgage, or agreement of sale',
        suggestedPleadings: [
            'CIVIL_PLAINT_INJUNCTION',
            'CIVIL_PLAINT_SPECIFIC_PERFORMANCE',
            'CIVIL_PLAINT_PARTITION',
            'CIVIL_INJUNCTION_IA',
        ],
    },
    {
        id: 'CHEQUE_DISHONOUR_138',
        tamilLabel: 'காசோலை மறுப்பு (138 NI Act)',
        englishLabel: 'Cheque & Return Memo',
        icon: 'credit-card-outline',
        description: 'Dishonoured cheque, bank return memo, and debt transaction proof',
        suggestedPleadings: [
            'NI_138_STATUTORY_NOTICE',
            'NI_138_CHEQUE_BOUNCE',
            'NI_143A_INTERIM_COMPENSATION',
        ],
    },
    {
        id: 'LEGAL_NOTICE_DEMAND',
        tamilLabel: 'வழக்கறிஞர் நோட்டீஸ்',
        englishLabel: 'Legal Notice / Reply',
        icon: 'email-alert-outline',
        description: 'Statutory demand notice, Sec 80 CPC notice, or eviction notice',
        suggestedPleadings: [
            'REPLY_LEGAL_NOTICE',
            'LEGAL_NOTICE',
            'CIVIL_PLAINT_SPECIFIC_PERFORMANCE',
        ],
    },
    {
        id: 'REVENUE_PATTA_CHITTA',
        tamilLabel: 'பட்டா / சிட்டா / அடங்கல்',
        englishLabel: 'Patta / Revenue Records',
        icon: 'file-table-outline',
        description: 'Patta passbook, Chitta, Adangal, FMB sketch, or Town Survey records',
        suggestedPleadings: [
            'WRIT_MANDAMUS',
            'CIVIL_PLAINT_INJUNCTION',
            'CIVIL_PLAINT_DECLARATION_POSSESSION',
        ],
    },
    {
        id: 'FAMILY_MATRIMONIAL',
        tamilLabel: 'திருமணம் / குடும்ப வழக்கு',
        englishLabel: 'Family / Matrimonial Papers',
        icon: 'account-heart-outline',
        description: 'Marriage certificate, domestic complaint, or stridhan list',
        suggestedPleadings: [
            'FAMILY_MAINTENANCE_144_BNSS',
            'FAMILY_DIVORCE_PETITION',
            'FAMILY_RESTITUTION_CONJUGAL_RIGHTS',
            'FAMILY_DOMESTIC_VIOLENCE_12',
        ],
    },
    {
        id: 'COURT_ORDER_JUDGMENT',
        tamilLabel: 'நீதிமன்ற உத்தரவு / தீர்ப்பு',
        englishLabel: 'Court Order / Judgment',
        icon: 'gavel',
        description: 'Lower court interim order, dismissal, decree, or judgment copy',
        suggestedPleadings: [
            'CIVIL_REVISION_CRP',
            'BNSS_438_CRL_REVISION',
            'CIVIL_FIRST_APPEAL_AS',
            'CIVIL_CONDONE_DELAY_SEC_5',
        ],
    },
    {
        id: 'GENERAL_LEGAL_DOCUMENT',
        tamilLabel: 'இதர சட்ட ஆவணம்',
        englishLabel: 'General Document / Notes',
        icon: 'file-document-outline',
        description: 'Agreements, receipts, affidavits, or handwritten lawyer notes',
        suggestedPleadings: [
            'BNSS_483_REGULAR_BAIL',
            'CIVIL_PLAINT_INJUNCTION',
            'LEGAL_NOTICE',
        ],
    },
];

export interface ExtractedPropertyBoundary {
    north: string;
    south: string;
    east: string;
    west: string;
}

export interface ExtractedPropertySchedule {
    itemNo?: number;
    description: string;
    surveyNo: string;
    subDivision?: string;
    pattaNo?: string;
    extent: string;           // e.g. "1200 Sq. Ft" or "2 Acres 40 Cents"
    extentType?: 'SQ_FT' | 'CENT' | 'ACRE' | 'GROUND' | 'OTHER';
    village: string;
    taluk: string;
    district: string;
    registrationDistrict?: string;
    subRegistrarOffice?: string;
    boundaries: ExtractedPropertyBoundary;
    marketValue?: string;
}

export interface ExtractedCriminalFacts {
    crimeNo?: string;
    crimeYear?: string;
    policeStation?: string;
    district?: string;
    complainantName?: string;
    complainantRole?: string;
    accusedNames: string[];
    clientAccusedRank?: string;    // e.g. "A-1" or "Accused No. 2"
    allegedOffenceDate?: string;
    arrestDate?: string;
    remandDetails?: string;
    bnsSections: string[];        // Active BNS sections
    bnssSections: string[];       // Active BNSS sections
    legacyIpcCrpcSections?: string[];
    allegationSummary: string;
}

export interface ExtractedFinancialFacts {
    chequeNo?: string;
    chequeDate?: string;
    bankName?: string;
    branchName?: string;
    ifscCode?: string;
    amountNumeric?: number;
    amountInWords?: string;
    dishonourDate?: string;
    dishonourReason?: string;     // e.g. "Funds Insufficient"
    statutoryNoticeDate?: string;
    statutoryNoticeDeliveryDate?: string;
    transactionContext?: string;
}

export interface ExtractedParty {
    name: string;
    alias?: string;
    parentage?: string;          // e.g. "S/o Ramasamy"
    age?: number;
    occupation?: string;
    address: string;
    role: 'PETITIONER' | 'RESPONDENT' | 'COMPLAINANT' | 'ACCUSED' | 'DEFENDANT' | 'PLAINTIFF';
}

export interface TamilLegalExtractionResult {
    rawTamilText: string;
    category: TamilDocumentCategory;
    detectedDocumentTitleTamil: string;
    englishDocumentTitle: string;
    
    // Core English Translation
    fullEnglishTranslation: string;
    synopsisEnglish: string;
    
    // Structured Metadata
    parties: ExtractedParty[];
    propertySchedules?: ExtractedPropertySchedule[];
    criminalFacts?: ExtractedCriminalFacts;
    financialFacts?: ExtractedFinancialFacts;
    
    // Dates & Jurisdictions
    datesAndEvents: { date: string; event: string }[];
    courtTierSuggested?: string;
    suggestedPleadings: PleadingType[];
    
    // Quality & Confidence
    confidenceScore: number;     // 0 - 100
    processingTimestamp: string;
}

/**
 * Madras High Court & Tamil Nadu Legal Glossary
 * High-accuracy translation dictionary for Tamil court and property terminology
 */
export const TAMIL_LEGAL_GLOSSARY: Record<string, string> = {
    // Court & Procedural Roles
    'வாதி': 'Plaintiff / Petitioner',
    'பிரதிவாதி': 'Defendant / Respondent',
    'மனுதாரர்': 'Petitioner',
    'எதிர்மனுதாரர்': 'Respondent',
    'புகார்தாரர்': 'Complainant / Defacto Complainant',
    'குற்றவாளி': 'Accused',
    'முதல் எதிரி': 'Accused No. 1 (A-1)',
    'இரண்டாம் எதிரி': 'Accused No. 2 (A-2)',
    'அரசு தரப்பு': 'Prosecution / State represented by',
    'வழக்கறிஞர்': 'Advocate / Counsel on Record',
    'சாட்சி': 'Witness',
    'அசல்': 'Original / Principal',
    'நகல்': 'Copy / Certified Copy',

    // Property & Registration Deeds
    'கிரய பத்திரம்': 'Sale Deed',
    'அடமான பத்திரம்': 'Mortgage Deed',
    'தான செட்டில்மென்ட் பத்திரம்': 'Settlement Deed / Gift Deed',
    'பாகப்பிரிவினை பத்திரம்': 'Partition Deed',
    'விற்பனை ஒப்பந்தம்': 'Agreement of Sale',
    'குத்தகை ஒப்பந்தம்': 'Lease Agreement',
    'வாடகை ஒப்பந்தம்': 'Rental Agreement',
    'பிராமிசரி நோட்டு': 'Promissory Note',
    'பொது அதிகார பத்திரம்': 'General Power of Attorney (GPA)',
    'வில்லங்கச் சான்றிதழ்': 'Encumbrance Certificate (EC)',
    'வாரிசு சான்றிதழ்': 'Legal Heirship Certificate',
    'இறப்பு சான்றிதழ்': 'Death Certificate',
    'விடுதலை பத்திரம்': 'Release Deed',
    'சுவாதீனம்': 'Actual Physical Possession',
    'அனுபவ பாத்தியம்': 'Possessory Right / Enjoyment',

    // Revenue & Land Records
    'பட்டா': 'Patta (Revenue Record)',
    'சிட்டா': 'Chitta (Land Ownership Registry)',
    'அடங்கல்': 'Adangal (Crop & Land Cultivation Register)',
    'புல எண்': 'Survey Number',
    'உட்பிரிவு': 'Sub-division',
    'நன்செய்': 'Wet Land (Nanja Land)',
    'புன்செய்': 'Dry Land (Punja Land)',
    'நத்தம்': 'Grama Natham (Village Habitation Land)',
    'அட்டவணை சொத்து': 'Schedule of Property',
    'எல்லைகள்': 'Boundaries',
    'வடக்கு': 'North',
    'தெற்கு': 'South',
    'கிழக்கு': 'East',
    'மேற்கு': 'West',
    'சதுர அடி': 'Square Feet (Sq. Ft)',
    'சென்ட்': 'Cents',
    'ஏக்கர்': 'Acres',
    'குழி': 'Kuzhi',
    'கிரவுண்ட்': 'Ground (2,400 Sq. Ft)',

    // Criminal Procedure (BNSS / BNS)
    'முதல் தகவல் அறிக்கை': 'First Information Report (FIR)',
    'குற்றப்பத்திரிகை': 'Final Report / Charge Sheet',
    'கைது': 'Arrest',
    'காவல் நிலைய காவல்': 'Police Custody',
    'நீதிமன்ற காவல்': 'Judicial Remand / Custody',
    'முன்ஜாமீன்': 'Anticipatory Bail (Sec 482 BNSS)',
    'வழக்கமான ஜாமீன்': 'Regular Bail (Sec 483 BNSS)',
    'வழக்கு ரத்து': 'Quashing of Proceedings (Sec 528 BNSS)',
    'பிடியாணை': 'Warrant of Arrest / Non-Bailable Warrant (NBW)',
    'சம்மன்': 'Summons',
    'மறுப்பு அறிக்கை': 'Protest Petition',

    // Relatives / Demographics
    'மகன்': 'Son of (S/o)',
    'மகள்': 'Daughter of (D/o)',
    'மனைவி': 'Wife of (W/o)',
    'கணவர்': 'Husband of (H/o)',
    'வயது': 'Aged about',
    'முகவரி': 'Residing at',
    'கிராமம்': 'Village',
    'வட்டம்': 'Taluk',
    'மாவட்டம்': 'District',

    // Relief / Prayer
    'பரிகாரம்': 'Relief / Prayer',
    'தடை உத்தரவு': 'Order of Injunction / Restraining Order',
    'இடைக்கால தடை': 'Interim Stay / Temporary Injunction',
    'நிலுவை': 'Pending',
    'நட்டஈடு': 'Compensation / Damages',
    'ஜீவனாம்சம்': 'Maintenance',
};
