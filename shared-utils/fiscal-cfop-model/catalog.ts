/**
 * Modelo Canônico e Catálogo de CFOPs do Morante Hub ERP
 * Baseado no Convênio S/Nº 15/12/1970, Ajustes SINIEF vigentes e orientações SEFAZ-PR.
 *
 * Classificação estrita entre:
 * - Operação interna (1xxx entrada, 5xxx saída)
 * - Operação interestadual (2xxx entrada, 6xxx saída)
 * - Operação exterior (3xxx entrada, 7xxx saída)
 * - Mercadoria vs. Prestação de serviço (ISSQN)
 * - Venda de mercadoria adquirida de terceiros vs. Produção própria vs. Substituição Tributária (ST)
 * - Modelos permitidos: NF-e (55) e NFC-e (65)
 */

export type FiscalCfopDirection = 'inbound' | 'outbound';
export type FiscalCfopScope = 'internal' | 'interstate' | 'foreign';
export type FiscalCfopItemType = 'product' | 'service';
export type FiscalModelType = '55' | '65';
export type FiscalCfopOperationType =
  | 'sale'
  | 'sale_outside_establishment'
  | 'sale_to_non_taxpayer'
  | 'supplier_return'
  | 'customer_return'
  | 'transfer'
  | 'shipment'
  | 'bonus_donation_gift'
  | 'service'
  | 'other';
export type FiscalCfopMerchandiseOrigin = 'third_party' | 'own_production' | 'not_applicable';
export type FiscalCfopStApplicability =
  | 'required'
  | 'not_required'
  | 'scenario_dependent'
  | 'not_applicable';

export interface FiscalCfopDefinition {
  code: string;
  description: string;
  direction: FiscalCfopDirection;
  scope: FiscalCfopScope;
  itemType: FiscalCfopItemType;
  operationType: FiscalCfopOperationType;
  merchandiseOrigin: FiscalCfopMerchandiseOrigin;
  stApplicability?: FiscalCfopStApplicability;
  allowedModels: readonly FiscalModelType[];
  active: boolean;
  isSt?: boolean;
  isOwnProduction?: boolean;
  isReturn?: boolean;
  isTransfer?: boolean;
  isShipment?: boolean;
  notes?: string;
}

/** Catálogo base de CFOPs do Morante Hub; natureza e origem ficam no mapa semântico abaixo. */
const CFOP_CATALOG_BASE: readonly Omit<
  FiscalCfopDefinition,
  'operationType' | 'merchandiseOrigin'
>[] = [
  // --- SAÍDAS INTERNAS (5.xxx) ---
  {
    code: '5102',
    description: 'Venda de mercadoria adquirida ou recebida de terceiros',
    direction: 'outbound',
    scope: 'internal',
    itemType: 'product',
    allowedModels: ['55', '65'],
    active: true,
    isOwnProduction: false,
    isSt: false,
    notes: 'Operação padrão de venda varejo/comércio no Paraná.',
  },
  {
    code: '5101',
    description: 'Venda de produção do estabelecimento',
    direction: 'outbound',
    scope: 'internal',
    itemType: 'product',
    allowedModels: ['55', '65'],
    active: true,
    isOwnProduction: true,
    isSt: false,
    notes: 'Venda de móveis e itens fabricados no estabelecimento no Paraná.',
  },
  {
    code: '5405',
    description: 'Venda de mercadoria adquirida de terceiros com ST (Substituído)',
    direction: 'outbound',
    scope: 'internal',
    itemType: 'product',
    allowedModels: ['55', '65'],
    active: true,
    isOwnProduction: false,
    isSt: true,
    notes: 'Mercadoria com ICMS ST retido anteriormente (CSOSN 500) no Paraná.',
  },
  {
    code: '5403',
    description: 'Venda de mercadoria de terceiros sujeita a ST na condição de substituto tributário',
    direction: 'outbound',
    scope: 'internal',
    itemType: 'product',
    allowedModels: ['55', '65'],
    active: true,
    isOwnProduction: false,
    isSt: true,
    notes: 'Venda de mercadoria de terceiros em operação com ST, na condição de contribuinte substituto.',
  },
  {
    code: '5104',
    description: 'Venda de mercadoria adquirida de terceiros efetuada fora do estabelecimento',
    direction: 'outbound',
    scope: 'internal',
    itemType: 'product',
    allowedModels: ['55', '65'],
    active: true,
    isOwnProduction: false,
    isSt: false,
    notes: 'Venda realizada fora do estabelecimento (ex: entrega externa/feiras).',
  },
  {
    code: '5152',
    description: 'Transferência de mercadoria adquirida ou recebida de terceiros',
    direction: 'outbound',
    scope: 'internal',
    itemType: 'product',
    allowedModels: ['55'],
    active: true,
    isTransfer: true,
    notes: 'Transferência entre filiais/depósitos dentro do Paraná.',
  },
  {
    code: '5202',
    description: 'Devolução de compra para comercialização',
    direction: 'outbound',
    scope: 'internal',
    itemType: 'product',
    allowedModels: ['55'],
    active: true,
    isReturn: true,
    notes: 'Devolução de compra a fornecedor dentro do Paraná.',
  },
  {
    code: '5411',
    description: 'Devolução de compra para comercialização com ST',
    direction: 'outbound',
    scope: 'internal',
    itemType: 'product',
    allowedModels: ['55'],
    active: true,
    isReturn: true,
    isSt: true,
    notes: 'Devolução de mercadoria com ST a fornecedor no Paraná.',
  },
  {
    code: '5910',
    description: 'Remessa em bonificação, doação ou brinde',
    direction: 'outbound',
    scope: 'internal',
    itemType: 'product',
    allowedModels: ['55'],
    active: true,
    isShipment: true,
    notes: 'Brindes ou bonificações no Paraná.',
  },
  {
    code: '5912',
    description: 'Remessa para demonstração',
    direction: 'outbound',
    scope: 'internal',
    itemType: 'product',
    allowedModels: ['55'],
    active: true,
    isShipment: true,
    notes: 'Remessa para demonstração no Paraná.',
  },
  {
    code: '5914',
    description: 'Remessa para exposição ou feira',
    direction: 'outbound',
    scope: 'internal',
    itemType: 'product',
    allowedModels: ['55'],
    active: true,
    isShipment: true,
    notes: 'Remessa para showroom/feira no Paraná.',
  },
  {
    code: '5915',
    description: 'Remessa para conserto ou reparo',
    direction: 'outbound',
    scope: 'internal',
    itemType: 'product',
    allowedModels: ['55'],
    active: true,
    isShipment: true,
    notes: 'Remessa para assistência técnica/conserto no Paraná.',
  },
  {
    code: '5949',
    description: 'Outra saída de mercadoria ou prestação de serviço não especificado',
    direction: 'outbound',
    scope: 'internal',
    itemType: 'product',
    allowedModels: ['55'],
    active: true,
    notes: 'Outras saídas não especificadas dentro do Paraná.',
  },
  {
    code: '5933',
    description: 'Prestação de serviço tributado pelo ISSQN dentro do Estado',
    direction: 'outbound',
    scope: 'internal',
    itemType: 'service',
    allowedModels: ['55'],
    active: true,
    notes: 'Exclusivo para serviço sujeito a ISSQN. Proibido para venda de mercadoria.',
  },

  // --- SAÍDAS INTERESTADUAIS (6.xxx) ---
  {
    code: '6102',
    description: 'Venda de mercadoria adquirida ou recebida de terceiros para fora do Estado',
    direction: 'outbound',
    scope: 'interstate',
    itemType: 'product',
    allowedModels: ['55'],
    active: true,
    isOwnProduction: false,
    isSt: false,
    notes: 'Classificação de venda interestadual de terceiros; não aprova a tributação do cenário.',
  },
  {
    code: '6101',
    description: 'Venda de produção do estabelecimento para fora do Estado',
    direction: 'outbound',
    scope: 'interstate',
    itemType: 'product',
    allowedModels: ['55'],
    active: true,
    isOwnProduction: true,
    isSt: false,
    notes: 'Venda de produção própria entregue em outra UF.',
  },
  {
    code: '6108',
    description: 'Venda de mercadoria adquirida de terceiros destinada a não contribuinte',
    direction: 'outbound',
    scope: 'interstate',
    itemType: 'product',
    allowedModels: ['55'],
    active: true,
    isOwnProduction: false,
    stApplicability: 'scenario_dependent',
    notes: 'CFOP de venda a não contribuinte; aplicabilidade e tributos dependem do cenário e da matriz aprovada.',
  },
  {
    code: '6107',
    description: 'Venda de produção do estabelecimento destinada a não contribuinte',
    direction: 'outbound',
    scope: 'interstate',
    itemType: 'product',
    allowedModels: ['55'],
    active: true,
    isOwnProduction: true,
    isSt: false,
    notes: 'Produção própria para não contribuinte em outra UF.',
  },
  {
    code: '6404',
    description: 'Venda de mercadoria sujeita a ST com imposto retido anteriormente',
    direction: 'outbound',
    scope: 'interstate',
    itemType: 'product',
    allowedModels: ['55'],
    active: true,
    isOwnProduction: false,
    isSt: true,
    notes: 'Mercadoria com ST retido vendida para fora do Estado.',
  },
  {
    code: '6403',
    description: 'Venda de mercadoria de terceiros sujeita a ST na condição de substituto tributário para fora do Estado',
    direction: 'outbound',
    scope: 'interstate',
    itemType: 'product',
    allowedModels: ['55'],
    active: true,
    isOwnProduction: false,
    isSt: true,
    notes: 'Venda interestadual de mercadoria de terceiros com ST, na condição de contribuinte substituto.',
  },
  {
    code: '6152',
    description: 'Transferência de mercadoria adquirida de terceiros para fora do Estado',
    direction: 'outbound',
    scope: 'interstate',
    itemType: 'product',
    allowedModels: ['55'],
    active: true,
    isTransfer: true,
    notes: 'Transferência entre estabelecimentos em UFs distintas.',
  },
  {
    code: '6202',
    description: 'Devolução de compra para comercialização para fora do Estado',
    direction: 'outbound',
    scope: 'interstate',
    itemType: 'product',
    allowedModels: ['55'],
    active: true,
    isReturn: true,
    notes: 'Devolução a fornecedor localizado em outra UF.',
  },
  {
    code: '6411',
    description: 'Devolução de compra para comercialização com ST para fora do Estado',
    direction: 'outbound',
    scope: 'interstate',
    itemType: 'product',
    allowedModels: ['55'],
    active: true,
    isReturn: true,
    isSt: true,
    notes: 'Devolução de mercadoria com ST a fornecedor em outra UF.',
  },
  {
    code: '6910',
    description: 'Remessa em bonificação, doação ou brinde para fora do Estado',
    direction: 'outbound',
    scope: 'interstate',
    itemType: 'product',
    allowedModels: ['55'],
    active: true,
    isShipment: true,
    notes: 'Brindes ou bonificações fora do Paraná.',
  },
  {
    code: '6912',
    description: 'Remessa para demonstração para fora do Estado',
    direction: 'outbound',
    scope: 'interstate',
    itemType: 'product',
    allowedModels: ['55'],
    active: true,
    isShipment: true,
    notes: 'Demonstração em outra UF.',
  },
  {
    code: '6914',
    description: 'Remessa para exposição ou feira para fora do Estado',
    direction: 'outbound',
    scope: 'interstate',
    itemType: 'product',
    allowedModels: ['55'],
    active: true,
    isShipment: true,
    notes: 'Exposição ou feira em outra UF.',
  },
  {
    code: '6915',
    description: 'Remessa para conserto ou reparo para fora do Estado',
    direction: 'outbound',
    scope: 'interstate',
    itemType: 'product',
    allowedModels: ['55'],
    active: true,
    isShipment: true,
    notes: 'Envio para conserto em outra UF.',
  },
  {
    code: '6949',
    description: 'Outra saída de mercadoria ou prestação de serviço não especificado fora do Estado',
    direction: 'outbound',
    scope: 'interstate',
    itemType: 'product',
    allowedModels: ['55'],
    active: true,
    notes: 'Outras saídas interestaduais não especificadas.',
  },
  {
    code: '6933',
    description: 'Prestação de serviço tributado pelo ISSQN para fora do Estado',
    direction: 'outbound',
    scope: 'interstate',
    itemType: 'service',
    allowedModels: ['55'],
    active: true,
    notes: 'Exclusivo para serviço sujeito a ISSQN. Proibido para venda de mercadoria.',
  },

  // --- ENTRADAS INTERNAS (1.xxx) ---
  {
    code: '1202',
    description: 'Devolução de venda de mercadoria adquirida ou recebida de terceiros',
    direction: 'inbound',
    scope: 'internal',
    itemType: 'product',
    allowedModels: ['55'],
    active: true,
    isReturn: true,
    notes: 'Entrada por devolução de cliente dentro do Paraná.',
  },
  {
    code: '1201',
    description: 'Devolução de venda de produção do estabelecimento',
    direction: 'inbound',
    scope: 'internal',
    itemType: 'product',
    allowedModels: ['55'],
    active: true,
    isReturn: true,
    isOwnProduction: true,
    notes: 'Entrada por devolução de venda de produção própria no Paraná.',
  },
  {
    code: '1411',
    description: 'Devolução de venda de mercadoria adquirida de terceiros com ST',
    direction: 'inbound',
    scope: 'internal',
    itemType: 'product',
    allowedModels: ['55'],
    active: true,
    isReturn: true,
    isSt: true,
    notes: 'Entrada devolução de mercadoria com ST no Paraná.',
  },
  {
    code: '1949',
    description: 'Outra entrada de mercadoria ou prestação de serviço não especificada',
    direction: 'inbound',
    scope: 'internal',
    itemType: 'product',
    allowedModels: ['55'],
    active: true,
    notes: 'Entradas diversas / estorno conforme RICMS/PR art. 298.',
  },

  // --- ENTRADAS INTERESTADUAIS (2.xxx) ---
  {
    code: '2202',
    description: 'Devolução de venda de mercadoria adquirida de terceiros fora do Estado',
    direction: 'inbound',
    scope: 'interstate',
    itemType: 'product',
    allowedModels: ['55'],
    active: true,
    isReturn: true,
    notes: 'Entrada por devolução de cliente localizado em outra UF.',
  },
  {
    code: '2201',
    description: 'Devolução de venda de produção do estabelecimento fora do Estado',
    direction: 'inbound',
    scope: 'interstate',
    itemType: 'product',
    allowedModels: ['55'],
    active: true,
    isReturn: true,
    isOwnProduction: true,
    notes: 'Entrada por devolução de cliente de outra UF para produção própria.',
  },
  {
    code: '2411',
    description: 'Devolução de venda de mercadoria com ST fora do Estado',
    direction: 'inbound',
    scope: 'interstate',
    itemType: 'product',
    allowedModels: ['55'],
    active: true,
    isReturn: true,
    isSt: true,
    notes: 'Entrada devolução de mercadoria com ST de outra UF.',
  },
  {
    code: '2949',
    description: 'Outra entrada de mercadoria ou prestação de serviço não especificada de fora do Estado',
    direction: 'inbound',
    scope: 'interstate',
    itemType: 'product',
    allowedModels: ['55'],
    active: true,
    notes: 'Outras entradas interestaduais não especificadas.',
  },
];

const CFOP_SEMANTICS: Readonly<
  Record<
    string,
    { operationType: FiscalCfopOperationType; merchandiseOrigin: FiscalCfopMerchandiseOrigin }
  >
> = {
  '5102': { operationType: 'sale', merchandiseOrigin: 'third_party' },
  '5101': { operationType: 'sale', merchandiseOrigin: 'own_production' },
  '5405': { operationType: 'sale', merchandiseOrigin: 'third_party' },
  '5403': { operationType: 'sale', merchandiseOrigin: 'third_party' },
  '5104': { operationType: 'sale_outside_establishment', merchandiseOrigin: 'third_party' },
  '5152': { operationType: 'transfer', merchandiseOrigin: 'third_party' },
  '5202': { operationType: 'supplier_return', merchandiseOrigin: 'third_party' },
  '5411': { operationType: 'supplier_return', merchandiseOrigin: 'third_party' },
  '5910': { operationType: 'bonus_donation_gift', merchandiseOrigin: 'not_applicable' },
  '5912': { operationType: 'shipment', merchandiseOrigin: 'not_applicable' },
  '5914': { operationType: 'shipment', merchandiseOrigin: 'not_applicable' },
  '5915': { operationType: 'shipment', merchandiseOrigin: 'not_applicable' },
  '5949': { operationType: 'other', merchandiseOrigin: 'not_applicable' },
  '5933': { operationType: 'service', merchandiseOrigin: 'not_applicable' },
  '6102': { operationType: 'sale', merchandiseOrigin: 'third_party' },
  '6101': { operationType: 'sale', merchandiseOrigin: 'own_production' },
  '6108': { operationType: 'sale_to_non_taxpayer', merchandiseOrigin: 'third_party' },
  '6107': { operationType: 'sale_to_non_taxpayer', merchandiseOrigin: 'own_production' },
  '6404': { operationType: 'sale', merchandiseOrigin: 'third_party' },
  '6403': { operationType: 'sale', merchandiseOrigin: 'third_party' },
  '6152': { operationType: 'transfer', merchandiseOrigin: 'third_party' },
  '6202': { operationType: 'supplier_return', merchandiseOrigin: 'third_party' },
  '6411': { operationType: 'supplier_return', merchandiseOrigin: 'third_party' },
  '6910': { operationType: 'bonus_donation_gift', merchandiseOrigin: 'not_applicable' },
  '6912': { operationType: 'shipment', merchandiseOrigin: 'not_applicable' },
  '6914': { operationType: 'shipment', merchandiseOrigin: 'not_applicable' },
  '6915': { operationType: 'shipment', merchandiseOrigin: 'not_applicable' },
  '6949': { operationType: 'other', merchandiseOrigin: 'not_applicable' },
  '6933': { operationType: 'service', merchandiseOrigin: 'not_applicable' },
  '1202': { operationType: 'customer_return', merchandiseOrigin: 'third_party' },
  '1201': { operationType: 'customer_return', merchandiseOrigin: 'own_production' },
  '1411': { operationType: 'customer_return', merchandiseOrigin: 'third_party' },
  '1949': { operationType: 'other', merchandiseOrigin: 'not_applicable' },
  '2202': { operationType: 'customer_return', merchandiseOrigin: 'third_party' },
  '2201': { operationType: 'customer_return', merchandiseOrigin: 'own_production' },
  '2411': { operationType: 'customer_return', merchandiseOrigin: 'third_party' },
  '2949': { operationType: 'other', merchandiseOrigin: 'not_applicable' },
};

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
