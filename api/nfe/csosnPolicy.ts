import type { SupabaseClient } from '@supabase/supabase-js';
import type { FiscalDatabase } from './fiscalDatabaseTypes';

export const HML_CSOSN_SETTINGS_ID = 'nfe55_hml_csosn_defaults_v1';
import { CSOSN_CODES } from '../../shared-utils/fiscalIcmsGroups';
export { CSOSN_CODES };
export type HmlCsosnConfiguration = {
  model: '55';
  environment: 2;
  issuerCrt: '1';
  csosn: string;
  productionApproved: false;
  version: string;
};

/** The initial default lives only on the server. It is never a production rule. */
export function initialHmlCsosnConfiguration(): HmlCsosnConfiguration {
  return {
    model: '55',
    environment: 2,
    issuerCrt: '1',
    csosn: '103',
    productionApproved: false,
    version: 'hml-csosn-2026-09-30',
  };
}

export function validateCsosn(value: unknown, issuerCrt: string): string {
  if (typeof value !== 'string' || !CSOSN_CODES.some((code) => code === value))
    throw new Error('CSOSN inválido. Selecione uma opção fiscal válida.');
  // This policy is scoped to CRT 1. MEI/other regimes require their own applicable matrix.
  if (issuerCrt !== '1')
    throw new Error('O padrão CSOSN de homologação exige CRT 1 (Simples Nacional).');
  return value;
}

export function parseHmlCsosnConfiguration(value: unknown): HmlCsosnConfiguration {
  const config = value as Partial<HmlCsosnConfiguration> | null;
  if (
    config?.model !== '55' ||
    config.environment !== 2 ||
    config.issuerCrt !== '1' ||
    config.productionApproved !== false ||
    typeof config.version !== 'string' ||
    !config.version
  )
    throw new Error('Configuração de CSOSN de homologação indisponível ou fora do escopo.');
  validateCsosn(config.csosn, config.issuerCrt);
  return config as HmlCsosnConfiguration;
}

export async function loadHmlCsosnConfiguration(
  db: SupabaseClient<FiscalDatabase>,
  requirePersisted = false
) {
  const { data, error } = await db
    .from('settings')
    .select('data')
    .eq('id', HML_CSOSN_SETTINGS_ID)
    .maybeSingle();
  if (error) throw new Error('Não foi possível ler o padrão CSOSN do servidor.');
  if (requirePersisted && !data?.data)
    throw new Error('Salve o padrão CSOSN de homologação antes de emitir.');
  return data?.data ? parseHmlCsosnConfiguration(data.data) : initialHmlCsosnConfiguration();
}

export function resolveItemCsosn(input: {
  configuration: HmlCsosnConfiguration;
  environment: 1 | 2;
  issuerCrt: string;
  specificRule?: string;
  manual?: string;
  saved?: string;
  catalog?: string;
}): { csosn: string; source: 'specific_rule' | 'manual' | 'saved' | 'catalog' | 'default' } {
  parseHmlCsosnConfiguration(input.configuration);
  if (input.environment !== 2)
    throw new Error('O padrão CSOSN de homologação não está aprovado para produção.');
  if (input.specificRule && input.manual && input.specificRule !== input.manual)
    throw new Error('CSOSN selecionado conflita com a regra fiscal específica. Revise a operação.');
  const choices = [
    ['specific_rule', input.specificRule],
    ['manual', input.manual],
    ['saved', input.saved],
    ['catalog', input.catalog],
    ['default', input.configuration.csosn],
  ] as const;
  const [source, value] = choices.find(([, code]) => code !== undefined && code !== '')!;
  return { csosn: validateCsosn(value, input.issuerCrt), source };
}

export function parseItemCsosnOverrides(value: unknown): Record<string, string> {
  if (value === undefined) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Escolhas de CSOSN inválidas.');
  const entries = Object.entries(value);
  if (
    entries.length > 990 ||
    entries.some(
      ([key, code]) =>
        !/^[1-9]\d{0,2}$/.test(key) ||
        Number(key) > 990 ||
        typeof code !== 'string' ||
        !CSOSN_CODES.some((allowed) => allowed === code)
    )
  )
    throw new Error('Escolhas de CSOSN devem referenciar itens válidos e códigos existentes.');
  return Object.fromEntries(entries);
}
