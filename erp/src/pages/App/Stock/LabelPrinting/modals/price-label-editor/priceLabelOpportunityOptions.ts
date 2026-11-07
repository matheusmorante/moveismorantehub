import type { Opportunity } from '../../types/PriceLabelArtEditorTypes';

export function buildPriceLabelOpportunityOptions(
  opportunities: readonly Opportunity[] | null | undefined
): Opportunity[] {
  const baseOptions: Opportunity[] = [{ id: 'none', name: 'SEM OPORTUNIDADE' }];
  if (opportunities && opportunities.length > 0) {
    const oppsMapped = opportunities.map((opp) => ({
      id: opp.id || opp.slug || opp.name,
      name: opp.name.toUpperCase(),
    }));
    return [...baseOptions, ...oppsMapped];
  }
  return [...baseOptions, { id: 'salvado', name: 'QUEIMA DOS SALVADOS' }];
}
