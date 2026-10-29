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

  it.each(['Modelo / Linha', 'Linha / Modelo'])(
    'usa o placeholder do ERP para a característica %s com espaços',
    (name) => {
      const field: TechnicalFieldDefinition = {
        id: 'attr-modelo-linha',
        name,
        dataType: 'text',
        options: [],
      };

      render(<TechnicalFieldInput field={field} value="" onChange={vi.fn()} />);

      expect(screen.getByPlaceholderText('Digite o modelo / linha')).toBeDefined();
    }
  );

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

  it('impede limpar Quantidade de lugares quando já existe um valor', () => {
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

    fireEvent.change(input, { target: { value: '' } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('renderiza Peso sem placeholder numérico e preserva a digitação RTL com 1 casa decimal', () => {
    const field: TechnicalFieldDefinition = {
      id: 'attr-peso',
      name: 'Peso',
      dataType: 'weight',
      options: [],
    };
    const onChange = vi.fn();

    render(<TechnicalFieldInput field={field} value="" onChange={onChange} />);

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.placeholder).toBe('');
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

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.placeholder).toBe('');
    expect(input.value).toBe('15,0');

    // Paste de valor inteiro "20"
    fireEvent.paste(input, { clipboardData: { getData: () => '20' } });
    expect(onChange).toHaveBeenCalledWith(20);
    expect(input.value).toBe('20,0');
  });

  it('renderiza Altura e dimensões sem placeholder numérico e preserva a digitação RTL com 2 casas decimais', () => {
    const field: TechnicalFieldDefinition = {
      id: 'attr-altura',
      name: 'Altura',
      dataType: 'measure',
      options: [],
    };
    const onChange = vi.fn();

    render(<TechnicalFieldInput field={field} value="" onChange={onChange} />);

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.placeholder).toBe('');
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

  it('mantém quantidades vazias no início e permite zero para portas e gavetas', () => {
    const fieldPortas: TechnicalFieldDefinition = {
      id: 'p-2',
      name: 'Quantidade de portas',
      dataType: 'integer',
      options: [],
    };
    const fieldGavetas: TechnicalFieldDefinition = {
      id: 'g-2',
      name: 'Quantidade de gavetas',
      dataType: 'integer',
      options: [],
    };
    const onChange = vi.fn();

    const { rerender } = render(
      <TechnicalFieldInput field={fieldPortas} value="" onChange={onChange} />
    );
    const doorsInput = screen.getByRole('spinbutton') as HTMLInputElement;
    expect(doorsInput.min).toBe('0');
    expect(doorsInput.value).toBe('');
    fireEvent.change(doorsInput, { target: { value: '0' } });
    expect(onChange).toHaveBeenLastCalledWith(0);

    rerender(<TechnicalFieldInput field={fieldPortas} value={2} onChange={onChange} />);
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '' } });
    expect(onChange).toHaveBeenLastCalledWith('');

    rerender(<TechnicalFieldInput field={fieldGavetas} value="0" onChange={onChange} />);
    const drawersInput = screen.getByRole('spinbutton') as HTMLInputElement;
    expect(drawersInput.min).toBe('0');
    expect(drawersInput.value).toBe('0');
  });

  it('força multi_select para Materiais das corrediças e permite alternar opções pela lista', () => {
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

    // A remoção ocorre desmarcando a opção na lista, não no chip exibido.
    fireEvent.click(screen.getByPlaceholderText('Adicionar mais opções...'));
    const selectedOption = screen.getByRole('checkbox', { name: 'Telescópica' });
    expect((selectedOption as HTMLInputElement).checked).toBe(true);
    fireEvent.click(selectedOption);
    expect(onChange).toHaveBeenLastCalledWith(['Metálica simples']);

    // Com lista vazia, exibe placeholder de seleção
    rerender(<TechnicalFieldInput field={fieldCorredicas} value={[]} onChange={onChange} />);
    expect(screen.getByPlaceholderText('Selecione ou pesquise...')).toBeDefined();
  });

  it('reabre seleções múltiplas persistidas com delimitador legado de vírgula', () => {
    const field: TechnicalFieldDefinition = {
      id: 'c-2',
      name: 'Materiais das corrediças',
      dataType: 'multi_select',
      options: [
        { id: '1', value: 'Metal' },
        { id: '2', value: 'Nylon' },
      ],
    };

    render(<TechnicalFieldInput field={field} value="Metal, Nylon" onChange={vi.fn()} />);

    fireEvent.click(screen.getByPlaceholderText('Adicionar mais opções...'));
    expect((screen.getByRole('checkbox', { name: 'Metal' }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('checkbox', { name: 'Nylon' }) as HTMLInputElement).checked).toBe(true);
  });

  it('renderiza as opções Sim/Não como radios para um campo radio', () => {
    const fieldPossuiPes: TechnicalFieldDefinition = {
      id: 'attr-pes',
      name: 'Possui pés',
      dataType: 'radio',
      options: [{ id: '1', value: 'Não' }, { id: '2', value: 'Sim' }],
    };
    const onChange = vi.fn();

    // Renderiza inicialmente com "Sim" selecionado.
    const { rerender } = render(
      <TechnicalFieldInput field={fieldPossuiPes} value="Sim" onChange={onChange} />
    );

    expect((screen.getByRole('radio', { name: 'Sim' }) as HTMLInputElement).checked).toBe(true);

    fireEvent.click(screen.getByRole('radio', { name: 'Não' }));
    expect(onChange).toHaveBeenCalledWith('Não');

    rerender(<TechnicalFieldInput field={fieldPossuiPes} value="Não" onChange={onChange} />);
    expect((screen.getByRole('radio', { name: 'Não' }) as HTMLInputElement).checked).toBe(true);
  });

  it('renderiza booleano como radios e grava valores true/false', () => {
    const fieldBoolean: TechnicalFieldDefinition = {
      id: 'attr-bool',
      name: 'Possui iluminação',
      dataType: 'boolean',
      options: [{ id: 'yes', value: 'Sim' }, { id: 'no', value: 'Não' }],
    };
    const onChange = vi.fn();

    const { rerender } = render(
      <TechnicalFieldInput field={fieldBoolean} value={false} onChange={onChange} />
    );

    expect((screen.getByRole('radio', { name: 'Não' }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('radio', { name: 'Sim' }) as HTMLInputElement).checked).toBe(false);

    fireEvent.click(screen.getByRole('radio', { name: 'Sim' }));
    expect(onChange).toHaveBeenLastCalledWith(true);

    rerender(<TechnicalFieldInput field={fieldBoolean} value={true} onChange={onChange} />);
    expect((screen.getByRole('radio', { name: 'Sim' }) as HTMLInputElement).checked).toBe(true);

    fireEvent.click(screen.getByRole('radio', { name: 'Não' }));
    expect(onChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole('combobox')).toBeNull();
  });
});
