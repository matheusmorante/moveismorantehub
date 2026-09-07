import { describe, expect, it } from 'vitest';
import {
    appendAttributeDraftValue,
    finalizeAttributeDraftValues,
    normalizeAttributeDraftValue,
} from './attributeValueDraft';

describe('attributeValueDraft', () => {
    it('normaliza espaços e vírgulas do valor digitado', () => {
        expect(normalizeAttributeDraftValue('  Azul,  ')).toBe('Azul');
    });

    it('adiciona apenas valores novos com a comparação existente', () => {
        expect(appendAttributeDraftValue(['Azul'], ' Preto ')).toEqual(['Azul', 'Preto']);
        expect(appendAttributeDraftValue(['Azul'], 'Azul')).toEqual(['Azul']);
        expect(appendAttributeDraftValue(['Azul'], 'azul')).toEqual(['Azul', 'azul']);
    });

    it('inclui o valor pendente ao finalizar o atributo', () => {
        expect(finalizeAttributeDraftValues(['Azul'], ' Verde, ')).toEqual(['Azul', 'Verde']);
    });
});
