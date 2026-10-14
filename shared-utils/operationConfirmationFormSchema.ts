import { z } from 'zod';

export const createOperationConfirmationFormSchema = (requiresProductionConfirmation: boolean) => z.object({
  productionConfirmed: z.boolean(), waitingSeconds: z.number().nonnegative(),
}).superRefine((value, ctx) => {
  if (value.waitingSeconds > 0) ctx.addIssue({ code: 'custom', path: ['waitingSeconds'], message: 'Aguarde a liberação da confirmação.' });
  if (requiresProductionConfirmation && !value.productionConfirmed) ctx.addIssue({ code: 'custom', path: ['productionConfirmed'], message: 'Confirme a operação fiscal em Produção.' });
});
