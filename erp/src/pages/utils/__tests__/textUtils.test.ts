import { describe, expect, it } from 'vitest';
import { toTitleCase } from '../textUtils';

describe('toTitleCase - Formatação de Nomes, Variações e Atributos de Produtos', () => {
    it('formata texto simples capitalizando palavras e mantendo preposições e conjunções em minúsculo', () => {
        expect(toTitleCase('MESA DE JANTAR COM 6 CADEIRAS')).toBe('Mesa de Jantar com 6 Cadeiras');
        expect(toTitleCase('CÔMODA 4 GAVETAS BRANCO E PRETO')).toBe('Cômoda 4 Gavetas Branco e Preto');
        expect(toTitleCase('PAINEL PARA TV DE ATÉ 65 POLEGADAS')).toBe('Painel para TV de até 65 Polegadas');
        expect(toTitleCase('ROUPEIRO 6 PORTAS COM ESPELHO NA COR FREIJÓ')).toBe('Roupeiro 6 Portas com Espelho na Cor Freijó');
    });

    it('mantém a primeira palavra sempre em maiúsculo, mesmo se for preposição ou artigo', () => {
        expect(toTitleCase('de canto')).toBe('De Canto');
        expect(toTitleCase('o melhor sofá')).toBe('O Melhor Sofá');
        expect(toTitleCase('para escritório')).toBe('Para Escritório');
    });

    it('capitaliza atributos e valores corretamente com preposições em minúsculo', () => {
        expect(toTitleCase('COR')).toBe('Cor');
        expect(toTitleCase('TAMANHO DO PRODUTO')).toBe('Tamanho do Produto');
        expect(toTitleCase('FREIJÓ COM OFF-WHITE')).toBe('Freijó com Off-White');
        expect(toTitleCase('BRANCO/PRETO')).toBe('Branco/Preto');
        expect(toTitleCase('VELUDO BEGE CLARO')).toBe('Veludo Bege Claro');
    });

    it('trata palavras com hífen preservando capitalização', () => {
        expect(toTitleCase('guarda-roupa casal')).toBe('Guarda-Roupa Casal');
        expect(toTitleCase('off-white')).toBe('Off-White');
        expect(toTitleCase('mesa-de-cabeceira')).toBe('Mesa-de-Cabeceira');
    });

    it('preserva acrônimos técnicos comuns em maiúsculo', () => {
        expect(toTitleCase('rack para tv em mdf com led')).toBe('Rack para TV em MDF com LED');
        expect(toTitleCase('painel mdp com fita led')).toBe('Painel MDP com Fita LED');
    });

    it('retorna vazio com segurança para valores nulos, vazios ou indefinidos', () => {
        expect(toTitleCase('')).toBe('');
        expect(toTitleCase(null)).toBe('');
        expect(toTitleCase(undefined)).toBe('');
        expect(toTitleCase('   ')).toBe('');
    });
});
