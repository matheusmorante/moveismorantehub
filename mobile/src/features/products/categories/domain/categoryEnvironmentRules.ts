import { CategoryNode, EnvironmentNode, CategoryFilterType } from '../types/mobileCategory.types';

export interface AttributeRef {
  id: string;
  name: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  formattedName?: string;
}

/**
 * Filtra categorias de acordo com o filtro selecionado (todas, com_ambiente, sem_ambiente)
 * e o termo de busca textual (case-insensitive).
 */
export function filterCategories(
  categories: CategoryNode[],
  filterType: CategoryFilterType,
  searchTerm: string
): CategoryNode[] {
  return categories.filter(c => {
    const hasEnv = Boolean(c.parents && c.parents.length > 0);
    if (filterType === 'com_ambiente' && !hasEnv) return false;
    if (filterType === 'sem_ambiente' && hasEnv) return false;

    if (searchTerm && searchTerm.trim()) {
      const norm = searchTerm.trim().toLowerCase();
      return c.name.toLowerCase().includes(norm);
    }
    return true;
  });
}

/**
 * Filtra ambientes com base em termo de busca textual.
 */
export function filterEnvironments(
  environments: EnvironmentNode[],
  searchTerm: string
): EnvironmentNode[] {
  if (!searchTerm || !searchTerm.trim()) return environments;
  const norm = searchTerm.trim().toLowerCase();
  return environments.filter(e => e.name.toLowerCase().includes(norm));
}

/**
 * Valida o nome de um ambiente ou categoria:
 * - Não pode ser vazio
 * - Formata para maiúsculas (UPPERCASE)
 * - Impede nomes duplicados ignorando o próprio nó que está sendo editado
 */
export function validateNodeName(
  rawName: string,
  existingNodes: Array<{ id: string; name: string }>,
  editingId?: string,
  entityLabel: 'Ambiente' | 'Categoria' = 'Categoria'
): ValidationResult {
  const formatted = rawName.trim().toUpperCase();
  if (!formatted) {
    return {
      valid: false,
      error: `O nome d${entityLabel === 'Ambiente' ? 'o' : 'a'} ${entityLabel.toLowerCase()} não pode estar vazio.`,
    };
  }

  const isDuplicate = existingNodes.some(
    n => n.name.trim().toUpperCase() === formatted && n.id !== editingId
  );

  if (isDuplicate) {
    return {
      valid: false,
      error: `Já existe um${entityLabel === 'Ambiente' ? '' : 'a'} ${entityLabel} com o nome "${formatted}".`,
      formattedName: formatted,
    };
  }

  return { valid: true, formattedName: formatted };
}

/**
 * Regra de Exclusão de Ambiente:
 * Um ambiente só pode ser excluído se não tiver categorias vinculadas a ele.
 */
export function canDeleteEnvironment(
  env: EnvironmentNode,
  categories: CategoryNode[]
): { canDelete: boolean; reason?: string } {
  const linkedCount = categories.filter(c => env.categories?.includes(c.id)).length;
  if (linkedCount > 0) {
    return {
      canDelete: false,
      reason: `Não é possível excluir este ambiente porque ele possui ${linkedCount} categoria(s) vinculada(s).`,
    };
  }
  return { canDelete: true };
}

/**
 * Regra de Exclusão de Categoria:
 * Uma categoria só pode ser excluída se tiver 0 produtos vinculados a ela.
 */
export function canDeleteCategory(
  category: CategoryNode
): { canDelete: boolean; reason?: string } {
  const prodCount = category.productCount || 0;
  if (prodCount > 0) {
    return {
      canDelete: false,
      reason: `Não é possível excluir esta categoria porque ela está sendo utilizada por ${prodCount} produto(s).`,
    };
  }
  return { canDelete: true };
}

/**
 * Alterna a vinculação de um ID (categoria ou ambiente) em uma lista selecionada.
 * Retorna uma nova lista imutável.
 */
export function toggleNodeLink(selectedLinks: string[], targetId: string): string[] {
  if (selectedLinks.includes(targetId)) {
    return selectedLinks.filter(id => id !== targetId);
  }
  return [...selectedLinks, targetId];
}

/**
 * Alterna uma característica/atributo selecionado para a categoria.
 * Garante unicidade pelo ID do atributo.
 */
export function toggleCategoryAttribute(
  currentAttributes: AttributeRef[],
  targetAttribute: AttributeRef
): AttributeRef[] {
  const exists = currentAttributes.some(a => a.id === targetAttribute.id);
  if (exists) {
    return currentAttributes.filter(a => a.id !== targetAttribute.id);
  }
  return [...currentAttributes, targetAttribute];
}

/**
 * Calcula a lista e o total de categorias órfãs (aquelas sem nenhum ambiente associado).
 */
export function getOrphanCategories(categories: CategoryNode[]): CategoryNode[] {
  return categories.filter(c => !c.parents || c.parents.length === 0);
}

/**
 * Simula a desvinculação de uma categoria de um ambiente,
 * retornando a categoria atualizada com a lista de parents sem o parentId desvinculado.
 */
export function unlinkCategoryFromEnvironment(
  category: CategoryNode,
  environmentId: string
): CategoryNode {
  const newParents = (category.parents || []).filter(p => p !== environmentId);
  return {
    ...category,
    parents: newParents,
  };
}

/**
 * Validação de criação e edição de Atributos/Características Globais.
 */
export function validateAttribute(
  name: string,
  existingAttributes: Array<{ id: string; name: string }>,
  editingId?: string,
  dataType = 'text_short'
): ValidationResult {
  const trimmed = name.trim();
  if (!trimmed) {
    return { valid: false, error: 'O nome da característica/atributo não pode estar vazio.' };
  }

  const validTypes = ['text_short', 'integer', 'decimal', 'radio'];
  if (!validTypes.includes(dataType)) {
    return { valid: false, error: `Tipo de dado inválido: ${dataType}. Permitidos: ${validTypes.join(', ')}.` };
  }

  const isDuplicate = existingAttributes.some(
    a => a.name.trim().toLowerCase() === trimmed.toLowerCase() && a.id !== editingId
  );

  if (isDuplicate) {
    return {
      valid: false,
      error: `Já existe uma característica com o nome "${trimmed}".`,
      formattedName: trimmed,
    };
  }

  return { valid: true, formattedName: trimmed };
}

/**
 * Validação de adição de valores de atributo/característica.
 */
export function validateAttributeOption(
  valText: string,
  existingOptions: Array<{ id: string; value: string }>
): ValidationResult {
  const trimmed = valText.trim();
  if (!trimmed) {
    return { valid: false, error: 'O valor da opção não pode estar vazio.' };
  }

  const isDuplicate = existingOptions.some(
    o => o.value.trim().toLowerCase() === trimmed.toLowerCase()
  );

  if (isDuplicate) {
    return {
      valid: false,
      error: `O valor "${trimmed}" já está cadastrado nesta característica.`,
      formattedName: trimmed,
    };
  }

  return { valid: true, formattedName: trimmed };
}
