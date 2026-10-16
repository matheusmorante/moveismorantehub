import { z } from 'zod';

export const productAutocompleteFormSchema = z.object({
  query: z.string().trim().min(3, 'Digite pelo menos três caracteres para buscar.'),
  supplierId: z.string().trim().min(1, 'Informe um fornecedor válido.').optional(),
  parentsOnly: z.boolean(), variationsOnly: z.boolean(), includeDeactivated: z.boolean(), excludeCombos: z.boolean(),
  allowedProductKinds: z.array(z.enum(['normal', 'salvado', 'usado'])).optional(),
});
