type ProductFiscalCstFields = {
  cst?: string;
  cest?: string;
};

const CEST_REQUIRED_CST_CODES = new Set(['201', '202', '500']);

/** Keeps the product fiscal draft consistent with the ERP CST/CSOSN field. */
export function updateProductFiscalCst<T extends ProductFiscalCstFields>(
  fiscal: T | null | undefined,
  cst: string
): T & { cst: string; cest: string } {
  const current = { ...(fiscal || {}) } as T & ProductFiscalCstFields;

  return {
    ...current,
    cst,
    cest: CEST_REQUIRED_CST_CODES.has(cst) ? current.cest || '' : '',
  };
}
