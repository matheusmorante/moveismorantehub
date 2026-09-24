import { describe, expect, it } from 'vitest';
import { CategoryNode, EnvironmentNode, CategoryFilterType } from '../types/mobileCategory.types';

export function filterCategories(
  categories: CategoryNode[],
  filterType: CategoryFilterType,
  searchTerm: string
): CategoryNode[] {
  return categories.filter(c => {
    const hasEnv = c.parents && c.parents.length > 0;
    if (filterType === 'com_ambiente' && !hasEnv) return false;
    if (filterType === 'sem_ambiente' && hasEnv) return false;

    if (searchTerm.trim()) {
      const norm = searchTerm.toLowerCase();
      return c.name.toLowerCase().includes(norm);
    }
    return true;
  });
}

export function canDeleteEnvironment(env: EnvironmentNode, categories: CategoryNode[]): { canDelete: boolean; reason?: string } {
  const linkedCount = categories.filter(c => env.categories?.includes(c.id)).length;
  if (linkedCount > 0) {
    return {
      canDelete: false,
      reason: `Não é possível excluir este ambiente porque ele possui ${linkedCount} categoria(s) vinculada(s).`,
    };
  }
  return { canDelete: true };
}

export function canDeleteCategory(category: CategoryNode): { canDelete: boolean; reason?: string } {
  const prodCount = category.productCount || 0;
  if (prodCount > 0) {
    return {
      canDelete: false,
      reason: `Não é possível excluir esta categoria porque ela está sendo utilizada por ${prodCount} produto(s).`,
    };
  }
  return { canDelete: true };
}

describe('Regras de Negócio: Categorias e Ambientes (Mobile)', () => {
  const mockCategories: CategoryNode[] = [
    { id: '1', name: 'SOFÁ', parents: ['env-1'], productCount: 5 },
    { id: '2', name: 'MESA DE JANTAR', parents: ['env-1', 'env-2'], productCount: 0 },
    { id: '3', name: 'POLTRONA ÓRFÃ', parents: [], productCount: 2 },
  ];

  const mockEnvironments: EnvironmentNode[] = [
    { id: 'env-1', name: 'SALA', categories: ['1', '2'] },
    { id: 'env-2', name: 'COZINHA', categories: ['2'] },
    { id: 'env-3', name: 'VARANDA VAZIA', categories: [] },
  ];

  it('filtra corretamente categorias com ambiente, sem ambiente (órfãs) e todas', () => {
    const todas = filterCategories(mockCategories, 'todas', '');
    expect(todas).toHaveLength(3);

    const comAmbiente = filterCategories(mockCategories, 'com_ambiente', '');
    expect(comAmbiente).toHaveLength(2);
    expect(comAmbiente.map(c => c.name)).toEqual(['SOFÁ', 'MESA DE JANTAR']);

    const semAmbiente = filterCategories(mockCategories, 'sem_ambiente', '');
    expect(semAmbiente).toHaveLength(1);
    expect(semAmbiente[0].name).toBe('POLTRONA ÓRFÃ');
  });

  it('aplica busca textual por nome de categoria', () => {
    const busca = filterCategories(mockCategories, 'todas', 'mesa');
    expect(busca).toHaveLength(1);
    expect(busca[0].name).toBe('MESA DE JANTAR');
  });

  it('bloqueia exclusão de ambiente com categorias vinculadas e permite se estiver vazio', () => {
    const envComCategorias = canDeleteEnvironment(mockEnvironments[0], mockCategories);
    expect(envComCategorias.canDelete).toBe(false);
    expect(envComCategorias.reason).toContain('possui 2 categoria(s) vinculada(s)');

    const envVazio = canDeleteEnvironment(mockEnvironments[2], mockCategories);
    expect(envVazio.canDelete).toBe(true);
  });

  it('bloqueia exclusão de categoria com produtos vinculados e permite se tiver 0 produtos', () => {
    const catComProdutos = canDeleteCategory(mockCategories[0]);
    expect(catComProdutos.canDelete).toBe(false);
    expect(catComProdutos.reason).toContain('utilizada por 5 produto(s)');

    const catSemProdutos = canDeleteCategory(mockCategories[1]);
    expect(catSemProdutos.canDelete).toBe(true);
  });
});
