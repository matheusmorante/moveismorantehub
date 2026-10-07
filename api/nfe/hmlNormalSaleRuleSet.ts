import { type HmlCsosnConfiguration, parseHmlCsosnConfiguration } from './csosnPolicy';
import type { FiscalSnapshotCandidate } from './fiscalSnapshot';
import { HML_NORMAL_SALE_RULESET_VERSION } from './hml-normal-sale/constants';
import { createNormalSaleRuleSet } from './normalSaleRuleSet';

export { loadNormalSaleInputs as loadHmlNormalSaleInputs } from './normal-sale/inputLoader';
export { HML_NORMAL_SALE_RULESET_VERSION };

/** Compatibility policy for existing HML RPCs; business rules live in the common core. */
export async function createHmlNormalSaleRuleSet(
  facts: FiscalSnapshotCandidate,
  configuration: HmlCsosnConfiguration
) {
  if (facts.emissionRequest.environment !== 2)
    throw new Error('PRODUCTION_FISCAL_RULESET_REQUIRED');
  parseHmlCsosnConfiguration(configuration);
  const rules = await createNormalSaleRuleSet(facts, HML_NORMAL_SALE_RULESET_VERSION);
  return { ...rules, technicalHomologationOnly: true as const };
}
