import { z } from 'zod';
import { variationFamilyFormSchema } from './catalogFormSchemas';

export const variationFamilyUuidSchema = z.string().trim().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'Atualize o cadastro para usar um UUID válido.').transform((value) => value.toLowerCase());
export const variationFamilyQuerySchema = z.object({ sourceId: variationFamilyUuidSchema });
export const variationFamilyConflictSchema = variationFamilyFormSchema.safeExtend({ sourceId: variationFamilyUuidSchema, familyId: variationFamilyUuidSchema });
export const variationFamilyCommandSchema = variationFamilyConflictSchema.safeExtend({ sourceParentId: variationFamilyUuidSchema,
  name: z.string().trim().min(1, 'Informe o nome da variação.'), images: z.array(z.string().trim().min(1, 'Informe uma imagem válida.')),
}).refine((values) => values.familyId !== values.sourceParentId, { path: ['familyId'], message: 'Selecione um produto pai diferente da origem.' });
export const variationFamilyAckSchema = z.object({ newSku: z.string().trim().min(1), sourceParentRemoved: z.boolean() });
export const variationFamilyAttributeSchema = z.object({ name: z.string().trim().min(1), value: z.string().trim().min(1) });
export interface FamilyAttribute { name: string; value: string; showName?: boolean; [key: string]: unknown }
export const canAddVariationFamilyAttribute = (attributes: readonly FamilyAttribute[]): boolean =>
  attributes.length === 0;
export const normalizeFamilyValue = (value: unknown): string => String(value ?? '').trim().toLocaleLowerCase('pt-BR');
export const toFamilyAttributes = (value: unknown): FamilyAttribute[] => {
  if (Array.isArray(value)) return value.filter((entry) => entry && typeof entry === 'object').map((entry) => ({
    name: String(entry.name ?? ''), value: String(entry.value ?? ''), ...(typeof entry.showName === 'boolean' ? { showName: entry.showName } : {}),
  }));
  if (value && typeof value === 'object') return Object.entries(value).map(([name, entry]) => ({ name, value: String(entry ?? '') }));
  return [];
};
export const sameFamilyAttributes = (first: readonly FamilyAttribute[], second: readonly FamilyAttribute[]): boolean => {
  if (first.length !== second.length) return false;
  const entries = new Map(second.map((attribute) => [normalizeFamilyValue(attribute.name), normalizeFamilyValue(attribute.value)]));
  return first.every((attribute) => entries.get(normalizeFamilyValue(attribute.name)) === normalizeFamilyValue(attribute.value));
};
export class VariationFamilyUnconfirmedError extends Error {
  readonly uncertain = true;
  constructor(message = 'A mudança pode ter sido gravada, mas não foi confirmada. Consulte a variação e recarregue antes de repetir.') { super(message); }
}
export interface VariationFamilyOperationGuard { active: symbol | null; error: string }
