import { z } from 'zod';

const dateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe uma data válida.')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, 'Informe uma data válida.');

export const fiscalExportFormSchema = z.object({
  purpose: z.enum(['accounting', 'custom']),
  period: z.enum(['this_month', 'last_month', 'custom']),
  periodStart: dateSchema,
  periodEnd: dateSchema,
  environment: z.enum(['1', '2']),
  models: z.array(z.enum(['55', '65'])).min(1, 'Selecione ao menos um modelo fiscal.'),
  documentTypes: z.array(z.enum(['outbound', 'estorno', 'return', 'inbound'])).min(1, 'Selecione ao menos um tipo de documento.'),
  statuses: z.array(z.enum(['autorizada', 'homologada', 'cancelada', 'denegada', 'rejeitada']))
    .min(1, 'Selecione ao menos uma situação fiscal.'),
  includeEvents: z.boolean(),
  includeReport: z.boolean(),
}).superRefine((values, context) => {
  if (values.periodStart > values.periodEnd) {
    context.addIssue({ code: 'custom', path: ['periodEnd'], message: 'A data final deve ser igual ou posterior à inicial.' });
  }
  const start = Date.parse(`${values.periodStart}T00:00:00Z`);
  const end = Date.parse(`${values.periodEnd}T00:00:00Z`);
  if (Number.isFinite(start) && Number.isFinite(end) && end - start > 366 * 24 * 60 * 60 * 1000) {
    context.addIssue({ code: 'custom', path: ['periodEnd'], message: 'O período máximo é de 366 dias.' });
  }
  if (values.environment === '1' && values.statuses.includes('homologada')) {
    context.addIssue({ code: 'custom', path: ['statuses'], message: 'Notas homologadas pertencem ao ambiente de homologação.' });
  }
  if (values.environment === '2' && values.statuses.includes('autorizada')) {
    context.addIssue({ code: 'custom', path: ['statuses'], message: 'Notas autorizadas pertencem ao ambiente de produção.' });
  }
  if (values.purpose === 'accounting' && (values.environment !== '1' || values.documentTypes.includes('inbound') || !values.includeEvents ||
      values.statuses.some((status) => !['autorizada', 'cancelada'].includes(status)))) {
    context.addIssue({ code: 'custom', path: ['purpose'], message: 'A exportação contábil usa Produção, notas autorizadas/canceladas e eventos fiscais registrados.' });
  }
});

export type FiscalExportFormInput = z.input<typeof fiscalExportFormSchema>;
