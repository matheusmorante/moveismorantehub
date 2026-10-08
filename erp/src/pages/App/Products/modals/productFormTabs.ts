import Product from '../../../types/product.type';

export type ProductFormTab =
  | 'geral'
  | 'ambientes'
  | 'estoque'
  | 'variacoes'
  | 'ecommerce'
  | 'technical'
  | 'fiscal';

export const getProductFormTabs = (
  isService: boolean,
  isComposition?: boolean,
  isStockistOnly = false
): Array<{ id: ProductFormTab; label: string }> => {
  const tabs: Array<{ id: ProductFormTab; label: string }> = [
    { id: 'geral', label: 'Informações Básicas' },
    ...(!isService
      ? [
          ...(!isStockistOnly ? [{ id: 'ecommerce' as const, label: 'Galeria' }] : []),
          { id: 'technical' as const, label: 'Características' },
          { id: 'estoque' as const, label: 'Estoque e Precificação' },
          { id: 'variacoes' as const, label: 'Variações' },
        ]
      : []),
    ...(!isComposition ? [{ id: 'fiscal' as const, label: 'Tributário / NF' }] : []),
  ];

  return tabs;
};

export const isExistingRegisteredProduct = (product?: Product | null) => {
  if (!product?.id) return false;
  const isDraft =
    Boolean(product.isDraft) || Boolean((product as any).is_draft) || product.status === 'draft';
  return !isDraft;
};
