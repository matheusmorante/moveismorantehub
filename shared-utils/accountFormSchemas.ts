import { z } from 'zod';
import { passwordSetupFormSchema } from './authFormSchemas';

export const profileFormSchema = z.object({
  fullName: z.string().trim().min(1, 'Informe seu nome completo.'),
  position: z.string().trim(),
  phone: z.string().trim(),
  address: z.string().trim(),
  city: z.string().trim(),
  state: z.string().trim(),
});

export const createPasswordChangeFormSchema = (requirements: { code: boolean; currentPassword: boolean }) =>
  passwordSetupFormSchema.safeExtend({
    reauthenticationCode: z.string().trim(),
    currentPassword: z.string(),
  }).superRefine((data, context) => {
    if (requirements.code && !data.reauthenticationCode) {
      context.addIssue({ code: 'custom', path: ['reauthenticationCode'], message: 'Informe o código enviado para confirmar sua identidade.' });
    }
    if (requirements.currentPassword && !data.currentPassword) {
      context.addIssue({ code: 'custom', path: ['currentPassword'], message: 'Informe sua senha atual para continuar.' });
    }
  });

export const redeConfigFormSchema = z.object({
  pv: z.string().trim(),
  client_id: z.string().trim(),
  client_secret: z.string(),
  environment: z.enum(['sandbox', 'production'], { error: 'Selecione um ambiente válido.' }),
  active: z.boolean(),
  anticipation_enabled: z.boolean(),
}).passthrough().superRefine((data, context) => {
  if (!data.active) return;
  for (const field of ['pv', 'client_id', 'client_secret'] as const) {
    if (!data[field].trim()) {
      const labels = { pv: 'Número PV', client_id: 'Client ID', client_secret: 'Client Secret' };
      context.addIssue({ code: 'custom', path: [field], message: `Informe ${labels[field]} para ativar a integração.` });
    }
  }
});
