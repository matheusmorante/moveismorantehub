import { normalizeSearchTerm } from '@/pages/utils/textUtils';

export interface ProductCategoryOption {
    id: string;
    name: string;
    parents?: string[];
}

export function filterProductSelectableCategories(categories: ProductCategoryOption[]): ProductCategoryOption[] {
    return categories.filter(category => {
        // Agora, um "Ambiente" é simplesmente qualquer categoria raiz na listagem unificada de retrocompatibilidade
        // que possua filhos (outras categorias apontando para ele).
        // Se a categoria não tiver pais e tiver filhos, ela é um Ambiente e não pode ser selecionada diretamente no produto.
        const hasChildren = categories.some(other => other.parents?.includes(category.id));
        const isRootCategory = !category.parents || category.parents.length === 0;
        const isEnvironment = isRootCategory; // Todos os nós sem pai (raízes) na listagem atual vinda de fetchGroupsAndCategories são Ambientes!

        return !isEnvironment; // Retorna apenas as categorias selecionáveis (que têm pai(s))
    });
}

export function searchProductCategories(
    selectableCategories: ProductCategoryOption[],
    allCategories: ProductCategoryOption[],
    searchTerm: string,
): ProductCategoryOption[] {
    const term = normalizeSearchTerm(searchTerm);
    if (term.length < 2) {
        return [];
    }

    return selectableCategories.filter(cat => {
        const catNameMatches = normalizeSearchTerm(cat.name).includes(term);
        if (catNameMatches) return true;

        const parentNames = (cat.parents || [])
            .map(pid => allCategories.find(item => item.id === pid)?.name || '')
            .filter(Boolean);

        return parentNames.some(pName => normalizeSearchTerm(pName).includes(term));
    });
}

export function getProductCategoryRootNames(
    categoryIds: string[],
    categories: ProductCategoryOption[],
): string[] {
    const roots = new Set<string>();
    const visited = new Set<string>();

    function findRoot(categoryId: string) {
        if (visited.has(categoryId)) return;
        visited.add(categoryId);

        const category = categories.find(item => item.id === categoryId);
        if (!category) return;
        if (!category.parents || category.parents.length === 0) {
            roots.add(category.name);
            return;
        }

        category.parents.forEach(findRoot);
    }

    categoryIds.forEach(findRoot);
    return Array.from(roots);
}
