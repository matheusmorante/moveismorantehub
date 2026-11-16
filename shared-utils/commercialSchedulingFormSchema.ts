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
const scheduleSchema = z.object({
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

const operationAddressSchema = z.object({
  cep: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  observation: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  housingType: z.string().optional(),
  mapsUrl: z.string().optional(),
  googleMapsUrl: z.string().optional(),
  mapsLink: z.string().optional(),
  placeId: z.string().optional(),
  coords: z.tuple([z.number(), z.number()]).optional(),
  formattedAddress: z.string().optional(),
}).passthrough();

export const commercialSchedulingFormSchema = scheduleSchema.extend({
  appointments: z.array(z.object({
    id: z.string(),
    itemIds: z.array(z.string()),
    itemQuantities: z.record(z.string(), z.number()).optional(),
    deliveryMethod: z.enum(['delivery', 'pickup']).optional(),
    useCustomerAddress: z.boolean().optional(),
    deliveryAddress: operationAddressSchema.optional(),
    freightValue: z.number().nonnegative().optional(),
    distance: z.number().nonnegative().optional(),
    notices: z.object({
      callBeforeDelivery: z.boolean().optional(),
      bringCardMachine: z.boolean().optional(),
      callOnArrival: z.boolean().optional(),
      instructions: z.string().optional(),
    }).optional(),
    itemHandlings: z.record(z.string(), z.object({
      handlingType: z.string(),
      assemblyResponsible: z.enum(['Nossa equipe', 'Montador terceirizado', '']).optional(),
    })).optional(),
    scheduling: scheduleSchema,
  })).optional(),
});
