import { describe, it, expect } from 'vitest';
import { inferModuleFromOperation, getModuleDefinition, KNOWN_MODULES } from '../apiModuleMapper';

describe('apiModuleMapper', () => {
    it('infere corretamente o módulo de marketing', () => {
        expect(inferModuleFromOperation('marketing_ambientation')).toBe('marketing');
        expect(inferModuleFromOperation('post_style_optimization')).toBe('marketing');
    });

    it('infere o módulo de notas de entrada', () => {
        expect(inferModuleFromOperation('inbound_batch_suggestions')).toBe('inbound_invoices');
        expect(inferModuleFromOperation('classify_inbound_item')).toBe('inbound_invoices');
    });

    it('infere o módulo de produtos', () => {
        expect(inferModuleFromOperation('suggest_category')).toBe('products');
        expect(inferModuleFromOperation('generate_ecommerce_seo')).toBe('products');
    });

    it('infere o módulo fiscal', () => {
        expect(inferModuleFromOperation('fiscal_classification')).toBe('fiscal');
    });

    it('retorna definição com label e ícone conhecidos', () => {
        const def = getModuleDefinition('marketing');
        expect(def.label).toBe('Marketing & Criador de Posts');
        expect(def.icon).toBe('bi-stars');
    });

    it('faz fallback gracioso para módulo desconhecido', () => {
        const def = getModuleDefinition('modulo_customizado');
        expect(def.id).toBe('modulo_customizado');
        expect(def.label).toBe('Modulo customizado');
    });
});
