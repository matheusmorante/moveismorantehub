/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CurrencyInput from './CurrencyInput';
import React from 'react';

// Garante que o DOM é limpo após cada teste
afterEach(() => {
    cleanup();
});

describe('CurrencyInput', () => {
    it('deve formatar valor inicial corretamente (BRL)', () => {
        render(<CurrencyInput value={1234.56} onChangeValue={vi.fn()} testID="curr-input" />);
        const input = screen.getByTestId('curr-input') as HTMLInputElement;
        expect(input.value.replace(/\s/g, ' ')).toContain('1.234,56');
    });

    it('deve formatar bancario RTL ao digitar sequencialmente', async () => {
        const handleChange = vi.fn();
        render(<CurrencyInput value={null} onChangeValue={handleChange} testID="curr-input" />);
        const input = screen.getByTestId('curr-input');
        
        const user = userEvent.setup();
        
        await user.type(input, '1');
        expect(handleChange).toHaveBeenLastCalledWith(0.01);
        
        await user.type(input, '2');
        expect(handleChange).toHaveBeenLastCalledWith(0.12);
        
        await user.type(input, '3');
        expect(handleChange).toHaveBeenLastCalledWith(1.23);
        
        await user.type(input, '456');
        expect(handleChange).toHaveBeenLastCalledWith(1234.56);
    });

    it('deve tratar colagem (paste) com parser semantico diferentemente da digitacao', () => {
        const handleChange = vi.fn();
        render(<CurrencyInput value={null} onChangeValue={handleChange} testID="curr-input" />);
        const input = screen.getByTestId('curr-input');
        
        // 1. Colar valor inteiro sem separador decimal (deve assumir ,00)
        fireEvent.paste(input, { clipboardData: { getData: () => '1234' } });
        expect(handleChange).toHaveBeenLastCalledWith(1234.00);
        
        // 2. Colar valor com virgula BR
        fireEvent.paste(input, { clipboardData: { getData: () => '1234,56' } });
        expect(handleChange).toHaveBeenLastCalledWith(1234.56);
        
        // 3. Colar valor com ponto americano
        fireEvent.paste(input, { clipboardData: { getData: () => '1234.56' } });
        expect(handleChange).toHaveBeenLastCalledWith(1234.56);
        
        // 4. Colar valor formatado padrao R$
        fireEvent.paste(input, { clipboardData: { getData: () => 'R$ 1.234,56' } });
        expect(handleChange).toHaveBeenLastCalledWith(1234.56);
    });

    it('deve respeitar propriedades HTML nativas e callbacks (API Compatibilidade)', () => {
        const handleBlur = vi.fn();
        const handleFocus = vi.fn();
        render(
            <CurrencyInput 
                value={10} 
                onBlur={handleBlur}
                onFocus={handleFocus}
                readOnly={true}
                name="meu-dinheiro"
                id="din-input"
                className="custom-class"
                testID="curr-input" 
            />
        );
        const input = screen.getByTestId('curr-input') as HTMLInputElement;
        
        expect(input.readOnly).toBe(true);
        expect(input.name).toBe("meu-dinheiro");
        expect(input.id).toBe("din-input");
        expect(input.className).toContain("custom-class");
        
        fireEvent.focus(input);
        expect(handleFocus).toHaveBeenCalled();
        
        fireEvent.blur(input);
        expect(handleBlur).toHaveBeenCalled();
    });
});
