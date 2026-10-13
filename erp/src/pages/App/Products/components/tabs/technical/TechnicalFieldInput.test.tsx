// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { TechnicalFieldInput } from './TechnicalFieldInput';
import type { TechnicalFieldDefinition } from '@/pages/utils/technicalValuesService';

describe('TechnicalFieldInput - Marca, Modelo e Quantidade de Lugares', () => {
  afterEach(() => {
    cleanup();
  });

  it('renderiza Marca como campo de texto digitável com placeholder e permite digitação', () => {
    const field: TechnicalFieldDefinition = {
      id: 'attr-marca',
      name: 'Marca',
      dataType: 'radio', // Mesmo que venha como radio/lista do banco legado
      options: [{ id: 'opt-1', value: 'Morante' }],
    };
    const onChange = vi.fn();

    render(<TechnicalFieldInput field={field} value="" onChange={onChange} />);

    const input = screen.getByPlaceholderText('Digite a marca') as HTMLInputElement;
    expect(input).toBeDefined();
    expect(input.type).toBe('text');
    expect(screen.queryByRole('combobox')).toBeNull();

    fireEvent.change(input, { target: { value: 'Morante Prime' } });
    expect(onChange).toHaveBeenCalledWith('Morante Prime');
  });

  it('renderiza Modelo como campo de texto digitável com placeholder e permite digitação', () => {
    const field: TechnicalFieldDefinition = {
      id: 'attr-modelo',
      name: 'Modelo',
      dataType: 'list',
      options: [],
    };
    const onChange = vi.fn();

    render(<TechnicalFieldInput field={field} value="" onChange={onChange} />);

    const input = screen.getByPlaceholderText('Digite o modelo') as HTMLInputElement;
    expect(input).toBeDefined();
    expect(input.type).toBe('text');
    expect(screen.queryByRole('combobox')).toBeNull();

    fireEvent.change(input, { target: { value: 'Retrátil Florença' } });
    expect(onChange).toHaveBeenCalledWith('Retrátil Florença');
  });

  it('renderiza Quantidade de lugares como número inteiro com placeholder "Digite o número de quantidades"', () => {
    const field: TechnicalFieldDefinition = {
      id: 'attr-lugares',
      name: 'Quantidade de lugares',
      dataType: 'radio',
      options: [{ id: '1', value: '2' }, { id: '2', value: '3' }],
    };
    const onChange = vi.fn();

    render(<TechnicalFieldInput field={field} value="" onChange={onChange} />);

    const input = screen.getByPlaceholderText('Digite o número de quantidades') as HTMLInputElement;
    expect(input).toBeDefined();
    expect(input.type).toBe('number');
    expect(input.step).toBe('1');
    expect(input.min).toBe('0');

    fireEvent.change(input, { target: { value: '4' } });
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('ignora decimais ou caracteres inválidos em Quantidade de lugares convertendo para inteiro', () => {
    const field: TechnicalFieldDefinition = {
      id: 'attr-lugares',
      name: 'Quantidade de lugares',
      dataType: 'integer',
      options: [],
    };
    const onChange = vi.fn();

    render(<TechnicalFieldInput field={field} value={3} onChange={onChange} />);

    const input = screen.getByPlaceholderText('Digite o número de quantidades') as HTMLInputElement;
    expect(input.value).toBe('3');

    // Ao limpar
    fireEvent.change(input, { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('renderiza Peso como campo decimal com 1 dígito após a vírgula e placeholder "0,0"', () => {
    const field: TechnicalFieldDefinition = {
      id: 'attr-peso',
      name: 'Peso',
      dataType: 'weight',
      options: [],
    };
    const onChange = vi.fn();

    render(<TechnicalFieldInput field={field} value="" onChange={onChange} />);

    const input = screen.getByPlaceholderText('0,0') as HTMLInputElement;
    expect(input).toBeDefined();
    expect(input.type).toBe('text');
    expect(input.inputMode).toBe('decimal');

    // Digita número decimal com 1 dígito
    fireEvent.change(input, { target: { value: '12,5' } });
    expect(onChange).toHaveBeenCalledWith(12.5);

    // Não permite segundo dígito decimal
    fireEvent.change(input, { target: { value: '12,55' } });
    expect(onChange).toHaveBeenCalledTimes(1); // Não emite o segundo dígito inválido
  });

  it('formata valor inteiro para 1 casa decimal ao sair do campo (blur) em Peso', () => {
    const field: TechnicalFieldDefinition = {
      id: 'attr-peso',
      name: 'Peso',
      dataType: 'weight',
      options: [],
    };
    const onChange = vi.fn();

    render(<TechnicalFieldInput field={field} value={15} onChange={onChange} />);

    const input = screen.getByPlaceholderText('0,0') as HTMLInputElement;
    expect(input.value).toBe('15,0');

    fireEvent.change(input, { target: { value: '20' } });
    fireEvent.blur(input);

    expect(input.value).toBe('20,0');
    expect(onChange).toHaveBeenCalledWith(20);
  });
});
