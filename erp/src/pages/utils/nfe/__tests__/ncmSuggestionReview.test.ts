import { describe, expect, it } from 'vitest';
import { acceptPendingNcmSuggestion, rejectPendingNcmSuggestion, setPendingNcmSuggestion } from '../ncmSuggestionReview';

const suggestion = { ncm: '94035000', description: 'Móveis de madeira para quarto', confidence: 0.8, reviewReason: 'Sugestão automatizada' };

describe('NCM suggestion review', () => {
    it('keeps a suggestion pending without changing the fiscal NCM until accepted', () => {
        const item = setPendingNcmSuggestion({ fiscal: { ncm: '' } }, suggestion);
        expect(item.fiscal.ncm).toBe('');
        expect(item.pendingNcmSuggestion).toEqual(suggestion);
        expect(acceptPendingNcmSuggestion(item).fiscal).toMatchObject({ ncm: '94035000', ncmDescription: suggestion.description });
    });

    it('allows rejecting a suggestion without changing the manually entered NCM', () => {
        const item = setPendingNcmSuggestion({ fiscal: { ncm: '12345678' } }, suggestion);
        const rejected = rejectPendingNcmSuggestion(item);
        expect(rejected.fiscal.ncm).toBe('12345678');
        expect(rejected.pendingNcmSuggestion).toBeUndefined();
    });
});
