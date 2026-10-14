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

  it('rejeita CPF repetido, dígitos verificadores incorretos e letras', () => {
    const client: Partial<Person> = {
      fullName: 'Cliente com CPF inválido',
      personType: 'PF',
      cpfCnpj: '333.333.333-33',
      marketingOrigin: 'organic',
      fullAddress: {
        cep: '80000000',
        street: 'Rua das Flores',
        number: '10',
        neighborhood: 'Centro',
        city: 'Curitiba',
        state: 'PR',
        complement: '',
        observation: '',
      },
    };

    expect(getPersonFormValidationError(client, 'customers')).toMatch(/repetidos/);
    expect(
      getPersonFormValidationError({ ...client, cpfCnpj: '343.445.635-34' }, 'customers')
    ).toMatch(/verificad/);
    expect(
      getPersonFormValidationError({ ...client, cpfCnpj: '343.445.635-3A' }, 'customers')
    ).toMatch(/contém letras/);
  });

  it('bloqueia CPF em cliente PJ e continua permitindo cadastro sem documento quando opcional', () => {
    const client: Partial<Person> = {
      fullName: 'Empresa Cliente',
      personType: 'PJ',
      cpfCnpj: '123.456.789-09',
      marketingOrigin: 'organic',
      fullAddress: {
        cep: '80000000',
        street: 'Rua das Flores',
        number: '10',
        neighborhood: 'Centro',
        city: 'Curitiba',
        state: 'PR',
        complement: '',
        observation: '',
      },
    };

    expect(getPersonFormValidationError(client, 'customers')).toMatch(/Pessoa Jurídica.*CPF/);
    expect(getPersonFormValidationError({ ...client, cpfCnpj: '' }, 'customers')).toBeNull();
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
