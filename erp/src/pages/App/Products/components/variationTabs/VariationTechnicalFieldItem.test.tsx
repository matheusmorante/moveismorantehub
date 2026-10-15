// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { TechnicalFieldDefinition } from '@/pages/utils/technicalValuesService';
import {
  VariationTechnicalFieldItem,
  resolveVariationFieldState,
} from './VariationTechnicalFieldItem';

vi.mock('../tabs/technical/TechnicalFieldInput', () => ({
  TechnicalFieldInput: ({ field, value, onChange, disabled }: any) => (
    <input
      data-testid={`input-${field.name}`}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

describe('VariationTechnicalFieldItem', () => {
  const baseField: TechnicalFieldDefinition = {
    id: 'f-1',
    name: 'Material da estrutura',
    dataType: 'text',
    options: [],
  };

  describe('resolveVariationFieldState', () => {
    it('herda valor do pai quando não há override', () => {
      const state = resolveVariationFieldState(
        baseField,
        { 'Material da estrutura': 'Madeira Maciça' },
        {},
        {}
      );

      expect(state.isOverridden).toBe(false);
      expect(state.effectiveVal).toBe('Madeira Maciça');
      expect(state.isInheritedFromParent).toBe(true);
      expect(state.isApplicable).toBe(true);
      expect(state.canEditApplicability).toBe(false);
    });

    it('prioriza override da variação sobre o pai', () => {
      const state = resolveVariationFieldState(
        baseField,
        { 'Material da estrutura': 'Madeira Maciça' },
        {},
        { 'Material da estrutura': 'MDF' }
      );

      expect(state.isOverridden).toBe(true);
      expect(state.effectiveVal).toBe('MDF');
      expect(state.isInheritedFromParent).toBe(false);
      expect(state.canEditApplicability).toBe(true);
    });

    it('identifica Não se aplica corretamente', () => {
      const state = resolveVariationFieldState(
        baseField,
        { 'Material da estrutura': 'Não se aplica' },
        {},
        {}
      );

      expect(state.isApplicable).toBe(false);
    });
  });

  describe('Component rendering & user interactions', () => {
    it('renderiza o campo, botão de sync e input', () => {
      const onSetOverride = vi.fn();
      const onRemoveOverride = vi.fn();
      const onRemoveManualField = vi.fn();
      const onToggleDepthLength = vi.fn();
      const onOpenAttributeModal = vi.fn();

      render(
        <VariationTechnicalFieldItem
          field={baseField}
          parentNormalizedValues={{ 'Material da estrutura': 'Aço' }}
          variationAttributeValues={{}}
          formDataTechnicalValues={{}}
          isManual={false}
          onSetOverride={onSetOverride}
          onRemoveOverride={onRemoveOverride}
          onRemoveManualField={onRemoveManualField}
          onToggleDepthLength={onToggleDepthLength}
          onOpenAttributeModal={onOpenAttributeModal}
        />
      );

      expect(screen.getByText('Material da estrutura')).toBeInTheDocument();
      const input = screen.getByTestId('input-Material da estrutura') as HTMLInputElement;
      expect(input.value).toBe('Aço');
      // Sincronizado com o pai -> input desabilitado
      expect(input).toBeDisabled();

      // Clicar no botão de sync dessincroniza (cria override com valor atual)
      const syncBtn = screen.getByTitle('Sincronizado com o pai — clique para personalizar');
      fireEvent.click(syncBtn);
      expect(onSetOverride).toHaveBeenCalledWith('Material da estrutura', 'Aço');
    });

    it('exibe botão "Gerenciar" para a característica Cor', () => {
      const corField: TechnicalFieldDefinition = {
        id: 'cor-id',
        name: 'Cor',
        dataType: 'list',
        isRequired: true,
        options: [],
      };
      const onOpenModal = vi.fn();

      render(
        <VariationTechnicalFieldItem
          field={corField}
          parentNormalizedValues={{ Cor: 'Azul' }}
          variationAttributeValues={{}}
          isManual={false}
          onSetOverride={vi.fn()}
          onRemoveOverride={vi.fn()}
          onRemoveManualField={vi.fn()}
          onToggleDepthLength={vi.fn()}
          onOpenAttributeModal={onOpenModal}
        />
      );

      const gerenciarBtn = screen.getByRole('button', { name: /gerenciar cores/i });
      expect(gerenciarBtn).toBeInTheDocument();
      fireEvent.click(gerenciarBtn);
      expect(onOpenModal).toHaveBeenCalledTimes(1);
    });

    it('exibe botão de alternar para Profundidade / Comprimento', () => {
      const profField: TechnicalFieldDefinition = {
        id: 'prof-id',
        name: 'Profundidade total',
        dataType: 'measure',
        options: [],
      };
      const onToggle = vi.fn();

      render(
        <VariationTechnicalFieldItem
          field={profField}
          parentNormalizedValues={{ 'Profundidade total': '90' }}
          variationAttributeValues={{}}
          isManual={false}
          onSetOverride={vi.fn()}
          onRemoveOverride={vi.fn()}
          onRemoveManualField={vi.fn()}
          onToggleDepthLength={onToggle}
          onOpenAttributeModal={vi.fn()}
        />
      );

      const toggleBtn = screen.getByTitle('Alternar para Comprimento total');
      expect(toggleBtn).toBeInTheDocument();
      fireEvent.click(toggleBtn);
      expect(onToggle).toHaveBeenCalledWith(profField);
    });
  });
});
