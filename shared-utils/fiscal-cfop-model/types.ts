/**
 * Tipos e Contratos do Modelo Canônico de CFOP do Morante Hub ERP
 * Baseado no Convênio S/Nº 15/12/1970, Ajustes SINIEF vigentes e orientações SEFAZ-PR.
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

export type FiscalCfopBaseItem = Omit<
  FiscalCfopDefinition,
  'operationType' | 'merchandiseOrigin'
>;

export interface FiscalCfopSemantics {
  operationType: FiscalCfopOperationType;
  merchandiseOrigin: FiscalCfopMerchandiseOrigin;
}

export interface ValidateItemCfopMatchParams {
  cfop: string;
  destination: '1' | '2' | '3';
  model: FiscalModelType;
  direction?: FiscalCfopDirection;
  itemType?: FiscalCfopItemType;
  operationType?: FiscalCfopOperationType;
  merchandiseOrigin?: FiscalCfopMerchandiseOrigin;
  isSt?: boolean;
}

export interface ValidateItemCfopMatchResult {
  valid: boolean;
  reason?: string;
}

export interface DetermineSaleCfopParams {
  destination: '1' | '2' | '3';
  isOwnProduction?: boolean;
  isSt?: boolean;
  itemType?: FiscalCfopItemType;
  catalogCfop?: string;
  recipientIeIndicator?: string;
  finalConsumer?: boolean;
}

export interface ListActiveCfopOptionsFilter {
  direction?: FiscalCfopDirection;
  scope?: FiscalCfopScope;
  model?: FiscalModelType;
  itemType?: FiscalCfopItemType;
  operationType?: FiscalCfopOperationType;
  merchandiseOrigin?: FiscalCfopMerchandiseOrigin;
  isSt?: boolean;
}

export interface ActiveCfopOption {
  value: string;
  label: string;
  operationType: FiscalCfopOperationType;
  merchandiseOrigin: FiscalCfopMerchandiseOrigin;
  isSt: boolean;
  stApplicability: FiscalCfopStApplicability;
}
