import type { NfeItemFiscal, NfeItemWithFiscal } from '../NfeItemsSection';

export interface ResolveFiscalContextParams {
  compatibleCfop: (cfop?: string | null) => string;
  defaultCfop: string;
  defaultCst: string;
}

export function computeSingleItemFiscalUpdate(
  currentItem: NfeItemWithFiscal | undefined,
  updates: Partial<NfeItemFiscal>,
  context: ResolveFiscalContextParams
): {
  resolvedUpdates: Partial<NfeItemFiscal>;
  classificationChanged: boolean;
} {
  const classificationChanged = (['ncm', 'cest', 'origem'] as const).some(
    (field) => updates[field] !== undefined && updates[field] !== currentItem?.fiscal[field]
  );

  const resolvedCfop =
    updates.cfop !== undefined
      ? updates.cfop
      : classificationChanged
        ? context.compatibleCfop(currentItem?.fiscal?.cfop) || context.defaultCfop
        : currentItem?.fiscal?.cfop;

  const resolvedCst =
    updates.cst !== undefined
      ? updates.cst
      : classificationChanged
        ? currentItem?.fiscal?.cst || context.defaultCst
        : currentItem?.fiscal?.cst;

  const resolvedUpdates: Partial<NfeItemFiscal> = {
    ...updates,
    ...(resolvedCfop !== undefined ? { cfop: resolvedCfop } : {}),
    ...(resolvedCst !== undefined ? { cst: resolvedCst } : {}),
    ...(updates.cst !== undefined ? { csosnSource: 'manual' as const } : {}),
  };

  return { resolvedUpdates, classificationChanged };
}

export function computeBatchItemFiscalUpdates(
  currentItems: NfeItemWithFiscal[],
  updated: NfeItemWithFiscal[],
  context: ResolveFiscalContextParams,
  initialChoices: Record<number, Partial<NfeItemFiscal>>
): {
  resolvedItems: NfeItemWithFiscal[];
  updatedChoices: Record<number, Partial<NfeItemFiscal>>;
} {
  const choices = { ...initialChoices };

  const resolvedItems = updated.map((item, index) => {
    const currentItem = currentItems[index];
    const classificationChanged = (['ncm', 'cest', 'origem'] as const).some(
      (field) => item.fiscal[field] !== currentItem?.fiscal[field]
    );

    if (classificationChanged) {
      item = {
        ...item,
        fiscal: {
          ...item.fiscal,
          cfop: context.compatibleCfop(item.fiscal.cfop) || context.defaultCfop,
          cst: item.fiscal.cst || context.defaultCst,
        },
      };
    }

    const changed = item.fiscal.cst !== currentItem?.fiscal.cst;
    const changedFields = Object.fromEntries(
      (['ncm', 'cfop', 'origem', 'cest', 'cst'] as const)
        .filter((field) => item.fiscal[field] !== currentItem?.fiscal[field])
        .map((field) => [field, item.fiscal[field]])
    );

    choices[index] = { ...choices[index], ...changedFields };

    return {
      ...item,
      fiscal: {
        ...item.fiscal,
        ...(!classificationChanged && changed ? { csosnSource: 'manual' as const } : {}),
      },
    };
  });

  return { resolvedItems, updatedChoices: choices };
}
