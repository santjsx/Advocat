import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { Case, CaseNote, TimelineEvent, CaseStage, CaseStatus, LegalSection } from '../models/Case';
import { Deadline } from '../models/Deadline';
import { Document, DocumentVersion } from '../models/Document';
import { Citation, ResearchNote, SearchHistory } from '../models/Research';
import {
    NotificationPreferences,
    NotificationHistoryItem,
    DEFAULT_NOTIFICATION_PREFERENCES
} from '../models/Notification';
import { AdvocateProfile, DEFAULT_ADVOCATE_PROFILE, PaperbookBundle } from '../models/Pleading';
import { AiUsageSummary, DEFAULT_AI_USAGE_SUMMARY, AiUsageRecord, DeepSeekBalanceInfo } from '../models/AiUsage';
import { fetchDeepSeekBalance, calculateTokenCost } from '../services/deepseekUsageService';
import { MOCK_CASES, MOCK_DEADLINES } from '../data/mockCases';
import { storage } from '../services/storage';
import { ThemeMode } from '../theme/colors';

interface AppState {
    cases: Case[];
    deadlines: Deadline[];
    documents: Document[];

    // Settings
    userName: string;
    setUserName: (name: string) => void;

    // Advocate Profile & AI Settings
    advocateProfile: AdvocateProfile;
    updateAdvocateProfile: (profile: Partial<AdvocateProfile>) => void;

    // DeepSeek AI Usage & Credit Telemetry
    aiUsageSummary: AiUsageSummary;
    recordAiTokenUsage: (params: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        model?: string;
        feature?: 'PLEADING' | 'RESEARCH' | 'OCR_VISION' | 'TRANSLATION' | 'OTHER';
    }) => void;
    setAiUsageSummary: (summary: Partial<AiUsageSummary>) => void;
    syncDeepSeekBalance: () => Promise<DeepSeekBalanceInfo>;

    // Paperbook Bundles
    paperbookBundles: PaperbookBundle[];
    addPaperbookBundle: (bundle: PaperbookBundle) => void;
    updatePaperbookBundle: (bundle: PaperbookBundle) => void;
    deletePaperbookBundle: (bundleId: string) => void;
    getPaperbookBundlesByCase: (caseId: string) => PaperbookBundle[];

    // Theme
    themeMode: ThemeMode;
    setThemeMode: (mode: ThemeMode) => void;

    // Notification Preferences
    notificationPrefs: NotificationPreferences;
    updateNotificationPrefs: (prefs: Partial<NotificationPreferences>) => void;

    // Notification History
    notificationHistory: NotificationHistoryItem[];
    addNotificationToHistory: (notification: NotificationHistoryItem) => void;
    markNotificationRead: (notificationId: string) => void;
    markAllNotificationsRead: () => void;
    clearNotificationHistory: () => void;

    // Mock Data Action
    loadMockData: () => void;

    // Case Actions
    addCase: (newCase: Case) => void;
    updateCase: (updatedCase: Case) => void;
    deleteCase: (caseId: string) => void;
    addCaseNote: (caseId: string, note: CaseNote) => void;
    updateCaseNote: (caseId: string, noteId: string, content: string) => void;
    deleteCaseNote: (caseId: string, noteId: string) => void;
    addTimelineEvent: (caseId: string, event: TimelineEvent) => void;
    updateCaseStage: (caseId: string, stage: CaseStage) => void;
    updateCaseStatus: (caseId: string, status: CaseStatus) => void;
    addLegalSection: (caseId: string, section: LegalSection) => void;
    deleteLegalSection: (caseId: string, sectionId: string) => void;

    // Deadline Actions
    addDeadline: (deadline: Deadline) => void;
    updateDeadline: (updatedDeadline: Deadline) => void;
    deleteDeadline: (deadlineId: string) => void;
    toggleDeadlineComplete: (deadlineId: string) => void;

    // Document Actions
    addDocument: (doc: Document) => void;
    updateDocument: (doc: Document) => void;
    deleteDocument: (docId: string) => void;
    renameDocument: (docId: string, newName: string) => void;
    addDocumentVersion: (docId: string, version: DocumentVersion) => void;
    getDocumentsByCase: (caseId: string) => Document[];

    // Research Actions
    citations: Citation[];
    researchNotes: ResearchNote[];
    searchHistory: SearchHistory[];
    addCitation: (citation: Citation) => void;
    updateCitation: (citation: Citation) => void;
    deleteCitation: (citationId: string) => void;
    toggleCitationFavorite: (citationId: string) => void;
    linkCitationToCase: (citationId: string, caseId: string) => void;
    addResearchNote: (note: ResearchNote) => void;
    updateResearchNote: (note: ResearchNote) => void;
    deleteResearchNote: (noteId: string) => void;
    addSearchHistory: (search: SearchHistory) => void;
    clearSearchHistory: () => void;
    importData: (data: {
        cases: Case[],
        deadlines: Deadline[],
        documents?: Document[],
        citations?: Citation[],
        researchNotes?: ResearchNote[],
        searchHistory?: SearchHistory[],
        advocateProfile?: AdvocateProfile,
        paperbookBundles?: PaperbookBundle[],
        aiUsageSummary?: AiUsageSummary
    }) => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set, get) => ({
            cases: MOCK_CASES,
            deadlines: MOCK_DEADLINES,
            documents: [],
            citations: [],
            researchNotes: [],
            searchHistory: [],
            userName: 'Counsel',
            themeMode: 'dark' as ThemeMode,
            advocateProfile: DEFAULT_ADVOCATE_PROFILE,
            paperbookBundles: [],
            aiUsageSummary: DEFAULT_AI_USAGE_SUMMARY,

            // Notification State
            notificationPrefs: DEFAULT_NOTIFICATION_PREFERENCES,
            notificationHistory: [],

            setUserName: (name) => set({ userName: name }),
            setThemeMode: (mode) => set({ themeMode: mode }),

            recordAiTokenUsage: ({ promptTokens, completionTokens, totalTokens, model = 'deepseek-chat', feature = 'PLEADING' }) => {
                const cost = calculateTokenCost(promptTokens, completionTokens, model);
                const record: AiUsageRecord = {
                    id: `usage_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                    timestamp: new Date().toISOString(),
                    promptTokens,
                    completionTokens,
                    totalTokens,
                    model,
                    feature,
                    costUsd: cost,
                };

                set((state) => {
                    const current = state.aiUsageSummary || DEFAULT_AI_USAGE_SUMMARY;
                    const newTotalTokens = current.totalTokens + totalTokens;
                    const newPromptTokens = current.promptTokens + promptTokens;
                    const newCompletionTokens = current.completionTokens + completionTokens;
                    const newRequests = current.totalRequests + 1;
                    const newCost = Math.round((current.totalCostUsd + cost) * 10000) / 10000;

                    return {
                        aiUsageSummary: {
                            ...current,
                            totalTokens: newTotalTokens,
                            promptTokens: newPromptTokens,
                            completionTokens: newCompletionTokens,
                            totalRequests: newRequests,
                            totalCostUsd: newCost,
                            history: [record, ...(current.history || [])].slice(0, 100),
                        }
                    };
                });
            },

            setAiUsageSummary: (summary) => set((state) => ({
                aiUsageSummary: { ...(state.aiUsageSummary || DEFAULT_AI_USAGE_SUMMARY), ...summary }
            })),

            syncDeepSeekBalance: async () => {
                const apiKey = get().advocateProfile?.deepseekApiKey;
                const result = await fetchDeepSeekBalance(apiKey || '');
                if (result.isAvailable || result.totalBalance !== '0.00' || !result.error) {
                    set((state) => ({
                        aiUsageSummary: {
                            ...(state.aiUsageSummary || DEFAULT_AI_USAGE_SUMMARY),
                            toppedUpBalance: result.toppedUpBalance,
                            totalBalance: result.totalBalance,
                            grantedBalance: result.grantedBalance,
                            currency: result.currency,
                            isAvailable: result.isAvailable,
                            lastSyncedAt: new Date().toISOString(),
                        }
                    }));
                }
                return result;
            },

            loadMockData: () => set((state) => {
                const existingIds = new Set((state.cases || []).map(c => c.id));
                const newCases = MOCK_CASES.filter(c => !existingIds.has(c.id));
                const existingDeadlineIds = new Set((state.deadlines || []).map(d => d.id));
                const newDeadlines = MOCK_DEADLINES.filter(d => !existingDeadlineIds.has(d.id));

                return {
                    cases: [...(state.cases || []), ...newCases],
                    deadlines: [...(state.deadlines || []), ...newDeadlines],
                };
            }),

            updateAdvocateProfile: (profile) => set((state) => ({
                advocateProfile: { ...(state.advocateProfile || DEFAULT_ADVOCATE_PROFILE), ...profile, isConfigured: true }
            })),

            addPaperbookBundle: (bundle) => set((state) => ({
                paperbookBundles: [bundle, ...(state.paperbookBundles || [])]
            })),

            updatePaperbookBundle: (bundle) => set((state) => ({
                paperbookBundles: (state.paperbookBundles || []).map((b) => b.id === bundle.id ? bundle : b)
            })),

            deletePaperbookBundle: (bundleId) => set((state) => ({
                paperbookBundles: (state.paperbookBundles || []).filter((b) => b.id !== bundleId)
            })),

            getPaperbookBundlesByCase: (caseId) => {
                return (get().paperbookBundles || []).filter((b) => b.caseId === caseId);
            },

            updateNotificationPrefs: (prefs) => set((state) => ({
                notificationPrefs: { ...state.notificationPrefs, ...prefs }
            })),

            addNotificationToHistory: (notification) => set((state) => ({
                notificationHistory: [notification, ...state.notificationHistory].slice(0, 50)
            })),

            markNotificationRead: (notificationId) => set((state) => ({
                notificationHistory: state.notificationHistory.map(n =>
                    n.id === notificationId ? { ...n, read: true } : n
                )
            })),

            markAllNotificationsRead: () => set((state) => ({
                notificationHistory: state.notificationHistory.map(n => ({ ...n, read: true }))
            })),

            clearNotificationHistory: () => set({ notificationHistory: [] }),

            addCase: (newCase) => set((state) => ({
                cases: [...state.cases, newCase]
            })),

            updateCase: (updatedCase) => set((state) => ({
                cases: state.cases.map((c) => (c.id === updatedCase.id ? updatedCase : c)),
            })),

            deleteCase: (caseId) => set((state) => ({
                cases: (state.cases || []).filter((c) => c.id !== caseId),
                deadlines: (state.deadlines || []).filter((d) => d.caseId !== caseId),
                documents: (state.documents || []).filter((doc) => doc.caseId !== caseId),
                paperbookBundles: (state.paperbookBundles || []).filter((b) => b.caseId !== caseId),
                citations: (state.citations || []).map((cit) => ({
                    ...cit,
                    linkedCaseIds: (cit.linkedCaseIds || []).filter((id) => id !== caseId)
                })),
                researchNotes: (state.researchNotes || []).map((note) => ({
                    ...note,
                    linkedCaseIds: (note.linkedCaseIds || []).filter((id) => id !== caseId)
                })),
            })),

            addCaseNote: (caseId, note) => set((state) => ({
                cases: state.cases.map((c) => {
                    if (c.id === caseId) {
                        const timeline: TimelineEvent = {
                            id: `tl_${Date.now()}`,
                            type: 'NOTE_ADDED',
                            title: 'Note Added',
                            description: note.content.substring(0, 50) + (note.content.length > 50 ? '...' : ''),
                            date: new Date().toISOString(),
                        };
                        return {
                            ...c,
                            notes: [...(c.notes || []), note],
                            timeline: [...(c.timeline || []), timeline],
                            updatedAt: new Date().toISOString(),
                        };
                    }
                    return c;
                }),
            })),

            updateCaseNote: (caseId, noteId, content) => set((state) => ({
                cases: state.cases.map((c) => {
                    if (c.id === caseId) {
                        return {
                            ...c,
                            notes: (c.notes || []).map(n =>
                                n.id === noteId
                                    ? { ...n, content, updatedAt: new Date().toISOString() }
                                    : n
                            ),
                            updatedAt: new Date().toISOString(),
                        };
                    }
                    return c;
                }),
            })),

            deleteCaseNote: (caseId, noteId) => set((state) => ({
                cases: state.cases.map((c) => {
                    if (c.id === caseId) {
                        return {
                            ...c,
                            notes: (c.notes || []).filter(n => n.id !== noteId),
                            updatedAt: new Date().toISOString(),
                        };
                    }
                    return c;
                }),
            })),

            addTimelineEvent: (caseId, event) => set((state) => ({
                cases: state.cases.map((c) => {
                    if (c.id === caseId) {
                        return {
                            ...c,
                            timeline: [...(c.timeline || []), event],
                            updatedAt: new Date().toISOString(),
                        };
                    }
                    return c;
                }),
            })),

            updateCaseStage: (caseId, stage) => set((state) => ({
                cases: state.cases.map((c) => {
                    if (c.id === caseId) {
                        const timeline: TimelineEvent = {
                            id: `tl_${Date.now()}`,
                            type: 'STAGE_CHANGED',
                            title: 'Stage Updated',
                            description: `Case moved to ${stage.replace('_', ' ')} stage`,
                            date: new Date().toISOString(),
                        };
                        return {
                            ...c,
                            stage,
                            timeline: [...(c.timeline || []), timeline],
                            updatedAt: new Date().toISOString(),
                        };
                    }
                    return c;
                }),
            })),

            updateCaseStatus: (caseId, status) => set((state) => ({
                cases: state.cases.map((c) => {
                    if (c.id === caseId) {
                        const timeline: TimelineEvent = {
                            id: `tl_${Date.now()}`,
                            type: 'STATUS_CHANGED',
                            title: 'Status Updated',
                            description: `Case status changed to ${status}`,
                            date: new Date().toISOString(),
                        };
                        return {
                            ...c,
                            status,
                            timeline: [...(c.timeline || []), timeline],
                            updatedAt: new Date().toISOString(),
                        };
                    }
                    return c;
                }),
            })),

            addLegalSection: (caseId, section) => set((state) => ({
                cases: state.cases.map((c) => {
                    if (c.id === caseId) {
                        const timeline: TimelineEvent = {
                            id: `tl_${Date.now()}`,
                            type: 'SECTION_ADDED',
                            title: 'Section Added',
                            description: `${section.act} Section ${section.section} added`,
                            date: new Date().toISOString(),
                        };
                        return {
                            ...c,
                            sections: [...(c.sections || []), section],
                            timeline: [...(c.timeline || []), timeline],
                            updatedAt: new Date().toISOString(),
                        };
                    }
                    return c;
                }),
            })),

            deleteLegalSection: (caseId, sectionId) => set((state) => ({
                cases: state.cases.map((c) => {
                    if (c.id === caseId) {
                        return {
                            ...c,
                            sections: (c.sections || []).filter(s => s.id !== sectionId),
                            updatedAt: new Date().toISOString(),
                        };
                    }
                    return c;
                }),
            })),

            addDeadline: (deadline) => set((state) => ({
                deadlines: [...state.deadlines, deadline],
            })),

            updateDeadline: (updatedDeadline) => set((state) => ({
                deadlines: state.deadlines.map((d) => (d.id === updatedDeadline.id ? updatedDeadline : d)),
            })),

            deleteDeadline: (deadlineId) => set((state) => ({
                deadlines: state.deadlines.filter((d) => d.id !== deadlineId),
            })),

            toggleDeadlineComplete: (id) => set((state) => ({
                deadlines: state.deadlines.map((d) =>
                    d.id === id ? { ...d, isCompleted: !d.isCompleted } : d
                ),
            })),

            // Document Actions
            addDocument: (doc) => set((state) => ({
                documents: [...state.documents, doc],
            })),

            updateDocument: (doc) => set((state) => ({
                documents: state.documents.map((d) => (d.id === doc.id ? doc : d)),
            })),

            deleteDocument: (docId) => set((state) => ({
                documents: state.documents.filter((d) => d.id !== docId),
            })),

            renameDocument: (docId, newName) => set((state) => ({
                documents: state.documents.map((d) =>
                    d.id === docId
                        ? { ...d, name: newName, updatedAt: new Date().toISOString() }
                        : d
                ),
            })),

            addDocumentVersion: (docId, version) => set((state) => ({
                documents: state.documents.map((d) => {
                    if (d.id === docId) {
                        return {
                            ...d,
                            versions: [...d.versions, version],
                            currentVersionId: version.id,
                            updatedAt: new Date().toISOString(),
                        };
                    }
                    return d;
                }),
            })),

            getDocumentsByCase: (caseId) => {
                return get().documents.filter((d) => d.caseId === caseId);
            },

            // Research Actions
            addCitation: (citation) => set((state) => ({
                citations: [...state.citations, citation],
            })),

            updateCitation: (citation) => set((state) => ({
                citations: state.citations.map((c) => (c.id === citation.id ? citation : c)),
            })),

            deleteCitation: (citationId) => set((state) => ({
                citations: state.citations.filter((c) => c.id !== citationId),
            })),

            toggleCitationFavorite: (citationId) => set((state) => ({
                citations: state.citations.map((c) =>
                    c.id === citationId ? { ...c, isFavorite: !c.isFavorite, updatedAt: new Date().toISOString() } : c
                ),
            })),

            linkCitationToCase: (citationId, caseId) => set((state) => ({
                citations: state.citations.map((c) => {
                    if (c.id === citationId && !c.linkedCaseIds.includes(caseId)) {
                        return { ...c, linkedCaseIds: [...c.linkedCaseIds, caseId], updatedAt: new Date().toISOString() };
                    }
                    return c;
                }),
            })),

            addResearchNote: (note) => set((state) => ({
                researchNotes: [...state.researchNotes, note],
            })),

            updateResearchNote: (note) => set((state) => ({
                researchNotes: state.researchNotes.map((n) => (n.id === note.id ? note : n)),
            })),

            deleteResearchNote: (noteId) => set((state) => ({
                researchNotes: state.researchNotes.filter((n) => n.id !== noteId),
            })),

            addSearchHistory: (search) => set((state) => ({
                searchHistory: [search, ...state.searchHistory].slice(0, 20),
            })),

            clearSearchHistory: () => set({ searchHistory: [] }),

            importData: (data: {
                cases: Case[],
                deadlines: Deadline[],
                documents?: Document[],
                citations?: Citation[],
                researchNotes?: ResearchNote[],
                searchHistory?: SearchHistory[],
                advocateProfile?: AdvocateProfile,
                paperbookBundles?: PaperbookBundle[]
            }) => set((state) => ({
                cases: data.cases || [],
                deadlines: data.deadlines || [],
                documents: data.documents || [],
                citations: data.citations || [],
                researchNotes: data.researchNotes || [],
                searchHistory: data.searchHistory || [],
                advocateProfile: data.advocateProfile || state.advocateProfile || DEFAULT_ADVOCATE_PROFILE,
                paperbookBundles: data.paperbookBundles || state.paperbookBundles || [],
            })),
        }),
        {
            name: 'lawyer-app-storage',
            storage: createJSONStorage(() => storage),
        }
    )
);
