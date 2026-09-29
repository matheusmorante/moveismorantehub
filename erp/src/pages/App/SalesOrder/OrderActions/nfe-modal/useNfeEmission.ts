import { useState, useEffect } from 'react';
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

export function useNfeEmission(order: Order | null, onSuccess?: () => void) {
  const { profile } = useAuth();
  const canOperateFiscal = hasFiscalOperationRole(profile);
  const [environment, setEnvironment] = useState<1 | 2>(DEFAULT_NFE_ENVIRONMENT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emissionResult, setEmissionResult] = useState<NfeEmissionResult | null>(null);
  const [nfeItems, setNfeItems] = useState<NfeItemWithFiscal[]>([]);
  const [isLoadingFiscalData, setIsLoadingFiscalData] = useState(false);

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
      const enrichedList: NfeItemWithFiscal[] = [];

      const productItems = order.items.filter((item) => item.itemType !== 'service');
      for (const item of productItems) {
        const isUnregistered = !item.productId;
        let itemNcm = (item as any).fiscal?.ncm || '';
        let itemCest = (item as any).fiscal?.cest || '';
        let itemCfop = (item as any).fiscal?.cfop || defaultFiscal.cfop || '5102';
        const itemCst = (item as any).fiscal?.cst || defaultFiscal.cst || '102';
        const itemOrigem = (item as any).fiscal?.origem || defaultFiscal.origem || '0';

        // Se o produto está cadastrado no ERP mas não veio com dados fiscais no snapshot do item,
        // consulta o cadastro do produto/variação no banco para obter NCM/dados fiscais oficiais
        if (item.productId) {
          try {
            const fullProd = await getFullProduct(item.productId);
            const variation = item.variationId
              ? fullProd?.variations?.find((candidate) => candidate.id === item.variationId)
              : undefined;
            const catalogFiscal = variation?.fiscal || fullProd?.fiscal;
            if (!itemNcm && catalogFiscal?.ncm) {
              itemNcm = catalogFiscal.ncm;
            }
            if (!itemCest && catalogFiscal?.cest) {
              itemCest = catalogFiscal.cest;
            }
            if (!itemCfop && catalogFiscal?.cfop) {
              itemCfop = catalogFiscal.cfop;
            }
          } catch {
            // ignore
          }
        }

        enrichedList.push({
          ...item,
          isUnregistered,
          fiscal: {
            ncm: itemNcm,
            cest: itemCest,
            cfop: itemCfop,
            cst: itemCst,
            origem: itemOrigem,
          },
        });
      }

      if (isMounted) {
        setNfeItems(enrichedList);
        setIsLoadingFiscalData(false);
      }
    };

    enrichItems();

    return () => {
      isMounted = false;
    };
  }, [order]);

  const handleUpdateItemFiscal = (index: number, updates: Partial<NfeItemFiscal>) => {
    setNfeItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        return {
          ...item,
          fiscal: {
            ...item.fiscal,
            ...updates,
          },
        };
      })
    );
  };

  const handleBatchUpdateItems = (updated: NfeItemWithFiscal[]) => {
    setNfeItems(updated);
  };

  const handleEmit = async (productionConfirmed = false, isRetry = false) => {
    if (!canOperateFiscal) {
      toast.error('Seu perfil não pode operar documentos fiscais.');
      return;
    }
    if (!order) return;
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
