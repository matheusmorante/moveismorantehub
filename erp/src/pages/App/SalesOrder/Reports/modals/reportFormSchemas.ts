import { z } from 'zod';

const columnMappingSchema = z.object({
  date: z.string(),
  product: z.string(),
  supplier: z.string(),
  quantity: z.string(),
  cost: z.string(),
  salesValue: z.string(),
  profit: z.string(),
});

export const reportConfigFormSchema = z.object({
  name: z.string().min(1, 'Dê um nome ao relatório.'),
  source: z.enum(['erp', 'csv']),
  config: columnMappingSchema.extend({
    abcBasis: z.enum(['revenue', 'profit']),
    turnoverThresholdMode: z.enum(['avg', 'custom']),
    profitThresholdMode: z.enum(['avg', 'custom']),
    // Negative thresholds remain valid for analyses of losses and adjustments.
    turnoverThreshold: z.number(),
    profitThreshold: z.number(),
  }).passthrough(),
  csvData: z.array(z.record(z.string(), z.string())),
}).superRefine((values, context) => {
  if (values.source === 'csv' && Object.keys(columnMappingSchema.shape).some(
    (column) => values.config[column] === '',
  )) context.addIssue({
    code: 'custom',
    path: ['config'],
    message: 'Todos os campos de mapeamento do CSV são obrigatórios para uma análise precisa.',
  });
});

// Persisted exclusions may include products outside the currently filtered view.
export const itemExclusionFormSchema = z.object({ excludedItems: z.array(z.string()) });
export const reportFiltersFormSchema = z.object({
  suppliers: z.array(z.string()), minProfit: z.number(), maxProfit: z.number(), search: z.string(),
});
