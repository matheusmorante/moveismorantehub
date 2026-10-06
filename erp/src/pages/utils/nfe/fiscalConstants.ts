/**
 * Constantes fiscais padronizadas para todo o Morante Hub ERP
 * Usadas no cadastro/edição de produtos, variações, configurações fiscais e emissão de NF-e/NFC-e.
 */

export interface FiscalOption {
  value: string;
  label: string;
}

import {
  CANONICAL_CFOPS,
  listActiveCfopOptions,
  getCfopDefinition,
  isCfopActive,
  isCfopValid,
  validateItemCfopMatch,
  determineSaleCfop,
  type FiscalCfopDefinition,
} from '../../../../../shared-utils/fiscalCfopModel';

export {
  CANONICAL_CFOPS,
  listActiveCfopOptions,
  getCfopDefinition,
  isCfopActive,
  isCfopValid,
  validateItemCfopMatch,
  determineSaleCfop,
  type FiscalCfopDefinition,
};

export const CFOP_OPTIONS: FiscalOption[] = listActiveCfopOptions();

export const CSOSN_OPTIONS: FiscalOption[] = [
  { value: '102', label: '102 - Simples Nacional - Sem permissão de crédito' },
  { value: '103', label: '103 - Isenção do ICMS no Simples Nacional para faixa de receita bruta' },
  { value: '203', label: '203 - Isenção no Simples Nacional e cobrança de ICMS por ST' },
  {
    value: '500',
    label: '500 - Simples Nacional - ICMS Cobrado Anteriormente por ST (Substituído)',
  },
  { value: '101', label: '101 - Simples Nacional - Com permissão de crédito' },
  { value: '201', label: '201 - Simples Nacional - Com permissão de crédito e ST' },
  { value: '202', label: '202 - Simples Nacional - Sem permissão de crédito e ST' },
  { value: '300', label: '300 - Simples Nacional - Imune' },
  { value: '400', label: '400 - Simples Nacional - Não tributada' },
  { value: '900', label: '900 - Simples Nacional - Outros' },
];

export const ORIGEM_OPTIONS: FiscalOption[] = [
  { value: '0', label: '0 - Nacional' },
  { value: '1', label: '1 - Estrangeira - Importação Direta' },
  { value: '2', label: '2 - Estrangeira - Adquirida no Mercado Interno' },
  { value: '3', label: '3 - Nacional, conteúdo de importação > 40%' },
  { value: '4', label: '4 - Nacional, PPB' },
  { value: '5', label: '5 - Nacional, conteúdo de importação <= 40%' },
  { value: '6', label: '6 - Estrangeira - Importação Direta (CAMEX)' },
  { value: '7', label: '7 - Estrangeira - Adquirida no Mercado Interno (CAMEX)' },
  { value: '8', label: '8 - Nacional, conteúdo de importação > 70%' },
];

export const CEST_OPTIONS: FiscalOption[] = [
  { value: '', label: 'Sem Substituição Tributária (Nenhum / Vazio)' },
  { value: '2806100', label: '2806100 - Colchões e box-springs (ST)' },
  { value: '2806200', label: '2806200 - Suportes para camas (Estrados)' },
];
