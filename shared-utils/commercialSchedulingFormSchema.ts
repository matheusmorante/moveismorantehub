import { z } from 'zod';

const scheduleAlternativeSchema = z.object({
  id: z.string(),
  date: z.union([z.literal(''), z.iso.date('Informe uma data válida.')]),
  endDate: z.union([z.literal(''), z.iso.date('Informe uma data válida.')]).optional(),
  dateType: z.enum(['fixed', 'range']).optional(),
  time: z.string(),
  startTime: z.string().regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/, 'Informe um horário válido.').optional(),
  endTime: z.string().regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/, 'Informe um horário válido.').optional(),
  type: z.enum(['fixed', 'range']),
});

// Incomplete scheduling remains valid until the operator defines a date/time.
export const commercialSchedulingFormSchema = z.object({
  date: z.union([z.literal(''), z.iso.date('Informe uma data válida.')]),
  endDate: z.union([z.literal(''), z.iso.date('Informe uma data válida.')]).optional(),
  dateType: z.enum(['fixed', 'range']).optional(),
  time: z.string(),
  startTime: z.string().regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/, 'Informe um horário válido.').optional(),
  endTime: z.string().regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/, 'Informe um horário válido.').optional(),
  type: z.enum(['fixed', 'range']),
  notInformed: z.boolean().optional(),
  pendingScheduling: z.boolean().optional(),
  immediatePickup: z.boolean().optional(),
  scheduleMode: z.enum(['defined', 'alternatives']).optional(),
  alternatives: z.array(scheduleAlternativeSchema).optional(),
});
