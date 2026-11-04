import { describe, expect, it } from 'vitest';
import {
  resolveOrderItemHandling,
  resolveOrderItemTypeLabel,
  summarizeOrderItemHandling,
} from '@/../../shared-utils/orderItemPresentation';

describe('order item detail presentation', () => {
  it('uses compact neutral labels for product types and omits the type for services', () => {
    expect(resolveOrderItemTypeLabel({ condition: 'salvado' })).toBe('Salvados');
    expect(resolveOrderItemTypeLabel({ condition: 'usado' })).toBe('Usado');
    expect(resolveOrderItemTypeLabel({ stockOrigin: 'convencional' })).toBe('Normal');
    expect(resolveOrderItemTypeLabel({ itemType: 'service' })).toBeNull();
  });

  it('summarizes only the visible handling text and retains the full instruction', () => {
    const fullInstruction = 'De mostruário montado > Entregue montado';

    expect(resolveOrderItemHandling({ handlingType: fullInstruction })).toBe(fullInstruction);
    expect(summarizeOrderItemHandling(fullInstruction)).toBe('Entregar montado');
    expect(summarizeOrderItemHandling('De mostruário montado → Entregue montado')).toBe(
      'Entregar montado'
    );
    expect(summarizeOrderItemHandling('Na caixa > Entregue desmontado para o cliente montar')).toBe(
      'Entregar desmontado'
    );
  });

  it('keeps a single-step instruction intact and leaves empty handling empty', () => {
    expect(summarizeOrderItemHandling('Montagem no local da entrega')).toBe(
      'Montagem no local da entrega'
    );
    expect(resolveOrderItemHandling({ handlingType: '   ' })).toBe('');
    expect(summarizeOrderItemHandling('')).toBe('');
  });
});
