'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const { loadPersistedFiscalOrder } = require('./fiscal-persisted-artifact.cjs');

const projectRoot = path.resolve(__dirname, '../..');
const erpEnvPath = path.join(projectRoot, 'erp/.env.local');
if (fs.existsSync(erpEnvPath)) {
  const env = dotenv.parse(fs.readFileSync(erpEnvPath));
  for (const [k, v] of Object.entries(env)) {
    if (!process.env[k]) process.env[k] = v;
  }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const operatorEmail = (process.env.NFE_HML_TEST_OPERATOR_EMAIL || '').trim().toLowerCase();
const operatorPassword = process.env.NFE_HML_TEST_OPERATOR_PASSWORD;

if (!supabaseUrl || !serviceKey || !operatorEmail || !operatorPassword) {
  console.error('Missing required environment variables for provisioning.');
  process.exit(1);
}

let supabase;

function calculateCpfCheckDigits(clean9) {
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number.parseInt(clean9[i], 10) * (10 - i);
  let rest = (sum * 10) % 11;
  const dv1 = rest === 10 || rest === 11 ? 0 : rest;
  sum = 0;
  for (let i = 0; i < 9; i++) sum += Number.parseInt(clean9[i], 10) * (11 - i);
  sum += dv1 * 2;
  rest = (sum * 10) % 11;
  const dv2 = rest === 10 || rest === 11 ? 0 : rest;
  return `${dv1}${dv2}`;
}

function makeValidCpf(seedNumber) {
  const base = String(100000000 + seedNumber).padStart(9, '0').slice(0, 9);
  return base + calculateCpfCheckDigits(base);
}

function makeValidCnpj(seedNumber) {
  const base12 = String(100000000000 + seedNumber).padStart(12, '0').slice(0, 12);
  const p1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let s1 = 0;
  for (let i = 0; i < 12; i++) s1 += parseInt(base12[i], 10) * p1[i];
  let r1 = s1 % 11;
  let d1 = r1 < 2 ? 0 : 11 - r1;

  const p2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const b13 = base12 + d1;
  let s2 = 0;
  for (let i = 0; i < 13; i++) s2 += parseInt(b13[i], 10) * p2[i];
  let r2 = s2 % 11;
  let d2 = r2 < 2 ? 0 : 11 - r2;
  return base12 + d1 + d2;
}

function calcPrIe(base8) {
  const p1 = [3, 2, 7, 6, 5, 4, 3, 2];
  let s1 = 0;
  for (let i = 0; i < 8; i++) s1 += parseInt(base8[i], 10) * p1[i];
  let r1 = s1 % 11;
  let d1 = 11 - r1;
  if (r1 === 0 || r1 === 1) d1 = 0;

  const p2 = [4, 3, 2, 7, 6, 5, 4, 3, 2];
  const b9 = base8 + d1;
  let s2 = 0;
  for (let i = 0; i < 9; i++) s2 += parseInt(b9[i], 10) * p2[i];
  let r2 = s2 % 11;
  let d2 = 11 - r2;
  if (r2 === 0 || r2 === 1) d2 = 0;
  return base8 + d1 + d2;
}

async function main() {
  const runId = process.argv[2] || crypto.randomUUID();
  const ownerId = 'eccde09e-72d8-4efe-a387-eb34114dea39';
  const shortRun = runId.slice(0, 8);
  console.log(`\n=== Provisioning Fiscal Test Matrix for Run ${runId} (${shortRun}) ===\n`);

  const operatorClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY);
  const { data: authData, error: authErr } = await operatorClient.auth.signInWithPassword({
    email: operatorEmail,
    password: operatorPassword,
  });
  if (authErr || !authData?.session) {
    throw new Error(`Operator sign in failed: ${authErr?.message}`);
  }
  supabase = operatorClient;
  console.log(`✔ Authenticated as operator ${operatorEmail} (${ownerId})`);

  const scenarios = [
    {
      key: 'nfce65_pickup',
      title: `Morantehub Hml NFC-e 65 Retirada ${shortRun}`,
      personType: 'PF',
      ieIndicator: '9',
      deliveryMethod: 'pickup',
      freightMode: '9',
      finalConsumer: true,
      acquisitionPurpose: 'use_consumption',
      expectedModel: '65',
      seed: 110,
    },
    {
      key: 'nfce65_delivery',
      title: `Morantehub Hml NFC-e 65 Entrega ${shortRun}`,
      personType: 'PF',
      ieIndicator: '9',
      deliveryMethod: 'delivery',
      freightMode: '0',
      finalConsumer: true,
      acquisitionPurpose: 'use_consumption',
      expectedModel: '65',
      seed: 220,
    },
    {
      key: 'nfe55_sale',
      title: `Morantehub Hml NF-e 55 Venda ${shortRun}`,
      personType: 'PF',
      ieIndicator: '9',
      deliveryMethod: 'pickup',
      freightMode: '4',
      finalConsumer: true,
      acquisitionPurpose: 'use_consumption',
      otherFiscalRequirement: true,
      expectedModel: '55',
      seed: 330,
    },
    {
      key: 'nfe55_delivery_own_transport',
      title: `Morantehub Hml NF-e 55 Proprio ${shortRun}`,
      personType: 'PF',
      ieIndicator: '9',
      deliveryMethod: 'delivery',
      freightMode: '3',
      finalConsumer: true,
      acquisitionPurpose: 'use_consumption',
      otherFiscalRequirement: true,
      expectedModel: '55',
      seed: 440,
    },
  ];

  const results = {};

  for (const s of scenarios) {
    const customerId = crypto.randomUUID();
    const productId = crypto.randomUUID();
    const variationId = crypto.randomUUID();
    const orderId = crypto.randomUUID();
    const orderItemId = crypto.randomUUID();
    const orderNumber = 'T-' + orderId.slice(0, 8);
    const isPj = s.personType === 'PJ';
    const documentNumber = isPj ? makeValidCnpj(s.seed) : makeValidCpf(s.seed);
    const ie = isPj && s.ieIndicator === '1' ? calcPrIe(String(10000000 + s.seed).padStart(8, '0').slice(0, 8)) : null;
    const sku = `SKU-${shortRun}-${s.seed}`;
    const productCode = `COD-${shortRun}-${s.seed}`;
    const metadata = {
      is_test: true,
      runId,
      ownerId,
      scenarioKey: s.key,
    };

    const address = {
      cep: '83410270',
      street: 'Rua Cascavel',
      number: '306',
      neighborhood: 'Guaraituba',
      city: 'Colombo',
      state: 'PR',
      mapsUrl: '',
      noAddress: s.deliveryMethod === 'pickup',
      testArtifact: { ...metadata },
      role: 'customer',
      roles: ['customer'],
    };

    // 1. Create Person
    const { error: personErr } = await supabase.from('people').insert({
      id: customerId,
      person_type: 'customers',
      person_type_pf_pj: isPj ? 'PJ' : 'PF',
      full_name: s.title,
      cpf_cnpj: documentNumber,
      rg_ie: ie,
      ie_indicator: s.ieIndicator || '9',
      active: true,
      deleted: false,
      full_address: address,
      address: JSON.stringify(address),
    });
    if (personErr) throw new Error(`Person insert failed for ${s.key}: ${personErr.message}`);

    // 2. Create Product & Variation
    const { error: prodErr } = await supabase.from('products').insert({
      id: productId,
      name: `Armário de Madeira Hml ${s.key} ${shortRun}`,
      slug: `armario-madeira-hml-${s.key.replace(/_/g, '-')}-${shortRun}`,
      price: 100,
      unit_price: 100,
      cost_price: 0,
      active: true,
      deleted: false,
      item_type: 'product',
      code: productCode,
      fiscal: {
        cst: '102',
        ncm: '94036000',
        cest: '',
        cfop: '5101',
        icmsPercent: 0,
        ncmDescription: '- Outros móveis de madeira',
        merchandiseOrigin: 'own_production',
      },
      technical_specs: {
        testArtifact: { ...metadata },
        variationDetails: [{
          id: variationId,
          sku: sku,
          name: `Produto Fiscal Hml ${s.key} ${shortRun}`,
          fiscal: {
            cst: '102',
            ncm: '94036000',
            cest: '',
            cfop: '5101',
            icmsPercent: 0,
            ncmDescription: '- Outros móveis de madeira',
            merchandiseOrigin: 'own_production',
          },
        }],
      },
      combo_items: [],
    });
    if (prodErr) throw new Error(`Product insert failed for ${s.key}: ${prodErr.message}`);

    const { error: varErr } = await supabase.from('product_variations').insert({
      id: variationId,
      product_id: productId,
      name: `Variação ${s.title}`,
      sku: sku,
      price: 100,
      stock: 10,
      active: true,
      status: 'active',
    });
    if (varErr) throw new Error(`Variation insert failed for ${s.key}: ${varErr.message}`);

    // 3. Create Order
    const orderData = {
      id: orderId,
      date: new Date().toISOString(),
      status: 'scheduled',
      deleted: false,
      is_test: true,
      orderType: 'sale',
      seller: 'TEST_AUT_NFE_HML_OPERATOR',
      sellerId: ownerId,
      customerData: {
        id: customerId,
        fullName: s.title,
        personType: isPj ? 'PJ' : 'PF',
        cpfCnpj: documentNumber,
        document: documentNumber,
        rgIe: ie,
        ie: ie,
        ieIndicator: s.ieIndicator || '9',
        fullAddress: address,
      },
      shipping: {
        value: 0,
        deliveryMethod: s.deliveryMethod,
        freightMode: s.freightMode,
        noAddress: s.deliveryMethod === 'pickup',
        useCustomerAddress: s.deliveryMethod === 'delivery',
        deliveryAddress: s.deliveryMethod === 'delivery' ? address : null,
      },
      fiscalContext: {
        finalConsumer: s.finalConsumer,
        acquisitionPurpose: s.acquisitionPurpose,
        recipientIeIndicator: s.ieIndicator || '9',
        ...(s.otherFiscalRequirement ? { otherFiscalRequirement: true } : {}),
        ...(s.freightMode === '3' ? { deliveryByIssuer: true } : {}),
      },
      items: [{
        orderItemId,
        productId,
        variationId,
        code: sku,
        description: `Armário de Madeira Hml ${s.key} ${shortRun}`,
        quantity: 1,
        unitPrice: 100,
        unitDiscount: 0,
        discountType: 'fixed',
        isTemporaryProduct: false,
        condition: 'novo',
        fiscal: {
          ncm: '94036000',
          cfop: '5101',
          cst: '102',
          origem: '0',
          cest: '',
          merchandiseOrigin: 'own_production',
        },
      }],
      itemsSummary: {
        itemsSubtotal: 100,
        totalQuantity: 1,
        itemsTotalValue: 100,
        totalFixedDiscount: 0,
      },
      payments: [{
        method: 'Pix',
        amount: 100,
        status: 'PAGO',
        paidAt: new Date().toISOString(),
        dueDate: '2026-11-30',
        fee: 0,
        feeType: 'fixed',
      }],
      paymentsSummary: {
        totalOrderValue: 100,
        amountRemaining: 0,
        totalAmountPaid: 100,
      },
      testArtifact: { ...metadata },
    };

    const { error: orderErr } = await supabase.from('orders').insert({
      id: orderId,
      order_number: orderNumber,
      order_type: 'sale',
      status: 'scheduled',
      deleted: false,
      customer_id: customerId,
      delivery_method: s.deliveryMethod,
      total_amount: 100,
      order_data: orderData,
      items: orderData.items,
    });
    if (orderErr) throw new Error(`Order insert failed for ${s.key}: ${orderErr.message}`);

    // 4. Verify via loadPersistedFiscalOrder
    const verified = await loadPersistedFiscalOrder(supabase, {
      orderId,
      runId,
      scenarioKey: s.key,
      expectedEmail: operatorEmail,
    });

    results[s.key] = {
      orderId,
      runId,
      scenarioKey: s.key,
      customerName: s.title,
      expectedModel: s.expectedModel,
      deliveryMethod: verified.deliveryMethod,
    };
    console.log(`✔ Scenario [${s.key}] successfully provisioned and verified! (OrderID: ${orderId})`);
  }

  console.log('\n=== Summary of Provisioned Test Scenarios ===');
  console.log(JSON.stringify(results, null, 2));

  fs.writeFileSync(
    path.join(__dirname, 'last-provisioned-run.json'),
    JSON.stringify({ runId, scenarios: results }, null, 2)
  );
}

main().catch((err) => {
  console.error('Provisioning error:', err);
  process.exit(1);
});
