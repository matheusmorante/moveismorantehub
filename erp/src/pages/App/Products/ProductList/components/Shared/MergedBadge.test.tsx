// @vitest-environment happy-dom
import React from 'react';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { MergedBadge } from './MergedBadge';

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { sku: '000314-01' }, error: null }),
        }),
      }),
    }),
  },
}));

afterEach(cleanup);

describe('MergedBadge - Rótulo de Mesclado', () => {
  it('renderiza o rótulo genérico de Mesclado quando targetVariationId não é informado', () => {
    render(<MergedBadge />);
    expect(screen.getByText('Mesclado')).toBeDefined();
    expect(screen.queryByText('em')).toBeNull();
  });

  it('renderiza o rótulo de Mesclado em com o SKU da variação de destino', async () => {
    render(<MergedBadge targetVariationId="target-var-uuid" />);

    expect(screen.getByText('Mesclado')).toBeDefined();
    expect(screen.getByText('em')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('000314-01')).toBeDefined();
    });
  });
});
