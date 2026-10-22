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

export type VariationToSimpleConfirmationData = z.infer<
	typeof variationToSimpleConfirmationSchema
>;
