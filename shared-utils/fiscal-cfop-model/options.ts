import { CANONICAL_CFOPS } from './catalog';
import type {
  ActiveCfopOption,
  ListActiveCfopOptionsFilter,
} from './types';

/**
 * Lista opções formatadas para dropdowns/selects na interface, filtrando apenas CFOPs ativos.
 */
export function listActiveCfopOptions(
  filter?: ListActiveCfopOptionsFilter
): ActiveCfopOption[] {
  return CANONICAL_CFOPS.filter((item) => {
    if (!item.active) return false;
    if (filter?.direction && item.direction !== filter.direction) return false;
    if (filter?.scope && item.scope !== filter.scope) return false;
    if (filter?.itemType && item.itemType !== filter.itemType) return false;
    if (filter?.model && !item.allowedModels.includes(filter.model)) return false;
    if (filter?.operationType && item.operationType !== filter.operationType) return false;
    if (filter?.merchandiseOrigin && item.merchandiseOrigin !== filter.merchandiseOrigin)
      return false;
    const stApplicability =
      item.stApplicability ||
      (item.isSt ? 'required' : item.itemType === 'product' ? 'not_required' : 'not_applicable');
    if (filter?.isSt === true && stApplicability === 'not_required') return false;
    if (filter?.isSt === false && stApplicability === 'required') return false;
    return true;
  }).map((item) => ({
    value: item.code,
    label: `${item.code} - ${item.description}`,
    operationType: item.operationType,
    merchandiseOrigin: item.merchandiseOrigin,
    isSt: Boolean(item.isSt),
    stApplicability: item.stApplicability || (item.isSt ? 'required' : 'not_required'),
  }));
}
