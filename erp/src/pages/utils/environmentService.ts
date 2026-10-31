import { ecommerceSupabase as supabase } from '@/pages/utils/supabaseConfig';
import { toTitleCase } from './textUtils';
import { normalizeSlug, resolveUniqueSlug } from './uniqueSlug';

export type Environment = {
  id: string;
  name: string;
  slug?: string;
  type?: string;
  image_url?: string;
  categories?: string[]; // IDs das categorias vinculadas
};

/**
 * Busca todos os ambientes cadastrados na tabela categories (type = 'environment')
 * e popula suas categorias filhas a partir de category_relationships.
 */
export const fetchEnvironments = async (): Promise<Environment[]> => {
  try {
    const { data: envsData, error: envsErr } = await supabase
      .from('categories')
      .select('*')
      .eq('type', 'environment')
      .order('name');

    if (envsErr) {
      console.error('[CategoryService] Erro ao buscar environments:', envsErr);
      return [];
    }

    const { data: rels, error: relErr } = await supabase
      .from('category_relationships')
      .select('parent_id, child_id');

    if (relErr) {
      console.error(
        '[CategoryService] Erro ao buscar category_relationships para environments:',
        relErr
      );
      return envsData || [];
    }

    return (envsData || []).map((env: any) => ({
      ...env,
      categories: (rels || [])
        .filter((r: any) => r.parent_id === env.id)
        .map((r: any) => r.child_id),
    }));
  } catch (err) {
    console.error('[CategoryService] Exceção em fetchEnvironments:', err);
    return [];
  }
};

// --------- AMBIENTES ---------

export const createEnvironment = async (name: string, categoryIds: string[]) => {
  const formattedName = toTitleCase(name.trim());
  let uniqueSlug = normalizeSlug(formattedName);
  try {
    uniqueSlug = await resolveUniqueSlug(supabase, 'categories', uniqueSlug);
  } catch {
    /* no-op: intencionalmente silencioso */
  }

  const { data, error } = await supabase
    .from('categories')
    .insert([{ name: formattedName, type: 'environment', slug: uniqueSlug }])
    .select();

  if (error) throw error;
  if (!data || data.length === 0) throw new Error('Falha ao criar ambiente.');

  const newEnvId = data[0].id;
  if (categoryIds && categoryIds.length > 0) {
    const links = categoryIds.map((cid) => ({ parent_id: newEnvId, child_id: cid }));
    const { error: insError } = await supabase.from('category_relationships').insert(links);
    if (insError) throw insError;
  }
  return data[0];
};

export const updateEnvironment = async (id: string, name: string, categoryIds: string[]) => {
  const formattedName = toTitleCase(name.trim());
  const { error } = await supabase
    .from('categories')
    .update({ name: formattedName, type: 'environment' })
    .eq('id', id);

  if (error) throw error;

  // Atualiza relacionamentos em category_relationships
  const { error: delError } = await supabase
    .from('category_relationships')
    .delete()
    .eq('parent_id', id);
  if (delError) throw delError;

  if (categoryIds && categoryIds.length > 0) {
    const links = categoryIds.map((cid) => ({ parent_id: id, child_id: cid }));
    const { error: insError } = await supabase.from('category_relationships').insert(links);
    if (insError) throw insError;
  }
};

/**
 * Exclusão Segura de Ambiente:
 * - Só pode ser excluído quando linkedCategoriesCount === 0.
 * - Quantidade de produtos NÃO determina a exclusão do ambiente.
 */
export const deleteEnvironment = async (id: string) => {
  // 1. Validação atômica de concorrência: verificar se possui categorias vinculadas
  const { count, error: checkError } = await supabase
    .from('category_relationships')
    .select('child_id', { count: 'exact', head: true })
    .eq('parent_id', id);

  if (checkError) throw checkError;

  if (count && count > 0) {
    throw new Error(
      `Não é possível excluir este ambiente porque ele possui ${count} categoria${count > 1 ? 's vinculadas' : ' vinculada'}. Desvincule as categorias antes de excluir o ambiente.`
    );
  }

  // 2. Excluir o ambiente da tabela categories
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
};

/**
 * Desvincular Categoria de Ambiente:
 * Remove apenas a linha correspondente em category_relationships.
 * NÃO exclui nem a categoria nem o ambiente.
 */
export const unlinkCategoryFromEnvironment = async (environmentId: string, categoryId: string) => {
  const { error } = await supabase
    .from('category_relationships')
    .delete()
    .eq('parent_id', environmentId)
    .eq('child_id', categoryId);

  if (error) throw error;
};
