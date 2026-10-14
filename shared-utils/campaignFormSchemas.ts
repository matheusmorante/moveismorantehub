import { z } from 'zod';

export const marketingCampaignFormSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome da campanha.'),
  id: z.string().optional(),
  description: z.string().optional(),
  active: z.boolean().optional(),
}).passthrough();

// An empty string intentionally clears previously saved campaign rules.
export const campaignRulesFormSchema = z.object({ content: z.string() });
