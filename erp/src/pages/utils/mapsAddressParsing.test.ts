import { describe, it, expect } from 'vitest';
import { normalizeUf, parseAddressPrediction } from './addressParsing';

describe('maps - normalizeUf', () => {
    it('deve normalizar siglas de 2 letras mantendo em maiúsculas', () => {
        expect(normalizeUf('pr')).toBe('PR');
        expect(normalizeUf('sp')).toBe('SP');
        expect(normalizeUf('sc')).toBe('SC');
    });

    it('deve converter nomes de estados por extenso para siglas oficiais', () => {
        expect(normalizeUf('Paraná')).toBe('PR');
        expect(normalizeUf('parana')).toBe('PR');
        expect(normalizeUf('São Paulo')).toBe('SP');
        expect(normalizeUf('sao paulo')).toBe('SP');
        expect(normalizeUf('Santa Catarina')).toBe('SC');
    });

    it('deve retornar PR como padrão quando vazio ou indefinido', () => {
        expect(normalizeUf('')).toBe('PR');
        expect(normalizeUf(undefined)).toBe('PR');
    });
});

describe('maps - parseAddressPrediction', () => {
    it('deve extrair rua, bairro, cidade e estado a partir de termos estruturados com bairro', () => {
        const pred = {
            description: 'Rua Cascavel - Boqueirão, Curitiba, Paraná, Brasil',
            structured_formatting: {
                main_text: 'Rua Cascavel',
                secondary_text: 'Boqueirão, Curitiba, Paraná, Brasil'
            },
            terms: [
                { value: 'Rua Cascavel' },
                { value: 'Boqueirão' },
                { value: 'Curitiba' },
                { value: 'Paraná' },
                { value: 'Brasil' }
            ]
        };

        const result = parseAddressPrediction(pred, 'Colombo', 'PR');
        expect(result.road).toBe('Rua Cascavel');
        expect(result.neighborhood).toBe('Boqueirão');
        expect(result.city).toBe('Curitiba');
        expect(result.state).toBe('PR');
    });

    it('deve extrair rua, cidade e estado quando não houver bairro nos termos', () => {
        const pred = {
            description: 'Rua das Flores, Colombo, PR, Brasil',
            structured_formatting: {
                main_text: 'Rua das Flores',
                secondary_text: 'Colombo, PR, Brasil'
            },
            terms: [
                { value: 'Rua das Flores' },
                { value: 'Colombo' },
                { value: 'PR' },
                { value: 'Brasil' }
            ]
        };

        const result = parseAddressPrediction(pred, 'Colombo', 'PR');
        expect(result.road).toBe('Rua das Flores');
        expect(result.neighborhood).toBe('');
        expect(result.city).toBe('Colombo');
        expect(result.state).toBe('PR');
    });

    it('deve extrair bairro, cidade e estado a partir de secondaryText se terms não existirem', () => {
        const pred = {
            description: 'Rua XV de Novembro - Centro, Curitiba - PR, Brasil',
            structured_formatting: {
                main_text: 'Rua XV de Novembro',
                secondary_text: 'Centro, Curitiba - PR, Brasil'
            }
        };

        const result = parseAddressPrediction(pred);
        expect(result.road).toBe('Rua XV de Novembro');
        expect(result.neighborhood).toBe('Centro');
        expect(result.city).toBe('Curitiba');
        expect(result.state).toBe('PR');
    });
});
