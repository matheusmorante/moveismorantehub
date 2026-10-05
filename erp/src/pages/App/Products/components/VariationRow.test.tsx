// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VariationRow } from './VariationRow';
import type { Variation } from '@/pages/types/product.type';

vi.mock('@/components/ProductImage', () => ({ default: () => <span>Foto</span> }));
afterEach(cleanup);
const variation: Variation = { id: 'v1', name: 'Armário Azul', sku: '001-01', unitPrice: 100,
  stock: 0, active: false, status: 'draft', attributes: [] };

describe('rótulo da variação na aba de variações', () => {
  it('mostra Rascunho com orientação e mantém a edição disponível', () => {
    const onEdit = vi.fn();
    render(<VariationRow v={variation} onEdit={onEdit} />);
    const badge = screen.getByText('Rascunho');
    expect(badge.title).toContain('campos obrigatórios');
    fireEvent.click(badge);
    expect(onEdit).toHaveBeenCalledWith(variation.id);
  });
  it('remove o rótulo somente quando o status da variação é concluído', () => {
    const { rerender } = render(<VariationRow v={variation} />);
    expect(screen.queryByText('Rascunho')).not.toBeNull();
    rerender(<VariationRow v={{ ...variation, status: 'hidden' }} />);
    expect(screen.queryByText('Rascunho')).toBeNull();
  });
});
