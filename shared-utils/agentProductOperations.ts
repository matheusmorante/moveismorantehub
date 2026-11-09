import { getNextSequentialProductCodeFromValues } from './productSequentialCode';
import { buildPostgrestAccentInsensitivePattern } from './searchText';
import {
  AgentVariationInput,
  AgentCreateProductInput,
  AgentUpdateProductInput,
  SanitizedProductVariationForAgent,
  SanitizedProductDetailForAgent,
  normalizeSlugSimple,
  sanitizeRawDbProductForAgent,
} from './agentProductSanitizer';

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
};

export async function listProductCategoriesAndCharacteristicsForAgent(supabase: any): Promise<{
  success: boolean;
  data?: {
    categorias: Array<{ nome: string; ambiente: boolean; ativo: boolean }>;
    caracteristicas: Array<{
      nome: string;
      grupo?: string;
      tipo?: string;
      opcoes?: string[];
    }>;
  };
  message?: string;
  error?: string;
  code?: string;
}> {
  try {
    let categorias: Array<{ nome: string; ambiente: boolean; ativo: boolean }> = [];
    try {
      const { data: catRows } = await supabase
        .from('categories')
        .select('name, is_environment, active')
        .order('name', { ascending: true })
        .limit(200);
      if (Array.isArray(catRows)) {
        categorias = catRows
          .filter((c: any) => c?.name)
          .map((c: any) => ({
            nome: String(c.name),
            ambiente: Boolean(c.is_environment),
            ativo: c.active !== false,
          }));
      }
    } catch {
      // fallback silencioso
    }

    let caracteristicas: Array<{
      nome: string;
      grupo?: string;
      tipo?: string;
      opcoes?: string[];
    }> = [];
    try {
      const { data: charRows } = await supabase
        .from('product_characteristics')
        .select('name, group_name, field_type, options')
        .order('name', { ascending: true })
        .limit(200);
      if (Array.isArray(charRows)) {
        caracteristicas = charRows
          .filter((ch: any) => ch?.name)
          .map((ch: any) => ({
            nome: String(ch.name),
            grupo: ch.group_name ? String(ch.group_name) : undefined,
            tipo: ch.field_type ? String(ch.field_type) : undefined,
            opcoes: Array.isArray(ch.options) ? ch.options.map(String) : undefined,
          }));
      }
    } catch {
      // fallback silencioso
    }

    return {
      success: true,
      data: {
        categorias,
        caracteristicas,
      },
      message: `${categorias.length} categoria(s) e ${caracteristicas.length} característica(s) carregadas.`,
    };
  } catch (err: any) {
    return {
      success: false,
      code: 'PRODUCT_METADATA_ERROR',
      error: err?.message || 'Erro ao listar categorias e características de produtos.',
    };
  }
}

async function resolveNextSequentialCode(supabase: any): Promise<string> {
  try {
    const codes: unknown[] = [];
    const { data: prodRows } = await supabase
      .from('products')
      .select('code, sku')
      .order('code', { ascending: false })
      .limit(50);
    if (Array.isArray(prodRows)) {
      for (const r of prodRows) {
        if (r?.code) codes.push(r.code);
        if (r?.sku) codes.push(r.sku);
      }
    }
    return getNextSequentialProductCodeFromValues(codes);
  } catch {
    return '000001';
  }
}

export async function createProductForAgent(
  supabase: any,
  args: AgentCreateProductInput
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

    const unitPrice = Number(args.precoVenda ?? 0);
    const promoPrice =
      args.precoPromocional !== undefined && args.precoPromocional !== null
        ? Number(args.precoPromocional)
        : null;
    const costPrice = Number(args.precoCusto ?? 0);
    const freightCost = Number(args.custoFrete ?? 0);

    const inputVars = Array.isArray(args.variacoes) && args.variacoes.length > 0
      ? args.variacoes
      : [
          {
            sku: `${code}-01`,
            nome,
            precoVenda: unitPrice,
            precoPromocional: promoPrice,
            precoCusto: costPrice,
            estoque: Number(args.estoque ?? 0),
            ativo: args.ativo !== false,
            atributos: {},
            alturaCm: args.alturaCm,
            larguraCm: args.larguraCm,
            profundidadeCm: args.profundidadeCm,
            pesoKg: args.pesoKg,
          },
        ];

    const totalStock =
      args.estoque !== undefined
        ? Number(args.estoque)
        : inputVars.reduce((acc, v) => acc + Number(v.estoque ?? 0), 0);

    const nowIso = new Date().toISOString();
    const isDraft = Boolean(args.rascunho);
    const condition = args.condicao || 'novo';

    const insertPayload: Record<string, any> = {
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
      freight_cost: freightCost,
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
      has_variations: inputVars.length > 1,
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
    };

    const { data: createdProduct, error: insertError } = await supabase
      .from('products')
      .insert([insertPayload])
      .select('*')
      .single();

    if (insertError || !createdProduct) {
      return {
        success: false,
        code: 'DATABASE_ERROR',
        error: insertError?.message || 'Não foi possível criar o produto no banco de dados.',
      };
    }

    const variationsToInsert = inputVars.map((v, idx) => {
      const varSku = v.sku?.trim() || `${code}-${String(idx + 1).padStart(2, '0')}`;
      const attrList = v.atributos
        ? Object.entries(v.atributos).map(([name, value]) => ({ name, value: String(value) }))
        : [];
      return {
        product_id: createdProduct.id,
        sku: varSku,
        name: v.nome?.trim() || nome,
        price: Number(v.precoVenda ?? unitPrice),
        unit_price: Number(v.precoVenda ?? unitPrice),
        promo_price:
          v.precoPromocional !== undefined ? v.precoPromocional : promoPrice,
        cost_price: Number(v.precoCusto ?? costPrice),
        stock: Number(v.estoque ?? (idx === 0 ? totalStock : 0)),
        active: v.ativo !== false,
        attributes: attrList,
        height: v.alturaCm ?? args.alturaCm ?? null,
        width: v.larguraCm ?? args.larguraCm ?? null,
        depth: v.profundidadeCm ?? args.profundidadeCm ?? null,
        weight: v.pesoKg ?? args.pesoKg ?? null,
      };
    });

    let insertedVars: any[] = [];
    try {
      const { data: varRows } = await supabase
        .from('product_variations')
        .insert(variationsToInsert)
        .select('*');
      if (Array.isArray(varRows)) {
        insertedVars = varRows;
      }
    } catch {
      insertedVars = variationsToInsert;
    }

    const sanitized = sanitizeRawDbProductForAgent({
      ...createdProduct,
      product_variations: insertedVars.length > 0 ? insertedVars : variationsToInsert,
    });

    return {
      success: true,
      data: sanitized,
      message: `Produto "${sanitized.nome}" (Código: ${sanitized.codigo}) criado com sucesso.`,
    };
  } catch (err: any) {
    return {
      success: false,
      code: 'PRODUCT_CREATE_ERROR',
      error: err?.message || 'Erro inesperado ao criar produto.',
    };
  }
}

export async function updateProductForAgent(
  supabase: any,
  args: AgentUpdateProductInput
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
    // Localiza o produto pai (incluindo lixeira caso seja restauração/exclusão)
    let { data: existing, error: fetchErr } = await supabase
      .from('products')
      .select('*, product_variations(*)')
      .or(`code.eq.${target},sku.eq.${target}`)
      .maybeSingle();

    if (!existing && !fetchErr) {
      const { data: varMatch } = await supabase
        .from('product_variations')
        .select('product_id')
        .eq('sku', target)
        .maybeSingle();

      if (varMatch?.product_id) {
        const { data: parentRow, error: parentErr } = await supabase
          .from('products')
          .select('*, product_variations(*)')
          .eq('id', varMatch.product_id)
          .maybeSingle();
        existing = parentRow;
        fetchErr = parentErr;
      }
    }

    if (!existing && !fetchErr && target.length >= 3) {
      const padded = target.padStart(6, '0');
      const { data: fallbackRow } = await supabase
        .from('products')
        .select('*, product_variations(*)')
        .or(`code.eq.${padded},sku.imatch.${buildPostgrestAccentInsensitivePattern(target)}`)
        .limit(1)
        .maybeSingle();
      existing = fallbackRow;
    }

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

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (args.nome !== undefined) {
      updatePayload.name = args.nome.trim();
      if (args.titulo === undefined) {
        updatePayload.marketplace_title = args.nome.trim();
      }
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
      updatePayload.promo_price =
        args.precoPromocional === null ? null : Number(args.precoPromocional);
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
    if (args.diferencialPrincipal !== undefined)
      updatePayload.main_differential = args.diferencialPrincipal.trim();
    if (args.naoIncluso !== undefined) updatePayload.not_included = args.naoIncluso.trim();
    if (args.ativo !== undefined) updatePayload.active = Boolean(args.ativo);
    if (args.rascunho !== undefined) updatePayload.is_draft = Boolean(args.rascunho);

    // Regra 14: Lixeira de produtos usa estritamente deleted = true / false
    if (args.moverParaLixeira === true) {
      updatePayload.deleted = true;
    } else if (args.restaurarDaLixeira === true) {
      updatePayload.deleted = false;
    }

    if (args.ncm !== undefined) {
      updatePayload.fiscal = {
        ...(existing.fiscal || {}),
        ncm: args.ncm.trim(),
      };
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

    const { data: updatedRow, error: updateErr } = await supabase
      .from('products')
      .update(updatePayload)
      .eq('id', existing.id)
      .select('*, product_variations(*)')
      .single();

    if (updateErr || !updatedRow) {
      return {
        success: false,
        code: 'DATABASE_ERROR',
        error: updateErr?.message || 'Falha ao atualizar o produto.',
      };
    }

    // Se variações específicas foram enviadas, ou se preço/estoque mudou em produto de variação única
    let currentVars = Array.isArray(updatedRow.product_variations)
      ? [...updatedRow.product_variations]
      : Array.isArray(existing.product_variations)
        ? [...existing.product_variations]
        : [];

    if (Array.isArray(args.variacoes) && args.variacoes.length > 0) {
      for (const vInput of args.variacoes) {
        const targetVarSku = vInput.sku?.trim();
        const existingVar = targetVarSku
          ? currentVars.find((cv: any) => cv.sku === targetVarSku)
          : currentVars.length === 1
            ? currentVars[0]
            : null;

        if (existingVar?.id) {
          const varPatch: Record<string, any> = {};
          if (vInput.nome !== undefined) varPatch.name = vInput.nome.trim();
          if (vInput.precoVenda !== undefined) {
            varPatch.price = Number(vInput.precoVenda);
            varPatch.unit_price = Number(vInput.precoVenda);
          }
          if (vInput.precoPromocional !== undefined) varPatch.promo_price = vInput.precoPromocional;
          if (vInput.precoCusto !== undefined) varPatch.cost_price = Number(vInput.precoCusto);
          if (vInput.estoque !== undefined) varPatch.stock = Number(vInput.estoque);
          if (vInput.ativo !== undefined) varPatch.active = Boolean(vInput.ativo);
          if (vInput.atributos !== undefined) {
            varPatch.attributes = Object.entries(vInput.atributos).map(([name, value]) => ({
              name,
              value: String(value),
            }));
          }
          try {
            const { data: patchedVar } = await supabase
              .from('product_variations')
              .update(varPatch)
              .eq('id', existingVar.id)
              .select('*')
              .maybeSingle();
            if (patchedVar) {
              currentVars = currentVars.map((cv: any) =>
                cv.id === existingVar.id ? patchedVar : cv
              );
            }
          } catch {
            // fallback
          }
        } else {
          const newSku =
            targetVarSku ||
            `${updatedRow.code || existing.code}-${String(currentVars.length + 1).padStart(2, '0')}`;
          const newVarPayload = {
            product_id: existing.id,
            sku: newSku,
            name: vInput.nome?.trim() || updatedRow.name || existing.name,
            price: Number(vInput.precoVenda ?? updatedRow.unit_price ?? 0),
            unit_price: Number(vInput.precoVenda ?? updatedRow.unit_price ?? 0),
            promo_price: vInput.precoPromocional ?? null,
            cost_price: Number(vInput.precoCusto ?? updatedRow.cost_price ?? 0),
            stock: Number(vInput.estoque ?? 0),
            active: vInput.ativo !== false,
            attributes: vInput.atributos
              ? Object.entries(vInput.atributos).map(([name, value]) => ({
                  name,
                  value: String(value),
                }))
              : [],
          };
          try {
            const { data: insertedVar } = await supabase
              .from('product_variations')
              .insert([newVarPayload])
              .select('*')
              .maybeSingle();
            if (insertedVar) {
              currentVars.push(insertedVar);
            }
          } catch {
            // fallback
          }
        }
      }
    } else if (
      currentVars.length === 1 &&
      currentVars[0]?.id &&
      (args.precoVenda !== undefined ||
        args.precoPromocional !== undefined ||
        args.precoCusto !== undefined ||
        args.estoque !== undefined ||
        args.ativo !== undefined)
    ) {
      const singlePatch: Record<string, any> = {};
      if (args.precoVenda !== undefined) {
        singlePatch.price = Number(args.precoVenda);
        singlePatch.unit_price = Number(args.precoVenda);
      }
      if (args.precoPromocional !== undefined) singlePatch.promo_price = args.precoPromocional;
      if (args.precoCusto !== undefined) singlePatch.cost_price = Number(args.precoCusto);
      if (args.estoque !== undefined) singlePatch.stock = Number(args.estoque);
      if (args.ativo !== undefined) singlePatch.active = Boolean(args.ativo);
      try {
        const { data: patchedVar } = await supabase
          .from('product_variations')
          .update(singlePatch)
          .eq('id', currentVars[0].id)
          .select('*')
          .maybeSingle();
        if (patchedVar) {
          currentVars = [patchedVar];
        }
      } catch {
        // fallback
      }
    }

    const sanitized = sanitizeRawDbProductForAgent({
      ...updatedRow,
      product_variations: currentVars,
    });

    return {
      success: true,
      data: sanitized,
      message: `Produto "${sanitized.nome}" (Código: ${sanitized.codigo}) atualizado com sucesso.`,
    };
  } catch (err: any) {
    return {
      success: false,
      code: 'PRODUCT_UPDATE_ERROR',
      error: err?.message || 'Erro inesperado ao atualizar o produto.',
    };
  }
}
