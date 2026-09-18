import { describe, it, expect } from 'vitest';
import { calculateCompositionAvailability } from '../compositionMath';

describe('Cálculo de Saldo Limitante de Composições (Kit)', () => {
    
    it('Caso A: Estoque exato para 1 kit (1x para 1x)', () => {
        const components = [
            { currentStock: 1, quantityNeeded: 1 },
            { currentStock: 1, quantityNeeded: 1 }
        ];
        expect(calculateCompositionAvailability(components)).toBe(1);
    });

    it('Caso B: Estoque limitante em um único item', () => {
        const components = [
            { currentStock: 100, quantityNeeded: 1 },
            { currentStock: 2, quantityNeeded: 1 }, // Limitador
            { currentStock: 50, quantityNeeded: 1 }
        ];
        expect(calculateCompositionAvailability(components)).toBe(2);
    });

    it('Caso C: Estoque zerado em um dos itens zera a composição', () => {
        const components = [
            { currentStock: 10, quantityNeeded: 1 },
            { currentStock: 0, quantityNeeded: 1 } // Zerado
        ];
        expect(calculateCompositionAvailability(components)).toBe(0);
    });

    it('Caso D: Quantidades múltiplas por kit (Ex: Cadeira de Jantar x4)', () => {
        const components = [
            { currentStock: 10, quantityNeeded: 1 }, // Mesa (pode montar 10 kits)
            { currentStock: 10, quantityNeeded: 4 }  // Cadeiras (pode montar 2 kits, sobra 2)
        ];
        // 10 / 4 = 2.5 -> Arredonda pra 2
        expect(calculateCompositionAvailability(components)).toBe(2);
    });

    it('Caso E: Arredondamento perfeito para baixo (FLOOR) e não Math.round', () => {
        const components = [
            { currentStock: 9, quantityNeeded: 2 } 
        ];
        // 9 / 2 = 4.5. Se fosse round() daria 5 (Erro: venderia algo que não tem).
        // A regra de negócio exige que sempre seja truncado (floor), resultando em 4.
        expect(calculateCompositionAvailability(components)).toBe(4);
    });

    it('Caso Edge 1: Sem itens deve retornar 0', () => {
        expect(calculateCompositionAvailability([])).toBe(0);
    });

    it('Caso Edge 2: Evitar divisão por zero (quantityNeeded = 0)', () => {
        const components = [
            { currentStock: 10, quantityNeeded: 0 },
            { currentStock: 5, quantityNeeded: 1 }
        ];
        // O item com quantityNeeded 0 é ignorado na conta
        expect(calculateCompositionAvailability(components)).toBe(5);
    });
    
    it('Caso Edge 3: Estoque negativo do sistema deve ser tratado como 0 (segurança)', () => {
        const components = [
            { currentStock: -5, quantityNeeded: 1 },
            { currentStock: 10, quantityNeeded: 1 }
        ];
        expect(calculateCompositionAvailability(components)).toBe(0);
    });

    it('Caso Edge 4: Unidades fracionárias (ex: metros, litros) com limite limitante preciso', () => {
        const components = [
            { currentStock: 10, quantityNeeded: 2.5 }, // Ex: Precisa de 2.5m. 10 / 2.5 = 4
            { currentStock: 5, quantityNeeded: 1 }     // Limite = 5
        ];
        expect(calculateCompositionAvailability(components)).toBe(4);
    });

    it('Caso Edge 5: Sobra decimal que não completa um kit inteiro', () => {
        const components = [
            { currentStock: 8, quantityNeeded: 3 } // 8 / 3 = 2.666 -> Arredonda pra 2
        ];
        expect(calculateCompositionAvailability(components)).toBe(2);
    });
});
