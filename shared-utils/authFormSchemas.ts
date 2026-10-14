import { z } from 'zod';

const emailSchema = z.string().trim().email('Informe um e-mail válido.');

export const loginFormSchema = z.object({
  email: emailSchema,
  // Existing accounts may have passwords shorter than the current signup policy.
  password: z.string().min(1, 'Informe sua senha.'),
});

export const signupFormSchema = z.object({
  fullName: z.string().trim().min(1, 'Informe seu nome completo.'),
  email: emailSchema,
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
  confirmPassword: z.string().min(1, 'Confirme sua senha.'),
}).refine((data) => data.password === data.confirmPassword, {
  path: ['confirmPassword'],
  message: 'As senhas não coincidem!',
});

export const PASSWORD_SETUP_MIN_LENGTH = 8;

export const passwordSetupFormSchema = z.object({
  password: z.string(),
  confirmation: z.string(),
}).superRefine((data, context) => {
  if (data.password.length < PASSWORD_SETUP_MIN_LENGTH) {
    context.addIssue({ code: 'custom', path: ['password'], message: `A senha deve ter pelo menos ${PASSWORD_SETUP_MIN_LENGTH} caracteres.` });
  } else if (data.password !== data.confirmation) {
    context.addIssue({ code: 'custom', path: ['confirmation'], message: 'As senhas não coincidem.' });
  }
});

export const passwordRecoveryEmailSchema = z.object({
  email: z.string().trim().min(1, 'Informe seu e-mail para continuar.').email('Informe um e-mail válido.'),
});

export const passwordRecoveryCodeSchema = passwordRecoveryEmailSchema.extend({
  code: z.string().trim().min(1, 'Informe o código recebido por e-mail.'),
});
