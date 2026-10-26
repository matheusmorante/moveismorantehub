export interface ProductCategoryOptionCandidate {
  readonly type?: unknown;
}

/** Ambientes são nós de agrupamento e não opções de categoria de produtos. */
export const isProductCategoryOption = <T extends ProductCategoryOptionCandidate>(
  candidate: T
): boolean => candidate.type !== 'environment';
