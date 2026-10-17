// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { TechnicalCharacteristicSearch } from './TechnicalCharacteristicSearch';
import type { TechnicalFieldDefinition } from '@/pages/utils/technicalValuesService';

describe('TechnicalCharacteristicSearch', () => {
  afterEach(() => {
    cleanup();
  });
  it('renderiza campo de busca e emite onSearchTermChange ao digitar', () => {
    const onSearchChange = vi.fn();
    render(
      <TechnicalCharacteristicSearch
        searchTerm="al"
        onSearchTermChange={onSearchChange}
        normalizedSearchTerm="al"
        normalizedDebouncedSearchTerm="al"
        matchingFields={[]}
        onAddField={vi.fn()}
      />
    );

    const input = screen.getByRole('searchbox');
    expect(input).toBeDefined();

    fireEvent.change(input, { target: { value: 'altu' } });
    expect(onSearchChange).toHaveBeenCalledWith('altu');
  });

  it('exibe texto informativo para menos de 3 caracteres', () => {
    render(
      <TechnicalCharacteristicSearch
        searchTerm="ab"
        onSearchTermChange={vi.fn()}
        normalizedSearchTerm="ab"
        normalizedDebouncedSearchTerm="ab"
        matchingFields={[]}
        onAddField={vi.fn()}
      />
    );

    expect(screen.getByText('Digite pelo menos 3 caracteres para pesquisar.')).toBeDefined();
  });

  it('exibe lista de características encontradas e aciona onAddField ao clicar', () => {
    const matchingFields: TechnicalFieldDefinition[] = [
      { id: 'f-1', name: 'Material do estofado' },
      { id: 'f-2', name: 'Peso suportado', unit: 'kg' },
    ];
    const onAddField = vi.fn();

    render(
      <TechnicalCharacteristicSearch
        searchTerm="peso"
        onSearchTermChange={vi.fn()}
        normalizedSearchTerm="peso"
        normalizedDebouncedSearchTerm="peso"
        matchingFields={matchingFields}
        onAddField={onAddField}
      />
    );

    expect(screen.getByText('Material do estofado')).toBeDefined();
    expect(screen.getByText('Peso suportado (kg)')).toBeDefined();

    const addBtns = screen.getAllByRole('button', { name: /adicionar característica/i });
    expect(addBtns.length).toBe(2);

    fireEvent.click(addBtns[1]);
    expect(onAddField).toHaveBeenCalledWith(matchingFields[1]);
  });

  it('exibe grupo encontrado na pesquisa (ex: Portas) e aciona onAddGroup ao clicar em Adicionar grupo', () => {
    const matchingGroups = [
      {
        id: 'portas',
        title: 'Portas',
        searchKeywords: ['porta', 'portas'],
        masterField: 'Quantidade de portas',
        fieldNames: ['Quantidade de portas', 'Tipo de portas', 'Material das portas'],
        description: 'Quantidade de portas, Tipo de portas e Material das portas',
      },
    ];
    const onAddGroup = vi.fn();

    render(
      <TechnicalCharacteristicSearch
        searchTerm="porta"
        onSearchTermChange={vi.fn()}
        normalizedSearchTerm="porta"
        normalizedDebouncedSearchTerm="porta"
        matchingFields={[]}
        matchingGroups={matchingGroups}
        onAddField={vi.fn()}
        onAddGroup={onAddGroup}
      />
    );

    expect(screen.getByText('Grupo')).toBeDefined();
    expect(screen.getByText('Portas')).toBeDefined();
    expect(
      screen.getByText('Quantidade de portas, Tipo de portas e Material das portas')
    ).toBeDefined();

    const addGroupBtn = screen.getByRole('button', { name: /adicionar grupo portas/i });
    expect(addGroupBtn).toBeDefined();

    fireEvent.click(addGroupBtn);
    expect(onAddGroup).toHaveBeenCalledWith(matchingGroups[0]);
  });
});
