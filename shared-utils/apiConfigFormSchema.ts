import { z } from 'zod';

const nonnegative = z.number().nonnegative('Informe um valor maior ou igual a zero.');
const threshold = z.number().min(1, 'Informe um percentual entre 1 e 100.').max(100, 'Informe um percentual entre 1 e 100.');

export const apiConfigFormSchema = z.object({
  monthly_limit: nonnegative,
  free_allowance: nonnegative,
  warning_threshold: threshold,
  critical_threshold: threshold,
  hard_limit: threshold,
  price_per_unit: nonnegative,
  currency: z.enum(['BRL', 'USD']),
  circuit_breaker_max_per_minute: z.number().int('Informe um número inteiro de chamadas por minuto.').min(1, 'Informe pelo menos uma chamada por minuto.'),
  enabled: z.boolean(),
  block_on_hard_limit: z.boolean(),
});

export const apiConfigurationWriteSchema = apiConfigFormSchema.extend({
  service_id: z.string().trim().min(1, 'Serviço de API não identificado.'),
  provider: z.enum(['google', 'gemini', 'meta', 'sefaz', 'brasilapi', 'expo', 'other']),
  service_name: z.string().trim().min(1, 'Informe o nome do serviço.'),
  metric: z.string().trim().min(1), billing_unit: z.string().trim().min(1),
  criticality: z.enum(['OPTIONAL', 'IMPORTANT', 'CRITICAL']),
  max_monthly_budget_brl: nonnegative.optional(),
});
