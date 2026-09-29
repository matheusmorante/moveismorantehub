import { describe, expect, it, vi } from 'vitest';
import { validateOrder, validatePayments } from '../validations';

vi.mock('../settingsService', () => ({ getSettings: () => ({ requiredFields: {} }) }));

describe('validação das formas de pagamento ao concluir o pedido', () => {
  const validOrder = (status: string, method: string) =>
    ({
      orderType: 'sale',
      status,
      items: [
        {
          description: 'Mesa',
          quantity: 1,
          unitPrice: 100,
          unitDiscount: 0,
          discountType: 'fixed',
          handlingType: 'Entrega montado',
        },
      ],
      shipping: {
        deliveryMethod: 'pickup',
        scheduling: { pendingScheduling: true },
        distance: 1,
        value: 0,
      },
      seller: 'Vendedor',
      payments: [{ method, amount: 100, fee: 0, feeType: 'fixed', status: 'Pago' }],
      customerData: { fullName: 'Cliente', noPhone: true },
      date: '2026-09-28',
    }) as any;

  it('rejeita nenhuma forma de pagamento', () => {
    expect(validatePayments([], 100)).toHaveProperty('payments_summary');
  });

  it('rejeita método vazio mesmo quando valor e status foram preenchidos', () => {
    const errors = validatePayments(
      [{ method: '  ', amount: 100, fee: 0, feeType: 'fixed', status: 'Pago' }],
      0
    );

    expect(errors).toHaveProperty('payment_0_method');
  });

  it('aceita método selecionado quando valor e status estão válidos', () => {
    expect(
      validatePayments(
        [{ method: 'Pix', amount: 100, fee: 0, feeType: 'fixed', status: 'Pago' }],
        0
      )
    ).toEqual({});
  });

  it('aceita Verificar como forma válida ao concluir a venda', () => {
    expect(validatePayments(
      [{ method: 'Verificar', amount: 100, fee: 0, feeType: 'fixed', status: 'Pendente' }],
      0
    )).toEqual({});
    expect(validateOrder(validOrder('scheduled', 'Verificar'))).not.toHaveProperty(
      'payment_0_method'
    );
  });

  it('bloqueia concluir a venda com forma vazia, mas permite salvar como rascunho', () => {
    expect(validateOrder(validOrder('scheduled', ''))).toHaveProperty('payment_0_method');
    expect(validateOrder(validOrder('draft', ''))).not.toHaveProperty('payment_0_method');
  });
});
