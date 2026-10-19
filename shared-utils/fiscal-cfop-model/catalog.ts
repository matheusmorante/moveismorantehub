/**
 * Modelo Canônico e Catálogo de CFOPs do Morante Hub ERP
 * Baseado no Convênio S/Nº 15/12/1970, Ajustes SINIEF vigentes e orientações SEFAZ-PR.
 */

import type {
  FiscalCfopDefinition,
  FiscalModelType,
} from './types';
import { CFOP_CATALOG_BASE, CFOP_SEMANTICS } from './data';

// Re-export all types for complete backward compatibility with direct imports from './catalog'
export * from './types';

// Validações de integridade estrutural do catálogo em tempo de inicialização
if (CFOP_CATALOG_BASE.length !== Object.keys(CFOP_SEMANTICS).length) {
  throw new Error('Catálogo CFOP sem classificação semântica completa.');
}
if (new Set(CFOP_CATALOG_BASE.map((item) => item.code)).size !== CFOP_CATALOG_BASE.length) {
  throw new Error('Catálogo CFOP contém código duplicado.');
}

/** Catálogo completo: metadados semânticos explícitos, independentes do prefixo do código. */
export const CANONICAL_CFOPS: readonly FiscalCfopDefinition[] = CFOP_CATALOG_BASE.map((item) => {
  const semantics = CFOP_SEMANTICS[item.code];
  if (!semantics) throw new Error(`CFOP ${item.code} sem natureza ou origem classificada.`);
  return { ...item, ...semantics };
});

const CFOP_BY_CODE = new Map<string, FiscalCfopDefinition>(
  CANONICAL_CFOPS.map((def) => [def.code, def])
);

/** Retorna a definição completa do CFOP se existente */
export function getCfopDefinition(code: string | undefined | null): FiscalCfopDefinition | undefined {
  if (!code) return undefined;
  const normalized = String(code).replace(/\D/g, '');
  return CFOP_BY_CODE.get(normalized);
}

/** Verifica se o CFOP existe e está formalmente cadastrado */
export function isCfopValid(code: string | undefined | null): boolean {
  return !!getCfopDefinition(code);
}

/** Verifica se o CFOP está ativo para uso no ERP */
export function isCfopActive(code: string | undefined | null): boolean {
  const def = getCfopDefinition(code);
  return def ? def.active === true : false;
}

/** Verifica se o CFOP é aplicável ao modelo de documento (55 ou 65) */
export function isCfopApplicableToModel(code: string, model: FiscalModelType): boolean {
  const def = getCfopDefinition(code);
  if (!def) return false;
  return def.allowedModels.includes(model);
}
