import { describe, expect, it } from 'vitest';
import type Order from '../types/order.type';
import {
  canCreateSaleExitForItem,
  canMaintainSaleStock,
  hasTemporarySaleItem,
  isPartialSaleStockMovement,
  isStockEligibleSaleItem,
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

  it('identifica corretamente quando apenas alguns itens tiveram movimentação de saída gerada', () => {
    const itemReal1 = { productId: 'prod-1', isTemporaryProduct: false, quantity: 1, unitPrice: 100 };
    const itemReal2 = { productId: 'prod-2', isTemporaryProduct: false, quantity: 2, unitPrice: 50 };
    const itemTemp = { description: 'Item sem cadastro', isTemporaryProduct: true, quantity: 1, unitPrice: 30 };

    // Pedido com 2 itens reais que gerou saída para todos: NÃO é parcial (saída completa)
    const orderCompleto: Order = {
      orderType: 'sale',
      status: 'scheduled',
      stockProcessed: true,
      items: [itemReal1, itemReal2]
    } as Order;
    expect(isPartialSaleStockMovement(orderCompleto)).toBe(false);

    // Pedido misto com item real e item temporário com saída gerada: É PARCIAL
    const orderMisto: Order = {
      orderType: 'sale',
      status: 'scheduled',
      stockProcessed: true,
      items: [itemReal1, itemTemp]
    } as Order;
    expect(isPartialSaleStockMovement(orderMisto)).toBe(true);

    // Pedido com 2 itens reais, mas apenas 1 no movedProductIds do banco: É PARCIAL
    expect(isPartialSaleStockMovement(orderCompleto, new Set(['prod-1']))).toBe(true);

    // Pedido que antes tinha isPartialStockProcessed=true no banco, mas agora todos os itens são reais e movimentados: NÃO é parcial
    const orderAntesParcialAgoraCompleto: Order = {
      orderType: 'sale',
      status: 'scheduled',
      stockProcessed: true,
      isPartialStockProcessed: true, // flag antigo defasado
      items: [itemReal1, itemReal2]
    } as Order;
    expect(isPartialSaleStockMovement(orderAntesParcialAgoraCompleto, new Set(['prod-1', 'prod-2']))).toBe(false);
    expect(isPartialSaleStockMovement(orderAntesParcialAgoraCompleto)).toBe(false);

    // Pedido sem saída processada: NÃO é parcial
    const orderSemSaida: Order = {
      orderType: 'sale',
      status: 'scheduled',
      stockProcessed: false,
      items: [itemReal1, itemTemp]
    } as Order;
    expect(isPartialSaleStockMovement(orderSemSaida)).toBe(false);

    // Pedido cancelado: NÃO é parcial
    const orderCancelado: Order = {
      orderType: 'sale',
      status: 'cancelled',
      stockProcessed: true,
      stockReversed: true,
      items: [itemReal1, itemTemp]
    } as Order;
    expect(isPartialSaleStockMovement(orderCancelado)).toBe(false);

    // Devolução parcial (returnKind === 'partial')
    const devolucaoParcial: Order = {
      orderType: 'return',
      status: 'fulfilled',
      returnStockProcessed: true,
      returnKind: 'partial',
      items: [itemReal1]
    } as Order;
    expect(isPartialSaleStockMovement(devolucaoParcial)).toBe(true);
  });
});
