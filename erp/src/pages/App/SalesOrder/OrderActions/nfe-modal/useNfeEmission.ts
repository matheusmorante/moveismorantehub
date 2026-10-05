import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '@/context/AuthContext';
import type Item from '@/pages/types/items.type';
import type Order from '@/pages/types/order.type';
import { prepareHmlItemCsosns } from '@/pages/utils/nfe/csosnConfigurationService';
import { hasFiscalOperationRole } from '@/pages/utils/nfe/fiscalAuthorization';
import { DEFAULT_NFE_ENVIRONMENT } from '@/pages/utils/nfe/nfeEnvironment';
import { resolveNfeSequenceSettings } from '@/pages/utils/nfe/nfeSequenceSettings';
import {
  buildFiscalItemSelectionPayload,
  emitNfeForOrder,
  findFiscalDocumentForRequest,
  getCachedFiscalNumberPreview,
  getNextNfeNumberPreview,
  type NfeEmissionResult,
  printOrderDanfe,
  clearFiscalEmissionRequest,
  abandonUntransmittedHmlAttempt,
  setFiscalEmissionReplacementSource,
  updateFiscalNumberPreviewCache,
} from '@/pages/utils/nfe/nfeService';
import { getFullProduct } from '@/pages/utils/productService';
import { getSettings } from '@/pages/utils/settingsService';
import { supabase } from '@/pages/utils/supabaseConfig';
import {
  decideFiscalRecipientRequirements,
  fiscalPresence,
  resolveOrderFiscalModel,
} from '../../../../../../../shared-utils/fiscalDocumentModel';
import {
  DEFAULT_NFCE_NUMBER,
  DEFAULT_NFE_NUMBER,
  isFiscalNumber,
} from '../../../../../../../shared-utils/fiscalNumbering.js';
import {
  type DeliveryMethod,
  type FreightContractResponsible,
  resolveDefaultTransport,
  resolveTransport,
  type TransportResponsible,
} from '../../../../../../../shared-utils/fiscalTransportModel';
import {
  isValidRecipientTaxId,
  recipientTaxIdMatchesPersonType,
} from '../../../../../../../shared-utils/recipientTaxId';
import type { NfeItemFiscal, NfeItemWithFiscal } from './NfeItemsSection';
import type { ThirdPartyTransporterForm } from './NfeTransportSection';

export interface FiscalFieldError {
  tab: 'general' | 'customer' | 'items' | 'transport' | 'payment';
  fieldId: string;
  message: string;
  itemIndex?: number;
  itemField?: 'ncm' | 'cfop' | 'cst' | 'origem';
}

// In-memory emission drafts survive modal unmounts; no product/order mutation or persistent PII.
const emissionContexts = new Map<string, { finalConsumer: boolean }>();
const fiscalDrafts = new Map<string, Record<number, Partial<NfeItemFiscal>>>();
export const clearFiscalEmissionDrafts = () => {
  emissionContexts.clear();
  fiscalDrafts.clear();
};
const draftKey = (order: Order, environment: number) =>
  JSON.stringify([
    String(order.id),
    environment,
    (order as unknown as { version?: number }).version,
    (order.items || [])
      .filter((item) => item.itemType !== 'service')
      .map((item) => [
        item.orderItemId,
        item.productId,
        item.variationId,
        item.quantity,
        item.unitPrice,
      ]),
  ]);

export function useNfeEmission(order: Order | null, onSuccess?: () => void) {
  const { profile } = useAuth();
  const canOperateFiscal = hasFiscalOperationRole(profile);
  const [environment, setEnvironment] = useState<1 | 2>(DEFAULT_NFE_ENVIRONMENT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emissionResult, setEmissionResult] = useState<NfeEmissionResult | null>(null);
  const [fiscalFieldError, setFiscalFieldError] = useState<FiscalFieldError | null>(null);
  const [nfeItems, setNfeItems] = useState<NfeItemWithFiscal[]>([]);
  const [isLoadingFiscalData, setIsLoadingFiscalData] = useState(Boolean(order?.id && order.items));
  const [fiscalPreparationError, setFiscalPreparationError] = useState<string | null>(null);
  const contextKey = order ? draftKey(order, environment) : '';
  const [finalConsumer, setFinalConsumer] = useState(
    () =>
      emissionContexts.get(contextKey)?.finalConsumer ?? order?.fiscalContext?.finalConsumer ?? true
  );
  const deliveryMethod: DeliveryMethod =
    order?.shipping?.deliveryMethod === 'pickup' ? 'pickup' : 'delivery';

  const modelDecision = order
    ? resolveOrderFiscalModel(
        { ...order, items: nfeItems.length ? nfeItems : order.items },
        { finalConsumer }
      )
    : null;
  const currentModel: '55' | '65' = modelDecision?.status === 'ready' ? modelDecision.model : '55';

  const initialTransportDefaults = resolveDefaultTransport(currentModel, deliveryMethod);
  const [transportResponsible, setTransportResponsible] = useState<TransportResponsible | 'NONE'>(
    initialTransportDefaults.transportResponsible
  );
  const [freightContractResponsible, setFreightContractResponsible] =
    useState<FreightContractResponsible>('SENDER');

  const [thirdPartyTransporter, setThirdPartyTransporter] = useState<ThirdPartyTransporterForm>(
    () => {
      const t = order?.shipping?.transporter;
      const doc = t?.cnpj || t?.cpf || '';
      return {
        personType: doc.replace(/\D/g, '').length === 11 ? 'PF' : 'PJ',
        cnpjCpf: doc,
        name: t?.name || '',
        ie: t?.ie || '',
        isIeExempt: !t?.ie,
        address: t?.address || '',
        city: t?.city || '',
        uf: t?.uf || 'PR',
      };
    }
  );

  useEffect(() => {
    const nextDefaults = resolveDefaultTransport(currentModel, deliveryMethod);
    setTransportResponsible(nextDefaults.transportResponsible);
  }, [order?.id, deliveryMethod, currentModel]);

  const resolvedTransport = resolveTransport({
    fiscalModel: currentModel,
    deliveryMethod,
    transportResponsible,
    freightContractResponsible,
  });
  useEffect(() => {
    const saved = emissionContexts.get(contextKey);
    setFinalConsumer(saved?.finalConsumer ?? order?.fiscalContext?.finalConsumer ?? true);
  }, [contextKey, order?.fiscalContext?.finalConsumer]);
  const [numberPreviewState, setNumberPreviewState] = useState<{
    number: string;
    model: '55' | '65';
    series: string;
    environment: 1 | 2;
  } | null>(() => {
    const model = currentModel;
    try {
      const sequence = resolveNfeSequenceSettings(getSettings(), model, DEFAULT_NFE_ENVIRONMENT);
      const cached = getCachedFiscalNumberPreview(model, DEFAULT_NFE_ENVIRONMENT, sequence.series);
      if (cached !== null)
        return {
          number: String(cached),
          model,
          series: sequence.series,
          environment: DEFAULT_NFE_ENVIRONMENT,
        };
    } catch (err) {
      console.warn('[useNfeEmission] Falha ao recuperar prévia em cache da sequência fiscal:', err);
      return null;
    }
    return null;
  });
  const [nfeNumberSequenceSettings, setNfeNumberSequenceSettings] = useState<{
    model: '55' | '65';
    series: string | null;
    environment: 1 | 2;
  }>(() => {
    const model = currentModel;
    try {
      return {
        model,
        series: resolveNfeSequenceSettings(getSettings(), model, DEFAULT_NFE_ENVIRONMENT).series,
        environment: DEFAULT_NFE_ENVIRONMENT,
      };
    } catch (err) {
      console.warn(
        '[useNfeEmission] Falha ao resolver configuração de série da sequência fiscal:',
        err
      );
      return { model, series: null, environment: DEFAULT_NFE_ENVIRONMENT };
    }
  });
  const [isResolvingNfeNumber, setIsResolvingNfeNumber] = useState(Boolean(order?.id));
  const [nfeNumberLookupError, setNfeNumberLookupError] = useState<string | null>(null);
  const orderId = order?.id;

  const sequenceScopeMatches =
    nfeNumberSequenceSettings.model === currentModel &&
    nfeNumberSequenceSettings.environment === environment;
  const nfeNumberSequence = sequenceScopeMatches
    ? nfeNumberSequenceSettings
    : { model: currentModel, series: null, environment };
  const autoPreview =
    sequenceScopeMatches &&
    nfeNumberSequence.series &&
    numberPreviewState?.model === currentModel &&
    numberPreviewState.environment === environment &&
    numberPreviewState.series === nfeNumberSequence.series
      ? numberPreviewState.number
      : '';
  const [manualNumberInput, setManualNumberInput] = useState<string | null>(null);
  const numberPreview = manualNumberInput !== null ? manualNumberInput : autoPreview;

  const isLoadingNfeNumber =
    Boolean(orderId) &&
    (!sequenceScopeMatches ||
      isResolvingNfeNumber ||
      (!numberPreviewState && !nfeNumberLookupError));
  const nfeNumberError = sequenceScopeMatches ? nfeNumberLookupError : null;
  useEffect(() => {
    if (!orderId) return;
    let active = true;
    const model = currentModel;
    setNfeNumberLookupError(null);
    let sequence: ReturnType<typeof resolveNfeSequenceSettings>;
    try {
      sequence = resolveNfeSequenceSettings(getSettings(), model, environment);
    } catch (error) {
      setNfeNumberSequenceSettings({ model, series: null, environment });
      setNfeNumberLookupError(
        error instanceof Error ? error.message : 'A sequência fiscal está inválida.'
      );
      setIsResolvingNfeNumber(false);
      return () => {
        active = false;
      };
    }
    setNfeNumberSequenceSettings({ model, series: sequence.series, environment });

    const cached = getCachedFiscalNumberPreview(model, environment, sequence.series);
    if (cached !== null) {
      setNumberPreviewState({
        number: String(cached),
        model,
        series: sequence.series,
        environment,
      });
      setIsResolvingNfeNumber(false);
    } else {
      setNumberPreviewState(null);
      setIsResolvingNfeNumber(true);
    }

    getNextNfeNumberPreview(model, environment, sequence.series, sequence.minimumNumber)
      .then((number) => {
        if (active)
          setNumberPreviewState({
            number: String(number),
            model,
            series: sequence.series,
            environment,
          });
      })
      .catch((error) => {
        if (active) {
          console.error('Falha ao consultar sequência NF-e:', error);
          setNfeNumberLookupError('Não foi possível consultar o próximo número fiscal.');
        }
      })
      .finally(() => {
        if (active) setIsResolvingNfeNumber(false);
      });
    return () => {
      active = false;
    };
  }, [orderId, currentModel, environment]);
  const [recipientTaxIdError, setRecipientTaxIdError] = useState<string | null>(null);
  const [recipientTaxId, setRecipientTaxId] = useState(
    order?.customerData?.cpfCnpj || order?.customerData?.document || ''
  );
  const handleRecipientTaxIdChange = useCallback(
    (value: string) => {
      setRecipientTaxId(value);
      if (value.trim() === '' && currentModel === '65') {
        setRecipientTaxIdError(null);
      } else if (
        isValidRecipientTaxId(value) &&
        recipientTaxIdMatchesPersonType(value, order?.customerData?.personType)
      ) {
        setRecipientTaxIdError(null);
      }
    },
    [currentModel, order?.customerData?.personType]
  );
  const submissionInProgress = useRef(false);
  const manualFiscalFields = useRef(fiscalDrafts);

  // Carregar e enriquecer os itens da venda com dados fiscais e detecção de cadastro
  useEffect(() => {
    if (!order || !order.items) {
      setNfeItems([]);
      setIsLoadingFiscalData(false);
      setFiscalPreparationError(null);
      return;
    }

    const settings = getSettings();
    const defaultFiscal = settings.fiscalDefaults || {};

    let isMounted = true;
    setIsLoadingFiscalData(true);
    setFiscalPreparationError(null);

    const productItems = order.items.filter((item) => item.itemType !== 'service');
    const fallbackItems: NfeItemWithFiscal[] = productItems.map((item) => {
      const savedFiscal = item.fiscal;
      return {
        ...item,
        isUnregistered: !item.productId,
        fiscal: {
          ncm: savedFiscal?.ncm || '',
          cest: savedFiscal?.cest || '',
          cfop: savedFiscal?.cfop || defaultFiscal.cfop || '5102',
          cst: savedFiscal?.cst || defaultFiscal.cst || '103',
          origem: savedFiscal?.origem || defaultFiscal.origem || '0',
        },
      };
    });
    setNfeItems(fallbackItems);

    const enrichItems = async () => {
      try {
        let preparedCsosns: Awaited<ReturnType<typeof prepareHmlItemCsosns>> = [];
        let preparationError: string | null = null;
        if (environment === 2) {
          try {
            preparedCsosns = await prepareHmlItemCsosns(String(order.id));
          } catch (error) {
            preparationError =
              error instanceof Error ? error.message : 'Configuração fiscal indisponível.';
          }
        }

        const catalogPromises = productItems.map(async (item) => {
          if (!item.productId) return { item, catalogFiscal: undefined };
          try {
            const fullProd = await getFullProduct(item.productId);
            const variation = item.variationId
              ? fullProd?.variations?.find((candidate) => candidate.id === item.variationId)
              : undefined;
            const catalogFiscal = {
              ncm: variation?.fiscal?.ncm || fullProd?.fiscal?.ncm,
              cest: variation?.fiscal?.cest || fullProd?.fiscal?.cest,
              cfop: variation?.fiscal?.cfop || fullProd?.fiscal?.cfop,
              cst: variation?.fiscal?.cst || fullProd?.fiscal?.cst,
              origem: variation?.fiscal?.origem || fullProd?.fiscal?.origem,
            };
            return { item, catalogFiscal };
          } catch (err) {
            console.warn(
              `[useNfeEmission] Falha ao consultar catálogo do produto ${item.productId}:`,
              err
            );
            return { item, catalogFiscal: undefined };
          }
        });
        const catalogResults = await Promise.all(catalogPromises);

        const enrichedList: NfeItemWithFiscal[] = [];
        for (const [index, { item, catalogFiscal }] of catalogResults.entries()) {
          const preparedCsosn = preparedCsosns.find((entry) => entry.itemNumber === index + 1);
          if (environment === 2 && !preparedCsosn && !preparationError)
            preparationError = `CSOSN do item ${index + 1} não foi preparado no servidor.`;
          const savedFiscal = item.fiscal;
          enrichedList.push({
            ...fallbackItems[index],
            fiscal: {
              ncm: catalogFiscal?.ncm || savedFiscal?.ncm || fallbackItems[index].fiscal.ncm,
              cest: savedFiscal?.cest || catalogFiscal?.cest || fallbackItems[index].fiscal.cest,
              cfop: savedFiscal?.cfop || catalogFiscal?.cfop || fallbackItems[index].fiscal.cfop,
              cst: preparedCsosn?.csosn || savedFiscal?.cst || catalogFiscal?.cst || '103',
              csosnSource: preparedCsosn?.source,
              origem:
                savedFiscal?.origem || catalogFiscal?.origem || fallbackItems[index].fiscal.origem,
            },
          });
          const manual = manualFiscalFields.current.get(draftKey(order, environment))?.[index];
          if (manual !== undefined) {
            enrichedList[index].fiscal = {
              ...enrichedList[index].fiscal,
              ...manual,
              ...(manual.cst !== undefined ? { csosnSource: 'manual' } : {}),
            };
          }
        }

        if (isMounted) {
          setNfeItems(enrichedList);
          setFiscalPreparationError(preparationError);
          setIsLoadingFiscalData(false);
          if (preparationError) toast.error(preparationError);
        }
      } catch (error) {
        if (isMounted) {
          setNfeItems(fallbackItems);
          const message =
            error instanceof Error
              ? error.message
              : 'Falha ao preparar os dados fiscais dos itens.';
          setFiscalPreparationError(message);
          setIsLoadingFiscalData(false);
          toast.error(message);
        }
      }
    };

    enrichItems();

    return () => {
      isMounted = false;
    };
  }, [order, environment]);

  const handleUpdateItemFiscal = (index: number, updates: Partial<NfeItemFiscal>) => {
    if (order) {
      const key = draftKey(order, environment);
      const existing = manualFiscalFields.current.get(key) || {};
      manualFiscalFields.current.set(key, {
        ...existing,
        [index]: { ...existing[index], ...updates },
      });
    }
    setNfeItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        return {
          ...item,
          fiscal: {
            ...item.fiscal,
            ...updates,
            ...(updates.cst !== undefined ? { csosnSource: 'manual' } : {}),
          },
        };
      })
    );
  };

  const handleBatchUpdateItems = (updated: NfeItemWithFiscal[]) => {
    const key = order ? draftKey(order, environment) : '';
    const choices = { ...manualFiscalFields.current.get(key) };
    const resolved = updated.map((item, index) => {
      const changed = item.fiscal.cst !== nfeItems[index]?.fiscal.cst;
      const changedFields = Object.fromEntries(
        (['ncm', 'cfop', 'origem', 'cest', 'cst'] as const)
          .filter((field) => item.fiscal[field] !== nfeItems[index]?.fiscal[field])
          .map((field) => [field, item.fiscal[field]])
      );
      choices[index] = { ...choices[index], ...changedFields };
      return {
        ...item,
        fiscal: { ...item.fiscal, ...(changed ? { csosnSource: 'manual' as const } : {}) },
      };
    });
    if (order) manualFiscalFields.current.set(key, choices);
    setNfeItems(resolved);
  };

  const handleSaveDraft = async () => {
    if (!order?.id) return;
    try {
      // 1. Save NCM to products table
      const productsToUpdate = nfeItems
        .filter((i) => i.productId && i.fiscal?.ncm)
        .map((i) => ({ id: i.productId, ncm: i.fiscal.ncm.replace(/\D/g, '') }));
      if (productsToUpdate.length > 0) {
        for (const p of productsToUpdate) {
          const { data: existingProduct } = await supabase
            .from('products')
            .select('fiscal')
            .eq('id', p.id)
            .single();
          if (existingProduct) {
            const newFiscal = { ...(existingProduct.fiscal || {}), ncm: p.ncm };
            await supabase.from('products').update({ fiscal: newFiscal }).eq('id', p.id);
          }
        }
      }

      // 2. Save order_data to orders table; a modal-only tax ID must not rewrite the customer profile.
      const updatedOrder = {
        ...order,
        customerData: {
          ...order.customerData,
          cpfCnpj: recipientTaxId,
          document: recipientTaxId,
        },
        items: order.items.map((it, idx) => ({
          ...it,
          fiscal: {
            ...(it.fiscal || {}),
            ncm: nfeItems[idx]?.fiscal?.ncm || it.fiscal?.ncm || '',
          },
        })),
      };
      await supabase.from('orders').update({ order_data: updatedOrder }).eq('id', order.id);
    } catch (err) {
      console.warn('Erro ao salvar os dados da emissão:', err);
    }
  };

  const handleEmit = async (
    productionConfirmed = false,
    isRetry = false,
    retryNumber?: number,
    freshHmlEmission = false
  ) => {
    if (submissionInProgress.current) return;
    if (!canOperateFiscal) {
      toast.error('Seu perfil não pode operar documentos fiscais.');
      return;
    }
    if (!order) return;
    const taxId = recipientTaxId;
    if (modelDecision?.status !== 'ready') {
      toast.error(modelDecision?.reason || 'Confirme os dados da operação fiscal.');
      return;
    }
    const currentPresence = fiscalPresence(
      currentModel,
      deliveryMethod,
      order.fiscalContext?.presence
    );
    const effectiveItemsTotal = (nfeItems.length ? nfeItems : order.items || [])
      .filter((it) => it.itemType !== 'service')
      .reduce((sum, it) => sum + (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0), 0);
    const effectiveFreightTotal = Number(order.shipping?.value) || 0;
    const effectiveDiscountTotal = Number(order.itemsSummary?.totalFixedDiscount) || 0;
    const effectiveInvoiceTotal =
      Number(order.paymentsSummary?.totalOrderValue) ||
      effectiveItemsTotal + effectiveFreightTotal - effectiveDiscountTotal;

    const recipientReqs = decideFiscalRecipientRequirements({
      model: currentModel,
      presence: currentPresence,
      total: effectiveInvoiceTotal,
      personType: order.customerData?.personType,
      recipientTaxId: taxId,
      operationScope: 'NORMAL_DOMESTIC_SALE',
    });
    if (!recipientReqs.supported) {
      toast.error(recipientReqs.message || 'A matriz fiscal não atende a esta operação.');
      return;
    }
    const recipientRequired = recipientReqs.documentRequired;
    const validForPerson =
      isValidRecipientTaxId(taxId) &&
      recipientTaxIdMatchesPersonType(taxId, order.customerData?.personType);

    if (recipientRequired) {
      const missingMessage = recipientReqs.message || 'Documento do destinatário obrigatório.';
      if (!validForPerson) {
        const message = taxId.trim()
          ? 'Documento inválido ou incompatível com o tipo PF/PJ do cadastro.'
          : missingMessage;
        setRecipientTaxIdError(message);
        const fieldErr: FiscalFieldError = {
          tab: 'customer',
          fieldId: 'nfe-recipient-tax-id',
          message: taxId.trim()
            ? 'Confira o documento do destinatário e o tipo PF/PJ.'
            : missingMessage,
        };
        setFiscalFieldError(fieldErr);
        toast.error(fieldErr.message);
        return;
      }
      setRecipientTaxIdError(null);
    } else {
      if (taxId.trim() && !validForPerson) {
        setRecipientTaxIdError('Documento inválido ou incompatível com o tipo PF/PJ do cadastro.');
        const fieldErr: FiscalFieldError = {
          tab: 'customer',
          fieldId: 'nfe-recipient-tax-id',
          message: 'Confira o documento informado e o tipo PF/PJ do cadastro.',
        };
        setFiscalFieldError(fieldErr);
        toast.error(fieldErr.message);
        return;
      }
      setRecipientTaxIdError(null);
    }
    if (isLoadingFiscalData || !nfeItems.length) {
      toast.error('Aguarde a preparação fiscal dos itens antes de emitir.');
      return;
    }
    if (fiscalPreparationError) {
      toast.error('A emissão está bloqueada até que a preparação fiscal seja concluída.');
      return;
    }
    if (isLoadingNfeNumber) {
      toast.error('Aguarde a consulta do próximo número fiscal.');
      return;
    }

    // Validação granular e atômica dos dados tributários de cada item
    for (let index = 0; index < nfeItems.length; index++) {
      const item = nfeItems[index];
      const itemLabel = item.description ? `"${item.description}"` : `Item #${index + 1}`;
      const ncmClean = (item.fiscal?.ncm || '').replace(/\D/g, '');

      if (!ncmClean) {
        const fieldErr: FiscalFieldError = {
          tab: 'items',
          fieldId: `nfe-item-ncm-${index}`,
          itemIndex: index,
          itemField: 'ncm',
          message: `Informe o NCM do produto ${itemLabel}.`,
        };
        setFiscalFieldError(fieldErr);
        toast.error(fieldErr.message);
        return;
      }

      if (ncmClean.length !== 8) {
        const fieldErr: FiscalFieldError = {
          tab: 'items',
          fieldId: `nfe-item-ncm-${index}`,
          itemIndex: index,
          itemField: 'ncm',
          message: `NCM do produto ${itemLabel} deve conter exatamente 8 dígitos.`,
        };
        setFiscalFieldError(fieldErr);
        toast.error(fieldErr.message);
        return;
      }

      if (!item.fiscal?.cfop?.trim()) {
        const fieldErr: FiscalFieldError = {
          tab: 'items',
          fieldId: `nfe-item-cfop-${index}`,
          itemIndex: index,
          itemField: 'cfop',
          message: `Selecione o CFOP do produto ${itemLabel}.`,
        };
        setFiscalFieldError(fieldErr);
        toast.error(fieldErr.message);
        return;
      }

      if (!item.fiscal?.cst?.trim()) {
        const fieldErr: FiscalFieldError = {
          tab: 'items',
          fieldId: `nfe-item-csosn-${index}`,
          itemIndex: index,
          itemField: 'cst',
          message: `Selecione o CSOSN do produto ${itemLabel}.`,
        };
        setFiscalFieldError(fieldErr);
        toast.error(fieldErr.message);
        return;
      }

      if (!item.fiscal?.origem?.trim()) {
        const fieldErr: FiscalFieldError = {
          tab: 'items',
          fieldId: `nfe-item-origem-${index}`,
          itemIndex: index,
          itemField: 'origem',
          message: `Selecione a Origem fiscal do produto ${itemLabel}.`,
        };
        setFiscalFieldError(fieldErr);
        toast.error(fieldErr.message);
        return;
      }
    }

    setFiscalFieldError(null);
    // de conflito é enviado, ou caso o usuário tenha editado a prévia manualmente.
    // Novas emissões não modificadas deixam a reserva para a transação do backend.
    const retryId =
      isRetry && emissionResult?.hmlConfirmedNotFound && emissionResult.documentId
        ? emissionResult.documentId
        : undefined;
    const manualNumber =
      retryId || freshHmlEmission
        ? undefined
        : (retryNumber ?? (manualNumberInput !== null ? Number(manualNumberInput) : undefined));
    if (manualNumber !== undefined && !isFiscalNumber(manualNumber)) {
      toast.error('Informe um número inteiro entre 1 e 999999999.');
      return;
    }
    const modelMinimum = currentModel === '65' ? DEFAULT_NFCE_NUMBER : DEFAULT_NFE_NUMBER;
    if (manualNumber !== undefined && manualNumber < modelMinimum) {
      toast.error(`O número desta nota deve ser igual ou superior a ${modelMinimum}.`);
      return;
    }
    emissionContexts.set(contextKey, { finalConsumer });
    submissionInProgress.current = true;
    setIsSubmitting(true);
    try {
      // Constrói pedido com os itens atualizados e dados fiscais específicos
      const orderWithFiscalItems: Order = {
        ...order,
        items: [
          ...nfeItems.map(
            (item): Item => ({
              ...item,
              fiscal: item.fiscal,
            })
          ),
          ...(order.items || []).filter((item) => item.itemType === 'service'),
        ],
      };

      const res = await emitNfeForOrder(
        orderWithFiscalItems,
        environment,
        productionConfirmed,
        retryId,
        manualNumber,
        (order.items || [])
          .filter((item) => item.itemType !== 'service')
          .map((item) => String(item.fiscal?.ncm || '')),
        recipientTaxId,
        finalConsumer,
        resolvedTransport.isEmitterTransporter,
        true,
        resolvedTransport.requiresTransporterData ? thirdPartyTransporter : undefined,
        resolvedTransport.modFrete,
        resolvedTransport.hasTransport,
        resolvedTransport.transportResponsible !== 'NONE'
          ? resolvedTransport.transportResponsible
          : undefined,
        resolvedTransport.freightContractResponsible,
        freshHmlEmission
      );
      if (!res.success) {
        setEmissionResult(res);
        if (res.numberConflict?.nextNumber) {
          if (nfeNumberSequence.series) {
            updateFiscalNumberPreviewCache(
              nfeNumberSequence.model,
              environment,
              nfeNumberSequence.series,
              res.numberConflict.nextNumber
            );
          }
          setNumberPreviewState({
            number: String(res.numberConflict.nextNumber),
            model: nfeNumberSequence.model,
            series: nfeNumberSequence.series || '',
            environment,
          });
        }
        return;
      }

      setEmissionResult(res);
      if (res.nfeNumber && nfeNumberSequence.series) {
        updateFiscalNumberPreviewCache(
          nfeNumberSequence.model,
          environment,
          nfeNumberSequence.series,
          res.nfeNumber + 1
        );
        setNumberPreviewState({
          number: String(res.nfeNumber),
          model: nfeNumberSequence.model,
          series: nfeNumberSequence.series,
          environment,
        });
      }
      toast.success(
        res.environment === 2
          ? 'Documento autorizado pela SEFAZ em homologação (sem valor fiscal).'
          : 'Documento autorizado pela SEFAZ em produção.'
      );
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error(err);
      setEmissionResult({
        success: false,
        pending: err?.pending === true,
        error: err?.message || 'Ocorreu um erro ao processar a emissão fiscal.',
        ...(typeof err?.documentId === 'string' ? { documentId: err.documentId } : {}),
        ...(typeof err?.emissionRequestId === 'string'
          ? { emissionRequestId: err.emissionRequestId }
          : {}),
        technicalDetails: {
          ...(typeof err?.code === 'string' ? { apiCode: err.code } : {}),
          ...(typeof err?.status === 'number' ? { httpStatus: err.status } : {}),
          ...(typeof err?.diagnosticStage === 'string'
            ? { diagnosticStage: err.diagnosticStage }
            : {}),
          ...(typeof err?.diagnosticId === 'string' ? { diagnosticId: err.diagnosticId } : {}),
          ...(typeof err?.transportDiagnostic?.code === 'string'
            ? { transportCode: err.transportDiagnostic.code }
            : {}),
        },
      });
    } finally {
      submissionInProgress.current = false;
      setIsSubmitting(false);
    }
  };

  const handleReconcile = async () => {
    if (!canOperateFiscal) {
      toast.error('Seu perfil não pode operar documentos fiscais.');
      return;
    }
    if (!order) return;
    if (submissionInProgress.current) return;
    if (emissionResult?.reservationRecoveryRequired) {
      await handleEmit(false, true);
      return;
    }
    if (!emissionResult?.documentId && !emissionResult?.emissionRequestId) return;
    submissionInProgress.current = true;
    setIsSubmitting(true);
    try {
      const documentId =
        emissionResult.documentId ||
        (await findFiscalDocumentForRequest(
          String(order.id),
          environment,
          emissionResult.emissionRequestId!
        ));
      setEmissionResult((prev) => (prev ? { ...prev, documentId } : null));
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.access_token) throw new Error('Faça login novamente.');
      const response = await fetch('/api/nfe/consult', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({ documentId }),
      });
      const result = await response.json();
      const confirmedNotFound =
        ['HML_CONFIRMED_NOT_FOUND', 'HML_NEW_EMISSION_REQUIRED'].includes(result.code) &&
        result.state === 'not_found' &&
        result.pending === false;
      const confirmedRejection =
        result.pending === false &&
        [
          'HML_SEFAZ_REJECTED',
          'HML_SERIES_CORRECTION_REQUIRED',
          'HML_ISSUER_IE_CORRECTION_REQUIRED',
          'NFE_NUMBER_ALREADY_USED',
        ].includes(result.code);
      if (confirmedRejection) {
        clearFiscalEmissionRequest(String(order.id), environment);
        setEmissionResult((prev) =>
          prev
            ? {
                ...prev,
                pending: false,
                hmlConfirmedNotFound: false,
                databaseReason: undefined,
                cStat: result.cStat,
                sefazMessage: result.xMotivo,
                error: result.error || result.xMotivo || 'Tentativa rejeitada pela SEFAZ.',
                technicalDetails: {
                  ...prev.technicalDetails,
                  ...(typeof result.code === 'string' ? { apiCode: result.code } : {}),
                  ...(typeof result.cStat === 'string' ? { sefazCode: result.cStat } : {}),
                  ...(typeof result.diagnosticId === 'string'
                    ? { diagnosticId: result.diagnosticId }
                    : {}),
                  httpStatus: response.status,
                },
              }
            : null
        );
        return;
      }
      if ((!response.ok && !confirmedNotFound) || (!result.success && !confirmedNotFound)) {
        setEmissionResult((previous) =>
          previous
            ? {
                ...previous,
                pending: result.pending !== false,
                hmlConfirmedNotFound: false,
                error:
                  typeof result.error === 'string'
                    ? result.error
                    : typeof result.xMotivo === 'string'
                      ? result.xMotivo
                      : 'A consulta não confirmou o estado da nota. Consulte novamente antes de emitir.',
                technicalDetails: {
                  ...previous.technicalDetails,
                  ...(typeof result.code === 'string' ? { apiCode: result.code } : {}),
                  ...(typeof result.diagnosticStage === 'string'
                    ? { diagnosticStage: result.diagnosticStage }
                    : {}),
                  ...(typeof result.diagnosticId === 'string'
                    ? { diagnosticId: result.diagnosticId }
                    : {}),
                  ...(typeof result.transportDiagnostic?.code === 'string'
                    ? { transportCode: result.transportDiagnostic.code }
                    : {}),
                  ...(typeof result.cStat === 'string' ? { sefazCode: result.cStat } : {}),
                  httpStatus: response.status,
                },
              }
            : null
        );
        return;
      }

      if (result.state === 'authorized') {
        toast.success('SEFAZ confirmou a autorização do documento! Protocolo recuperado.');
        setEmissionResult((prev) =>
          prev
            ? {
                ...prev,
                success: true,
                pending: false,
                protocolNumber: result.protocolNumber,
                protocolDate: result.protocolDate,
                error: undefined,
              }
            : null
        );
        if (onSuccess) onSuccess();
      } else if (result.state === 'not_found') {
        const needsNewEmission =
          result.code === 'HML_NEW_EMISSION_REQUIRED' && result.safeNewEmission === true;
        setEmissionResult((prev) =>
          prev
            ? {
                ...prev,
                pending: false,
                hmlConfirmedNotFound: !needsNewEmission,
                hmlNewEmissionRequired: needsNewEmission,
                error:
                  result.error || result.xMotivo || 'NF-e não consta na SEFAZ. Emita novamente.',
              }
            : null
        );
      } else {
        setEmissionResult((previous) =>
          previous
            ? {
                ...previous,
                pending: result.pending !== false,
                hmlConfirmedNotFound: false,
                error:
                  typeof result.error === 'string'
                    ? result.error
                    : 'A consulta não confirmou o estado da nota. Consulte novamente antes de emitir.',
                cStat: typeof result.cStat === 'string' ? result.cStat : previous.cStat,
                sefazMessage:
                  typeof result.xMotivo === 'string' ? result.xMotivo : previous.sefazMessage,
                technicalDetails: {
                  ...previous.technicalDetails,
                  ...(typeof result.code === 'string' ? { apiCode: result.code } : {}),
                  httpStatus: response.status,
                },
              }
            : null
        );
      }
    } catch {
      setEmissionResult((previous) =>
        previous
          ? {
              ...previous,
              pending: true,
              error: 'A consulta não foi concluída. Tente consultar a mesma tentativa novamente.',
            }
          : null
      );
    } finally {
      submissionInProgress.current = false;
      setIsSubmitting(false);
    }
  };

  const handleStartFreshHmlEmission = async () => {
    if (
      !order ||
      environment !== 2 ||
      (!emissionResult?.hmlNewEmissionRequired && !emissionResult?.hmlCanAbandonTlsFailure) ||
      submissionInProgress.current
    )
      return;

    if (emissionResult.hmlCanAbandonTlsFailure) {
      if (!emissionResult.documentId || !emissionResult.emissionRequestId) return;
      if (!canOperateFiscal) {
        setEmissionResult((previous) =>
          previous
            ? {
                ...previous,
                error: 'Seu perfil não pode iniciar uma nova tentativa fiscal.',
              }
            : null
        );
        return;
      }

      submissionInProgress.current = true;
      setIsSubmitting(true);
      let readyToEmit = false;
      try {
        const orderWithFiscalItems: Order = {
          ...order,
          items: [
            ...nfeItems.map((item): Item => ({ ...item, fiscal: item.fiscal })),
            ...(order.items || []).filter((item) => item.itemType === 'service'),
          ],
        };
        const fiscalChoices = buildFiscalItemSelectionPayload(orderWithFiscalItems);
        const result = await abandonUntransmittedHmlAttempt(
          String(order.id),
          emissionResult.documentId,
          emissionResult.emissionRequestId,
          fiscalChoices
        );
        if (!result.success) throw new Error(result.error);

        clearFiscalEmissionRequest(String(order.id), environment);
        setFiscalEmissionReplacementSource(
          String(order.id),
          environment,
          emissionResult.documentId
        );
        setManualNumberInput(null);
        setEmissionResult(null);
        readyToEmit = true;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Não foi possível iniciar a nova tentativa fiscal.';
        setEmissionResult((previous) => (previous ? { ...previous, error: message } : null));
      } finally {
        submissionInProgress.current = false;
        setIsSubmitting(false);
      }

      if (readyToEmit) await handleEmit(false, false, undefined, true);
      return;
    }

    clearFiscalEmissionRequest(String(order.id), environment);
    setManualNumberInput(null);
    setEmissionResult(null);
    await handleEmit(false, false, undefined, true);
  };

  const handleAbandonHmlTlsAttempt = async () => {
    await handleStartFreshHmlEmission();
  };

  const handlePrintDanfe = () => {
    if (!order) return;
    if (emissionResult?.danfeData) {
      import('@/pages/utils/nfe/danfeGenerator').then((m) => {
        m.openDanfePrintWindow(emissionResult.danfeData!);
      });
    } else if ((order as any).nfeData) {
      printOrderDanfe(order);
    }
  };

  return {
    finalConsumer,
    setFinalConsumer,
    modelDecision,
    canOperateFiscal,
    environment,
    setEnvironment,
    isSubmitting,
    numberPreview,
    nfeNumberSequence,
    isLoadingNfeNumber,
    nfeNumberError,
    setNumberPreview: setManualNumberInput,
    emissionResult,
    nfeItems,
    isLoadingFiscalData,
    fiscalPreparationError,
    fiscalFieldError,
    clearFiscalFieldError: () => setFiscalFieldError(null),
    handleSaveDraft,
    recipientTaxIdError,
    recipientTaxId,
    setRecipientTaxId: handleRecipientTaxIdChange,
    handleUpdateItemFiscal,
    handleBatchUpdateItems,
    handleEmit,
    handleReconcile,
    handleAbandonHmlTlsAttempt,
    handleStartFreshHmlEmission,
    handlePrintDanfe,
    transportResponsible,
    setTransportResponsible,
    freightContractResponsible,
    setFreightContractResponsible,
    thirdPartyTransporter,
    setThirdPartyTransporter,
    resolvedTransport,
    transportType:
      resolvedTransport.transportResponsible === 'OWN_COMPANY'
        ? 'OWN'
        : resolvedTransport.transportResponsible === 'THIRD_PARTY'
          ? 'THIRD_PARTY'
          : 'NONE',
    freightMode: resolvedTransport.modFrete,
    setFreightMode: () => {},
  };
}
