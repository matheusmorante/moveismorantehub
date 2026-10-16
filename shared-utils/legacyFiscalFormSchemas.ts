import { z } from 'zod';
import { ORDER_EDIT_CCE_DISABLED_REASON } from './fiscalCorrectionPolicy';

/** Defensive rejection for legacy callers only. CC-e has no product UI or workflow. */
export const legacyCceFormSchema = z.object({ correction: z.string() }).superRefine((_value, ctx) => {
  ctx.addIssue({ code: 'custom', path: ['correction'], message: ORDER_EDIT_CCE_DISABLED_REASON });
});
