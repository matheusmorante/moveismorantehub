import { z } from 'zod';

const mobileProductSaveAcknowledgementRowSchema = z.object({
  product_id: z.string().uuid(),
  updated_at: z.string().refine((value) => Number.isFinite(Date.parse(value))),
});

export interface MobileProductSaveAcknowledgement {
  productId: string;
  updatedAt: string;
}

/** Missing-function responses are definitive: no versioned RPC ran. */
export const isVersionedProductSaveRpcUnavailable = (value: unknown): boolean => {
  if (!value || typeof value !== 'object') return false;
  const error = value as {
    code?: unknown;
    message?: unknown;
    details?: unknown;
    hint?: unknown;
  };
  if (error.code === 'PGRST202' || error.code === '42883') return true;
  const description = [error.message, error.details, error.hint]
    .filter((part): part is string => typeof part === 'string')
    .join(' ');
  return (
    /save_mobile_product_transaction_with_version/i.test(description) &&
    /(could not find|does not exist|undefined function|schema cache)/i.test(description)
  );
};

/** Parses the version returned by the transactional mobile product save RPC. */
export const parseMobileProductSaveAcknowledgement = (
  value: unknown
): MobileProductSaveAcknowledgement => {
  const rows = z.array(mobileProductSaveAcknowledgementRowSchema).length(1).safeParse(value);
  if (!rows.success) {
    throw new Error('O banco não confirmou a versão do produto salvo.');
  }

  return {
    productId: rows.data[0].product_id,
    updatedAt: rows.data[0].updated_at,
  };
};
