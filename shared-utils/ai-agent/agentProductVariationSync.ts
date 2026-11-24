import type { AgentCreateProductInput, AgentUpdateProductInput, AgentVariationInput } from './agentProductSanitizer';
import {
  type AgentSupabaseClient,
  type AgentSupabaseResponse,
  getAgentOperationErrorMessage,
} from './agentProductMetadataOperations';

export const AGENT_PRODUCT_VARIATION_COLUMNS =
  'id, product_id, sku, name, price, unit_price, promo_price, cost_price, stock, active, attributes, images, height, width, depth, weight';

export const AGENT_PRODUCT_COLUMNS =
  'id, code, name, marketplace_title, description, category, environment, brand, line, condition, active, deleted, is_draft, unit_price, price, promo_price, cost_price, freight_cost, stock, min_stock, unit, height, width, depth, weight, material, colors, main_differential, not_included, images, has_variations, fiscal, technical_specs';

export const AGENT_PRODUCT_WITH_VARIATIONS_COLUMNS = `${AGENT_PRODUCT_COLUMNS}, product_variations(${AGENT_PRODUCT_VARIATION_COLUMNS})`;

export interface RawProductVariationRow extends Record<string, unknown> {
  id?: string;
  product_id?: string;
  sku?: string;
  name?: string;
}

export interface RawProductRow extends Record<string, unknown> {
  id?: string;
  code?: string;
  name?: string;
  unit_price?: number;
  cost_price?: number;
  fiscal?: Record<string, unknown> | null;
  technical_specs?: { technicalValues?: Record<string, unknown> } & Record<string, unknown>;
  product_variations?: RawProductVariationRow[];
}

export const toVariationAttributeEntries = (atributos?: Record<string, string>) =>
  atributos
    ? Object.entries(atributos).map(([name, value]) => ({ name, value: String(value) }))
    : [];

export function buildCreatedVariationsPayload(
  productId: unknown,
  code: string,
  productName: string,
  args: AgentCreateProductInput,
  defaults: {
    unitPrice: number;
    promoPrice: number | null;
    costPrice: number;
    totalStock: number;
  },
): Array<Record<string, unknown>> {
  const inputVars: AgentVariationInput[] =
    Array.isArray(args.variacoes) && args.variacoes.length > 0
      ? args.variacoes
      : [
          {
            sku: `${code}-01`,
            nome: productName,
            precoVenda: defaults.unitPrice,
            precoPromocional: defaults.promoPrice,
            precoCusto: defaults.costPrice,
            estoque: Number(args.estoque ?? 0),
            ativo: args.ativo !== false,
            atributos: {},
            alturaCm: args.alturaCm,
            larguraCm: args.larguraCm,
            profundidadeCm: args.profundidadeCm,
            pesoKg: args.pesoKg,
          },
        ];

  return inputVars.map((variation, idx) => ({
    product_id: productId,
    sku: variation.sku?.trim() || `${code}-${String(idx + 1).padStart(2, '0')}`,
    name: variation.nome?.trim() || productName,
    price: Number(variation.precoVenda ?? defaults.unitPrice),
    unit_price: Number(variation.precoVenda ?? defaults.unitPrice),
    promo_price:
      variation.precoPromocional !== undefined ? variation.precoPromocional : defaults.promoPrice,
    cost_price: Number(variation.precoCusto ?? defaults.costPrice),
    stock: Number(variation.estoque ?? (idx === 0 ? defaults.totalStock : 0)),
    active: variation.ativo !== false,
    attributes: toVariationAttributeEntries(variation.atributos),
    height: variation.alturaCm ?? args.alturaCm ?? null,
    width: variation.larguraCm ?? args.larguraCm ?? null,
    depth: variation.profundidadeCm ?? args.profundidadeCm ?? null,
    weight: variation.pesoKg ?? args.pesoKg ?? null,
  }));
}

export async function insertVariationsForCreatedProduct(
  supabase: AgentSupabaseClient,
  variationsToInsert: Array<Record<string, unknown>>,
): Promise<Array<Record<string, unknown>>> {
  try {
    const { data: varRows } = await (
      supabase
        .from('product_variations')
        .insert(variationsToInsert)
        .select(AGENT_PRODUCT_VARIATION_COLUMNS) as unknown as Promise<
          AgentSupabaseResponse<Array<Record<string, unknown>>>
        >
    );
    if (Array.isArray(varRows) && varRows.length > 0) {
      return varRows;
    }
  } catch (err: unknown) {
    console.warn(
      '[AgentProductVariationSync] Não foi possível ler variações recém-inseridas; mantendo payload local:',
      getAgentOperationErrorMessage(err, 'erro desconhecido'),
    );
  }
  return variationsToInsert;
}

const buildVariationPatchPayload = (vInput: AgentVariationInput): Record<string, unknown> => {
  const varPatch: Record<string, unknown> = {};
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
    varPatch.attributes = toVariationAttributeEntries(vInput.atributos);
  }
  return varPatch;
};

const patchVariationRecord = async (
  supabase: AgentSupabaseClient,
  variationId: string,
  patch: Record<string, unknown>,
): Promise<RawProductVariationRow | null> => {
  try {
    const { data } = await supabase
      .from('product_variations')
      .update(patch)
      .eq('id', variationId)
      .select(AGENT_PRODUCT_VARIATION_COLUMNS)
      .maybeSingle();
    return (data as RawProductVariationRow | null) ?? null;
  } catch (err: unknown) {
    console.warn(
      `[AgentProductVariationSync] Falha ao atualizar variação ${variationId}:`,
      getAgentOperationErrorMessage(err, 'erro desconhecido'),
    );
    return null;
  }
};

export async function syncVariationsForUpdatedProduct(
  supabase: AgentSupabaseClient,
  existing: RawProductRow,
  updatedRow: RawProductRow,
  args: AgentUpdateProductInput,
): Promise<RawProductVariationRow[]> {
  let currentVars: RawProductVariationRow[] = Array.isArray(updatedRow.product_variations)
    ? [...updatedRow.product_variations]
    : Array.isArray(existing.product_variations)
      ? [...existing.product_variations]
      : [];

  if (Array.isArray(args.variacoes) && args.variacoes.length > 0) {
    for (const vInput of args.variacoes) {
      const targetVarSku = vInput.sku?.trim();
      const existingVar = targetVarSku
        ? currentVars.find((cv) => cv.sku === targetVarSku)
        : currentVars.length === 1
          ? currentVars[0]
          : null;

      if (existingVar?.id) {
        const patchedVar = await patchVariationRecord(
          supabase,
          existingVar.id,
          buildVariationPatchPayload(vInput),
        );
        if (patchedVar) {
          currentVars = currentVars.map((cv) => (cv.id === existingVar.id ? patchedVar : cv));
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
          attributes: toVariationAttributeEntries(vInput.atributos),
        };
        try {
          const { data: insertedVar } = await supabase
            .from('product_variations')
            .insert([newVarPayload])
            .select(AGENT_PRODUCT_VARIATION_COLUMNS)
            .maybeSingle();
          if (insertedVar) {
            currentVars.push(insertedVar as RawProductVariationRow);
          }
        } catch (err: unknown) {
          console.warn(
            `[AgentProductVariationSync] Falha ao inserir variação ${newSku}:`,
            getAgentOperationErrorMessage(err, 'erro desconhecido'),
          );
        }
      }
    }
    return currentVars;
  }

  if (
    currentVars.length === 1 &&
    currentVars[0]?.id &&
    (args.precoVenda !== undefined ||
      args.precoPromocional !== undefined ||
      args.precoCusto !== undefined ||
      args.estoque !== undefined ||
      args.ativo !== undefined)
  ) {
    const singlePatch = buildVariationPatchPayload({
      precoVenda: args.precoVenda,
      precoPromocional: args.precoPromocional,
      precoCusto: args.precoCusto,
      estoque: args.estoque,
      ativo: args.ativo,
    });
    const patchedVar = await patchVariationRecord(supabase, currentVars[0].id, singlePatch);
    if (patchedVar) {
      currentVars = [patchedVar];
    }
  }

  return currentVars;
}
