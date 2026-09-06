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

    it('obriga a análise do núcleo do colchão e separa a base box', () => {
        const prompt = buildNcmClassificationPrompt({ title: 'Colchão casal' });

        expect(prompt).toContain('núcleo determinante');
        expect(prompt).toContain('94042100');
        expect(prompt).toContain('94042900');
        expect(prompt).toContain('94041000');
    });
});
