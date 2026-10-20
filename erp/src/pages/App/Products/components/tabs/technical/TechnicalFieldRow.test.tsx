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
      unit: 'cm',
      isRequired: false,
    };

    render(
      <TechnicalFieldRow
        field={field}
        formData={{ height: 120, technicalValues: { Observações: '120' } }}
        manualFieldNames={[]}
        onValueChange={vi.fn()}
        onOpenAttributeModal={vi.fn()}
        onToggleDepthLength={vi.fn()}
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
        onToggleDepthLength={vi.fn()}
        onRemoveManualField={vi.fn()}
      />
    );

    const btn = screen.getByRole('button', { name: /gerenciar cores/i });
    fireEvent.click(btn);
    expect(onOpenModal).toHaveBeenCalledTimes(1);
  });

  it('não exibe botão switch para campo opcional e permite edição natural sem asterisco de obrigatório', () => {
    const field: TechnicalFieldDefinition = {
      id: 'f3',
      name: 'Material da estrutura',
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
        onToggleDepthLength={vi.fn()}
        onRemoveManualField={vi.fn()}
      />
    );

    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.queryByText('*')).toBeNull();
  });

  it('exibe botão de exclusão para campos manuais e aciona remoção', () => {
    const field: TechnicalFieldDefinition = {
      id: 'f4',
      name: 'Garantia',
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
        onToggleDepthLength={vi.fn()}
        onRemoveManualField={onRemoveManualField}
      />
    );

    const deleteBtn = screen.getByRole('button', { name: /remover campo garantia/i });
    fireEvent.click(deleteBtn);
    expect(onRemoveManualField).toHaveBeenCalledWith('Garantia');
  });

  it('exibe botão de alternância entre profundidade e comprimento', () => {
    const field: TechnicalFieldDefinition = {
      id: 'f5',
      name: 'Profundidade',
      isRequired: true,
    };
    const onToggleDepthLength = vi.fn();

    render(
      <TechnicalFieldRow
        field={field}
        formData={{ depth: 45, technicalValues: { Profundidade: '45' } }}
        manualFieldNames={[]}
        onValueChange={vi.fn()}
        onOpenAttributeModal={vi.fn()}
        onToggleDepthLength={onToggleDepthLength}
        onRemoveManualField={vi.fn()}
      />
    );

    const swapBtn = screen.getByRole('button', { name: /alternar para comprimento/i });
    fireEvent.click(swapBtn);
    expect(onToggleDepthLength).toHaveBeenCalledWith(field);
  });

  it('desativa campo dependente de portas quando a quantidade de portas for 0 ou vazia, ocultando asterisco e exibindo tooltip explicativo', () => {
    const field: TechnicalFieldDefinition = {
      id: 'f-tipo-porta',
      name: 'Tipo de portas',
      isRequired: true,
      options: [{ id: '1', value: 'De correr' }, { id: '2', value: 'De bater' }],
    };

    const { rerender } = render(
      <TechnicalFieldRow
        field={field}
        formData={{ technicalValues: { 'Quantidade de portas': 0 } }}
        manualFieldNames={[]}
        onValueChange={vi.fn()}
        onOpenAttributeModal={vi.fn()}
        onToggleDepthLength={vi.fn()}
        onRemoveManualField={vi.fn()}
      />
    );

    // Asterisco ocultado quando desativado
    expect(screen.queryByLabelText('Obrigatório')).toBeNull();

    // Botão de info no rótulo e overlay no input presentes com a razão
    const disabledButtons = screen.getAllByRole('button', {
      name: /Disponível apenas quando Possui portas for Sim/i,
    });
    expect(disabledButtons.length).toBe(2);
    const [infoBtn, overlay] = disabledButtons;

    // Hover na área do campo exibe o tooltip
    const container = overlay.parentElement!;
    fireEvent.mouseEnter(container);

    expect(screen.getByRole('tooltip')).toBeDefined();
    expect(
      screen.getByText('Disponível apenas quando Possui portas for Sim.')
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

    // Quando quantidade de portas for maior que zero (ou Possui portas = Sim), reativa o campo
    rerender(
      <TechnicalFieldRow
        field={field}
        formData={{ technicalValues: { 'Quantidade de portas': 2 } }}
        manualFieldNames={[]}
        onValueChange={vi.fn()}
        onOpenAttributeModal={vi.fn()}
        onToggleDepthLength={vi.fn()}
        onRemoveManualField={vi.fn()}
      />
    );

    // Asterisco de cadastro não deve ser exibido para características
    expect(screen.queryByLabelText('Obrigatório')).toBeNull();
    // Info btn e overlay desaparecem
    expect(
      screen.queryByRole('button', {
        name: /Disponível apenas quando Possui portas for Sim/i,
      })
    ).toBeNull();
  });

  it('desativa campo Materiais das corrediças quando a quantidade de gavetas for 0', () => {
    const field: TechnicalFieldDefinition = {
      id: 'f-corredica',
      name: 'Materiais das corrediças',
      isRequired: false,
      options: [{ id: '1', value: 'Telescópica' }],
    };

    render(
      <TechnicalFieldRow
        field={field}
        formData={{ technicalValues: { 'Quantidade de gavetas': 0 } }}
        manualFieldNames={[]}
        onValueChange={vi.fn()}
        onOpenAttributeModal={vi.fn()}
        onToggleDepthLength={vi.fn()}
        onRemoveManualField={vi.fn()}
      />
    );

    const disabledButtons = screen.getAllByRole('button', {
      name: /Disponível apenas quando Possui gavetas for Sim/i,
    });
    expect(disabledButtons.length).toBe(2);
  });
});
