// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { TechnicalFieldRow } from './TechnicalFieldRow';
import type { TechnicalFieldDefinition } from '@/pages/utils/technicalValuesService';

describe('TechnicalFieldRow', () => {
  afterEach(() => {
    cleanup();
  });
  it('renderiza o campo com nome e unidade sem asterisco vermelho de cadastro quando opcional', () => {
    const field: TechnicalFieldDefinition = {
      id: 'f1',
      name: 'Observações',
      dataType: 'text',
      unit: 'cm',
      options: [],
      isRequired: false,
    };

    render(
      <TechnicalFieldRow
        field={field}
        formData={{ height: 120, technicalValues: { Observações: '120' } }}
        manualFieldNames={[]}
        onValueChange={vi.fn()}
        onOpenAttributeModal={vi.fn()}
        onRemoveManualField={vi.fn()}
      />
    );

    expect(screen.getByText('Observações (cm)')).toBeDefined();
    expect(screen.queryByText('*')).toBeNull();
  });

  it('exibe botão Gerenciar para campo de Cor e aciona callback', () => {
    const field: TechnicalFieldDefinition = {
      id: 'f2',
      name: 'Cor',
      dataType: 'text',
      options: [],
      isRequired: true,
    };
    const onOpenModal = vi.fn();

    render(
      <TechnicalFieldRow
        field={field}
        formData={{ technicalValues: { Cor: 'Azul' } }}
        manualFieldNames={[]}
        onValueChange={vi.fn()}
        onOpenAttributeModal={onOpenModal}
        onRemoveManualField={vi.fn()}
      />
    );

    const btn = screen.getByRole('button', { name: /gerenciar cores/i });
    const label = screen.getByText('Cor').closest('label');
    expect(label?.parentElement?.contains(btn)).toBe(true);
    fireEvent.click(btn);
    expect(onOpenModal).toHaveBeenCalledTimes(1);
  });

  it('não exibe botão switch para campo opcional e permite edição natural sem asterisco de obrigatório', () => {
    const field: TechnicalFieldDefinition = {
      id: 'f3',
      name: 'Material da estrutura',
      dataType: 'text',
      options: [],
      isRequired: false,
    };
    const onValueChange = vi.fn();

    render(
      <TechnicalFieldRow
        field={field}
        formData={{ technicalValues: { 'Material da estrutura': 'MDF' } }}
        manualFieldNames={[]}
        onValueChange={onValueChange}
        onOpenAttributeModal={vi.fn()}
        onRemoveManualField={vi.fn()}
      />
    );

    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.queryByText('*')).toBeNull();
  });

  it('usa seletor sem borda com ícone e dropdown para escolher o escopo', () => {
    const field: TechnicalFieldDefinition = {
      id: 'f-variable',
      name: 'Material da estrutura',
      dataType: 'text',
      options: [],
      isRequired: false,
    };
    const onToggleVariable = vi.fn();

    const { rerender, container } = render(
      <TechnicalFieldRow
        field={field}
        formData={{ technicalValues: { 'Material da estrutura': 'MDF' } }}
        manualFieldNames={[]}
        onValueChange={vi.fn()}
        onOpenAttributeModal={vi.fn()}
        onRemoveManualField={vi.fn()}
        onToggleVariable={onToggleVariable}
      />
    );

    const scopeButton = screen.getByRole('button', {
      name: 'Escopo da característica Material da estrutura: Global',
    });
    expect(scopeButton.getAttribute('class')).not.toContain('border');
    expect(scopeButton.querySelectorAll('svg')).toHaveLength(2);
    expect(container.querySelector('input, select, textarea')).not.toBeNull();
    fireEvent.click(scopeButton);
    expect(screen.getByRole('menuitemradio', { name: 'Global' })).toBeDefined();
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Por variação' }));
    expect(onToggleVariable).toHaveBeenCalledWith('Material da estrutura', 'variation');

    rerender(
      <TechnicalFieldRow
        field={field}
        formData={{ technicalValues: { 'Material da estrutura': 'MDF' } }}
        manualFieldNames={[]}
        onValueChange={vi.fn()}
        onOpenAttributeModal={vi.fn()}
        onRemoveManualField={vi.fn()}
        isVariable
        onToggleVariable={onToggleVariable}
      />
    );
    const selectedVariableButton = screen.getByRole('button', {
      name: 'Escopo da característica Material da estrutura: Por variação',
    });
    expect(selectedVariableButton.querySelectorAll('svg')).toHaveLength(2);
    expect(screen.getByPlaceholderText('Defina na variação...')).toBeDefined();
  });

  it('permite escolher o escopo próprio de uma característica dependente em produto com variações', () => {
    const field: TechnicalFieldDefinition = {
      id: 'dependent-opening',
      name: 'Tipo de portas',
      dataType: 'radio',
      options: [{ id: 'sliding', value: 'Correr' }],
      dependency: {
        referenceAttributeId: 'door-quantity',
        operator: 'greater_than',
        value: '0',
      },
    };
    const onToggleVariable = vi.fn();

    render(
      <TechnicalFieldRow
        field={field}
        formData={{ technicalValues: { 'Quantidade de portas': 2, 'Tipo de portas': 'Correr' } }}
        manualFieldNames={[]}
        isDependencyVariable
        onToggleVariable={onToggleVariable}
        onValueChange={vi.fn()}
        onOpenAttributeModal={vi.fn()}
        onRemoveManualField={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', {
      name: 'Escopo da característica Tipo de portas: Global',
    }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Por variação' }));
    expect(onToggleVariable).toHaveBeenCalledWith('Tipo de portas', 'variation');
  });

  it('esconde o seletor do produto pai quando a característica é variável', () => {
    const field: TechnicalFieldDefinition = {
      id: 'f-variable-select',
      name: 'Acabamento',
      dataType: 'list',
      options: [{ id: '1', value: 'Fosco' }],
      isRequired: false,
    };

    const { rerender } = render(
        <TechnicalFieldRow
        field={field}
        formData={{ technicalValues: { Acabamento: 'Fosco' } }}
        manualFieldNames={[]}
        onValueChange={vi.fn()}
        onOpenAttributeModal={vi.fn()}
        onRemoveManualField={vi.fn()}
        onToggleVariable={vi.fn()}
      />
    );

    expect(screen.getByRole('combobox')).toBeDefined();

    rerender(
      <TechnicalFieldRow
        field={field}
        formData={{ technicalValues: { Acabamento: 'Fosco' } }}
        manualFieldNames={[]}
        onValueChange={vi.fn()}
        onOpenAttributeModal={vi.fn()}
        onRemoveManualField={vi.fn()}
        isVariable
        onToggleVariable={vi.fn()}
      />
    );

    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('mantém características obrigatórias da categoria ativas e exclui Não informar do escopo de variações', () => {
    const field: TechnicalFieldDefinition = {
      id: 'category-required',
      name: 'Acabamento',
      dataType: 'text',
      options: [],
      isRequired: false,
      isRequiredForCatalog: true,
    };
    const onToggleVariable = vi.fn();

    const { rerender } = render(
      <TechnicalFieldRow
        field={field}
        formData={{}}
        manualFieldNames={[]}
        isSimpleProduct
        onToggleVariable={onToggleVariable}
        onValueChange={vi.fn()}
        onOpenAttributeModal={vi.fn()}
        onRemoveManualField={vi.fn()}
      />
    );

    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.getByRole('textbox')).toBeDefined();

    rerender(
      <TechnicalFieldRow
        field={field}
        formData={{}}
        manualFieldNames={[]}
        isVariable
        onToggleVariable={onToggleVariable}
        onValueChange={vi.fn()}
        onOpenAttributeModal={vi.fn()}
        onRemoveManualField={vi.fn()}
      />
    );

    const scopeButton = screen.getByRole('button', {
      name: 'Escopo da característica Acabamento: Por variação',
    });
    fireEvent.click(scopeButton);
    expect(screen.getAllByRole('menuitemradio')).toHaveLength(2);
    expect(screen.queryByRole('menuitemradio', { name: /não informar/i })).toBeNull();
    expect(screen.getByPlaceholderText('Defina na variação...')).toBeDefined();
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Global' }));
    expect(onToggleVariable).toHaveBeenCalledWith('Acabamento', 'global');
  });

  it('mantém características obrigatórias do produto ligadas sem switch simples e limita variações ao escopo ativo', () => {
    const field: TechnicalFieldDefinition = {
      id: 'globally-required',
      name: 'Cor',
      dataType: 'text',
      options: [],
      isRequired: true,
    };
    const onToggleVariable = vi.fn();
    const props = {
      field,
      formData: {},
      manualFieldNames: [],
      onToggleVariable,
      onValueChange: vi.fn(),
      onOpenAttributeModal: vi.fn(),
      onRemoveManualField: vi.fn(),
    };

    const { rerender } = render(<TechnicalFieldRow {...props} isSimpleProduct />);
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.getByRole('textbox')).toBeDefined();

    rerender(<TechnicalFieldRow {...props} isVariable />);
    expect(screen.queryByRole('switch')).toBeNull();
    const scopeButton = screen.getByRole('button', {
      name: 'Escopo da característica Cor: Por variação',
    });
    fireEvent.click(scopeButton);
    expect(screen.getAllByRole('menuitemradio')).toHaveLength(2);
    expect(screen.queryByRole('menuitemradio', { name: /não informar/i })).toBeNull();
    expect(screen.getByPlaceholderText('Defina na variação...')).toBeDefined();
  });

  it('exibe botão de exclusão para campos manuais e aciona remoção', () => {
    const field: TechnicalFieldDefinition = {
      id: 'f4',
      name: 'Garantia',
      dataType: 'text',
      options: [],
      isRequired: false,
    };
    const onRemoveManualField = vi.fn();

    render(
      <TechnicalFieldRow
        field={field}
        formData={{ technicalValues: { Garantia: '1 ano' } }}
        manualFieldNames={['Garantia']}
        onValueChange={vi.fn()}
        onOpenAttributeModal={vi.fn()}
        onRemoveManualField={onRemoveManualField}
      />
    );

    const deleteBtn = screen.getByRole('button', { name: /remover campo garantia/i });
    fireEvent.click(deleteBtn);
    expect(onRemoveManualField).toHaveBeenCalledWith('Garantia');
  });

  it('desativa campo dependente de portas quando a quantidade de portas for 0 ou vazia, ocultando asterisco e exibindo tooltip explicativo', () => {
    const field: TechnicalFieldDefinition = {
      id: 'f-tipo-porta',
      name: 'Tipo de portas',
      dataType: 'list',
      isRequired: true,
      options: [{ id: '1', value: 'De correr' }, { id: '2', value: 'De bater' }],
    };

    const { rerender } = render(
      <TechnicalFieldRow
        field={field}
        formData={{ technicalValues: { 'Quantidade de portas': 0, 'Tipo de portas': 'De correr' } }}
        manualFieldNames={[]}
        onValueChange={vi.fn()}
        onOpenAttributeModal={vi.fn()}
        onRemoveManualField={vi.fn()}
      />
    );

    // Asterisco ocultado quando desativado
    expect(screen.queryByLabelText('Obrigatório')).toBeNull();

    // Botão de info no rótulo e overlay no input presentes com a razão
    const disabledButtons = screen.getAllByRole('button', {
      name: /Disponível apenas quando a quantidade de portas for maior que zero/i,
    });
    expect(disabledButtons.length).toBe(2);
    const [infoBtn, overlay] = disabledButtons;

    // Hover na área do campo exibe o tooltip
    const container = overlay.parentElement!;
    fireEvent.mouseEnter(container);

    expect(screen.getByRole('tooltip')).toBeDefined();
    expect(
      screen.getByText('Disponível apenas quando a quantidade de portas for maior que zero.')
    ).toBeDefined();

    // Mouse leave fecha o tooltip
    fireEvent.mouseLeave(container);
    expect(screen.queryByRole('tooltip')).toBeNull();

    // Clique no overlay abre o tooltip
    fireEvent.click(overlay);
    expect(screen.getByRole('tooltip')).toBeDefined();

    // Clique de novo fecha
    fireEvent.click(overlay);
    expect(screen.queryByRole('tooltip')).toBeNull();

    // Clique no infoBtn abre o tooltip
    fireEvent.click(infoBtn);
    expect(screen.getByRole('tooltip')).toBeDefined();

    // Quantidade maior que zero reativa o campo, mesmo com valor legado Possui portas = Não.
    rerender(
      <TechnicalFieldRow
        field={field}
        formData={{ technicalValues: { 'Quantidade de portas': 2, 'Possui portas': 'Não' } }}
        manualFieldNames={[]}
        onValueChange={vi.fn()}
        onOpenAttributeModal={vi.fn()}
        onRemoveManualField={vi.fn()}
      />
    );

    // Asterisco de cadastro não deve ser exibido para características
    expect(screen.queryByLabelText('Obrigatório')).toBeNull();
    // Info btn e overlay desaparecem
    expect(
      screen.queryByRole('button', {
        name: /Disponível apenas quando a quantidade de portas for maior que zero/i,
      })
    ).toBeNull();
  });

  it('desativa campo Materiais das corrediças quando a quantidade de gavetas for 0', () => {
    const field: TechnicalFieldDefinition = {
      id: 'f-corredica',
      name: 'Materiais das corrediças',
      dataType: 'list',
      isRequired: false,
      options: [{ id: '1', value: 'Telescópica' }],
    };

    render(
      <TechnicalFieldRow
        field={field}
        formData={{ technicalValues: { 'Quantidade de gavetas': 0, 'Materiais das corrediças': 'Telescópica' } }}
        manualFieldNames={[]}
        onValueChange={vi.fn()}
        onOpenAttributeModal={vi.fn()}
        onRemoveManualField={vi.fn()}
      />
    );

    const disabledButtons = screen.getAllByRole('button', {
      name: /Disponível apenas quando a quantidade de gavetas for maior que zero/i,
    });
    expect(disabledButtons.length).toBe(2);
  });
});
