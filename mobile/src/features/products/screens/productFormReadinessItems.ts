import type { MobileProductReadiness } from '../domain/productRegistrationRules';
import type { ProductFormReadinessItem } from './ProductFormReadinessChecklist';
import type { TabId } from './productFormTabs';

interface BuildMobileProductFormReadinessItemsArgs {
  readiness: MobileProductReadiness;
  isOwnProduction: boolean;
  isService: boolean;
}

export const buildMobileProductFormReadinessItems = ({
  readiness,
  isOwnProduction,
  isService,
}: BuildMobileProductFormReadinessItemsArgs) => {
  const erpReadinessItems: ProductFormReadinessItem[] = [
    {
      id: 'name',
      label: 'Nome do Produto (Mínimo 2 letras)',
      ready: readiness.erp.checks.description,
      tab: 'geral' as TabId,
    },
    {
      id: 'unitPrice',
      label: 'Preço de Venda > R$ 0 (ou Variações)',
      ready: readiness.erp.checks.unitPrice,
      tab: 'estoque' as TabId,
    },
    {
      id: 'categories',
      label: 'Pelo menos 1 Categoria',
      ready: readiness.erp.checks.categories,
      tab: 'geral' as TabId,
    },
    {
      id: 'supplier',
      label: isOwnProduction ? 'Fabricação Própria (Dispensado)' : 'Pelo menos 1 Fornecedor',
      ready: readiness.erp.checks.supplier,
      tab: 'estoque' as TabId,
    },
    {
      id: 'origin',
      label: 'Origem do Estoque Convencional',
      ready: readiness.erp.checks.origin,
      tab: 'geral' as TabId,
    },
    {
      id: 'variationPhotos',
      label: 'Fotos das Variações (mín. 1 vinculada por variação)',
      ready: readiness.variationPhotos,
      tab: 'variacoes' as TabId,
    },
  ];
  const catalogReadinessItems: ProductFormReadinessItem[] = [
    {
      id: 'marketplaceTitle',
      label: 'Nome do Produto',
      ready: readiness.catalog.checks.marketplaceTitle,
      tab: 'geral' as TabId,
    },
    {
      id: 'unitPrice',
      label: 'Preço de Venda > R$ 0',
      ready: readiness.catalog.checks.unitPrice,
      tab: 'estoque' as TabId,
    },
    {
      id: 'images',
      label: 'Pelo menos 1 Foto principal',
      ready: readiness.catalog.checks.images,
      tab: 'fotos' as TabId,
    },
    {
      id: 'categories',
      label: 'Pelo menos 1 Categoria',
      ready: readiness.catalog.checks.categories,
      tab: 'geral' as TabId,
    },
    ...(!isService
      ? [
          {
            id: 'dimensions',
            label: 'Ao menos uma dimensão ativa; todas as ativas > 0',
            ready: readiness.catalog.checks.dimensions,
          },
        ]
      : []),
  ];

  return { erpReadinessItems, catalogReadinessItems };
};
