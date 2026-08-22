import { DeepSeekBalanceInfo } from '../models/AiUsage';

const DEEPSEEK_BALANCE_URL = 'https://api.deepseek.com/user/balance';

/**
 * Fetch real live account balance from DeepSeek API
 * Official Endpoint: GET https://api.deepseek.com/user/balance
 */
export const fetchDeepSeekBalance = async (apiKey: string): Promise<DeepSeekBalanceInfo> => {
    if (!apiKey || !apiKey.trim()) {
        return {
            isAvailable: false,
            currency: 'USD',
            totalBalance: '0.00',
            grantedBalance: '0.00',
            toppedUpBalance: '0.00',
            error: 'No API Key configured',
        };
    }

    try {
        const response = await fetch(DEEPSEEK_BALANCE_URL, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${apiKey.trim()}`,
            },
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            return {
                isAvailable: false,
                currency: 'USD',
                totalBalance: '0.00',
                grantedBalance: '0.00',
                toppedUpBalance: '0.00',
                error: errData?.error?.message || `HTTP ${response.status} from DeepSeek`,
            };
        }

        const data = await response.json();
        
        // DeepSeek returns: { is_available: true, balance_infos: [{ currency: "USD", total_balance: "1.95", granted_balance: "0.00", topped_up_balance: "1.95" }] }
        const balanceList = data.balance_infos || [];
        const primaryBalance = balanceList.find((b: any) => b.currency === 'USD') || balanceList[0] || {};

        return {
            isAvailable: data.is_available ?? true,
            currency: primaryBalance.currency || 'USD',
            totalBalance: primaryBalance.total_balance || '0.00',
            grantedBalance: primaryBalance.granted_balance || '0.00',
            toppedUpBalance: primaryBalance.topped_up_balance || primaryBalance.total_balance || '0.00',
        };
    } catch (err: any) {
        console.warn('[DeepSeek] Error fetching account balance:', err?.message);
        return {
            isAvailable: false,
            currency: 'USD',
            totalBalance: '0.00',
            grantedBalance: '0.00',
            toppedUpBalance: '0.00',
            error: err?.message || 'Network error querying DeepSeek balance',
        };
    }
};

/**
 * Calculate cost in USD based on official DeepSeek pricing rates
 * deepseek-chat (V3): $0.14/1M prompt, $0.28/1M completion
 * deepseek-reasoner (R1): $0.55/1M prompt, $2.19/1M completion
 */
export const calculateTokenCost = (
    promptTokens: number,
    completionTokens: number,
    model: string = 'deepseek-chat'
): number => {
    const isReasoner = model === 'deepseek-reasoner';
    const promptRate = isReasoner ? 0.55 / 1_000_000 : 0.14 / 1_000_000;
    const completionRate = isReasoner ? 2.19 / 1_000_000 : 0.28 / 1_000_000;

    const cost = (promptTokens * promptRate) + (completionTokens * completionRate);
    return Math.round(cost * 10000) / 10000; // Round to 4 decimal places
};

// Exchange rate benchmark (1 USD = ₹87.50 INR, 1 CNY = ₹12.10 INR)
export const USD_TO_INR_RATE = 87.50;
export const CNY_TO_INR_RATE = 12.10;

/**
 * Convert any foreign currency amount to Indian Rupees (INR - ₹)
 */
export const convertToInr = (
    amount: number | string,
    sourceCurrency: string = 'USD'
): number => {
    const numeric = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numeric) || numeric === 0) return 0;

    const curr = (sourceCurrency || 'USD').toUpperCase();
    if (curr === 'INR') return numeric;
    if (curr === 'CNY' || curr === 'RMB') return Math.round(numeric * CNY_TO_INR_RATE * 100) / 100;
    
    // Default USD
    return Math.round(numeric * USD_TO_INR_RATE * 100) / 100;
};

/**
 * Format amount as Indian Rupees (e.g. 170.625 -> "₹170.63")
 * Uses Indian numbering format (Lakhs / Crores if applicable)
 */
export const formatInr = (amount: number | string, minDecimals: number = 2): string => {
    const numeric = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numeric)) return '₹0.00';

    try {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: minDecimals,
            maximumFractionDigits: minDecimals > 2 ? minDecimals : 2,
        }).format(numeric);
    } catch {
        return `₹${numeric.toFixed(minDecimals)}`;
    }
};

/**
 * Format Dual Currency Balance for Indian Advocates (Primary INR ₹ + Secondary USD $)
 */
export const formatBalanceDual = (
    balance: string | number,
    currency: string = 'USD'
): { inr: string; original: string; inrNumeric: number } => {
    const rawVal = typeof balance === 'string' ? parseFloat(balance) : balance;
    const safeVal = isNaN(rawVal) ? 0 : rawVal;
    const inrVal = convertToInr(safeVal, currency);

    return {
        inr: formatInr(inrVal),
        original: `$${safeVal.toFixed(2)} ${currency}`,
        inrNumeric: inrVal,
    };
};

/**
 * Format Dual Currency Cost for Indian Advocates
 */
export const formatCostDual = (
    costUsd: number | string
): { inr: string; original: string; inrNumeric: number } => {
    const rawVal = typeof costUsd === 'string' ? parseFloat(costUsd) : costUsd;
    const safeVal = isNaN(rawVal) ? 0 : rawVal;
    const inrVal = convertToInr(safeVal, 'USD');

    return {
        inr: formatInr(inrVal),
        original: `$${safeVal.toFixed(2)} USD`,
        inrNumeric: inrVal,
    };
};

/**
 * Format numbers with commas (e.g. 81778 -> "81,778")
 */
export const formatTokens = (num: number): string => {
    if (isNaN(num)) return '0';
    return num.toLocaleString('en-IN');
};

/**
 * Format USD currency (e.g. 0.04 -> "$0.04 USD")
 */
export const formatUsd = (amount: number | string): string => {
    const numeric = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numeric)) return '$0.00 USD';
    return `$${numeric.toFixed(2)} USD`;
};

