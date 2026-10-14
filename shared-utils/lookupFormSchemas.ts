import { z } from 'zod';
import { normalizeFiscalIdentifier } from './fiscalIdentifiers';
import { validateNfeAccessKey } from './nfeAccessKeyValidation';

export const manualScanFormSchema = z.object({ code: z.string().trim().min(1, 'Informe o código.') });
export const searchFormSchema = z.object({ search: z.string() });
export const submittedSearchFormSchema = z.object({ search: z.string().trim().min(1, 'Informe o texto da busca.') });
export const inboundXmlFormSchema = z.object({
  xml: z.string().refine((value) => Boolean(value.trim()), 'Selecione um arquivo XML ou cole o conteúdo do XML da NF-e.'),
});
export const inboundAccessKeyFormSchema = z.object({
  accessKey: z.string().transform(normalizeFiscalIdentifier)
    .refine((value) => validateNfeAccessKey(value).valid, 'Informe uma chave de acesso NF-e válida com 44 caracteres.'),
});
export const inboundXmlFileFormSchema = z.object({
  uri: z.string().min(1, 'Selecione o arquivo XML.'), name: z.string().regex(/\.xml$/i, 'Selecione um arquivo XML.'),
  mimeType: z.string().nullable().optional(), size: z.number().nonnegative().optional(),
}).passthrough();
