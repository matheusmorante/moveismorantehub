import { z } from "zod";

export const categorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
  slug: z.string().min(2, "O slug deve ter pelo menos 2 caracteres"),
  image_url: z.string().url("URL da imagem inválida").nullable().optional(),
  created_at: z.string().optional(),
});

export type CategorySchema = z.infer<typeof categorySchema>;
