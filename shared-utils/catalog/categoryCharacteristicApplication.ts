import { z } from 'zod';

export const characteristicCategoryApplicationSchema = z.object({
  attributeId: z.string().min(1, 'Selecione uma característica válida.'),
  name: z.string().trim().min(1, 'A característica precisa ter nome.'),
  application: z.enum(['unavailable', 'optional', 'required']),
});

export const characteristicCategoryApplicationsSchema = z
  .array(characteristicCategoryApplicationSchema)
  .superRefine((applications, context) => {
    const attributeIds = applications.map((application) => application.attributeId);
    if (new Set(attributeIds).size !== attributeIds.length) {
      context.addIssue({
        code: 'custom',
        message: 'Cada característica deve aparecer uma única vez.',
      });
    }
  });

export type CharacteristicCategoryApplication = z.infer<typeof characteristicCategoryApplicationSchema>;
