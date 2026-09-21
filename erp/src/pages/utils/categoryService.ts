import { ecommerceSupabase as supabase } from '@/pages/utils/supabaseConfig';
import { toTitleCase } from './textUtils';
import { normalizeSlug, resolveUniqueSlug } from './uniqueSlug';

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
            console.error('[CategoryService] Erro ao buscar category_relationships para environments:', relErr);
            return envsData || [];
        }

        return (envsData || []).map((env: any) => ({
            ...env,
            categories: (rels || [])
                .filter((r: any) => r.parent_id === env.id)
                .map((r: any) => r.child_id)
        }));
    } catch (err) {
        console.error('[CategoryService] Exceção em fetchEnvironments:', err);
        return [];
    }
};

/**
 * Busca todas as categorias de produtos (type = 'category')
 * e popula seus ambientes associados a partir de category_relationships.
 */
export const fetchCategories = async (): Promise<Category[]> => {
    try {
        const { data: catsData, error: catsErr } = await supabase
            .from('categories')
            .select('*')
            .eq('type', 'category')
            .order('name');

        if (catsErr) {
            console.error('[CategoryService] Erro ao buscar categories:', catsErr);
            return [];
        }

        const { data: rels, error: relErr } = await supabase
            .from('category_relationships')
            .select('parent_id, child_id');

        if (relErr) {
            console.error('[CategoryService] Erro ao buscar category_relationships para categories:', relErr);
            return catsData || [];
        }

        return (catsData || []).map((cat: any) => ({
            ...cat,
            parents: (rels || [])
                .filter((r: any) => r.child_id === cat.id)
                .map((r: any) => r.parent_id)
        }));
    } catch (err) {
        console.error('[CategoryService] Exceção em fetchCategories:', err);
        return [];
    }
};

/**
 * Retrocompatibilidade para quem ainda chama fetchGroupsAndCategories (ex: cadastro de produtos).
 */
export const fetchGroupsAndCategories = async () => {
    const [envs, cats] = await Promise.all([fetchEnvironments(), fetchCategories()]);
    const combined = [
        ...envs.map(e => ({ ...e, parents: [] })), // Ambientes não possuem pai
        ...cats
    ];
    return {
        categories: combined,
        relations: []
    };
};

export const generateSlug = (name: string) => {
    return normalizeSlug(name);
};

export const createCategory = async (name: string, environmentIds: string[], requiredAttributeIds?: string[], seoFields?: Partial<Category>) => {
    const formattedName = toTitleCase(name);
    let uniqueSlug = normalizeSlug(seoFields?.slug || formattedName);
    try {
        uniqueSlug = await resolveUniqueSlug(supabase, 'categories', uniqueSlug);
    } catch { }

    const insertData: any = {
        name: formattedName,
        slug: uniqueSlug,
        type: 'category'
    };
    if (seoFields?.meta_title) insertData.meta_title = seoFields.meta_title;
    if (seoFields?.meta_description) insertData.meta_description = seoFields.meta_description;
    if (seoFields?.seo_description) insertData.seo_description = seoFields.seo_description;

    const { data, error } = await supabase.from('categories').insert([insertData]).select();
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Falha ao criar categoria.');

    const newCatId = data[0].id;
    if (environmentIds && environmentIds.length > 0) {
        const links = environmentIds.map(eid => ({ parent_id: eid, child_id: newCatId }));
        const { error: insError } = await supabase.from('category_relationships').insert(links);
        if (insError) throw insError;
    }

    const uniqueRequiredAttributeIds = [...new Set(requiredAttributeIds || [])];
    if (uniqueRequiredAttributeIds.length > 0) {
        const attrLinks = uniqueRequiredAttributeIds.map(attrId => ({
            category_id: newCatId,
            attribute_id: attrId,
            is_required: true
        }));
        const { error: attrError } = await supabase.from('category_attributes').insert(attrLinks);
        if (attrError) throw attrError;
    }

    return data[0];
};

export const updateCategory = async (id: string, name: string, environmentIds: string[], requiredAttributeIds?: string[], seoFields?: Partial<Category>) => {
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
    const { error: delError } = await supabase.from('category_relationships').delete().eq('child_id', id);
    if (delError) throw delError;

    if (environmentIds && environmentIds.length > 0) {
        const links = environmentIds.map(eid => ({ parent_id: eid, child_id: id }));
        const { error: insError } = await supabase.from('category_relationships').insert(links);
        if (insError) throw insError;
    }

    // Atualiza relacionamentos em category_attributes (se fornecido explicitamente)
    if (requiredAttributeIds !== undefined) {
        const { error: delAttrError } = await supabase.from('category_attributes').delete().eq('category_id', id);
        if (delAttrError) throw delAttrError;

        const uniqueRequiredAttributeIds = [...new Set(requiredAttributeIds)];
        if (uniqueRequiredAttributeIds.length > 0) {
            const attrLinks = uniqueRequiredAttributeIds.map(attrId => ({
                category_id: id,
                attribute_id: attrId,
                is_required: true
            }));
            const { error: insAttrError } = await supabase.from('category_attributes').insert(attrLinks);
            if (insAttrError) throw insAttrError;
        }
    }
};

/**
 * Busca atributos obrigatórios vinculados a uma categoria.
 */
export const fetchCategoryRequiredAttributes = async (categoryId: string): Promise<{ id: string; name: string }[]> => {
    const { data, error } = await supabase
        .from('category_attributes')
        .select(`
            attribute_id,
            attributes (
                id,
                name
            )
        `)
        .eq('category_id', categoryId)
        .eq('is_required', true);

    if (error) throw error;

    type AttributeRelation = { id: string; name: string };
    type RequiredAttributeRow = {
        attribute_id: string;
        attributes: AttributeRelation | AttributeRelation[] | null;
    };

    return ((data || []) as RequiredAttributeRow[]).flatMap(row => {
        const attribute = Array.isArray(row.attributes) ? row.attributes[0] : row.attributes;
        return attribute ? [{ id: attribute.id, name: attribute.name }] : [];
    });
};

/**
 * Consulta agregada e deduplicada da quantidade de produtos vinculados a cada categoria.
 */
export const fetchCategoryProductCounts = async (): Promise<Record<string, number>> => {
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
        Object.entries(countsMap).forEach(([catId, set]) => {
            result[catId] = set.size;
        });

        return result;
    } catch (err) {
        console.error('[CategoryService] Erro ao buscar contagem de produtos por categoria:', err);
        return {};
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
        supabase.from('product_categories').select('product_id', { count: 'exact', head: true }).eq('category_id', id),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('category_id', id)
    ]);

    const totalLinked = (pcCheck.count || 0) + (prodCheck.count || 0);
    if (totalLinked > 0) {
        const distinctProductIds = new Set<string>();
        const [pcRows, prodRows] = await Promise.all([
            supabase.from('product_categories').select('product_id').eq('category_id', id),
            supabase.from('products').select('id').eq('category_id', id)
        ]);
        (pcRows.data || []).forEach((r: any) => r.product_id && distinctProductIds.add(String(r.product_id)));
        (prodRows.data || []).forEach((r: any) => r.id && distinctProductIds.add(String(r.id)));

        const finalCount = distinctProductIds.size || totalLinked;
        throw new Error(
            `Não é possível excluir esta categoria porque ela está sendo utilizada por ${finalCount} produto${finalCount > 1 ? 's' : ''}. Remova ou altere a categoria desses produtos antes de excluí-la.`
        );
    }

    // 2. Se não há produtos, remover com segurança os relacionamentos N:N em category_relationships
    const { error: relError } = await supabase.from('category_relationships').delete().eq('child_id', id);
    if (relError) throw relError;

    // 3. Excluir a categoria
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
};

// --------- AMBIENTES ---------

export const createEnvironment = async (name: string, categoryIds: string[]) => {
    const formattedName = toTitleCase(name.trim());
    let uniqueSlug = normalizeSlug(formattedName);
    try {
        uniqueSlug = await resolveUniqueSlug(supabase, 'categories', uniqueSlug);
    } catch { }

    const { data, error } = await supabase
        .from('categories')
        .insert([{ name: formattedName, type: 'environment', slug: uniqueSlug }])
        .select();

    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Falha ao criar ambiente.');

    const newEnvId = data[0].id;
    if (categoryIds && categoryIds.length > 0) {
        const links = categoryIds.map(cid => ({ parent_id: newEnvId, child_id: cid }));
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
    const { error: delError } = await supabase.from('category_relationships').delete().eq('parent_id', id);
    if (delError) throw delError;

    if (categoryIds && categoryIds.length > 0) {
        const links = categoryIds.map(cid => ({ parent_id: id, child_id: cid }));
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

export const getCategoryBreadcrumb = (categoryIds: string[], tree: { categories: any[], relations: any[] }) => {
    if (!tree || !tree.categories || !categoryIds || categoryIds.length === 0) return '';
    const names = categoryIds.map(cid => {
        const cat = tree.categories.find(c => String(c.id) === String(cid));
        return cat ? cat.name : null;
    }).filter(Boolean);
    return names.join(' | ') || '';
};
