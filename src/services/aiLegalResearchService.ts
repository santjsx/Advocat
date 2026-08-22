import { Citation, LegalDatabase, ResearchType } from '../models/Research';
import { v4 as uuidv4 } from 'uuid';
import { useAppStore } from '../store/useAppStore';

export interface AIResearchResult {
    query: string;
    summary: string;
    precedents: {
        id: string;
        title: string;
        citation: string;
        court: string;
        year: number;
        bench?: string;
        ratio: string;
        keyHolding: string;
        relevantSections: string[];
        source: LegalDatabase;
        url?: string;
    }[];
    applicableStatutes: {
        act: string;
        section: string;
        title: string;
        bnsCrossReference?: string;
        keyProvision: string;
    }[];
    practicalAdvocacyTips: string[];
}

const RESEARCH_SYSTEM_PROMPT = `You are a Senior Supreme Court & Madras High Court Legal Research Assistant for Indian Advocates.
Analyze the advocate's legal query, proposition, or statutory section and provide authoritative case law, ratio decidendi, and statutory guidance.

Always prioritize:
1. Supreme Court of India landmark & recent Constitution/Division Bench judgments.
2. High Court of Judicature at Madras authoritative rulings.
3. Accurate BNS (Bharatiya Nyaya Sanhita) and BNSS (Bharatiya Nagarik Suraksha Sanhita) corresponding provisions alongside legacy IPC/CrPC sections.

Return ONLY a valid JSON object matching this schema:
{
  "summary": "Crisp legal synthesis of the proposition (2-3 sentences)",
  "precedents": [
    {
      "title": "Case Name (e.g. Satender Kumar Antil v. CBI)",
      "citation": "Official Citation (e.g. (2022) 10 SCC 51 / AIR 2022 SC 3386)",
      "court": "Supreme Court of India / High Court of Madras",
      "year": 2022,
      "bench": "Hon'ble S.K. Kaul & M.M. Sundresh, JJ.",
      "ratio": "The central legal principle or rule of law laid down",
      "keyHolding": "Practical holding applicable to current litigation",
      "relevantSections": ["Sec 482 BNSS", "Sec 438 CrPC"],
      "source": "INDIAN_KANOON",
      "url": "https://indiankanoon.org"
    }
  ],
  "applicableStatutes": [
    {
      "act": "Bharatiya Nagarik Suraksha Sanhita, 2023",
      "section": "Section 482",
      "title": "Direction for grant of bail to person apprehending arrest",
      "bnsCrossReference": "Replaces Section 438 of Code of Criminal Procedure, 1973",
      "keyProvision": "Core statutory requirement for invoking relief"
    }
  ],
  "practicalAdvocacyTips": [
    "Tip 1 on procedural compliance or Madras High Court filing practice",
    "Tip 2 on averments required in petition / affidavit",
    "Tip 3 on oral argument strategy"
  ]
}`;

// Curated Landmark Offline Research Database for Instant Discovery
export const LANDMARK_CITATIONS: Citation[] = [
    {
        id: 'landmark-1',
        type: 'CASE_LAW',
        title: 'Satender Kumar Antil v. Central Bureau of Investigation',
        citation: '(2022) 10 SCC 51',
        court: 'Supreme Court of India',
        year: 2022,
        judge: 'Sanjay Kishan Kaul & M.M. Sundresh, JJ.',
        source: 'SUPREME_COURT',
        summary: 'Comprehensive guidelines categorizing offenses (Categories A, B, C, D) for grant of bail without custodial arrest where accused complied with Sec 41A notices.',
        keyPoints: [
            'Category A: Offenses punishable with <= 7 yrs imprisonment - no physical arrest required on filing chargesheet if accused cooperated.',
            'Strict adherence to Sec 41 & 41A CrPC (Sec 35 BNSS) mandatory for investigating agencies.',
            'Special courts must decide bail applications on the same day or within 2 weeks.'
        ],
        relevantSections: ['Sec 482 BNSS', 'Sec 438 CrPC', 'Sec 35 BNSS', 'Sec 41A CrPC'],
        linkedCaseIds: [],
        tags: ['Bail Guidelines', 'Arrest Protocol', 'Criminal Procedure', 'BNS/BNSS'],
        isFavorite: true,
        url: 'https://indiankanoon.org/doc/85195009/',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'landmark-2',
        type: 'CASE_LAW',
        title: 'Arnesh Kumar v. State of Bihar & Anr.',
        citation: '(2014) 8 SCC 273',
        court: 'Supreme Court of India',
        year: 2014,
        judge: 'Chandramauli Kumar Prasad & Pinaki Chandra Ghose, JJ.',
        source: 'SUPREME_COURT',
        summary: 'Mandatory arrest checklist for offenses punishable with imprisonment up to 7 years (such as Sec 498A IPC / Sec 85 BNS). Police officer must record reasons in writing.',
        keyPoints: [
            'Police officers shall not automatically arrest accused upon registration of FIR under Sec 498A / 7-year offenses.',
            'Notice of appearance under Sec 41A CrPC must be served within 2 weeks of institution.',
            'Magistrate must verify reasons recorded before authorizing further detention.'
        ],
        relevantSections: ['Sec 85 BNS', 'Sec 498A IPC', 'Sec 35 BNSS', 'Sec 41 CrPC'],
        linkedCaseIds: [],
        tags: ['Arrest Protection', 'Section 498A', 'Notice of Appearance', 'Matrimonial'],
        isFavorite: true,
        url: 'https://indiankanoon.org/doc/298347/',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'landmark-3',
        type: 'CASE_LAW',
        title: 'State of Haryana & Ors. v. Bhajan Lal & Ors.',
        citation: '1992 Supp (1) SCC 335',
        court: 'Supreme Court of India',
        year: 1992,
        judge: 'S. Ratnavel Pandian & K. Jayachandra Reddy, JJ.',
        source: 'SUPREME_COURT',
        summary: 'Locus classicus laying down 7 exhaustive categories/illustrative parameters where High Courts can exercise inherent powers under Sec 482 CrPC / Sec 528 BNSS to quash FIRs and criminal proceedings.',
        keyPoints: [
            'Where uncontroverted allegations in FIR do not disclose commission of any cognizable offense.',
            'Where allegations are absurd and inherently improbable.',
            'Where proceeding is manifestly attended with mala fide and instituted with an ulterior motive for wreaking vengeance.'
        ],
        relevantSections: ['Sec 528 BNSS', 'Sec 482 CrPC', 'Quash FIR'],
        linkedCaseIds: [],
        tags: ['Quash FIR', 'Inherent Powers', 'Sec 482 CrPC', 'Sec 528 BNSS'],
        isFavorite: true,
        url: 'https://indiankanoon.org/doc/1033637/',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'landmark-4',
        type: 'CASE_LAW',
        title: 'Rangappa v. Sri Mohan',
        citation: '(2010) 11 SCC 441',
        court: 'Supreme Court of India',
        year: 2010,
        judge: 'K.G. Balakrishnan, C.J.I., Deepak Verma & B.S. Chauhan, JJ.',
        source: 'SUPREME_COURT',
        summary: 'Three-Judge Bench ruling clarifying Section 139 Negotiable Instruments Act presumption. Presumption of legally enforceable debt is rebuttable on a standard of preponderance of probabilities.',
        keyPoints: [
            'Section 139 NI Act presumption includes the existence of a legally enforceable debt or liability.',
            'Accused can rebut presumption by raising probable defense through cross-examination without entering witness box.',
            'Standard of proof required from accused is only preponderance of probabilities, not beyond reasonable doubt.'
        ],
        relevantSections: ['Sec 138 NI Act', 'Sec 139 NI Act', 'Sec 118 NI Act'],
        linkedCaseIds: [],
        tags: ['NI Act', 'Cheque Bounce', 'Presumption of Debt', 'Sec 138'],
        isFavorite: false,
        url: 'https://indiankanoon.org/doc/188806/',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'landmark-5',
        type: 'CASE_LAW',
        title: 'Dalpat Kumar & Anr. v. Prahlad Singh & Ors.',
        citation: '(1992) 1 SCC 719',
        court: 'Supreme Court of India',
        year: 1992,
        judge: 'K. Ramaswamy, J.',
        source: 'SUPREME_COURT',
        summary: 'Authoritative ruling on the grant of Temporary Injunction under Order 39 Rules 1 & 2 CPC. Establishes the sacred tripartite test: Prima Facie Case, Balance of Convenience, and Irreparable Injury.',
        keyPoints: [
            'Prima facie case alone is not sufficient for grant of injunction without balance of convenience and irreparable injury.',
            'Court must exercise sound judicial discretion, not arbitrary or fanciful discretion.',
            'Irreparable injury means injury which cannot be adequately compensated by damages in terms of money.'
        ],
        relevantSections: ['Order 39 Rule 1 CPC', 'Order 39 Rule 2 CPC', 'Sec 94 CPC'],
        linkedCaseIds: [],
        tags: ['Injunction', 'CPC', 'Civil Procedure', 'Interim Relief'],
        isFavorite: false,
        url: 'https://indiankanoon.org/doc/744040/',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'landmark-6',
        type: 'CASE_LAW',
        title: 'Rajnesh v. Neha & Anr.',
        citation: '(2021) 2 SCC 324',
        court: 'Supreme Court of India',
        year: 2021,
        judge: 'Indu Malhotra & R. Subhash Reddy, JJ.',
        source: 'SUPREME_COURT',
        summary: 'Landmark guidelines framing comprehensive uniform procedure for grant of Interim Maintenance in matrimonial disputes. Mandated filing of Affidavit of Assets and Liabilities by both spouses.',
        keyPoints: [
            'Mandatory filing of standard Affidavit of Assets & Liabilities (Annexure I, II, III).',
            'Maintenance must be awarded from the date of filing of application, not date of order.',
            'Overlapping maintenance orders under DV Act, Sec 125 CrPC, and HMA must be adjusted/set-off.'
        ],
        relevantSections: ['Sec 144 BNSS', 'Sec 125 CrPC', 'Sec 24 HMA', 'DV Act Sec 12'],
        linkedCaseIds: [],
        tags: ['Maintenance', 'Family Law', 'Affidavit of Assets', 'DV Act'],
        isFavorite: true,
        url: 'https://indiankanoon.org/doc/135914101/',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'landmark-7',
        type: 'CASE_LAW',
        title: 'Whirlpool Corporation v. Registrar of Trade Marks, Mumbai',
        citation: '(1998) 8 SCC 1',
        court: 'Supreme Court of India',
        year: 1998,
        judge: 'S. Saghir Ahmad & K.T. Thomas, JJ.',
        source: 'SUPREME_COURT',
        summary: 'Foundational precedent on maintainability of Writ Petition under Article 226 of the Constitution despite existence of alternate statutory remedy.',
        keyPoints: [
            'Alternate statutory remedy is a rule of discretion and convenience, not an absolute constitutional bar.',
            'Writ maintainable where fundamental rights are violated, principles of natural justice breached, or order passed wholly without jurisdiction.',
            'High Court retains plenary constitutional jurisdiction under Article 226.'
        ],
        relevantSections: ['Article 226 Constitution', 'Article 32 Constitution', 'Writ Jurisdiction'],
        linkedCaseIds: [],
        tags: ['Writ Petition', 'Article 226', 'Alternate Remedy', 'Constitutional Law'],
        isFavorite: false,
        url: 'https://indiankanoon.org/doc/1647493/',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }
];

export async function searchAILegalPrecedents(
    query: string,
    apiKey?: string
): Promise<AIResearchResult> {
    const trimmed = query.trim();
    if (!trimmed) {
        throw new Error('Please enter a valid legal topic, section, or proposition.');
    }

    // If API key is available, call DeepSeek AI (or compatible LLM)
    if (apiKey && apiKey.trim().length > 10) {
        try {
            const response = await fetch('https://api.deepseek.com/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey.trim()}`
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [
                        { role: 'system', content: RESEARCH_SYSTEM_PROMPT },
                        {
                            role: 'user',
                            content: `LEGAL RESEARCH QUERY / PROPOSITION:\n"${trimmed}"\n\nProvide comprehensive, authoritative Supreme Court & Madras High Court case laws and BNS/BNSS statutory cross-references in the specified JSON format.`
                        }
                    ],
                    response_format: { type: 'json_object' },
                    temperature: 0.2
                })
            });

            if (response.ok) {
                const data = await response.json();

                if (data?.usage) {
                    try {
                        useAppStore.getState().recordAiTokenUsage({
                            promptTokens: data.usage.prompt_tokens || 0,
                            completionTokens: data.usage.completion_tokens || 0,
                            totalTokens: data.usage.total_tokens || 0,
                            model: 'deepseek-chat',
                            feature: 'RESEARCH',
                        });
                    } catch (e) {
                        console.warn('Could not record AI usage in store:', e);
                    }
                }

                const rawJson = data?.choices?.[0]?.message?.content;
                if (rawJson) {
                    const parsed = JSON.parse(rawJson);
                    return {
                        query: trimmed,
                        summary: parsed.summary || `Legal synthesis for ${trimmed}`,
                        precedents: (parsed.precedents || []).map((p: any) => ({
                            id: uuidv4(),
                            title: p.title || 'Case Law Precedent',
                            citation: p.citation || 'Citation Pending',
                            court: p.court || 'Supreme Court of India',
                            year: p.year || new Date().getFullYear(),
                            bench: p.bench,
                            ratio: p.ratio || '',
                            keyHolding: p.keyHolding || '',
                            relevantSections: p.relevantSections || [],
                            source: p.source || 'INDIAN_KANOON',
                            url: p.url || `https://indiankanoon.org/search/?formInput=${encodeURIComponent(p.title || trimmed)}`,
                        })),
                        applicableStatutes: parsed.applicableStatutes || [],
                        practicalAdvocacyTips: parsed.practicalAdvocacyTips || [
                            'Ensure specific factual matrix is distinguished from contrary high court bench precedents.',
                            'File certified copies of trial court proceedings along with index sheet.',
                            'Verify active limitation period and section compliance.'
                        ]
                    };
                }
            }
        } catch (error) {
            console.warn('[AI Legal Research] Live API call failed, falling back to heuristic precedent generator:', error);
        }
    }

    // Heuristic Offline Legal Engine
    return generateOfflineAIResearchResult(trimmed);
}

function generateOfflineAIResearchResult(query: string): AIResearchResult {
    const q = query.toLowerCase();

    // Check matching landmark categories
    let matchedLandmarks = LANDMARK_CITATIONS.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.citation.toLowerCase().includes(q) ||
        c.summary?.toLowerCase().includes(q) ||
        c.tags.some(t => t.toLowerCase().includes(q)) ||
        c.relevantSections?.some(s => s.toLowerCase().includes(q))
    );

    if (matchedLandmarks.length === 0) {
        matchedLandmarks = LANDMARK_CITATIONS.slice(0, 3);
    }

    let summary = `Judicial analysis and precedent principles governing: "${query}". Under established Supreme Court and Madras High Court jurisprudence, courts apply rigorous statutory scrutiny and constitutional fairness standards.`;
    let statutes: AIResearchResult['applicableStatutes'] = [
        {
            act: 'Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS)',
            section: 'Section 528 / Section 482',
            title: 'Saving of Inherent Powers of High Court',
            bnsCrossReference: 'Replaces Section 482 of CrPC, 1973',
            keyProvision: 'High Court preserves inherent power to prevent abuse of the process of any court and secure the ends of justice.'
        },
        {
            act: 'Bharatiya Nyaya Sanhita, 2023 (BNS)',
            section: 'General Principles',
            title: 'Criminal Liability & Statutory Offenses',
            bnsCrossReference: 'Replaces substantive provisions of Indian Penal Code, 1860',
            keyProvision: 'Requires proof of mens rea and specific overt act matching statutory ingredients.'
        }
    ];

    if (q.includes('bail') || q.includes('438') || q.includes('439') || q.includes('482') || q.includes('483')) {
        summary = `Comprehensive bail jurisprudence governing "${query}". The Supreme Court has repeatedly affirmed that 'Bail is the rule, jail is the exception' (Satender Kumar Antil v. CBI), with mandatory compliance with arrest protection notice under Sec 35 BNSS.`;
        statutes = [
            {
                act: 'Bharatiya Nagarik Suraksha Sanhita, 2023',
                section: 'Section 482 / 483',
                title: 'Direction for grant of Bail & Special Powers',
                bnsCrossReference: 'Replaces Sections 438 & 439 of CrPC, 1973',
                keyProvision: 'Anticipatory bail maintainable on reasonable apprehension of arrest in non-bailable offense.'
            }
        ];
    } else if (q.includes('quash') || q.includes('fir') || q.includes('528')) {
        summary = `Inherent quashing jurisdiction under Sec 528 BNSS / Sec 482 CrPC for "${query}". High Court exercises power where allegations in FIR/complaint even if taken at face value do not constitute any cognizable offense (Bhajan Lal principles).`;
    } else if (q.includes('138') || q.includes('cheque') || q.includes('ni act')) {
        summary = `Section 138 NI Act statutory framework for "${query}". Strict compliance with statutory notice timeline (15 days notice + 15 days cure + 30 days limitation) is condition precedent for criminal complaint.`;
        statutes = [
            {
                act: 'Negotiable Instruments Act, 1881',
                section: 'Section 138, 139 & 142',
                title: 'Dishonour of Cheque for Insufficiency of Funds',
                bnsCrossReference: 'Special Commercial Statute (Negotiable Instruments)',
                keyProvision: 'Presumption under Sec 139 is rebuttable upon establishing preponderance of probability.'
            }
        ];
    }

    return {
        query,
        summary,
        precedents: matchedLandmarks.map(l => ({
            id: uuidv4(),
            title: l.title,
            citation: l.citation,
            court: l.court || 'Supreme Court of India',
            year: l.year || 2022,
            bench: l.judge,
            ratio: l.summary || '',
            keyHolding: l.keyPoints?.[0] || 'Mandatory rule of law established for trial and appellate courts.',
            relevantSections: l.relevantSections || [],
            source: l.source,
            url: l.url || 'https://indiankanoon.org',
        })),
        applicableStatutes: statutes,
        practicalAdvocacyTips: [
            'Distinguish unfavorable single-judge precedents by demonstrating specific factual variance on record.',
            'Attach certified extract of relevant trial court orders and statutory notice receipts.',
            'Cite Constitution Bench and Three-Judge Bench judgments over two-judge bench rulings for maximum binding authority.'
        ]
    };
}
