import { describe, expect, it } from 'vitest';
import { getSelectedProductDisplayName } from './productVariationDefaults';

describe('getSelectedProductDisplayName', () => {
    it('usa somente o nome da variação, mesmo quando ela já contém o nome do pai', () => {
        expect(getSelectedProductDisplayName(
            { name: 'Sofá Capri' },
            { name: 'Sofá Capri Azul 3 lugares' },
        )).toBe('Sofá Capri Azul 3 lugares');
    });

    it('usa o nome do produto quando não há variação', () => {
        expect(getSelectedProductDisplayName({ name: 'Sofá Capri' })).toBe('Sofá Capri');
    });

    it('usa o título ou a descrição como alternativa para cadastros antigos', () => {
        expect(getSelectedProductDisplayName({ title: 'Mesa Luna', description: 'Descrição' })).toBe('Mesa Luna');
    });
});
