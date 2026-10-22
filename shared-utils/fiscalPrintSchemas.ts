import { z } from 'zod';

export const NFCE_PRINT_FORMATS = ['thermal_80mm', 'a4'] as const;

export type NfcePrintFormat = (typeof NFCE_PRINT_FORMATS)[number];

export const nfcePrintFormatSchema = z.object({
  format: z.enum(NFCE_PRINT_FORMATS, {
    required_error: 'Selecione um formato de impressão para a NFC-e.',
    invalid_type_error: 'Formato de impressão inválido.',
  }),
});

export type NfcePrintFormatFormData = z.infer<typeof nfcePrintFormatSchema>;
