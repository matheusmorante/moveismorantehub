import { describe, expect, it } from 'vitest';
import { parseAttributeValueBatch } from './attributeValueBatch';

describe('parseAttributeValueBatch', () => {
    it('aceita vírgulas, ponto e vírgula e quebras de linha', () => {
        expect(parseAttributeValueBatch('Branco, Preto; Cinza\nNature')).toEqual([
            'Branco',
            'Preto',
            'Cinza',
            'Nature'
        ]);
    });

    it('remove duplicidades do lote e dos valores existentes sem diferenciar acentos ou caixa', () => {
        expect(parseAttributeValueBatch(
            'Macadamia, MACADÂMIA, Branco, branco',
            ['Macadâmia']
        )).toEqual(['Branco']);
    });
});
