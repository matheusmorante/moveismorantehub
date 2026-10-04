import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '@/context/AuthContext';
import type Item from '@/pages/types/items.type';
import type Order from '@/pages/types/order.type';
import type { FiscalInfo } from '@/pages/types/product.type';
import { prepareHmlItemCsosns } from '@/pages/utils/nfe/csosnConfigurationService';
import { hasFiscalOperationRole } from '@/pages/utils/nfe/fiscalAuthorization';
import { DEFAULT_NFE_ENVIRONMENT } from '@/pages/utils/nfe/nfeEnvironment';
import { resolveNfeSequenceSettings } from '@/pages/utils/nfe/nfeSequenceSettings';
import {
  emitNfeForOrder,
  getCachedFiscalNumberPreview,
  getNextNfeNumberPreview,
  type NfeEmissionResult,
  printOrderDanfe,
  updateFiscalNumberPreviewCache,
} from '@/pages/utils/nfe/nfeService';
import { getFullProduct } from '@/pages/utils/productService';
import { getSettings } from '@/pages/utils/settingsService';
import { supabase } from '@/pages/utils/supabaseConfig';
import {
  fiscalPresence,
  fiscalRecipientRequirements,
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
import { isValidRecipientTaxId } from '../../../../../../../shared-utils/recipientTaxId';
import type { NfeItemFiscal, NfeItemWithFiscal } from './NfeItemsSection';
import type { ThirdPartyTransporterForm } from './NfeTransportSection';

// In-memory emission drafts survive modal unmounts; no product/order mutation or persistent PII.
const emissionContexts = new Map<string, { finalConsumer: boolean }>();
const fiscalDrafts = new Map<string, Record<number, Partial<NfeItemFiscal>>>();
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
  const [hasTransport, setHasTransport] = useState<boolean>(initialTransportDefaults.hasTransport);
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
    setHasTransport(nextDefaults.hasTransport);
    setTransportResponsible(nextDefaults.transportResponsible);
  }, [order?.id, deliveryMethod, currentModel]);

  const resolvedTransport = resolveTransport({
    fiscalModel: currentModel,
    deliveryMethod,
    hasTransport,
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
      } else if (isValidRecipientTaxId(value)) {
        setRecipientTaxIdError(null);
      }
    },
    [currentModel]
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
          cst: savedFiscal?.cst || '',
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

        const enrichedList: NfeItemWithFiscal[] = [];
        for (const [index, item] of productItems.entries()) {
          const preparedCsosn = preparedCsosns.find((entry) => entry.itemNumber === index + 1);
          if (environment === 2 && !preparedCsosn && !preparationError)
            preparationError = `CSOSN do item ${index + 1} não foi preparado no servidor.`;
          const savedFiscal = item.fiscal;
          let catalogFiscal: FiscalInfo | undefined;

          // Consulta o cadastro atual para preencher o NCM; o snapshot é fallback
          // e as escolhas manuais do modal continuam tendo prioridade abaixo.
          if (item.productId) {
            try {
              const fullProd = await getFullProduct(item.productId);
              const variation = item.variationId
                ? fullProd?.variations?.find((candidate) => candidate.id === item.variationId)
                : undefined;
              catalogFiscal = {
                ncm: variation?.fiscal?.ncm || fullProd?.fiscal?.ncm,
                cest: variation?.fiscal?.cest || fullProd?.fiscal?.cest,
                cfop: variation?.fiscal?.cfop || fullProd?.fiscal?.cfop,
                cst: variation?.fiscal?.cst || fullProd?.fiscal?.cst,
                origem: variation?.fiscal?.origem || fullProd?.fiscal?.origem,
              };
            } catch (err) {
              console.warn(
                `[useNfeEmission] Falha ao consultar catálogo do produto ${item.productId}:`,
                err
              );
            }
          }

          enrichedList.push({
            ...fallbackItems[index],
            fiscal: {
              ncm: catalogFiscal?.ncm || savedFiscal?.ncm || fallbackItems[index].fiscal.ncm,
              cest: savedFiscal?.cest || catalogFiscal?.cest || fallbackItems[index].fiscal.cest,
              cfop: savedFiscal?.cfop || catalogFiscal?.cfop || fallbackItems[index].fiscal.cfop,
              cst: preparedCsosn?.csosn || savedFiscal?.cst || catalogFiscal?.cst || '',
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

  const handleEmit = async (productionConfirmed = false, isRetry = false, retryNumber?: number) => {
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
      order.fiscalContext?.presence,
      Boolean(taxId.trim())
    );
    const effectiveItemsTotal = (nfeItems.length ? nfeItems : order.items || [])
      .filter((it) => it.itemType !== 'service')
      .reduce((sum, it) => sum + (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0), 0);
    const effectiveFreightTotal = Number(order.shipping?.value) || 0;
    const effectiveDiscountTotal = Number(order.itemsSummary?.totalFixedDiscount) || 0;
    const effectiveInvoiceTotal =
      Number(order.paymentsSummary?.totalOrderValue) ||
      effectiveItemsTotal + effectiveFreightTotal - effectiveDiscountTotal;

    const recipientReqs = fiscalRecipientRequirements(
      currentModel,
      currentPresence,
      effectiveInvoiceTotal
    );
    const recipientRequired = recipientReqs.documentRequired;

    if (recipientRequired) {
      const isValueLimitNfce = currentModel === '65' && effectiveInvoiceTotal >= 10000;
      const missingMessage = isValueLimitNfce
        ? 'Identificação obrigatória — NFC-e com valor igual ou superior a R$ 10.000.'
        : 'CPF ou CNPJ do destinatário é obrigatório para esta operação fiscal.';
      const invalidMessage = 'CPF ou CNPJ do destinatário inválido.';
      if (!isValidRecipientTaxId(taxId)) {
        const message = taxId.trim() ? invalidMessage : missingMessage;
        setRecipientTaxIdError(message);
        toast.error(taxId.trim() ? 'Confira o CPF/CNPJ do destinatário.' : missingMessage);
        return;
      }
      setRecipientTaxIdError(null);
    } else {
      if (taxId.trim() && !isValidRecipientTaxId(taxId)) {
        setRecipientTaxIdError('CPF ou CNPJ inválido.');
        toast.error('Confira o CPF/CNPJ informado.');
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
    if (nfeItems.some((item) => !item.fiscal.cst)) {
      toast.error('Selecione o CSOSN de todos os itens.');
      return;
    }
    // de conflito é enviado, ou caso o usuário tenha editado a prévia manualmente.
    // Novas emissões não modificadas deixam a reserva para a transação do backend.
    const manualNumber =
      retryNumber ?? (manualNumberInput !== null ? Number(manualNumberInput) : undefined);
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

      const retryId =
        isRetry && emissionResult?.error?.includes('217') && emissionResult?.documentId
          ? emissionResult.documentId
          : undefined;
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
        resolvedTransport.freightContractResponsible
      );
      if (!res.success) {
        toast.error(res.error || 'Erro ao validar dados para emissão.');
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
      toast.error(err?.message || 'Erro inesperado ao emitir nota fiscal.');
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
    if (!emissionResult?.documentId) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.access_token) throw new Error('Faça login novamente.');
      const response = await fetch('/api/nfe/consult', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({ documentId: emissionResult.documentId }),
      });
      const result = await response.json();
      if (!response.ok || (!result.success && result.state !== 'not_found'))
        throw new Error(result.error || result.xMotivo || 'Consulta SEFAZ inconclusiva.');

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
        toast.warning(
          `Rejeição 217: A SEFAZ não recebeu a tentativa anterior. Você pode emitir novamente.`
        );
        setEmissionResult((prev) =>
          prev
            ? {
                ...prev,
                pending: false,
                error: result.xMotivo || 'NF-e não consta na SEFAZ. Emita novamente.',
              }
            : null
        );
      } else {
        toast.warning(`Situação retornada: ${result.xMotivo || result.state}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Não foi possível reconciliar o documento agora.');
    } finally {
      setIsSubmitting(false);
    }
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
    recipientTaxIdError,
    recipientTaxId,
    setRecipientTaxId: handleRecipientTaxIdChange,
    handleUpdateItemFiscal,
    handleBatchUpdateItems,
    handleEmit,
    handleReconcile,
    handlePrintDanfe,
    hasTransport,
    setHasTransport,
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
    setTransportType: (type: 'OWN' | 'THIRD_PARTY' | 'NONE') => {
      if (type === 'NONE') {
        setHasTransport(false);
        setTransportResponsible('NONE');
      } else {
        setHasTransport(true);
        setTransportResponsible(type === 'OWN' ? 'OWN_COMPANY' : 'THIRD_PARTY');
      }
    },
    freightMode: resolvedTransport.modFrete,
    setFreightMode: () => {},
  };
}
