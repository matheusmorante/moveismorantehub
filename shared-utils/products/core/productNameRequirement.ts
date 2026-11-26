import { z } from 'zod';

export const PRODUCT_NAME_REQUIRED_MESSAGE = 'O nome do produto é obrigatório.';

export const normalizeProductName = (value: unknown): string => String(value ?? '').trim();

export const hasRequiredProductName = (value: unknown): boolean =>
  normalizeProductName(value).length > 0;

export const productNameInputSchema = z
  .string()
  .transform(normalizeProductName)
  .refine(hasRequiredProductName, PRODUCT_NAME_REQUIRED_MESSAGE);
