export const PRODUCT_ENVIRONMENT_OPTIONS = [
    'SALA DE JANTAR', 'SALA DE ESTAR', 'COZINHA', 'QUARTO', 'LAVANDERIA', 'BANHEIRO',
    'LAVANDEIRA', 'ESCRITORIO', 'ESCRITÓRIO', 'VARANDA', 'ÁREA GOURMET', 'GARAGEM',
] as const;

export type ProductEnvironmentOption = typeof PRODUCT_ENVIRONMENT_OPTIONS[number];

/**
 * Valida se um determinado texto é uma opção válida de ambiente de produto.
 */
export function isProductEnvironmentOption(value: string): value is ProductEnvironmentOption {
    return (PRODUCT_ENVIRONMENT_OPTIONS as readonly string[]).includes(value.trim().toUpperCase());
}

