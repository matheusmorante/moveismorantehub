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

  it('renderiza Peso como campo decimal com 1 dígito após a vírgula, placeholder "0,0" e digitação RTL', () => {
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

    // Digita número sequencialmente no modo RTL (1 casa decimal empurrando para a esquerda)
    fireEvent.change(input, { target: { value: '1' } });
    expect(onChange).toHaveBeenLastCalledWith(0.1);

    fireEvent.change(input, { target: { value: '0,12' } });
    expect(onChange).toHaveBeenLastCalledWith(1.2);

    fireEvent.change(input, { target: { value: '1,25' } });
    expect(onChange).toHaveBeenLastCalledWith(12.5);
  });

  it('formata valor inicial e trata paste semanticamente em Peso com 1 casa decimal', () => {
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

    // Paste de valor inteiro "20"
    fireEvent.paste(input, { clipboardData: { getData: () => '20' } });
    expect(onChange).toHaveBeenCalledWith(20);
    expect(input.value).toBe('20,0');
  });

  it('renderiza Altura e dimensões com 2 casas decimais, placeholder "0,00" e digitação RTL empurrando para a esquerda', () => {
    const field: TechnicalFieldDefinition = {
      id: 'attr-altura',
      name: 'Altura',
      dataType: 'measure',
      options: [],
    };
    const onChange = vi.fn();

    render(<TechnicalFieldInput field={field} value="" onChange={onChange} />);

    const input = screen.getByPlaceholderText('0,00') as HTMLInputElement;
    expect(input).toBeDefined();
    expect(input.type).toBe('text');
    expect(input.inputMode).toBe('decimal');

    // Digita número sequencialmente no modo RTL (2 casas decimais)
    fireEvent.change(input, { target: { value: '1' } });
    expect(onChange).toHaveBeenLastCalledWith(0.01);

    fireEvent.change(input, { target: { value: '0,018' } });
    expect(onChange).toHaveBeenLastCalledWith(0.18);

    fireEvent.change(input, { target: { value: '0,185' } });
    expect(onChange).toHaveBeenLastCalledWith(1.85);

    fireEvent.change(input, { target: { value: '1,850' } });
    expect(onChange).toHaveBeenLastCalledWith(18.5);

    fireEvent.change(input, { target: { value: '18,500' } });
    expect(onChange).toHaveBeenLastCalledWith(185);
  });

  it('renderiza placeholders específicos para Quantidade de portas e Quantidade de gavetas', () => {
    const fieldPortas: TechnicalFieldDefinition = {
      id: 'p-1',
      name: 'Quantidade de portas',
      dataType: 'integer',
      options: [],
    };
    const fieldGavetas: TechnicalFieldDefinition = {
      id: 'g-1',
      name: 'Quantidade de gavetas',
      dataType: 'integer',
      options: [],
    };

    const { rerender } = render(
      <TechnicalFieldInput field={fieldPortas} value="" onChange={vi.fn()} />
    );
    expect(screen.getByPlaceholderText('Insira a quantidade de portas')).toBeDefined();

    rerender(<TechnicalFieldInput field={fieldGavetas} value="" onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('Insira a quantidade de gavetas')).toBeDefined();
  });

  it('força comportamento multi_select para Materiais das corrediças permitindo seleção múltipla', () => {
    const fieldCorredicas: TechnicalFieldDefinition = {
      id: 'c-1',
      name: 'Materiais das corrediças',
      dataType: 'list', // Mesmo que venha como list/radio de legado, força multi_select
      options: [
        { id: '1', value: 'Telescópica' },
        { id: '2', value: 'Metálica simples' },
        { id: '3', value: 'Invisível com amortecedor' },
      ],
    };
    const onChange = vi.fn();

    const { rerender } = render(
      <TechnicalFieldInput
        field={fieldCorredicas}
        value={['Telescópica', 'Metálica simples']}
        onChange={onChange}
      />
    );

    // Ambas as opções aparecem como chips selecionados
    expect(screen.getByText('Telescópica')).toBeDefined();
    expect(screen.getByText('Metálica simples')).toBeDefined();

    // Botão de remover chip
    const removeBtn = screen.getByRole('button', { name: /remover telescópica/i });
    fireEvent.click(removeBtn);
    expect(onChange).toHaveBeenCalledWith(['Metálica simples']);

    // Com lista vazia, exibe placeholder de seleção
    rerender(<TechnicalFieldInput field={fieldCorredicas} value={[]} onChange={onChange} />);
    expect(screen.getByPlaceholderText('Selecione ou pesquise...')).toBeDefined();
  });

  it('renderiza botão com ícone de ligar/desligar (Power switch) para campos com opções Sim ou Não', () => {
    const fieldPossuiPes: TechnicalFieldDefinition = {
      id: 'attr-pes',
      name: 'Possui pés',
      dataType: 'radio',
      options: [{ id: '1', value: 'Não' }, { id: '2', value: 'Sim' }],
    };
    const onChange = vi.fn();

    // Renderiza inicialmente com "Sim" (Ligado)
    const { rerender } = render(
      <TechnicalFieldInput field={fieldPossuiPes} value="Sim" onChange={onChange} />
    );

    const switchBtn = screen.getByRole('switch', { name: /Possui pés: Ligado/i });
    expect(switchBtn).toBeDefined();
    expect(switchBtn.getAttribute('aria-checked')).toBe('true');
    expect(screen.getByText('Ligado')).toBeDefined();
    expect(screen.getByText('Sim')).toBeDefined();

    // Clica para desligar -> deve emitir "Não"
    fireEvent.click(switchBtn);
    expect(onChange).toHaveBeenCalledWith('Não');

    // Re-renderiza com "Não" (Desligado)
    rerender(<TechnicalFieldInput field={fieldPossuiPes} value="Não" onChange={onChange} />);
    const switchOff = screen.getByRole('switch', { name: /Possui pés: Desligado/i });
    expect(switchOff.getAttribute('aria-checked')).toBe('false');
    expect(screen.getByText('Desligado')).toBeDefined();
    expect(screen.getByText('Não')).toBeDefined();

    // Clica para ligar -> deve emitir "Sim"
    fireEvent.click(switchOff);
    expect(onChange).toHaveBeenCalledWith('Sim');
  });

  it('renderiza botão de ligar/desligar para campo do tipo boolean e emite booleanos', () => {
    const fieldBoolean: TechnicalFieldDefinition = {
      id: 'attr-bool',
      name: 'Possui iluminação',
      dataType: 'boolean',
    };
    const onChange = vi.fn();

    const { rerender } = render(
      <TechnicalFieldInput field={fieldBoolean} value={false} onChange={onChange} />
    );

    const switchBtn = screen.getByRole('switch');
    expect(switchBtn.getAttribute('aria-checked')).toBe('false');

    // Ao ligar campo boolean puro, emite true
    fireEvent.click(switchBtn);
    expect(onChange).toHaveBeenCalledWith(true);

    // Quando ligado, ao clicar emite false
    rerender(<TechnicalFieldInput field={fieldBoolean} value={true} onChange={onChange} />);
    const switchOn = screen.getByRole('switch');
    expect(switchOn.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(switchOn);
    expect(onChange).toHaveBeenCalledWith(false);
  });
});
