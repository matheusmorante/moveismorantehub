import { describe, expect, it } from 'vitest';
import {
  createPersonFormSchema,
  getPersonFormValidationError,
} from '../personFormValidation';
import type Person from '../../../types/person.type';

describe('personFormValidation com Zod schema', () => {
  it('valida cliente válido padrão para PF', () => {
    const validClient: Partial<Person> = {
      fullName: 'Cliente Válido de Teste',
      personType: 'PF',
      phone: '41999998888',
      marketingOrigin: 'organic',
      ieIndicator: '9',
      fullAddress: {
        cep: '80010000',
        street: 'Rua XV de Novembro',
        number: '100',
        neighborhood: 'Centro',
        city: 'Curitiba',
        state: 'PR',
        complement: '',
        observation: '',
      },
    };

    expect(getPersonFormValidationError(validClient, 'customers')).toBeNull();
  });

  it('exige Razão Social para Pessoa Jurídica quando vazio', () => {
    const pj: Partial<Person> = {
      fullName: '',
      personType: 'PJ',
      marketingOrigin: 'organic',
    };

    expect(getPersonFormValidationError(pj, 'customers')).toBe('A Razão Social é obrigatória.');
  });

  it('exige IE quando ieIndicator é 1 (Contribuinte ICMS)', () => {
    const contribuinteSemIe: Partial<Person> = {
      fullName: 'Empresa Contribuinte',
      personType: 'PJ',
      marketingOrigin: 'organic',
      ieIndicator: '1',
      ie: '',
      rgIe: '',
      fullAddress: {
        street: 'Rua das Flores',
        number: '10',
        city: 'Curitiba',
        cep: '80000000',
        neighborhood: 'Centro',
        observation: '',
        complement: '',
      },
    };

    expect(getPersonFormValidationError(contribuinteSemIe, 'customers')).toBe(
      'A Inscrição Estadual é obrigatória quando o cliente é Contribuinte do ICMS.'
    );
  });

  it('valida campos dinâmicos configuráveis através do Zod schema', () => {
    const client: Partial<Person> = {
      fullName: 'Cliente Sem Email',
      personType: 'PF',
      marketingOrigin: 'organic',
      fullAddress: {
        street: 'Rua das Flores',
        number: '10',
        city: 'Curitiba',
        cep: '80000000',
        neighborhood: 'Centro',
        observation: '',
        complement: '',
      },
    };

    const schema = createPersonFormSchema('customers', {
      customer: { email: true },
    });
    const parsed = schema.safeParse(client);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues?.[0]?.message).toBe('O e-mail é obrigatório.');
    }
  });
});
