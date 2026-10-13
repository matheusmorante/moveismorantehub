import { calculateAccessKeyDigit, isValidCnpj, normalizeFiscalIdentifier } from '../../../../../shared-utils/fiscalIdentifiers.js';

/**
 * Utilitário para cálculo e validação da chave de acesso de 44 caracteres (NF-e / NFC-e)
 * de acordo com as especificações oficiais do manual de integração da SEFAZ.
 */

export interface AccessKeyParams {
  ufCode: string; // Ex: '41' para Paraná
  yearMonth: string; // AAMM (ex: '2609' para Setembro/2026)
  cnpj: string; // 12 caracteres e 2 dígitos verificadores
  model: string; // '55' (NF-e) ou '65' (NFC-e)
  series: string | number; // 1 a 3 dígitos (ex: '1' -> '001')
  number: string | number; // 1 a 9 dígitos (ex: '100' -> '000000100')
  emissionType: string; // '1' (Normal)
  randomCode?: string; // 8 dígitos numéricos aleatórios (cNF)
}

/**
 * Calcula o Dígito Verificador Módulo 11 (ponderação de 2 a 9 da direita para a esquerda)
 */
export function calculateMod11CheckDigit(base43: string): number {
  return calculateAccessKeyDigit(base43);
}

/**
 * Gera a chave de acesso de 44 caracteres da NF-e / NFC-e
 */
export function generateNfeAccessKey(params: AccessKeyParams): {
  accessKey: string;
  randomCode: string;
  checkDigit: number;
} {
  const cleanCnpj = normalizeFiscalIdentifier(params.cnpj);
  if (!isValidCnpj(cleanCnpj)) throw new Error('CNPJ do emitente inválido.');
  const cleanUf = params.ufCode.replace(/\D/g, '').padStart(2, '0');
  const cleanAAMM = params.yearMonth.replace(/\D/g, '').padStart(4, '0');
  const cleanModel = params.model.replace(/\D/g, '').padStart(2, '0');
  const cleanSeries = String(params.series).replace(/\D/g, '').padStart(3, '0');
  const cleanNumber = String(params.number).replace(/\D/g, '').padStart(9, '0');
  const cleanTpEmis = (params.emissionType || '1').replace(/\D/g, '').slice(0, 1) || '1';

  // Gera código numérico aleatório de 8 dígitos se não fornecido
  const cNF = params.randomCode
    ? params.randomCode.replace(/\D/g, '').padStart(8, '0').slice(-8)
    : String(Math.floor(10000000 + Math.random() * 90000000));

  // Monta os 43 primeiros caracteres
  const base43 = `${cleanUf}${cleanAAMM}${cleanCnpj}${cleanModel}${cleanSeries}${cleanNumber}${cleanTpEmis}${cNF}`;

  // Calcula o DV
  const checkDigit = calculateMod11CheckDigit(base43);
  const accessKey = `${base43}${checkDigit}`;

  return { accessKey, randomCode: cNF, checkDigit };
}

/**
 * Formata a chave de acesso em blocos de 4 caracteres para visualização humana
 */
export function formatAccessKey(key: string): string {
  const clean = normalizeFiscalIdentifier(key);
  if (clean.length !== 44) return key;
  return clean.replace(/([A-Z0-9]{4})(?=[A-Z0-9])/g, '$1 ');
}
