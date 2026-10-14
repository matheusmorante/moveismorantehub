import { z } from 'zod';
export const calendarEventFormSchema = z.object({
  title: z.string().trim().min(1, 'Informe o título do compromisso.'),
  date: z.iso.date('Informe uma data válida.'),
  timeOrPeriod: z.string(), selectedType: z.enum(['REUNION', 'INSPECTION', 'MAINTENANCE', 'TRAINING', 'OTHER']),
  notes: z.string().trim(),
});
export const reportDateRangeFormSchema = z.object({ start: z.iso.date('Informe a data inicial.'), end: z.iso.date('Informe a data final.') }).refine((values) => values.start <= values.end, { path: ['end'], message: 'A data final deve ser igual ou posterior à inicial.' });
