import { supabase } from '@/pages/utils/supabaseConfig';
import { removeAccents, buildAccentInsensitiveRegex } from '../textUtils';

export interface ProductQueryFilterOptions {
    showTrash?: boolean;
    search?: string;
    category?: string;
    activeOnly?: boolean;
    status?: string;
    isDraft?: boolean;
    includeDeactivated?: boolean;
    supplierId?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface ProductPaginationOptions {
    orderColumn: string;
    ascending: boolean;
    from: number;
    to: number;
}

/**
 * Aplica os filtros e ordenação na query Supabase do catálogo de produtos e executa a busca
 */
export const applyProductFiltersAndSort = async (
    query: any,
    options?: ProductQueryFilterOptions,
    pagination?: ProductPaginationOptions
): Promise<any> => {
    let q = query.eq('deleted', false);

    // Rascunhos agora aparecem na listagem normal por padrão
    if (options?.isDraft === true) {
        q = q.or('is_draft.eq.true,status.eq.draft');
    } else if (options?.isDraft === false) {
        q = q.not('is_draft', 'is', true).neq('status', 'draft');
    }

    if (options?.activeOnly === false) {
        q = q.eq('active', false);
    } else if (options?.activeOnly === true) {
        q = q.eq('active', true);
    } else if (options?.includeDeactivated === false) {
        // Rascunhos não são produtos desativados: permanecem acessíveis no
        // fluxo de cadastro, enquanto os desativados ficam ocultos.
        q = q.or('active.eq.true,is_draft.eq.true,status.eq.draft');
    }

    // Filtro de busca textual — busca EXCLUSIVAMENTE pelo nome do produto (name) na tabela de produtos e variações (insensível a acentos)
    if (options?.search) {
        const rawSearch = options.search.trim().replace(/[(),]/g, ' ').replace(/[%_]/g, '');
        if (rawSearch.length > 0) {
            const unaccented = removeAccents(rawSearch);
            const searchTerms = Array.from(new Set([rawSearch, unaccented])).filter(Boolean);
            const regexPattern = `.*${buildAccentInsensitiveRegex(rawSearch)}.*`;

            // 1. Buscar variações pelo campo 'name' na tabela product_variations
            let variationParentIds: string[] = [];
            try {
                const varOrList = [
                    `name.imatch.${regexPattern}`,
                    ...searchTerms.map(t => `name.ilike.%${t}%`)
                ];
                const { data: matchedVariations } = await supabase
                    .from('product_variations')
                    .select('product_id')
                    .or(varOrList.join(','))
                    .limit(100);

                if (matchedVariations && matchedVariations.length > 0) {
                    variationParentIds = Array.from(new Set(
                        matchedVariations.map(v => v.product_id).filter(Boolean)
                    ));
                }
            } catch (e) {
                console.warn('[ProductService] Erro ao buscar em product_variations:', e);
            }

            // 2. Montar filtro or com o campo name dos produtos e os IDs de variações
            const orConditions: string[] = [];
            orConditions.push(`name.imatch.${regexPattern}`);
            searchTerms.forEach(t => {
                orConditions.push(`name.ilike.%${t}%`);
            });

            if (variationParentIds.length > 0) {
                variationParentIds.forEach(id => {
                    orConditions.push(`id.eq.${id}`);
                });
            }

            q = q.or(orConditions.join(','));
        }
    }

    // Filtro de categoria
    if (options?.category && options.category !== 'Serviços' && options.category !== 'Produtos') {
        q = q.eq('category', options.category);
    } else if (options?.category === 'Serviços') {
        q = q.eq('item_type', 'service');
    } else if (options?.category === 'Produtos') {
        q = q.eq('item_type', 'product');
    }

    // Filtro por status do catálogo digital (ex: 'published', 'hidden')
    if (options?.status) {
        q = q.eq('status', options.status);
    }

    if (pagination) {
        q = q.order(pagination.orderColumn, { ascending: pagination.ascending })
             .range(pagination.from, pagination.to);
    }

    return await q;
};

