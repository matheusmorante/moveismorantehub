import { describe, expect, it } from 'vitest';
import { PRODUCT_ENVIRONMENT_OPTIONS } from './productEnvironmentOptions';

describe('PRODUCT_ENVIRONMENT_OPTIONS', () => {
    it('mantém os ambientes operacionais usados pelo cadastro', () => {
        expect(PRODUCT_ENVIRONMENT_OPTIONS).toEqual(expect.arrayContaining([
            'SALA DE JANTAR', 'COZINHA', 'QUARTO', 'ÁREA GOURMET',
        ]));
    });
});
