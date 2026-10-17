import { z } from 'zod';
import { ELEMENT_TYPES } from '../erp/src/pages/App/Marketing/Posts/types/postCreator';
import { marketingCampaignFormSchema } from './campaignFormSchemas';
import { postElementModelEditorFormSchema } from './marketingFormSchemas';

export const postCampaignCommandFormSchema = marketingCampaignFormSchema.extend({ id: z.string().trim().min(1, 'Campanha não identificada.') });
export const postCampaignLookupFormSchema = z.object({ id: z.string().trim() });
export const postCampaignDeleteFormSchema = z.object({ id: z.string().trim().min(1, 'Campanha não identificada.') });
export const postElementCommandFormSchema = z.object({
  id: z.string().trim().min(1, 'Modelo não identificado.'), name: z.string().trim().min(1, 'Informe o nome do modelo.'),
  elementType: z.enum(ELEMENT_TYPES), contentKind: z.enum(['STATIC_VISUAL', 'DYNAMIC_CONTENT', 'HYBRID']),
  opportunityId: z.string().nullable().optional(), prompt: z.string(), referenceFiles: postElementModelEditorFormSchema.shape.referenceFiles,
  generatedAssetUrl: z.string().nullable().optional(), generationInputHash: z.string().nullable().optional(), generationVersion: z.number().int().positive(),
  status: z.enum(['NO_PREVIEW', 'UPDATED', 'STALE', 'GENERATING', 'ERROR']), createdAt: z.string().min(1), updatedAt: z.string().min(1),
}).refine((value) => value.elementType !== 'BADGE' || Boolean(value.opportunityId?.trim()), { path: ['opportunityId'], message: 'Selecione a oportunidade.' });
