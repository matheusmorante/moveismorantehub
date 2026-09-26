import type { NcmAiSuggestion } from '@/pages/utils/aiService/aiFiscalClassificationService';

export interface NcmReviewItem {
    fiscal: { ncm: string; ncmDescription?: string };
    pendingNcmSuggestion?: NcmAiSuggestion;
}

export function setPendingNcmSuggestion<T extends NcmReviewItem>(item: T, suggestion: NcmAiSuggestion): T {
    return { ...item, pendingNcmSuggestion: suggestion };
}

export function acceptPendingNcmSuggestion<T extends NcmReviewItem>(item: T): T {
    const suggestion = item.pendingNcmSuggestion;
    if (!suggestion?.ncm) return item;
    return {
        ...item,
        fiscal: { ...item.fiscal, ncm: suggestion.ncm, ncmDescription: suggestion.description },
        pendingNcmSuggestion: undefined,
    };
}

export function rejectPendingNcmSuggestion<T extends NcmReviewItem>(item: T): T {
    if (!item.pendingNcmSuggestion) return item;
    return { ...item, pendingNcmSuggestion: undefined };
}
