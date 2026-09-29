import { describe, expect, it } from 'vitest';
import {
  keepManualCategorySelection,
  matchCategoryByRules,
  rankCategoryCandidates,
  resolveAutoCategory,
} from '../categoryResolutionService';

const categories = [
  { id: 'wardrobes', name: 'Guarda-Roupas' },
  { id: 'kitchen-sink-cabinets', name: 'Balcões para Pia' },
  { id: 'countertops', name: 'Balcões com Tampo' },
  { id: 'cooktop-cabinets', name: 'Balcões para Cooktop' },
  { id: 'aerial-cabinets', name: 'Armários Aéreos' },
  { id: 'bathroom-sets', name: 'Conjuntos para Banheiro' },
  { id: 'bathroom-mirrors', name: 'Espelheira para Banheiro' },
  { id: 'kitchen-sets', name: 'Conjunto para Sala de Jantar' },
  { id: 'dining-tables', name: 'Mesa para Sala de Jantar' },
  { id: 'pias', name: 'Pias' },
];

describe('categoryResolutionService', () => {
  it.each([
    ['Guarda Roupa 6 Portas', 'wardrobes'],
    ['G Roupa 6P', 'wardrobes'],
    ['Roupeiro Casal', 'wardrobes'],
    ['Armário para roupa', 'wardrobes'],
    ['Guarda roipa', 'wardrobes'],
    ['Roupeio 6 portas casal', 'wardrobes'],
    ['Balcão para pia 120cm', 'kitchen-sink-cabinets'],
    ['G ROUPA DEMOBILE CADIS 4PT 6GV ESP PES 66510-140 Amendola/Off White', 'wardrobes'],
    ['Balcao de Pia Luciane Isis 3pt 2gv 120cm S/Tp Isi', 'kitchen-sink-cabinets'],
    ['Gabinete para pia', 'kitchen-sink-cabinets'],
    ['Balcão com tampo 1,20m', 'countertops'],
    ['Balcão para cooktop 4 bocas', 'cooktop-cabinets'],
    ['Armário aéreo cozinha 3 portas', 'aerial-cabinets'],
    ['Conjunto de banheiro Veneza', 'bathroom-sets'],
    ['CJ SALA JANTAR MADETAL MOSCOU 136CM 4CAD GRECIA', 'kitchen-sets'],
  ])('classifica "%s" como %s', (title, expectedId) => {
    expect(matchCategoryByRules(title, categories)?.id).toBe(expectedId);
    expect(rankCategoryCandidates(title, categories).slice(0, 3).map(({ category }) => category.id))
      .toContain(expectedId);
  });

  it.each(['Gabinete banheiro', 'Gabinete para banheiro', 'Armário banheiro'])(
    'não seleciona balcão de cozinha para "%s" e mantém opções de banheiro como candidatas',
    (title) => {
      expect(matchCategoryByRules(title, categories)).toBeNull();
      expect(rankCategoryCandidates(title, categories).slice(0, 3).map(({ category }) => category.id))
        .toContain('bathroom-sets');
      expect(rankCategoryCandidates(title, categories).map(({ category }) => category.id))
        .not.toContain('kitchen-sink-cabinets');
    }
  );

  it('não seleciona automaticamente "Caixa de pia" sem evidência histórica suficiente', () => {
    expect(matchCategoryByRules('Caixa de pia 120', categories)).toBeNull();
    expect(rankCategoryCandidates('Caixa de pia 120', categories).map(({ category }) => category.id))
      .toContain('kitchen-sink-cabinets');
  });

  it('deixa nomes genéricos e candidatos próximos sem seleção automática', () => {
    expect(matchCategoryByRules('Balcão', categories)).toBeNull();
    expect(matchCategoryByRules('Mesa', categories)).toBeNull();
    expect(matchCategoryByRules('Mesa jantar', categories)?.id).toBe('dining-tables');
    expect(matchCategoryByRules('Mesa Madetal Onix MDF/Vidro 154 X 90', categories)).toBeNull();
    expect(
      rankCategoryCandidates('Mesa Madetal Onix MDF/Vidro 154 X 90', categories)[0]?.category.id
    ).toBe('dining-tables');
  });

  it('não força uma categoria para aparador com rótulos históricos divergentes', () => {
    const withBuffets = [...categories, { id: 'buffets', name: 'Aparadores Buffets' }];
    expect(matchCategoryByRules('Aparador para Café Cairo Pés Palito', withBuffets)).toBeNull();
    expect(rankCategoryCandidates('Aparador para Café Cairo Pés Palito', withBuffets)[0]?.category.id)
      .toBe('buffets');
  });

  it('preserva uma categoria escolhida manualmente', () => {
    expect(keepManualCategorySelection(['bathroom-sets'], 'kitchen-sink-cabinets'))
      .toEqual(['bathroom-sets']);
    expect(keepManualCategorySelection([], 'wardrobes')).toEqual(['wardrobes']);
  });

  it('resolve automaticamente só por aliases locais e não chama IA', async () => {
    await expect(resolveAutoCategory('Roupeiro casal', categories)).resolves.toEqual(categories[0]);
    await expect(resolveAutoCategory('Produto sem categoria conhecida', categories)).resolves.toBeNull();
  });
});
