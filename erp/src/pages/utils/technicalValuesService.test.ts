import { describe, it, expect } from 'vitest';
import {
    getEffectiveTechnicalValue,
    hasVariationOverride,
    removeVariationOverride,
    setVariationOverride,
    areEffectiveValuesEqual,
    hasEffectiveDifferenceFromParent,
    computeEffectiveVariationName,
    getApplicableTechnicalFields,
    getAvailableAdditionalFields,
    getMissingRequiredTechnicalFields,
    TechnicalFieldDefinition,
    TechnicalValuesMap
} from './technicalValuesService';

describe('technicalValuesService', () => {
    it('exige valor somente nas especificações globais obrigatórias', () => {
        const missing = getMissingRequiredTechnicalFields(
            ['Cor', 'Estrutura'],
            { Cor: 'Branco', Estrutura: '', Observação: '' }
        );

        expect(missing).toEqual(['Estrutura']);
    });

    it('herda valor padrão do produto pai quando não há override', () => {
        const parent = { 'Cor': 'Branco', 'Portas': 6 };
        const variation = {};

        expect(getEffectiveTechnicalValue(parent, variation, 'Cor')).toBe('Branco');
        expect(getEffectiveTechnicalValue(parent, variation, 'Portas')).toBe(6);
    });

    it('aplica override da variação quando definido', () => {
        const parent = { 'Cor': 'Branco', 'Portas': 6 };
        const variation = { 'Cor': 'Nature' };

        expect(getEffectiveTechnicalValue(parent, variation, 'Cor')).toBe('Nature');
        expect(getEffectiveTechnicalValue(parent, variation, 'Portas')).toBe(6);
    });

    it('respeita valor 0 sem confundir com ausência de valor', () => {
        const parent = { 'Portas': 6, 'Gavetas': 2 };
        const variation = { 'Gavetas': 0 };

        expect(getEffectiveTechnicalValue(parent, variation, 'Gavetas')).toBe(0);
    });

    it('respeita valor false sem confundir com ausência de valor', () => {
        const parent = { 'Possui Espelho': true };
        const variation = { 'Possui Espelho': false };

        expect(getEffectiveTechnicalValue(parent, variation, 'Possui Espelho')).toBe(false);
    });

    it('remove override e volta a herdar o valor do pai', () => {
        const parent = { 'Cor': 'Branco' };
        let variation: TechnicalValuesMap = { 'Cor': 'Nature' };

        expect(hasVariationOverride(variation, 'Cor')).toBe(true);
        expect(getEffectiveTechnicalValue(parent, variation, 'Cor')).toBe('Nature');

        variation = removeVariationOverride(variation, 'Cor');
        expect(hasVariationOverride(variation, 'Cor')).toBe(false);
        expect(getEffectiveTechnicalValue(parent, variation, 'Cor')).toBe('Branco');
    });

    it('detecta se a variação tem diferença real em relação ao pai', () => {
        const fields: TechnicalFieldDefinition[] = [
            { id: '1', name: 'Cor', dataType: 'list', options: [] },
            { id: '2', name: 'Portas', dataType: 'integer', options: [] }
        ];
        const parent = { 'Cor': 'Branco', 'Portas': 6 };

        // Mesmos valores efetivos, ainda que possua override falso
        const variationEqual = { 'Cor': 'Branco', 'Portas': 6 };
        expect(hasEffectiveDifferenceFromParent(fields, parent, variationEqual)).toBe(false);

        // Valor diferente
        const variationDiff = { 'Cor': 'Nature', 'Portas': 6 };
        expect(hasEffectiveDifferenceFromParent(fields, parent, variationDiff)).toBe(true);
    });

    it('gera nome automático da variação respeitando formatação e ordem', () => {
        const fields: TechnicalFieldDefinition[] = [
            { id: '1', name: 'Cor', dataType: 'list', nameOrder: 10, options: [] },
            { id: '2', name: 'Portas', dataType: 'integer', unit: 'Portas', nameOrder: 20, options: [] },
            { id: '3', name: 'Gavetas', dataType: 'integer', unit: 'Gavetas', nameOrder: 30, options: [] },
            { id: '4', name: 'Espelho', dataType: 'boolean', nameOrder: 40, options: [] },
            { id: '5', name: 'Material', dataType: 'list', includeInName: false, options: [] }
        ];

        const effectiveValues = {
            'Cor': 'Nature',
            'Portas': 6,
            'Gavetas': 2,
            'Espelho': true,
            'Material': 'MDF'
        };

        const generatedName = computeEffectiveVariationName('Guarda-Roupa Madrid', fields, effectiveValues);
        expect(generatedName).toBe('Guarda-Roupa Madrid Nature 6 Portas 2 Gavetas Com Espelho');
    });

    describe('getApplicableTechnicalFields & getAvailableAdditionalFields', () => {
        const catMesas = 'cat-mesas-uuid';
        const catGuardaRoupas = 'cat-guardaroupas-uuid';

        const mockAllFields: TechnicalFieldDefinition[] = [
            { id: '1', name: 'Cor', dataType: 'list', categoryIds: [], options: [] }, // Global
            { id: '2', name: 'Material', dataType: 'list', categoryIds: [], options: [] }, // Global
            { id: '3', name: 'Quantidade de portas', dataType: 'integer', categoryIds: [catGuardaRoupas], options: [] }, // Específico Guarda-Roupa
            { id: '4', name: 'Quantidade de gavetas', dataType: 'integer', categoryIds: [catGuardaRoupas], options: [] }, // Específico Guarda-Roupa
            { id: '5', name: 'Formato', dataType: 'list', categoryIds: [catMesas], options: [] }, // Específico Mesa
        ];

        it('inclui apenas campos configurados para a categoria do produto', () => {
            const applicable = getApplicableTechnicalFields(mockAllFields, [catMesas], {}, []);
            const names = applicable.map(f => f.name);

            expect(names).toEqual(['Formato']);
            expect(names).not.toContain('Cor');
            expect(names).not.toContain('Material');
            expect(names).not.toContain('Quantidade de portas');
            expect(names).not.toContain('Quantidade de gavetas');
        });

        it('inclui especificação obrigatória global mesmo sem categoria', () => {
            const applicable = getApplicableTechnicalFields([
                { id: 'material', name: 'Material', dataType: 'list', isRequired: true, options: [] },
                { id: 'porta', name: 'Tipo de Porta', dataType: 'list', options: [] },
            ], [], {}, []);

            expect(applicable.map(field => field.name)).toEqual(['Material']);
        });

        it('permite adicionar manualmente campos que não são da categoria', () => {
            const applicable = getApplicableTechnicalFields(
                mockAllFields,
                [catMesas],
                {},
                ['Quantidade de portas'] // Adicionado manualmente
            );
            const names = applicable.map(f => f.name);

            expect(names).toContain('Quantidade de portas');
            expect(names).toContain('Formato');
        });

        it('preserva campos que já possuem valores preenchidos mesmo se a categoria mudar', () => {
            // Produto originalmente tinha valor em Quantidade de portas, e agora está na categoria Mesas
            const applicable = getApplicableTechnicalFields(
                mockAllFields,
                [catMesas],
                { 'Quantidade de portas': '2' },
                []
            );
            const names = applicable.map(f => f.name);

            expect(names).toContain('Quantidade de portas');
            expect(names).toContain('Formato');
        });

        it('retorna apenas os campos centrais ainda não presentes como opções adicionais', () => {
            const currentVisible = [
                mockAllFields[0], // Cor
                mockAllFields[1], // Material
                mockAllFields[4], // Formato
            ];

            const available = getAvailableAdditionalFields(mockAllFields, currentVisible);
            const availableNames = available.map(f => f.name);

            expect(availableNames).toEqual(['Quantidade de portas', 'Quantidade de gavetas']);
        });
    });
});
