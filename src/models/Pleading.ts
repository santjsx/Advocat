// Tamil Nadu & Madras High Court Pleading and Paperbook Domain Models

export type CourtTier =
    | 'MADRAS_HC_CHENNAI'       // Madras High Court (Principal Seat, Chennai)
    | 'MADRAS_HC_MADURAI'       // Madras High Court (Madurai Bench)
    | 'DISTRICT_SESSIONS'       // Principal District and Sessions Court
    | 'SPECIAL_COURT_POCSO'     // Special Court for POCSO Act Cases
    | 'SPECIAL_COURT_NDPS'      // Special Court for EC & NDPS Act Cases
    | 'SPECIAL_COURT_CBI'       // Special Court for CBI Cases
    | 'SPECIAL_COURT_SCST'      // Special Court for SC/ST (POA) Act Cases
    | 'SPECIAL_COURT_DVAC'      // Special Court for Vigilance & Anti-Corruption Cases
    | 'MAGISTRATE_CMM'          // Chief Metropolitan Magistrate (Chennai)
    | 'MAGISTRATE_CJM'          // Chief Judicial Magistrate
    | 'MAGISTRATE_JM'           // Judicial Magistrate Court
    | 'SUB_COURT'               // Subordinate Judge / Assistant Sessions Court
    | 'FAMILY_COURT'            // Family Court
    | 'MACT_TRIBUNAL'           // Motor Accidents Claims Tribunal
    | 'COMMERCIAL_COURT'        // Commercial Court / Commercial Division
    | 'OTHER_TRIBUNAL';         // Other Court / Tribunal

export interface CourtTierInfo {
    value: CourtTier;
    label: string;
    shortName: string;
    city: string;
    headerTitle: string;
    isHighCourt: boolean;
}

export const COURT_TIERS: CourtTierInfo[] = [
    {
        value: 'MADRAS_HC_CHENNAI',
        label: 'Madras High Court (Principal Seat, Chennai)',
        shortName: 'High Court, Chennai',
        city: 'Chennai',
        headerTitle: "IN THE HIGH COURT OF JUDICATURE AT MADRAS\n(Criminal / Writ / Appellate Jurisdiction)",
        isHighCourt: true,
    },
    {
        value: 'MADRAS_HC_MADURAI',
        label: 'Madras High Court (Madurai Bench)',
        shortName: 'High Court, Madurai Bench',
        city: 'Madurai',
        headerTitle: "IN THE HIGH COURT OF JUDICATURE AT MADRAS\n(BEFORE THE MADURAI BENCH OF MADRAS HIGH COURT)",
        isHighCourt: true,
    },
    {
        value: 'DISTRICT_SESSIONS',
        label: 'Principal District & Sessions Court',
        shortName: 'Sessions Court',
        city: 'District Headquarters',
        headerTitle: "IN THE COURT OF THE PRINCIPAL DISTRICT AND SESSIONS JUDGE",
        isHighCourt: false,
    },
    {
        value: 'SPECIAL_COURT_POCSO',
        label: 'Special Court for POCSO Act Cases',
        shortName: 'Special POCSO Court',
        city: 'District Headquarters',
        headerTitle: "IN THE SPECIAL COURT FOR EXCLUSIVE TRIAL OF CASES UNDER POCSO ACT",
        isHighCourt: false,
    },
    {
        value: 'SPECIAL_COURT_NDPS',
        label: 'Special Court for EC & NDPS Act Cases',
        shortName: 'Special NDPS Court',
        city: 'District Headquarters',
        headerTitle: "IN THE SPECIAL COURT FOR EC & NDPS ACT CASES",
        isHighCourt: false,
    },
    {
        value: 'SPECIAL_COURT_SCST',
        label: 'Special Court for SC/ST (POA) Act Cases',
        shortName: 'Special SC/ST Court',
        city: 'District Headquarters',
        headerTitle: "IN THE SPECIAL COURT FOR EXCLUSIVE TRIAL OF CASES UNDER SC/ST (POA) ACT",
        isHighCourt: false,
    },
    {
        value: 'SPECIAL_COURT_CBI',
        label: 'Special Court for CBI Cases',
        shortName: 'Special CBI Court',
        city: 'Chennai / Madurai / Coimbatore',
        headerTitle: "IN THE COURT OF THE PRINCIPAL SPECIAL JUDGE FOR CBI CASES",
        isHighCourt: false,
    },
    {
        value: 'SPECIAL_COURT_DVAC',
        label: 'Special Court for DVAC (Vig. & Anti-Corruption)',
        shortName: 'Special DVAC Court',
        city: 'District Headquarters',
        headerTitle: "IN THE SPECIAL COURT FOR CASES UNDER PREVENTION OF CORRUPTION ACT",
        isHighCourt: false,
    },
    {
        value: 'MAGISTRATE_CMM',
        label: 'Chief Metropolitan Magistrate (Chennai)',
        shortName: 'CMM Court, Chennai',
        city: 'Chennai (Egmore / George Town / Saidapet)',
        headerTitle: "IN THE COURT OF THE CHIEF METROPOLITAN MAGISTRATE",
        isHighCourt: false,
    },
    {
        value: 'MAGISTRATE_CJM',
        label: 'Chief Judicial Magistrate',
        shortName: 'CJM Court',
        city: 'District Headquarters',
        headerTitle: "IN THE COURT OF THE CHIEF JUDICIAL MAGISTRATE",
        isHighCourt: false,
    },
    {
        value: 'MAGISTRATE_JM',
        label: 'Judicial Magistrate / District Munsif Court',
        shortName: 'Judicial Magistrate',
        city: 'Taluk / Combined Court Complex',
        headerTitle: "IN THE COURT OF THE JUDICIAL MAGISTRATE",
        isHighCourt: false,
    },
    {
        value: 'SUB_COURT',
        label: 'Subordinate Court (Sub Court / Asst. Sessions)',
        shortName: 'Sub Court',
        city: 'Taluk / District Complex',
        headerTitle: "IN THE COURT OF THE SUBORDINATE JUDGE",
        isHighCourt: false,
    },
    {
        value: 'FAMILY_COURT',
        label: 'Family Court',
        shortName: 'Family Court',
        city: 'District Headquarters',
        headerTitle: "IN THE FAMILY COURT",
        isHighCourt: false,
    },
    {
        value: 'MACT_TRIBUNAL',
        label: 'Motor Accidents Claims Tribunal (MACT)',
        shortName: 'MACT Tribunal',
        city: 'District / Sub Court',
        headerTitle: "IN THE MOTOR ACCIDENTS CLAIMS TRIBUNAL",
        isHighCourt: false,
    },
    {
        value: 'COMMERCIAL_COURT',
        label: 'Commercial Court / Commercial Division',
        shortName: 'Commercial Court',
        city: 'Chennai / District Complex',
        headerTitle: "IN THE COMMERCIAL COURT",
        isHighCourt: false,
    },
];

export type PleadingCategory =
    | 'CRIMINAL_BAIL'
    | 'CRIMINAL_QUASH'
    | 'CRIMINAL_APPEAL_REVISION'
    | 'CRIMINAL_TRIAL_MOTION'
    | 'HIGH_COURT_WRIT'
    | 'CIVIL_SUIT_PLAINT'
    | 'CIVIL_INTERLOCUTORY_IA'
    | 'CIVIL_APPEAL_REVISION'
    | 'FAMILY_MATRIMONIAL'
    | 'COMMERCIAL_NI_ACT'
    | 'ARBITRATION_IBC'
    | 'MACT_CONSUMER'
    | 'LEGAL_NOTICE_DEED';

export interface PleadingCategoryInfo {
    value: PleadingCategory;
    label: string;
    icon: string;
    description: string;
}

export const PLEADING_CATEGORIES: PleadingCategoryInfo[] = [
    { value: 'CRIMINAL_BAIL', label: 'Bail & Pre-Trial Liberty (BNSS)', icon: 'shield-account', description: 'Regular, Anticipatory, Magistrate & Interim Bail' },
    { value: 'CRIMINAL_QUASH', label: 'Quashing & Inherent Powers (Sec 528)', icon: 'cancel', description: 'Quash FIR, Chargesheet, NBW Recall & Directions' },
    { value: 'CRIMINAL_APPEAL_REVISION', label: 'Criminal Appeals & Revisions', icon: 'gavel', description: 'Crl.A, Crl.R.C., Sentence Suspension' },
    { value: 'CRIMINAL_TRIAL_MOTION', label: 'Criminal Trial Petitions', icon: 'file-document-edit', description: 'Discharge, Witness Recall, Return of Property' },
    { value: 'HIGH_COURT_WRIT', label: 'High Court Writs (Art 226/227)', icon: 'bank', description: 'Mandamus, Certiorari, Habeas Corpus, WMP Stays' },
    { value: 'CIVIL_SUIT_PLAINT', label: 'Civil Suits & Plaints (CPC)', icon: 'book-open-page-variant', description: 'Injunction, Specific Performance, Partition, Suits' },
    { value: 'CIVIL_INTERLOCUTORY_IA', label: 'Civil Interlocutory Apps (I.A.)', icon: 'format-list-checks', description: 'Order 39 Injunction, Rejection of Plaint, Delay' },
    { value: 'CIVIL_APPEAL_REVISION', label: 'Civil Appeals & Revisions (A.S./C.R.P.)', icon: 'file-tree', description: 'First Appeal, Second Appeal, CRP, Execution EP' },
    { value: 'FAMILY_MATRIMONIAL', label: 'Family & Matrimonial Law', icon: 'account-multiple', description: 'Divorce, Maintenance, Restitution, DV Act' },
    { value: 'COMMERCIAL_NI_ACT', label: 'Cheque Bounce (Sec 138) & Commercial', icon: 'cash-multiple', description: 'NI Act Complaints, 138 Notices, Commercial Suits' },
    { value: 'ARBITRATION_IBC', label: 'Arbitration & IBC Insolvency', icon: 'domain', description: 'Sec 9/11/34 Petitions, NCLT Insolvency' },
    { value: 'MACT_CONSUMER', label: 'Motor Accident Claims (MACT) & Consumer', icon: 'car-emergency', description: 'MACT Claims, Consumer Commission Complaints' },
    { value: 'LEGAL_NOTICE_DEED', label: 'Legal Notices, Vakalat & Memos', icon: 'email-seal', description: 'Demand Notices, Vakalatnama, Settlement Memos' },
];

export type PleadingType =
    // 1. Criminal Bail & Liberty
    | 'BNSS_483_REGULAR_BAIL'
    | 'BNSS_482_ANTICIPATORY_BAIL'
    | 'BNSS_480_MAGISTRATE_BAIL'
    | 'BNSS_INTERIM_BAIL'
    | 'BNSS_RELAX_BAIL_CONDITIONS'
    | 'BNSS_CANCEL_BAIL'
    | 'BNSS_SURRENDER_BAIL'
    | 'BNSS_TRANSIT_BAIL'

    // 2. Criminal Quashing & Inherent Powers
    | 'BNSS_528_QUASH_FIR'
    | 'BNSS_528_QUASH_PRIVATE_COMPLAINT'
    | 'BNSS_72_RECALL_NBW'
    | 'BNSS_528_SPEEDY_TRIAL_DIRECTION'
    | 'BNSS_175_DIRECTION_REGISTER_FIR'
    | 'BNSS_447_TRANSFER_INVESTIGATION'

    // 3. Criminal Appeals, Revisions & Trial Motions
    | 'BNSS_415_CRL_APPEAL'
    | 'BNSS_419_APPEAL_ACQUITTAL'
    | 'BNSS_438_CRL_REVISION'
    | 'BNSS_430_SUSPENSION_SENTENCE'
    | 'BNSS_250_DISCHARGE_PETITION'
    | 'BNSS_348_RECALL_WITNESS'
    | 'BNSS_94_PRODUCTION_DOCUMENTS'
    | 'BNSS_355_DISPENSE_APPEARANCE'
    | 'BNSS_497_RETURN_PROPERTY'
    | 'BNSS_359_COMPOUNDING_OFFENCE'
    | 'BNSS_PROTEST_PETITION'

    // 4. High Court Constitutional Writs (Art 226/227)
    | 'WRIT_MANDAMUS'
    | 'WRIT_CERTIORARI'
    | 'WRIT_CERTIORARIFIED_MANDAMUS'
    | 'WRIT_HABEAS_CORPUS'
    | 'WRIT_PROHIBITION'
    | 'WRIT_QUO_WARRANTO'
    | 'WRIT_PIL'
    | 'WMP_INTERIM_STAY'
    | 'WMP_INTERIM_INJUNCTION'
    | 'WMP_VACATE_STAY'
    | 'WMP_IMPLEAD_PETITION'
    | 'CONTEMPT_PETITION'

    // 5. Civil Suits & Plaints (CPC 1908)
    | 'CIVIL_PLAINT_INJUNCTION'
    | 'CIVIL_PLAINT_SPECIFIC_PERFORMANCE'
    | 'CIVIL_PLAINT_PARTITION'
    | 'CIVIL_PLAINT_DECLARATION_POSSESSION'
    | 'CIVIL_PLAINT_MONEY_SUIT'
    | 'CIVIL_PLAINT_CANCEL_DEED'
    | 'CIVIL_WRITTEN_STATEMENT'
    | 'CIVIL_COUNTER_CLAIM'

    // 6. Civil Interlocutory Applications (I.A.)
    | 'CIVIL_INJUNCTION_IA'
    | 'CIVIL_REJECTION_PLAINT_7_11'
    | 'CIVIL_ATTACHMENT_BEFORE_JUDGMENT'
    | 'CIVIL_ADVOCATE_COMMISSIONER'
    | 'CIVIL_AMENDMENT_PLEADINGS'
    | 'CIVIL_SET_ASIDE_EXPARTE'
    | 'CIVIL_CONDONE_DELAY_SEC_5'
    | 'CIVIL_CAVEAT_PETITION'

    // 7. Civil Appeals, Revisions & Execution
    | 'CIVIL_FIRST_APPEAL_AS'
    | 'CIVIL_SECOND_APPEAL_SA'
    | 'CIVIL_REVISION_CRP'
    | 'CIVIL_MISC_APPEAL_CMA'
    | 'CIVIL_EXECUTION_PETITION_EP'

    // 8. Family & Matrimonial
    | 'FAMILY_DIVORCE_PETITION'
    | 'FAMILY_MUTUAL_CONSENT_DIVORCE'
    | 'FAMILY_RESTITUTION_CONJUGAL_RIGHTS'
    | 'FAMILY_INTERIM_MAINTENANCE_24'
    | 'FAMILY_MAINTENANCE_144_BNSS'
    | 'FAMILY_CHILD_CUSTODY_PETITION'
    | 'FAMILY_DOMESTIC_VIOLENCE_12'

    // 9. Commercial & Cheque Bounce
    | 'NI_138_CHEQUE_BOUNCE'
    | 'NI_138_STATUTORY_NOTICE'
    | 'NI_143A_INTERIM_COMPENSATION'
    | 'COMMERCIAL_SUIT_PLAINT'

    // 10. Arbitration & Insolvency
    | 'ARB_SEC_9_INTERIM_MEASURES'
    | 'ARB_SEC_11_APPOINT_ARBITRATOR'
    | 'ARB_SEC_34_SET_ASIDE_AWARD'
    | 'IBC_NCLT_INSOLVENCY_PETITION'

    // 11. MACT & Consumer
    | 'MACT_CLAIM_PETITION_166'
    | 'CONSUMER_COMPLAINT_35'

    // 12. Legal Notices & Memos
    | 'LEGAL_NOTICE'
    | 'REPLY_LEGAL_NOTICE'
    | 'VAKALATNAMA_HIGH_COURT'
    | 'VAKALATNAMA_SUBORDINATE'
    | 'JOINT_COMPROMISE_MEMO'
    | 'CUSTOM_PLEADING';

export interface PleadingTypeInfo {
    value: PleadingType;
    label: string;
    category: PleadingCategory;
    statutoryRef: string;
    oldRef?: string;
    description: string;
    recommendedTier: CourtTier;
    requiresAffidavit: boolean;
    requiresVakalat: boolean;
}

export const PLEADING_TYPES: PleadingTypeInfo[] = [
    // 1. Criminal Bail & Liberty
    {
        value: 'BNSS_483_REGULAR_BAIL',
        label: 'Regular Bail Petition',
        category: 'CRIMINAL_BAIL',
        statutoryRef: 'Section 483 BNSS, 2023',
        oldRef: 'Formerly Section 439 Cr.P.C.',
        description: 'Bail petition before High Court or Sessions Court for an accused in judicial custody.',
        recommendedTier: 'MADRAS_HC_CHENNAI',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'BNSS_482_ANTICIPATORY_BAIL',
        label: 'Anticipatory Bail Petition',
        category: 'CRIMINAL_BAIL',
        statutoryRef: 'Section 482 BNSS, 2023',
        oldRef: 'Formerly Section 438 Cr.P.C.',
        description: 'Pre-arrest bail petition seeking direction in the event of apprehension of arrest.',
        recommendedTier: 'MADRAS_HC_CHENNAI',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'BNSS_480_MAGISTRATE_BAIL',
        label: 'Magistrate Bail Petition',
        category: 'CRIMINAL_BAIL',
        statutoryRef: 'Section 480 BNSS, 2023',
        oldRef: 'Formerly Section 437 Cr.P.C.',
        description: 'Bail petition for bailable/non-bailable offences before the Judicial Magistrate Court.',
        recommendedTier: 'MAGISTRATE_JM',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'BNSS_INTERIM_BAIL',
        label: 'Interim / Medical Bail Application',
        category: 'CRIMINAL_BAIL',
        statutoryRef: 'Section 483 / 480 BNSS, 2023',
        oldRef: 'Formerly Section 439 / 437 Cr.P.C.',
        description: 'Urgent temporary bail application on grave medical emergencies or urgent family grounds.',
        recommendedTier: 'MADRAS_HC_CHENNAI',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'BNSS_RELAX_BAIL_CONDITIONS',
        label: 'Relaxation / Modification of Bail Conditions',
        category: 'CRIMINAL_BAIL',
        statutoryRef: 'Section 483(2) / 480(5) BNSS, 2023',
        oldRef: 'Formerly Section 439(1)(b) Cr.P.C.',
        description: 'Petition to relax or modify onerous daily/weekly police station signature conditions.',
        recommendedTier: 'MADRAS_HC_CHENNAI',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'BNSS_CANCEL_BAIL',
        label: 'Cancellation of Bail Application',
        category: 'CRIMINAL_BAIL',
        statutoryRef: 'Section 483(3) / 480(5) BNSS, 2023',
        oldRef: 'Formerly Section 439(2) Cr.P.C.',
        description: 'Application for cancellation of bail due to breach of conditions or witness tampering.',
        recommendedTier: 'MADRAS_HC_CHENNAI',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'BNSS_SURRENDER_BAIL',
        label: 'Surrender and Bail Petition',
        category: 'CRIMINAL_BAIL',
        statutoryRef: 'Section 480 BNSS r/w Criminal Rules of Practice',
        oldRef: 'Formerly Section 437 Cr.P.C.',
        description: 'Petition to surrender directly before the learned Magistrate and move for immediate bail.',
        recommendedTier: 'MAGISTRATE_JM',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'BNSS_TRANSIT_BAIL',
        label: 'Transit Anticipatory Bail Petition',
        category: 'CRIMINAL_BAIL',
        statutoryRef: 'Section 482 BNSS / Art 226',
        oldRef: 'Formerly Section 438 Cr.P.C.',
        description: 'Transit bail petition to enable approaching jurisdictional court in another state/district.',
        recommendedTier: 'MADRAS_HC_CHENNAI',
        requiresAffidavit: true,
        requiresVakalat: true,
    },

    // 2. Criminal Quashing & Inherent Powers
    {
        value: 'BNSS_528_QUASH_FIR',
        label: 'Quash Petition (Crl.O.P.) - FIR / Chargesheet',
        category: 'CRIMINAL_QUASH',
        statutoryRef: 'Section 528 BNSS, 2023',
        oldRef: 'Formerly Section 482 Cr.P.C.',
        description: 'Inherent powers petition before High Court to quash FIR, Charge Sheet, CC, or PRC proceedings.',
        recommendedTier: 'MADRAS_HC_CHENNAI',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'BNSS_528_QUASH_PRIVATE_COMPLAINT',
        label: 'Quash of Private Complaint (S.T.C. / C.C.)',
        category: 'CRIMINAL_QUASH',
        statutoryRef: 'Section 528 BNSS, 2023',
        oldRef: 'Formerly Section 482 Cr.P.C.',
        description: 'Quash of private complaint pending before Magistrate Court due to absence of prima facie case.',
        recommendedTier: 'MADRAS_HC_CHENNAI',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'BNSS_72_RECALL_NBW',
        label: 'Recall Non-Bailable Warrant (NBW) Application',
        category: 'CRIMINAL_QUASH',
        statutoryRef: 'Section 72 BNSS, 2023',
        oldRef: 'Formerly Section 70(2) Cr.P.C.',
        description: 'Application before trial court to recall Non-Bailable Warrant issued due to non-appearance.',
        recommendedTier: 'MAGISTRATE_JM',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'BNSS_528_SPEEDY_TRIAL_DIRECTION',
        label: 'Direction Petition for Speedy Investigation / Trial',
        category: 'CRIMINAL_QUASH',
        statutoryRef: 'Section 528 BNSS, 2023 / Art 21',
        oldRef: 'Formerly Section 482 Cr.P.C.',
        description: 'High Court direction to police/trial court to complete investigation/trial within fixed timeframe.',
        recommendedTier: 'MADRAS_HC_CHENNAI',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'BNSS_175_DIRECTION_REGISTER_FIR',
        label: 'Direction Petition to Register FIR',
        category: 'CRIMINAL_QUASH',
        statutoryRef: 'Section 175(3) BNSS, 2023',
        oldRef: 'Formerly Section 156(3) Cr.P.C.',
        description: 'Petition seeking direction to the respondent police to register an FIR on a cognizable complaint.',
        recommendedTier: 'MAGISTRATE_JM',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'BNSS_447_TRANSFER_INVESTIGATION',
        label: 'Transfer of Criminal Investigation Petition',
        category: 'CRIMINAL_QUASH',
        statutoryRef: 'Section 447 / 448 BNSS / Art 226',
        oldRef: 'Formerly Section 407 Cr.P.C.',
        description: 'Petition to transfer investigation from local police to CBCID / specialized agency.',
        recommendedTier: 'MADRAS_HC_CHENNAI',
        requiresAffidavit: true,
        requiresVakalat: true,
    },

    // 3. Criminal Appeals, Revisions & Trial Motions
    {
        value: 'BNSS_415_CRL_APPEAL',
        label: 'Criminal Appeal (Crl.A.) - Against Conviction',
        category: 'CRIMINAL_APPEAL_REVISION',
        statutoryRef: 'Section 415 BNSS, 2023',
        oldRef: 'Formerly Section 374 Cr.P.C.',
        description: 'Statutory criminal appeal against judgment of conviction and sentence of imprisonment.',
        recommendedTier: 'MADRAS_HC_CHENNAI',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'BNSS_419_APPEAL_ACQUITTAL',
        label: 'Criminal Appeal against Acquittal',
        category: 'CRIMINAL_APPEAL_REVISION',
        statutoryRef: 'Section 419 BNSS, 2023',
        oldRef: 'Formerly Section 378 Cr.P.C.',
        description: 'Appeal by complainant / state against order of acquittal rendered by trial court.',
        recommendedTier: 'MADRAS_HC_CHENNAI',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'BNSS_438_CRL_REVISION',
        label: 'Criminal Revision Case (Crl.R.C.)',
        category: 'CRIMINAL_APPEAL_REVISION',
        statutoryRef: 'Section 438 & 442 BNSS, 2023',
        oldRef: 'Formerly Section 397 & 401 Cr.P.C.',
        description: 'Revision challenging legality, correctness, or propriety of a lower court order or finding.',
        recommendedTier: 'MADRAS_HC_CHENNAI',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'BNSS_430_SUSPENSION_SENTENCE',
        label: 'Suspension of Sentence & Bail Pending Appeal',
        category: 'CRIMINAL_APPEAL_REVISION',
        statutoryRef: 'Section 430 BNSS, 2023',
        oldRef: 'Formerly Section 389(1) Cr.P.C.',
        description: 'Petition to suspend execution of sentence and release the appellant on bail pending appeal.',
        recommendedTier: 'MADRAS_HC_CHENNAI',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'BNSS_250_DISCHARGE_PETITION',
        label: 'Discharge Petition before Trial Court',
        category: 'CRIMINAL_TRIAL_MOTION',
        statutoryRef: 'Section 250 / 262 BNSS, 2023',
        oldRef: 'Formerly Section 227 / 239 Cr.P.C.',
        description: 'Petition for discharge of accused prior to framing of charges due to lack of sufficient grounds.',
        recommendedTier: 'DISTRICT_SESSIONS',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'BNSS_348_RECALL_WITNESS',
        label: 'Recall & Re-examination of Witnesses',
        category: 'CRIMINAL_TRIAL_MOTION',
        statutoryRef: 'Section 348 BNSS, 2023',
        oldRef: 'Formerly Section 311 Cr.P.C.',
        description: 'Application to summon or recall and re-examine essential witnesses or cross-examine PW/DW.',
        recommendedTier: 'MAGISTRATE_JM',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'BNSS_94_PRODUCTION_DOCUMENTS',
        label: 'Production of Documents / Call Records (Sec 94)',
        category: 'CRIMINAL_TRIAL_MOTION',
        statutoryRef: 'Section 94 BNSS, 2023',
        oldRef: 'Formerly Section 91 Cr.P.C.',
        description: 'Petition to direct production of electronic records, CDRs, CCTV footage, or essential documents.',
        recommendedTier: 'MAGISTRATE_JM',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'BNSS_355_DISPENSE_APPEARANCE',
        label: 'Dispense with Personal Appearance (Sec 355)',
        category: 'CRIMINAL_TRIAL_MOTION',
        statutoryRef: 'Section 355 BNSS, 2023',
        oldRef: 'Formerly Section 205 / 317 Cr.P.C.',
        description: 'Application to dispense with the personal attendance of the accused represented by counsel.',
        recommendedTier: 'MAGISTRATE_JM',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'BNSS_497_RETURN_PROPERTY',
        label: 'Return of Vehicle / Seized Property Application',
        category: 'CRIMINAL_TRIAL_MOTION',
        statutoryRef: 'Section 497 & 503 BNSS, 2023',
        oldRef: 'Formerly Section 451 & 457 Cr.P.C.',
        description: 'Application for interim custody and return of seized motor vehicle, cash, or property.',
        recommendedTier: 'MAGISTRATE_JM',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'BNSS_359_COMPOUNDING_OFFENCE',
        label: 'Compounding of Offences Joint Application',
        category: 'CRIMINAL_TRIAL_MOTION',
        statutoryRef: 'Section 359 BNSS, 2023',
        oldRef: 'Formerly Section 320 Cr.P.C.',
        description: 'Joint petition by complainant and accused for compounding compoundable criminal offences.',
        recommendedTier: 'MAGISTRATE_JM',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'BNSS_PROTEST_PETITION',
        label: 'Protest Petition Against Police Final Report',
        category: 'CRIMINAL_TRIAL_MOTION',
        statutoryRef: 'Section 193 BNSS r/w Criminal Rules of Practice',
        oldRef: 'Formerly Section 173(2) Cr.P.C.',
        description: 'Protest petition by victim/defacto complainant objecting to police closure / negative report.',
        recommendedTier: 'MAGISTRATE_JM',
        requiresAffidavit: true,
        requiresVakalat: true,
    },

    // 4. High Court Constitutional Writs (Art 226/227)
    {
        value: 'WRIT_MANDAMUS',
        label: 'Writ of Mandamus (W.P.)',
        category: 'HIGH_COURT_WRIT',
        statutoryRef: 'Article 226 of Constitution of India',
        description: 'High Court writ petition compelling public officials / authorities to perform statutory duties.',
        recommendedTier: 'MADRAS_HC_CHENNAI',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'WRIT_CERTIORARI',
        label: 'Writ of Certiorari (W.P.)',
        category: 'HIGH_COURT_WRIT',
        statutoryRef: 'Article 226 of Constitution of India',
        description: 'High Court writ petition to quash illegal G.O., impugned administrative or quasi-judicial orders.',
        recommendedTier: 'MADRAS_HC_CHENNAI',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'WRIT_CERTIORARIFIED_MANDAMUS',
        label: 'Writ of Certiorarified Mandamus (W.P.)',
        category: 'HIGH_COURT_WRIT',
        statutoryRef: 'Article 226 of Constitution of India',
        description: 'Combined writ petition to quash an impugned rejection order and direct grant of legal relief.',
        recommendedTier: 'MADRAS_HC_CHENNAI',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'WRIT_HABEAS_CORPUS',
        label: 'Writ of Habeas Corpus (H.C.P.)',
        category: 'HIGH_COURT_WRIT',
        statutoryRef: 'Article 226 of Constitution of India',
        description: 'Writ petition for production and liberation of persons in illegal police/private custody or detention.',
        recommendedTier: 'MADRAS_HC_CHENNAI',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'WRIT_PROHIBITION',
        label: 'Writ of Prohibition (W.P.)',
        category: 'HIGH_COURT_WRIT',
        statutoryRef: 'Article 226 of Constitution of India',
        description: 'Writ petition prohibiting a lower authority or tribunal from continuing proceedings without jurisdiction.',
        recommendedTier: 'MADRAS_HC_CHENNAI',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'WRIT_QUO_WARRANTO',
        label: 'Writ of Quo Warranto (W.P.)',
        category: 'HIGH_COURT_WRIT',
        statutoryRef: 'Article 226 of Constitution of India',
        description: 'Writ challenging an individual usurping or holding public office without statutory qualifications.',
        recommendedTier: 'MADRAS_HC_CHENNAI',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'WRIT_PIL',
        label: 'Public Interest Litigation (PIL)',
        category: 'HIGH_COURT_WRIT',
        statutoryRef: 'Article 226 of Constitution of India',
        description: 'Pro bono publico writ petition seeking judicial intervention on environmental or public welfare issues.',
        recommendedTier: 'MADRAS_HC_CHENNAI',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'WMP_INTERIM_STAY',
        label: 'W.M.P. for Interim Stay',
        category: 'HIGH_COURT_WRIT',
        statutoryRef: 'Article 226 r/w Madras High Court Writ Rules',
        description: 'Miscellaneous petition in Writ for grant of ad-interim stay of impugned proceedings.',
        recommendedTier: 'MADRAS_HC_CHENNAI',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'WMP_INTERIM_INJUNCTION',
        label: 'W.M.P. for Interim Injunction',
        category: 'HIGH_COURT_WRIT',
        statutoryRef: 'Article 226 r/w Madras High Court Writ Rules',
        description: 'Miscellaneous petition for interim restraining injunction against authorities.',
        recommendedTier: 'MADRAS_HC_CHENNAI',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'WMP_VACATE_STAY',
        label: 'W.M.P. to Vacate Interim Stay',
        category: 'HIGH_COURT_WRIT',
        statutoryRef: 'Article 226(3) of Constitution of India',
        description: 'Respondent application seeking immediate vacation of ex-parte interim stay.',
        recommendedTier: 'MADRAS_HC_CHENNAI',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'WMP_IMPLEAD_PETITION',
        label: 'W.M.P. for Impleading Third Party / Proper Party',
        category: 'HIGH_COURT_WRIT',
        statutoryRef: 'Order 1 Rule 10 C.P.C. r/w Writ Rules',
        description: 'Application to implead necessary or proper parties to the writ proceedings.',
        recommendedTier: 'MADRAS_HC_CHENNAI',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'CONTEMPT_PETITION',
        label: 'Contempt of Court Petition (Cont.P.)',
        category: 'HIGH_COURT_WRIT',
        statutoryRef: 'Section 11 & 12 Contempt of Courts Act, 1971 / Art 215',
        description: 'Contempt petition against authorities for willful disobedience of High Court orders and directions.',
        recommendedTier: 'MADRAS_HC_CHENNAI',
        requiresAffidavit: true,
        requiresVakalat: true,
    },

    // 5. Civil Suits & Plaints (CPC 1908)
    {
        value: 'CIVIL_PLAINT_INJUNCTION',
        label: 'Plaint for Permanent & Mandatory Injunction',
        category: 'CIVIL_SUIT_PLAINT',
        statutoryRef: 'Order 7 Rule 1 C.P.C. r/w Sec 38 Specific Relief Act',
        description: 'Civil plaint praying for permanent injunction restraining defendants from interfering with possession.',
        recommendedTier: 'DISTRICT_SESSIONS',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'CIVIL_PLAINT_SPECIFIC_PERFORMANCE',
        label: 'Plaint for Specific Performance of Agreement',
        category: 'CIVIL_SUIT_PLAINT',
        statutoryRef: 'Order 7 Rule 1 C.P.C. r/w Specific Relief Act, 1963',
        description: 'Suit seeking execution and registration of Sale Deed pursuant to registered sale agreement.',
        recommendedTier: 'DISTRICT_SESSIONS',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'CIVIL_PLAINT_PARTITION',
        label: 'Plaint for Partition & Separate Possession',
        category: 'CIVIL_SUIT_PLAINT',
        statutoryRef: 'Order 7 Rule 1 C.P.C. r/w Hindu Succession Act',
        description: 'Suit for partition of ancestral/joint family schedule properties by metes and bounds.',
        recommendedTier: 'DISTRICT_SESSIONS',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'CIVIL_PLAINT_DECLARATION_POSSESSION',
        label: 'Plaint for Declaration of Title & Possession',
        category: 'CIVIL_SUIT_PLAINT',
        statutoryRef: 'Order 7 Rule 1 C.P.C. r/w Sec 34 Specific Relief Act',
        description: 'Suit seeking absolute declaration of title and recovery of vacant possession from encroachers.',
        recommendedTier: 'DISTRICT_SESSIONS',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'CIVIL_PLAINT_MONEY_SUIT',
        label: 'Plaint for Recovery of Money (Order 37 Summary Suit)',
        category: 'CIVIL_SUIT_PLAINT',
        statutoryRef: 'Order 37 Rules 1 & 2 / Order 7 Rule 1 C.P.C.',
        description: 'Summary civil suit for recovery of principal amount with interest based on promissory note or contract.',
        recommendedTier: 'DISTRICT_SESSIONS',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'CIVIL_PLAINT_CANCEL_DEED',
        label: 'Plaint for Cancellation of Fraudulent Deed',
        category: 'CIVIL_SUIT_PLAINT',
        statutoryRef: 'Section 31 Specific Relief Act r/w Order 7 C.P.C.',
        description: 'Suit for declaration that impugned sale/settlement deed is null, void, and non-est in law.',
        recommendedTier: 'DISTRICT_SESSIONS',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'CIVIL_WRITTEN_STATEMENT',
        label: 'Written Statement by Defendant',
        category: 'CIVIL_SUIT_PLAINT',
        statutoryRef: 'Order 8 Rule 1 C.P.C.',
        description: 'Detailed written statement traversing plaint averments and raising specific defense grounds.',
        recommendedTier: 'DISTRICT_SESSIONS',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'CIVIL_COUNTER_CLAIM',
        label: 'Written Statement with Counter-Claim',
        category: 'CIVIL_SUIT_PLAINT',
        statutoryRef: 'Order 8 Rule 6A C.P.C.',
        description: 'Defendant pleading asserting independent counter-claim and relief against plaintiff.',
        recommendedTier: 'DISTRICT_SESSIONS',
        requiresAffidavit: true,
        requiresVakalat: true,
    },

    // 6. Civil Interlocutory Applications (I.A.)
    {
        value: 'CIVIL_INJUNCTION_IA',
        label: 'Temporary Injunction Application (Order 39 R 1 & 2)',
        category: 'CIVIL_INTERLOCUTORY_IA',
        statutoryRef: 'Order 39 Rules 1 & 2 r/w Sec 151 C.P.C.',
        description: 'Interlocutory application for ad-interim temporary injunction and status quo pending suit.',
        recommendedTier: 'DISTRICT_SESSIONS',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'CIVIL_REJECTION_PLAINT_7_11',
        label: 'Rejection of Plaint Application (Order 7 Rule 11)',
        category: 'CIVIL_INTERLOCUTORY_IA',
        statutoryRef: 'Order 7 Rule 11 C.P.C.',
        description: 'Application for rejection of plaint due to lack of cause of action, undervaluation, or limitation bar.',
        recommendedTier: 'DISTRICT_SESSIONS',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'CIVIL_ATTACHMENT_BEFORE_JUDGMENT',
        label: 'Attachment Before Judgment (Order 38 Rule 5)',
        category: 'CIVIL_INTERLOCUTORY_IA',
        statutoryRef: 'Order 38 Rule 5 C.P.C.',
        description: 'Application seeking attachment of defendant immovable properties prior to judgment.',
        recommendedTier: 'DISTRICT_SESSIONS',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'CIVIL_ADVOCATE_COMMISSIONER',
        label: 'Appointment of Advocate Commissioner (Order 26 R 9)',
        category: 'CIVIL_INTERLOCUTORY_IA',
        statutoryRef: 'Order 26 Rule 9 C.P.C.',
        description: 'Application to appoint an Advocate Commissioner with surveyor to inspect suit property.',
        recommendedTier: 'DISTRICT_SESSIONS',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'CIVIL_AMENDMENT_PLEADINGS',
        label: 'Amendment of Pleadings (Order 6 Rule 17)',
        category: 'CIVIL_INTERLOCUTORY_IA',
        statutoryRef: 'Order 6 Rule 17 C.P.C.',
        description: 'Application seeking leave to amend plaint/written statement and introduce essential facts.',
        recommendedTier: 'DISTRICT_SESSIONS',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'CIVIL_SET_ASIDE_EXPARTE',
        label: 'Setting Aside Ex-Parte Decree / Order (Order 9 R 13)',
        category: 'CIVIL_INTERLOCUTORY_IA',
        statutoryRef: 'Order 9 Rule 13 r/w Sec 151 C.P.C.',
        description: 'Application to set aside ex-parte decree passed against defendant on showing sufficient cause.',
        recommendedTier: 'DISTRICT_SESSIONS',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'CIVIL_CONDONE_DELAY_SEC_5',
        label: 'Condonation of Delay Application (Sec 5 Limitation)',
        category: 'CIVIL_INTERLOCUTORY_IA',
        statutoryRef: 'Section 5 of Limitation Act, 1963',
        description: 'Interlocutory application seeking to condone delay in filing appeal, revision, or restoration.',
        recommendedTier: 'DISTRICT_SESSIONS',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'CIVIL_CAVEAT_PETITION',
        label: 'Caveat Petition (Section 148A CPC)',
        category: 'CIVIL_INTERLOCUTORY_IA',
        statutoryRef: 'Section 148A C.P.C.',
        description: 'Caveat petition demanding advance notice prior to passing any ex-parte interim orders.',
        recommendedTier: 'DISTRICT_SESSIONS',
        requiresAffidavit: true,
        requiresVakalat: true,
    },

    // 7. Civil Appeals, Revisions & Execution
    {
        value: 'CIVIL_FIRST_APPEAL_AS',
        label: 'First Appeal (Appeal Suit - A.S.)',
        category: 'CIVIL_APPEAL_REVISION',
        statutoryRef: 'Section 96 r/w Order 41 C.P.C.',
        description: 'Statutory first appeal against judgment and decree of trial court on questions of fact and law.',
        recommendedTier: 'DISTRICT_SESSIONS',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'CIVIL_SECOND_APPEAL_SA',
        label: 'Second Appeal (S.A.) before High Court',
        category: 'CIVIL_APPEAL_REVISION',
        statutoryRef: 'Section 100 r/w Order 42 C.P.C.',
        description: 'Second appeal before High Court on framing of Substantial Questions of Law.',
        recommendedTier: 'MADRAS_HC_CHENNAI',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'CIVIL_REVISION_CRP',
        label: 'Civil Revision Petition (C.R.P.)',
        category: 'CIVIL_APPEAL_REVISION',
        statutoryRef: 'Article 227 of Constitution / Sec 115 C.P.C.',
        description: 'Revision petition before High Court against interlocutory orders or jurisdictional errors.',
        recommendedTier: 'MADRAS_HC_CHENNAI',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'CIVIL_MISC_APPEAL_CMA',
        label: 'Civil Miscellaneous Appeal (C.M.A.)',
        category: 'CIVIL_APPEAL_REVISION',
        statutoryRef: 'Order 43 Rule 1 C.P.C.',
        description: 'Appeal against appealable interlocutory orders (Injunction, Attachment, Plaint Rejection).',
        recommendedTier: 'DISTRICT_SESSIONS',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'CIVIL_EXECUTION_PETITION_EP',
        label: 'Execution Petition (E.P.)',
        category: 'CIVIL_APPEAL_REVISION',
        statutoryRef: 'Order 21 Rules 10 & 11 C.P.C.',
        description: 'Execution petition to enforce decree by delivery of possession, attachment, or arrest.',
        recommendedTier: 'DISTRICT_SESSIONS',
        requiresAffidavit: true,
        requiresVakalat: true,
    },

    // 8. Family & Matrimonial
    {
        value: 'FAMILY_DIVORCE_PETITION',
        label: 'Petition for Divorce (Cruelty / Desertion)',
        category: 'FAMILY_MATRIMONIAL',
        statutoryRef: 'Section 13(1)(ia)/(ib) Hindu Marriage Act, 1955',
        description: 'Matrimonial petition before Family Court seeking dissolution of marriage on grounds of cruelty.',
        recommendedTier: 'FAMILY_COURT',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'FAMILY_MUTUAL_CONSENT_DIVORCE',
        label: 'Mutual Consent Divorce Petition (Sec 13B)',
        category: 'FAMILY_MATRIMONIAL',
        statutoryRef: 'Section 13B Hindu Marriage Act, 1955',
        description: 'Joint petition by spouses living separately for dissolution of marriage by mutual consent.',
        recommendedTier: 'FAMILY_COURT',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'FAMILY_RESTITUTION_CONJUGAL_RIGHTS',
        label: 'Restitution of Conjugal Rights (Sec 9 HMA)',
        category: 'FAMILY_MATRIMONIAL',
        statutoryRef: 'Section 9 Hindu Marriage Act, 1955',
        description: 'Petition seeking decree for restitution of conjugal rights and resumption of cohabitation.',
        recommendedTier: 'FAMILY_COURT',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'FAMILY_INTERIM_MAINTENANCE_24',
        label: 'Interim Maintenance & Expenses Application',
        category: 'FAMILY_MATRIMONIAL',
        statutoryRef: 'Section 24 Hindu Marriage Act, 1955',
        description: 'Application for interim monthly maintenance and litigation expenses pending matrimonial proceedings.',
        recommendedTier: 'FAMILY_COURT',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'FAMILY_MAINTENANCE_144_BNSS',
        label: 'Maintenance Petition for Wife / Children',
        category: 'FAMILY_MATRIMONIAL',
        statutoryRef: 'Section 144 BNSS, 2023',
        oldRef: 'Formerly Section 125 Cr.P.C.',
        description: 'Statutory petition claiming monthly maintenance for neglected wife, minor children, or elderly parents.',
        recommendedTier: 'FAMILY_COURT',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'FAMILY_CHILD_CUSTODY_PETITION',
        label: 'Child Custody & Guardianship Petition',
        category: 'FAMILY_MATRIMONIAL',
        statutoryRef: 'Section 7 & 25 Guardians and Wards Act, 1890',
        description: 'Petition for permanent custody, guardianship, and visitation rights of minor children.',
        recommendedTier: 'FAMILY_COURT',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'FAMILY_DOMESTIC_VIOLENCE_12',
        label: 'Domestic Violence Application (Sec 12 DV Act)',
        category: 'FAMILY_MATRIMONIAL',
        statutoryRef: 'Section 12 Protection of Women from DV Act, 2005',
        description: 'Application for protection orders, residence orders, monetary relief, and compensation for domestic abuse.',
        recommendedTier: 'MAGISTRATE_JM',
        requiresAffidavit: true,
        requiresVakalat: true,
    },

    // 9. Commercial & Cheque Bounce
    {
        value: 'NI_138_CHEQUE_BOUNCE',
        label: 'Cheque Dishonour Complaint (Sec 138 NI Act)',
        category: 'COMMERCIAL_NI_ACT',
        statutoryRef: 'Section 138 & 142 Negotiable Instruments Act, 1881',
        description: 'Private criminal complaint before Magistrate for dishonour of cheque due to insufficient funds.',
        recommendedTier: 'MAGISTRATE_JM',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'NI_138_STATUTORY_NOTICE',
        label: 'Statutory Cheque Bounce Demand Notice',
        category: 'COMMERCIAL_NI_ACT',
        statutoryRef: 'Section 138(b) Negotiable Instruments Act, 1881',
        description: 'Mandatory 15-day statutory legal notice calling upon drawer to pay dishonoured cheque amount.',
        recommendedTier: 'MAGISTRATE_JM',
        requiresAffidavit: false,
        requiresVakalat: false,
    },
    {
        value: 'NI_143A_INTERIM_COMPENSATION',
        label: 'Interim Compensation Application (Sec 143A NI Act)',
        category: 'COMMERCIAL_NI_ACT',
        statutoryRef: 'Section 143A Negotiable Instruments Act, 1881',
        description: 'Application seeking direction for deposit of up to 20% interim compensation by accused.',
        recommendedTier: 'MAGISTRATE_JM',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'COMMERCIAL_SUIT_PLAINT',
        label: 'Commercial Suit Plaint & Statement of Truth',
        category: 'COMMERCIAL_NI_ACT',
        statutoryRef: 'Commercial Courts Act, 2015 r/w CPC',
        description: 'Commercial suit plaint accompanied by mandatory Statement of Truth and List of Documents.',
        recommendedTier: 'COMMERCIAL_COURT',
        requiresAffidavit: true,
        requiresVakalat: true,
    },

    // 10. Arbitration & Insolvency
    {
        value: 'ARB_SEC_9_INTERIM_MEASURES',
        label: 'Arbitration Interim Measures Petition (Sec 9)',
        category: 'ARBITRATION_IBC',
        statutoryRef: 'Section 9 Arbitration and Conciliation Act, 1996',
        description: 'Petition seeking interim protective measures, preservation of goods, or restraining orders.',
        recommendedTier: 'COMMERCIAL_COURT',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'ARB_SEC_11_APPOINT_ARBITRATOR',
        label: 'Appointment of Arbitrator Petition (Sec 11)',
        category: 'ARBITRATION_IBC',
        statutoryRef: 'Section 11(6) Arbitration and Conciliation Act, 1996',
        description: 'Original petition before High Court for appointment of sole arbitrator upon failure of agreed procedure.',
        recommendedTier: 'MADRAS_HC_CHENNAI',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'ARB_SEC_34_SET_ASIDE_AWARD',
        label: 'Petition to Set Aside Arbitral Award (Sec 34)',
        category: 'ARBITRATION_IBC',
        statutoryRef: 'Section 34 Arbitration and Conciliation Act, 1996',
        description: 'Original petition challenging arbitral award on grounds of patent illegality or public policy breach.',
        recommendedTier: 'COMMERCIAL_COURT',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'IBC_NCLT_INSOLVENCY_PETITION',
        label: 'Corporate Insolvency Petition (IBC Sec 7 / 9)',
        category: 'ARBITRATION_IBC',
        statutoryRef: 'Section 7 / 9 Insolvency & Bankruptcy Code, 2016',
        description: 'Application before NCLT for initiation of Corporate Insolvency Resolution Process (CIRP).',
        recommendedTier: 'COMMERCIAL_COURT',
        requiresAffidavit: true,
        requiresVakalat: true,
    },

    // 11. MACT & Consumer
    {
        value: 'MACT_CLAIM_PETITION_166',
        label: 'Motor Accident Compensation Claim (Sec 166)',
        category: 'MACT_CONSUMER',
        statutoryRef: 'Section 166 Motor Vehicles Act, 1988',
        description: 'Claim petition before MACT Tribunal seeking compensation for fatal accident or grievous permanent disability.',
        recommendedTier: 'MACT_TRIBUNAL',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
    {
        value: 'CONSUMER_COMPLAINT_35',
        label: 'Consumer Protection Complaint (Sec 35 CPA)',
        category: 'MACT_CONSUMER',
        statutoryRef: 'Section 35 Consumer Protection Act, 2019',
        description: 'Complaint before District Consumer Disputes Redressal Commission for deficiency of service / unfair trade.',
        recommendedTier: 'DISTRICT_SESSIONS',
        requiresAffidavit: true,
        requiresVakalat: true,
    },

    // 12. Legal Notices, Vakalat & Memos
    {
        value: 'LEGAL_NOTICE',
        label: 'Advocate Legal Notice / Demand Notice',
        category: 'LEGAL_NOTICE_DEED',
        statutoryRef: 'Statutory Notice under relevant enactments',
        description: 'Formal legal notice on advocate letterhead with facts, statutory demands, and 15-day timeline.',
        recommendedTier: 'DISTRICT_SESSIONS',
        requiresAffidavit: false,
        requiresVakalat: false,
    },
    {
        value: 'REPLY_LEGAL_NOTICE',
        label: 'Reply to Advocate Legal Notice',
        category: 'LEGAL_NOTICE_DEED',
        statutoryRef: 'Advocate Reply Notice',
        description: 'Formal reply notice refuting allegations and asserting counter-factual legal positions.',
        recommendedTier: 'DISTRICT_SESSIONS',
        requiresAffidavit: false,
        requiresVakalat: false,
    },
    {
        value: 'VAKALATNAMA_HIGH_COURT',
        label: 'Madras High Court Vakalatnama',
        category: 'LEGAL_NOTICE_DEED',
        statutoryRef: 'Madras High Court Appellate & Original Side Rules',
        description: 'Standard High Court Vakalatnama authorizing counsel with welfare stamp and party execution.',
        recommendedTier: 'MADRAS_HC_CHENNAI',
        requiresAffidavit: false,
        requiresVakalat: true,
    },
    {
        value: 'VAKALATNAMA_SUBORDINATE',
        label: 'District & Subordinate Court Vakalatnama',
        category: 'LEGAL_NOTICE_DEED',
        statutoryRef: 'Civil & Criminal Rules of Practice (Tamil Nadu)',
        description: 'Standard Subordinate Court Vakalatnama for District, Sessions, Sub Court, and Magistrate courts.',
        recommendedTier: 'DISTRICT_SESSIONS',
        requiresAffidavit: false,
        requiresVakalat: true,
    },
    {
        value: 'JOINT_COMPROMISE_MEMO',
        label: 'Joint Compromise Memo / Settlement Agreement',
        category: 'LEGAL_NOTICE_DEED',
        statutoryRef: 'Order 23 Rule 3 C.P.C. / Criminal Rules of Practice',
        description: 'Joint memorandum of settlement signed by both parties recording amicable resolution of dispute.',
        recommendedTier: 'DISTRICT_SESSIONS',
        requiresAffidavit: false,
        requiresVakalat: false,
    },
    {
        value: 'CUSTOM_PLEADING',
        label: 'Custom Legal Petition',
        category: 'CIVIL_SUIT_PLAINT',
        statutoryRef: 'Relevant Act & Rules',
        description: 'Customized multi-document legal pleading tailored to specific court requirements.',
        recommendedTier: 'MADRAS_HC_CHENNAI',
        requiresAffidavit: true,
        requiresVakalat: true,
    },
];

export interface IndexTableItem {
    sNo: number;
    description: string;
    date: string;
    pageNo: string;
    courtFee?: string;
}

export interface PaperbookSections {
    indexSheet: string;
    synopsis: string;
    petition: string;
    affidavit: string;
    miscPetition?: string;
    vakalat: string;
}

export interface PaperbookBundle {
    id: string;
    caseId: string;
    pleadingType: PleadingType;
    courtTier: CourtTier;
    bench: string;
    title: string;
    caseNumber?: string;
    petitionerName: string;
    respondentName: string;
    sections: PaperbookSections;
    indexItems: IndexTableItem[];
    docxUri?: string;
    docxFileName?: string;
    fileSize?: number;
    generatedAt: string;
    updatedAt: string;
    status: 'DRAFT' | 'GENERATED' | 'SAVED';
}

export interface AdvocateProfile {
    name: string;
    barEnrolment: string;       // e.g. "MS/1234/2018"
    chamberAddress: string;
    phone: string;
    email: string;
    defaultCourtTier: CourtTier;
    deepseekApiKey: string;
    selectedModel: 'deepseek-chat' | 'deepseek-reasoner';
    isConfigured: boolean;
}

export const DEFAULT_ADVOCATE_PROFILE: AdvocateProfile = {
    name: 'Counsel',
    barEnrolment: '',
    chamberAddress: 'High Court Chambers, Madras High Court Buildings, Chennai - 600104',
    phone: '+91 ',
    email: '',
    defaultCourtTier: 'MADRAS_HC_CHENNAI',
    deepseekApiKey: '',
    selectedModel: 'deepseek-chat',
    isConfigured: false,
};
