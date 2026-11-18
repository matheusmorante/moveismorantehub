import React, { useEffect, useMemo, useRef } from 'react';
import Order from '@/pages/types/order.type';
import Item from '@/pages/types/items.type';
import {
  getCfopDefinition,
  resolveFiscalCfopOrderScope,
} from '../../../../../../../shared-utils/fiscalCfopModel';
import {
  resolveEffectiveRecipientIeIndicator,
  type RecipientIeIndicator,
} from '../../../../../../../shared-utils/recipientIeIndicator';
import { fiscalPresence } from '../../../../../../../shared-utils/fiscalDocumentModel';
import type { DeliveryMethod } from '../../../../../../../shared-utils/fiscalTransportModel';
import { normalizeRecipientTaxId } from '../../../../../../../shared-utils/recipientTaxId';
import { getSettings } from '@/pages/utils/settingsService';
import { NfeItemRow } from './NfeItemRow';
import { resolveNfeItemCfopOptions } from './domain/itemFiscalCfopOptions';
import {
  composeServiceFiscalValues,
  servicesMissingProductLinksMessage,
} from '@/pages/utils/nfe/serviceFiscalComposition';

export interface NfeItemFiscal {
  ncm: string;
  ncmDescription?: string;
  cest?: string;
  commercialUnit?: string;
  taxableUnit?: string;
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
  deliveryMethod: DeliveryMethod;
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
  deliveryMethod,
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
  const recipientDocument = normalizeRecipientTaxId(String(customerData.cpfCnpj || customerData.document || ''));
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
    deliveryMethod,
    typeof fiscalContext.presence === 'string' ? fiscalContext.presence : undefined
  );
  const matrixWarning =
    operationScope.scope === 'foreign'
      ? 'Operação com exterior sem matriz fiscal aprovada.'
      : undefined;
  const effectiveAt = useRef(new Date().toISOString()).current;
  const serviceComposition = useMemo(
    () => composeServiceFiscalValues(order.items || [], fiscalModel),
    [order.items, fiscalModel]
  );
  const serviceCompositionWarning = servicesMissingProductLinksMessage(serviceComposition);
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

  const editableCfopDecisions = useMemo(
    () =>
      cfopDecisions.map((decision, index) => {
        const item = items[index];
        if (
          operationScope.scope !== 'interstate' ||
          !decision.reason ||
          !item ||
          item.itemType === 'service'
        ) {
          return decision;
        }

        const merchandiseSource = item.merchandiseOrigin ?? item.fiscal?.merchandiseOrigin;
        const isOwnProduction =
          merchandiseSource === 'own_production' ||
          item.isOwnProduction === true ||
          item.fiscal?.isOwnProduction === true;
        const hasSt = item.fiscal?.hasSt ?? item.fiscal?.isSt;
        const options = decision.options.map((option) => {
          const definition = getCfopDefinition(option.value);
          const stApplicability = definition
            ? definition.stApplicability ||
              (definition.isSt
                ? 'required'
                : definition.itemType === 'product'
                  ? 'not_required'
                  : 'not_applicable')
            : undefined;
          const structurallyCompatible = Boolean(
            definition &&
              definition.direction === 'outbound' &&
              definition.scope === 'interstate' &&
              definition.itemType === 'product' &&
              definition.allowedModels.includes(fiscalModel) &&
              definition.operationType.startsWith('sale') &&
              (definition.isOwnProduction === undefined ||
                definition.isOwnProduction === isOwnProduction) &&
              (stApplicability !== 'required' || hasSt === true) &&
              (stApplicability !== 'not_required' || hasSt !== true)
          );

          return structurallyCompatible
            ? { ...option, disabled: false, reviewOnly: true }
            : option;
        });
        const suggestedCfop = isOwnProduction
          ? ''
          : effectiveRecipientIeIndicator === '9'
            ? '6108'
            : '6102';
        const suggestedOption = options.find(
          (option) => option.value === suggestedCfop && !option.disabled
        );

        return {
          ...decision,
          options,
          defaultCfop: decision.defaultCfop || (suggestedOption ? suggestedCfop : ''),
        };
      }),
    [cfopDecisions, items, operationScope.scope, fiscalModel, effectiveRecipientIeIndicator]
  );

  const interstateReviewRequired =
    operationScope.scope === 'interstate' &&
    editableCfopDecisions.some((decision, index) =>
      decision.options.some((option) => option.reviewOnly) && !cfopDecisions[index]?.defaultCfop
    );

  useEffect(() => {
    items.forEach((item, index) => {
      const decision = editableCfopDecisions[index];
      const currentCfop = item.fiscal?.cfop || '';
      const currentSelectionIsAvailable = decision?.options.some(
        (option) => option.value === currentCfop && !option.disabled
      );
      if (currentSelectionIsAvailable) return;

      const expectedCfop = decision?.defaultCfop || '';
      if (currentCfop !== expectedCfop) {
        onUpdateItemFiscal(index, { cfop: expectedCfop });
      }
    });
  }, [items, editableCfopDecisions, onUpdateItemFiscal]);

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
        className={`rounded-lg border px-3 py-2 text-xs ${matrixWarning || interstateReviewRequired ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'}`}
      >
        <span>{cfopContextMessage}</span>
        {matrixWarning && <span className="ml-1 font-semibold">{matrixWarning}</span>}
        {interstateReviewRequired && (
          <span className="ml-1 font-semibold">
            O CFOP fica editável para revisão; a emissão permanece bloqueada até aprovação da matriz fiscal interestadual.
          </span>
        )}
      </div>

      {serviceCompositionWarning && (
        <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          {serviceCompositionWarning}
        </div>
      )}

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
              fiscalComposition={serviceComposition.products[index]}
              cfopOptions={editableCfopDecisions[index]?.options}
              cfopContextMessage={
                cfopDecisions[index]?.reason
                  ? `${cfopContextMessage} ${cfopDecisions[index].reason}`
                  : cfopContextMessage
              }
              fieldError={itemFieldError}
              expandCfopByDefault={operationScope.scope === 'interstate'}
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
