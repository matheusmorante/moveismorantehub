import { z } from 'zod';
import { ORDER_EDIT_CCE_DISABLED_REASON } from './fiscalCorrectionPolicy';

/** Historical CC-e remains readable/reconcilable; the ERP prohibits new events. */
export const legacyCceFormSchema = z.object({ correction: z.string() }).superRefine((_value, ctx) => {
  ctx.addIssue({ code: 'custom', path: ['correction'], message: ORDER_EDIT_CCE_DISABLED_REASON });
});
