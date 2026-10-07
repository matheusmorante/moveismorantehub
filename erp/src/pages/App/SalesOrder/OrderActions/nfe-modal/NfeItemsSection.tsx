import React from 'react';
import Order from '@/pages/types/order.type';
import Item from '@/pages/types/items.type';
import {
  getCfopDefinition,
  listActiveCfopOptions,
  resolveFiscalCfopOrderScope,
  type FiscalCfopOperationType,
} from '../../../../../../../shared-utils/fiscalCfopModel';
import { getSettings } from '@/pages/utils/settingsService';
import { NfeItemRow, type NfeItemCfopOption } from './NfeItemRow';

export interface NfeItemFiscal {
  ncm: string;
  ncmDescription?: string;
  cest?: string;
  cfop: string;
  cst: string;
  csosnSource?: string;
  origem: string;
}

export interface NfeItemWithFiscal extends Item {
  fiscal: NfeItemFiscal;
  isUnregistered: boolean;
}

interface Props {
  order: Order;
  environment: 1 | 2;
  fiscalModel: '55' | '65';
  items: NfeItemWithFiscal[];
  activeError?: {
    itemIndex?: number;
    itemField?: 'ncm' | 'cfop' | 'cst' | 'origem';
    message: string;
  } | null;
  onClearFieldError?: () => void;
  onUpdateItemFiscal: (index: number, fiscalUpdates: Partial<NfeItemFiscal>) => void;
  onUpdateItemFiscalBlur?: () => void | Promise<void>;
  onBatchUpdateItems: (updated: NfeItemWithFiscal[]) => void;
}

export const NfeItemsSection: React.FC<Props> = ({
  order,
  environment,
  fiscalModel,
  items,
  activeError,
  onClearFieldError,
  onUpdateItemFiscalBlur,
  onUpdateItemFiscal,
}) => {
  // Contadores informativos
  const unregisteredCount = items.filter((i) => i.isUnregistered).length;
  const shipping = (order.shipping as Record<string, unknown> | undefined) || {};
  const customerData = (order.customerData as Record<string, unknown> | undefined) || {};
  const operationScope = resolveFiscalCfopOrderScope({
    issuerUf: getSettings().companyUF,
    deliveryMethod: String(shipping.deliveryMethod || ''),
    shipping,
    customerAddress: customerData.fullAddress || customerData.address,
  });
  const cfopContextMessage =
    operationScope.scope === 'interstate'
      ? `Operação interestadual · ${operationScope.issuerUf} → ${operationScope.operationUf}.`
      : operationScope.scope === 'internal' &&
          operationScope.locationSource === 'issuer_pickup_location'
        ? `Retirada no estabelecimento emitente (${operationScope.operationUf}); o endereço cadastral do cliente não define o CFOP.`
        : operationScope.scope === 'internal'
          ? `Operação interna · ${operationScope.issuerUf} → ${operationScope.operationUf}.`
          : operationScope.reason || 'Não foi possível determinar o local físico da operação.';
  const matrixWarning =
    operationScope.scope === 'foreign'
      ? 'Operação com exterior sem matriz fiscal aprovada.'
      : undefined;

  const cfopOptionsForItem = (item: NfeItemWithFiscal): NfeItemCfopOption[] => {
    if (!operationScope.scope) return [];
    const existingDefinition = getCfopDefinition(item.fiscal?.cfop || '');
    const merchandiseOrigin =
      existingDefinition?.merchandiseOrigin === 'own_production'
        ? 'own_production'
        : 'third_party';
    const isSt = item.fiscal?.cst === '500' || Boolean(existingDefinition?.isSt);
    const itemType = item.itemType === 'service' ? 'service' : 'product';
    const operationTypes: FiscalCfopOperationType[] =
      itemType === 'service'
        ? ['service']
        : operationScope.scope === 'interstate'
          ? ['sale', 'sale_to_non_taxpayer']
          : ['sale'];
    return operationTypes.flatMap((operationType) => listActiveCfopOptions({
      direction: 'outbound',
      scope: operationScope.scope || undefined,
      model: fiscalModel,
      itemType,
      operationType,
      merchandiseOrigin,
      isSt,
    })).map((option) => {
      const approvedInCurrentMatrix =
        (operationScope.scope === 'internal' &&
          option.value === '5102' &&
          merchandiseOrigin === 'third_party' &&
          !isSt) ||
        (operationScope.scope === 'interstate' &&
          (option.value === '6102' || option.value === '6108') &&
          merchandiseOrigin === 'third_party' &&
          !isSt);
      const pendingReason =
        option.stApplicability === 'required' || isSt
          ? ' — ST exige matriz específica'
          : merchandiseOrigin === 'own_production'
            ? ' — produção própria exige matriz específica'
            : ' — matriz fiscal não aprovada';
      return {
        value: option.value,
        label: approvedInCurrentMatrix
          ? option.label
          : `${option.label}${pendingReason}`,
        disabled: !approvedInCurrentMatrix,
      };
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Barra superior de controle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-black">
            <i className="bi bi-boxes" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Itens da Venda para a Nota Fiscal
            </h4>
            <p className="text-[11px] text-slate-400">
              {items.length} produto(s) •{' '}
              {unregisteredCount > 0
                ? `${unregisteredCount} não cadastrado(s) no ERP`
                : 'Todos vinculados ao ERP'}
            </p>
          </div>
        </div>
      </div>

      <div
        role="status"
        aria-live="polite"
        className={`rounded-lg border px-3 py-2 text-xs ${matrixWarning ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'}`}
      >
        <span>{cfopContextMessage}</span>
        {matrixWarning && <span className="ml-1 font-semibold">{matrixWarning}</span>}
      </div>

      {/* Lista dos Itens da Venda */}
      <div className="flex flex-col gap-2.5 max-h-[360px] overflow-y-auto custom-scrollbar pr-1">
        {items.map((item, index) => {
          const itemFieldError =
            activeError?.itemIndex === index && activeError.itemField
              ? { field: activeError.itemField, message: activeError.message }
              : null;
          return (
            <NfeItemRow
              key={`${item.productId || 'item'}_${index}`}
              item={item}
              itemIndex={index}
              cfopOptions={cfopOptionsForItem(item)}
              cfopContextMessage={cfopContextMessage}
              fieldError={itemFieldError}
              onClearFieldError={onClearFieldError}
              onUpdateFiscal={(field, val) => onUpdateItemFiscal(index, { [field]: val })}
              onUpdateFiscalBlur={onUpdateItemFiscalBlur}
            />
          );
        })}
      </div>
    </div>
  );
};
