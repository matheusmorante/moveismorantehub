export const NORMAL_SALE_RULESET_VERSION = 'NORMAL_SALE_V1';

export function isNormalSaleRuleSet(version: string): boolean {
  return version === NORMAL_SALE_RULESET_VERSION || version === 'HML_NORMAL_SALE_V2';
}
