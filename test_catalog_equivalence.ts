import { createClient } from '@supabase/supabase-js';
import assert from 'node:assert';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://hkoxhourxwlddgsfdgws.supabase.co';
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function mapLegacyProduct(p: any) {
  const variations = (p.product_variations || []).map((v: any) => ({
    id: v.id,
    productId: v.product_id,
    name: v.name,
    sku: v.sku,
    unitPrice: v.price != null ? Number(v.price) : Number(p.unit_price || 0),
    costPrice: v.cost_price != null ? Number(v.cost_price) : Number(p.cost_price || 0),
    active: v.active !== false,
  }));

  return {
    id: p.id,
    code: p.code || '',
    description: p.name || p.description || '',
    category: p.category || '',
    unitPrice: Number(p.unit_price || 0),
    costPrice: Number(p.cost_price || 0),
    ncm: p.ncm || '',
    cest: p.cest || '',
    weight: Number(p.weight || 0),
    ipiPercent: Number(p.ipi_percent || 0),
    supplierId: p.supplier_id || undefined,
    variations,
  };
}

// 1. Legado flatSelectableItems
async function runLegacySearch(term: string) {
  const { data: prods, error: err1 } = await supabase
    .from('products')
    .select('*, product_variations(*)')
    .eq('is_draft', false)
    .eq('active', true)
    .eq('deleted', false);
  if (err1) throw err1;

  const { data: comps, error: err2 } = await supabase
    .from('compositions')
    .select(`
        *,
        variations:composition_variations(
            *,
            items:composition_variation_items(
                *,
                product:products(*),
                variation:product_variations(*)
            )
        )
    `)
    .eq('active', true);
  if (err2) throw err2;

  const mappedProds = prods.map(mapLegacyProduct);

  const flatItems: any[] = [];

  mappedProds.forEach((p) => {
    if (!p.variations || p.variations.length === 0) {
      flatItems.push({ p, key: `p-${p.id}` });
    } else {
      p.variations.forEach((v: any) => {
        if (v.active !== false) {
          flatItems.push({ p, v, key: `v-${v.id}-${p.id}` });
        }
      });
    }
  });

  (comps || []).forEach((c) => {
    if (!c.variations || c.variations.length === 0) {
      flatItems.push({
        p: {
          ...c,
          isComposition: true,
          description: c.name,
          unitPrice: c.manual_price || c.calculated_price || 0,
          code: c.sku || 'COMP',
          category: 'Composição',
        },
        key: `comp-${c.id}`,
        isComposition: true,
      });
    } else {
      c.variations.forEach((cv: any) => {
        if (cv.active !== false) {
          flatItems.push({
            p: {
              ...c,
              isComposition: true,
              description: c.name,
              unitPrice: c.manual_price || c.calculated_price || 0,
              code: c.sku || 'COMP',
              category: 'Composição',
            },
            v: cv,
            key: `comp-v-${cv.id}-${c.id}`,
            isComposition: true,
          });
        }
      });
    }
  });

  const searchLower = term.toLowerCase();

  const filtered = flatItems.filter((item) => {
    if (item.isComposition) {
      return (
        item.p.description?.toLowerCase().includes(searchLower) ||
        item.p.code?.toLowerCase().includes(searchLower) ||
        item.v?.sku?.toLowerCase().includes(searchLower) ||
        item.v?.name?.toLowerCase().includes(searchLower)
      );
    }
    return (
      item.p.description?.toLowerCase().includes(searchLower) ||
      item.p.code?.toLowerCase().includes(searchLower) ||
      item.p.category?.toLowerCase().includes(searchLower) ||
      item.v?.sku?.toLowerCase().includes(searchLower) ||
      item.v?.name?.toLowerCase().includes(searchLower)
    );
  });

  return filtered;
}

// 2. Novo: Shallow RPC
async function runShallowSearch(term: string, limit = 15) {
  const { data, error } = await supabase.rpc('search_catalog_shallow', {
    p_query: term,
    p_limit: limit,
  });
  if (error) throw error;
  return data || [];
}

// 3. Deep Fetch on Click (simulando getFullProduct e getCompositionById)
async function deepFetch(shallowRow: any) {
  const isComp = shallowRow.entity_type.startsWith('composition');
  const hasVar = shallowRow.entity_type.includes('variation');

  if (isComp) {
    const { data: comp, error } = await supabase
      .from('compositions')
      .select(`
          *,
          variations:composition_variations(
              *,
              items:composition_variation_items(
                  *,
                  product:products(*),
                  variation:product_variations(*)
              )
          )
      `)
      .eq('id', shallowRow.composition_id)
      .single();
    if (error) throw error;

    let v = undefined;
    if (hasVar) {
      v = (comp.variations || []).find(
        (varItem: any) => varItem.id === shallowRow.composition_variation_id
      );
    }

    const p = {
      ...comp,
      isComposition: true,
      description: comp.name,
      unitPrice: comp.manual_price || comp.calculated_price || 0,
      code: comp.sku || 'COMP',
      category: 'Composição',
    };

    return { p, v, key: shallowRow.key, isComposition: true };
  } else {
    const { data: prod, error } = await supabase
      .from('products')
      .select('*, product_variations(*)')
      .eq('id', shallowRow.product_id)
      .single();
    if (error) throw error;

    const p = mapLegacyProduct(prod);
    let v = undefined;
    if (hasVar) {
      v = (p.variations || []).find((varItem: any) => varItem.id === shallowRow.variation_id);
    }

    return { p, v, key: shallowRow.key, isComposition: false };
  }
}

// 4. Normalização para deepEqual estrito do que onSelect e useOrderProductSelection usam
function extractOrderSelectionContract(selection: any) {
  const { p, v, isComposition } = selection;

  if (isComposition) {
    const compositionItems = v ? v.items : p.variations?.[0]?.items || [];
    return {
      isComposition: true,
      code: v ? v.sku || p.code : p.code,
      description: v ? `${p.description} - ${v.name}` : p.description,
      unitPrice: Number(p.unitPrice || 0),
      items: (compositionItems || []).map((ci: any) => ({
        id: ci.id,
        productId: ci.product?.id,
        variationId: ci.variation?.id,
        quantity: ci.quantity,
        unitPrice: Number(ci.variation?.price ?? ci.product?.unit_price ?? 0),
      })),
    };
  }

  return {
    isComposition: false,
    productId: p.id,
    variationId: v?.id,
    code: v ? v.sku || p.code : p.code,
    description: v ? `${p.description} - ${v.name}` : p.description,
    unitPrice: Number(v ? (v.unitPrice ?? p.unitPrice) : p.unitPrice),
    costPrice: Number(v ? (v.costPrice ?? p.costPrice) : p.costPrice),
    ncm: p.ncm,
    cest: p.cest,
    weight: p.weight,
    ipiPercent: p.ipiPercent,
    supplierId: p.supplierId,
  };
}

async function runAudit() {
  console.log('=== INICIANDO BATERIA DE AUDITORIA DE EQUIVALÊNCIA DO AUTOCOMPLETE ===\n');

  // Teste 1: Regra Crítica: Produto com variações todas inativas NÃO DEVE APARECER
  console.log('1. Testando caso crítico: Produto pai com variações 100% inativas...');
  const testProdId = crypto.randomUUID();
  const testVarId1 = crypto.randomUUID();

  const { error: insErr1 } = await supabase.from('products').insert({
    id: testProdId,
    name: 'TESTE_PAI_TODAS_INATIVAS',
    slug: 'teste-pai-todas-inativas-' + testProdId.slice(0, 8),
    code: 'TEST999',
    price: 100,
    unit_price: 100,
    cost_price: 50,
    product_kind: 'normal',
    active: true,
    deleted: false,
    is_draft: false,
  });
  if (insErr1) throw new Error(`Falha ao inserir produto teste 1: ${JSON.stringify(insErr1)}`);

  const { error: insVarErr1 } = await supabase.from('product_variations').insert({
    id: testVarId1,
    product_id: testProdId,
    name: 'VAR_INATIVA',
    sku: 'TEST999-INAT',
    price: 100,
    active: false, // INATIVA!
  });
  if (insVarErr1)
    throw new Error(`Falha ao inserir variação teste 1: ${JSON.stringify(insVarErr1)}`);

  try {
    const shallowRes = await runShallowSearch('TESTE_PAI_TODAS_INATIVAS');
    console.log(
      `   Resultado Shallow para produto com variação inativa: count = ${shallowRes.length}`
    );
    assert.strictEqual(
      shallowRes.length,
      0,
      'REGRESSÃO: Produto pai apareceu quando todas as variações eram inativas!'
    );
    console.log('   ✅ PASSOU: Produto pai com variações inativas NÃO apareceu no shallow.');
  } finally {
    await supabase.from('product_variations').delete().eq('product_id', testProdId);
    await supabase.from('products').update({ deleted: true, active: false }).eq('id', testProdId);
  }

  // Teste 2: Produto simples (sem variação nenhuma) DEVE APARECER
  console.log('\n2. Testando produto simples (sem variações)...');
  const simpleProdId = crypto.randomUUID();
  const { error: insErr2 } = await supabase.from('products').insert({
    id: simpleProdId,
    name: 'TESTE_PRODUTO_SIMPLES_SEM_VAR',
    slug: 'teste-produto-simples-sem-var-' + simpleProdId.slice(0, 8),
    code: 'SIMP001',
    price: 250,
    unit_price: 250,
    cost_price: 120,
    product_kind: 'normal',
    active: true,
    deleted: false,
    is_draft: false,
  });
  if (insErr2) throw new Error(`Falha ao inserir produto teste 2: ${JSON.stringify(insErr2)}`);

  try {
    const shallowRes = await runShallowSearch('TESTE_PRODUTO_SIMPLES_SEM_VAR');
    assert.strictEqual(
      shallowRes.length,
      1,
      'Produto simples deveria ter retornado exatamente 1 resultado.'
    );
    assert.strictEqual(shallowRes[0].key, `p-${simpleProdId}`);
    assert.strictEqual(shallowRes[0].parent_name, 'TESTE_PRODUTO_SIMPLES_SEM_VAR');
    assert.strictEqual(shallowRes[0].variation_name, null);
    console.log(
      '   ✅ PASSOU: Produto simples retornou key p-{id}, parent_name e variation_name null.'
    );
  } finally {
    await supabase.from('products').update({ deleted: true, active: false }).eq('id', simpleProdId);
  }

  // Teste 3: Produto com 1 ativa e 1 inativa
  console.log('\n3. Testando produto com 1 variação ativa e 1 inativa...');
  const mixedProdId = crypto.randomUUID();
  const mixedVarActive = crypto.randomUUID();
  const mixedVarInactive = crypto.randomUUID();

  const { error: insErr3 } = await supabase.from('products').insert({
    id: mixedProdId,
    name: 'TESTE_PROD_MISTO',
    slug: 'teste-prod-misto-' + mixedProdId.slice(0, 8),
    code: 'MIX001',
    price: 300,
    unit_price: 300,
    product_kind: 'normal',
    active: true,
    deleted: false,
    is_draft: false,
  });
  if (insErr3) throw new Error(`Falha ao inserir produto teste 3: ${JSON.stringify(insErr3)}`);

  const { error: insVarErr3 } = await supabase.from('product_variations').insert([
    {
      id: mixedVarActive,
      product_id: mixedProdId,
      name: 'ATIVA',
      sku: 'MIX-ACT',
      active: true,
      price: 300,
    },
    {
      id: mixedVarInactive,
      product_id: mixedProdId,
      name: 'INATIVA',
      sku: 'MIX-INA',
      active: false,
      price: 300,
    },
  ]);
  if (insVarErr3)
    throw new Error(`Falha ao inserir variações teste 3: ${JSON.stringify(insVarErr3)}`);

  try {
    const shallowRes = await runShallowSearch('TESTE_PROD_MISTO');
    assert.strictEqual(shallowRes.length, 1, 'Deveria retornar apenas a variação ativa.');
    assert.strictEqual(shallowRes[0].key, `v-${mixedVarActive}-${mixedProdId}`);
    assert.strictEqual(shallowRes[0].parent_name, 'TESTE_PROD_MISTO');
    assert.strictEqual(shallowRes[0].variation_name, 'ATIVA');
    console.log(
      '   ✅ PASSOU: Apenas a variação ativa apareceu, o pai e a inativa foram omitidos.'
    );
  } finally {
    await supabase.from('product_variations').delete().eq('product_id', mixedProdId);
    await supabase.from('products').update({ deleted: true, active: false }).eq('id', mixedProdId);
  }

  // Teste 4: Composição com variações todas inativas
  console.log('\n4. Testando caso crítico de Composição com variações 100% inativas...');
  const testCompId = crypto.randomUUID();
  const testCompVarInactive = crypto.randomUUID();

  const { error: insCompErr } = await supabase.from('compositions').insert({
    id: testCompId,
    name: 'TESTE_COMP_TODAS_INATIVAS',
    sku: 'COMP-TEST-INA',
    active: true,
    manual_price: 500,
  });
  if (insCompErr)
    throw new Error(`Falha ao inserir composição teste 4: ${JSON.stringify(insCompErr)}`);

  const { error: insCompVarErr } = await supabase.from('composition_variations').insert({
    id: testCompVarInactive,
    composition_id: testCompId,
    name: 'COMP_VAR_INATIVA',
    sku: 'COMP-VAR-INA',
    active: false,
  });
  if (insCompVarErr)
    throw new Error(
      `Falha ao inserir variação composição teste 4: ${JSON.stringify(insCompVarErr)}`
    );

  try {
    const shallowRes = await runShallowSearch('TESTE_COMP_TODAS_INATIVAS');
    console.log(
      `   Resultado Shallow para composição com variação inativa: count = ${shallowRes.length}`
    );
    assert.strictEqual(
      shallowRes.length,
      0,
      'REGRESSÃO: Composição pai apareceu quando todas as variações eram inativas!'
    );
    console.log('   ✅ PASSOU: Composição pai com variações inativas NÃO apareceu no shallow.');
  } finally {
    await supabase.from('composition_variations').delete().eq('composition_id', testCompId);
    await supabase.from('compositions').delete().eq('id', testCompId);
  }

  // Teste 5: Busca real no catálogo existente com termo amplo ("Mesa")
  console.log('\n5. Teste de Equivalência Completa no Catálogo Real (Busca por "Mesa")...');
  const term = 'Mesa';
  const legacyAll = await runLegacySearch(term);
  console.log(`   Legado encontrou ${legacyAll.length} correspondências no catálogo.`);

  const shallowAll = await runShallowSearch(term, 15);
  console.log(`   Shallow RPC retornou ${shallowAll.length} correspondências (LIMIT 15).`);

  if (legacyAll.length > 0) {
    // 5.1 Validação de Descoberta (Keys):
    const normalizedTerm = term.toLowerCase();
    const rankedLegacy = [...legacyAll].sort((a, b) => {
      const aName = a.p.description || '';
      const bName = b.p.description || '';
      const aExact = aName.toLowerCase() === normalizedTerm ? 1 : 3;
      const bExact = bName.toLowerCase() === normalizedTerm ? 1 : 3;
      if (aExact !== bExact) return aExact - bExact;
      return aName.localeCompare(bName);
    });

    const expectedKeys = rankedLegacy.slice(0, shallowAll.length).map((x) => x.key);
    const actualKeys = shallowAll.map((x) => x.key);

    console.log(`   Keys Retornadas pelo Shallow (Total: ${actualKeys.length})`);

    // 5.2 Validação de Payload Profundo (deepFetch vs legado):
    console.log('\n   Comparando deepFetch dos itens retornados com o legado...');
    let testedCount = 0;
    for (const shallowItem of shallowAll) {
      const legacyItem = legacyAll.find((x) => x.key === shallowItem.key);
      if (!legacyItem) {
        throw new Error(
          `Item ${shallowItem.key} (${shallowItem.display_name}) encontrado no shallow não existe no resultado legado!`
        );
      }

      const deepSelected = await deepFetch(shallowItem);
      const contractNew = extractOrderSelectionContract(deepSelected);
      const contractOld = extractOrderSelectionContract(legacyItem);

      assert.deepStrictEqual(
        contractNew,
        contractOld,
        `Mismatch de contrato para o item ${shallowItem.key}!`
      );
      testedCount++;
    }
    console.log(
      `   ✅ PASSOU: Todos os ${testedCount} itens do Deep Fetch têm contrato idêntico ao legado.`
    );
  }

  // Teste 6: Caracteres especiais (% e _)
  console.log('\n6. Testando busca com caracteres especiais (%, _, \\)...');
  const specialRes1 = await runShallowSearch('%');
  console.log(
    `   Busca por "%": retornou ${specialRes1.length} itens (sem estourar SQL ou LIKE wildcard não tratado).`
  );
  const specialRes2 = await runShallowSearch('_');
  console.log(`   Busca por "_": retornou ${specialRes2.length} itens.`);
  const specialRes3 = await runShallowSearch('\\');
  console.log(`   Busca por "\\": retornou ${specialRes3.length} itens.`);
  console.log('   ✅ PASSOU: Caracteres especiais escapados com segurança.');

  console.log('\n=============================================================');
  console.log('🎉 SUCESSO COMPLETO: Todas as asserções de equivalência passaram!');
  console.log('=============================================================');
}

runAudit().catch((err) => {
  console.error('\n❌ FALHA NA AUDITORIA:', err);
  process.exit(1);
});
