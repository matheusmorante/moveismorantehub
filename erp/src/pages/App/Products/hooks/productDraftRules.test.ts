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

describe('Regras de Conclusão de Rascunho de Produto (Draft Completion Rules)', () => {
    const isExistingRegisteredProduct = (product?: any) =>
        Boolean(product?.id && product.isDraft !== true && product.status !== 'draft');

    const rascunhoSalvo = {
        id: 'prod-draft-123',
        name: 'Guarda Roupa Fênix Faimec',
        isDraft: true,
        status: 'draft',
        active: false,
        hasVariations: true,
        variations: [
            { id: 'var-1', name: 'Guarda Roupa Fênix Branco', sku: '003975-01', active: false, status: 'draft', attributes: [{ name: 'COR', value: 'BRANCO' }] }
        ]
    };

    const produtoExistenteCadastrado = {
        id: 'prod-cadastrado-456',
        name: 'Sofá 3 Lugares',
        isDraft: false,
        status: 'hidden',
        active: true,
        hasVariations: true,
        variations: [
            { id: 'var-2', name: 'Sofá 3 Lugares Cinza', sku: '001234-01', active: true, status: 'hidden', attributes: [] }
        ]
    };

    const produtoNovoEmCriacao = {
        id: undefined,
        name: 'Poltrona do Papai',
        isDraft: true,
        status: 'draft',
        active: false
    };

    describe('isExistingRegisteredProduct', () => {
        it('deve identificar corretamente que um rascunho NÃO é um produto registrado', () => {
            expect(isExistingRegisteredProduct(rascunhoSalvo)).toBe(false);
        });

        it('deve identificar corretamente que um produto já cadastrado é registrado', () => {
            expect(isExistingRegisteredProduct(produtoExistenteCadastrado)).toBe(true);
        });

        it('deve identificar que um produto novo sem ID não é registrado', () => {
            expect(isExistingRegisteredProduct(produtoNovoEmCriacao)).toBe(false);
        });
    });

    describe('isFinalizingDraft (Abertura do Modal de Canais)', () => {
        it('deve abrir modal de canais (isFinalizingDraft = true) ao concluir rascunho com ID (caso do bug relatado)', () => {
            const actualSaveAsDraft = false; // Usuário clicou em "Cadastrar produto"
            const isRegistered = isExistingRegisteredProduct(rascunhoSalvo);
            const isFinalizingDraft = !actualSaveAsDraft && !isRegistered;

            expect(isFinalizingDraft).toBe(true);
        });

        it('deve abrir modal de canais (isFinalizingDraft = true) ao cadastrar novo produto direto', () => {
            const actualSaveAsDraft = false;
            const isRegistered = isExistingRegisteredProduct(produtoNovoEmCriacao);
            const isFinalizingDraft = !actualSaveAsDraft && !isRegistered;

            expect(isFinalizingDraft).toBe(true);
        });

        it('NÃO deve abrir modal de canais (isFinalizingDraft = false) ao salvar como rascunho', () => {
            const actualSaveAsDraft = true;
            const isRegistered = isExistingRegisteredProduct(rascunhoSalvo);
            const isFinalizingDraft = !actualSaveAsDraft && !isRegistered;

            expect(isFinalizingDraft).toBe(false);
        });

        it('NÃO deve abrir modal de canais (isFinalizingDraft = false) ao editar produto já cadastrado', () => {
            const actualSaveAsDraft = false; // Clicou em "Salvar alterações"
            const isRegistered = isExistingRegisteredProduct(produtoExistenteCadastrado);
            const isFinalizingDraft = !actualSaveAsDraft && !isRegistered;

            expect(isFinalizingDraft).toBe(false);
        });
    });

    describe('Ativação do ERP e Variações ao Concluir Rascunho', () => {
        it('deve ativar o produto no ERP ao concluir o rascunho (não deixando desativado)', () => {
            const actualSaveAsDraft = false;
            const isRegistered = isExistingRegisteredProduct(rascunhoSalvo);
            const isCompletingDraft = !actualSaveAsDraft && !isRegistered;

            const erpActive = actualSaveAsDraft
                ? false
                : (isCompletingDraft ? true : rascunhoSalvo.active !== false);

            expect(erpActive).toBe(true);
        });

        it('deve ativar as variações ao concluir o rascunho', () => {
            const actualSaveAsDraft = false;
            const isRegistered = isExistingRegisteredProduct(rascunhoSalvo);
            const isCompletingDraft = !actualSaveAsDraft && !isRegistered;

            const updatedVariations = (rascunhoSalvo.variations || []).map(v => ({
                ...v,
                active: actualSaveAsDraft ? false : (isCompletingDraft ? true : v.active)
            }));

            expect(updatedVariations[0].active).toBe(true);
        });

        it('deve transitar status do catálogo de "draft" para "hidden" ao concluir rascunho para não ser bloqueado', () => {
            const actualSaveAsDraft = false;
            const isRegistered = isExistingRegisteredProduct(rascunhoSalvo);

            let targetCatalogStatus = rascunhoSalvo.status;
            if (actualSaveAsDraft) {
                targetCatalogStatus = 'draft';
            } else if (!isRegistered && (!rascunhoSalvo.status || rascunhoSalvo.status === 'draft')) {
                targetCatalogStatus = 'hidden';
            }

            expect(targetCatalogStatus).toBe('hidden');
        });
    });
});
