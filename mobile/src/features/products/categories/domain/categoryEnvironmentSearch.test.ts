import { describe, expect, it } from 'vitest';
import { filterEnvironmentsBySearch } from '../../../../../../shared-utils/categoryEnvironmentSearch';

describe('filterEnvironmentsBySearch', () => {
  const environments = [
    { id: 'environment-living', name: 'SALA', categories: ['category-sofa'] },
    { id: 'environment-bedroom', name: 'QUARTO', categories: ['category-bed'] },
    { id: 'environment-outdoor', name: 'VARANDA', categories: [] },
  ];
  const categories = [
    { id: 'category-sofa', name: 'SOFÁ' },
    { id: 'category-bed', name: 'CAMA' },
    { id: 'category-orphan', name: 'POLTRONA ÓRFÃ' },
  ];

  it('preserva a coleção para termo vazio ou composto só por espaços', () => {
    expect(filterEnvironmentsBySearch(environments, categories, '')).toBe(environments);
    expect(filterEnvironmentsBySearch(environments, categories, '   ')).toBe(environments);
  });

  it('localiza o ambiente pelo próprio nome sem diferenciar maiúsculas', () => {
    expect(filterEnvironmentsBySearch(environments, categories, 'sala')).toEqual([
      environments[0],
    ]);
  });

  it('localiza todos os ambientes que contêm uma categoria vinculada pelo nome', () => {
    expect(filterEnvironmentsBySearch(environments, categories, 'cama')).toEqual([
      environments[1],
    ]);
  });

  it('não atribui uma categoria órfã a nenhum ambiente', () => {
    expect(filterEnvironmentsBySearch(environments, categories, 'órfã')).toEqual([]);
  });

  it('preserva espaços externos de um termo não vazio como o ERP', () => {
    expect(filterEnvironmentsBySearch(environments, categories, '  sofá  ')).toEqual([]);
  });
});
