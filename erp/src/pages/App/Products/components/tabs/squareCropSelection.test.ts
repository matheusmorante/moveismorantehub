import { describe, expect, it } from 'vitest';
import {
    createCenteredSquareSelection,
    moveSquareSelection,
    resizeSquareSelection,
} from './squareCropSelection';

describe('squareCropSelection', () => {
    it('centraliza a maior seleção quadrada disponível', () => {
        expect(createCenteredSquareSelection(400, 300)).toEqual({ x: 50, y: 0, size: 300 });
        expect(createCenteredSquareSelection(0, 300)).toBeNull();
    });

    it('mantém a seleção dentro dos limites ao mover', () => {
        expect(moveSquareSelection(500, -50, 100, 100, { x: 10, y: 20, size: 100 }, 300, 200))
            .toEqual({ x: 200, y: 0, size: 100 });
    });

    it('redimensiona pelo canto mantendo o ponto oposto fixo', () => {
        expect(resizeSquareSelection(150, 100, 'nw', { x: 100, y: 100, size: 100 }, 400, 400))
            .toEqual({ x: 140, y: 140, size: 60 });
    });
});
