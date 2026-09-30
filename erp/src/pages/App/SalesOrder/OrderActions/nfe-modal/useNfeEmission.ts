import { useState, useEffect, useRef } from 'react';
import Order from '@/pages/types/order.type';
import { emitNfeForOrder, NfeEmissionResult, printOrderDanfe } from '@/pages/utils/nfe/nfeService';
import { NfeItemWithFiscal, NfeItemFiscal } from './NfeItemsSection';
import { getSettings } from '@/pages/utils/settingsService';
import { getFullProduct } from '@/pages/utils/productService';
import { toast } from 'react-toastify';
import { DEFAULT_NFE_ENVIRONMENT } from '@/pages/utils/nfe/nfeEnvironment';
import { supabase } from '@/pages/utils/supabaseConfig';
import { useAuth } from '@/context/AuthContext';
import { hasFiscalOperationRole } from '@/pages/utils/nfe/fiscalAuthorization';
import type { FiscalInfo } from '@/pages/types/product.type';
import { prepareHmlItemCsosns } from '@/pages/utils/nfe/csosnConfigurationService';

// In-memory emission drafts survive modal unmounts; no product/order mutation or persistent PII.
const fiscalDrafts = new Map<string, Record<number, Partial<NfeItemFiscal>>>();
const draftKey = (order: Order, environment: number) => JSON.stringify([
  String(order.id), environment, (order as unknown as { version?: number }).version,
  (order.items || []).filter((item) => item.itemType !== 'service').map((item) => [
    item.orderItemId, item.productId, item.variationId, item.quantity, item.unitPrice,
  ]),
]);

export function useNfeEmission(order: Order | null, onSuccess?: () => void) {
  const { profile } = useAuth();
  const canOperateFiscal = hasFiscalOperationRole(profile);
  const [environment, setEnvironment] = useState<1 | 2>(DEFAULT_NFE_ENVIRONMENT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emissionResult, setEmissionResult] = useState<NfeEmissionResult | null>(null);
  const [nfeItems, setNfeItems] = useState<NfeItemWithFiscal[]>([]);
  const [isLoadingFiscalData, setIsLoadingFiscalData] = useState(false);
  const manualFiscalFields = useRef(fiscalDrafts);

  // Carregar e enriquecer os itens da venda com dados fiscais e detecção de cadastro
  useEffect(() => {
    if (!order || !order.items) {
      setNfeItems([]);
      return;
    }

    const settings = getSettings();
    const defaultFiscal = (settings as any).fiscalDefaults || {};

    let isMounted = true;
    setIsLoadingFiscalData(true);

    const enrichItems = async () => {
      try {
        const enrichedList: NfeItemWithFiscal[] = [];
        const preparedCsosns =
          environment === 2 ? await prepareHmlItemCsosns(String(order.id)) : [];

        const productItems = order.items.filter((item) => item.itemType !== 'service');
        for (const [index, item] of productItems.entries()) {
          const preparedCsosn = preparedCsosns.find((entry) => entry.itemNumber === index + 1);
          if (environment === 2 && !preparedCsosn)
            throw new Error('CSOSN do item não foi preparado no servidor.');
          const isUnregistered = !item.productId;
          const savedFiscal = (item as any).fiscal as FiscalInfo | undefined;
          let catalogFiscal: FiscalInfo | undefined;

          // Se o produto está cadastrado no ERP mas não veio com dados fiscais no snapshot do item,
          // consulta o cadastro do produto/variação no banco para obter NCM/dados fiscais oficiais
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
            } catch {
              // ignore
            }
          }

          enrichedList.push({
            ...item,
            isUnregistered,
            fiscal: {
              ncm: savedFiscal?.ncm || catalogFiscal?.ncm || '',
              cest: savedFiscal?.cest || catalogFiscal?.cest || '',
              cfop: savedFiscal?.cfop || catalogFiscal?.cfop || defaultFiscal.cfop || '5102',
              cst: preparedCsosn?.csosn || savedFiscal?.cst || catalogFiscal?.cst || '',
              csosnSource: preparedCsosn?.source,
              origem: savedFiscal?.origem || catalogFiscal?.origem || defaultFiscal.origem || '0',
            },
          });
          const manual = manualFiscalFields.current.get(draftKey(order, environment))?.[index];
          if (manual !== undefined) {
            enrichedList[index].fiscal = { ...enrichedList[index].fiscal, ...manual,
              ...(manual.cst !== undefined ? { csosnSource: 'manual' } : {}) };
          }
        }

        if (isMounted) {
          setNfeItems(enrichedList);
          setIsLoadingFiscalData(false);
        }
      } catch (error) {
        if (isMounted) {
          setNfeItems([]);
          setIsLoadingFiscalData(false);
          toast.error(
            error instanceof Error ? error.message : 'Falha ao preparar CSOSN dos itens.'
          );
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
      manualFiscalFields.current.set(key, { ...existing, [index]: { ...existing[index], ...updates } });
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
      const changedFields = Object.fromEntries((['ncm', 'cfop', 'origem', 'cest', 'cst'] as const)
        .filter((field) => item.fiscal[field] !== nfeItems[index]?.fiscal[field])
        .map((field) => [field, item.fiscal[field]]));
      choices[index] = { ...choices[index], ...changedFields };
      return {
        ...item,
        fiscal: { ...item.fiscal, ...(changed ? { csosnSource: 'manual' as const } : {}) },
      };
    });
    if (order) manualFiscalFields.current.set(key, choices);
    setNfeItems(resolved);
  };

  const handleEmit = async (productionConfirmed = false, isRetry = false) => {
    if (!canOperateFiscal) {
      toast.error('Seu perfil não pode operar documentos fiscais.');
      return;
    }
    if (!order) return;
    if (isLoadingFiscalData || !nfeItems.length) {
      toast.error('Aguarde a preparação fiscal dos itens antes de emitir.');
      return;
    }
    if (nfeItems.some((item) => !item.fiscal.cst)) {
      toast.error('Selecione o CSOSN de todos os itens.');
      return;
    }
    setIsSubmitting(true);
    try {
      // Constrói pedido com os itens atualizados e dados fiscais específicos
      const orderWithFiscalItems: Order = {
        ...order,
        items: [
          ...nfeItems.map(
            (item) =>
              ({
                ...item,
                fiscal: item.fiscal,
              }) as any
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
        retryId
      );
      if (!res.success) {
        toast.error(res.error || 'Erro ao validar dados para emissão.');
        setEmissionResult(res);
        return;
      }

      setEmissionResult(res);
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
    canOperateFiscal,
    environment,
    setEnvironment,
    isSubmitting,
    emissionResult,
    nfeItems,
    isLoadingFiscalData,
    handleUpdateItemFiscal,
    handleBatchUpdateItems,
    handleEmit,
    handleReconcile,
    handlePrintDanfe,
  };
}
