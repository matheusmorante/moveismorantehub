import { buildPostgrestAccentInsensitivePattern } from '../core/searchText';
import {
  AgentVariationInput,
  AgentCreateProductInput,
  AgentUpdateProductInput,
  SanitizedProductVariationForAgent,
  SanitizedProductDetailForAgent,
  normalizeSlugSimple,
  sanitizeRawDbProductForAgent,
} from './agentProductSanitizer';
import {
  type AgentSupabaseClient,
  type AgentSupabaseQueryError,
  getAgentOperationErrorMessage,
  listProductCategoriesAndCharacteristicsForAgent,
  resolveNextSequentialCode,
} from './agentProductMetadataOperations';
import {
  AGENT_PRODUCT_COLUMNS,
  AGENT_PRODUCT_WITH_VARIATIONS_COLUMNS,
  type RawProductRow,
  buildCreatedVariationsPayload,
  insertVariationsForCreatedProduct,
  syncVariationsForUpdatedProduct,
} from './agentProductVariationSync';

export type {
  AgentVariationInput,
  AgentCreateProductInput,
  AgentUpdateProductInput,
  SanitizedProductVariationForAgent,
  SanitizedProductDetailForAgent,
};

export {
  normalizeSlugSimple,
  sanitizeRawDbProductForAgent,
  listProductCategoriesAndCharacteristicsForAgent,
};

function buildCreateProductPayload(
  args: AgentCreateProductInput,
  code: string,
  nome: string,
): { payload: Record<string, unknown>; defaults: { unitPrice: number; promoPrice: number | null; costPrice: number; totalStock: number } } {
  const unitPrice = Number(args.precoVenda ?? 0);
  const promoPrice =
    args.precoPromocional !== undefined && args.precoPromocional !== null
      ? Number(args.precoPromocional)
      : null;
  const costPrice = Number(args.precoCusto ?? 0);
  const totalStock =
    args.estoque !== undefined
      ? Number(args.estoque)
      : Array.isArray(args.variacoes) && args.variacoes.length > 0
        ? args.variacoes.reduce((acc, v) => acc + Number(v.estoque ?? 0), 0)
        : 0;

  const nowIso = new Date().toISOString();
  const isDraft = Boolean(args.rascunho);
  const condition = args.condicao || 'novo';

  return {
    defaults: { unitPrice, promoPrice, costPrice, totalStock },
    payload: {
      code,
      sku: code,
      name: nome,
      marketplace_title: args.titulo?.trim() || nome,
      description: args.descricao?.trim() || '',
      category: args.categoria?.trim() || 'Sem Categoria',
      environment: args.ambiente?.trim() || '',
      brand: args.marca?.trim() || '',
      line: args.linha?.trim() || '',
      condition,
      is_salvado: condition === 'salvado',
      unit_price: unitPrice,
      price: unitPrice,
      promo_price: promoPrice,
      cost_price: costPrice,
      freight_cost: Number(args.custoFrete ?? 0),
      stock: totalStock,
      initial_stock: totalStock,
      min_stock: Number(args.estoqueMinimo ?? 0),
      unit: args.unidade?.trim() || 'UN',
      height: args.alturaCm !== undefined ? String(args.alturaCm) : null,
      width: args.larguraCm !== undefined ? String(args.larguraCm) : null,
      depth: args.profundidadeCm !== undefined ? String(args.profundidadeCm) : null,
      weight: args.pesoKg !== undefined ? Number(args.pesoKg) : null,
      material: args.material?.trim() || '',
      colors: args.cores?.trim() || '',
      main_differential: args.diferencialPrincipal?.trim() || '',
      not_included: args.naoIncluso?.trim() || '',
      active: condition === 'salvado' ? false : args.ativo !== false,
      is_draft: isDraft,
      deleted: false,
      status: isDraft ? 'draft' : 'hidden',
      has_variations: Array.isArray(args.variacoes) && args.variacoes.length > 1,
      item_type: 'product',
      slug: normalizeSlugSimple(`${nome}-${code}`),
      fiscal: {
        ncm: args.ncm?.trim() || '',
        merchandiseOrigin: 'third_party',
      },
      technical_specs: {
        technicalValues: args.caracteristicasTecnicas || {},
      },
      created_at: nowIso,
      updated_at: nowIso,
    },
  };
}

function buildUpdateProductPayload(
  existing: RawProductRow,
  args: AgentUpdateProductInput,
): Record<string, unknown> {
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (args.nome !== undefined) {
    updatePayload.name = args.nome.trim();
    if (args.titulo === undefined) updatePayload.marketplace_title = args.nome.trim();
  }
  if (args.titulo !== undefined) updatePayload.marketplace_title = args.titulo.trim();
  if (args.descricao !== undefined) updatePayload.description = args.descricao.trim();
  if (args.categoria !== undefined) updatePayload.category = args.categoria.trim();
  if (args.ambiente !== undefined) updatePayload.environment = args.ambiente.trim();
  if (args.marca !== undefined) updatePayload.brand = args.marca.trim();
  if (args.linha !== undefined) updatePayload.line = args.linha.trim();
  if (args.condicao !== undefined) {
    updatePayload.condition = args.condicao;
    updatePayload.is_salvado = args.condicao === 'salvado';
  }
  if (args.precoVenda !== undefined) {
    const priceNum = Number(args.precoVenda);
    updatePayload.unit_price = priceNum;
    updatePayload.price = priceNum;
  }
  if (args.precoPromocional !== undefined) {
    updatePayload.promo_price = args.precoPromocional === null ? null : Number(args.precoPromocional);
  }
  if (args.precoCusto !== undefined) updatePayload.cost_price = Number(args.precoCusto);
  if (args.custoFrete !== undefined) updatePayload.freight_cost = Number(args.custoFrete);
  if (args.estoque !== undefined) updatePayload.stock = Number(args.estoque);
  if (args.estoqueMinimo !== undefined) updatePayload.min_stock = Number(args.estoqueMinimo);
  if (args.unidade !== undefined) updatePayload.unit = args.unidade.trim();
  if (args.alturaCm !== undefined) updatePayload.height = String(args.alturaCm);
  if (args.larguraCm !== undefined) updatePayload.width = String(args.larguraCm);
  if (args.profundidadeCm !== undefined) updatePayload.depth = String(args.profundidadeCm);
  if (args.pesoKg !== undefined) updatePayload.weight = Number(args.pesoKg);
  if (args.material !== undefined) updatePayload.material = args.material.trim();
  if (args.cores !== undefined) updatePayload.colors = args.cores.trim();
  if (args.diferencialPrincipal !== undefined) {
    updatePayload.main_differential = args.diferencialPrincipal.trim();
  }
  if (args.naoIncluso !== undefined) updatePayload.not_included = args.naoIncluso.trim();
  if (args.ativo !== undefined) updatePayload.active = Boolean(args.ativo);
  if (args.rascunho !== undefined) updatePayload.is_draft = Boolean(args.rascunho);

  // Regra 14: Lixeira de produtos usa estritamente deleted = true / false
  if (args.moverParaLixeira === true) updatePayload.deleted = true;
  else if (args.restaurarDaLixeira === true) updatePayload.deleted = false;

  if (args.ncm !== undefined) {
    updatePayload.fiscal = { ...(existing.fiscal || {}), ncm: args.ncm.trim() };
  }
  if (args.caracteristicasTecnicas !== undefined) {
    const currentSpecs = existing.technical_specs || {};
    updatePayload.technical_specs = {
      ...currentSpecs,
      technicalValues: {
        ...(currentSpecs.technicalValues || {}),
        ...args.caracteristicasTecnicas,
      },
    };
  }
  return updatePayload;
}

async function findExistingProductForUpdate(
  supabase: AgentSupabaseClient,
  target: string,
): Promise<{ existing: RawProductRow | null; error: AgentSupabaseQueryError | null }> {
  let { data: existing, error: fetchErr } = await supabase
    .from('products')
    .select(AGENT_PRODUCT_WITH_VARIATIONS_COLUMNS)
    .or(`code.eq.${target},sku.eq.${target}`)
    .maybeSingle();

  if (!existing && !fetchErr) {
    const { data: varMatch } = await supabase
      .from('product_variations')
      .select('product_id')
      .eq('sku', target)
      .maybeSingle();

    if (varMatch?.product_id) {
      const parentRes = await supabase
        .from('products')
        .select(AGENT_PRODUCT_WITH_VARIATIONS_COLUMNS)
        .eq('id', varMatch.product_id)
        .maybeSingle();
      existing = parentRes.data;
      fetchErr = parentRes.error;
    }
  }

  if (!existing && !fetchErr && target.length >= 3) {
    const padded = target.padStart(6, '0');
    const fallbackRes = await supabase
      .from('products')
      .select(AGENT_PRODUCT_WITH_VARIATIONS_COLUMNS)
      .or(`code.eq.${padded},sku.imatch.${buildPostgrestAccentInsensitivePattern(target)}`)
      .limit(1)
      .maybeSingle();
    existing = fallbackRes.data;
  }

  return { existing: (existing as RawProductRow | null) ?? null, error: fetchErr };
}

export async function createProductForAgent(
  supabase: AgentSupabaseClient,
  args: AgentCreateProductInput,
  canViewCost?: boolean,
): Promise<{
  success: boolean;
  data?: SanitizedProductDetailForAgent;
  message?: string;
  error?: string;
  code?: string;
}> {
  const nome = String(args?.nome || args?.titulo || '').trim();
  if (!nome) {
    return {
      success: false,
      code: 'INVALID_ARGUMENT',
      error: 'O nome do produto é obrigatório para criar um produto.',
    };
  }

  try {
    const code = args.codigo?.trim()
      ? args.codigo.trim().padStart(6, '0')
      : await resolveNextSequentialCode(supabase);
    const { payload, defaults } = buildCreateProductPayload(args, code, nome);

    const { data: createdProduct, error: insertError } = await supabase
      .from('products')
      .insert([payload])
      .select(AGENT_PRODUCT_COLUMNS)
      .single();

    if (insertError || !createdProduct) {
      return {
        success: false,
        code: 'DATABASE_ERROR',
        error: insertError?.message || 'Não foi possível criar o produto no banco de dados.',
      };
    }

    const variationsToInsert = buildCreatedVariationsPayload(
      createdProduct.id,
      code,
      nome,
      args,
      defaults,
    );
    const insertedVars = await insertVariationsForCreatedProduct(supabase, variationsToInsert);
    const sanitized = sanitizeRawDbProductForAgent(
      { ...createdProduct, product_variations: insertedVars },
      canViewCost,
    );

    return {
      success: true,
      data: sanitized,
      message: `Produto "${sanitized.nome}" (Código: ${sanitized.codigo}) criado com sucesso.`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      code: 'PRODUCT_CREATE_ERROR',
      error: getAgentOperationErrorMessage(err, 'Erro inesperado ao criar produto.'),
    };
  }
}

export async function updateProductForAgent(
  supabase: AgentSupabaseClient,
  args: AgentUpdateProductInput,
  canViewCost?: boolean,
): Promise<{
  success: boolean;
  data?: SanitizedProductDetailForAgent;
  message?: string;
  error?: string;
  code?: string;
}> {
  const target = String(args?.codigoOuSku || args?.codigo || '').trim();
  if (!target) {
    return {
      success: false,
      code: 'INVALID_ARGUMENT',
      error: 'Informe o código de 6 dígitos ou SKU do produto que deseja editar.',
    };
  }

  try {
    const { existing, error: fetchErr } = await findExistingProductForUpdate(supabase, target);
    if (fetchErr) {
      return {
        success: false,
        code: 'DATABASE_ERROR',
        error: fetchErr.message || 'Erro ao consultar produto para edição.',
      };
    }
    if (!existing) {
      return {
        success: false,
        code: 'PRODUCT_NOT_FOUND',
        error: `Nenhum produto encontrado com o código ou SKU "${target}".`,
      };
    }

    const updatePayload = buildUpdateProductPayload(existing, args);
    const { data: updatedRow, error: updateErr } = await supabase
      .from('products')
      .update(updatePayload)
      .eq('id', existing.id)
      .select(AGENT_PRODUCT_WITH_VARIATIONS_COLUMNS)
      .single();

    if (updateErr || !updatedRow) {
      return {
        success: false,
        code: 'DATABASE_ERROR',
        error: updateErr?.message || 'Falha ao atualizar o produto.',
      };
    }

    const currentVars = await syncVariationsForUpdatedProduct(
      supabase,
      existing,
      updatedRow as RawProductRow,
      args,
    );
    const sanitized = sanitizeRawDbProductForAgent(
      { ...updatedRow, product_variations: currentVars },
      canViewCost,
    );

    return {
      success: true,
      data: sanitized,
      message: `Produto "${sanitized.nome}" (Código: ${sanitized.codigo}) atualizado com sucesso.`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      code: 'PRODUCT_UPDATE_ERROR',
      error: getAgentOperationErrorMessage(err, 'Erro inesperado ao atualizar o produto.'),
    };
  }
}
