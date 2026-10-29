export const TEST_PRODUCT_CATALOG_PUBLICATION_ERROR =
  'Produtos identificados como teste não podem ser publicados no Catálogo Digital.';

export interface EcomLegibilityResult {
  isLegible: boolean;
  errors: string[];
  missingCategoryCharacteristics: string[];
  checks: {
    marketplaceTitle: boolean;
    description: boolean;
    unitPrice: boolean;
    categories: boolean;
    images: boolean;
    dimensions: boolean;
    categoryCharacteristics: boolean;
  };
}

export interface CatalogCharacteristicRequirement {
  readonly name: string;
  readonly id?: string;
  readonly groupId?: string;
  readonly dataType?: string;
  readonly data_type?: string;
  readonly active?: boolean | null;
  readonly dependency?: {
    readonly referenceAttributeId: string;
    readonly operator: string;
    readonly value: string;
  } | null;
  readonly dependencyLogic?: 'all' | 'any';
  readonly dependencyAlternatives?: readonly {
    readonly referenceAttributeId: string;
    readonly operator: string;
    readonly value: string;
  }[];
  readonly requiredForCategory?: boolean;
  readonly categoryApplications?: readonly {
    readonly categoryId: string | number;
    readonly application: 'unavailable' | 'optional' | 'required';
  }[];
  readonly categoryIds?: readonly (string | number)[];
  readonly unavailableCategoryIds?: readonly (string | number)[];
  readonly requiredCategoryIds?: readonly (string | number)[];
  readonly requiredProductCategoryIds?: readonly (string | number)[];
}

export interface CatalogCharacteristicGroup {
  readonly id: string;
}

export interface CatalogCharacteristicCheckOptions {
  readonly categoryRequirementsVerified?: boolean;
  readonly characteristicGroups?: readonly CatalogCharacteristicGroup[];
}

export interface PublishedCatalogEditIssue {
  readonly field: string;
  readonly missing: string;
}
