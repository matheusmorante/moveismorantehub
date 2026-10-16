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
  it('renderiza o campo com nome, unidade e asterisco de obrigatório', () => {
    const field: TechnicalFieldDefinition = {
      id: 'f1',
      name: 'Altura',
      unit: 'cm',
      isRequired: true,
    };

    render(
      <TechnicalFieldRow
        field={field}
        formData={{ height: 120, technicalValues: { Altura: '120' } }}
        manualFieldNames={[]}
        onValueChange={vi.fn()}
        onOpenAttributeModal={vi.fn()}
        onToggleDepthLength={vi.fn()}
        onRemoveManualField={vi.fn()}
      />
    );

    expect(screen.getByText('Altura (cm)')).toBeDefined();
    expect(screen.getByText('*')).toBeDefined();
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
});
