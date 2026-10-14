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
  circuit_breaker_max_per_minute: z.number().min(10, 'Informe pelo menos 10 chamadas por minuto.'),
  enabled: z.boolean(),
  block_on_hard_limit: z.boolean(),
}).passthrough();
