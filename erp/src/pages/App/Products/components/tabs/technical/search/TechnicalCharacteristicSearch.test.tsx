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

  it('não exibe sugestões antes do usuário digitar ao menos 3 caracteres', () => {
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

    expect(screen.queryByText('Digite pelo menos 3 caracteres para pesquisar.')).toBeNull();
    expect(screen.queryByText('Resultados agrupados por grupo.')).toBeNull();
    expect(screen.queryByRole('button', { name: /selecionar característica/i })).toBeNull();
  });

  it('exibe lista de características encontradas e aciona onAddField ao clicar', () => {
    const matchingFields: TechnicalFieldDefinition[] = [
      { id: 'f-1', name: 'Material do estofado', dataType: 'text', options: [] },
      { id: 'f-2', name: 'Peso suportado', dataType: 'text', options: [], unit: 'kg' },
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

    const addBtns = screen.getAllByRole('button', { name: /selecionar característica/i });
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

    expect(screen.getByText(/Grupo · Portas/)).toBeDefined();

    const addGroupBtn = screen.getByRole('button', { name: /Grupo · Portas/ });
    expect(addGroupBtn).toBeDefined();

    fireEvent.click(addGroupBtn);
    expect(onAddGroup).toHaveBeenCalledWith(matchingGroups[0]);
  });

  it('oferece a ativação da característica opcional no resultado agrupado', () => {
    const field: TechnicalFieldDefinition = {
      id: 'drawer-runner',
      name: 'Tipo de corrediça',
      dataType: 'radio',
      options: [],
      groupId: 'drawers',
    };

    const onToggleCharacteristic = vi.fn();
    render(
      <TechnicalCharacteristicSearch
        searchTerm="corrediça"
        onSearchTermChange={vi.fn()}
        normalizedSearchTerm="corredica"
        normalizedDebouncedSearchTerm="corredica"
        matchingFields={[]}
        matchingProductGroups={[{
          id: 'drawers',
          name: 'Gavetas',
          fields: [],
          availableFields: [field],
        }]}
        matchingProductGroupFields={[{ field, active: false, scope: 'not_inform' }]}
        onAddField={vi.fn()}
        onToggleCharacteristic={onToggleCharacteristic}
      />
    );

    expect(screen.getByRole('region', { name: 'Grupo Gavetas' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Adicionar grupo Gavetas' })).toBeNull();
    fireEvent.click(screen.getByRole('switch', { name: 'Ativar característica Tipo de corrediça' }));
    expect(onToggleCharacteristic).toHaveBeenCalledWith(field);
  });

  it('localiza uma característica já adicionada sem duplicá-la', () => {
    const field: TechnicalFieldDefinition = {
      id: 'drawer-runner',
      name: 'Tipo de corrediça',
      dataType: 'radio',
      options: [],
      groupId: 'drawers',
    };
    const group = {
      id: 'drawers',
      name: 'Gavetas',
      fields: [field],
      availableFields: [field],
    };
    const onAddCharacteristicGroup = vi.fn();
    const onLocateCharacteristic = vi.fn();

    render(
      <TechnicalCharacteristicSearch
        searchTerm="corrediça"
        onSearchTermChange={vi.fn()}
        normalizedSearchTerm="corredica"
        normalizedDebouncedSearchTerm="corredica"
        matchingFields={[]}
        matchingProductGroups={[group]}
        matchingProductGroupFields={[{ field, active: true, scope: 'global' }]}
        onAddField={vi.fn()}
        onAddCharacteristicGroup={onAddCharacteristicGroup}
        onLocateCharacteristic={onLocateCharacteristic}
        onLocateGroup={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Localizar característica Tipo de corrediça' }));
    expect(onLocateCharacteristic).toHaveBeenCalledWith(field);
    expect(onAddCharacteristicGroup).not.toHaveBeenCalled();
  });
});
