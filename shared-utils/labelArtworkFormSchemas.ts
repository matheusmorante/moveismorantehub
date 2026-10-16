import { z } from 'zod';
import { labelArtConfigSchema, labelArtSnapshotSchema, labelPartialConfigFormSchema } from './labelDesignFormSchemas';

export const labelArtLayoutSelectionSchema = z.object({ layoutId: z.string().trim().min(1, 'Selecione um modelo de etiqueta.') });
const category = z.enum(['identificacao', 'precos', 'logos', 'posts']);
export const labelArtConfigInputSchema = labelArtLayoutSelectionSchema.extend({ category, artConfig: labelArtConfigSchema });
export const labelLayoutArtworkCommandSchema = labelArtLayoutSelectionSchema.extend({ update: z.object({
  de_price_por_group_pos_x: z.number().optional(), de_price_por_group_pos_y: z.number().optional(),
  de_price_por_group_rotation: z.number().optional(), de_price_por_group_gap: z.number().optional(), art_config: labelArtConfigSchema.optional(),
}).refine((value) => Object.values(value).some((entry) => entry !== undefined), 'Informe a alteração da arte.') });
export const labelArtworkSaveFormSchema = labelArtLayoutSelectionSchema.extend({ category, updated: labelPartialConfigFormSchema })
  .refine((value) => value.updated.artConfig !== undefined || value.updated.dePricePorGroupPos !== undefined, 'Informe a arte ou o grupo de preços.');
const optionalText = z.string().nullish().transform((value) => value ?? undefined);
export const labelOpportunitySchema = z.object({ id: z.string().trim().min(1), name: z.string().trim().min(1), slug: optionalText, badge_color: optionalText, border_color: optionalText });
export const labelOpportunitiesSchema = z.array(labelOpportunitySchema);
export const labelArtworkTitleFormSchema = z.object({ title: z.string().trim().min(1, 'Informe o título da arte.').transform((value) => value.toUpperCase()) });
export const labelArtworkExportFormSchema = labelArtLayoutSelectionSchema.extend({ action: z.enum(['copy', 'download']), snapshot: labelArtSnapshotSchema });
export const labelPreviewDigitFormSchema = z.object({ field: z.enum(['testDezenaD1', 'testDezenaD2', 'testCentenaD1', 'testCentenaD2', 'testCentenaD3', 'testMilharD1', 'testMilharD2', 'testMilharD3', 'testMilharD4', 'testNormalD1', 'testNormalD2', 'testNormalD3']), digit: z.number().int().min(0, 'Use um dígito entre 0 e 9.').max(9, 'Use um dígito entre 0 e 9.') });
export { labelArtConfigSchema };
