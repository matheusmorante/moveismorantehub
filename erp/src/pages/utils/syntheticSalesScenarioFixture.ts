import { checkERPLegibility } from '@/pages/App/Products/domain/productLegibilityRules';
import { getVariationRegistrationIssue } from '@/pages/App/Products/domain/variationRegistrationRules';
import type Order from '@/pages/types/order.type';
import type { FiscalAcquisitionPurpose } from '@/pages/types/order.type';
import type { Payment } from '@/pages/types/payments.type';
import type Person from '@/pages/types/person.type';
import type Product from '@/pages/types/product.type';
import type { FiscalInfo, Variation } from '@/pages/types/product.type';
import { isValidEmployee } from '@/pages/utils/accessRoles';
import {
  isValidRecipientTaxId,
  normalizeRecipientTaxId,
  recipientTaxIdMatchesPersonType,
} from '../../../../shared-utils/recipientTaxId';
import { saveOrder } from './orderMutationService';
import { savePerson } from './personService';
import { mapFromDB as mapPersonFromDB } from './personService/personMapper';
import { normalizeProductForSave } from './productKindRules';
import { saveProduct } from './productService';
import { supabase } from './supabaseConfig';
import {
  claimSyntheticSalesScenario,
  loadSyntheticSalesScenario,
  type SyntheticSalesScenarioProgress,
  type SyntheticSalesScenarioRun,
  updateSyntheticSalesScenario,
} from './syntheticSalesFixtureRegistry';
import {
  auditSyntheticSalesOrder,
  buildSyntheticSalesOrder,
  createSyntheticSalesOrder,
  loadSyntheticOrderSnapshot,
  type SyntheticOrderSnapshot,
  type SyntheticSalesOrderCommand,
} from './syntheticSalesOrderFixture';

const SCENARIO_VERSION = 1 as const;
const SELLER_NAME = 'Matheus Morante';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ORIGIN_CODES = new Set(['0', '1', '2', '3', '4', '5', '6', '7', '8']);

export type SyntheticCustomerInput = {
  personType: 'PF' | 'PJ';
  fullName: string;
  cpfCnpj: string;
  ieIndicator: '1' | '2' | '9';
  ie?: string;
  email?: string;
  phone: string;
  marketingOrigin: 'organic' | 'paid';
  address: {
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  };
};

export type SyntheticProductInput = {
  name: string;
  description: string;
  categoryId: string;
  unit: string;
  unitPrice: number;
  costPrice: number;
  openingStock: number;
  ncm: string;
  cest?: string;
  origin: string;
  merchandiseOrigin: 'third_party' | 'own_production';
  supplierId?: string;
  variationName: string;
  variationAttributes?: Variation['attributes'];
};

export type SyntheticSalesOrderInput = {
  date: string;
  quantity: number;
  acquisitionPurpose: FiscalAcquisitionPurpose;
  finalConsumer: boolean;
  deliveryMethod: 'delivery' | 'pickup';
  shippingValue: number;
  deliveryDistance: number;
  schedule: { date: string; startTime: string; endTime: string };
  payments: Payment[];
};

export type SyntheticSalesScenarioInput = {
  scenarioKey: string;
  customer: SyntheticCustomerInput;
  product: SyntheticProductInput;
  order: SyntheticSalesOrderInput;
};

export type SyntheticProductSnapshot = {
  id: string;
  name: string;
  description: string;
  code: string;
  categoryIds: string[];
  productKind: string;
  condition: string;
  unit: string;
  unitPrice: number;
  costPrice: number;
  stock: number;
  active: boolean;
  isDraft: boolean;
  status: string;
  supplierId: string | null;
  fiscal: FiscalInfo;
  variations: Array<{
    id: string;
    productId: string;
    name: string;
    sku: string;
    unitPrice: number;
    stock: number;
    active: boolean;
    status: string;
  }>;
};

export type SyntheticInventoryMoveSnapshot = {
  id: string;
  productId: string;
  variationId: string | null;
  type: string;
  quantity: number;
  relatedEntityId: string | null;
  relatedEntityType: string | null;
  status: string | null;
};

export type SyntheticSalesScenarioResult = {
  status: 'complete';
  scenarioKey: string;
  customerId: string;
  productId: string;
  variationId: string;
  sellerId: string;
  orderId: string;
  order: Order;
  audit: Record<string, unknown>;
};

export type SyntheticSalesScenarioDependencies = {
  claim: typeof claimSyntheticSalesScenario;
  update: typeof updateSyntheticSalesScenario;
  loadScenarioByKey: typeof loadSyntheticSalesScenario;
  loadCustomer: (id: string) => Promise<Person | null>;
  saveCustomer: (person: Person) => Promise<Person>;
  categoryExists: (id: string) => Promise<boolean>;
  supplierExists: (id: string) => Promise<boolean>;
  loadProduct: (id: string) => Promise<SyntheticProductSnapshot | null>;
  saveProduct: (product: Product) => Promise<string>;
  loadSeller: (name: string) => Promise<Person>;
  saveOrder: (order: Order, options: { idempotencyKey: string }) => Promise<string>;
  loadOrder: (id: string) => Promise<SyntheticOrderSnapshot | null>;
  loadInventoryMoves: (orderId: string) => Promise<SyntheticInventoryMoveSnapshot[]>;
  loadStatusHistory: (
    orderId: string
  ) => Promise<Array<{ oldStatus: string | null; newStatus: string }>>;
  loadProductionFiscalDocuments: (
    orderId: string
  ) => Promise<Array<{ id: string; status: string }>>;
};

const required = (value: string | undefined, label: string): string => {
  const clean = String(value || '').trim();
  if (!clean) throw new Error(`Informe ${label}.`);
  return clean;
};

const finitePositive = (value: number, label: string): number => {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} deve ser maior que zero.`);
  return value;
};

const validateOrderSchedule = (
  schedule: SyntheticSalesOrderInput['schedule']
): SyntheticSalesOrderInput['schedule'] => {
  const date = required(schedule?.date, 'a data da entrega/retirada');
  const startTime = required(schedule?.startTime, 'o horário inicial do agendamento');
  const endTime = required(schedule?.endTime, 'o horário final do agendamento');
  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  const timeToMinutes = (value: string): number => {
    if (!/^\d{2}:\d{2}$/.test(value)) return -1;
    const [hours, minutes] = value.split(':').map(Number);
    if (hours > 23 || minutes > 59) return -1;
    return hours * 60 + minutes;
  };
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(parsedDate.valueOf()) ||
    parsedDate.toISOString().slice(0, 10) !== date ||
    start < 0 ||
    end < 0 ||
    end <= start
  ) {
    throw new Error('O agendamento exige uma data ISO real e um intervalo HH:mm válido.');
  }
  return { date, startTime, endTime };
};

const digits = (value: string): string => value.replace(/\D/g, '');

export const buildSyntheticCustomer = (
  input: SyntheticCustomerInput,
  reservedId: string
): Person => {
  if (!UUID_RE.test(reservedId)) throw new Error('O cliente exige um UUID reservado pela fixture.');
  const fullName = required(input.fullName, 'o nome do cliente');
  const taxId = required(input.cpfCnpj, 'um CPF/CNPJ válido');
  if (!isValidRecipientTaxId(taxId) || !recipientTaxIdMatchesPersonType(taxId, input.personType)) {
    throw new Error('O CPF/CNPJ informado é inválido ou incompatível com o tipo PF/PJ.');
  }
  if (
    input.ieIndicator === '1' &&
    !required(input.ie, 'a IE declarada pelo cliente contribuinte')
  ) {
    throw new Error('Destinatário contribuinte exige IE declarada.');
  }
  const phone = required(input.phone, 'o telefone do cliente');
  if (digits(phone).length < 10 || digits(phone).length > 13) {
    throw new Error('O telefone do cliente precisa ter entre 10 e 13 dígitos.');
  }
  const email = input.email?.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('O e-mail informado não é válido.');
  }
  const state = required(input.address?.state, 'a UF do cliente').toUpperCase();
  if (!/^[A-Z]{2}$/.test(state)) throw new Error('A UF do cliente deve conter duas letras.');
  const cep = digits(required(input.address?.cep, 'o CEP do cliente'));
  if (!/^\d{8}$/.test(cep)) throw new Error('O CEP do cliente deve conter oito dígitos.');

  return {
    id: reservedId,
    type: 'customers',
    personType: input.personType,
    fullName,
    cpfCnpj: taxId,
    ieIndicator: input.ieIndicator,
    ...(input.ieIndicator === '1'
      ? { ie: required(input.ie, 'a IE declarada pelo cliente contribuinte') }
      : {}),
    ...(email ? { email } : {}),
    phone,
    marketingOrigin: input.marketingOrigin,
    active: true,
    deleted: false,
    noPhone: false,
    noAddress: false,
    fullAddress: {
      cep,
      street: required(input.address.street, 'a rua do cliente'),
      number: required(input.address.number, 'o número do endereço do cliente'),
      complement: input.address.complement?.trim() || '',
      observation: '',
      neighborhood: required(input.address.neighborhood, 'o bairro do cliente'),
      city: required(input.address.city, 'a cidade do cliente'),
      state,
    },
  };
};

const buildSyntheticProduct = (
  input: SyntheticProductInput,
  productId: string,
  variationId: string,
  existingCode?: string,
  currentStocks?: { product: number; variation: number }
): Product => {
  if (!UUID_RE.test(productId) || !UUID_RE.test(variationId)) {
    throw new Error('Produto e variação exigem UUIDs reservados pela fixture.');
  }
  if (!/^\d{8}$/.test(input.ncm))
    throw new Error('Informe o NCM real do produto com oito dígitos.');
  if (input.cest && !/^\d{7}$/.test(input.cest))
    throw new Error('O CEST real deve conter sete dígitos.');
  if (!ORIGIN_CODES.has(input.origin))
    throw new Error('Informe o código real de origem da mercadoria entre 0 e 8.');
  if (input.merchandiseOrigin === 'third_party')
    required(input.supplierId, 'um fornecedor real para mercadoria de terceiros');
  const name = required(input.name, 'o nome comercial do produto');
  const description = required(input.description, 'a descrição comercial/fiscal do produto');
  const unit = required(input.unit, 'a unidade comercial do produto');
  const variationName = required(input.variationName, 'o nome comercial da variação');
  const unitPrice = finitePositive(input.unitPrice, 'O preço da variação');
  const costPrice = input.costPrice;
  if (!Number.isFinite(costPrice) || costPrice < 0)
    throw new Error('O custo real do produto não pode ser negativo.');
  if (!Number.isInteger(input.openingStock) || input.openingStock <= 0) {
    throw new Error('O estoque inicial do produto precisa ser um inteiro maior que zero.');
  }
  const fiscal: FiscalInfo = {
    ncm: input.ncm,
    ...(input.cest ? { cest: input.cest } : {}),
    origem: input.origin,
    merchandiseOrigin: input.merchandiseOrigin,
    isOwnProduction: input.merchandiseOrigin === 'own_production',
  };
  const variation: Variation = {
    id: variationId,
    name: variationName,
    sku: '',
    stock: currentStocks?.variation ?? input.openingStock,
    unitPrice,
    costPrice,
    active: true,
    status: 'hidden',
    condition: 'novo',
    attributes: input.variationAttributes || [],
    syncUnitPrice: true,
    syncFiscal: true,
    fiscal,
  };
  const product = normalizeProductForSave(
    {
      id: productId,
      ...(existingCode ? { code: existingCode } : {}),
      name,
      description,
      categoryIds: [required(input.categoryId, 'uma categoria comercial existente')],
      productKind: 'normal',
      condition: 'novo',
      unit,
      unitPrice,
      costPrice,
      stock: currentStocks?.product ?? input.openingStock,
      initialStock: input.openingStock,
      active: true,
      isDraft: false,
      status: 'hidden',
      itemType: 'product',
      hasVariations: true,
      variations: [variation],
      fiscal,
      merchandiseOrigin: input.merchandiseOrigin,
      isOwnProduction: input.merchandiseOrigin === 'own_production',
      ...(input.supplierId
        ? {
            supplierId: input.supplierId,
            mainSupplierId: input.supplierId,
            supplierIds: [input.supplierId],
          }
        : {}),
      images: [],
      notificationConfig: { enabled: false, notifyZeroStock: false, notifyMinStock: false },
    },
    { isDraft: false, isCompletingDraft: false, catalogStatus: 'hidden', name }
  );

  const erp = checkERPLegibility(product);
  if (!erp.isLegible) throw new Error(`Produto sintético inválido: ${erp.errors.join('; ')}`);
  const issue = getVariationRegistrationIssue(product, variation);
  if (issue) throw new Error(`Variação sintética inválida: ${issue.message}`);
  return product;
};

const buildScenarioCommand = (
  input: SyntheticSalesScenarioInput,
  customer: Person,
  product: SyntheticProductSnapshot,
  variationId: string,
  seller: Person
): SyntheticSalesOrderCommand => {
  const variation = product.variations.find((item) => item.id === variationId);
  if (!variation) throw new Error('A auditoria do produto não encontrou a variação reservada.');
  const quantity = finitePositive(input.order.quantity, 'A quantidade do pedido');
  if (!Number.isInteger(quantity)) throw new Error('A quantidade do pedido precisa ser inteira.');
  if (quantity > input.product.openingStock)
    throw new Error('A quantidade do pedido supera o estoque inicial disponível.');
  if (!['resale', 'use_consumption', 'fixed_asset'].includes(input.order.acquisitionPurpose)) {
    throw new Error('A finalidade da operação deve ser informada explicitamente.');
  }
  if (typeof input.order.finalConsumer !== 'boolean') {
    throw new Error('O indicador de consumidor final deve ser informado explicitamente.');
  }
  const orderDate = new Date(input.order.date);
  if (Number.isNaN(orderDate.valueOf())) throw new Error('A data do pedido deve ser válida.');
  const { date: scheduleDate, startTime, endTime } = validateOrderSchedule(input.order.schedule);
  if (input.order.deliveryMethod !== 'delivery' && input.order.deliveryMethod !== 'pickup') {
    throw new Error('A modalidade de entrega/retirada deve ser explícita.');
  }
  if (!Number.isFinite(input.order.shippingValue) || input.order.shippingValue < 0) {
    throw new Error('O valor do frete não pode ser negativo.');
  }
  finitePositive(input.order.deliveryDistance, 'A distância da operação');
  const personAddress = customer.fullAddress;
  if (!personAddress)
    throw new Error('O cadastro persistido do cliente não possui endereço completo.');
  const orderCustomer = {
    id: customer.id,
    personType: customer.personType,
    fullName: customer.fullName,
    phone: customer.phone || '',
    email: customer.email,
    cpfCnpj: customer.cpfCnpj,
    ie: customer.ie,
    ieIndicator: customer.ieIndicator,
    noPhone: false,
    noAddress: false,
    fullAddress: {
      cep: personAddress.cep || '',
      street: personAddress.street || '',
      number: personAddress.number || '',
      complement: personAddress.complement || '',
      observation: '',
      neighborhood: personAddress.neighborhood || '',
      city: personAddress.city || '',
      state: personAddress.state,
    },
  };
  const fiscal: FiscalInfo = {
    ncm: input.product.ncm,
    ...(input.product.cest ? { cest: input.product.cest } : {}),
    origem: input.product.origin,
    merchandiseOrigin: input.product.merchandiseOrigin,
  };
  const item = {
    productId: product.id,
    variationId: variation.id,
    code: variation.sku || product.code,
    description: variation.name,
    quantity,
    unitPrice: variation.unitPrice,
    costPrice: product.costPrice,
    unitDiscount: 0,
    discountType: 'fixed' as const,
    handlingType: input.order.deliveryMethod,
    condition: 'novo' as const,
    deliveryMethod: input.order.deliveryMethod,
    itemType: 'product' as const,
    currentStock: input.product.openingStock,
    fiscal,
  };
  return {
    orderType: 'sale',
    status: 'scheduled',
    date: input.order.date,
    seller: required(seller.fullName, 'o vendedor real Matheus Morante'),
    sellerId: required(seller.id, 'o ID do vendedor real Matheus Morante'),
    customerData: orderCustomer,
    marketingOrigin: customer.marketingOrigin,
    fiscalContext: {
      operationType: 'sale',
      acquisitionPurpose: input.order.acquisitionPurpose,
      finalConsumer: input.order.finalConsumer,
      recipientIeIndicator: customer.ieIndicator,
    },
    items: [item],
    payments: input.order.payments,
    shipping: {
      value: input.order.shippingValue,
      distance: input.order.deliveryDistance,
      deliveryMethod: input.order.deliveryMethod,
      orderType: input.order.deliveryMethod,
      scheduling: {
        date: scheduleDate,
        time: startTime,
        startTime,
        endTime,
        type: 'fixed',
      },
      useCustomerAddress: input.order.deliveryMethod === 'delivery',
    },
    observation: '',
  } as SyntheticSalesOrderCommand;
};

const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonical(item)])
  );
};

export const hashSyntheticScenarioPayload = async (
  input: Omit<SyntheticSalesScenarioInput, 'scenarioKey'>
): Promise<string> => {
  const encoded = new TextEncoder().encode(JSON.stringify(canonical(input)));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', encoded);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

const auditCustomer = (expected: Person, actual: Person): void => {
  if (
    actual.id !== expected.id ||
    actual.type !== 'customers' ||
    actual.personType !== expected.personType ||
    actual.fullName !== expected.fullName ||
    normalizeRecipientTaxId(actual.cpfCnpj || '') !==
      normalizeRecipientTaxId(expected.cpfCnpj || '') ||
    (actual.email || '') !== (expected.email || '') ||
    (actual.ie || '') !== (expected.ie || '') ||
    actual.ieIndicator !== expected.ieIndicator ||
    actual.phone !== expected.phone ||
    actual.marketingOrigin !== expected.marketingOrigin ||
    actual.active === false ||
    actual.deleted === true ||
    actual.fullAddress?.street !== expected.fullAddress?.street ||
    actual.fullAddress?.number !== expected.fullAddress?.number ||
    actual.fullAddress?.neighborhood !== expected.fullAddress?.neighborhood ||
    actual.fullAddress?.city !== expected.fullAddress?.city ||
    actual.fullAddress?.state !== expected.fullAddress?.state ||
    digits(actual.fullAddress?.cep || '') !== digits(expected.fullAddress?.cep || '')
  ) {
    throw new Error('Auditoria da fixture falhou: cadastro do cliente ou endereço divergente.');
  }
};

const sameProductNumber = (left: number, right: number): boolean =>
  Math.abs(left - right) <= 0.0001;

const auditProductIdentity = (
  input: SyntheticProductInput,
  expected: Product,
  actual: SyntheticProductSnapshot,
  variationId: string
): void => {
  const variation = actual.variations.find((item) => item.id === variationId);
  const expectedVariation = expected.variations?.find((item) => item.id === variationId);
  const expectedFiscal = expected.fiscal || {};
  if (
    actual.id !== expected.id ||
    actual.name !== expected.name ||
    actual.description !== expected.description ||
    !actual.code ||
    actual.categoryIds.length !== 1 ||
    actual.categoryIds[0] !== input.categoryId ||
    actual.productKind !== 'normal' ||
    actual.condition !== 'novo' ||
    actual.unit !== input.unit ||
    !sameProductNumber(actual.unitPrice, input.unitPrice) ||
    !sameProductNumber(actual.costPrice, input.costPrice) ||
    actual.active === false ||
    actual.isDraft ||
    actual.status !== 'hidden' ||
    actual.supplierId !== (input.supplierId || null) ||
    actual.fiscal.ncm !== expectedFiscal.ncm ||
    actual.fiscal.cest !== expectedFiscal.cest ||
    actual.fiscal.origem !== expectedFiscal.origem ||
    actual.fiscal.merchandiseOrigin !== expectedFiscal.merchandiseOrigin ||
    !variation ||
    !expectedVariation ||
    variation.productId !== actual.id ||
    variation.name !== expectedVariation.name ||
    !variation.sku ||
    !sameProductNumber(variation.unitPrice, expectedVariation.unitPrice) ||
    variation.active === false ||
    variation.status !== 'hidden'
  ) {
    throw new Error(
      'Auditoria da fixture falhou: produto, variação ou classificação real divergente.'
    );
  }
};

const validateScenarioKey = (scenarioKey: string) => {
  if (!/^[A-Z0-9_]{3,100}$/.test(scenarioKey)) {
    throw new Error('O scenarioKey deve conter apenas letras maiúsculas, números e _.');
  }
};

const assertSeller = (seller: Person): void => {
  if (
    seller.fullName?.trim().toLocaleLowerCase('pt-BR') !== SELLER_NAME.toLocaleLowerCase('pt-BR') ||
    !seller.id ||
    !isValidEmployee({ ...seller, type: seller.type })
  ) {
    throw new Error(
      'O vendedor ativo Matheus Morante não foi confirmado no cadastro de funcionários.'
    );
  }
};

const defaultDependencies: SyntheticSalesScenarioDependencies = {
  claim: claimSyntheticSalesScenario,
  update: updateSyntheticSalesScenario,
  loadScenarioByKey: loadSyntheticSalesScenario,
  async loadCustomer(id) {
    const { data, error } = await supabase.from('people').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? mapPersonFromDB(data) : null;
  },
  saveCustomer: (person) => savePerson('customers', person, { insertOnly: true }),
  async categoryExists(id) {
    const { data, error } = await supabase
      .from('categories')
      .select('id')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return Boolean(data?.id);
  },
  async supplierExists(id) {
    const { data, error } = await supabase
      .from('people')
      .select('id,person_type,active,deleted')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return Boolean(
      data?.id &&
        ['supplier', 'suppliers'].includes(String(data.person_type).toLowerCase()) &&
        data.active !== false &&
        data.deleted !== true
    );
  },
  async loadProduct(id) {
    const { data, error } = await supabase
      .from('products')
      .select(
        'id,name,code,description,category_id,product_kind,condition,unit,unit_price,cost_price,stock,active,is_draft,status,supplier_id,fiscal,product_categories(category_id),product_variations(id,product_id,name,sku,price,stock,status,active,use_parent_price)'
      )
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const variations = (data.product_variations || []).map((row: any) => ({
      id: String(row.id),
      productId: String(row.product_id),
      name: String(row.name || data.name || ''),
      sku: String(row.sku || ''),
      unitPrice: row.use_parent_price ? Number(data.unit_price || 0) : Number(row.price || 0),
      stock: Number(row.stock || 0),
      active: Boolean(row.active),
      status: String(row.status || data.status || 'hidden'),
    }));
    return {
      id: String(data.id),
      name: String(data.name || ''),
      description: String(data.description || ''),
      code: String(data.code || ''),
      categoryIds: (data.product_categories || []).map((row: any) => String(row.category_id)),
      productKind: String(data.product_kind || 'normal'),
      condition: String(data.condition || 'novo'),
      unit: String(data.unit || 'UN'),
      unitPrice: Number(data.unit_price || 0),
      costPrice: Number(data.cost_price || 0),
      stock: Number(data.stock || 0),
      active: Boolean(data.active),
      isDraft: Boolean(data.is_draft),
      status: String(data.status || 'draft'),
      supplierId: data.supplier_id ? String(data.supplier_id) : null,
      fiscal: (data.fiscal || {}) as FiscalInfo,
      variations,
    };
  },
  saveProduct: (product) => saveProduct(product),
  async loadSeller(name) {
    const { data, error } = await supabase
      .from('people')
      .select('*')
      .eq('person_type', 'employees')
      .ilike('full_name', name)
      .or('deleted.eq.false,deleted.is.null')
      .order('full_name', { ascending: true });
    if (error) throw error;
    const sellers = (data || [])
      .map(mapPersonFromDB)
      .filter((person: Person) => isValidEmployee(person));
    if (sellers.length !== 1)
      throw new Error('Esperava exatamente um funcionário ativo chamado Matheus Morante.');
    return sellers[0];
  },
  saveOrder,
  loadOrder: loadSyntheticOrderSnapshot,
  async loadInventoryMoves(orderId) {
    const { data, error } = await supabase
      .from('inventory_moves')
      .select(
        'id,product_id,variation_id,type,quantity,related_entity_id,related_entity_type,status'
      )
      .eq('order_id', orderId);
    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: String(row.id),
      productId: String(row.product_id),
      variationId: row.variation_id ? String(row.variation_id) : null,
      type: String(row.type),
      quantity: Number(row.quantity),
      relatedEntityId: row.related_entity_id ? String(row.related_entity_id) : null,
      relatedEntityType: row.related_entity_type ? String(row.related_entity_type) : null,
      status: row.status ? String(row.status) : null,
    }));
  },
  async loadStatusHistory(orderId) {
    const { data, error } = await supabase
      .from('order_status_history')
      .select('old_status,new_status')
      .eq('order_id', orderId);
    if (error) throw error;
    return (data || []).map((row: any) => ({
      oldStatus: row.old_status ? String(row.old_status) : null,
      newStatus: String(row.new_status),
    }));
  },
  async loadProductionFiscalDocuments(orderId) {
    const { data, error } = await supabase
      .from('nfe_documents')
      .select('id,status')
      .eq('order_id', orderId)
      .eq('ambiente', 1);
    if (error) throw error;
    return (data || []).map((row: any) => ({ id: String(row.id), status: String(row.status) }));
  },
};

const auditOrderEffects = async (
  input: SyntheticSalesScenarioInput,
  run: SyntheticSalesScenarioRun,
  order: Order,
  dependencies: SyntheticSalesScenarioDependencies
): Promise<Record<string, unknown>> => {
  const [actualOrder, product, moves, history, productionDocs] = await Promise.all([
    dependencies.loadOrder(run.orderId),
    dependencies.loadProduct(run.productId),
    dependencies.loadInventoryMoves(run.orderId),
    dependencies.loadStatusHistory(run.orderId),
    dependencies.loadProductionFiscalDocuments(run.orderId),
  ]);
  if (!actualOrder)
    throw new Error('Auditoria da fixture falhou: pedido não encontrado após salvar.');
  auditSyntheticSalesOrder(order, actualOrder, run.orderId);
  if (actualOrder.orderData.is_test !== true || actualOrder.orderData.stockProcessed !== true) {
    throw new Error(
      'Auditoria da fixture falhou: o pedido não preservou is_test e a baixa transacional do estoque.'
    );
  }
  if (
    actualOrder.orderData.syntheticFixture?.scenarioKey !== input.scenarioKey ||
    actualOrder.orderData.syntheticFixture.version !== SCENARIO_VERSION
  ) {
    throw new Error('Auditoria da fixture falhou: marcador sintético ausente ou divergente.');
  }
  if (!product)
    throw new Error('Auditoria da fixture falhou: produto não encontrado após salvar o pedido.');
  const variation = product.variations.find((item) => item.id === run.variationId);
  const expectedStock = input.product.openingStock - input.order.quantity;
  if (!variation || variation.stock !== expectedStock || product.stock !== expectedStock) {
    throw new Error(
      'Auditoria da fixture falhou: saldo final da variação diverge da quantidade movimentada.'
    );
  }
  const matchingMoves = moves.filter(
    (move) =>
      move.productId === run.productId &&
      move.variationId === run.variationId &&
      move.relatedEntityId === run.orderId
  );
  if (
    matchingMoves.length !== 1 ||
    !['exit', 'withdrawal'].includes(matchingMoves[0].type) ||
    matchingMoves[0].quantity !== input.order.quantity ||
    matchingMoves[0].relatedEntityType !== 'sales_order' ||
    (matchingMoves[0].status && matchingMoves[0].status !== 'effective')
  ) {
    throw new Error(
      'Auditoria da fixture falhou: movimento transacional de estoque ausente, duplicado ou divergente.'
    );
  }
  if (
    history.length !== 1 ||
    history[0].oldStatus !== null ||
    history[0].newStatus !== order.status
  ) {
    throw new Error(
      'Auditoria da fixture falhou: histórico inicial do pedido ausente ou duplicado.'
    );
  }
  if (productionDocs.length > 0) {
    throw new Error(
      'Auditoria da fixture falhou: pedido de teste possui documento fiscal de Produção.'
    );
  }
  return {
    customerId: run.customerId,
    productId: run.productId,
    variationId: run.variationId,
    sellerId: run.sellerId,
    orderId: run.orderId,
    itemCount: actualOrder.normalizedItems.length,
    paymentCount: actualOrder.normalizedPayments.length,
    initialStock: input.product.openingStock,
    finalStock: variation.stock,
    finalProductStock: product.stock,
    stockMoveCount: matchingMoves.length,
    statusHistoryCount: history.length,
    productionDocumentCount: productionDocs.length,
    marker: 'order_data.is_test=true',
    fiscalEnvironment: 'unchanged by synthetic test marker',
  };
};

const setProgress = async (
  run: SyntheticSalesScenarioRun,
  progress: SyntheticSalesScenarioProgress,
  dependencies: SyntheticSalesScenarioDependencies
): Promise<SyntheticSalesScenarioRun> => dependencies.update(run, progress);

export async function createSyntheticSalesScenario(
  input: SyntheticSalesScenarioInput,
  dependencies: SyntheticSalesScenarioDependencies = defaultDependencies
): Promise<SyntheticSalesScenarioResult> {
  validateScenarioKey(input.scenarioKey);
  validateOrderSchedule(input.order.schedule);
  const payloadHash = await hashSyntheticScenarioPayload({
    customer: input.customer,
    product: input.product,
    order: input.order,
  });
  const run = await dependencies.claim(input.scenarioKey, payloadHash);
  if (!run.claimed && run.status !== 'complete') {
    throw new Error(
      'Este cenário sintético já está em execução por outro processo. Tente novamente após a reserva expirar.'
    );
  }

  let current = run;
  try {
    if (!run.claimed && run.status === 'complete') {
      const [completedCustomer, completedProduct, completedOrder] = await Promise.all([
        dependencies.loadCustomer(run.customerId),
        dependencies.loadProduct(run.productId),
        dependencies.loadOrder(run.orderId),
      ]);
      if (!completedCustomer || !completedProduct || !completedOrder) {
        throw new Error(
          'O registry marca o cenário como completo, mas há registros ausentes; a repetição sem lease é somente leitura.'
        );
      }
    }

    const customerDraft = buildSyntheticCustomer(input.customer, run.customerId);
    if (!(await dependencies.categoryExists(input.product.categoryId))) {
      throw new Error('A categoria informada não existe no cadastro do ERP.');
    }
    if (
      input.product.merchandiseOrigin === 'third_party' &&
      !(await dependencies.supplierExists(required(input.product.supplierId, 'um fornecedor real')))
    ) {
      throw new Error(
        'O fornecedor informado não existe, está inativo ou não é um fornecedor do ERP.'
      );
    }

    let customer = await dependencies.loadCustomer(run.customerId);
    if (!customer) {
      if (!current.claimed)
        throw new Error('Não é permitido recriar cliente sem lease de recuperação do cenário.');
      customer = await dependencies.saveCustomer(customerDraft);
    }
    auditCustomer(customerDraft, customer);
    if (current.claimed)
      current = await setProgress(
        current,
        { customerState: 'audited', phase: 'customer' },
        dependencies
      );

    const currentOrder = await dependencies.loadOrder(run.orderId);
    if (
      currentOrder &&
      (currentOrder.orderData.is_test !== true ||
        currentOrder.orderData.syntheticFixture?.scenarioKey !== input.scenarioKey)
    ) {
      throw new Error(
        'O ID comercial reservado já pertence a um pedido diferente do cenário sintético.'
      );
    }
    const existingProduct = await dependencies.loadProduct(run.productId);
    if (currentOrder && !existingProduct) {
      throw new Error(
        'O produto do cenário não existe, embora o pedido idempotente já esteja persistido.'
      );
    }
    const existingVariation = existingProduct?.variations.find(
      (variation) => variation.id === run.variationId
    );
    const productDraft = buildSyntheticProduct(
      input.product,
      run.productId,
      run.variationId,
      existingProduct?.code,
      existingProduct
        ? {
            product: existingProduct.stock,
            variation: existingVariation?.stock ?? input.product.openingStock,
          }
        : undefined
    );
    let product = existingProduct;
    let productIsComplete = false;
    if (product) {
      try {
        auditProductIdentity(input.product, productDraft, product, run.variationId);
        productIsComplete = product.variations.some(
          (variation) => variation.id === run.variationId
        );
      } catch {
        productIsComplete = false;
      }
    }
    if (!productIsComplete) {
      if (!current.claimed)
        throw new Error('Não é permitido reparar produto sem lease de recuperação do cenário.');
      const savedId = await dependencies.saveProduct(productDraft);
      if (savedId !== run.productId)
        throw new Error('O serviço de produto retornou um ID diferente do reservado.');
      product = await dependencies.loadProduct(run.productId);
    }
    if (!product) throw new Error('O produto não foi persistido pelo serviço normal do ERP.');
    auditProductIdentity(input.product, productDraft, product, run.variationId);
    if (current.claimed)
      current = await setProgress(
        current,
        { productState: 'audited', phase: 'product' },
        dependencies
      );

    const seller = await dependencies.loadSeller(SELLER_NAME);
    assertSeller(seller);
    if (run.sellerId && run.sellerId !== seller.id)
      throw new Error('O vendedor persistido na fixture diverge do vendedor Matheus Morante.');
    const sellerId = required(seller.id, 'o ID do vendedor real Matheus Morante');
    if (current.claimed)
      current = await setProgress(current, { sellerId, phase: 'seller' }, dependencies);

    const command = buildScenarioCommand(input, customer, product, run.variationId, seller);
    const expectedOrder = buildSyntheticSalesOrder({
      ...command,
      syntheticFixture: { scenarioKey: input.scenarioKey, version: SCENARIO_VERSION },
    });
    const preOrderStock = currentOrder
      ? input.product.openingStock - input.order.quantity
      : input.product.openingStock;
    const storedVariation = product.variations.find(
      (variation) => variation.id === run.variationId
    );
    if (
      !storedVariation ||
      storedVariation.stock !== preOrderStock ||
      product.stock !== preOrderStock
    ) {
      throw new Error('O saldo do estoque não corresponde ao estágio idempotente do cenário.');
    }

    const created = await createSyntheticSalesOrder(
      input.scenarioKey,
      {
        ...command,
        syntheticFixture: { scenarioKey: input.scenarioKey, version: SCENARIO_VERSION },
      },
      run.orderId,
      { createOrder: dependencies.saveOrder, loadSnapshot: dependencies.loadOrder }
    );
    if (current.claimed)
      current = await setProgress(current, { orderState: 'created', phase: 'audit' }, dependencies);
    const audit = await auditOrderEffects(input, run, expectedOrder, dependencies);
    if (current.claimed) {
      current = await setProgress(
        current,
        {
          status: 'complete',
          phase: 'complete',
          customerState: 'audited',
          productState: 'audited',
          orderState: 'audited',
          sellerId,
          auditSummary: audit,
          lastErrorCode: null,
          releaseLease: true,
        },
        dependencies
      );
    }
    return {
      status: 'complete',
      scenarioKey: input.scenarioKey,
      customerId: run.customerId,
      productId: run.productId,
      variationId: run.variationId,
      sellerId,
      orderId: created.id,
      order: created.order,
      audit,
    };
  } catch (error) {
    if (current.claimed && current.leaseToken) {
      try {
        await setProgress(
          current,
          { status: 'failed', lastErrorCode: 'SCENARIO_EXECUTION_FAILED', releaseLease: true },
          dependencies
        );
      } catch {
        // If the registry is unavailable, its lease expiry still permits a safe retry.
      }
    }
    throw error;
  }
}

export async function createSyntheticSalesScenarioBatch(
  inputs: SyntheticSalesScenarioInput[],
  dependencies: SyntheticSalesScenarioDependencies = defaultDependencies
): Promise<{ status: 'complete'; scenarios: SyntheticSalesScenarioResult[] }> {
  if (inputs.length === 0) throw new Error('O lote precisa conter ao menos um cenário.');
  const keys = inputs.map((item) => item.scenarioKey);
  if (new Set(keys).size !== keys.length) throw new Error('O lote contém scenarioKeys duplicadas.');
  const scenarios: SyntheticSalesScenarioResult[] = [];
  for (const input of inputs)
    scenarios.push(await createSyntheticSalesScenario(input, dependencies));
  return { status: 'complete', scenarios };
}

export async function prepareSyntheticScenarioCleanup(
  scenarioKey: string,
  dependencies: SyntheticSalesScenarioDependencies = defaultDependencies
): Promise<Record<string, unknown>> {
  validateScenarioKey(scenarioKey);
  const scenario = await dependencies.loadScenarioByKey(scenarioKey);
  if (!scenario)
    throw new Error('O cenário não está registrado; limpeza por heurística não é permitida.');
  const [order, productionDocs] = await Promise.all([
    dependencies.loadOrder(scenario.orderId),
    dependencies.loadProductionFiscalDocuments(scenario.orderId),
  ]);
  return {
    scenarioKey,
    customerId: scenario.customerId,
    productId: scenario.productId,
    variationId: scenario.variationId,
    orderId: scenario.orderId,
    orderStatus: order?.status || null,
    orderIsTest: order?.orderData.is_test === true,
    fiscalProductionDocuments: productionDocs,
    mayDeleteFiscalHistory: false,
    requiredCleanupFlow:
      'Use cancelamento/devolução comercial normal; preserve documentos fiscais, XML, chave, protocolo e linhagem.',
  };
}
