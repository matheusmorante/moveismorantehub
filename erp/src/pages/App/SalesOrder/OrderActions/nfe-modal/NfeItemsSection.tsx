import React, { useEffect, useMemo, useRef } from 'react';
import Order from '@/pages/types/order.type';
import Item from '@/pages/types/items.type';
import { resolveFiscalCfopOrderScope } from '../../../../../../../shared-utils/fiscalCfopModel';
import {
  resolveEffectiveRecipientIeIndicator,
  type RecipientIeIndicator,
} from '../../../../../../../shared-utils/recipientIeIndicator';
import { fiscalPresence } from '../../../../../../../shared-utils/fiscalDocumentModel';
import { getSettings } from '@/pages/utils/settingsService';
import { NfeItemRow } from './NfeItemRow';
import { resolveNfeItemCfopOptions } from './domain/itemFiscalCfopOptions';

export interface NfeItemFiscal {
  ncm: string;
  ncmDescription?: string;
  cest?: string;
  cfop: string;
  cst: string;
  csosnSource?: string;
  origem: string;
  merchandiseOrigin?: 'third_party' | 'own_production' | 'not_applicable';
  isOwnProduction?: boolean;
  hasSt?: boolean;
  isSt?: boolean;
}

export interface NfeItemWithFiscal extends Item {
  fiscal: NfeItemFiscal;
  isUnregistered: boolean;
}

interface Props {
  order: Order;
  environment: 1 | 2;
  fiscalModel: '55' | '65';
  finalConsumer: boolean;
  recipientIeIndicator?: RecipientIeIndicator;
  recipientIe?: string;
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
  finalConsumer,
  recipientIeIndicator,
  recipientIe,
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
  const fiscalContext =
    (order.fiscalContext as Record<string, unknown> | undefined) ||
    ((order as Order & { data?: { fiscalContext?: Record<string, unknown> } }).data
      ?.fiscalContext as Record<string, unknown> | undefined) ||
    {};
  const settings = getSettings();
  const effectiveRecipientIeIndicator = resolveEffectiveRecipientIeIndicator({
    selected: recipientIeIndicator,
    persisted: fiscalContext.recipientIeIndicator,
    customer: customerData.ieIndicator,
    ie: customerData.ie,
  });
  const recipientDocument = String(customerData.cpfCnpj || customerData.document || '').replace(
    /\D/g,
    ''
  );
  const recipientPersonType =
    customerData.personType === 'PF' || customerData.personType === 'PJ'
      ? customerData.personType
      : recipientDocument.length === 11
        ? 'PF'
        : recipientDocument.length === 14
          ? 'PJ'
          : undefined;
  const operationScope = resolveFiscalCfopOrderScope({
    issuerUf: settings.companyUF,
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
  const presence = fiscalPresence(
    fiscalModel,
    String(shipping.deliveryMethod || ''),
    typeof fiscalContext.presence === 'string' ? fiscalContext.presence : undefined
  );
  const matrixWarning =
    operationScope.scope === 'foreign'
      ? 'Operação com exterior sem matriz fiscal aprovada.'
      : undefined;
  const effectiveAt = useRef(new Date().toISOString()).current;
  const cfopDecisions = useMemo(
    () =>
      items.map((item) =>
        resolveNfeItemCfopOptions({
          item,
          operationScope,
          environment,
          model: fiscalModel,
          issuerRegime: String(settings.companyCRT || ''),
          recipientIeIndicator: effectiveRecipientIeIndicator,
          recipientIe: recipientIe || String(customerData.ie || ''),
          finalConsumer,
          recipientPersonType,
          presence,
          effectiveAt,
        })
      ),
    [
      items,
      operationScope,
      environment,
      fiscalModel,
      settings.companyCRT,
      effectiveRecipientIeIndicator,
      customerData.ie,
      recipientIe,
      finalConsumer,
      recipientPersonType,
      presence,
      effectiveAt,
    ]
  );

  useEffect(() => {
    items.forEach((item, index) => {
      const expectedCfop = cfopDecisions[index]?.defaultCfop || '';
      if ((item.fiscal?.cfop || '') !== expectedCfop) {
        onUpdateItemFiscal(index, { cfop: expectedCfop });
      }
    });
  }, [items, cfopDecisions, onUpdateItemFiscal]);

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
              cfopOptions={cfopDecisions[index]?.options}
              cfopContextMessage={
                cfopDecisions[index]?.reason
                  ? `${cfopContextMessage} ${cfopDecisions[index].reason}`
                  : cfopContextMessage
              }
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
