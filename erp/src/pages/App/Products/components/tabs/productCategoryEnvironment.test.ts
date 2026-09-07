import { describe, expect, it } from 'vitest';
import {
    filterProductSelectableCategories,
    getProductCategoryRootNames,
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
});
