import { describe, expect, it, vi } from 'vitest';
import { normalizeSlug, resolveUniqueSlug } from '../../../../shared-utils/uniqueSlug';

describe('unique slug helpers', () => {
  it('normalizes case, accents and separators consistently', () => {
    expect(normalizeSlug('  Sofá Retrátil / 2 Lugares  ')).toBe('sofa-retratil-2-lugares');
    expect(normalizeSlug('   ')).toBe('item');
  });

  it('selects the first unoccupied numbered slug', async () => {
    const like = vi.fn().mockResolvedValue({
      data: [
        { slug: 'sofa-retratil' },
        { slug: 'sofa-retratil-2' },
        { slug: 'sofa-retratil-outlet' },
      ],
      error: null,
    });
    const client = { from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ like }) }) };

    await expect(resolveUniqueSlug(client, 'categories', 'Sofá Retrátil')).resolves.toBe(
      'sofa-retratil-3'
    );
    expect(client.from).toHaveBeenCalledWith('categories');
    expect(like).toHaveBeenCalledWith('slug', 'sofa-retratil%');
  });

  it('throws query errors so callers can choose their documented fallback', async () => {
    const like = vi.fn().mockResolvedValue({ data: null, error: new Error('query failed') });
    const client = { from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ like }) }) };

    await expect(resolveUniqueSlug(client, 'categories', 'Sala')).rejects.toThrow('query failed');
  });
});
