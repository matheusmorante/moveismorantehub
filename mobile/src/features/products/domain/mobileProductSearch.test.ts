import { describe, expect, it } from 'vitest';
import { buildMobileProductSearchTerms } from './mobileProductSearch';

describe('buildMobileProductSearchTerms', () => {
  it('searches accented and unaccented names and splits hyphenated terms like the ERP', () => {
    expect(buildMobileProductSearchTerms('Sofá-Cama')).toEqual({
      safeSearch: 'Sofá-Cama',
      searchTerms: ['Sofá-Cama', 'Sofa-Cama', 'Sofa Cama'],
      wordTerms: [
        { value: 'Sofa', alternative: undefined },
        { value: 'Cama', alternative: undefined },
      ],
    });
  });

  it('includes the ERP i/y spelling alternative for words', () => {
    expect(buildMobileProductSearchTerms('Dolly').wordTerms).toEqual([
      { value: 'Dolly', alternative: 'Dolli' },
    ]);
    expect(buildMobileProductSearchTerms('Milly').searchTerms).toContain('Milly');
    expect(buildMobileProductSearchTerms('Milly').searchTerms).toContain('Milli');
    expect(buildMobileProductSearchTerms('Milly').searchTerms).toContain('Mylly');
  });

  it('sanitizes filter syntax characters using the ERP search rules', () => {
    expect(buildMobileProductSearchTerms(' mesa,cama_% ').safeSearch).toBe('mesa cama');
  });

  it('returns no terms for an empty search', () => {
    expect(buildMobileProductSearchTerms('   ')).toEqual({
      safeSearch: '',
      searchTerms: [],
      wordTerms: [],
    });
  });
});
