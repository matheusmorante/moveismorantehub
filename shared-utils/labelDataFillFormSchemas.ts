import { z } from 'zod';
import { labelDataFillFormSchema } from './labelDesignFormSchemas';

// These are editable label text, not commercial amounts: blank values can clear
// a field and formatted text must survive unchanged.
export const labelManualDataFormSchema = labelDataFillFormSchema.extend({ title: z.string().transform((value) => value.toUpperCase()) });
export const labelDataFillProductFormSchema = z.object({ id: z.string().trim().min(1, 'Selecione um produto válido.'), title: z.string().trim().min(1, 'O produto não tem um nome válido.').transform((value) => value.toUpperCase()) });
// Empty search loads the existing recent-products view.
export const labelCatalogSearchFormSchema = z.object({ searchTerm: z.string().trim() });
export const labelCatalogProductSchema = z.object({
  id: z.string().trim().min(1), name: z.string().trim().min(1), description: z.string(), code: z.string(),
  unit_price: z.number().nonnegative(), promo_price: z.number().nonnegative(), images: z.array(z.string().min(1)),
});
export const labelCatalogProductsSchema = z.array(labelCatalogProductSchema);
export type LabelManualData = z.output<typeof labelManualDataFormSchema>;
