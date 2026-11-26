import { parseLocalizedNumber as parseLocalizedPrice } from '../../../domain/productNumbers';
import { generateVariationSku } from '../../../domain/productSku';
import { getMobileProductReadiness } from '../../../domain/productRegistrationRules';
import { getEffectiveProductForVariationReadiness } from '../../../../../../../shared-utils/productErpLegibility';
import {
  createMobileProductVariationId,
  getInitialMobileVariationName,
  getInitialMobileVariationStatus,
} from '../../../domain/mobileProductVariationGeneration';
import type { VariationReadinessMode } from './ProductVariationEditorHeader';

/** Constrói uma nova variação herdando os dados operacionais do produto pai no app. */
export const buildNewMobileProductVariation = (formData: any, variations: any[]) => {
  const parentCode = (formData.code || '000000').trim();
  const resolvedSku = generateVariationSku(parentCode, variations);
  const name = getInitialMobileVariationName(formData);

  return {
    id: createMobileProductVariationId(),
    name,
    title: name,
    marketplaceTitle: name,
    differentiateTitle: false,
    sku: resolvedSku,
    price: parseLocalizedPrice(formData.unitPrice),
    promoPrice: parseLocalizedPrice(formData.promoPrice) || undefined,
    costPrice: parseLocalizedPrice(formData.costPrice),
    stock: 0,
    description: formData.description || '',
    width: formData.width || '',
    height: formData.height || '',
    depth: formData.depth || '',
    weight: formData.weight || '',
    status: getInitialMobileVariationStatus(formData),
    active: false,
    syncUnitPrice: true,
    syncPromoPrice: true,
    syncCostPrice: true,
    syncFiscal: true,
    syncCondition: true,
    syncDescription: true,
    syncWidth: true,
    syncHeight: true,
    syncDepth: true,
    syncWeight: true,
    syncIpi: true,
    syncFreight: true,
    attributes: [],
    technicalValues: {},
    images: [],
    comboItems: [],
  };
};

/** Calcula prontidão ERP/Catálogo e itens de checklist para uma variação no editor mobile. */
export const buildMobileVariationReadinessSummary = ({
  formData,
  variation,
  openReadiness,
}: {
  formData: any;
  variation: any;
  openReadiness: VariationReadinessMode | null;
}) => {
  const effectiveVariationProduct = getEffectiveProductForVariationReadiness(formData, {
    ...variation,
    unitPrice: variation.unitPrice ?? variation.price ?? variation.unit_price,
  });
  const readiness = getMobileProductReadiness(effectiveVariationProduct);
  const erpReady = readiness.erp.isLegible;
  const readinessItems =
    openReadiness === 'erp'
      ? [
          { label: 'Nome / Identificação Válida', complete: readiness.erp.checks.description },
          { label: 'Preço de Venda > R$ 0', complete: readiness.erp.checks.unitPrice },
          { label: 'Categoria (Herdada do Pai)', complete: readiness.erp.checks.categories },
          { label: 'Fornecedor (Herdado do Pai)', complete: readiness.erp.checks.supplier },
        ]
      : [
          { label: 'Preço de Venda > R$ 0', complete: readiness.catalog.checks.unitPrice },
          {
            label: 'Fotos vinculadas (Pai ou Variação)',
            complete: readiness.catalog.checks.images,
          },
        ];

  return { erpReady, readinessItems };
};
