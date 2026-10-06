import type { FiscalInfo, Product } from '@/pages/types/product.type';

export type FiscalDefaults = Pick<
  FiscalInfo,
  'ncm' | 'cest' | 'cst' | 'cfop' | 'origem' | 'icmsPercent' | 'pisCst' | 'cofinsCst'
>;

export function createInitialProductFiscalInfo(
  itemType: Product['itemType'] | undefined,
  defaults?: FiscalDefaults
): FiscalInfo {
  return {
    ncm: defaults?.ncm || '',
    cest: defaults?.cest || '',
    cst: itemType === 'service' ? defaults?.cst || '103' : '103',
    cfop: itemType === 'service' ? '5933' : defaults?.cfop || '5102',
    origem: defaults?.origem || '0',
    icmsPercent: defaults?.icmsPercent || 0,
    pisCst: defaults?.pisCst || '99',
    cofinsCst: defaults?.cofinsCst || '99',
    codigoServico: '',
  };
}
