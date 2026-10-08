import { describe, expect, it } from 'vitest';
import {
  getTechnicalFieldInputMode,
  getTechnicalFieldIntegerLimit,
  getTechnicalFieldIntegerPlaceholder,
  getTechnicalFieldMaxLength,
  getTechnicalFieldTextPlaceholder,
  resolveTechnicalFieldDataType,
} from './technicalFieldInputRules';

describe('technical field choice input parity', () => {
  it('keeps ERP sized lists inline through eight values', () => {
    expect(getTechnicalFieldInputMode('list', 1)).toBe('inline');
    expect(getTechnicalFieldInputMode('list', 8)).toBe('inline');
    expect(getTechnicalFieldInputMode('radio', 8)).toBe('inline');
    expect(getTechnicalFieldInputMode('list', 9)).toBe('searchable');
    expect(getTechnicalFieldInputMode('list', 0)).toBe('searchable');
  });

  it('uses searchable selection for large lists and multi-select fields', () => {
    expect(getTechnicalFieldInputMode('radio', 9)).toBe('searchable');
    expect(getTechnicalFieldInputMode('radio', 0)).toBe('searchable');
    expect(getTechnicalFieldInputMode('multi_select', 3)).toBe('searchable');
    expect(getTechnicalFieldInputMode('boolean', 2)).toBe('searchable');
    expect(getTechnicalFieldInputMode('text', 9)).toBe('text');
  });
});

describe('technical field overrides from ERP', () => {
  it.each(['Linha', 'Marca', 'Modelo'])(
    'uses short text for %s even when configured as a list',
    (name) => {
      expect(resolveTechnicalFieldDataType(name, 'list')).toBe('text_short');
    }
  );

  it('uses numeric input and the ERP limit for seat and door counts', () => {
    expect(resolveTechnicalFieldDataType('Quantidade de lugares', 'radio')).toBe('integer');
    expect(getTechnicalFieldIntegerLimit('Quantidade de lugares')).toBe(100);
    expect(getTechnicalFieldIntegerPlaceholder('Quantidade de lugares')).toBe(
      'Digite o número de quantidades'
    );
    expect(resolveTechnicalFieldDataType('Quantidade de portas', 'list')).toBe('integer');
    expect(getTechnicalFieldIntegerLimit('Quantidade de portas')).toBe(50);
    expect(getTechnicalFieldIntegerPlaceholder('Quantidade de gavetas')).toBe(
      'Insira a quantidade de portas'
    );
  });

  it('uses ERP placeholders for short text characteristics', () => {
    expect(getTechnicalFieldTextPlaceholder('Marca')).toBe('Digite a marca');
    expect(getTechnicalFieldTextPlaceholder('Modelo')).toBe('Digite o modelo');
    expect(getTechnicalFieldTextPlaceholder('Linha')).toBe('Digite a linha');
    expect(getTechnicalFieldTextPlaceholder('Acabamento')).toBeUndefined();
    expect(getTechnicalFieldMaxLength('Linha', 'text_short')).toBe(30);
    expect(getTechnicalFieldMaxLength('Cor', 'text_short')).toBe(120);
    expect(getTechnicalFieldMaxLength('Cor', 'integer')).toBeUndefined();
  });
});
