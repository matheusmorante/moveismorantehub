import { supabase } from '@/pages/utils/supabaseConfig';

export type Category = {
    id: string;
    name: string;
    active: boolean;
    parents?: string[]; // IDs da categorias pai
    slug?: string;
    meta_title?: string;
    meta_description?: string;
    seo_description?: string;
};

export type ProductGroupRelation = {
    groupId: string;
    categoryId: string;
};

export const fetchGroupsAndCategories = async () => {
    // Busca todas as categorias
    const { data: catsData, error: catsErr } = await supabase
        .from('categories')
        .select('*')
        .order('name');

    // Busca relações N-N
    const { data: relData, error: relErr } = await supabase
        .from('category_relationships')
        .select('parent_id, child_id');

    if (catsErr) console.error("Erro categorias:", catsErr);
    if (relErr) console.error("Erro relacoes:", relErr);

    // Mapeia pais para cada categoria
    const categoriesWithParents = (catsData || []).map((cat: any) => ({
        ...cat,
        parents: relData?.filter((r: any) => r.child_id === cat.id).map((r: any) => r.parent_id) || []
    }));

    return {
        categories: categoriesWithParents,
        relations: relData ? relData.map((r: any) => ({ parentId: r.parent_id, childId: r.child_id })) : []
    };
};

// Funções de Group removidas - Tudo é categoria agora

export const generateSlug = (name: string) => {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^a-z0-9]/g, '-') // Remove caracteres especiais
        .replace(/-+/g, '-') // Remove hífens duplicados
        .replace(/^-|-$/g, ''); // Remove hífens no início/fim
};

export const createCategory = async (name: string, parentIds: string[], seoFields?: Partial<Category>) => {
    const insertData = { 
        name, 
        active: true,
        slug: seoFields?.slug || generateSlug(name),
        meta_title: seoFields?.meta_title,
        meta_description: seoFields?.meta_description,
        seo_description: seoFields?.seo_description
    };

    let { data, error } = await supabase.from('categories').insert([insertData]).select();
    
    // Fail-safe: If insert fails due to missing columns (SEO fields)
    if (error && (error.message?.includes("column") || error.code === '42703' || error.message?.includes("schema cache"))) {
        console.warn("[CategoryService] Schema issue on insert. Retrying with basic fields...");
        const basicData = { name, active: true };
        const { data: retryData, error: retryError } = await supabase.from('categories').insert([basicData]).select();
        data = retryData;
        error = retryError;
    }

    if (error) throw error;
    if (!data) throw new Error("No data returned from category creation");

    if (parentIds && parentIds.length > 0) {
        const links = parentIds.map(pid => ({ parent_id: pid, child_id: data![0].id }));
        const { error: insError } = await supabase.from('category_relationships').insert(links);
        if (insError) throw insError;
    }

    return data[0];
};

export const updateCategory = async (id: string, name: string, parentIds: string[], seoFields?: Partial<Category>) => {
    const updateData: any = { name };
    if (seoFields) {
        if (seoFields.slug) updateData.slug = seoFields.slug;
        if (seoFields.meta_title) updateData.meta_title = seoFields.meta_title;
        if (seoFields.meta_description) updateData.meta_description = seoFields.meta_description;
        if (seoFields.seo_description) updateData.seo_description = seoFields.seo_description;
    }

    let { error } = await supabase.from('categories').update(updateData).eq('id', id);
    
    // Fail-safe: Retry without SEO fields if they don't exist
    if (error && (error.message?.includes("column") || error.code === '42703' || error.message?.includes("schema cache"))) {
        console.warn("[CategoryService] Schema issue on update. Retrying with basic name...");
        const { error: retryError } = await supabase.from('categories').update({ name }).eq('id', id);
        error = retryError;
    }

    if (error) throw error;

    // Replace links
    const { error: delError } = await supabase.from('category_relationships').delete().eq('child_id', id);
    if (delError) throw delError;

    if (parentIds && parentIds.length > 0) {
        const links = parentIds.map(pid => ({ parent_id: pid, child_id: id }));
        const { error: insError } = await supabase.from('category_relationships').insert(links);
        if (insError) throw insError;
    }
};

export const deleteCategory = async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
};

export const updateCategoryChildren = async (parentId: string, childIds: string[]) => {
    // 1. Remove todos os vínculos onde este ambiente é o pai
    const { error: delErr } = await supabase
        .from('category_relationships')
        .delete()
        .eq('parent_id', parentId);
    
    if (delErr) throw delErr;

    // 2. Adiciona os novos vínculos
    if (childIds.length > 0) {
        const links = childIds.map(cid => ({ parent_id: parentId, child_id: cid }));
        const { error: insErr } = await supabase
            .from('category_relationships')
            .insert(links);
        
        if (insErr) throw insErr;
    }
};


export const getCategoryBreadcrumb = (categoryIds: string[], tree: { categories: any[], relations: any[] }) => {
    if (!tree || !categoryIds || categoryIds.length === 0) return "-";

    const paths = categoryIds.map(cid => {
        const cat = tree.categories.find(c => c.id === cid);
        if (!cat) return null;

        const parents = tree.categories.filter(p => p.parents?.includes(cid)); // This logic seems inverted based on cid as child
        // Correct logic: find parents of cid
        const myParents = tree.relations
            .filter(r => r.childId === cid)
            .map(r => tree.categories.find(c => c.id === r.parentId)?.name)
            .filter(Boolean)
            .sort();

        if (myParents.length > 0) {
            return `${myParents.join(', ')} > ${cat.name}`;
        }
        return cat.name;
    }).filter(Boolean);

    return paths.join(' | ') || "-";
};
