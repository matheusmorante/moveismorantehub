import { determineSaleCfop, getCfopDefinition } from '../../../shared-utils/fiscalCfopModel';
import { type HmlCsosnConfiguration, resolveItemCsosn } from '../csosnPolicy';

type FiscalProduct = {
  id: string;
  fiscal: Record<string, unknown> | null;
  unit?: string | null;
};

type OrderItem = Record<string, unknown>;

export function resolvePreparedItems(params: {
  items: readonly OrderItem[];
  products: readonly FiscalProduct[];
  configuration: HmlCsosnConfiguration;
  issuerCrt: string;
  destination: '1' | '2' | '3';
  isInterstate: boolean;
  recipientIeIndicator: string;
  finalConsumer?: boolean;
}) {
  const {
    items,
    products,
    configuration,
    issuerCrt,
    destination,
    isInterstate,
    recipientIeIndicator,
    finalConsumer,
  } = params;
  const productsById = new Map(products.map((product) => [product.id, product]));

  return items.map((item, index) => {
    const itemId = typeof item.productId === 'string' ? item.productId : '';
    const product = productsById.get(itemId);
    const itemFiscal =
      item.fiscal && typeof item.fiscal === 'object' && !Array.isArray(item.fiscal)
        ? (item.fiscal as Record<string, unknown>)
        : {};
    const catalogCst = product?.fiscal?.cst;
    const catalogCfop = product?.fiscal?.cfop;
    const savedCfop = typeof itemFiscal.cfop === 'string' ? itemFiscal.cfop : undefined;
    const sourceCfop = savedCfop || (typeof catalogCfop === 'string' ? catalogCfop : undefined);
    const sourceDefinition = getCfopDefinition(sourceCfop || '');
    if (sourceCfop && !sourceDefinition)
      throw new Error(
        `CFOP ${sourceCfop} não classificado; revise a origem fiscal antes de preparar os itens.`
      );
    if (sourceDefinition && sourceDefinition.operationType !== 'sale')
      throw new Error(
        `CFOP ${sourceCfop} exige tratamento fiscal específico e não pode ser convertido em venda padrão.`
      );

    let cfop: string | undefined;
    let cfopSource: string | undefined;
    try {
      cfop = determineSaleCfop({
        destination,
        itemType: 'product',
        isSt:
          catalogCst === '500' ||
          itemFiscal.cst === '500' ||
          itemFiscal.hasSt === true ||
          itemFiscal.isSt === true ||
          sourceDefinition?.stApplicability === 'required',
        isOwnProduction:
          itemFiscal.isOwnProduction === true ||
          itemFiscal.merchandiseOrigin === 'own_production' ||
          sourceDefinition?.merchandiseOrigin === 'own_production',
        recipientIeIndicator,
        finalConsumer,
      });
      cfopSource = isInterstate ? 'INTERSTATE_RULE' : 'INTERNAL_RULE';
    } catch {
      cfop = undefined;
      cfopSource = undefined;
    }

    return {
      itemNumber: index + 1,
      ...resolveItemCsosn({
        configuration,
        environment: 2,
        issuerCrt,
        catalog:
          typeof itemFiscal.cst === 'string'
            ? itemFiscal.cst
            : typeof catalogCst === 'string'
              ? catalogCst
              : undefined,
      }),
      ...(cfop ? { cfop, cfopSource } : {}),
      ...(typeof itemFiscal.commercialUnit === 'string' || typeof product?.unit === 'string'
        ? { commercialUnit: String(itemFiscal.commercialUnit || product?.unit) }
        : {}),
      ...(typeof itemFiscal.taxableUnit === 'string' ||
      typeof itemFiscal.commercialUnit === 'string' ||
      typeof product?.unit === 'string'
        ? { taxableUnit: String(itemFiscal.taxableUnit || itemFiscal.commercialUnit || product?.unit) }
        : {}),
    };
  });
}
