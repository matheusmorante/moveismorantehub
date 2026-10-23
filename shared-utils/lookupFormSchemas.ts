import { z } from 'zod';
import { normalizeFiscalIdentifier } from './fiscalIdentifiers';
import { validateNfeAccessKey } from './nfeAccessKeyValidation';
import { loginFormSchema } from './authFormSchemas';

export const emailLookupFormSchema = loginFormSchema.pick({ email: true });
export const cepLookupFormSchema = z.object({
  cep: z.string().transform((value) => value.replace(/\D/g, '')).pipe(z.string().regex(/^\d{8}$/, 'Informe um CEP com 8 dígitos.')),
});

export const manualScanFormSchema = z.object({ code: z.string().trim().min(1, 'Informe o código.') });
export const searchFormSchema = z.object({ search: z.string() });
export const submittedSearchFormSchema = z.object({ search: z.string().trim().min(1, 'Informe o texto da busca.') });
export const inboundXmlFormSchema = z.object({
  xml: z.string().refine((value) => Boolean(value.trim()), 'Selecione um arquivo XML ou cole o conteúdo do XML da NF de entrada.'),
});
export const inboundAccessKeyFormSchema = z.object({
  accessKey: z.string().transform(normalizeFiscalIdentifier)
    .refine((value) => validateNfeAccessKey(value).valid, 'Informe uma chave válida da NF de entrada com 44 caracteres.'),
});
export const inboundXmlFileFormSchema = z.object({
  uri: z.string().min(1, 'Selecione o arquivo XML.'), name: z.string().regex(/\.xml$/i, 'Selecione um arquivo XML.'),
  mimeType: z.string().nullable().optional(), size: z.number().nonnegative().optional(),
}).passthrough();
