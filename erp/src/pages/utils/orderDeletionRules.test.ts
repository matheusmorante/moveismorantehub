import { describe, expect, it } from 'vitest';
import { assertDeletedOrderId, canPermanentlyDeleteDraft } from './orderDeletionRules';

describe('exclusão permanente de rascunho', () => {
  it('autoriza somente rascunho e exige confirmação da linha removida', () => {
    expect(canPermanentlyDeleteDraft('draft')).toBe(true);
    expect(canPermanentlyDeleteDraft('scheduled')).toBe(false);
    expect(() => assertDeletedOrderId('pedido-1', [])).toThrow('não foi excluído');
    expect(() => assertDeletedOrderId('pedido-1', [{ id: 'pedido-1' }])).not.toThrow();
  });
});
