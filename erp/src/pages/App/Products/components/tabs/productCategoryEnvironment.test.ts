import { describe, expect, it } from 'vitest';
import {
    filterProductSelectableCategories,
    getProductCategoryRootNames,
    searchProductCategories,
    type ProductCategoryOption,
} from './productCategoryEnvironment';

const categories: ProductCategoryOption[] = [
    { id: 'sala', name: 'SALA DE ESTAR' },
    { id: 'sofas', name: 'Sofás', parents: ['sala'] },
    { id: 'poltronas', name: 'Poltronas', parents: ['sala'] },
    { id: 'cozinha', name: 'COZINHA' },
    { id: 'mesas', name: 'Mesas', parents: ['cozinha'] },
];

describe('productCategoryEnvironment', () => {
    it('oculta ambientes e mantém categorias selecionáveis', () => {
        expect(filterProductSelectableCategories(categories).map(category => category.id))
            .toEqual(['sofas', 'poltronas', 'mesas']);
    });

    it('encontra os ambientes raiz sem duplicá-los', () => {
        expect(getProductCategoryRootNames(['sofas', 'poltronas', 'missing'], categories))
            .toEqual(['SALA DE ESTAR']);
    });

    it('retorna vazio se o termo tiver menos de 2 caracteres', () => {
        const selectable = filterProductSelectableCategories(categories);
        expect(searchProductCategories(selectable, categories, '')).toEqual([]);
        expect(searchProductCategories(selectable, categories, 's')).toEqual([]);
    });

    it('filtra categorias por nome ou ambiente com 2 ou mais caracteres ignorando acentos e maiúsculas', () => {
        const selectable = filterProductSelectableCategories(categories);
        // Busca por categoria
        expect(searchProductCategories(selectable, categories, 'sofa').map(c => c.id)).toEqual(['sofas']);
        expect(searchProductCategories(selectable, categories, 'SOFÁS').map(c => c.id)).toEqual(['sofas']);
        // Busca por ambiente pai
        expect(searchProductCategories(selectable, categories, 'cozinha').map(c => c.id)).toEqual(['mesas']);
    });
});
