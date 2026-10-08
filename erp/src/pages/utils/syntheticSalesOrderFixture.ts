import type { Item, ItemsSummary } from '../types/items.type';
import type Order from '../types/order.type';
import type { Payment, PaymentsSummary } from '../types/payments.type';
import type Shipping from '../types/Shipping.type';
import { calcItemsSummary, calcPaymentsSummary } from './calculations';
import { withOrderAddressSnapshot } from './orderAddressSnapshot';
import { saveOrder } from './orderMutationService';
import { supabase } from './supabaseConfig';
import { validateOrder } from './validations';

export type SyntheticSalesOrderCommand = Omit<Order, 'itemsSummary' | 'paymentsSummary'> & {
  items: Item[];
  payments: Payment[];
  shipping: Shipping;
};

export type SyntheticOrderSnapshot = {
  id: string;
  orderIndex?: number | null;
  status: string;
  customerId?: string | null;
  sellerId?: string | null;
  orderType: string;
  totalAmount: number;
  orderData: Order;
  normalizedItems: Array<{
    productId?: string | null;
    variationId?: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
    unitDiscount: number;
    discountType: string;
  }>;
  normalizedPayments: Array<{
    method: string;
    amount: number;
    fee: number;
    feeType: string;
    status: string;
    installments: number;
  }>;
};

export type SyntheticFixtureDependencies = {
  createOrder: (order: Order, options: { idempotencyKey: string }) => Promise<string>;
  loadSnapshot: (id: string) => Promise<SyntheticOrderSnapshot | null>;
};

const validateScenarioKey = (scenarioKey: string): void => {
  if (!/^[A-Z0-9_]{3,100}$/.test(scenarioKey)) {
    throw new Error('O scenarioKey deve conter apenas letras maiúsculas, números e _.');
  }
};

const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export const buildSyntheticSalesOrder = (command: SyntheticSalesOrderCommand): Order => {
  if (!command.customerData?.id) {
    throw new Error('Fixture inválida: informe um cliente sintético já cadastrado no ERP.');
  }
  if (!command.sellerId) {
    throw new Error('Fixture inválida: informe o ID do vendedor já cadastrado no ERP.');
  }
  if (command.items.some((item) => !item.productId || !item.variationId)) {
    throw new Error('Fixture inválida: cada item deve referenciar produto e variação existentes.');
  }
  if (command.items.some((item) => item.condition !== 'novo' || item.isTemporaryProduct)) {
    throw new Error(
      'Fixture fiscal exige mercadoria nova cadastrada, sem desvincular o estoque do produto.'
    );
  }
  if (
    !command.fiscalContext?.acquisitionPurpose ||
    typeof command.fiscalContext.finalConsumer !== 'boolean' ||
    !command.fiscalContext.recipientIeIndicator ||
    !command.customerData.personType ||
    !command.customerData.ieIndicator
  ) {
    throw new Error(
      'Fixture inválida: finalidade, consumidor final e enquadramento do destinatário são obrigatórios.'
    );
  }
  if (
    !['resale', 'use_consumption', 'fixed_asset'].includes(command.fiscalContext.acquisitionPurpose)
  ) {
    throw new Error('Fixture inválida: finalidade fiscal desconhecida.');
  }
  if (command.fiscalContext.recipientIeIndicator === '1' && !command.customerData.ie?.trim()) {
    throw new Error('Fixture inválida: destinatário contribuinte exige IE declarada.');
  }
  if (command.fiscalContext.recipientIeIndicator !== command.customerData.ieIndicator) {
    throw new Error(
      'Fixture inválida: o indicador de IE do pedido diverge do cadastro do destinatário.'
    );
  }
  const expectedFinalConsumer = command.fiscalContext.acquisitionPurpose !== 'resale';
  if (command.fiscalContext.finalConsumer !== expectedFinalConsumer) {
    throw new Error(
      'Fixture inválida: indFinal não corresponde à finalidade declarada da aquisição.'
    );
  }
  if (
    command.items.some(
      (item) => !item.fiscal?.ncm || !item.fiscal?.origem || !item.fiscal?.merchandiseOrigin
    )
  ) {
    throw new Error(
      'Fixture inválida: informe a classificação fiscal e a origem real da mercadoria em cada item.'
    );
  }

  const itemsSummary: ItemsSummary = calcItemsSummary(command.items);
  const paymentsSummary: PaymentsSummary = calcPaymentsSummary(
    command.payments,
    itemsSummary,
    command.shipping.value
  );

  const order = withOrderAddressSnapshot({
    ...command,
    is_test: true,
    syntheticFixture: command.syntheticFixture,
    itemsSummary,
    paymentsSummary,
  } as Order);
  const errors = validateOrder(order);
  if (Object.keys(errors).length) {
    throw new Error(
      `Fixture inválida: ${Object.entries(errors)
        .map(([key, value]) => `${key}: ${value}`)
        .join('; ')}`
    );
  }
  return order;
};

const same = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

const projection = (order: Order) => ({
  syntheticFixture: order.syntheticFixture,
  is_test: order.is_test,
  orderType: order.orderType,
  status: order.status,
  seller: order.seller,
  sellerId: order.sellerId,
  customerData: order.customerData,
  fiscalContext: order.fiscalContext,
  shipping: order.shipping,
  items: order.items.map((item) => ({
    productId: item.productId,
    variationId: item.variationId,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    unitDiscount: item.unitDiscount,
    discountType: item.discountType,
    fiscal: item.fiscal,
  })),
  payments: order.payments.map((payment) => ({
    method: payment.method,
    amount: payment.amount,
    fee: payment.fee,
    feeType: payment.feeType,
    status: payment.status,
    installments: payment.installments || 1,
  })),
});

export const auditSyntheticSalesOrder = (
  expected: Order,
  snapshot: SyntheticOrderSnapshot,
  expectedId?: string
): void => {
  if (expectedId && snapshot.id !== expectedId) {
    throw new Error('Auditoria da fixture falhou: o ID comercial diverge do UUID reservado.');
  }
  if (!isUuid(snapshot.id)) {
    throw new Error('Auditoria da fixture falhou: o ID comercial do pedido não é um UUID.');
  }
  const expectedOrderTotal = expected.paymentsSummary.totalOrderValue;
  if (!same(projection(expected), projection(snapshot.orderData))) {
    throw new Error(
      'Auditoria da fixture falhou: dados comerciais, fiscais ou de entrega divergentes.'
    );
  }
  if (
    snapshot.status !== expected.status ||
    snapshot.orderType !== expected.orderType ||
    snapshot.customerId !== (expected.customerData.id || null) ||
    snapshot.sellerId !== (expected.sellerId || null) ||
    Math.abs(snapshot.totalAmount - expectedOrderTotal) > 0.01
  ) {
    throw new Error('Auditoria da fixture falhou: cabeçalho ou vínculos divergentes.');
  }

  const expectedItems = expected.items.map((item) => ({
    productId: item.productId || null,
    variationId: item.variationId || null,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    unitDiscount: item.unitDiscount,
    discountType: item.discountType,
  }));
  const persistedItems = snapshot.normalizedItems.map((item) => ({
    productId: item.productId || null,
    variationId: item.variationId || null,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    unitDiscount: item.unitDiscount,
    discountType: item.discountType,
  }));
  if (!same(expectedItems, persistedItems)) {
    throw new Error('Auditoria da fixture falhou: itens ou variações divergentes.');
  }

  const expectedPayments = expected.payments.map((payment) => ({
    method: payment.method,
    amount: payment.amount,
    fee: payment.fee,
    feeType: payment.feeType,
    status: payment.status,
    installments: payment.installments || 1,
  }));
  const persistedPayments = snapshot.normalizedPayments.map((payment) => ({
    method: payment.method,
    amount: payment.amount,
    fee: payment.fee,
    feeType: payment.feeType,
    status: payment.status,
    installments: payment.installments || 1,
  }));
  if (!same(expectedPayments, persistedPayments)) {
    throw new Error('Auditoria da fixture falhou: pagamentos ou parcelas divergentes.');
  }
};

export const loadSyntheticOrderSnapshot = async (
  id: string
): Promise<SyntheticOrderSnapshot | null> => {
  const { data: row, error } = await supabase
    .from('orders')
    .select('id, order_index, status, customer_id, seller_id, order_type, total_amount, order_data')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!row) return null;

  const [itemsResult, paymentsResult] = await Promise.all([
    supabase
      .from('order_items')
      .select(
        'product_id, variation_id, description, quantity, unit_price, unit_discount, discount_type'
      )
      .eq('order_id', id)
      .order('item_index'),
    supabase
      .from('order_payments')
      .select('payment_method, amount, fee, fee_type, status, installments')
      .eq('order_id', id)
      .order('payment_index'),
  ]);
  if (itemsResult.error) throw itemsResult.error;
  if (paymentsResult.error) throw paymentsResult.error;

  const orderData = row.order_data as unknown as Order;
  return {
    id: row.id,
    orderIndex: row.order_index,
    status: row.status,
    customerId: row.customer_id,
    sellerId: row.seller_id,
    orderType: row.order_type,
    totalAmount: Number(row.total_amount),
    orderData,
    normalizedItems: (itemsResult.data || []).map((item) => ({
      productId: item.product_id,
      variationId: item.variation_id,
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price),
      unitDiscount: Number(item.unit_discount),
      discountType: item.discount_type,
    })),
    normalizedPayments: (paymentsResult.data || []).map((payment) => ({
      method: payment.payment_method,
      amount: Number(payment.amount),
      fee: Number(payment.fee),
      feeType: payment.fee_type,
      status: payment.status,
      installments: payment.installments || 1,
    })),
  };
};

/** Cria pelo mesmo serviço do formulário e exige auditoria posterior via adapter de leitura. */
export const createSyntheticSalesOrder = async (
  scenarioKey: string,
  command: SyntheticSalesOrderCommand,
  orderId: string,
  dependencies: SyntheticFixtureDependencies = {
    createOrder: saveOrder,
    loadSnapshot: loadSyntheticOrderSnapshot,
  }
): Promise<{ id: string; order: Order; snapshot: SyntheticOrderSnapshot }> => {
  validateScenarioKey(scenarioKey);
  if (!isUuid(orderId)) {
    throw new Error('A fixture precisa de um UUID comercial reservado separado do scenarioKey.');
  }
  const idempotencyKey = orderId;
  const order = buildSyntheticSalesOrder({
    ...command,
    id: undefined,
    is_test: true,
    syntheticFixture: { scenarioKey, version: 1 },
  });

  let id: string;
  const existing = await dependencies.loadSnapshot(idempotencyKey);
  if (existing) {
    auditSyntheticSalesOrder(order, existing, idempotencyKey);
    return { id: existing.id, order, snapshot: existing };
  }

  try {
    id = await dependencies.createOrder(order, { idempotencyKey });
  } catch (error) {
    // A chamada pode ter confirmado no banco e perdido a resposta; conferir a chave estável.
    const committed = await dependencies.loadSnapshot(idempotencyKey);
    if (!committed) throw error;
    auditSyntheticSalesOrder(order, committed, idempotencyKey);
    return { id: committed.id, order, snapshot: committed };
  }

  const snapshot = await dependencies.loadSnapshot(id);
  if (!snapshot) throw new Error('Auditoria da fixture falhou: o pedido salvo não foi encontrado.');
  auditSyntheticSalesOrder(order, snapshot, idempotencyKey);
  return { id, order, snapshot };
};
