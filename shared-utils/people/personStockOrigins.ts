export const PERSON_STOCK_ORIGIN_VALUES = ['normal', 'salvados', 'usados'] as const;

export type PersonStockOrigin = (typeof PERSON_STOCK_ORIGIN_VALUES)[number];

export const PERSON_STOCK_ORIGIN_OPTIONS: ReadonlyArray<{
  id: PersonStockOrigin;
  label: string;
}> = [
  { id: 'normal', label: 'Convencional' },
  { id: 'salvados', label: 'Salvados' },
  { id: 'usados', label: 'Usados' },
];

export const togglePersonStockOrigin = (
  currentOrigins: readonly PersonStockOrigin[] | null | undefined,
  origin: PersonStockOrigin,
  selected: boolean
): PersonStockOrigin[] => {
  const origins = currentOrigins ?? [];
  if (selected) return Array.from(new Set([...origins, origin]));
  return origins.filter((currentOrigin) => currentOrigin !== origin);
};

export const toPersonStockOriginsRow = (person: {
  stockOrigins?: readonly PersonStockOrigin[] | null;
  stock_origins?: readonly PersonStockOrigin[] | null;
}): { stock_origins?: PersonStockOrigin[] | null } => {
  if (person.stockOrigins !== undefined) {
    return {
      stock_origins: person.stockOrigins === null ? null : [...person.stockOrigins],
    };
  }
  if (person.stock_origins !== undefined) {
    return {
      stock_origins: person.stock_origins === null ? null : [...person.stock_origins],
    };
  }
  return {};
};
