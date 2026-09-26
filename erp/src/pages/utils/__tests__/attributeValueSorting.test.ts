import { describe, expect, it } from 'vitest';
import { sortAttributeValuesNaturally } from '../attributeValueSorting';

describe('sortAttributeValuesNaturally', () => {
    it('ordena quantidades numericamente, mantendo 10 depois de 9', () => {
        const values = ['10 portas', '2 portas', '0 portas', '1 porta', '9 portas']
            .map((value) => ({ value }));

        expect(sortAttributeValuesNaturally(values).map(({ value }) => value)).toEqual([
            '0 portas',
            '1 porta',
            '2 portas',
            '9 portas',
            '10 portas'
        ]);
    });

    it('não altera o array original', () => {
        const values = [{ value: '2 gavetas' }, { value: '1 gaveta' }];

        sortAttributeValuesNaturally(values);

        expect(values.map(({ value }) => value)).toEqual(['2 gavetas', '1 gaveta']);
    });
});
