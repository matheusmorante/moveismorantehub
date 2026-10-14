import { z } from 'zod';
import { getRecipientTaxIdValidationMessage } from './recipientTaxId';

export type PersonRequiredFields = {
  customer?: Partial<Record<'phone' | 'cpfCnpj' | 'email' | 'rgIe' | 'position', boolean>>;
};

export const createPersonFormSchema = (
  collectionName: string,
  requiredFields: PersonRequiredFields = {}
) => {
  const isEmployee = collectionName === 'employees';
  const isCustomer = collectionName === 'customers';
  const isSupplier = collectionName === 'suppliers';

  return z.object({
    fullName: z
      .string()
      .optional()
      .nullable(),
    personType: z.enum(['PF', 'PJ']).default('PF'),
    phone: z.string().optional().nullable(),
    noPhone: z.boolean().optional(),
    cpfCnpj: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    rgIe: z.string().optional().nullable(),
    ie: z.string().optional().nullable(),
    ieIndicator: z.enum(['1', '2', '9']).optional(),
    position: z.string().optional().nullable(),
    marketingOrigin: z.string().optional().nullable(),
    noAddress: z.boolean().optional(),
    leadTime: z.preprocess((value) => value === '' || value === null ? 0 : typeof value === 'string' ? Number(value) : value,
      z.number().nonnegative('Informe um prazo numérico maior ou igual a zero.')).optional(),
    fullAddress: z
      .object({
        cep: z.string().optional(),
        street: z.string().optional(),
        number: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        neighborhood: z.string().optional(),
        complement: z.string().optional(),
        observation: z.string().optional(),
      })
      .passthrough()
      .optional()
      .nullable(),
  })
    .passthrough()
    .superRefine((data, ctx) => {
      // 1. Validação de Razão Social vs Nome
      if (!data.fullName || data.fullName.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: data.personType === 'PJ' ? 'A Razão Social é obrigatória.' : 'O nome é obrigatório.',
          path: ['fullName'],
        });
      }

      // 2. Telefone obrigatório
      if (
        isCustomer &&
        requiredFields.customer?.phone &&
        !data.noPhone &&
        (!data.phone || data.phone.trim() === '')
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'O telefone é obrigatório.',
          path: ['phone'],
        });
      }

      // 3. CPF/CNPJ obrigatório conforme configuração
      if (
        !isSupplier &&
        requiredFields.customer?.cpfCnpj &&
        (!data.cpfCnpj || data.cpfCnpj.trim() === '')
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'O CPF/CNPJ é obrigatório.',
          path: ['cpfCnpj'],
        });
      }

      if (isCustomer && data.cpfCnpj?.trim()) {
        const documentError = getRecipientTaxIdValidationMessage(
          data.cpfCnpj,
          data.personType
        );
        if (documentError) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: documentError,
            path: ['cpfCnpj'],
          });
        }
      }

      // 4. E-mail obrigatório
      if (
        (isEmployee || (!isSupplier && requiredFields.customer?.email)) &&
        (!data.email || data.email.trim() === '')
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'O e-mail é obrigatório.',
          path: ['email'],
        });
      }

      // 5. RG/IE obrigatório
      if (
        !isSupplier &&
        requiredFields.customer?.rgIe &&
        (!data.rgIe || data.rgIe.trim() === '')
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'O RG/IE é obrigatório.',
          path: ['rgIe'],
        });
      }

      // 6. Cargo obrigatório (funcionários)
      if (
        isEmployee &&
        requiredFields.customer?.position &&
        (!data.position || data.position.trim() === '')
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'O Cargo Principal é obrigatório.',
          path: ['position'],
        });
      }

      // 7. Endereço completo (clientes)
      if (
        isCustomer &&
        !data.noAddress &&
        (!data.fullAddress?.street?.trim() ||
          !data.fullAddress?.number?.trim() ||
          !data.fullAddress?.city?.trim())
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Rua, Número e Cidade são obrigatórios no endereço.',
          path: ['fullAddress'],
        });
      }

      // 8. Origem de marketing (clientes)
      if (isCustomer && !['paid', 'organic'].includes(data.marketingOrigin || '')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Por favor, informe se o cliente é de tráfego pago.',
          path: ['marketingOrigin'],
        });
      }

      // 9. Inscrição Estadual para Contribuinte ICMS
      if (data.ieIndicator === '1' && !(data.ie || data.rgIe)?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'A Inscrição Estadual é obrigatória quando o cliente é Contribuinte do ICMS.',
          path: ['ie'],
        });
      }
    });
};

/**
 * Validação centralizada compartilhada pelo formulário de pessoas e seus testes locais.
 * Utiliza o Zod schema como autoridade e retorna a primeira mensagem de erro amigável.
 */
export const getPersonFormValidationError = (
  person: unknown,
  collectionName: string,
  requiredFields: PersonRequiredFields = {}
): string | null => {
  const schema = createPersonFormSchema(collectionName, requiredFields);
  const result = schema.safeParse(person);
  if (!result.success) {
    return result.error.issues?.[0]?.message || 'Dados inválidos no formulário de pessoa.';
  }
  return null;
};
export const createPersonImportFormSchema = (collectionName: string, requiredFields: PersonRequiredFields = {}) => z.object({
  rows: z.array(createPersonFormSchema(collectionName, requiredFields)).min(1, 'Selecione registros para importar.'),
});
