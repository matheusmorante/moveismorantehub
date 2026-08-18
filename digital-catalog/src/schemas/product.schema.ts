import { z } from "zod";

export const productSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
  slug: z.string().min(2, "O slug deve ter pelo menos 2 caracteres"),
  description: z.string().nullable().optional(),
  price: z.number().min(0, "O preço deve ser maior ou igual a zero"),
  promo_price: z.number().min(0).nullable().optional(),
  is_salvado: z.boolean().default(false),
  opportunity_id: z.string().uuid().nullable().optional(),
  category_ids: z.array(z.string().uuid()).min(1, "Selecione pelo menos uma categoria"),
  featured: z.boolean().default(false),
  measures: z.string().nullable().optional(),
  material: z.string().nullable().optional(),
  technical_specs: z.record(z.string(), z.string()).nullable().optional(),
  width: z.string().nullable().optional(),
  depth: z.string().nullable().optional(),
  height: z.string().nullable().optional(),
  depth_use_length: z.boolean().default(false).optional(),
  status: z.enum(["draft", "published"]).default("draft"),
  created_at: z.string().optional(),
}).refine(data => {
  if (data.promo_price !== null && data.promo_price !== undefined) {
    return data.promo_price < data.price;
  }
  return true;
}, {
  message: "O preço promocional deve ser menor que o preço original",
  path: ["promo_price"],
});

export type ProductSchema = z.infer<typeof productSchema>;
