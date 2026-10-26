import { z } from "zod";
import { bulkAttributeFormSchema } from "./catalogFormSchemas";
import { productVariationDraftSchema } from "./productVariationValidation";

export const productConversionFormSchema = bulkAttributeFormSchema.extend({
	product: z
		.object({
			code: z.string().optional(),
			...productVariationDraftSchema
				.pick({ stock: true, unitPrice: true, costPrice: true })
				.partial().shape,
		})
		.passthrough(),
});

export const variationToSimpleConfirmationSchema = z.object({
	variationId: z.string().min(1, "ID da variação é obrigatório"),
	acknowledged: z.boolean().default(true),
});

export const productRestoreFromTrashFormSchema = z.object({
	productId: z
		.string()
		.min(1, "ID do produto é obrigatório")
		.transform((productId) => productId.split("_")[0])
		.pipe(z.uuid("ID do produto inválido.")),
	action: z.literal("restore"),
});

export const productDraftDiscardFormSchema = z.object({
	productId: z
		.string()
		.min(1, "ID do produto é obrigatório")
		.transform((productId) => productId.split("_")[0])
		.pipe(z.uuid("ID do produto inválido.")),
	confirmed: z.boolean().refine((confirmed) => confirmed, {
		message: "Confirme o descarte do rascunho.",
	}),
});

export const productMoveToTrashFormSchema = z.object({
	productId: z
		.string()
		.min(1, "ID do produto é obrigatório")
		.transform((productId) => productId.split("_")[0])
		.pipe(z.uuid("ID do produto inválido.")),
	confirmed: z.boolean().refine((confirmed) => confirmed, {
		message: "Confirme a movimentação para a lixeira.",
	}),
});

export type VariationToSimpleConfirmationData = z.infer<
	typeof variationToSimpleConfirmationSchema
>;
