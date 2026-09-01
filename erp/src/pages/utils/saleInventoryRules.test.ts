import { describe, expect, it } from 'vitest';
import type Order from '../types/order.type';
import {
  canCreateSaleExitForItem,
  canMaintainSaleStock,
  hasTemporarySaleItem,
  isTemporarySaleItemReconciliation,
  shouldProcessSaleStock,
} from './saleInventoryRules';

const sale = (status: string, item: any): Order => ({ orderType: 'sale', status, items: [item] } as Order);

describe('regras de estoque de pedido de venda', () => {
  it('mantém estoque somente para venda agendada ou atendida', () => {
    expect(canMaintainSaleStock(sale('draft', {}))).toBe(false);
    expect(canMaintainSaleStock(sale('scheduled', {}))).toBe(true);
    expect(canMaintainSaleStock(sale('fulfilled', {}))).toBe(true);
    expect(canMaintainSaleStock(sale('cancelled', {}))).toBe(false);
  });

  it('não considera item temporário como produto apto a movimentar', () => {
    const temporary = { description: 'TESTE_ERP_temporário', quantity: 1, unitPrice: 1, unitDiscount: 0, discountType: 'fixed', handlingType: '', isTemporaryProduct: true };
    const linked = { ...temporary, productId: 'produto-de-teste', isTemporaryProduct: false };

    expect(hasTemporarySaleItem(sale('scheduled', temporary))).toBe(true);
    expect(isTemporarySaleItemReconciliation(temporary, linked)).toBe(true);
    expect(hasTemporarySaleItem(sale('scheduled', linked))).toBe(false);
    expect(canCreateSaleExitForItem(sale('scheduled', temporary), temporary, false)).toBe(false);
    expect(canCreateSaleExitForItem(sale('scheduled', linked), linked, false)).toBe(true);
    expect(canCreateSaleExitForItem(sale('scheduled', linked), linked, true)).toBe(false);
  });

  it('não processa a mesma saída duas vezes depois que o pedido foi marcado', () => {
    const pending = sale('scheduled', {});
    const processed = { ...pending, stockProcessed: true };

    expect(shouldProcessSaleStock(pending, ['scheduled'])).toBe(true);
    expect(shouldProcessSaleStock(processed, ['scheduled'])).toBe(false);
    expect(shouldProcessSaleStock(processed, ['scheduled'], true)).toBe(true);
  });
});
