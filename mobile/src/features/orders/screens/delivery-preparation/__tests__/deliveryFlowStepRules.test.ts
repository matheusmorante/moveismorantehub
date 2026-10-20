import { describe, expect, it } from 'vitest';
import {
  areDeliveryPaymentsPaid,
  isDeliveryChecklistComplete,
  resolveDeliveryStep,
  resolveInitialDeliveryPayments,
} from '../deliveryFlowStepRules';

describe('deliveryFlowStepRules', () => {
  it('resolveDeliveryStep retorna etapa 1 (Preparar Saída) para pedido sem saída registrada', () => {
    const step = resolveDeliveryStep({});
    expect(step).toEqual({
      currentStep: 1,
      headerTitle: 'Preparar Saída',
      isInService: false,
      isInTransit: false,
      isInProgress: false,
    });
  });

  it('resolveDeliveryStep retorna etapa 2 (Em Rota) quando deliveryStatus é in_progress ou tem deliveryStartedAt', () => {
    const step = resolveDeliveryStep({ deliveryStatus: 'in_progress', deliveryStartedAt: '2026-10-20T10:00:00Z' });
    expect(step).toEqual({
      currentStep: 2,
      headerTitle: 'Em Rota',
      isInService: false,
      isInTransit: true,
      isInProgress: true,
    });
  });

  it('resolveDeliveryStep retorna etapa 3 (Em Atendimento) quando deliveryStatus é in_service ou tem deliveryArrivedAt', () => {
    const step = resolveDeliveryStep({ deliveryStatus: 'in_service', deliveryArrivedAt: '2026-10-20T10:30:00Z' });
    expect(step).toEqual({
      currentStep: 3,
      headerTitle: 'Em Atendimento',
      isInService: true,
      isInTransit: false,
      isInProgress: true,
    });
  });

  it('resolveInitialDeliveryPayments extrai lista existente de pagamentos ou constrói fallback', () => {
    const existingPayments = [{ method: 'Cartão', amount: 500 }];
    expect(resolveInitialDeliveryPayments({ payments: existingPayments })).toEqual(existingPayments);

    const fallback = resolveInitialDeliveryPayments({ totalValue: 200, paymentMethod: 'Dinheiro' });
    expect(fallback).toHaveLength(1);
    expect(fallback[0]).toEqual({
      method: 'Dinheiro',
      amount: 200,
      status: 'Pendente',
      fee: 0,
      feeType: 'fixed',
    });
  });

  it('isDeliveryChecklistComplete valida se todos os itens foram checados', () => {
    expect(isDeliveryChecklistComplete([], {})).toBe(true);

    const checklist = [{ id: 'item-1' }, { id: 'item-2' }];
    expect(isDeliveryChecklistComplete(checklist, { 'item-1': true })).toBe(false);
    expect(isDeliveryChecklistComplete(checklist, { 'item-1': true, 'item-2': true })).toBe(true);
  });

  it('areDeliveryPaymentsPaid valida se todos os pagamentos foram pagos', () => {
    expect(areDeliveryPaymentsPaid([])).toBe(false);
    expect(areDeliveryPaymentsPaid([{ status: 'Pendente' }])).toBe(false);
    expect(areDeliveryPaymentsPaid([{ status: 'Pago' }, { status: 'Pendente' }])).toBe(false);
    expect(areDeliveryPaymentsPaid([{ status: 'Pago' }, { status: 'paid' }])).toBe(true);
  });
});
