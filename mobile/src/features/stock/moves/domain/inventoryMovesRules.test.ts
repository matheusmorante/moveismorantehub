import { describe, it, expect } from 'vitest';
import {
  calculateInventoryTimelineBalance,
  isEffectiveMove,
  isReversedMoveStatus,
  isInventoryAuditMarker,
  isOrderLinked,
  isPurchaseEntry,
  getCleanObservation,
} from './inventoryTimelineBalance';

describe('Regras de Negócio e Cálculo de Saldo de Movimentações (ERP ↔ Mobile)', () => {
  it.each(['reversed', 'cancelled'])('identifica %s como movimentação estornada', (status) => {
    expect(isReversedMoveStatus(status)).toBe(true);
  });

  it.each(['effective', 'active', undefined, null])(
    'não identifica %s como movimentação estornada',
    (status) => {
      expect(isReversedMoveStatus(status)).toBe(false);
    }
  );

  it('deve calcular o saldo cronológico somando entradas e subtraindo saídas', () => {
    const moves = [
      { id: '1', date: '2026-09-01T10:00:00Z', type: 'entry', quantity: 10, status: 'effective' },
      { id: '2', date: '2026-09-02T10:00:00Z', type: 'exit', quantity: 3, status: 'effective' },
      { id: '3', date: '2026-09-03T10:00:00Z', type: 'entry', quantity: 5, status: 'effective' },
    ];
    const balance = calculateInventoryTimelineBalance(moves);
    expect(balance).toBe(12);
  });

  it('deve desconsiderar movimentações estornadas ou canceladas no cálculo do saldo', () => {
    const moves = [
      { id: '1', date: '2026-09-01T10:00:00Z', type: 'entry', quantity: 10, status: 'effective' },
      { id: '2', date: '2026-09-02T10:00:00Z', type: 'exit', quantity: 4, status: 'reversed' },
      { id: '3', date: '2026-09-03T10:00:00Z', type: 'entry', quantity: 2, status: 'effective' },
    ];
    const balance = calculateInventoryTimelineBalance(moves);
    expect(balance).toBe(12); // 10 + 2 = 12 (ignora a saída de 4)
  });

  it('deve aplicar targetStock quando houver ajuste de inventário no tempo', () => {
    const moves = [
      { id: '1', date: '2026-09-01T10:00:00Z', type: 'entry', quantity: 20, status: 'effective' },
      {
        id: '2',
        date: '2026-09-05T10:00:00Z',
        type: 'adjustment',
        quantity: 0,
        observation: JSON.stringify({ targetStock: 8 }),
        status: 'effective',
      },
      { id: '3', date: '2026-09-06T10:00:00Z', type: 'entry', quantity: 5, status: 'effective' },
    ];
    const balance = calculateInventoryTimelineBalance(moves);
    expect(balance).toBe(13); // Inventário fixou 8, + 5 = 13
  });

  it('deve identificar marcadores de inventário com quantidade zero', () => {
    expect(isInventoryAuditMarker({ label: 'Inventário #INV-001', quantity: 0 })).toBe(true);
    expect(isInventoryAuditMarker({ label: 'Inventário #INV-001', quantity: 5 })).toBe(false);
    expect(isInventoryAuditMarker({ label: 'Entrada manual', quantity: 0 })).toBe(false);
  });

  it('deve identificar vínculos com pedidos e formatar observações limpas', () => {
    const salesMoveWithLabel = {
      relatedEntityType: 'sales_order',
      relatedEntityId: '10045',
      label: 'Saída - Pedido #10045',
    };
    expect(isOrderLinked(salesMoveWithLabel)).toBe(true);
    expect(getCleanObservation(salesMoveWithLabel)).toBe('Saída gerada pelo pedido #10045');

    const salesMoveWithoutLabel = {
      relatedEntityType: 'sales_order',
      relatedEntityId: '10045',
    };
    expect(getCleanObservation(salesMoveWithoutLabel)).toBe(
      'Saída gerada pelo pedido de venda #10045'
    );

    const purchaseMove = {
      relatedEntityType: 'purchase_order',
      label: 'Entrada do Pedido #502',
    };
    expect(isPurchaseEntry(purchaseMove)).toBe(true);
    expect(isOrderLinked(purchaseMove)).toBe(true);
    expect(getCleanObservation(purchaseMove)).toBe('Entrada gerada por Entrada do Pedido #502');
  });

  it('exibe a observação de ajuste de pedido sem perder o número do pedido', () => {
    expect(getCleanObservation({
      relatedEntityType: 'sales_order',
      label: 'Saída - Pedido #10045',
      observation: JSON.stringify({ status: 'effective', note: 'Ajuste do pedido de venda #10045' }),
    })).toBe('Ajuste do pedido de venda #10045');
  });

  it('identifica a origem das entradas legadas de recebimento sem nota legível', () => {
    expect(getCleanObservation({
      label: '8481',
      observation: JSON.stringify({ goodsReceiptId: 'receipt-id', status: 'reversed' }),
    })).toBe('Entrada gerada pelo recebimento da NF-e 8481');
  });

  it('formata os metadados técnicos do inventário como uma observação legível', () => {
    expect(getCleanObservation({
      label: 'Inventário #000054',
      observation: JSON.stringify({
        source: 'inventory_audit',
        status: 'effective',
        targetStock: 0,
        previousStock: -2,
      }),
    })).toBe('Saldo anterior: -2 un. | Saldo após inventário: 0 un.');
  });

  it('não exibe JSON bruto quando a movimentação não tem uma nota legível', () => {
    expect(getCleanObservation({
      label: 'Movimentação manual',
      observation: JSON.stringify({ source: 'manual', status: 'effective' }),
    })).toBe('Movimentação manual');
  });
});
