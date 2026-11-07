import { ecommerceSupabase as supabase } from '@/pages/utils/supabaseConfig';
import { toTitleCase } from './textUtils';
import { normalizeSlug, resolveUniqueSlug } from './uniqueSlug';
import {
  resolveCategoryAttributeIsRequired,
  type CategoryAttributeSelection,
} from '../../../../shared-utils/categoryAttributeSelection';
import type { CharacteristicCategoryApplication } from '../../../../shared-utils/categoryCharacteristicApplication';
import { mapCategoryProductCountRows } from '../../../../shared-utils/categoryProductCounts';
import { withCatalogAttributesLoadTimeout } from '../../../../shared-utils/catalogAttributesLoadTimeout';
import { withTimeout } from '../../../../shared-utils/withTimeout';
import { invalidateTechnicalFieldDefinitionsCache } from '@/pages/App/Products/services/technicalFieldService';
import {
  createEnvironment,
  deleteEnvironment,
  fetchCategoryEnvironmentRelationships,
  fetchEnvironments,
  unlinkCategoryFromEnvironment,
  updateEnvironment,
} from './environmentService';
import type { CategoryEnvironmentRelationshipsResult } from './environmentService';

export {
  createEnvironment,
  deleteEnvironment,
  fetchEnvironments,
  unlinkCategoryFromEnvironment,
  updateEnvironment,
};
export type { Environment } from './environmentService';

export type { CategoryAttributeSelection } from '../../../../shared-utils/categoryAttributeSelection';
export type { CharacteristicCategoryApplication } from '../../../../shared-utils/categoryCharacteristicApplication';

const CHARACTERISTIC_APPLICATION_TIMEOUT_MS = 20_000;
type CategoryListProjection = 'full' | 'summary';

const CATEGORY_SUMMARY_FIELDS = 'id, name, slug, type';

export type Category = {
  id: string;
  name: string;
  active?: boolean;
  slug?: string;
  type?: string;
  meta_title?: string;
  meta_description?: string;
  seo_description?: string;
  parents?: string[]; // IDs dos environments vinculados
};

/**
 * Busca todas as categorias de produtos (type = 'category')
 * e popula seus ambientes associados a partir de category_relationships.
 */
export const fetchCategories = async (
  sharedRelationships?: Promise<CategoryEnvironmentRelationshipsResult>,
  projection: CategoryListProjection = 'full'
): Promise<Category[]> => {
  try {
    const categoriesRequest =
      projection === 'summary'
        ? supabase
            .from('categories')
            .select(CATEGORY_SUMMARY_FIELDS)
            .eq('type', 'category')
            .order('name')
        : supabase
            .from('categories')
            .select('*')
            .eq('type', 'category')
            .order('name');
    const { data: catsData, error: catsErr } = await categoriesRequest;

    if (catsErr) {
      console.error('[CategoryService] Erro ao buscar categories:', catsErr);
      return [];
    }

    const { data: rels, error: relErr } = sharedRelationships
      ? await sharedRelationships
      : await fetchCategoryEnvironmentRelationships();

    if (relErr) {
      console.error(
        '[CategoryService] Erro ao buscar category_relationships para categories:',
        relErr
      );
      return catsData || [];
    }

    return (catsData || []).map((cat: any) => ({
      ...cat,
      parents: (rels || []).filter((r: any) => r.child_id === cat.id).map((r: any) => r.parent_id),
    }));
  } catch (err) {
    console.error('[CategoryService] Exceção em fetchCategories:', err);
    return [];
  }
};

/** Busca ambientes e categorias compartilhando a leitura de seus vínculos nesta carga. */
export const fetchCategoryEnvironmentData = async (
  projection: CategoryListProjection = 'full'
) => {
  const sharedRelationships = fetchCategoryEnvironmentRelationships();
  const [environments, categories] = await Promise.all([
    fetchEnvironments(sharedRelationships, projection),
    fetchCategories(sharedRelationships, projection),
  ]);
  return { environments, categories };
};

/**
 * Retrocompatibilidade para quem ainda chama fetchGroupsAndCategories (ex: cadastro de produtos).
 */
export const fetchGroupsAndCategories = async () => {
  const { environments: envs, categories: cats } = await fetchCategoryEnvironmentData('full');
  const combined = [
    ...envs.map((e) => ({ ...e, parents: [] })), // Ambientes não possuem pai
    ...cats,
  ];
  return {
    categories: combined,
    relations: [],
  };
};

export const generateSlug = (name: string) => {
  return normalizeSlug(name);
};

export const createCategory = async (
  name: string,
  environmentIds: string[],
  attributes?: CategoryAttributeSelection[],
  seoFields?: Partial<Category>,
  characteristicApplications?: CharacteristicCategoryApplication[]
) => {
  const formattedName = toTitleCase(name);
  let uniqueSlug = normalizeSlug(seoFields?.slug || formattedName);
  try {
    uniqueSlug = await resolveUniqueSlug(supabase, 'categories', uniqueSlug);
  } catch {
    /* no-op: intencionalmente silencioso */
  }

  const insertData: any = {
    name: formattedName,
    slug: uniqueSlug,
    type: 'category',
  };
  if (seoFields?.meta_title) insertData.meta_title = seoFields.meta_title;
  if (seoFields?.meta_description) insertData.meta_description = seoFields.meta_description;
  if (seoFields?.seo_description) insertData.seo_description = seoFields.seo_description;

  const { data, error } = await supabase.from('categories').insert([insertData]).select();
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('Falha ao criar categoria.');

  const newCatId = data[0].id;
  if (environmentIds && environmentIds.length > 0) {
    const links = environmentIds.map((eid) => ({ parent_id: eid, child_id: newCatId }));
    const { error: insError } = await supabase.from('category_relationships').insert(links);
    if (insError) throw insError;
  }

  const uniqueAttributes = [
    ...new Map<string, CategoryAttributeSelection>(
      (attributes || []).map(
        (attribute): [string, CategoryAttributeSelection] => [attribute.id, attribute]
      )
    ).values(),
  ];
  if (uniqueAttributes.length > 0) {
    const attrLinks = uniqueAttributes.map((attribute) => ({
      category_id: newCatId,
      attribute_id: attribute.id,
      is_required: resolveCategoryAttributeIsRequired(attribute),
    }));
    const { error: attrError } = await supabase.from('category_attributes').insert(attrLinks);
    if (attrError) throw attrError;
  }

  if (characteristicApplications !== undefined) {
    await saveCharacteristicCategoryApplications(newCatId, characteristicApplications);
  }

  return data[0];
};

export const updateCategory = async (
  id: string,
  name: string,
  environmentIds: string[],
  attributes?: CategoryAttributeSelection[],
  seoFields?: Partial<Category>,
  characteristicApplications?: CharacteristicCategoryApplication[]
) => {
  const formattedName = toTitleCase(name);
  const updateData: any = { name: formattedName, type: 'category' };
  if (seoFields) {
    if (seoFields.slug) {
      updateData.slug = await resolveUniqueSlug(supabase, 'categories', seoFields.slug, id);
    }
    if (seoFields.meta_title) updateData.meta_title = seoFields.meta_title;
    if (seoFields.meta_description) updateData.meta_description = seoFields.meta_description;
    if (seoFields.seo_description) updateData.seo_description = seoFields.seo_description;
  }

  const { error } = await supabase.from('categories').update(updateData).eq('id', id);
  if (error) throw error;

  // Atualiza relacionamentos em category_relationships
  const { error: delError } = await supabase
    .from('category_relationships')
    .delete()
    .eq('child_id', id);
  if (delError) throw delError;

  if (environmentIds && environmentIds.length > 0) {
    const links = environmentIds.map((eid) => ({ parent_id: eid, child_id: id }));
    const { error: insError } = await supabase.from('category_relationships').insert(links);
    if (insError) throw insError;
  }

  // Atualiza relacionamentos em category_attributes (se fornecido explicitamente)
  if (attributes !== undefined) {
    const { error: delAttrError } = await supabase
      .from('category_attributes')
      .delete()
      .eq('category_id', id);
    if (delAttrError) throw delAttrError;

    const uniqueAttributes = [
      ...new Map<string, CategoryAttributeSelection>(
        attributes.map(
          (attribute): [string, CategoryAttributeSelection] => [attribute.id, attribute]
        )
      ).values(),
    ];
    if (uniqueAttributes.length > 0) {
      const attrLinks = uniqueAttributes.map((attribute) => ({
        category_id: id,
        attribute_id: attribute.id,
        is_required: resolveCategoryAttributeIsRequired(attribute),
      }));
      const { error: insAttrError } = await supabase.from('category_attributes').insert(attrLinks);
      if (insAttrError) throw insAttrError;
    }
  }

  if (characteristicApplications !== undefined) {
    await saveCharacteristicCategoryApplications(id, characteristicApplications);
  }
};

export type ActiveCharacteristic = { id: string; name: string };

/** Active product characteristics shown in the category's application settings. */
export const fetchActiveCharacteristics = async (): Promise<ActiveCharacteristic[]> => {
  const result = await withTimeout(
    supabase.from('attributes').select('id, name, active').order('name').limit(10000),
    CHARACTERISTIC_APPLICATION_TIMEOUT_MS,
    null,
    'Carregar características para a categoria'
  );
  if (!result) throw new Error('Tempo esgotado ao carregar as características da categoria.');
  if (result.error) throw result.error;
  return (result.data ?? [])
    .filter((row) => row.active !== false)
    .map((row) => ({ id: String(row.id), name: String(row.name) }));
};

export const fetchCharacteristicCategoryApplications = async (
  categoryId: string
): Promise<Array<{ attributeId: string; application: 'unavailable' | 'optional' | 'required' }>> => {
  const result = await withTimeout(
    supabase
      .from('attribute_category_applications')
      .select('attribute_id, application')
      .eq('category_id', categoryId)
      .limit(10000),
    CHARACTERISTIC_APPLICATION_TIMEOUT_MS,
    null,
    'Carregar aplicações das características'
  );
  if (!result) throw new Error('Tempo esgotado ao carregar as aplicações das características.');
  if (result.error) throw result.error;
  return (result.data ?? []).map((row) => ({
    attributeId: String(row.attribute_id),
    application: row.application as 'unavailable' | 'optional' | 'required',
  }));
};

const saveCharacteristicCategoryApplications = async (
  categoryId: string,
  applications: CharacteristicCategoryApplication[]
): Promise<void> => {
  const result = await withTimeout(
    supabase.rpc('save_product_category_characteristic_applications', {
      p_category_id: categoryId,
      p_applications: applications.map(({ attributeId, application }) => ({ attributeId, application })),
    }),
    CHARACTERISTIC_APPLICATION_TIMEOUT_MS,
    null,
    'Salvar aplicações das características'
  );
  if (!result) throw new Error('Tempo esgotado ao salvar as aplicações das características.');
  if (result.error) throw result.error;
  invalidateTechnicalFieldDefinitionsCache();
};

/**
 * Busca características vinculadas a uma categoria e seu estado de obrigatoriedade.
 */
export const fetchCategoryAttributes = async (
  categoryId: string
): Promise<CategoryAttributeSelection[]> => {
  const { data, error } = await withCatalogAttributesLoadTimeout(
    supabase
      .from('category_attributes')
      .select(`
            is_required,
            attributes (
                id,
                name
            )
        `)
      .eq('category_id', categoryId),
    'erp:category-attributes:selection',
  );

  if (error) throw error;

  type AttributeRelation = { id: string; name: string };
  type CategoryAttributeRow = {
    is_required: boolean | null;
    attributes: AttributeRelation | AttributeRelation[] | null;
  };

  return ((data || []) as CategoryAttributeRow[]).flatMap((row) => {
    const attribute = Array.isArray(row.attributes) ? row.attributes[0] : row.attributes;
    return attribute
      ? [{
          id: attribute.id,
          name: attribute.name,
          isRequired: resolveCategoryAttributeIsRequired({
            name: attribute.name,
            isRequired: Boolean(row.is_required),
          }),
        }]
      : [];
  });
};

/**
 * Consulta agregada e deduplicada da quantidade de produtos vinculados a cada categoria.
 */
export const fetchCategoryProductCounts = async (): Promise<Record<string, number>> => {
  try {
    const { data, error } = await supabase.rpc('get_category_product_counts');
    if (error) throw error;

    return mapCategoryProductCountRows(data || []);
  } catch (err) {
    console.error('[CategoryService] Erro ao buscar contagem de produtos por categoria:', err);
    throw err;
  }
};

/**
 * Exclusão Segura de Categoria:
 * - Só pode ser excluída quando linkedProductsCount === 0.
 * - Quantidade de ambientes NÃO impede a exclusão.
 * - Ao excluir, remove os vínculos em category_relationships e remove a categoria.
 */
export const deleteCategory = async (id: string) => {
  // 1. Validação atômica de concorrência: verificar se existem produtos vinculados
  const [pcCheck, prodCheck] = await Promise.all([
    supabase
      .from('product_categories')
      .select('product_id', { count: 'exact', head: true })
      .eq('category_id', id),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('category_id', id),
  ]);
  if (pcCheck.error) throw pcCheck.error;
  if (prodCheck.error) throw prodCheck.error;

  const totalLinked = (pcCheck.count || 0) + (prodCheck.count || 0);
  if (totalLinked > 0) {
    const [pcRows, prodRows] = await Promise.all([
      supabase.from('product_categories').select('product_id').eq('category_id', id),
      supabase.from('products').select('id').eq('category_id', id),
    ]);
    if (pcRows.error) throw pcRows.error;
    if (prodRows.error) throw prodRows.error;
    const finalCount =
      countDistinctProductsByCategory([
        ...(pcRows.data || []).map((row: { product_id: string }) => ({
          categoryId: id,
          productId: row.product_id,
        })),
        ...(prodRows.data || []).map((row: { id: string }) => ({
          categoryId: id,
          productId: row.id,
        })),
      ])[id] || totalLinked;
    throw new Error(
      `Não é possível excluir esta categoria porque ela está sendo utilizada por ${finalCount} produto${finalCount > 1 ? 's' : ''}. Remova ou altere a categoria desses produtos antes de excluí-la.`
    );
  }

  // 2. Se não há produtos, remover com segurança os relacionamentos N:N em category_relationships
  const { error: relError } = await supabase
    .from('category_relationships')
    .delete()
    .eq('child_id', id);
  if (relError) throw relError;

  // 3. Excluir a categoria
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
};

export const getCategoryBreadcrumb = (
  categoryIds: string[],
  tree: { categories: any[]; relations: any[] }
) => {
  if (!tree || !tree.categories || !categoryIds || categoryIds.length === 0) return '';
  const names = categoryIds
    .map((cid) => {
      const cat = tree.categories.find((c) => String(c.id) === String(cid));
      return cat ? cat.name : null;
    })
    .filter(Boolean);
  return names.join(' | ') || '';
};
