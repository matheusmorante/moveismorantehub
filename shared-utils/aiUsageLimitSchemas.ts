import { z } from 'zod';

export const operatingHoursQuotaSchema = z.object({
  enabled: z.boolean().default(true),
  start: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Horário inicial deve estar no formato HH:MM (ex: 08:00)')
    .default('08:00'),
  end: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Horário final deve estar no formato HH:MM (ex: 22:00)')
    .default('22:00'),
  timezone: z.string().default('America/Sao_Paulo'),
  allowOffHoursEmergency: z.boolean().default(true),
  offHoursHourlyMaxRequests: z.number().int().min(0).max(50).default(5),
});

export const aiUsageLimitsSchema = z.object({
  monthlyBudgetBRL: z
    .number()
    .min(5, 'O orçamento mensal deve ser de pelo menos R$ 5,00')
    .max(1000, 'Orçamento máximo permitido é R$ 1.000,00')
    .default(30.0),
  hardLimitPercent: z
    .number()
    .min(50, 'Limite rígido deve ser no mínimo 50%')
    .max(100, 'Limite rígido máximo é 100%')
    .default(95),
  warningThresholdPercent: z
    .number()
    .min(30, 'Limite de alerta deve ser no mínimo 30%')
    .max(95, 'Limite de alerta máximo é 95%')
    .default(70),
  dailyBudgetBRL: z
    .number()
    .min(0.5, 'Cota diária mínima é R$ 0,50')
    .max(100, 'Cota diária máxima é R$ 100,00')
    .default(1.5),
  dailyMaxRequests: z
    .number()
    .int('Informe um número inteiro de requisições por dia')
    .min(10, 'Mínimo de 10 requisições por dia')
    .max(10000, 'Máximo de 10.000 requisições por dia')
    .default(250),
  hourlyMaxRequests: z
    .number()
    .int('Informe um número inteiro de requisições por hora')
    .min(5, 'Mínimo de 5 requisições por hora')
    .max(1000, 'Máximo de 1.000 requisições por hora')
    .default(60),
  dailyMaxTokens: z
    .number()
    .int('Informe um número inteiro de tokens por dia')
    .min(10000, 'Mínimo de 10.000 tokens por dia')
    .max(5000000, 'Máximo de 5.000.000 tokens por dia')
    .default(350000),
  hourlyMaxTokens: z
    .number()
    .int('Informe um número inteiro de tokens por hora')
    .min(5000, 'Mínimo de 5.000 tokens por hora')
    .max(1000000, 'Máximo de 1.000.000 tokens por hora')
    .default(90000),
  circuitBreakerPerMinute: z
    .number()
    .int('Informe um número inteiro de requisições por minuto')
    .min(2, 'Mínimo de 2 requisições por minuto')
    .max(120, 'Máximo de 120 requisições por minuto')
    .default(15),
  operatingHours: operatingHoursQuotaSchema.default({
    enabled: true,
    start: '08:00',
    end: '22:00',
    timezone: 'America/Sao_Paulo',
    allowOffHoursEmergency: true,
    offHoursHourlyMaxRequests: 5,
  }),
});

export type AiUsageLimitsConfig = z.infer<typeof aiUsageLimitsSchema>;

export const DEFAULT_AI_USAGE_LIMITS: AiUsageLimitsConfig = {
  monthlyBudgetBRL: 30.0,
  hardLimitPercent: 95,
  warningThresholdPercent: 70,
  dailyBudgetBRL: 1.5,
  dailyMaxRequests: 250,
  hourlyMaxRequests: 60,
  dailyMaxTokens: 350000,
  hourlyMaxTokens: 90000,
  circuitBreakerPerMinute: 15,
  operatingHours: {
    enabled: true,
    start: '08:00',
    end: '22:00',
    timezone: 'America/Sao_Paulo',
    allowOffHoursEmergency: true,
    offHoursHourlyMaxRequests: 5,
  },
};
