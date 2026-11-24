import { z } from 'zod';
import { loginFormSchema, passwordSetupFormSchema } from './authFormSchemas';

export const accountNameFormSchema = z.object({ fullName: z.string().trim().min(1, 'O nome não pode estar vazio.') });
export const accountEmailChangeFormSchema = z.object({
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido.'),
  confirmation: z.string().trim().toLowerCase().email('Confirme o novo e-mail.'),
}).refine((value) => value.email === value.confirmation, { path: ['confirmation'], message: 'Os e-mails digitados não coincidem.' });
export const catalogPasswordChangeFormSchema = z.object({
  currentPassword: z.string().min(1, 'Por favor, digite a sua senha atual.'),
  password: z.string().min(6, 'A nova senha deve ter no mínimo 6 caracteres.'), confirmation: z.string(),
}).refine((value) => value.password === value.confirmation, { path: ['confirmation'], message: 'As senhas digitadas não coincidem.' });

export const catalogPasswordReauthenticationFormSchema = catalogPasswordChangeFormSchema.safeExtend({
  email: loginFormSchema.shape.email,
});

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
}).superRefine((data, context) => {
  if (!data.active) return;
  for (const field of ['pv', 'client_id', 'client_secret'] as const) {
    if (!data[field].trim()) {
      const labels = { pv: 'Número PV', client_id: 'Client ID', client_secret: 'Client Secret' };
      context.addIssue({ code: 'custom', path: [field], message: `Informe ${labels[field]} para ativar a integração.` });
    }
  }
});
