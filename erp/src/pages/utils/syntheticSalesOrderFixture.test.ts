import { describe, expect, it, vi } from 'vitest';
import type Order from '../types/order.type';

vi.mock('./supabaseConfig', () => ({ supabase: {} }));
vi.mock('@/pages/utils/settingsService', () => ({
  getSettings: () => ({ requiredFields: {} }),
}));

import {
  auditSyntheticSalesOrder,
  buildSyntheticSalesOrder,
  createSyntheticSalesOrder,
  type SyntheticOrderSnapshot,
  type SyntheticSalesOrderCommand,
} from './syntheticSalesOrderFixture';

const address = () => ({
  cep: '88010000',
  street: 'Rua Sintética',
  number: '100',
  complement: '',
  observation: '',
  neighborhood: 'Centro',
  city: 'Florianópolis',
  state: 'SC',
});
const orderId = '550e8400-e29b-41d4-a716-446655440000';

const command = (): SyntheticSalesOrderCommand => ({
  orderType: 'sale',
  status: 'scheduled',
  date: '2026-10-07T12:00:00.000Z',
  seller: 'Vendedor de teste',
  sellerId: 'seller-test-id',
  customerData: {
    id: 'customer-test-id',
    personType: 'PJ',
    fullName: 'Empresa Sintética HML',
    phone: '48999990000',
    cpfCnpj: '12345678000195',
    ie: '1234567890',
    ieIndicator: '1',
    fullAddress: address(),
  },
  fiscalContext: {
    operationType: 'sale',
    acquisitionPurpose: 'use_consumption',
    finalConsumer: true,
    recipientIeIndicator: '1',
  },
  items: [
    {
      productId: 'product-test-id',
      variationId: 'variation-test-id',
      code: '000001-01',
      description: 'Produto sintético classificado',
      quantity: 1,
      unitPrice: 1000,
      unitDiscount: 0,
      discountType: 'fixed',
      handlingType: 'delivery',
      condition: 'novo',
      fiscal: {
        ncm: '94036000',
        origem: '0',
        merchandiseOrigin: 'third_party',
      },
    },
  ],
  payments: [
    { method: 'PIX', amount: 1000, fee: 0, feeType: 'fixed', status: 'PAGO', installments: 1 },
  ],
  shipping: {
    value: 0,
    distance: 10,
    deliveryMethod: 'delivery',
    orderType: 'delivery',
    scheduling: {
      date: '2026-10-08',
      time: '09:00',
      startTime: '09:00',
      endTime: '10:00',
      type: 'fixed',
    },
    useCustomerAddress: true,
  },
  observation: 'Fixture sintética de teste fiscal.',
});

const snapshotFor = (order: Order, id = orderId): SyntheticOrderSnapshot => ({
  id,
  orderIndex: 123,
  status: order.status || '',
  customerId: order.customerData.id,
  sellerId: order.sellerId,
  orderType: order.orderType || '',
  totalAmount: order.paymentsSummary.totalOrderValue,
  orderData: order,
  normalizedItems: order.items.map((item) => ({
    productId: item.productId,
    variationId: item.variationId,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    unitDiscount: item.unitDiscount,
    discountType: item.discountType,
  })),
  normalizedPayments: order.payments.map((payment) => ({
    method: payment.method,
    amount: payment.amount,
    fee: payment.fee,
    feeType: payment.feeType,
    status: payment.status,
    installments: payment.installments || 1,
  })),
});

describe('factory de pedidos sintéticos', () => {
  it('rejeita pagamento ausente e cobertura divergente com as regras normais do pedido', () => {
    expect(() => buildSyntheticSalesOrder({ ...command(), payments: [] })).toThrow(/pagamento/i);
    expect(() =>
      buildSyntheticSalesOrder({
        ...command(),
        payments: [{ ...command().payments[0], amount: 999 }],
      })
    ).toThrow(/ultrapassou|falta|declarado/i);
  });

  it('exige finalidade explícita e nunca deriva consumidor final por ausência', () => {
    const incomplete = command();
    if (incomplete.fiscalContext) {
      delete incomplete.fiscalContext.acquisitionPurpose;
      incomplete.fiscalContext.finalConsumer = undefined;
    }
    expect(() => buildSyntheticSalesOrder(incomplete)).toThrow(/finalidade/i);

    const inconsistent = command();
    inconsistent.fiscalContext!.finalConsumer = false;
    expect(() => buildSyntheticSalesOrder(inconsistent)).toThrow(/não corresponde à finalidade/i);
  });

  it('exige dados de PJ contribuinte, item fiscal e endereço de entrega', () => {
    const noIe = command();
    noIe.customerData.ie = '';
    expect(() => buildSyntheticSalesOrder(noIe)).toThrow(/IE declarada/i);

    const noClassification = command();
    noClassification.items[0].fiscal = {};
    expect(() => buildSyntheticSalesOrder(noClassification)).toThrow(/classificação fiscal/i);

    const noAddress = command();
    noAddress.customerData.fullAddress.city = '';
    expect(() => buildSyntheticSalesOrder(noAddress)).toThrow(/Cidade/i);
  });

  it('rejeita item sem produto ou variação, e usa classificação sem decidir tributos', () => {
    const incomplete = command();
    incomplete.items[0].variationId = undefined;
    expect(() => buildSyntheticSalesOrder(incomplete)).toThrow(/variação existentes/i);

    const built = buildSyntheticSalesOrder(command());
    expect(built.items[0].fiscal).toEqual({
      ncm: '94036000',
      origem: '0',
      merchandiseOrigin: 'third_party',
    });
    expect(built.items[0].fiscal).not.toHaveProperty('cfop');
    expect(built.items[0].fiscal).not.toHaveProperty('cst');
    expect(built.items[0].fiscal).not.toHaveProperty('csosn');
  });

  it('audita cabeçalho, snapshot comercial/fiscal, itens e pagamentos persistidos', () => {
    const built = buildSyntheticSalesOrder({
      ...command(),
      syntheticFixture: { scenarioKey: 'SCENARIO_001', version: 1 },
    });
    expect(() => auditSyntheticSalesOrder(built, snapshotFor(built))).not.toThrow();
    const inconsistent = snapshotFor(built);
    inconsistent.normalizedPayments[0].amount = 1;
    expect(() => auditSyntheticSalesOrder(built, inconsistent)).toThrow(/pagamentos/i);
  });

  it('reutiliza a chave estável se a fixture já existe e audita sem inserir de novo', async () => {
    const built = buildSyntheticSalesOrder({
      ...command(),
      syntheticFixture: { scenarioKey: 'SCENARIO_001', version: 1 },
    });
    const loadSnapshot = vi.fn().mockResolvedValue(snapshotFor(built));
    const createOrder = vi.fn();
    const result = await createSyntheticSalesOrder('SCENARIO_001', command(), orderId, {
      createOrder,
      loadSnapshot,
    });
    expect(result.id).toBe(orderId);
    expect(createOrder).not.toHaveBeenCalled();
    expect(loadSnapshot).toHaveBeenCalledWith(orderId);
  });

  it('cria pelo serviço injetado e só retorna depois de auditar o registro persistido', async () => {
    let persistedOrder: Order | null = null;
    const createOrder = vi.fn(async (order: Order, options: { idempotencyKey: string }) => {
      expect(options.idempotencyKey).toBe(orderId);
      persistedOrder = order;
      return options.idempotencyKey;
    });
    const loadSnapshot = vi.fn(async () => (persistedOrder ? snapshotFor(persistedOrder) : null));

    const result = await createSyntheticSalesOrder('SCENARIO_001', command(), orderId, {
      createOrder,
      loadSnapshot,
    });

    expect(createOrder).toHaveBeenCalledOnce();
    expect(result.order.syntheticFixture).toEqual({ scenarioKey: 'SCENARIO_001', version: 1 });
    expect(result.snapshot.id).toBe(result.id);
  });
});
