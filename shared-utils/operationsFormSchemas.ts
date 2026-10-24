import { z } from 'zod';
import { imageFilesFormSchema } from './fileFormSchemas';
import { normalizeCompleteVariationName } from './productVariationNameValidation';

export * from './deliveryRouteFormSchemas';

const requiredText = z.string().refine((value) => Boolean(value.trim()), 'Preencha este campo.');
const date = z.iso.date('Informe uma data válida.');
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Informe um horário válido.');

// ─── Agendamento & Montagem ──────────────────────────────────────────────────
export const assemblyScheduleFormSchema = z.object({
  item: requiredText,
  date,
  time,
});

export const assemblyListFormSchema = assemblyScheduleFormSchema.extend({
  type: z.enum(['delivery', 'showroom']),
  status: z.enum(['pending', 'completed']),
});

export const showcaseAssemblyFormSchema = z
  .object({
    description: requiredText,
    quantity: z.number().positive(),
    date,
    status: z.enum(['pending', 'completed']),
  })
  .passthrough();

export const inventoryReversalFormSchema = z.object({
  reason: requiredText,
});

export const createStockLabelingFormSchema = (itemCount: number) =>
  z.object({
    orderId: z.string().trim().min(1, 'Pedido não identificado.'),
    checkedItems: z
      .array(z.boolean())
      .min(1, 'O pedido não contém itens para etiquetar.')
      .length(itemCount, 'A conferência deve corresponder aos itens do pedido.'),
  });

// ─── Movimentação & Inventário ──────────────────────────────────────────────
export const inventoryMoveFormSchema = z
  .object({
    type: z.enum(['entry', 'withdrawal', 'balance', 'adjustment']),
    quantity: z.number(),
    date: z
      .string()
      .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), 'Informe uma data válida.'),
    observation: z.string().trim().min(1, 'Por favor, informe um motivo ou observação.'),
  })
  .superRefine((value, ctx) => {
    if (
      value.quantity === 0 ||
      (['entry', 'withdrawal'].includes(value.type) && value.quantity < 0)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['quantity'],
        message: ['entry', 'withdrawal'].includes(value.type)
          ? 'Por favor, informe uma quantidade maior que zero.'
          : 'O valor do ajuste não pode ser zero.',
      });
    }
  });

export const purchaseStockEntryFormSchema = z.object({
  date,
  observation: z.string().trim().min(1, 'Informe a observação da movimentação.'),
});

export const inventoryScopeFormSchema = z
  .object({
    type: z.enum(['full', 'supplier', 'custom']),
    name: z.string().trim(),
    supplierId: z.string(),
    responsibleId: z.string().min(1, 'Selecione o responsável pelo inventário.'),
  })
  .superRefine((value, ctx) => {
    if (value.type === 'supplier' && !value.supplierId) {
      ctx.addIssue({
        code: 'custom',
        path: ['supplierId'],
        message: 'Selecione o fornecedor.',
      });
    }
  });

export const quickRegisterSelectionFormSchema = z
  .object({
    mode: z.enum(['EXISTING_PARENT', 'SIMPLE', 'COMPOSITION']),
    parentProductId: z.string().trim().nullable().optional(),
    name: z.string().trim().optional(),
    nameSuffix: z.string().trim().optional(),
    parentName: z.string().trim().optional(),
    variationFullName: z.string().trim().optional(),
    existingVariationNames: z.array(z.string()).optional(),
    ncmMismatch: z.boolean().optional(),
    categoryId: z.string().trim().optional(),
    categoryConfirmed: z.boolean().optional(),
    ncm: z.string().trim().optional(),
    costPrice: z.number().nonnegative('O custo de aquisição deve ser maior ou igual a zero.').optional(),
    ncmResolution: z.enum(['variation', 'update-parent', 'keep-parent']).optional(),
    requiredVariableFields: z.array(z.string()).optional(),
    technicalValues: z.record(z.string(), z.unknown()).optional(),
    components: z.array(z.object({
      productId: z.string().trim().min(1, 'Selecione o produto de cada componente.'),
      variationId: z.string().trim().optional(),
      description: z.string().trim().min(1, 'O componente não possui descrição.'),
      unitPrice: z.number().nonnegative(),
      stock: z.number().nonnegative(),
      quantity: z.number().positive('A quantidade de cada componente deve ser maior que zero.'),
    })).optional(),
    duplicateNameConfirmed: z.boolean().optional(),
    nameMatchCount: z.number().int().nonnegative().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.mode === 'EXISTING_PARENT' && !value.parentProductId?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['parentProductId'],
        message: 'Selecione o produto pai.',
      });
    }
    if (value.mode === 'SIMPLE' || value.mode === 'COMPOSITION') {
      if (!value.name?.trim()) ctx.addIssue({ code: 'custom', path: ['name'], message: 'Informe o nome do produto.' });
      if (!value.categoryId?.trim()) ctx.addIssue({ code: 'custom', path: ['categoryId'], message: 'Selecione uma categoria.' });
      if (!value.categoryConfirmed) ctx.addIssue({ code: 'custom', path: ['categoryConfirmed'], message: 'Confirme a categoria antes de salvar.' });
      if (value.costPrice === undefined || !Number.isFinite(value.costPrice)) ctx.addIssue({ code: 'custom', path: ['costPrice'], message: 'Informe um custo de aquisição válido.' });
    }
    if (value.mode === 'EXISTING_PARENT') {
      if (!value.nameSuffix?.trim()) ctx.addIssue({ code: 'custom', path: ['nameSuffix'], message: 'Informe o complemento do nome da variação.' });
      if (value.ncmMismatch && value.ncmResolution === undefined) {
        ctx.addIssue({ code: 'custom', path: ['ncmResolution'], message: 'Resolva a divergência de NCM antes de salvar.' });
      }
      const normalizedFullName = normalizeCompleteVariationName(value.variationFullName || '');
      if (normalizedFullName && (value.existingVariationNames || []).some((name) =>
        normalizeCompleteVariationName(name) === normalizedFullName
      )) {
        ctx.addIssue({ code: 'custom', path: ['nameSuffix'], message: 'O nome completo da variação já está cadastrado neste produto.' });
      }
      const fields = value.requiredVariableFields || [];
      for (const name of fields) {
        const raw = value.technicalValues?.[name];
        const hasValue = Array.isArray(raw) ? raw.length > 0 : String(raw ?? '').trim().length > 0;
        if (!hasValue) ctx.addIssue({ code: 'custom', path: ['technicalValues', name], message: `Preencha a característica obrigatória: ${name}.` });
      }
    }
    if (value.mode === 'COMPOSITION') {
      const components = value.components || [];
      if (components.length < 2) {
        ctx.addIssue({ code: 'custom', path: ['components'], message: 'Adicione pelo menos dois componentes distintos ao produto composto.' });
      }
      const selectedComponents = new Set(components.map(({ productId, variationId }) => `${productId}:${variationId || ''}`));
      if (selectedComponents.size !== components.length) {
        ctx.addIssue({ code: 'custom', path: ['components'], message: 'Cada produto ou variação só pode aparecer uma vez na composição.' });
      }
    }
    if ((value.nameMatchCount || 0) > 0 && !value.duplicateNameConfirmed) {
      ctx.addIssue({ code: 'custom', path: ['duplicateNameConfirmed'], message: 'Revise os cadastros semelhantes antes de criar outro produto.' });
    }
  });

// ─── Indisponibilidade de Estoque (Single Source of Truth) ───────────────────
export const UNAVAILABILITY_REASONS = [
  'Avaria',
  'Defeito',
  'Separação para devolução ao fornecedor',
  'Outro',
] as const;

export const UNAVAILABILITY_TREATMENTS = [
  'Devolução ao fornecedor',
  'Descarte/perda',
  'Outro',
] as const;

export type UnavailabilityReason = (typeof UNAVAILABILITY_REASONS)[number];
export type UnavailabilityTreatment = (typeof UNAVAILABILITY_TREATMENTS)[number];

const baseStockUnavailabilityShape = {
  productId: z.string().trim().min(1, 'Selecione uma variação do produto.'),
  variationId: z.string().trim().min(1, 'Selecione uma variação do produto.'),
  quantity: z.number().positive('Informe uma quantidade válida maior que zero.'),
  availableStock: z.number().nonnegative(),
  supplierId: z.string(),
  reason: z
    .string()
    .refine(
      (value) => (UNAVAILABILITY_REASONS as readonly string[]).includes(value),
      'Selecione um motivo válido.'
    ),
  treatment: z
    .string()
    .refine(
      (value) => (UNAVAILABILITY_TREATMENTS as readonly string[]).includes(value),
      'Selecione um tratamento válido.'
    ),
};

export const stockUnavailabilityFormSchema = z
  .object(baseStockUnavailabilityShape)
  .superRefine((value, ctx) => {
    if (value.quantity > value.availableStock) {
      ctx.addIssue({
        code: 'custom',
        path: ['quantity'],
        message: `Quantidade informada (${value.quantity}) é maior que o estoque atual (${value.availableStock}).`,
      });
    }
    if (value.treatment === 'Devolução ao fornecedor' && !value.supplierId) {
      ctx.addIssue({
        code: 'custom',
        path: ['supplierId'],
        message: 'Fornecedor é obrigatório para devolução.',
      });
    }
  });

export const erpStockUnavailabilityFormSchema = z
  .object({
    ...baseStockUnavailabilityShape,
    observation: z.string(),
    physicalLocation: z.string(),
    photos: z.array(imageFilesFormSchema.shape.files.element),
  })
  .superRefine((value, ctx) => {
    if (value.quantity > value.availableStock) {
      ctx.addIssue({
        code: 'custom',
        path: ['quantity'],
        message: `Quantidade informada (${value.quantity}) é maior que o estoque atual (${value.availableStock}).`,
      });
    }
    if (value.treatment === 'Devolução ao fornecedor' && !value.supplierId) {
      ctx.addIssue({
        code: 'custom',
        path: ['supplierId'],
        message: 'Fornecedor é obrigatório para devolução.',
      });
    }
  });

// ─── Tipos Inferidos Exportados ──────────────────────────────────────────────
export type AssemblyScheduleFormValues = z.infer<typeof assemblyScheduleFormSchema>;
export type AssemblyListFormValues = z.infer<typeof assemblyListFormSchema>;
export type ShowcaseAssemblyFormValues = z.infer<typeof showcaseAssemblyFormSchema>;
export type InventoryReversalFormValues = z.infer<typeof inventoryReversalFormSchema>;
export type InventoryMoveFormValues = z.infer<typeof inventoryMoveFormSchema>;
export type PurchaseStockEntryFormValues = z.infer<typeof purchaseStockEntryFormSchema>;
export type InventoryScopeFormValues = z.infer<typeof inventoryScopeFormSchema>;
export type QuickRegisterSelectionFormValues = z.infer<typeof quickRegisterSelectionFormSchema>;
export type StockUnavailabilityFormValues = z.infer<typeof stockUnavailabilityFormSchema>;
export type ErpStockUnavailabilityFormValues = z.infer<typeof erpStockUnavailabilityFormSchema>;
