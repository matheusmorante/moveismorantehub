import { describe, it, expect } from 'vitest';
import {
  groupCharacteristicsByTopic,
  mergeCharacteristicGroups,
  getDimensionSortRank,
} from '../../technicalValuesService';

describe('technicalValues - Agrupamento e Ordenação Canônica', () => {
  it('mantém personalizadas em características adicionais e agrupa pés no tópico dedicado Pés', () => {
    const groups = groupCharacteristicsByTopic([
      { name: 'Tipo de pés', isCustom: false },
      { name: 'Acabamento especial', isCustom: true },
    ]);
    expect(groups.map((group) => group.title)).toEqual(['Pés', 'Outras características']);
    expect(groups[1].fields[0].name).toBe('Acabamento especial');
  });

  it('mantém dimensões e peso como tópico separado para aninhamento em Características principais', () => {
    const groups = groupCharacteristicsByTopic([
      { name: 'Marca', isRequired: true },
      { name: 'Altura', isRequired: false },
      { name: 'Largura', isRequired: true },
      { name: 'Peso', isRequired: false },
      { name: 'Peso suportado por prateleira', isRequired: false },
    ]);

    expect(groups.map(({ title }) => title)).toEqual([
      'Características principais',
      'Dimensões e Peso',
      'Prateleiras',
    ]);
    expect(groups[0].fields.map(({ name }) => name)).toEqual(['Marca']);
    expect(groups[1].fields.map(({ name }) => name)).toEqual(['Altura', 'Largura', 'Peso']);
    expect(groups[2].fields.map(({ name }) => name)).toEqual(['Peso suportado por prateleira']);
  });

  it('agrupa características nos subtópicos dedicados de Portas, Gavetas, Prateleiras e Pés com ordenação canônica', () => {
    const groups = groupCharacteristicsByTopic([
      { name: 'Material das portas', isCustom: false },
      { name: 'Quantidade de portas', isCustom: false },
      { name: 'Tipo de portas', isCustom: false },
      { name: 'Material das gavetas', isCustom: false },
      { name: 'Quantidade de gavetas', isCustom: false },
      { name: 'Tipo/material da corrediça', isCustom: false },
      { name: 'Peso suportado por prateleira', isCustom: false },
      { name: 'Quantidade de prateleiras', isCustom: false },
      { name: 'Material das prateleiras', isCustom: false },
      { name: 'Material dos pés', isCustom: false },
      { name: 'Possui pés', isCustom: false },
      { name: 'Quantidade de pés', isCustom: false },
      { name: 'Rodízios', isCustom: false },
      { name: 'Pés reguláveis', isCustom: false },
      { name: 'Material dos puxadores', isCustom: false },
      { name: 'Tipo de puxador', isCustom: false },
    ]);

    const titles = groups.map((g) => g.title);
    expect(titles).toContain('Portas');
    expect(titles).toContain('Gavetas');
    expect(titles).toContain('Prateleiras');
    expect(titles).toContain('Pés');
    expect(titles).toContain('Acessórios');

    const portasGroup = groups.find((g) => g.title === 'Portas')!;
    expect(portasGroup.fields.map((f) => f.name)).toEqual([
      'Quantidade de portas',
      'Tipo de portas',
      'Material das portas',
    ]);

    const gavetasGroup = groups.find((g) => g.title === 'Gavetas')!;
    expect(gavetasGroup.fields.map((f) => f.name)).toEqual([
      'Quantidade de gavetas',
      'Tipo/material da corrediça',
      'Material das gavetas',
    ]);

    const prateleirasGroup = groups.find((g) => g.title === 'Prateleiras')!;
    expect(prateleirasGroup.fields.map((f) => f.name)).toEqual([
      'Quantidade de prateleiras',
      'Material das prateleiras',
      'Peso suportado por prateleira',
    ]);

    const pesGroup = groups.find((g) => g.title === 'Pés')!;
    expect(pesGroup.fields.map((f) => f.name)).toEqual([
      'Possui pés',
      'Quantidade de pés',
      'Material dos pés',
      'Pés reguláveis',
      'Rodízios',
    ]);

    const acessoriosGroup = groups.find((g) => g.title === 'Acessórios')!;
    expect(acessoriosGroup.fields.map((f) => f.name)).toEqual([
      'Tipo de puxador',
      'Material dos puxadores',
    ]);
  });

  it('mescla grupos com o mesmo título preservando a ordenação canônica interna', () => {
    const merged = mergeCharacteristicGroups([
      {
        title: 'Portas',
        fields: [{ name: 'Material das portas' }, { name: 'Tipo de portas' }],
      },
      {
        title: 'Portas',
        fields: [{ name: 'Quantidade de portas' }],
      },
    ]);

    expect(merged.length).toBe(1);
    expect(merged[0].fields.map((f) => f.name)).toEqual([
      'Quantidade de portas',
      'Tipo de portas',
      'Material das portas',
    ]);
  });

  it('atribui rank canônico correto para dimensões', () => {
    expect(getDimensionSortRank('Altura total')).toBe(1);
    expect(getDimensionSortRank('altura')).toBe(1);
    expect(getDimensionSortRank('Espessura')).toBe(2);
    expect(getDimensionSortRank('Largura')).toBe(3);
    expect(getDimensionSortRank('Profundidade')).toBe(4);
    expect(getDimensionSortRank('Comprimento')).toBe(5);
    expect(getDimensionSortRank('peso')).toBe(9);
    expect(getDimensionSortRank('peso suportado')).toBe(10);
    expect(getDimensionSortRank('outra')).toBe(99);
  });
});
