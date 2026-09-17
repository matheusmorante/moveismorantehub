import { describe, expect, it } from 'vitest';
import { buildNcmClassificationPrompt } from './ncmClassificationPrompt';

describe('prompt de classificação NCM', () => {
    it('envia título, descrição, categoria e material para a análise', () => {
        const prompt = buildNcmClassificationPrompt({
            title: 'Sofá retrátil três lugares',
            description: 'Estofado em espuma D33 e revestido em suede.',
            category: 'Sofás',
            material: 'Madeira e espuma',
        });

        expect(prompt).toContain('Nome/Título: Sofá retrátil três lugares');
        expect(prompt).toContain('Descrição completa: Estofado em espuma D33 e revestido em suede.');
        expect(prompt).toContain('Categoria: Sofás');
        expect(prompt).toContain('Material informado: Madeira e espuma');
    });

    it('fixa a regra comercial de sofá em madeira e distingue sofá-cama', () => {
        const prompt = buildNcmClassificationPrompt({ title: 'Sofá' });

        expect(prompt).toContain('assuma sempre armação estrutural de madeira');
        expect(prompt).toContain('94016100');
        expect(prompt).toContain('94014100');
    });

    it('obriga a análise do núcleo do colchão e detalha a classificação de base box e baú', () => {
        const prompt = buildNcmClassificationPrompt({ title: 'Colchão casal' });

        expect(prompt).toContain('núcleo determinante');
        expect(prompt).toContain('94042100');
        expect(prompt).toContain('94042900');
    });

    it('diferencia base box baú (móvel de madeira) de suporte para cama (somiê)', () => {
        const prompt = buildNcmClassificationPrompt({ 
            title: 'Base Bau Damulti Premium 1,38 M' 
        });

        expect(prompt).toContain('base baú');
        expect(prompt).toContain('NÃO classifique automaticamente produtos que contenham "box" ou "base" no nome como NCM 94041000');
        expect(prompt).toContain('Bases rígidas e bases baú (com compartimento) de madeira/MDF/MDP devem ser consideradas prioritariamente como móveis de madeira para quarto');
        expect(prompt).toContain('avaliar 94035000');
        expect(prompt).toContain('Apenas classifique como suporte para camas/somiê (94041000) quando as características efetivas se enquadrarem');
        expect(prompt).toContain('material estrutural');
        expect(prompt).toContain('evidência fraca');
    });
});
