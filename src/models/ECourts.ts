// eCourts India Data Models & Comprehensive Tamil Nadu Courts Registry
import { CaseStage, CaseStatus, CaseType, LegalActType } from './Case';

export type CourtJurisdiction = 'HIGH_COURT' | 'DISTRICT_COURT' | 'MAGISTRATE_COURT' | 'TRIBUNAL' | 'SPECIAL_COURT';

export interface ECourtsCourtRegistry {
    id: string;
    name: string;
    code: string;
    state: string;
    district: string;
    jurisdiction: CourtJurisdiction;
    portalUrl: string;
}

export interface ECourtsCaseTypeOption {
    code: string;
    label: string;
    category: 'CRIMINAL' | 'CIVIL' | 'WRIT' | 'SPECIAL';
}

export interface ECourtsHearingRecord {
    id: string;
    date: string;
    business?: string;
    judge?: string;
    courtHall?: string;
    orderTitle?: string;
    orderPdfUrl?: string;
}

export interface ECourtsCaseResult {
    cnr: string;                    // 16-character alphanumeric (e.g. TNHC010018292026)
    caseNumber: string;             // e.g. Crl.O.P. No. 1829/2026
    caseTypeName: string;           // e.g. Criminal Original Petition
    filingNumber?: string;
    filingDate: string;
    registrationDate?: string;
    courtName: string;
    courtHall?: string;
    bench?: string;
    presidingJudge?: string;
    caseTitle: string;
    petitioner: {
        name: string;
        advocate?: string;
        address?: string;
        phone?: string;
    };
    respondent: {
        name: string;
        advocate?: string;
        address?: string;
    };
    caseCategory: CaseType;
    stage: CaseStage;
    status: CaseStatus;
    sections: Array<{
        act: LegalActType;
        section: string;
        description?: string;
    }>;
    firDetails?: {
        policeStation: string;
        firNumber: string;
        firYear: string;
        district?: string;
    };
    nextHearing?: {
        date: string;
        purpose: string;
        courtHall?: string;
    };
    hearings: ECourtsHearingRecord[];
}

export interface ECourtsCNRSearchQuery {
    cnrNumber: string;
}

export interface ECourtsCaseNoSearchQuery {
    courtId: string;
    caseType: string;
    caseNumber: string;
    caseYear: string;
}

// Comprehensive Registry of ALL Courts in Chennai & ALL 38 Districts in Tamil Nadu
export const TAMIL_NADU_COURTS: ECourtsCourtRegistry[] = [
    // --- HIGH COURT OF MADRAS ---
    {
        id: 'mhc-chennai',
        name: 'Madras High Court - Principal Seat (Chennai)',
        code: 'TNHC01',
        state: 'Tamil Nadu',
        district: 'Chennai',
        jurisdiction: 'HIGH_COURT',
        portalUrl: 'https://hcservices.ecourts.gov.in/hcservices/main.php?state_code=26&dist_code=1',
    },
    {
        id: 'mhc-madurai',
        name: 'Madras High Court - Madurai Bench',
        code: 'TNHC02',
        state: 'Tamil Nadu',
        district: 'Madurai',
        jurisdiction: 'HIGH_COURT',
        portalUrl: 'https://hcservices.ecourts.gov.in/hcservices/main.php?state_code=26&dist_code=2',
    },

    // --- CHENNAI CITY COURT COMPLEXES & SPECIALIZED TRIBUNALS ---
    {
        id: 'city-civil-chennai',
        name: 'City Civil Court & Sessions Court - Chennai (HC Campus)',
        code: 'TNCH01',
        state: 'Tamil Nadu',
        district: 'Chennai',
        jurisdiction: 'DISTRICT_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=1',
    },
    {
        id: 'cmm-egmore-chennai',
        name: 'Chief Metropolitan Magistrate Court - Egmore, Chennai',
        code: 'TNCH02',
        state: 'Tamil Nadu',
        district: 'Chennai',
        jurisdiction: 'MAGISTRATE_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=1',
    },
    {
        id: 'mm-saidapet-chennai',
        name: 'Metropolitan Magistrate Courts Complex - Saidapet, Chennai',
        code: 'TNCH03',
        state: 'Tamil Nadu',
        district: 'Chennai',
        jurisdiction: 'MAGISTRATE_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=1',
    },
    {
        id: 'mm-georgetown-chennai',
        name: 'Metropolitan Magistrate Courts Complex - George Town, Chennai',
        code: 'TNCH04',
        state: 'Tamil Nadu',
        district: 'Chennai',
        jurisdiction: 'MAGISTRATE_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=1',
    },
    {
        id: 'small-causes-chennai',
        name: 'Court of Small Causes - Chennai (High Court Campus)',
        code: 'TNCH05',
        state: 'Tamil Nadu',
        district: 'Chennai',
        jurisdiction: 'DISTRICT_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=1',
    },
    {
        id: 'family-courts-chennai',
        name: 'Principal Family Court & Family Courts Complex - Chennai',
        code: 'TNCH06',
        state: 'Tamil Nadu',
        district: 'Chennai',
        jurisdiction: 'DISTRICT_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=1',
    },
    {
        id: 'cbi-special-chennai',
        name: 'Special Court for CBI Cases - Chennai',
        code: 'TNCH07',
        state: 'Tamil Nadu',
        district: 'Chennai',
        jurisdiction: 'SPECIAL_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=1',
    },
    {
        id: 'pocso-special-chennai',
        name: 'Special Court for Exclusive Trial of POCSO Act Cases - Chennai',
        code: 'TNCH08',
        state: 'Tamil Nadu',
        district: 'Chennai',
        jurisdiction: 'SPECIAL_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=1',
    },
    {
        id: 'ndps-special-chennai',
        name: 'Special Court for EC & NDPS Act Cases - Chennai',
        code: 'TNCH09',
        state: 'Tamil Nadu',
        district: 'Chennai',
        jurisdiction: 'SPECIAL_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=1',
    },
    {
        id: 'mact-tribunal-chennai',
        name: 'Motor Accidents Claims Tribunal (MACT) - Chennai',
        code: 'TNCH10',
        state: 'Tamil Nadu',
        district: 'Chennai',
        jurisdiction: 'TRIBUNAL',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=1',
    },
    {
        id: 'nclt-chennai',
        name: 'National Company Law Tribunal (NCLT) - Chennai Bench',
        code: 'TNNCLT',
        state: 'Tamil Nadu',
        district: 'Chennai',
        jurisdiction: 'TRIBUNAL',
        portalUrl: 'https://nclt.gov.in',
    },
    {
        id: 'drt-chennai',
        name: 'Debts Recovery Tribunal (DRT-I, II, III) - Chennai',
        code: 'TNDRT1',
        state: 'Tamil Nadu',
        district: 'Chennai',
        jurisdiction: 'TRIBUNAL',
        portalUrl: 'https://drt.gov.in',
    },

    // --- ALL 38 DISTRICTS OF TAMIL NADU ---
    {
        id: 'dist-tiruvallur',
        name: 'Principal District & Sessions Court - Tiruvallur',
        code: 'TNTL01',
        state: 'Tamil Nadu',
        district: 'Tiruvallur',
        jurisdiction: 'DISTRICT_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=7',
    },
    {
        id: 'dist-chengalpattu',
        name: 'Principal District & Sessions Court - Chengalpattu',
        code: 'TNCP01',
        state: 'Tamil Nadu',
        district: 'Chengalpattu',
        jurisdiction: 'DISTRICT_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=8',
    },
    {
        id: 'dist-kancheepuram',
        name: 'Principal District & Sessions Court - Kancheepuram',
        code: 'TNKC01',
        state: 'Tamil Nadu',
        district: 'Kancheepuram',
        jurisdiction: 'DISTRICT_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=9',
    },
    {
        id: 'dist-coimbatore',
        name: 'Principal District & Sessions Court - Coimbatore',
        code: 'TNCB01',
        state: 'Tamil Nadu',
        district: 'Coimbatore',
        jurisdiction: 'DISTRICT_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=2',
    },
    {
        id: 'dist-madurai',
        name: 'Principal District & Sessions Court - Madurai',
        code: 'TNMD01',
        state: 'Tamil Nadu',
        district: 'Madurai',
        jurisdiction: 'DISTRICT_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=3',
    },
    {
        id: 'dist-salem',
        name: 'Principal District & Sessions Court - Salem',
        code: 'TNSL01',
        state: 'Tamil Nadu',
        district: 'Salem',
        jurisdiction: 'DISTRICT_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=4',
    },
    {
        id: 'dist-trichy',
        name: 'Principal District & Sessions Court - Tiruchirappalli (Trichy)',
        code: 'TNTR01',
        state: 'Tamil Nadu',
        district: 'Tiruchirappalli',
        jurisdiction: 'DISTRICT_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=5',
    },
    {
        id: 'dist-tirunelveli',
        name: 'Principal District & Sessions Court - Tirunelveli',
        code: 'TNTN01',
        state: 'Tamil Nadu',
        district: 'Tirunelveli',
        jurisdiction: 'DISTRICT_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=6',
    },
    {
        id: 'dist-ariyalur',
        name: 'Principal District & Sessions Court - Ariyalur',
        code: 'TNAR01',
        state: 'Tamil Nadu',
        district: 'Ariyalur',
        jurisdiction: 'DISTRICT_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=10',
    },
    {
        id: 'dist-cuddalore',
        name: 'Principal District & Sessions Court - Cuddalore',
        code: 'TNCU01',
        state: 'Tamil Nadu',
        district: 'Cuddalore',
        jurisdiction: 'DISTRICT_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=11',
    },
    {
        id: 'dist-dharmapuri',
        name: 'Principal District & Sessions Court - Dharmapuri',
        code: 'TNDH01',
        state: 'Tamil Nadu',
        district: 'Dharmapuri',
        jurisdiction: 'DISTRICT_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=12',
    },
    {
        id: 'dist-dindigul',
        name: 'Principal District & Sessions Court - Dindigul',
        code: 'TNDG01',
        state: 'Tamil Nadu',
        district: 'Dindigul',
        jurisdiction: 'DISTRICT_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=13',
    },
    {
        id: 'dist-erode',
        name: 'Principal District & Sessions Court - Erode',
        code: 'TNER01',
        state: 'Tamil Nadu',
        district: 'Erode',
        jurisdiction: 'DISTRICT_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=14',
    },
    {
        id: 'dist-kallakurichi',
        name: 'Principal District & Sessions Court - Kallakurichi',
        code: 'TNKL01',
        state: 'Tamil Nadu',
        district: 'Kallakurichi',
        jurisdiction: 'DISTRICT_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=15',
    },
    {
        id: 'dist-kanyakumari',
        name: 'Principal District & Sessions Court - Kanyakumari (Nagercoil)',
        code: 'TNKK01',
        state: 'Tamil Nadu',
        district: 'Kanyakumari',
        jurisdiction: 'DISTRICT_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=16',
    },
    {
        id: 'dist-karur',
        name: 'Principal District & Sessions Court - Karur',
        code: 'TNKR01',
        state: 'Tamil Nadu',
        district: 'Karur',
        jurisdiction: 'DISTRICT_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=17',
    },
    {
        id: 'dist-krishnagiri',
        name: 'Principal District & Sessions Court - Krishnagiri',
        code: 'TNKG01',
        state: 'Tamil Nadu',
        district: 'Krishnagiri',
        jurisdiction: 'DISTRICT_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=18',
    },
    {
        id: 'dist-mayiladuthurai',
        name: 'Principal District & Sessions Court - Mayiladuthurai',
        code: 'TNMY01',
        state: 'Tamil Nadu',
        district: 'Mayiladuthurai',
        jurisdiction: 'DISTRICT_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=19',
    },
    {
        id: 'dist-nagapattinam',
        name: 'Principal District & Sessions Court - Nagapattinam',
        code: 'TNNG01',
        state: 'Tamil Nadu',
        district: 'Nagapattinam',
        jurisdiction: 'DISTRICT_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=20',
    },
    {
        id: 'dist-namakkal',
        name: 'Principal District & Sessions Court - Namakkal',
        code: 'TNNM01',
        state: 'Tamil Nadu',
        district: 'Namakkal',
        jurisdiction: 'DISTRICT_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=21',
    },
    {
        id: 'dist-nilgiris',
        name: 'Principal District & Sessions Court - Nilgiris (Ooty)',
        code: 'TNNL01',
        state: 'Tamil Nadu',
        district: 'Nilgiris',
        jurisdiction: 'DISTRICT_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=22',
    },
    {
        id: 'dist-perambalur',
        name: 'Principal District & Sessions Court - Perambalur',
        code: 'TNPR01',
        state: 'Tamil Nadu',
        district: 'Perambalur',
        jurisdiction: 'DISTRICT_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=23',
    },
    {
        id: 'dist-pudukkottai',
        name: 'Principal District & Sessions Court - Pudukkottai',
        code: 'TNPD01',
        state: 'Tamil Nadu',
        district: 'Pudukkottai',
        jurisdiction: 'DISTRICT_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=24',
    },
    {
        id: 'dist-ramanathapuram',
        name: 'Principal District & Sessions Court - Ramanathapuram',
        code: 'TNRP01',
        state: 'Tamil Nadu',
        district: 'Ramanathapuram',
        jurisdiction: 'DISTRICT_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=25',
    },
    {
        id: 'dist-ranipet',
        name: 'Principal District & Sessions Court - Ranipet',
        code: 'TNRN01',
        state: 'Tamil Nadu',
        district: 'Ranipet',
        jurisdiction: 'DISTRICT_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=26',
    },
    {
        id: 'dist-sivagangai',
        name: 'Principal District & Sessions Court - Sivagangai',
        code: 'TNSG01',
        state: 'Tamil Nadu',
        district: 'Sivagangai',
        jurisdiction: 'DISTRICT_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=27',
    },
    {
        id: 'dist-tenkasi',
        name: 'Principal District & Sessions Court - Tenkasi',
        code: 'TNTK01',
        state: 'Tamil Nadu',
        district: 'Tenkasi',
        jurisdiction: 'DISTRICT_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=28',
    },
    {
        id: 'dist-thanjavur',
        name: 'Principal District & Sessions Court - Thanjavur',
        code: 'TNTJ01',
        state: 'Tamil Nadu',
        district: 'Thanjavur',
        jurisdiction: 'DISTRICT_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=29',
    },
    {
        id: 'dist-theni',
        name: 'Principal District & Sessions Court - Theni',
        code: 'TNTH01',
        state: 'Tamil Nadu',
        district: 'Theni',
        jurisdiction: 'DISTRICT_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=30',
    },
    {
        id: 'dist-thoothukudi',
        name: 'Principal District & Sessions Court - Thoothukudi (Tuticorin)',
        code: 'TNTT01',
        state: 'Tamil Nadu',
        district: 'Thoothukudi',
        jurisdiction: 'DISTRICT_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=31',
    },
    {
        id: 'dist-tirupathur',
        name: 'Principal District & Sessions Court - Tirupathur',
        code: 'TNTP01',
        state: 'Tamil Nadu',
        district: 'Tirupathur',
        jurisdiction: 'DISTRICT_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=32',
    },
    {
        id: 'dist-tiruppur',
        name: 'Principal District & Sessions Court - Tiruppur',
        code: 'TNTU01',
        state: 'Tamil Nadu',
        district: 'Tiruppur',
        jurisdiction: 'DISTRICT_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=33',
    },
    {
        id: 'dist-tiruvannamalai',
        name: 'Principal District & Sessions Court - Tiruvannamalai',
        code: 'TNTV01',
        state: 'Tamil Nadu',
        district: 'Tiruvannamalai',
        jurisdiction: 'DISTRICT_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=34',
    },
    {
        id: 'dist-tiruvarur',
        name: 'Principal District & Sessions Court - Tiruvarur',
        code: 'TNVR01',
        state: 'Tamil Nadu',
        district: 'Tiruvarur',
        jurisdiction: 'DISTRICT_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=35',
    },
    {
        id: 'dist-vellore',
        name: 'Principal District & Sessions Court - Vellore',
        code: 'TNVE01',
        state: 'Tamil Nadu',
        district: 'Vellore',
        jurisdiction: 'DISTRICT_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=36',
    },
    {
        id: 'dist-viluppuram',
        name: 'Principal District & Sessions Court - Viluppuram',
        code: 'TNVL01',
        state: 'Tamil Nadu',
        district: 'Viluppuram',
        jurisdiction: 'DISTRICT_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=37',
    },
    {
        id: 'dist-virudhunagar',
        name: 'Principal District & Sessions Court - Virudhunagar (Srivilliputhur)',
        code: 'TNVD01',
        state: 'Tamil Nadu',
        district: 'Virudhunagar',
        jurisdiction: 'DISTRICT_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=26&dist_code=38',
    },

    // --- UNION TERRITORY OF PUDUCHERRY (Under Madras HC Jurisdiction) ---
    {
        id: 'dist-puducherry',
        name: 'Chief Judge & Sessions Court - Puducherry',
        code: 'PYPD01',
        state: 'Puducherry',
        district: 'Puducherry',
        jurisdiction: 'DISTRICT_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=34&dist_code=1',
    },
    {
        id: 'dist-karaikal',
        name: 'District Court - Karaikal',
        code: 'PYKK01',
        state: 'Puducherry',
        district: 'Karaikal',
        jurisdiction: 'DISTRICT_COURT',
        portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?state_code=34&dist_code=2',
    },
];

// Common High Court & District Court Case Types in Tamil Nadu
export const COMMON_CASE_TYPES: ECourtsCaseTypeOption[] = [
    { code: 'CRL_OP', label: 'Crl.O.P. (Criminal Original Petition / Bail / Quash)', category: 'CRIMINAL' },
    { code: 'WP', label: 'W.P. (Writ Petition under Art. 226)', category: 'WRIT' },
    { code: 'WA', label: 'W.A. (Writ Appeal)', category: 'WRIT' },
    { code: 'CRL_A', label: 'Crl.A. (Criminal Appeal)', category: 'CRIMINAL' },
    { code: 'CRL_RC', label: 'Crl.R.C. (Criminal Revision Case)', category: 'CRIMINAL' },
    { code: 'CMA', label: 'C.M.A. (Civil Miscellaneous Appeal)', category: 'CIVIL' },
    { code: 'CRP', label: 'C.R.P. (Civil Revision Petition)', category: 'CIVIL' },
    { code: 'OS', label: 'O.S. (Original Suit - Civil)', category: 'CIVIL' },
    { code: 'CC', label: 'C.C. (Calendar Case / Magistrate)', category: 'CRIMINAL' },
    { code: 'SC', label: 'S.C. (Sessions Case)', category: 'CRIMINAL' },
    { code: 'EP', label: 'E.P. (Execution Petition)', category: 'CIVIL' },
    { code: 'MC', label: 'M.C. (Maintenance Case)', category: 'CIVIL' },
    { code: 'BOP', label: 'B.O.P. (Bail Original Petition)', category: 'CRIMINAL' },
    { code: 'AS', label: 'A.S. (Appeal Suit)', category: 'CIVIL' },
    { code: 'CA', label: 'C.A. (Company Application / Appeal)', category: 'SPECIAL' },
];
