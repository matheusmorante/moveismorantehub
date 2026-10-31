import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

// Product persistence is real; do not call the external Meta Catalog for fixtures.
vi.mock('@/pages/utils/productService/productMetaCatalogSync', () => ({
  triggerProductMetaCatalogSync: () => undefined,
}));

import { supabase } from '@/pages/utils/supabaseConfig';
import { savePerson } from '@/pages/utils/personService/personMutationService';
import { saveProduct } from '@/pages/utils/productService/productMutationService';
import { executeSaveOrder } from '@/pages/utils/orderMutation/orderCreationService';
import { validateProductFormSubmission } from '@/pages/App/Products/hooks/form/productFormValidation';
import { bindTestArtifactContext } from '../../../shared-utils/testArtifactContext';
import { createPersonFormSchema } from '../../../shared-utils/personDomainValidation';
import { orderFormSchema } from '../../../shared-utils/orderDomainValidation';

const enabled = ['dry', 'provision'].includes(process.env.SALE_STOCK_OWNED_PHASE || '');
const manifestPath = resolve(process.cwd(), '../tmp/sale-stock-owned-fixture.json');

describe.skipIf(!enabled)('preparação autorizada de uma venda de teste própria', () => {
  it('valida os formulários e cria somente os cadastros autorizados', async () => {
    if (existsSync(manifestPath)) throw new Error('Já existe um manifesto desta prova; não criar outra massa.');
    const email = process.env.NFE_HML_TEST_OPERATOR_EMAIL;
    const password = process.env.NFE_HML_TEST_OPERATOR_PASSWORD;
    if (!email || !password) throw new Error('Credenciais do operador indisponíveis.');
    const login = await supabase.auth.signInWithPassword({ email, password });
    if (login.error || !login.data.user) throw new Error('Falha no login do operador.');
    const admin = await supabase.rpc('is_administrator');
    if (admin.error || admin.data !== true) throw new Error('Operador não é administrador.');

    const runId = crypto.randomUUID();
    const ownerId = login.data.user.id;
    const identity = { runId, ownerId, scenarioKey: 'sale-stock-adjustment' };
    bindTestArtifactContext(identity);
    const customerId = crypto.randomUUID();
    const orderId = crypto.randomUUID();
    const products = [0, 1].map((i) => ({ id: crypto.randomUUID(), variationId: crypto.randomUUID(), i }));

    const category = await supabase.from('categories').select('id').limit(1).single();
    if (category.error || !category.data?.id) throw new Error('Nenhuma categoria disponível para os produtos de teste.');
    const customer: any = {
      id: customerId, fullName: `Cliente de teste ${runId.slice(0, 8)}`, personType: 'PF',
      noPhone: true, noAddress: true, active: true, marketingOrigin: 'organic',
    };
    createPersonFormSchema('customers').parse(customer);
    const productForms: any[] = products.map(({ id, variationId, i }) => {
      const name = `Produto de teste estoque ${runId.slice(0, 8)} ${i + 1}`;
      return {
        id, name, description: name, code: `T${runId.replaceAll('-', '').slice(0, 10)}${i}`,
        itemType: 'product', productKind: 'normal', merchandiseOrigin: 'own_production',
        fiscal: { ncm: '94036000', merchandiseOrigin: 'own_production' },
        categoryIds: [category.data.id], unit: 'UN', active: true, isDraft: false,
        costPrice: 10, unitPrice: 20, stock: 20, status: 'hidden', hasVariations: false,
        variations: [{ id: variationId, name, sku: `T${runId.replaceAll('-', '').slice(0, 10)}${i}-01`,
          stock: 20, unitPrice: 20, costPrice: 10, active: true, status: 'hidden', attributes: [] }],
      };
    });
    for (const product of productForms) {
      const validated = validateProductFormSubmission(product, { isStockistOnly: false, saveAsDraft: false });
      if (Object.keys(validated.errors).length) throw new Error(`Produto de teste inválido: ${validated.errorMessage}`);
    }
    const item = { orderItemId: crypto.randomUUID(), productId: products[0].id,
      variationId: products[0].variationId, description: productForms[0].name,
      itemType: 'product', condition: 'novo', handlingType: 'Na caixa',
      quantity: 2, unitPrice: 20, unitDiscount: 0, discountType: 'fixed' };
    const order: any = {
      orderType: 'sale', status: 'scheduled', date: new Date().toISOString(), seller: 'Teste de estoque',
      is_test: true, customerData: { id: customerId, fullName: customer.fullName, noPhone: true, noAddress: true },
      shipping: { deliveryMethod: 'pickup', noAddress: true, value: 0,
        scheduling: { date: '2099-12-30', type: 'fixed', time: '12:00' } },
      items: [item], payments: [{ method: 'PIX', amount: 40, fee: 0, feeType: 'fixed', status: 'PENDENTE' }],
      paymentsSummary: { totalOrderValue: 40 },
    };
    const validOrder = orderFormSchema.parse(order);

    if (process.env.SALE_STOCK_OWNED_PHASE === 'dry') {
      await supabase.auth.signOut();
      return;
    }

    // No secrets or sessions are recorded; planned IDs allow auditing partial failures.
    const manifest = { ...identity, customerId, orderId, products, itemId: item.orderItemId, phase: 'planned' };
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), { flag: 'wx' });
    const assertOwned = async (table: string, id: string) => {
      const record = await supabase.from(table).select('*').eq('id', id).single();
      if (record.error || !record.data) throw new Error(`Artefato ${table} não encontrado após gravação.`);
      const artifact = await supabase.rpc('test_artifact_row_data', { p_table: table, p_row: record.data });
      if (artifact.error || artifact.data?.is_test !== true || artifact.data?.runId !== runId || artifact.data?.ownerId !== ownerId) {
        throw new Error(`A propriedade do artefato ${table} não foi comprovada.`);
      }
      return record.data;
    };
    await savePerson('customers', customer, { insertOnly: true, isTestArtifact: true });
    await assertOwned('people', customerId);
    for (const [index, product] of productForms.entries()) {
      await saveProduct(product, true, { isTestArtifact: true, preserveVariationIds: true });
      await assertOwned('products', products[index].id);
      const variation = await assertOwned('product_variations', products[index].variationId);
      expect(variation.product_id).toBe(products[index].id);
    }
    const savedId = await executeSaveOrder(validOrder as any, async () => { throw new Error('Criação não deve editar pedido.'); }, { idempotencyKey: orderId });
    expect(savedId).toBe(orderId);
    const savedOrder = await assertOwned('orders', orderId);
    expect(savedOrder.customer_id).toBe(customerId);
    expect(savedOrder.items[0].productId).toBe(products[0].id);
    const moves = await supabase.from('inventory_moves').select('*').eq('order_id', orderId);
    if (moves.error || !moves.data?.length) throw new Error('A saída inicial da venda não foi encontrada.');
    for (const move of moves.data) {
      expect(move.product_id).toBe(products[0].id);
      expect(move.variation_id).toBe(products[0].variationId);
      await assertOwned('inventory_moves', move.id);
    }
    writeFileSync(manifestPath, JSON.stringify({ ...manifest, phase: 'created' }, null, 2));
    await supabase.auth.signOut();
  });
});
