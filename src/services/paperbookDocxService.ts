// Madras High Court & Tamil Nadu Judiciary Zero-Cost On-Device DOCX Assembly Engine
import {
    Document as DocxDocument,
    Packer,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    AlignmentType,
    BorderStyle,
    PageBreak,
    Header,
    Footer,
    PageNumber,
    NumberFormat,
    HeadingLevel,
    ShadingType,
    VerticalAlign,
    TableLayoutType,
} from 'docx';
import * as FileSystem from 'expo-file-system/legacy';
import {
    CourtTier,
    COURT_TIERS,
    PleadingType,
    PLEADING_TYPES,
    PaperbookSections,
    IndexTableItem,
    AdvocateProfile,
    PaperbookBundle,
} from '../models/Pleading';
import { Case } from '../models/Case';
import { ensureDocumentsDir } from './documentStorage';
import { v4 as uuidv4 } from 'uuid';

// Madras High Court Rules Layout Constants (1 inch = 1440 dxa)
const MHC_PAGE_LAYOUT = {
    size: {
        width: 11906,   // A4 Width: 210mm (8.27 in)
        height: 16838,  // A4 Height: 297mm (11.69 in)
    },
    margins: {
        left: 2520,     // 1.75 inches for court filing & stitching
        right: 1440,    // 1.0 inch
        top: 2160,      // 1.5 inches
        bottom: 2160,   // 1.5 inches
    },
};

const FONT_FAMILY = 'Times New Roman';
const FONT_SIZE_BODY = 28;      // 14pt (half-points)
const FONT_SIZE_TITLE = 30;     // 15pt bold
const FONT_SIZE_HEADER = 32;    // 16pt bold
const FONT_SIZE_CAPTION = 24;   // 12pt
const LINE_SPACING_1_5 = 360;   // 1.5 Line Spacing (240 = 1.0, 360 = 1.5, 480 = 2.0)
const LINE_SPACING_2_0 = 480;   // 2.0 Double Line Spacing

export interface BuildDocxParams {
    caseData: Case;
    pleadingType: PleadingType;
    courtTier: CourtTier;
    bench?: string;
    advocateProfile: AdvocateProfile;
    sections: PaperbookSections;
    indexItems?: IndexTableItem[];
}

/**
 * Creates court-compliant formatted paragraphs, tables, and signature blocks from text.
 * Strictly respects Indian Court Cause Title alignment, dual signature rows, subheadings, and tables.
 */
const createCourtFormattedElements = (
    text: string,
    options: {
        alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
        fontSize?: number;
        lineSpacing?: number;
        spaceAfter?: number;
    } = {}
): (Paragraph | Table)[] => {
    if (!text || !text.trim()) return [];

    const lines = text.split('\n');
    const elements: (Paragraph | Table)[] = [];

    let i = 0;
    while (i < lines.length) {
        const rawLine = lines[i];
        const line = rawLine.trim();

        if (!line) {
            elements.push(
                new Paragraph({
                    spacing: { after: 100 },
                    children: [],
                })
            );
            i++;
            continue;
        }

        // 1. Dual Signatures (Petitioner on Left, Counsel on Right)
        if (
            (line.includes('Petitioner.') && line.includes('Counsel for Petitioner.')) ||
            (line.includes('SIGNATURE OF CLIENT') && line.includes('ACCEPTED & SIGNED BY COUNSEL'))
        ) {
            const isCounsel = line.includes('Counsel for Petitioner.');
            const leftText = isCounsel ? 'Petitioner.' : 'SIGNATURE OF CLIENT\n(Petitioner / Accused)';
            const rightText = isCounsel ? 'Counsel for Petitioner.' : 'ACCEPTED & SIGNED BY COUNSEL';

            elements.push(
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: {
                        top: { style: BorderStyle.NONE },
                        bottom: { style: BorderStyle.NONE },
                        left: { style: BorderStyle.NONE },
                        right: { style: BorderStyle.NONE },
                        insideHorizontal: { style: BorderStyle.NONE },
                        insideVertical: { style: BorderStyle.NONE },
                    },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({
                                    width: { size: 50, type: WidthType.PERCENTAGE },
                                    borders: {
                                        top: { style: BorderStyle.NONE },
                                        bottom: { style: BorderStyle.NONE },
                                        left: { style: BorderStyle.NONE },
                                        right: { style: BorderStyle.NONE },
                                    },
                                    children: [
                                        new Paragraph({
                                            alignment: AlignmentType.LEFT,
                                            spacing: { before: 240, after: 120 },
                                            children: [
                                                new TextRun({
                                                    text: leftText,
                                                    font: FONT_FAMILY,
                                                    size: FONT_SIZE_BODY,
                                                    bold: true,
                                                }),
                                            ],
                                        }),
                                    ],
                                }),
                                new TableCell({
                                    width: { size: 50, type: WidthType.PERCENTAGE },
                                    borders: {
                                        top: { style: BorderStyle.NONE },
                                        bottom: { style: BorderStyle.NONE },
                                        left: { style: BorderStyle.NONE },
                                        right: { style: BorderStyle.NONE },
                                    },
                                    children: [
                                        new Paragraph({
                                            alignment: AlignmentType.RIGHT,
                                            spacing: { before: 240, after: 120 },
                                            children: [
                                                new TextRun({
                                                    text: rightText,
                                                    font: FONT_FAMILY,
                                                    size: FONT_SIZE_BODY,
                                                    bold: true,
                                                }),
                                            ],
                                        }),
                                    ],
                                }),
                            ],
                        }),
                    ],
                })
            );
            i++;
            continue;
        }

        // 2. Right-aligned party designations (... Petitioner, ... Respondent, ... Accused, ... Deponent)
        if (
            line.startsWith('...') ||
            line.startsWith('- ...') ||
            line.includes('... Petitioner') ||
            line.includes('... Complainant') ||
            line.includes('... Accused') ||
            line.includes('... Respondent') ||
            line.includes('... Deponent')
        ) {
            elements.push(
                new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    spacing: { line: LINE_SPACING_1_5, before: 60, after: 140 },
                    children: [
                        new TextRun({
                            text: line,
                            font: FONT_FAMILY,
                            size: FONT_SIZE_BODY,
                            bold: true,
                        }),
                    ],
                })
            );
            i++;
            continue;
        }

        // 3. Centered "Versus" / "-Versus-" / "-Vs-"
        if (
            line === 'Versus' ||
            line === '-Versus-' ||
            line === '-Vs-' ||
            line === 'VERSUS' ||
            line === '-VERSUS-' ||
            line === '-Vs.'
        ) {
            elements.push(
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 160, after: 160 },
                    children: [
                        new TextRun({
                            text: 'Versus',
                            font: FONT_FAMILY,
                            size: FONT_SIZE_BODY,
                            bold: true,
                        }),
                    ],
                })
            );
            i++;
            continue;
        }

        // 4. Centered Headings
        const isCenteredHeading =
            line.startsWith('IN THE COURT') ||
            line.startsWith('IN THE HIGH COURT') ||
            line.startsWith('Crl.M.P.') ||
            line.startsWith('Crl.O.P.') ||
            line.startsWith('W.P.') ||
            line.startsWith('O.S.') ||
            line.startsWith('PETITION UNDER') ||
            line.startsWith('MEMORANDUM OF') ||
            line.startsWith('SYNOPSIS') ||
            line.startsWith('SUPPORTING VERIFICATION') ||
            line.startsWith('VAKALATNAMA') ||
            line.startsWith('VERIFICATION.') ||
            line.startsWith('LEGAL NOTICE') ||
            line.startsWith('STATUTORY NOTICE') ||
            line.startsWith('REPLY TO LEGAL NOTICE') ||
            line.startsWith('SCHEDULE OF PROPERTY') ||
            line.startsWith('SCHEDULE PROPERTY') ||
            line.startsWith('JEWELS GIVEN FOR WEDDING.');

        if (isCenteredHeading) {
            elements.push(
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { line: LINE_SPACING_1_5, before: 180, after: 160 },
                    children: [
                        new TextRun({
                            text: line,
                            font: FONT_FAMILY,
                            size: line.startsWith('IN THE') ? FONT_SIZE_HEADER : FONT_SIZE_TITLE,
                            bold: true,
                            underline:
                                line.startsWith('SYNOPSIS') ||
                                line.startsWith('CHRONOLOGICAL') ||
                                line.startsWith('LEGAL NOTICE') ||
                                line.startsWith('STATUTORY NOTICE') ||
                                line.startsWith('SCHEDULE') ||
                                line.startsWith('JEWELS')
                                    ? {}
                                    : undefined,
                        }),
                    ],
                })
            );
            i++;
            continue;
        }

        // 5. Left-aligned Sub-Headings
        const isLeftSubHeading =
            line.startsWith('In the matter of:') ||
            line.startsWith('IN THE MATTER OF:') ||
            line.startsWith('FROM:') ||
            line.startsWith('From:') ||
            line.startsWith('TO:') ||
            line.startsWith('To:') ||
            line.startsWith('SUBJECT:') ||
            line.startsWith('Subject:') ||
            line.startsWith('REF:') ||
            line.startsWith('Ref:') ||
            line.startsWith('PRAYER') ||
            line.startsWith('LIST OF DOCUMENTS / ANNEXURES') ||
            line.startsWith('JEWELLERY / STRIDHAN') ||
            line.startsWith('FAILURE TO TAKE EFFECTIVE POLICE ACTION') ||
            line.startsWith('GROUNDS FOR') ||
            line.startsWith('GROUNDS:');

        if (isLeftSubHeading) {
            elements.push(
                new Paragraph({
                    alignment: AlignmentType.LEFT,
                    spacing: { line: LINE_SPACING_1_5, before: 200, after: 120 },
                    children: [
                        new TextRun({
                            text: line,
                            font: FONT_FAMILY,
                            size: FONT_SIZE_TITLE,
                            bold: true,
                            underline:
                                line.startsWith('PRAYER') ||
                                line.startsWith('LIST OF DOCUMENTS')
                                    ? {}
                                    : undefined,
                        }),
                    ],
                })
            );
            i++;
            continue;
        }

        // 6. Regular Body Paragraph
        elements.push(
            new Paragraph({
                alignment: options.alignment || AlignmentType.JUSTIFIED,
                spacing: {
                    line: options.lineSpacing || LINE_SPACING_1_5,
                    after: options.spaceAfter || 160,
                },
                children: [
                    new TextRun({
                        text: line,
                        font: FONT_FAMILY,
                        size: options.fontSize || FONT_SIZE_BODY,
                    }),
                ],
            })
        );
        i++;
    }

    return elements;
};

/**
 * Compiles the full Madras High Court Paperbook into a .docx document.
 */
export const buildMadrasHCPaperbookDocx = async (
    params: BuildDocxParams
): Promise<{ base64: string; fileName: string }> => {
    const { caseData, pleadingType, courtTier, advocateProfile, sections, indexItems = [] } = params;
    const tierInfo = COURT_TIERS.find(t => t.value === courtTier) || COURT_TIERS[0];
    const pleadingInfo = PLEADING_TYPES.find(p => p.value === pleadingType) || PLEADING_TYPES[0];

    const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const advocateName = advocateProfile.name || 'Counsel for Petitioner';
    const barEnrolment = advocateProfile.barEnrolment || 'MS/     /20  ';
    const chamberAddress = advocateProfile.chamberAddress || 'High Court Buildings, Chennai - 600104';

    // ─────────────────────────────────────────────────────────────────────────
    // 1. SECTION: CHRONOLOGICAL INDEX SHEET (MEMO OF FILING)
    // ─────────────────────────────────────────────────────────────────────────
    const indexTableRows: TableRow[] = [
        // Table Header
        new TableRow({
            tableHeader: true,
            children: [
                new TableCell({
                    width: { size: 1000, type: WidthType.DXA },
                    shading: { type: ShadingType.CLEAR, fill: 'EAEAEA' },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new TextRun({ text: 'S.No.', font: FONT_FAMILY, size: FONT_SIZE_CAPTION, bold: true })],
                        }),
                    ],
                }),
                new TableCell({
                    width: { size: 4500, type: WidthType.DXA },
                    shading: { type: ShadingType.CLEAR, fill: 'EAEAEA' },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new TextRun({ text: 'Description of Document', font: FONT_FAMILY, size: FONT_SIZE_CAPTION, bold: true })],
                        }),
                    ],
                }),
                new TableCell({
                    width: { size: 1500, type: WidthType.DXA },
                    shading: { type: ShadingType.CLEAR, fill: 'EAEAEA' },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new TextRun({ text: 'Date', font: FONT_FAMILY, size: FONT_SIZE_CAPTION, bold: true })],
                        }),
                    ],
                }),
                new TableCell({
                    width: { size: 1200, type: WidthType.DXA },
                    shading: { type: ShadingType.CLEAR, fill: 'EAEAEA' },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new TextRun({ text: 'Page No.', font: FONT_FAMILY, size: FONT_SIZE_CAPTION, bold: true })],
                        }),
                    ],
                }),
                new TableCell({
                    width: { size: 1800, type: WidthType.DXA },
                    shading: { type: ShadingType.CLEAR, fill: 'EAEAEA' },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new TextRun({ text: 'Court Fee', font: FONT_FAMILY, size: FONT_SIZE_CAPTION, bold: true })],
                        }),
                    ],
                }),
            ],
        }),
    ];

    // Populate Table Rows from indexItems
    for (const item of indexItems) {
        indexTableRows.push(
            new TableRow({
                children: [
                    new TableCell({
                        width: { size: 1000, type: WidthType.DXA },
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [new TextRun({ text: item.sNo.toString(), font: FONT_FAMILY, size: FONT_SIZE_BODY })],
                            }),
                        ],
                    }),
                    new TableCell({
                        width: { size: 4500, type: WidthType.DXA },
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.LEFT,
                                children: [new TextRun({ text: item.description, font: FONT_FAMILY, size: FONT_SIZE_BODY })],
                            }),
                        ],
                    }),
                    new TableCell({
                        width: { size: 1500, type: WidthType.DXA },
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [new TextRun({ text: item.date || todayStr, font: FONT_FAMILY, size: FONT_SIZE_BODY })],
                            }),
                        ],
                    }),
                    new TableCell({
                        width: { size: 1200, type: WidthType.DXA },
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [new TextRun({ text: item.pageNo, font: FONT_FAMILY, size: FONT_SIZE_BODY, bold: true })],
                            }),
                        ],
                    }),
                    new TableCell({
                        width: { size: 1800, type: WidthType.DXA },
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [new TextRun({ text: item.courtFee || '—', font: FONT_FAMILY, size: FONT_SIZE_CAPTION })],
                            }),
                        ],
                    }),
                ],
            })
        );
    }

    const indexTable = new Table({
        rows: indexTableRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
    });

    const indexSheetElements: (Paragraph | Table)[] = [
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
                new TextRun({
                    text: tierInfo.headerTitle,
                    font: FONT_FAMILY,
                    size: FONT_SIZE_HEADER,
                    bold: true,
                }),
            ],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
                new TextRun({
                    text: caseData.caseNumber || 'Crl.O.P. No.         / 2026',
                    font: FONT_FAMILY,
                    size: FONT_SIZE_TITLE,
                    bold: true,
                }),
            ],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [
                new TextRun({
                    text: 'CHRONOLOGICAL INDEX / MEMO OF FILING',
                    font: FONT_FAMILY,
                    size: FONT_SIZE_TITLE,
                    bold: true,
                    underline: {},
                }),
            ],
        }),
        indexTable,
        new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { before: 240, after: 120 },
            children: [
                new TextRun({
                    text: `Dated at ${tierInfo.city} on this the ${todayStr}.`,
                    font: FONT_FAMILY,
                    size: FONT_SIZE_BODY,
                }),
            ],
        }),
        new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 240, after: 240 },
            children: [
                new TextRun({
                    text: `COUNSEL FOR PETITIONER\n${advocateName} (${barEnrolment})`,
                    font: FONT_FAMILY,
                    size: FONT_SIZE_BODY,
                    bold: true,
                }),
            ],
        }),
        new Paragraph({
            children: [new PageBreak()],
        }),
    ];

    // ─────────────────────────────────────────────────────────────────────────
    // 2. SECTION: SYNOPSIS & CHRONOLOGICAL LIST OF DATES
    // ─────────────────────────────────────────────────────────────────────────
    const synopsisElements = createCourtFormattedElements(sections.synopsis, {
        fontSize: FONT_SIZE_BODY,
        lineSpacing: LINE_SPACING_1_5,
    });

    const fullSynopsisElements: (Paragraph | Table)[] = [
        ...synopsisElements,
        new Paragraph({
            children: [new PageBreak()],
        }),
    ];

    // ─────────────────────────────────────────────────────────────────────────
    // 3. SECTION: SUBSTANTIVE PETITION
    // ─────────────────────────────────────────────────────────────────────────
    const petitionElements = createCourtFormattedElements(sections.petition, {
        fontSize: FONT_SIZE_BODY,
        lineSpacing: LINE_SPACING_1_5,
    });

    const fullPetitionElements: (Paragraph | Table)[] = [
        ...petitionElements,
        new Paragraph({
            children: [new PageBreak()],
        }),
    ];

    // ─────────────────────────────────────────────────────────────────────────
    // 4. SECTION: SUPPORTING VERIFICATION AFFIDAVIT
    // ─────────────────────────────────────────────────────────────────────────
    const affidavitElements = createCourtFormattedElements(sections.affidavit, {
        fontSize: FONT_SIZE_BODY,
        lineSpacing: LINE_SPACING_1_5,
    });

    const fullAffidavitElements: (Paragraph | Table)[] = [
        ...affidavitElements,
        new Paragraph({
            children: [new PageBreak()],
        }),
    ];

    // ─────────────────────────────────────────────────────────────────────────
    // 5. SECTION: VAKALATNAMA & BACK-SHEET (DOCKET)
    // ─────────────────────────────────────────────────────────────────────────
    const vakalatElements = createCourtFormattedElements(sections.vakalat, {
        fontSize: FONT_SIZE_BODY,
        lineSpacing: LINE_SPACING_1_5,
    });

    const fullVakalatElements: (Paragraph | Table)[] = [
        ...vakalatElements,
        new Paragraph({
            children: [new PageBreak()],
        }),
        // Back-sheet (Docket Endorsement)
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 1000, after: 180 },
            children: [
                new TextRun({
                    text: tierInfo.headerTitle,
                    font: FONT_FAMILY,
                    size: FONT_SIZE_HEADER,
                    bold: true,
                }),
            ],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [
                new TextRun({
                    text: caseData.caseNumber || 'Crl.O.P. No.         / 2026',
                    font: FONT_FAMILY,
                    size: FONT_SIZE_TITLE,
                    bold: true,
                }),
            ],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
                new TextRun({
                    text: `${(caseData.client?.name || caseData.clientName || 'PETITIONER').toUpperCase()}\n... PETITIONER`,
                    font: FONT_FAMILY,
                    size: FONT_SIZE_BODY,
                    bold: true,
                }),
            ],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
                new TextRun({
                    text: '-VERSUS-',
                    font: FONT_FAMILY,
                    size: FONT_SIZE_BODY,
                    bold: true,
                }),
            ],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
                new TextRun({
                    text: 'THE STATE REP. BY INSPECTOR OF POLICE\n... RESPONDENT',
                    font: FONT_FAMILY,
                    size: FONT_SIZE_BODY,
                    bold: true,
                }),
            ],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
            children: [
                new TextRun({
                    text: `PAPERBOOK / MEMORANDUM OF ${pleadingInfo.label.toUpperCase()}`,
                    font: FONT_FAMILY,
                    size: FONT_SIZE_TITLE,
                    bold: true,
                    underline: {},
                }),
            ],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 400 },
            children: [
                new TextRun({
                    text: `COUNSEL FOR PETITIONER:\n${advocateName}, Advocate\nEnrolment No.: ${barEnrolment}\n${chamberAddress}\nMobile: ${advocateProfile.phone || ''} | Email: ${advocateProfile.email || ''}`,
                    font: FONT_FAMILY,
                    size: FONT_SIZE_BODY,
                    bold: true,
                }),
            ],
        }),
    ];

    // Combine all sections into the unified Document
    const doc = new DocxDocument({
        sections: [
            {
                properties: {
                    page: {
                        size: MHC_PAGE_LAYOUT.size,
                        margin: MHC_PAGE_LAYOUT.margins,
                    },
                },
                headers: {
                    default: new Header({
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.RIGHT,
                                children: [
                                    new TextRun({
                                        text: `${pleadingInfo.label} — ${tierInfo.shortName}`,
                                        font: FONT_FAMILY,
                                        size: FONT_SIZE_CAPTION,
                                        color: '888888',
                                    }),
                                ],
                            }),
                        ],
                    }),
                },
                footers: {
                    default: new Footer({
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.RIGHT,
                                children: [
                                    new TextRun({
                                        children: [PageNumber.CURRENT],
                                        font: FONT_FAMILY,
                                        size: FONT_SIZE_CAPTION,
                                        bold: true,
                                    }),
                                ],
                            }),
                        ],
                    }),
                },
                children: [
                    ...indexSheetElements,
                    ...fullSynopsisElements,
                    ...fullPetitionElements,
                    ...fullAffidavitElements,
                    ...fullVakalatElements,
                ],
            },
        ],
    });

    const base64 = await Packer.toBase64String(doc);
    const safeClient = (caseData.client?.name || caseData.clientName || 'Case').replace(/[^a-zA-Z0-9]/g, '_');
    const safePleading = pleadingInfo.value.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${safePleading}_${safeClient}_${Date.now()}.docx`;

    return {
        base64,
        fileName,
    };
};

/**
 * Saves the compiled DOCX base64 string to persistent device storage.
 */
export const savePaperbookDocxFile = async (
    base64Data: string,
    fileName: string
): Promise<{ uri: string; fileSize: number }> => {
    await ensureDocumentsDir();
    const destUri = `${FileSystem.documentDirectory}documents/${fileName}`;

    await FileSystem.writeAsStringAsync(destUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
    });

    const fileInfo = await FileSystem.getInfoAsync(destUri);
    const fileSize = (fileInfo as any).size || 0;

    return { uri: destUri, fileSize };
};
