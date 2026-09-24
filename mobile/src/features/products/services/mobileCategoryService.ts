import { supabase } from '../../../services/supabaseClient';

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

export const fetchMobileEnvironments = async (): Promise<MobileEnvironment[]> => {
  const { data: envs, error } = await supabase.from('categories').select('*').eq('type', 'environment').order('name');
  if (error) throw error;
  const { data: links, error: linksError } = await supabase.from('category_relationships').select('parent_id, child_id');
  if (linksError) throw linksError;
  return (envs || []).map((env: any) => ({
    ...env,
    categoryIds: (links || []).filter((link: any) => link.parent_id === env.id).map((link: any) => link.child_id),
  }));
};

export const saveMobileEnvironment = async (name: string, categoryIds: string[], id?: string) => {
  const trimmed = name.trim();
  if (!trimmed) return null;
  let environmentId = id;
  if (id) {
    const { data, error } = await supabase.from('categories').update({ name: trimmed, type: 'environment', updated_at: new Date().toISOString() }).eq('id', id).select('*').single();
    if (error) throw error;
    environmentId = data.id;
  } else {
    const { data, error } = await supabase.from('categories').insert([{ name: trimmed, type: 'environment', active: true }]).select('*').single();
    if (error) throw error;
    environmentId = data.id;
  }
  const { error: deleteError } = await supabase.from('category_relationships').delete().eq('parent_id', environmentId);
  if (deleteError) throw deleteError;
  if (categoryIds.length > 0) {
    const { error: insertError } = await supabase.from('category_relationships').insert(categoryIds.map(child_id => ({ parent_id: environmentId, child_id })));
    if (insertError) throw insertError;
  }
  return environmentId;
};

export const deleteMobileEnvironment = async (id: string) => {
  const { count, error: relationError } = await supabase.from('category_relationships').select('child_id', { count: 'exact', head: true }).eq('parent_id', id);
  if (relationError) throw relationError;
  if ((count || 0) > 0) throw new Error('Desvincule as categorias antes de excluir este ambiente.');
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
};

export const fetchMobileCategories = async (): Promise<MobileCategory[]> => {
  try {
    const { data: catsData, error: catsErr } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (catsErr) {
      console.warn('[MobileCategoryService] Erro ao buscar categorias:', catsErr);
      return [];
    }

    const { data: relData, error: relErr } = await supabase
      .from('category_relationships')
      .select('parent_id, child_id');

    if (relErr) {
      console.warn('[MobileCategoryService] Erro ao buscar relacoes:', relErr);
    }

    const categoriesWithParents = (catsData || [])
      .filter((cat: any) => cat.type !== 'environment')
      .map((cat: any) => ({
        ...cat,
        parents: relData?.filter((r: any) => r.child_id === cat.id).map((r: any) => r.parent_id) || []
      }));

    return categoriesWithParents;
  } catch (err) {
    console.error('[MobileCategoryService] Exceção:', err);
    return [];
  }
};

export const fetchMobileCategoryProductCounts = async (): Promise<Record<string, number>> => {
  try {
    const [pcRes, prodRes] = await Promise.all([
      supabase.from('product_categories').select('category_id, product_id'),
      supabase.from('products').select('id, category_id').not('category_id', 'is', null)
    ]);

    const countsMap: Record<string, Set<string>> = {};

    (pcRes.data || []).forEach((row: { category_id: string; product_id: string }) => {
      if (row.category_id && row.product_id) {
        if (!countsMap[row.category_id]) countsMap[row.category_id] = new Set<string>();
        countsMap[row.category_id].add(String(row.product_id));
      }
    });

    (prodRes.data || []).forEach((row: { id: string; category_id: string }) => {
      if (row.category_id && row.id) {
        if (!countsMap[row.category_id]) countsMap[row.category_id] = new Set<string>();
        countsMap[row.category_id].add(String(row.id));
      }
    });

    const result: Record<string, number> = {};
    Object.keys(countsMap).forEach(key => {
      result[key] = countsMap[key].size;
    });

    return result;
  } catch (err) {
    console.warn('[MobileCategoryService] Erro ao buscar contagem de produtos:', err);
    return {};
  }
};

export const fetchMobileCategoryRequiredAttributes = async (categoryId: string): Promise<{ id: string; name: string }[]> => {
  try {
    const { data, error } = await supabase
      .from('category_attributes')
      .select(`
        attribute_id,
        attributes (
          id,
          name
        )
      `)
      .eq('category_id', categoryId);

    if (error) throw error;

    return (data || []).flatMap((row: any) => {
      const attr = Array.isArray(row.attributes) ? row.attributes[0] : row.attributes;
      return attr ? [{ id: String(attr.id), name: attr.name }] : [];
    });
  } catch (err) {
    console.warn('[MobileCategoryService] Erro ao buscar atributos da categoria:', err);
    return [];
  }
};

export const unlinkMobileCategoryFromEnvironment = async (environmentId: string, categoryId: string): Promise<void> => {
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
  attributeIds?: string[],
  id?: string
): Promise<MobileCategory | null> => {
  const trimmed = name.trim();
  if (!trimmed) return null;

  // Tratar sobrecarga: se o segundo parâmetro for string, é o id antigo
  let actualId: string | undefined = id;
  let envIds: string[] = [];

  if (typeof environmentIdsOrId === 'string') {
    actualId = environmentIdsOrId;
  } else if (Array.isArray(environmentIdsOrId)) {
    envIds = environmentIdsOrId;
  }

  let catData: any = null;

  if (actualId) {
    const { data, error } = await supabase
      .from('categories')
      .update({ name: trimmed, type: 'category', updated_at: new Date().toISOString() })
      .eq('id', actualId)
      .select('*')
      .single();
    if (error) throw error;
    catData = data;
  } else {
    const { data, error } = await supabase
      .from('categories')
      .insert([{ name: trimmed, type: 'category', active: true, created_at: new Date().toISOString() }])
      .select('*')
      .single();
    if (error) throw error;
    catData = data;
    actualId = data.id;
  }

  // Sincronizar relacionamentos com ambientes se array foi fornecido
  if (Array.isArray(environmentIdsOrId) && actualId) {
    const { error: relDelErr } = await supabase
      .from('category_relationships')
      .delete()
      .eq('child_id', actualId);
    if (relDelErr) throw relDelErr;

    if (envIds.length > 0) {
      const links = envIds.map(eid => ({ parent_id: eid, child_id: actualId }));
      const { error: relInsErr } = await supabase.from('category_relationships').insert(links);
      if (relInsErr) throw relInsErr;
    }
  }

  // Sincronizar atributos se fornecido
  if (attributeIds !== undefined && actualId) {
    const { error: attrDelErr } = await supabase
      .from('category_attributes')
      .delete()
      .eq('category_id', actualId);
    if (attrDelErr) throw attrDelErr;

    const uniqueAttrIds = [...new Set(attributeIds)];
    if (uniqueAttrIds.length > 0) {
      const attrLinks = uniqueAttrIds.map(attrId => ({
        category_id: actualId,
        attribute_id: attrId,
        is_required: true,
      }));
      const { error: attrInsErr } = await supabase.from('category_attributes').insert(attrLinks);
      if (attrInsErr) throw attrInsErr;
    }
  }

  return catData;
};

export const deleteMobileCategory = async (id: string): Promise<void> => {
  const [relationCheck, directCheck] = await Promise.all([
    supabase.from('product_categories').select('product_id', { count: 'exact', head: true }).eq('category_id', id),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('category_id', id),
  ]);
  if (relationCheck.error) throw relationCheck.error;
  if (directCheck.error) throw directCheck.error;
  const count = (relationCheck.count || 0) + (directCheck.count || 0);
  if (count > 0) {
    throw new Error(`Não é possível excluir esta categoria porque ela está sendo utilizada por ${count} produto${count > 1 ? 's' : ''}. Remova ou altere os vínculos antes de excluí-la.`);
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

