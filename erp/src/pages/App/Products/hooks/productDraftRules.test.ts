import { describe, it, expect } from 'vitest';
import { getEnteredProductName, isDraftSaveEligible } from './productDraftRules';

describe('Regras de Rascunho do Cadastro de Produtos (Draft Rules)', () => {
    it('deve marcar salvar rascunho como indisponível quando o nome for uma string vazia', () => {
        const productData = { name: '' };
        expect(getEnteredProductName(productData)).toBe('');
        expect(isDraftSaveEligible(productData)).toBe(false);
    });

    it('deve marcar salvar rascunho como indisponível quando o nome tiver apenas espaços em branco', () => {
        const productData = { name: '   ' };
        expect(getEnteredProductName(productData)).toBe('');
        expect(isDraftSaveEligible(productData)).toBe(false);
    });

    it('deve marcar salvar rascunho como disponível quando o nome estiver preenchido com caracteres válidos', () => {
        const productData = { name: 'Guarda Roupa' };
        expect(getEnteredProductName(productData)).toBe('Guarda Roupa');
        expect(isDraftSaveEligible(productData)).toBe(true);
    });

    it('deve considerar title ou marketplaceTitle caso name não esteja definido', () => {
        const withTitle = { title: '  Mesa de Jantar  ' };
        expect(getEnteredProductName(withTitle)).toBe('Mesa de Jantar');
        expect(isDraftSaveEligible(withTitle)).toBe(true);

        const withMarketplaceTitle = { marketplaceTitle: 'Cadeira Gamer' };
        expect(getEnteredProductName(withMarketplaceTitle)).toBe('Cadeira Gamer');
        expect(isDraftSaveEligible(withMarketplaceTitle)).toBe(true);
    });

    it('não deve considerar descrição detalhada vazia como nome', () => {
        const emptyProduct = { description: 'Descrição longa' };
        // Nome precisa estar no campo de nome/título
        expect(getEnteredProductName(emptyProduct)).toBe('');
        expect(isDraftSaveEligible(emptyProduct)).toBe(false);
    });
});
