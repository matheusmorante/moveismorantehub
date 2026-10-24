import { z } from 'zod';
import { productVariationDraftSchema } from './productVariationValidation';
import {
  getCompleteVariationName,
  normalizeCompleteVariationName,
} from './productVariationNameValidation';
import {
  hasRequiredProductSupplier,
  PRODUCT_SUPPLIER_REQUIRED_MESSAGE,
} from './productSupplierRequirement';
import {
  hasRequiredProductName,
  PRODUCT_NAME_REQUIRED_MESSAGE,
} from './productNameRequirement';

const productNumericFields = productVariationDraftSchema.pick({
  unitPrice: true, promoPrice: true, costPrice: true, freightCost: true, ipiPercent: true,
  finalPurchasePrice: true, stock: true, minStock: true, leadTime: true, avgMonthlySales: true,
  width: true, height: true, depth: true, weight: true, pkgWidth: true, pkgHeight: true, pkgDepth: true,
}).partial().shape;

export interface ProductFormValidationOptions {
  isStockistOnly: boolean;
  saveAsDraft: boolean;
}

/**
 * Schema Zod usado pelo formulário real de produto.
 * Garante que produtos de teste e submissões reais obedeçam ao mesmo contrato estrito.
 */
export const createProductFormSchema = (options: ProductFormValidationOptions) => {
  return z
    .object({
      ...productNumericFields,
      initialStock: productVariationDraftSchema.shape.stock.optional(),
      name: z.string().optional().nullable(),
      title: z.string().optional().nullable(),
      marketplaceTitle: z.string().optional().nullable(),
      itemType: z.string().optional().nullable(),
      productKind: z.string().optional().nullable(),
      opportunityId: z.string().optional().nullable(),
      hasVariations: z.boolean().optional(),
      categoryIds: z.array(z.string()).optional().nullable(),
      fiscal: z
        .object({
          ncm: z.string().optional().nullable(),
          merchandiseOrigin: z.string().optional().nullable(),
        })
        .passthrough()
        .optional()
        .nullable(),
      merchandiseOrigin: z.string().optional().nullable(),
      isOwnProduction: z.boolean().optional().nullable(),
      mainSupplierId: z.string().optional().nullable(),
      supplierId: z.string().optional().nullable(),
      variations: z.array(productVariationDraftSchema.partial()).optional().nullable(),
    })
    .passthrough()
    .superRefine((data, ctx) => {
      const enteredName = data.name || data.title || data.marketplaceTitle || '';
      if (!hasRequiredProductName(enteredName)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: PRODUCT_NAME_REQUIRED_MESSAGE,
          path: ['name'],
        });
      }

      if (options.saveAsDraft) {
        return;
      }

      const validProductKinds = ['normal', 'salvado', 'usado'];
      if (data.itemType !== 'service' && !validProductKinds.includes(data.productKind || '')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'A origem do estoque (tipo de produto) é inválida.',
          path: ['productKind'],
        });
      }

      const isOpportunityRequired =
        !options.isStockistOnly && data.itemType !== 'service' && data.productKind === 'salvado';
      if (isOpportunityRequired && !data.opportunityId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'A oportunidade é obrigatória para produtos salvados.',
          path: ['opportunityId'],
        });
      }

      const variations = Array.isArray(data.variations) ? data.variations : [];
      const isMultiVariationMode = Boolean(data.hasVariations) || variations.length > 1;
      if (variations.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Adicione pelo menos uma variação ao produto.',
          path: ['variations'],
        });
      }

      if (isMultiVariationMode && variations.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Produto com variações precisa ter pelo menos 2 variações para concluir o cadastro.',
          path: ['variations'],
        });
      }

      const parentImages = Array.isArray((data as any).images)
        ? (data as any).images.filter(Boolean)
        : [];
      variations.forEach((variation, index) => {
        const varImages = Array.isArray(variation.images)
          ? variation.images.filter(Boolean)
          : typeof (variation as any).image_url === 'string' && (variation as any).image_url.trim()
            ? (variation as any).image_url.split(',').filter(Boolean)
            : [];
        if (varImages.length === 0 && (isMultiVariationMode || parentImages.length === 0)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `A variação "${variation.name || `Variação ${index + 1}`}" deve ter pelo menos 1 foto vinculada para concluir o cadastro.`,
            path: ['variations', index, 'images'],
          });
        }
      });

      if (isMultiVariationMode && variations.length > 1) {
        const parentName = enteredName;
        const completeNames = variations.map((variation) =>
          normalizeCompleteVariationName(getCompleteVariationName(variation, parentName))
        );
        const firstIndexByName = new Map<string, number>();
        completeNames.forEach((normalizedName, index) => {
          if (!normalizedName) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Informe o nome completo da variação ${index + 1}.`,
              path: ['variations', index, 'name'],
            });
            return;
          }
          const duplicateIndex = firstIndexByName.get(normalizedName);
          if (duplicateIndex !== undefined) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Os nomes completos das variações devem ser diferentes entre si.',
              path: ['variations', index, 'name'],
            });
          } else {
            firstIndexByName.set(normalizedName, index);
          }
        });
      }

      if (!data.categoryIds || data.categoryIds.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Selecione pelo menos uma categoria.',
          path: ['categoryIds'],
        });
      }

      const ncmDigits = String(data.fiscal?.ncm || '').replace(/\D/g, '');
      if (options.isStockistOnly && data.itemType !== 'service' && ncmDigits.length !== 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Informe um NCM válido com 8 dígitos.',
          path: ['ncm'],
        });
      }

      if (!hasRequiredProductSupplier(data)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: PRODUCT_SUPPLIER_REQUIRED_MESSAGE,
          path: ['mainSupplierId'],
        });
      }
    });
};

/** Acknowledgement/channel actions operate on an already saved product, not a new finalization. */
export const savedProductFormSchema = createProductFormSchema({ isStockistOnly: false, saveAsDraft: true }).safeExtend({
  id: z.string().trim().min(1, 'O produto salvo não foi identificado.'),
  active: z.boolean().optional(), isDraft: z.boolean().optional(),
  status: z.enum(['draft', 'published', 'hidden']).optional(),
});
