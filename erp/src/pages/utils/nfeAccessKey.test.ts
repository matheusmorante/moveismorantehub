import { describe, expect, it } from 'vitest';
import { normalizeNfeAccessKey, validateNfeAccessKey } from './nfeAccessKey';

const valid = '41260802216300000138550010000040201276092641';
describe('NF-e access key validation', () => {
  it('accepts a valid model 55 key and visual separators', () => {
    expect(validateNfeAccessKey(valid)).toMatchObject({ valid: true, normalized: valid });
    expect(validateNfeAccessKey('4126 0802 2163 0000 0138 5500 1000 0040 2012 7609 2641')).toMatchObject({ valid: true, normalized: valid });
  });
  it.each([valid.slice(0, 43), `${valid}0`, `${valid.slice(0, 10)}A${valid.slice(11)}`, `${valid.slice(0, 43)}0`])('rejects invalid key %s', (key) => {
    expect(validateNfeAccessKey(key).valid).toBe(false);
  });
  it('never completes a partial key', () => {
    const incomplete = '4126080221630000013855001000004020127609';
    expect(normalizeNfeAccessKey(incomplete)).toBe(incomplete);
    expect(validateNfeAccessKey(incomplete)).toMatchObject({ valid: false, reason: 'length' });
  });
});
