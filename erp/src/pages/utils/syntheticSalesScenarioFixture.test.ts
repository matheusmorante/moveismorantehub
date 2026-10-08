import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Order from '../types/order.type';
import type Person from '../types/person.type';
import type Product from '../types/product.type';
import type { SyntheticSalesScenarioRun } from './syntheticSalesFixtureRegistry';
import type { SyntheticOrderSnapshot } from './syntheticSalesOrderFixture';
import {
  createSyntheticSalesScenario,
  createSyntheticSalesScenarioBatch,
  type SyntheticInventoryMoveSnapshot,
  type SyntheticProductSnapshot,
  type SyntheticSalesScenarioDependencies,
  type SyntheticSalesScenarioInput,
} from './syntheticSalesScenarioFixture';

vi.mock('./supabaseConfig', () => ({ supabase: {} }));
vi.mock('@/pages/utils/settingsService', () => ({ getSettings: () => ({ requiredFields: {} }) }));

const ids = {
  customer: '550e8400-e29b-41d4-a716-446655440001',
  product: '550e8400-e29b-41d4-a716-446655440002',
  variation: '550e8400-e29b-41d4-a716-446655440003',
  order: '550e8400-e29b-41d4-a716-446655440004',
  seller: '550e8400-e29b-41d4-a716-446655440005',
};

const input = (scenarioKey = 'SCENARIO_001'): SyntheticSalesScenarioInput => ({
  scenarioKey,
  customer: {
    personType: 'PJ',
    fullName: 'Empresa Sintética de Validação',
    cpfCnpj: '11.222.333/0001-81',
    ieIndicator: '1',
    ie: '251040852',
    phone: '48999990000',
    marketingOrigin: 'organic',
    address: {
      cep: '88010000',
      street: 'Rua de Validação',
      number: '100',
      complement: '',
      neighborhood: 'Centro',
      city: 'Florianópolis',
      state: 'SC',
    },
  },
  product: {
    name: 'Cadeira de Validação',
    description: 'Cadeira de madeira para validação de estoque e emissão em homologação.',
    categoryId: '550e8400-e29b-41d4-a716-446655440006',
    unit: 'UN',
    unitPrice: 100,
    costPrice: 50,
    openingStock: 5,
    ncm: '94036000',
    origin: '0',
    merchandiseOrigin: 'third_party',
    supplierId: '550e8400-e29b-41d4-a716-446655440007',
    variationName: 'Cadeira de Validação Natural',
    variationAttributes: [{ name: 'Cor', value: 'Natural' }],
  },
  order: {
    date: '2026-10-07T12:00:00.000Z',
    quantity: 2,
    acquisitionPurpose: 'use_consumption',
    finalConsumer: true,
    deliveryMethod: 'delivery',
    shippingValue: 0,
    deliveryDistance: 10,
    schedule: { date: '2026-10-08', startTime: '09:00', endTime: '10:00' },
    payments: [
      { method: 'PIX', amount: 200, fee: 0, feeType: 'fixed', status: 'PAGO', installments: 1 },
    ],
  },
});

const clone = <T>(value: T): T => structuredClone(value);

function createMemoryServices() {
  const runs = new Map<string, SyntheticSalesScenarioRun>();
  const customers = new Map<string, Person>();
  const products = new Map<string, SyntheticProductSnapshot>();
  const orders = new Map<string, SyntheticOrderSnapshot>();
  const moves: SyntheticInventoryMoveSnapshot[] = [];
  const histories = new Map<string, Array<{ oldStatus: string | null; newStatus: string }>>();
  let orderCreateCalls = 0;
  let productSaveCalls = 0;
  let failProductAfterRootOnce = false;
  let failCustomerAfterInsertOnce = false;
  let failMoveAuditOnce = false;
  let customerSaveHook: (() => Promise<void>) | null = null;
  let customerSaveStartedResolve: () => void = () => {};
  const customerSaveStarted = new Promise<void>((resolve) => {
    customerSaveStartedResolve = resolve;
  });
  const seller: Person = {
    id: ids.seller,
    fullName: 'Matheus Morante',
    type: 'employees',
    personType: 'PF',
    active: true,
    deleted: false,
    role: 'seller',
  };

  const dependencies: SyntheticSalesScenarioDependencies = {
    claim: vi.fn(async (scenarioKey, payloadHash) => {
      let run = runs.get(scenarioKey);
      if (!run) {
        run = {
          id: `registry-${scenarioKey}`,
          scenarioKey,
          scenarioVersion: 1,
          payloadHash,
          status: 'in_progress',
          phase: 'reserved',
          customerId: ids.customer,
          customerState: 'pending',
          productId: ids.product,
          productState: 'pending',
          variationId: ids.variation,
          sellerId: null,
          orderId: ids.order,
          orderState: 'pending',
          leaseToken: 'lease-one',
          claimed: true,
          auditSummary: {},
        };
        runs.set(scenarioKey, clone(run));
        return clone(run);
      }
      if (run.payloadHash !== payloadHash)
        throw new Error('scenarioKey já usado com outro payload');
      if (run.status === 'complete') return { ...clone(run), claimed: false };
      if (run.leaseToken) return { ...clone(run), claimed: false };
      run = { ...run, status: 'in_progress', leaseToken: 'lease-retry', claimed: true };
      runs.set(scenarioKey, clone(run));
      return clone(run);
    }) as SyntheticSalesScenarioDependencies['claim'],
    update: vi.fn(async (run, progress) => {
      const stored = runs.get(run.scenarioKey);
      if (!stored || stored.leaseToken !== run.leaseToken) throw new Error('lease lost');
      const next = {
        ...stored,
        ...progress,
        leaseToken: progress.releaseLease ? null : stored.leaseToken,
        claimed: !progress.releaseLease,
      } as SyntheticSalesScenarioRun;
      runs.set(run.scenarioKey, clone(next));
      return clone(next);
    }) as SyntheticSalesScenarioDependencies['update'],
    loadScenarioByKey: vi.fn(async (key) => (runs.get(key) ? clone(runs.get(key)!) : null)),
    loadCustomer: vi.fn(async (id) => (customers.has(id) ? clone(customers.get(id)!) : null)),
    saveCustomer: vi.fn(async (person) => {
      customerSaveStartedResolve();
      if (customerSaveHook) await customerSaveHook();
      if (customers.has(person.id!)) throw new Error('duplicate customer');
      customers.set(person.id!, clone(person));
      if (failCustomerAfterInsertOnce) {
        failCustomerAfterInsertOnce = false;
        throw new Error('falha controlada após inserir cliente');
      }
      return clone(person);
    }),
    categoryExists: vi.fn(async (id: string) => id !== '550e8400-e29b-41d4-a716-446655440008'),
    supplierExists: vi.fn(async () => true),
    loadProduct: vi.fn(async (id) => (products.has(id) ? clone(products.get(id)!) : null)),
    saveProduct: vi.fn(async (product: Product) => {
      productSaveCalls += 1;
      const code = product.code || '004201';
      const variation = product.variations![0];
      products.set(product.id!, {
        id: product.id!,
        name: product.name!,
        description: product.description,
        code,
        categoryIds: product.categoryIds!,
        productKind: 'normal',
        condition: 'novo',
        unit: product.unit,
        unitPrice: product.unitPrice,
        costPrice: product.costPrice!,
        stock: product.stock!,
        active: true,
        isDraft: false,
        status: 'hidden',
        supplierId: product.supplierId || null,
        fiscal: clone(product.fiscal!),
        variations: failProductAfterRootOnce
          ? []
          : [
              {
                id: variation.id,
                productId: product.id!,
                name: variation.name,
                sku: `${code}-01`,
                unitPrice: variation.unitPrice,
                stock: variation.stock,
                active: true,
                status: 'hidden',
              },
            ],
      });
      if (failProductAfterRootOnce) {
        failProductAfterRootOnce = false;
        throw new Error('falha após salvar o produto pai');
      }
      return product.id!;
    }) as SyntheticSalesScenarioDependencies['saveProduct'],
    loadSeller: vi.fn(async () => clone(seller)),
    saveOrder: vi.fn(async (order: Order, options: { idempotencyKey: string }) => {
      orderCreateCalls += 1;
      if (orders.has(options.idempotencyKey)) return options.idempotencyKey;
      const persistedOrder = { ...clone(order), stockProcessed: true };
      const variation = products.get(ids.product)!.variations[0];
      variation.stock -= order.items[0].quantity;
      const product = products.get(ids.product)!;
      product.stock -= order.items[0].quantity;
      products.set(ids.product, { ...product, variations: [variation] });
      orders.set(options.idempotencyKey, {
        id: options.idempotencyKey,
        orderIndex: 101,
        status: persistedOrder.status!,
        customerId: persistedOrder.customerData.id,
        sellerId: persistedOrder.sellerId,
        orderType: persistedOrder.orderType!,
        totalAmount: persistedOrder.paymentsSummary.totalOrderValue,
        orderData: persistedOrder,
        normalizedItems: persistedOrder.items.map((item) => ({
          productId: item.productId,
          variationId: item.variationId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          unitDiscount: item.unitDiscount,
          discountType: item.discountType,
        })),
        normalizedPayments: persistedOrder.payments.map((payment) => ({
          method: payment.method,
          amount: payment.amount,
          fee: payment.fee,
          feeType: payment.feeType,
          status: payment.status,
          installments: payment.installments || 1,
        })),
      });
      moves.push({
        id: 'move-one',
        productId: ids.product,
        variationId: ids.variation,
        type: 'exit',
        quantity: order.items[0].quantity,
        relatedEntityId: options.idempotencyKey,
        relatedEntityType: 'sales_order',
        status: 'effective',
      });
      histories.set(options.idempotencyKey, [
        { oldStatus: null, newStatus: persistedOrder.status! },
      ]);
      return options.idempotencyKey;
    }) as SyntheticSalesScenarioDependencies['saveOrder'],
    loadOrder: vi.fn(async (id) => (orders.has(id) ? clone(orders.get(id)!) : null)),
    loadInventoryMoves: vi.fn(async (id) => {
      if (failMoveAuditOnce) {
        failMoveAuditOnce = false;
        throw new Error('falha controlada na auditoria do estoque');
      }
      return clone(moves.filter((move) => move.relatedEntityId === id));
    }),
    loadStatusHistory: vi.fn(async (id) => clone(histories.get(id) || [])),
    loadProductionFiscalDocuments: vi.fn(async () => []),
  };

  return {
    dependencies,
    runs,
    customers,
    products,
    orders,
    moves,
    orderCreateCalls: () => orderCreateCalls,
    productSaveCalls: () => productSaveCalls,
    failCustomerAfterInsert: () => {
      failCustomerAfterInsertOnce = true;
    },
    failProductAfterRoot: () => {
      failProductAfterRootOnce = true;
    },
    failMoveAudit: () => {
      failMoveAuditOnce = true;
    },
    pauseCustomerSave: () => {
      let release!: () => void;
      customerSaveHook = () =>
        new Promise<void>((resolve) => {
          release = resolve;
        });
      return { started: customerSaveStarted, release: () => release() };
    },
  };
}

describe('cenário sintético integrado', () => {
  let memory: ReturnType<typeof createMemoryServices>;
  beforeEach(() => {
    memory = createMemoryServices();
  });

  it('cria e audita cliente, produto/variação, vendedor, pedido e efeitos locais completos', async () => {
    const result = await createSyntheticSalesScenario(input(), memory.dependencies);
    expect(result.status).toBe('complete');
    expect(result.sellerId).toBe(ids.seller);
    expect(result.orderId).toBe(ids.order);
    expect(result.order.is_test).toBe(true);
    expect(result.order.syntheticFixture).toEqual({ scenarioKey: 'SCENARIO_001', version: 1 });
    expect(result.order.items[0].fiscal).toEqual({
      ncm: '94036000',
      origem: '0',
      merchandiseOrigin: 'third_party',
    });
    expect(result.order.items[0].fiscal).not.toHaveProperty('cfop');
    expect(result.audit).toMatchObject({
      itemCount: 1,
      paymentCount: 1,
      initialStock: 5,
      finalStock: 3,
      stockMoveCount: 1,
      statusHistoryCount: 1,
      productionDocumentCount: 0,
    });
    expect(memory.orders.size).toBe(1);
    expect(memory.customers.size).toBe(1);
    expect(memory.products.size).toBe(1);
  });

  it('recusa dados identificadores inválidos e não fabrica CPF/CNPJ', async () => {
    const invalid = input();
    invalid.customer.cpfCnpj = '12345678000199';
    await expect(createSyntheticSalesScenario(invalid, memory.dependencies)).rejects.toThrow(
      /CPF\/CNPJ/i
    );
    expect(memory.customers.size).toBe(0);
    expect(memory.products.size).toBe(0);
    expect(memory.orders.size).toBe(0);
  });

  it('retoma falha após persistir cliente sem duplicá-lo', async () => {
    memory.failCustomerAfterInsert();
    await expect(createSyntheticSalesScenario(input(), memory.dependencies)).rejects.toThrow(
      /após inserir cliente/i
    );
    expect(memory.runs.get('SCENARIO_001')?.status).toBe('failed');
    expect(memory.customers.size).toBe(1);
    expect(memory.products.size).toBe(0);
    const result = await createSyntheticSalesScenario(input(), memory.dependencies);
    expect(result.status).toBe('complete');
    expect(memory.customers.size).toBe(1);
    expect(memory.orderCreateCalls()).toBe(1);
  });

  it.each([
    { date: '2026-02-30', startTime: '09:00', endTime: '10:00' },
    { date: '2026-10-08', startTime: '24:00', endTime: '25:00' },
    { date: '2026-10-08', startTime: '10:00', endTime: '09:00' },
  ])('recusa o agendamento inválido antes de criar qualquer cadastro', async (schedule) => {
    const invalid = input();
    invalid.order.schedule = schedule;
    await expect(createSyntheticSalesScenario(invalid, memory.dependencies)).rejects.toThrow(
      /agendamento/i
    );
    expect(memory.dependencies.claim).not.toHaveBeenCalled();
    expect(memory.customers.size).toBe(0);
    expect(memory.products.size).toBe(0);
    expect(memory.orders.size).toBe(0);
  });

  it('retoma uma falha parcial de produto com os mesmos IDs sem declarar o cenário completo', async () => {
    memory.failProductAfterRoot();
    await expect(createSyntheticSalesScenario(input(), memory.dependencies)).rejects.toThrow(
      /falha após salvar/i
    );
    expect(memory.runs.get('SCENARIO_001')?.status).toBe('failed');
    expect(memory.orders.size).toBe(0);
    const result = await createSyntheticSalesScenario(input(), memory.dependencies);
    expect(result.status).toBe('complete');
    expect(memory.customers.size).toBe(1);
    expect(memory.products.size).toBe(1);
    expect(memory.productSaveCalls()).toBe(2);
    expect(memory.orderCreateCalls()).toBe(1);
  });

  it('retoma quando o pedido foi confirmado mas a auditoria pós-criação falhou', async () => {
    memory.failMoveAudit();
    await expect(createSyntheticSalesScenario(input(), memory.dependencies)).rejects.toThrow(
      /auditoria do estoque/i
    );
    expect(memory.orders.size).toBe(1);
    expect(memory.runs.get('SCENARIO_001')?.status).toBe('failed');
    const result = await createSyntheticSalesScenario(input(), memory.dependencies);
    expect(result.status).toBe('complete');
    expect(memory.orders.size).toBe(1);
    expect(memory.orderCreateCalls()).toBe(1);
    expect(memory.moves).toHaveLength(1);
  });

  it('reexecuta cenário completo sem criar cliente, produto, pedido ou movimento duplicados', async () => {
    await createSyntheticSalesScenario(input(), memory.dependencies);
    const repeated = await createSyntheticSalesScenario(input(), memory.dependencies);
    expect(repeated.status).toBe('complete');
    expect(memory.customers.size).toBe(1);
    expect(memory.products.size).toBe(1);
    expect(memory.orders.size).toBe(1);
    expect(memory.moves).toHaveLength(1);
    expect(memory.productSaveCalls()).toBe(1);
    expect(memory.orderCreateCalls()).toBe(1);
  });

  it('não recria cadastro ausente em uma repetição concluída sem lease', async () => {
    await createSyntheticSalesScenario(input(), memory.dependencies);
    memory.customers.delete(ids.customer);
    await expect(createSyntheticSalesScenario(input(), memory.dependencies)).rejects.toThrow(
      /somente leitura/i
    );
    expect(memory.customers.size).toBe(0);
    expect(memory.orderCreateCalls()).toBe(1);
  });

  it('bloqueia duas execuções concorrentes da mesma chave antes de duplicar cadastros ou pedido', async () => {
    const gate = memory.pauseCustomerSave();
    const firstRun = createSyntheticSalesScenario(input(), memory.dependencies);
    await gate.started;
    await expect(createSyntheticSalesScenario(input(), memory.dependencies)).rejects.toThrow(
      /já está em execução/i
    );
    gate.release();
    await expect(firstRun).resolves.toMatchObject({ status: 'complete' });
    expect(memory.customers.size).toBe(1);
    expect(memory.products.size).toBe(1);
    expect(memory.orders.size).toBe(1);
    expect(memory.orderCreateCalls()).toBe(1);
  });

  it('não aceita chave repetida em um lote e só retorna status completo após todos os cenários', async () => {
    await expect(
      createSyntheticSalesScenarioBatch([input(), input()], memory.dependencies)
    ).rejects.toThrow(/scenarioKeys duplicadas/i);
    expect(memory.orders.size).toBe(0);
  });

  it('não devolve lote completo se um cenário posterior falhar', async () => {
    const second = input('SCENARIO_002');
    second.product.categoryId = '550e8400-e29b-41d4-a716-446655440008';
    await expect(
      createSyntheticSalesScenarioBatch([input(), second], memory.dependencies)
    ).rejects.toThrow(/categoria informada não existe/i);
    expect(memory.runs.get('SCENARIO_001')?.status).toBe('complete');
    expect(memory.runs.get('SCENARIO_002')?.status).toBe('failed');
    expect(memory.orders.size).toBe(1);
  });
});
