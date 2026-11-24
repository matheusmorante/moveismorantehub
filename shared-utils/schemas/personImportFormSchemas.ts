import { z } from 'zod';

export const personCsvUploadFormSchema = z.object({
  file: z.custom<File>((file) => typeof File !== 'undefined' && file instanceof File &&
    file.name.toLowerCase().endsWith('.csv') && file.size > 0, 'Selecione um arquivo CSV preenchido.'),
  encoding: z.enum(['UTF-8', 'ISO-8859-1'], { error: 'Selecione uma codificação disponível.' }),
});
const csvColumn = z.number().int().nonnegative().nullable();
export const personCsvColumnMappingSchema = z.object({
  id: csvColumn, fullName: csvColumn, nickname: csvColumn, personType: csvColumn,
  cpfCnpj: csvColumn, rgIe: csvColumn, email: csvColumn, phone: csvColumn,
  zipCode: csvColumn, street: csvColumn, number: csvColumn, complement: csvColumn,
  neighborhood: csvColumn, city: csvColumn, state: csvColumn, observation: csvColumn,
  marketingOrigin: csvColumn, noPhone: csvColumn, noAddress: csvColumn,
});
export type PersonCsvColumnMapping = z.output<typeof personCsvColumnMappingSchema>;
export const personCsvPreviewFormSchema = z.object({
  headers: z.array(z.string()).min(1, 'O CSV precisa de um cabeçalho.'),
  rows: z.array(z.array(z.string())).min(1, 'O CSV precisa de registros.'),
  mapping: personCsvColumnMappingSchema,
  defaultMarketingOrigin: z.enum(['', 'paid', 'organic'], { error: 'Selecione uma origem disponível.' }),
}).superRefine(({ headers, mapping }, ctx) => {
  if (mapping.fullName === null) ctx.addIssue({ code: 'custom', path: ['mapping', 'fullName'], message: 'Selecione a coluna de nome ou razão social.' });
  for (const [field, column] of Object.entries(mapping)) {
    if (column !== null && column >= headers.length) ctx.addIssue({ code: 'custom', path: ['mapping', field], message: 'Selecione uma coluna do CSV atual.' });
  }
});
