import { supabase } from '../../../services/supabaseClient';
import {
  resolveCategoryAttributeIsRequired,
  type CategoryAttributeSelection,
} from '../../../../../shared-utils/categoryAttributeSelection';
import {
  countDistinctProductsByCategory,
  mapCategoryProductCountRows,
} from '../../../../../shared-utils/categoryProductCounts';
import { isProductCategoryOption } from '../../../../../shared-utils/productCategoryOptions';
import { withCatalogAttributesLoadTimeout } from '../../../../../shared-utils/catalogAttributesLoadTimeout';
import { toTitleCase } from '../../../../../shared-utils/productText';
import { normalizeSlug, resolveUniqueSlug } from '../../../../../shared-utils/uniqueSlug';

export type { CategoryAttributeSelection } from '../../../../../shared-utils/categoryAttributeSelection';

export interface MobileCategory {
  id: string;
  name: string;
  active?: boolean;
  slug?: string;
  parents?: string[];
  type?: string;
}

export interface MobileEnvironment extends MobileCategory {
  type?: 'environment' | string;
  categoryIds: string[];
}

type MobileCategoryEnvironmentRelationshipsResult = {
  data: { parent_id: string; child_id: string }[] | null;
  error: unknown | null;
};
type MobileCategoryEnvironmentRelationshipsSource =
  | Promise<MobileCategoryEnvironmentRelationshipsResult>
  | (() => Promise<MobileCategoryEnvironmentRelationshipsResult>);

type CategoryListProjection = 'full' | 'summary';
const CATEGORY_ENVIRONMENT_SUMMARY_FIELDS = 'id, name, slug, type';

const loadCategoryEnvironmentRelationships = (
  source?: MobileCategoryEnvironmentRelationshipsSource
) =>
  typeof source === 'function'
    ? source()
    : source ?? fetchMobileCategoryEnvironmentRelationships();

const fetchMobileCategoryEnvironmentRelationships = async (): Promise<MobileCategoryEnvironmentRelationshipsResult> => {
  try {
    const { data, error } = await supabase
      .from('category_relationships')
      .select('parent_id, child_id');
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const fetchMobileEnvironments = async (
  sharedRelationships?: MobileCategoryEnvironmentRelationshipsSource,
  projection: CategoryListProjection = 'full'
): Promise<MobileEnvironment[]> => {
  const environmentsRequest =
    projection === 'summary'
      ? supabase
          .from('categories')
          .select(CATEGORY_ENVIRONMENT_SUMMARY_FIELDS)
          .eq('type', 'environment')
          .order('name')
      : supabase
          .from('categories')
          .select('*')
          .eq('type', 'environment')
          .order('name');
  const { data: envs, error } = await environmentsRequest;
  if (error) throw error;
  const { data: links, error: linksError } = await loadCategoryEnvironmentRelationships(
    sharedRelationships
  );
  if (linksError) throw linksError;
  return (envs || []).map((env: any) => ({
    ...env,
    categoryIds: (links || [])
      .filter((link: any) => link.parent_id === env.id)
      .map((link: any) => link.child_id),
  }));
};

export const saveMobileEnvironment = async (name: string, categoryIds: string[], id?: string) => {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const formattedName = toTitleCase(trimmed);
  let environmentId = id;
  if (id) {
    const { data, error } = await supabase
      .from('categories')
      .update({ name: formattedName, type: 'environment' })
      .eq('id', id)
      .select('id')
      .single();
    if (error) throw error;
    environmentId = data.id;
    const { error: deleteError } = await supabase
      .from('category_relationships')
      .delete()
      .eq('parent_id', environmentId);
    if (deleteError) throw deleteError;
  } else {
    let uniqueSlug = normalizeSlug(formattedName);
    try {
      uniqueSlug = await resolveUniqueSlug(supabase, 'categories', uniqueSlug);
    } catch {
      /* Mantém o fallback usado pelo cadastro do ERP quando a consulta de colisões falha. */
    }
    const { data, error } = await supabase
      .from('categories')
      .insert([{ name: formattedName, type: 'environment', slug: uniqueSlug }])
      .select('id')
      .single();
    if (error) throw error;
    environmentId = data.id;
  }
  if (categoryIds.length > 0) {
    const { error: insertError } = await supabase
      .from('category_relationships')
      .insert(categoryIds.map((child_id) => ({ parent_id: environmentId, child_id })));
    if (insertError) throw insertError;
  }
  return environmentId;
};

export const deleteMobileEnvironment = async (id: string) => {
  const { data: relations, error: relationError } = await supabase
    .from('category_relationships')
    .select('child_id')
    .eq('parent_id', id)
    .limit(1);
  if (relationError) throw relationError;
  if ((relations || []).length > 0) {
    throw new Error('Desvincule as categorias antes de excluir este ambiente.');
  }
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
};

export const fetchMobileCategories = async (
  sharedRelationships?: MobileCategoryEnvironmentRelationshipsSource,
  projection: CategoryListProjection = 'full'
): Promise<MobileCategory[]> => {
  try {
    const categoriesRequest =
      projection === 'summary'
        ? supabase
            .from('categories')
            .select(CATEGORY_ENVIRONMENT_SUMMARY_FIELDS)
              .or('type.neq.environment,type.is.null')
            .order('name', { ascending: true })
        : supabase
            .from('categories')
            .select('*')
              .or('type.neq.environment,type.is.null')
            .order('name', { ascending: true });
    const { data: catsData, error: catsErr } = await categoriesRequest;

    if (catsErr) {
      console.warn('[MobileCategoryService] Erro ao buscar categorias:', catsErr);
      return [];
    }

    const { data: relData, error: relErr } = await loadCategoryEnvironmentRelationships(
      sharedRelationships
    );

    if (relErr) {
      console.warn('[MobileCategoryService] Erro ao buscar relacoes:', relErr);
    }

    const categoriesWithParents = (catsData || [])
      .filter(isProductCategoryOption)
      .map((cat: any) => ({
        ...cat,
        parents:
          relData?.filter((r: any) => r.child_id === cat.id).map((r: any) => r.parent_id) || [],
      }));

    return categoriesWithParents;
  } catch (err) {
    console.error('[MobileCategoryService] Exceção:', err);
    return [];
  }
};

export const fetchMobileCategoryEnvironmentData = async () => {
  const sharedRelationships = fetchMobileCategoryEnvironmentRelationships();
  const [environments, categories] = await Promise.all([
    fetchMobileEnvironments(sharedRelationships, 'summary'),
    fetchMobileCategories(sharedRelationships, 'summary'),
  ]);
  return { environments, categories };
};

export const fetchMobileProductFormCategoryOptions = async () => {
  let sharedRelationships: Promise<MobileCategoryEnvironmentRelationshipsResult> | undefined;
  const loadSharedRelationships = () =>
    (sharedRelationships ??= fetchMobileCategoryEnvironmentRelationships());
  const [categories, environmentResult] = await Promise.all([
    fetchMobileCategories(loadSharedRelationships, 'summary'),
    fetchMobileEnvironments(loadSharedRelationships, 'summary')
      .then((data) => ({ data }))
      .catch((error: unknown) => ({ error })),
  ]);
  return { categories, environmentResult };
};

export const fetchMobileEnvironmentManagerData = async () => {
  const categoriesRequest = (async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, type')
        .or('type.neq.environment,type.is.null')
        .order('name', { ascending: true });

      if (error) {
        console.warn('[MobileCategoryService] Erro ao buscar categorias:', error);
        return [];
      }

      return (data || []).filter(isProductCategoryOption);
    } catch (error) {
      console.error('[MobileCategoryService] Exceção:', error);
      return [];
    }
  })();
  const environmentsRequest = (async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, type')
      .eq('type', 'environment')
      .order('name');
    if (error) throw error;

    const { data: links, error: linksError } =
      await fetchMobileCategoryEnvironmentRelationships();
    if (linksError) throw linksError;

    return (data || []).map((environment: any) => ({
      ...environment,
      categoryIds: (links || [])
        .filter((link) => link.parent_id === environment.id)
        .map((link) => link.child_id),
    }));
  })();

  const [categories, environments] = await Promise.all([
    categoriesRequest,
    environmentsRequest,
  ]);

  return { categories, environments };
};

export const fetchMobileCategoryProductCounts = async (): Promise<Record<string, number>> => {
  try {
    const { data, error } = await supabase.rpc('get_category_product_counts');
    if (error) throw error;

    return mapCategoryProductCountRows(data || []);
  } catch (err) {
    console.warn('[MobileCategoryService] Erro ao buscar contagem de produtos:', err);
    throw err;
  }
};

export const fetchMobileCategoryAttributes = async (
  categoryId: string
): Promise<CategoryAttributeSelection[]> => {
  const { data, error } = await withCatalogAttributesLoadTimeout(
    supabase
      .from('category_attributes')
      .select(`
      attribute_id,
      is_required,
      attributes (
        id,
        name
      )
      `)
      .eq('category_id', categoryId),
    'mobile:category-attributes:selection',
  );

  if (error) throw error;

  return (data || []).flatMap((row: any) => {
    const attr = Array.isArray(row.attributes) ? row.attributes[0] : row.attributes;
    return attr
      ? [{
          id: String(attr.id),
          name: attr.name,
          isRequired: resolveCategoryAttributeIsRequired({
            name: attr.name,
            isRequired: Boolean(row.is_required),
          }),
        }]
      : [];
  });
};

export const unlinkMobileCategoryFromEnvironment = async (
  environmentId: string,
  categoryId: string
): Promise<void> => {
  const { error } = await supabase
    .from('category_relationships')
    .delete()
    .eq('parent_id', environmentId)
    .eq('child_id', categoryId);
  if (error) throw error;
};

export const saveMobileCategory = async (
  name: string,
  environmentIdsOrId?: string[] | string,
  attributes?: CategoryAttributeSelection[],
  id?: string
): Promise<MobileCategory | null> => {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const formattedName = toTitleCase(trimmed);

  // Tratar sobrecarga: se o segundo parâmetro for string, é o id antigo
  let actualId: string | undefined = id;
  let envIds: string[] = [];

  if (typeof environmentIdsOrId === 'string') {
    actualId = environmentIdsOrId;
  } else if (Array.isArray(environmentIdsOrId)) {
    envIds = environmentIdsOrId;
  }
  const isCreating = !actualId;

  let catData: any = null;

  if (actualId) {
    const { data, error } = await supabase
      .from('categories')
      .update({ name: formattedName, type: 'category' })
      .eq('id', actualId)
      .select('*')
      .single();
    if (error) throw error;
    catData = data;
  } else {
    let uniqueSlug = normalizeSlug(formattedName);
    try {
      uniqueSlug = await resolveUniqueSlug(supabase, 'categories', uniqueSlug);
    } catch {
      /* Mantém o fallback usado pelo cadastro do ERP quando a consulta de colisões falha. */
    }
    const { data, error } = await supabase
      .from('categories')
      .insert([
        {
          name: formattedName,
          type: 'category',
          slug: uniqueSlug,
          meta_title: `${trimmed} | Móveis Morante`,
        },
      ])
      .select('*')
      .single();
    if (error) throw error;
    catData = data;
    actualId = data.id;
  }

  // Sincronizar relacionamentos com ambientes se array foi fornecido
  if (Array.isArray(environmentIdsOrId) && actualId) {
    if (!isCreating) {
      const { error: relDelErr } = await supabase
        .from('category_relationships')
        .delete()
        .eq('child_id', actualId);
      if (relDelErr) throw relDelErr;
    }

    if (envIds.length > 0) {
      const links = envIds.map((eid) => ({ parent_id: eid, child_id: actualId }));
      const { error: relInsErr } = await supabase.from('category_relationships').insert(links);
      if (relInsErr) throw relInsErr;
    }
  }

  // Sincronizar características se fornecidas
  if (attributes !== undefined && actualId) {
    if (!isCreating) {
      const { error: attrDelErr } = await supabase
        .from('category_attributes')
        .delete()
        .eq('category_id', actualId);
      if (attrDelErr) throw attrDelErr;
    }

    const uniqueAttributes = [
      ...new Map(attributes.map((attribute) => [attribute.id, attribute] as const)).values(),
    ];
    if (uniqueAttributes.length > 0) {
      const attrLinks = uniqueAttributes.map((attribute) => ({
        category_id: actualId,
        attribute_id: attribute.id,
        is_required: resolveCategoryAttributeIsRequired(attribute),
      }));
      const { error: attrInsErr } = await supabase.from('category_attributes').insert(attrLinks);
      if (attrInsErr) throw attrInsErr;
    }
  }

  return catData;
};

export const deleteMobileCategory = async (id: string): Promise<void> => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error('Identificador de categoria inválido. Atualize a lista e tente novamente.');
  }

  const [relationCheck, directCheck] = await Promise.all([
    supabase
      .from('product_categories')
      .select('product_id', { count: 'exact', head: true })
      .eq('category_id', id),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('category_id', id),
  ]);
  if (relationCheck.error) throw relationCheck.error;
  if (directCheck.error) throw directCheck.error;
  const totalLinked = (relationCheck.count || 0) + (directCheck.count || 0);
  if (totalLinked > 0) {
    const [relationRows, directRows] = await Promise.all([
      supabase.from('product_categories').select('product_id').eq('category_id', id),
      supabase.from('products').select('id').eq('category_id', id),
    ]);
    if (relationRows.error) throw relationRows.error;
    if (directRows.error) throw directRows.error;

    const distinctCount =
      countDistinctProductsByCategory([
        ...(relationRows.data || []).map((row: { product_id: string }) => ({
          categoryId: id,
          productId: row.product_id,
        })),
        ...(directRows.data || []).map((row: { id: string }) => ({
          categoryId: id,
          productId: row.id,
        })),
      ])[id] || totalLinked;
    throw new Error(
      `Não é possível excluir esta categoria porque ela está sendo utilizada por ${distinctCount} produto${distinctCount > 1 ? 's' : ''}. Remova ou altere a categoria desses produtos antes de excluí-la.`
    );
  }

  const { error: attrError } = await supabase
    .from('category_attributes')
    .delete()
    .eq('category_id', id);
  if (attrError) throw attrError;

  const { error: relationError } = await supabase
    .from('category_relationships')
    .delete()
    .eq('child_id', id);
  if (relationError) throw relationError;

  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
};
