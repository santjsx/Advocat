export interface DeepSeekBalanceInfo {
    isAvailable: boolean;
    currency: string;
    totalBalance: string;
    grantedBalance: string;
    toppedUpBalance: string;
    error?: string;
}

export interface AiUsageRecord {
    id: string;
    timestamp: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    model: string;
    feature: 'PLEADING' | 'RESEARCH' | 'OCR_VISION' | 'TRANSLATION' | 'OTHER';
    costUsd: number;
}

export interface AiUsageSummary {
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
    totalRequests: number;
    totalCostUsd: number;
    toppedUpBalance: string; // e.g. "1.95"
    totalBalance: string; // e.g. "1.95"
    grantedBalance: string; // e.g. "0.00"
    currency: string;
    isAvailable: boolean;
    lastSyncedAt: string | null;
    history: AiUsageRecord[];
}

export const DEFAULT_AI_USAGE_SUMMARY: AiUsageSummary = {
    totalTokens: 81778, // Initialized with real usage from developer console
    promptTokens: 52400,
    completionTokens: 29378,
    totalRequests: 45,
    totalCostUsd: 0.04,
    toppedUpBalance: '1.95',
    totalBalance: '1.95',
    grantedBalance: '0.00',
    currency: 'USD',
    isAvailable: true,
    lastSyncedAt: new Date().toISOString(),
    history: [],
};
