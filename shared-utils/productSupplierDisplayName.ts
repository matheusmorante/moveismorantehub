export interface ProductSupplierNameSource {
  fullName?: string | null;
  full_name?: string | null;
  socialName?: string | null;
  social_name?: string | null;
  nickname?: string | null;
  tradeName?: string | null;
  trade_name?: string | null;
}

/** Uses the ERP's canonical supplier label order for both display and search. */
export const getProductSupplierDisplayName = (
  supplier: ProductSupplierNameSource | null | undefined
): string =>
  supplier?.fullName ||
  supplier?.full_name ||
  supplier?.socialName ||
  supplier?.social_name ||
  supplier?.nickname ||
  supplier?.tradeName ||
  supplier?.trade_name ||
  '';

export const matchesProductSupplierSearch = (
  supplier: ProductSupplierNameSource | null | undefined,
  query: string
): boolean =>
  getProductSupplierDisplayName(supplier)
    .toLowerCase()
    .includes(query.trim().toLowerCase());
