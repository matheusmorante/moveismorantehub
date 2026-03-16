import { supabase } from '@/pages/utils/supabaseConfig';

export type Category = {
    id: string;
    name: string;
    active: boolean;
};

export type CategoryGroup = {
    id: string;
    name: string;
    active: boolean;
};

export type ProductGroupRelation = {
    groupId: string;
    categoryId: string;
};

export const fetchGroupsAndCategories = async () => {
    // Busca grupos
    const { data: groupsData, error: groupsErr } = await supabase
        .from('category_groups')
        .select('*')
        .order('name');

    // Busca categorias
    const { data: catsData, error: catsErr } = await supabase
        .from('categories')
        .select('*')
        .order('name');

    // Busca relações
    const { data: relData, error: relErr } = await supabase
        .from('category_group_links')
        .select('*');

    if (groupsErr) console.error("Erro grupos:", groupsErr);
    if (catsErr) console.error("Erro categorias:", catsErr);
    if (relErr) console.error("Erro relacoes:", relErr);

    return {
        groups: groupsData || [],
        categories: catsData || [],
        relations: relData ? relData.map(r => ({ groupId: r.group_id, categoryId: r.category_id })) : []
    };
};

export const createGroup = async (name: string) => {
    const { data, error } = await supabase.from('category_groups').insert([{ name, active: true }]).select();
    if (error) throw error;
    return data[0];
};

export const updateGroup = async (id: string, name: string) => {
    const { error } = await supabase.from('category_groups').update({ name }).eq('id', id);
    if (error) throw error;
};

export const deleteGroup = async (id: string) => {
    const { error } = await supabase.from('category_groups').delete().eq('id', id);
    if (error) throw error;
};

export const createCategory = async (name: string, parentIds: string[]) => {
    const { data, error } = await supabase.from('categories').insert([{ name, active: true }]).select();
    if (error) throw error;

    if (parentIds.length > 0) {
        const links = parentIds.map(pid => ({ group_id: pid, category_id: data[0].id }));
        await supabase.from('category_group_links').insert(links);
    }

    return data[0];
};

export const updateCategory = async (id: string, name: string, parentIds: string[]) => {
    const { error } = await supabase.from('categories').update({ name }).eq('id', id);
    if (error) throw error;

    // Replace links
    await supabase.from('category_group_links').delete().eq('category_id', id);

    if (parentIds.length > 0) {
        const links = parentIds.map(pid => ({ group_id: pid, category_id: id }));
        await supabase.from('category_group_links').insert(links);
    }
};

export const deleteCategory = async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
};

export const getCategoryBreadcrumb = (categoryIds: string[], tree: { groups: any[], categories: any[], relations: any[] }) => {
    if (!tree || !categoryIds || categoryIds.length === 0) return "-";

    const paths = categoryIds.map(cid => {
        const cat = tree.categories.find(c => c.id === cid);
        if (!cat) return null;

        const parentGroups = tree.relations
            .filter(r => r.categoryId === cid)
            .map(r => tree.groups.find(g => g.id === r.groupId)?.name)
            .filter(Boolean)
            .sort(); // Alphabetical sort for consistency

        if (parentGroups.length > 0) {
            return `${parentGroups.join(', ')} > ${cat.name}`;
        }
        return cat.name;
    }).filter(Boolean);

    return paths.join(' | ') || "-";
};
