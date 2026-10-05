import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/pages/utils/supabaseConfig';
import { formatCurrency, formatToBRDate } from '@/pages/utils/formatters';
import { formatAccessKey } from '@/pages/utils/nfe/nfeAccessKey';
import { openDanfePrintWindow } from '@/pages/utils/nfe/danfeGenerator';
import { canIssueCce, processOrderCancellationFiscalEffects } from '@/pages/utils/nfe/nfeService';
import { validateNfeCce } from '@/pages/utils/nfe/nfeCce';
import { getSettings } from '@/pages/utils/settingsService';
import { toast } from 'react-toastify';
import { mapOrderFromDatabase } from '@/pages/utils/orderMapper';
import { updateOrder } from '@/pages/utils/orderMutationService';
import { useAuth } from '@/context/AuthContext';
import { hasFiscalOperationRole } from '@/pages/utils/nfe/fiscalAuthorization';
import {
  formatCancellationTimeRemaining,
  getAuthorizedAt,
} from '@/pages/utils/nfe/nfeEventRules';
import NfeOperationDraftModal from './NfeOperationDraftModal';

const FISCAL_DOCUMENTS_PAGE_SIZE = 30;

export interface NfeDocumentRecord {
  id: string;
  order_id: string | null;
  numero_nfe: number;
  serie: string;
  chave_acesso: string;
  modelo: '55' | '65';
  ambiente: 1 | 2;
  status: 'autorizada' | 'homologada' | 'cancelada' | 'rejeitada' | 'pendente' | 'erro';
  motivo_status?: string;
  xml_nfe?: string;
  xml_protocolo?: string;
  numero_protocolo?: string;
  valor_total?: number;
  destinatario_nome?: string;
  destinatario_documento?: string;
  created_at: string;
  updated_at: string;
  document_type?: 'outbound' | 'return' | 'estorno' | string;
  fiscal_ruleset_version?: string;
  orderNumber?: number;
}

type CancellationEligibility = {
  canProceed: boolean;
  action: string;
  reason?: string | null;
  orderId?: string | null;
  orderStatus?: string | null;
  authorizedAt?: string | null;
  deadline?: string | null;
};

type ParsedFiscalDetails = {
  items: Array<{ code: string; description: string; quantity: string; unit: string; total: string; ncm: string; cfop: string }>;
  totals: Array<{ label: string; value: string }>;
  transport: string[];
  payments: Array<{ method: string; value: string }>;
};

function parseFiscalXmlDetails(xml: string): ParsedFiscalDetails | null {
  if (typeof DOMParser === 'undefined') return null;
  const parsed = new DOMParser().parseFromString(xml, 'application/xml');
  if (parsed.querySelector('parsererror')) return null;
  const descendants = (root: Element | Document, name: string) =>
    Array.from(root.getElementsByTagNameNS('*', name));
  const value = (root: Element | Document, name: string) =>
    descendants(root, name)[0]?.textContent?.trim() || '';
  const moneyLabels: Record<string, string> = {
    vProd: 'Produtos',
    vFrete: 'Frete',
    vDesc: 'Descontos',
    vBC: 'Base ICMS',
    vICMS: 'ICMS',
    vPIS: 'PIS',
    vCOFINS: 'COFINS',
    vNF: 'Total da NF-e',
  };
  const totalsNode = descendants(parsed, 'ICMSTot')[0];
  const paymentNames: Record<string, string> = {
    '01': 'Dinheiro',
    '03': 'Cartão de crédito',
    '04': 'Cartão de débito',
    '05': 'Crédito loja',
    '10': 'Vale alimentação',
    '11': 'Vale refeição',
    '12': 'Vale presente',
    '13': 'Vale combustível',
    '15': 'Boleto',
    '17': 'PIX',
    '90': 'Sem pagamento',
    '99': 'Outros',
  };
  const transportNode = descendants(parsed, 'transp')[0];
  return {
    items: descendants(parsed, 'det').map((detail) => {
      const product = descendants(detail, 'prod')[0] || detail;
      return {
        code: value(product, 'cProd'),
        description: value(product, 'xProd'),
        quantity: value(product, 'qCom'),
        unit: value(product, 'uCom'),
        total: value(product, 'vProd'),
        ncm: value(product, 'NCM'),
        cfop: value(product, 'CFOP'),
      };
    }),
    totals: totalsNode
      ? Object.entries(moneyLabels)
          .map(([tag, label]) => ({ label, value: value(totalsNode, tag) }))
          .filter((total) => total.value)
      : [],
    transport: transportNode
      ? ['modFrete', 'xNome', 'CNPJ', 'CPF', 'placa', 'UF', 'qVol', 'esp', 'pesoL', 'pesoB']
          .map((tag) => {
            const found = value(transportNode, tag);
            return found ? `${tag}: ${found}` : '';
          })
          .filter(Boolean)
      : [],
    payments: descendants(parsed, 'detPag').map((payment) => {
      const method = value(payment, 'tPag');
      return {
        method: paymentNames[method] || method || 'Pagamento',
        value: value(payment, 'vPag'),
      };
    }),
  };
}

export default function FiscalDocumentsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const targetDocumentId = searchParams.get('documentId');
  const { profile } = useAuth();
  const canOperateFiscal = hasFiscalOperationRole(profile);
  const [documents, setDocuments] = useState<NfeDocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [environmentFilter, setEnvironmentFilter] = useState<string>('all');
  const [seriesFilter, setSeriesFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [documentCount, setDocumentCount] = useState(0);
  const [orderNumbers, setOrderNumbers] = useState<Record<string, number>>({});
  const [cancellationEligibility, setCancellationEligibility] = useState<
    Record<string, CancellationEligibility>
  >({});
  const [fiscalDetails, setFiscalDetails] = useState<Record<string, any>>({});
  const [detailsLoadingId, setDetailsLoadingId] = useState<string | null>(null);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<NfeDocumentRecord | null>(null);
  const [detailsDocumentId, setDetailsDocumentId] = useState<string | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isConsulting, setIsConsulting] = useState(false);
  const [consultationFeedback, setConsultationFeedback] = useState<string | null>(null);
  const [retryingHmlDocumentId, setRetryingHmlDocumentId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [productionCancelConfirmed, setProductionCancelConfirmed] = useState(false);
  const [operationSourceDoc, setOperationSourceDoc] = useState<NfeDocumentRecord | null>(null);
  const [automaticDraftId, setAutomaticDraftId] = useState<string | null>(null);

  // Estados para CC-e (Carta de Correção Eletrônica - Exclusiva Mod. 55)
  const [showCceModal, setShowCceModal] = useState(false);
  const [cceText, setCceText] = useState('');
  const [isSubmittingCce, setIsSubmittingCce] = useState(false);
  const [isLoadingCceInfo, setIsLoadingCceInfo] = useState(false);
  const [ccePreviousCorrection, setCcePreviousCorrection] = useState('');
  const [cceNextSequence, setCceNextSequence] = useState<number | null>(1);
  const [ccePending, setCcePending] = useState(false);
  const [cceRequestId, setCceRequestId] = useState<string | null>(null);
  const [productionCceConfirmed, setProductionCceConfirmed] = useState(false);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      let orderIds: string[] = [];
      const normalizedSearch = search.trim();
      if (/^#?\d{1,12}$/.test(normalizedSearch)) {
        const orderNumber = Number(normalizedSearch.replace(/^#/, ''));
        const { data: matchingOrders } = await supabase
          .from('orders')
          .select('id')
          .eq('order_number', orderNumber)
          .limit(50);
        orderIds = (matchingOrders || []).map((order) => String(order.id));
      }

      let query = supabase
        .from('nfe_documents')
        .select(
          'id,order_id,numero_nfe,serie,chave_acesso,modelo,ambiente,status,motivo_status,numero_protocolo,valor_total,destinatario_nome,destinatario_documento,created_at,updated_at,document_type,fiscal_ruleset_version',
          { count: 'exact' }
        );
      if (targetDocumentId) query = query.eq('id', targetDocumentId);
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      if (modelFilter !== 'all') query = query.eq('modelo', modelFilter);
      if (environmentFilter !== 'all') query = query.eq('ambiente', Number(environmentFilter));
      if (seriesFilter.trim()) query = query.eq('serie', seriesFilter.trim());
      if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00-03:00`);
      if (dateTo) {
        const endExclusive = Date.parse(`${dateTo}T00:00:00-03:00`) + 24 * 60 * 60 * 1000;
        query = query.lt('created_at', new Date(endExclusive).toISOString());
      }
      if (normalizedSearch) {
        const safeSearch = normalizedSearch.replace(/[,%*()\\"]/g, ' ').trim();
        const alternatives: string[] = [];
        const numericSearch = normalizedSearch.replace(/^#/, '');
        if (/^\d{1,9}$/.test(numericSearch))
          alternatives.push(`numero_nfe.eq.${Number(numericSearch)}`);
        if (safeSearch) {
          alternatives.push(
            `chave_acesso.ilike.%${safeSearch}%`,
            `destinatario_nome.ilike.%${safeSearch}%`,
            `destinatario_documento.ilike.%${safeSearch}%`
          );
        }
        const safeOrderIds = orderIds.filter((id) =>
          /^[0-9a-f-]{36}$/i.test(id)
        );
        if (safeOrderIds.length)
          alternatives.push(`order_id.in.(${safeOrderIds.join(',')})`);
        if (alternatives.length) query = query.or(alternatives.join(','));
        else {
          setDocuments([]);
          setDocumentCount(0);
          setOrderNumbers({});
          setCancellationEligibility({});
          return;
        }
      }
      const from = pageIndex * FISCAL_DOCUMENTS_PAGE_SIZE;
      const to = from + FISCAL_DOCUMENTS_PAGE_SIZE - 1;
      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (!error && data) {
        setDocuments(data as NfeDocumentRecord[]);
        setDocumentCount(count || 0);
        const ids = [...new Set(data.map((document) => document.order_id).filter(Boolean))];
        if (!ids.length) {
          setOrderNumbers({});
        } else {
          const { data: orders } = await supabase
            .from('orders')
            .select('id,order_number')
            .in('id', ids);
          setOrderNumbers(
            Object.fromEntries(
              (orders || []).map((order) => [String(order.id), Number(order.order_number)])
            )
          );
        }
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (!sessionError && sessionData.session?.access_token && data.length) {
          const eligibilityResponse = await fetch('/api/nfe/order-cancellation-policy', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${sessionData.session.access_token}`,
            },
            body: JSON.stringify({ documentIds: data.map((document) => document.id) }),
          });
          if (eligibilityResponse.ok) {
            const eligibilityResult = await eligibilityResponse.json();
            setCancellationEligibility(eligibilityResult.documents || {});
          } else {
            setCancellationEligibility({});
          }
        } else {
          setCancellationEligibility({});
        }
      } else {
        setDocuments([]);
        setDocumentCount(0);
        setOrderNumbers({});
        setCancellationEligibility({});
      }
    } catch (err) {
      setCancellationEligibility({});
      console.error('Erro ao carregar documentos fiscais:', err);
    } finally {
      setLoading(false);
    }
  }, [
    targetDocumentId,
    search,
    statusFilter,
    modelFilter,
    environmentFilter,
    seriesFilter,
    dateFrom,
    dateTo,
    pageIndex,
  ]);

  useEffect(() => {
    if (!canOperateFiscal) {
      setLoading(false);
      return;
    }
    loadDocuments();
  }, [canOperateFiscal, loadDocuments]);

  const filteredDocs = useMemo(() => documents, [documents]);

  const handlePrintDanfe = async (doc: NfeDocumentRecord) => {
    try {
      const settings = await getSettings();
      let orderMock: any = {
        id: doc.order_id,
        orderIndex: doc.numero_nfe,
        customerData: {
          fullName: doc.destinatario_nome,
          cpfCnpj: doc.destinatario_documento,
        },
        paymentsSummary: {
          totalOrderValue: doc.valor_total || 0,
        },
        items: [
          {
            description: 'VENDA DE MERCADORIAS (CONFORME PEDIDO)',
            quantity: 1,
            unitPrice: doc.valor_total || 0,
          },
        ],
        // Logistics comes from the original order; its fiscal model does not identify it.
        shipping: {},
      };

      // Tentar recuperar o pedido real se existir
      if (doc.order_id) {
        const { data: orderRow } = await supabase
          .from('orders')
          .select('id, status, order_type, customer_name, total_amount, order_data')
          .eq('id', doc.order_id)
          .maybeSingle();
        if (orderRow) {
          orderMock = mapOrderFromDatabase(orderRow);
        }
      }

      openDanfePrintWindow({
        order: orderMock,
        settings,
        accessKey: doc.chave_acesso,
        nfeNumber: doc.numero_nfe,
        series: doc.serie || '1',
        protocolNumber: doc.numero_protocolo || `141${Date.now()}`,
        protocolDate: formatToBRDate(doc.created_at),
        model: doc.modelo,
        environment: doc.ambiente,
        status: doc.status === 'autorizada' ? 'autorizada' : 'homologada',
      });
    } catch (err: any) {
      toast.error(`Erro ao abrir DANFE: ${err.message}`);
    }
  };

  const handleDownloadXml = async (doc: NfeDocumentRecord) => {
    try {
      let xml = doc.xml_nfe;
      if (!xml) {
        const { data, error } = await supabase
          .from('nfe_documents')
          .select('xml_nfe')
          .eq('id', doc.id)
          .maybeSingle();
        if (error) throw error;
        xml = data?.xml_nfe || undefined;
      }
      if (!xml) {
        toast.warn('XML não disponível para este documento.');
        return;
      }
      const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `NFe_${doc.chave_acesso || doc.numero_nfe}.xml`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('XML baixado com sucesso!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível baixar o XML.');
    }
  };

  const handleOpenFiscalTreatment = (doc: NfeDocumentRecord) => {
    const eligibility = cancellationEligibility[doc.id];
    if (!eligibility?.canProceed) {
      toast.info(eligibility?.reason || 'A elegibilidade fiscal não pôde ser confirmada.');
      return;
    }
    setSelectedDoc(doc);
    setCancelReason('');
    setProductionCancelConfirmed(false);
    setShowCancelModal(true);
  };

  const handleToggleDetails = async (doc: NfeDocumentRecord) => {
    if (detailsDocumentId === doc.id) {
      setDetailsDocumentId(null);
      return;
    }
    setDetailsDocumentId(doc.id);
    if (fiscalDetails[doc.id] || detailsLoadingId === doc.id) return;
    setDetailsLoadingId(doc.id);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.access_token)
        throw new Error('Faça login novamente para consultar os detalhes fiscais.');
      const response = await fetch('/api/nfe/document-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({ documentId: doc.id }),
      });
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.error || 'Não foi possível carregar os detalhes fiscais.');
      setFiscalDetails((current) => ({
        ...current,
        [doc.id]: {
          ...result,
          parsedXml: parseFiscalXmlDetails(String(result.document?.xml_nfe || '')),
        },
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao consultar detalhes fiscais.');
    } finally {
      setDetailsLoadingId(null);
    }
  };

  const handleConfirmCancel = async () => {
    if (!selectedDoc) return;
    const eligibility = cancellationEligibility[selectedDoc.id];
    if (!eligibility?.canProceed || !selectedDoc.order_id) {
      toast.error(eligibility?.reason || 'Não foi possível validar o pedido vinculado.');
      return;
    }
    const isCancelEvent = eligibility.action === 'cancel';
    if (isCancelEvent && (!cancelReason || Array.from(cancelReason.trim()).length < 15 || Array.from(cancelReason.trim()).length > 255)) {
      toast.error('A justificativa deve ter entre 15 e 255 caracteres.');
      return;
    }
    if (isCancelEvent && selectedDoc.ambiente === 1 && !productionCancelConfirmed) {
      toast.error('Confirme que deseja cancelar a nota no ambiente de Produção.');
      return;
    }

    setIsCanceling(true);
    let commercialCancellationCommitted = false;
    try {
      const { data: orderRow, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', selectedDoc.order_id)
        .maybeSingle();
      if (orderError || !orderRow) throw new Error('Não foi possível carregar o pedido de origem.');
      const order = mapOrderFromDatabase(orderRow);
      const orderStatus = String(order.status || '').toLowerCase();
      if (!['cancelled', 'cancelado'].includes(orderStatus)) {
        await updateOrder(order.id!, { status: 'cancelled' }, order);
        commercialCancellationCommitted = true;
      } else {
        commercialCancellationCommitted = true;
      }

      const result = await processOrderCancellationFiscalEffects(
        selectedDoc.order_id,
        String(order.orderIndex || order.orderNumber || selectedDoc.numero_nfe),
        {
          reason: isCancelEvent ? cancelReason.trim() : undefined,
          productionConfirmed: productionCancelConfirmed,
        }
      );

      if (result.action === 'cancel') {
        const fiscalEvidence = [
          result.protocolNumber ? `protocolo ${result.protocolNumber}` : '',
          result.cStat ? `cStat ${result.cStat}` : '',
          result.protocolDate ? formatToBRDate(result.protocolDate) : '',
        ]
          .filter(Boolean)
          .join(' · ');
        if (result.reconciliationRequired) {
          toast.warning(
            `SEFAZ confirmou o cancelamento da NF-e #${selectedDoc.numero_nfe}${fiscalEvidence ? ` (${fiscalEvidence})` : ''}, mas a situação local precisa ser reconciliada. Consulte a SEFAZ antes de qualquer nova ação.`
          );
        } else {
          toast.success(
            `Cancelamento da NF-e #${selectedDoc.numero_nfe} registrado pela SEFAZ${fiscalEvidence ? ` · ${fiscalEvidence}` : ''}${result.xMotivo ? ` · ${result.xMotivo}` : ''}`
          );
        }
      } else if (result.action === 'estorno' && result.draftId) {
        setAutomaticDraftId(result.draftId);
        setOperationSourceDoc(selectedDoc);
        toast.info('A política fiscal indicou estorno. O rascunho foi aberto para revisão fiscal.');
      } else {
        toast.info('O pedido foi cancelado; não há outro efeito fiscal autorizado pendente.');
      }
      setShowCancelModal(false);
      setCancelReason('');
      setProductionCancelConfirmed(false);
      setSelectedDoc(null);
      await loadDocuments();
    } catch (err: any) {
      const prefix = commercialCancellationCommitted
        ? 'Pedido e estoque foram cancelados; o tratamento fiscal ficou pendente: '
        : 'Não foi possível concluir o cancelamento: ';
      toast.error(`${prefix}${err.message}`);
      if (commercialCancellationCommitted) {
        setShowCancelModal(false);
        setSelectedDoc(null);
        await loadDocuments();
      }
    } finally {
      setIsCanceling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badgeClass = 'inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold';
    switch (status) {
      case 'autorizada':
        return (
          <span className={`${badgeClass} border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300`}>
            Autorizada
          </span>
        );
      case 'cancelada':
        return (
          <span className={`${badgeClass} border-red-200 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300`}>
            Cancelada
          </span>
        );
      case 'rejeitada':
        return (
          <span className={`${badgeClass} border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300`}>
            Rejeitada
          </span>
        );
      default:
        return (
          <span className={`${badgeClass} border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400`}>
            {status}
          </span>
        );
    }
  };

  const handleConsultSituation = async (document: NfeDocumentRecord) => {
    if (isConsulting) return;
    setConsultationFeedback(null);
    setIsConsulting(true);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.access_token)
        throw new Error('Faça login novamente para consultar a SEFAZ.');
      const response = await fetch('/api/nfe/consult', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({ documentId: document.id }),
      });
      const result = await response.json();
      if (result.state === 'not_found' && result.pending === false) {
        const message = result.error || result.xMotivo || 'SEFAZ confirmou que a nota não consta.';
        setConsultationFeedback(message);
        toast.warn(message);
        await loadDocuments();
        return;
      }
      if (!response.ok || !result.success)
        throw new Error(result.error || result.xMotivo || 'Consulta SEFAZ inconclusiva.');
      toast.success(
        result.state === 'cancelled'
          ? 'SEFAZ confirmou o cancelamento; documento reconciliado.'
          : result.sefazConsulted === true
            ? `Consulta direta à SEFAZ confirmou a autorização${result.protocolNumber ? ` (protocolo ${result.protocolNumber})` : ''}.`
            : `Documento autorizado na SEFAZ${result.protocolNumber ? ` (protocolo ${result.protocolNumber})` : ''}.`
      );
      await loadDocuments();
      if (result.state === 'cancelled') {
        setShowCancelModal(false);
        setSelectedDoc(null);
      }
    } catch (error: any) {
      const message = error.message || 'Não foi possível consultar a situação fiscal.';
      setConsultationFeedback(message);
      toast.error(message);
    } finally {
      setIsConsulting(false);
    }
  };

  const handleRetryHmlDocument = async (document: NfeDocumentRecord) => {
    if (
      !canOperateFiscal ||
      retryingHmlDocumentId ||
      document.ambiente !== 2 ||
      !document.fiscal_ruleset_version?.startsWith('HML_') ||
      !['pendente', 'erro'].includes(document.status)
    )
      return;

    setRetryingHmlDocumentId(document.id);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.access_token)
        throw new Error('Faça login novamente para retomar a tentativa HML.');
      const response = await fetch('/api/nfe/emit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({ retryDocumentId: document.id }),
      });
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.error || result.xMotivo || 'A tentativa HML continua sem confirmação.');

      toast.success(
        `NFC-e HML nº ${result.nfeNumber || document.numero_nfe} autorizada pela SEFAZ${result.protocolNumber ? ` (protocolo ${result.protocolNumber})` : ''}.`
      );
      await loadDocuments();
    } catch (error: any) {
      toast.error(error.message || 'Não foi possível retomar a tentativa HML.');
      await loadDocuments();
    } finally {
      setRetryingHmlDocumentId(null);
    }
  };

  const loadCceHistory = async (document: NfeDocumentRecord) => {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.access_token)
      throw new Error('Faça login novamente para consultar o histórico de CC-e.');
    const response = await fetch(`/api/nfe/cce?documentId=${encodeURIComponent(document.id)}`, {
      headers: { Authorization: `Bearer ${data.session.access_token}` },
    });
    const result = await response.json();
    if (!response.ok || !result.success)
      throw new Error(result.error || 'Não foi possível consultar o histórico de CC-e.');
    setCcePreviousCorrection(String(result.previousCorrection || ''));
    setCceText(String(result.previousCorrection || ''));
    setCceNextSequence(typeof result.nextSequence === 'number' ? result.nextSequence : null);
    setCcePending(Boolean(result.pending));
    setCceRequestId(null);
  };

  const handleOpenCce = async (document: NfeDocumentRecord) => {
    setSelectedDoc(document);
    setShowCceModal(true);
    setCceText('');
    setCcePreviousCorrection('');
    setCceNextSequence(null);
    setCcePending(false);
    setCceRequestId(null);
    setProductionCceConfirmed(false);
    setIsLoadingCceInfo(true);
    try {
      await loadCceHistory(document);
    } catch (error: any) {
      toast.error(error.message || 'Não foi possível carregar o histórico de CC-e.');
    } finally {
      setIsLoadingCceInfo(false);
    }
  };

  const handleReconcileCce = async () => {
    if (!selectedDoc || isSubmittingCce) return;
    setIsSubmittingCce(true);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.access_token)
        throw new Error('Faça login novamente para consultar a tentativa.');
      const response = await fetch('/api/nfe/cce', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({ action: 'reconcile', documentId: selectedDoc.id }),
      });
      const result = await response.json();
      if (result.pending) {
        setCcePending(true);
        toast.warning(result.error || 'A SEFAZ ainda não confirmou o resultado da CC-e.');
        return;
      }
      if (!response.ok || !result.success)
        throw new Error(result.error || result.xMotivo || 'A reconciliação da CC-e falhou.');
      toast.success(
        `CC-e ${result.sequence} confirmada pela SEFAZ${result.protocolNumber ? ` (protocolo ${result.protocolNumber})` : ''}.`
      );
      await loadCceHistory(selectedDoc);
    } catch (error: any) {
      toast.error(error.message || 'Não foi possível reconciliar a CC-e.');
    } finally {
      setIsSubmittingCce(false);
    }
  };

  const handleSubmitCce = async () => {
    if (!selectedDoc || isSubmittingCce || ccePending) return;
    const correctionError = validateNfeCce(cceText);
    if (correctionError) {
      toast.error(correctionError);
      return;
    }
    if (selectedDoc.ambiente === 1 && !productionCceConfirmed) {
      toast.error('Confirme que deseja transmitir a CC-e no ambiente de Produção.');
      return;
    }

    setIsSubmittingCce(true);
    let transmissionStarted = false;
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.access_token)
        throw new Error('Faça login novamente para transmitir a CC-e.');
      const requestId = cceRequestId || window.crypto.randomUUID();
      setCceRequestId(requestId);
      transmissionStarted = true;
      const response = await fetch('/api/nfe/cce', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({
          action: 'transmit',
          documentId: selectedDoc.id,
          correction: cceText,
          requestId,
          productionConfirmed: productionCceConfirmed,
        }),
      });
      const result = await response.json();
      if (result.pending) {
        setCcePending(true);
        toast.warning(result.error || 'Resultado incerto. Consulte a SEFAZ antes de repetir.');
        return;
      }
      if (!response.ok || !result.success) {
        setCceRequestId(null);
        throw new Error(result.error || result.xMotivo || 'A SEFAZ não confirmou a CC-e.');
      }
      toast.success(
        `CC-e ${result.sequence} registrada pela SEFAZ${result.protocolNumber ? ` (protocolo ${result.protocolNumber})` : ''}.`
      );
      setShowCceModal(false);
      setCceText('');
      setCcePreviousCorrection('');
      setCceRequestId(null);
      setSelectedDoc(null);
      await loadDocuments();
    } catch (error: any) {
      if (transmissionStarted) setCcePending(true);
      toast.error(
        transmissionStarted
          ? 'Não foi possível confirmar a resposta. Consulte a tentativa antes de enviar novamente.'
          : error.message || 'Erro ao transmitir a CC-e.'
      );
    } finally {
      setIsSubmittingCce(false);
    }
  };

  const getCancellationDeadlineLabel = (doc: NfeDocumentRecord) => {
    if (!['autorizada', 'homologada'].includes(doc.status)) return null;
    const deadlineValue = cancellationEligibility[doc.id]?.deadline;
    const deadline = deadlineValue ? new Date(deadlineValue) : null;
    if (!deadline || !Number.isFinite(deadline.getTime()))
      return 'Prazo de cancelamento indisponível';
    const remainingMs = deadline.getTime() - Date.now();
    if (remainingMs < 0)
      return `Prazo normal expirado • limite ${deadline.toLocaleString('pt-BR')}`;
    return `Cancelamento até ${deadline.toLocaleString('pt-BR')} • restam ${formatCancellationTimeRemaining(remainingMs)}`;
  };

  const selectedCancellationEligibility = selectedDoc
    ? cancellationEligibility[selectedDoc.id]
    : undefined;
  const selectedTreatmentIsCancellation = selectedCancellationEligibility?.action === 'cancel';

  if (!canOperateFiscal) {
    return (
      <div className="p-8 text-center text-sm font-semibold text-slate-600 dark:text-slate-300">
        Seu perfil não pode operar documentos fiscais.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1700px] space-y-4 p-3 pb-16 md:p-5">
      {/* Cabeçalho */}
      <div className="flex flex-col justify-between gap-3 border-b border-slate-200/80 pb-3 dark:border-slate-800 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">
                Notas Fiscais de Saída
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Consulta e acompanhamento dos documentos emitidos pelos pedidos de venda.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadDocuments}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <i className="bi bi-arrow-clockwise" /> Atualizar
          </button>
        </div>
      </div>

      {consultationFeedback && (
        <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          <p className="font-bold">Resultado da consulta SEFAZ</p>
          <p className="mt-1">{consultationFeedback}</p>
        </div>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setPageIndex(0);
          setSearch(searchInput);
        }}
        className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/70"
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Buscar notas fiscais</span>
            <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="NF, chave, cliente, CPF/CNPJ ou pedido…"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-950"
            />
          </label>
          <select
            aria-label="Modelo fiscal"
            value={modelFilter}
            onChange={(event) => { setPageIndex(0); setModelFilter(event.target.value); }}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950"
          >
            <option value="all">Todos os modelos</option>
            <option value="55">NF-e 55</option>
            <option value="65">NFC-e 65</option>
          </select>
          <select
            aria-label="Status fiscal"
            value={statusFilter}
            onChange={(event) => { setPageIndex(0); setStatusFilter(event.target.value); }}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950"
          >
            <option value="all">Todos os status</option>
            <option value="pendente">Aguardando autorização</option>
            <option value="processando">Em processamento</option>
            <option value="autorizada">Autorizadas</option>
            <option value="homologada">Homologadas</option>
            <option value="cancelada">Canceladas</option>
            <option value="rejeitada">Rejeitadas</option>
            <option value="denegada">Denegadas</option>
            <option value="erro">Erro</option>
          </select>
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
          >
            Buscar
          </button>
          <button
            type="button"
            aria-expanded={showMoreFilters}
            onClick={() => setShowMoreFilters((visible) => !visible)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-800"
          >
            {showMoreFilters ? 'Menos filtros' : 'Mais filtros'}
          </button>
        </div>
        {showMoreFilters && (
          <div className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
            <label className="flex flex-col gap-1 text-[10px] font-medium text-slate-500">
              Ambiente
              <select
                aria-label="Ambiente fiscal"
                value={environmentFilter}
                onChange={(event) => { setPageIndex(0); setEnvironmentFilter(event.target.value); }}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="all">Produção + Homologação</option>
                <option value="1">Produção</option>
                <option value="2">Homologação</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[10px] font-medium text-slate-500">
              Série
              <input
                aria-label="Série fiscal"
                value={seriesFilter}
                onChange={(event) => setSeriesFilter(event.target.value.replace(/\D/g, '').slice(0, 4))}
                onBlur={() => setPageIndex(0)}
                className="w-24 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
            <label className="flex flex-col gap-1 text-[10px] font-medium text-slate-500">
              Emissão desde
              <input
                type="date"
                aria-label="Emissão desde"
                value={dateFrom}
                onChange={(event) => { setPageIndex(0); setDateFrom(event.target.value); }}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
            <label className="flex flex-col gap-1 text-[10px] font-medium text-slate-500">
              Emissão até
              <input
                type="date"
                aria-label="Emissão até"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(event) => { setPageIndex(0); setDateTo(event.target.value); }}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
          </div>
        )}
      </form>

      {/* Tabela de Documentos */}
      <div className="bg-white dark:bg-slate-900/70 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-xs font-bold animate-pulse">
            Carregando documentos fiscais...
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center text-xl">
              <i className="bi bi-file-earmark-x" />
            </div>
            <p className="text-xs font-bold text-slate-500">
              Nenhum documento fiscal encontrado com os filtros atuais.
            </p>
          </div>
        ) : (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[9px] font-bold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Documento</th>
                  <th className="px-3 py-2">Emissão</th>
                  <th className="px-3 py-2">Destinatário</th>
                  <th className="px-3 py-2">Pedido</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2">Ambiente</th>
                  <th className="px-3 py-2">Último retorno</th>
                  <th className="px-3 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px] dark:divide-slate-800/60">
                {filteredDocs.map((doc) => (
                  <React.Fragment key={doc.id}>
                    <tr className="align-middle transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                      <td className="whitespace-nowrap px-3 py-2">{getStatusBadge(doc.status)}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-semibold text-slate-800 dark:text-slate-100">
                        <span className="mr-1 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">{doc.modelo === '65' ? '65' : '55'}</span>
                        #{String(doc.numero_nfe).padStart(6, '0')} <span className="font-normal text-slate-500">S{doc.serie}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300">{formatToBRDate(doc.created_at)}</td>
                      <td className="max-w-56 px-3 py-2">
                        <div className="truncate font-medium text-slate-800 dark:text-slate-100" title={doc.destinatario_nome || ''}>{doc.destinatario_nome || 'Consumidor final'}</div>
                        <div className="text-[10px] text-slate-500">{doc.destinatario_documento || '—'}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {doc.order_id ? (
                          <button type="button" onClick={() => navigate(`/sales-order/edit/${doc.order_id}`)} className="font-semibold text-blue-700 hover:underline dark:text-blue-300" title="Abrir pedido de origem">
                            #{orderNumbers[doc.order_id] || 'Pedido'} <i className="bi bi-box-arrow-up-right ml-0.5 text-[9px]" />
                          </button>
                        ) : <span className="text-slate-400">Sem vínculo</span>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right font-semibold text-slate-800 dark:text-slate-100">{formatCurrency(doc.valor_total || 0)}</td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${doc.ambiente === 1 ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300' : 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300'}`}>
                          {doc.ambiente === 1 ? 'Produção' : 'Homologação'}
                        </span>
                      </td>
                      <td className="max-w-64 px-3 py-2 text-[10px] font-normal text-slate-500" title={doc.motivo_status || ''}>
                        <span className="block truncate">{doc.motivo_status || '—'}</span>
                        {getCancellationDeadlineLabel(doc) && <span className="block truncate text-[9px]">{getCancellationDeadlineLabel(doc)}</span>}
                        {cancellationEligibility[doc.id]?.action === 'pending' && <span className="block truncate text-[9px] font-semibold text-amber-700 dark:text-amber-300" title={cancellationEligibility[doc.id]?.reason || ''}>Cancelamento em processamento</span>}
                        {cancellationEligibility[doc.id]?.action === 'reconcile' && <span className="block truncate text-[9px] font-semibold text-amber-700 dark:text-amber-300" title={cancellationEligibility[doc.id]?.reason || ''}>Situação do cancelamento não confirmada · Consultar SEFAZ</span>}
                        {cancellationEligibility[doc.id] && !cancellationEligibility[doc.id].canProceed && !['pending', 'reconcile'].includes(cancellationEligibility[doc.id].action) && <span className="block truncate text-[9px]" title={cancellationEligibility[doc.id].reason || ''}>{cancellationEligibility[doc.id].reason || 'Cancelamento indisponível'}</span>}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <details className="relative inline-block text-left">
                          <summary className="cursor-pointer list-none rounded px-2 py-1 text-lg leading-none text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label={`Ações da NF-e ${doc.numero_nfe}`}>⋯</summary>
                          <div className="mt-1 grid min-w-48 gap-0.5 rounded-lg border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                            <button type="button" onClick={() => void handleToggleDetails(doc)} className="rounded px-2 py-1.5 text-left text-[11px] hover:bg-slate-100 dark:hover:bg-slate-800">{detailsDocumentId === doc.id ? 'Fechar detalhes' : 'Detalhes fiscais'}</button>
                            <button type="button" onClick={() => void handlePrintDanfe(doc)} className="rounded px-2 py-1.5 text-left text-[11px] hover:bg-slate-100 dark:hover:bg-slate-800">Visualizar / imprimir DANFE</button>
                            <button type="button" onClick={() => void handleDownloadXml(doc)} className="rounded px-2 py-1.5 text-left text-[11px] hover:bg-slate-100 dark:hover:bg-slate-800">Baixar XML autorizado</button>
                            {doc.status !== 'cancelada' && <button type="button" onClick={() => void handleConsultSituation(doc)} className="rounded px-2 py-1.5 text-left text-[11px] hover:bg-slate-100 dark:hover:bg-slate-800">Consultar situação na SEFAZ</button>}
                            {canIssueCce(doc).canIssue && <button type="button" onClick={() => void handleOpenCce(doc)} className="rounded px-2 py-1.5 text-left text-[11px] hover:bg-slate-100 dark:hover:bg-slate-800">Carta de Correção (CC-e)</button>}
                            {doc.order_id && doc.document_type === 'outbound' && cancellationEligibility[doc.id]?.canProceed && (
                              <button type="button" onClick={() => handleOpenFiscalTreatment(doc)} className={`rounded px-2 py-1.5 text-left text-[11px] font-semibold ${cancellationEligibility[doc.id]?.action === 'cancel' ? 'text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40' : 'text-violet-700 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-950/40'}`}>
                                {cancellationEligibility[doc.id]?.action === 'cancel' ? 'Cancelar NF-e' : 'Aplicar política fiscal (estorno)'}
                              </button>
                            )}
                            {!doc.order_id && doc.modelo === '55' && doc.document_type === 'outbound' && ['autorizada', 'homologada'].includes(doc.status) && <button type="button" onClick={() => setOperationSourceDoc(doc)} className="rounded px-2 py-1.5 text-left text-[11px] hover:bg-slate-100 dark:hover:bg-slate-800">Preparar operação fiscal vinculada</button>}
                            {canOperateFiscal && doc.ambiente === 2 && doc.fiscal_ruleset_version?.startsWith('HML_') && ['pendente', 'erro'].includes(doc.status) && <button type="button" onClick={() => void handleRetryHmlDocument(doc)} disabled={Boolean(retryingHmlDocumentId)} className="rounded px-2 py-1.5 text-left text-[11px] text-amber-700 hover:bg-amber-50 disabled:opacity-50 dark:text-amber-300 dark:hover:bg-amber-950/40">{retryingHmlDocumentId === doc.id ? 'Verificando…' : 'Verificar e retomar HML'}</button>}
                          </div>
                        </details>
                      </td>
                    </tr>
                    {detailsDocumentId === doc.id && (
                      <tr className="bg-slate-50/70 dark:bg-slate-950/30">
                        <td colSpan={9} className="px-4 py-3">
                          {detailsLoadingId === doc.id ? <p className="text-[10px] text-slate-500">Carregando XML, itens e histórico fiscal…</p> : fiscalDetails[doc.id] ? (
                            <div className="space-y-1.5 text-[10px]">
                              <details open className="rounded border border-slate-200 bg-white px-2 py-1.5 dark:border-slate-800 dark:bg-slate-900">
                                <summary className="cursor-pointer font-semibold text-slate-700 dark:text-slate-200">Resumo e origem</summary>
                                <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                  <div><span className="text-slate-500">Chave de acesso</span><div className="break-all font-mono text-slate-800 dark:text-slate-200">{formatAccessKey(doc.chave_acesso || '')}</div></div>
                                  <div><span className="text-slate-500">Protocolo de autorização</span><div className="font-mono text-slate-800 dark:text-slate-200">{doc.numero_protocolo || 'Não informado'}</div></div>
                                  <div><span className="text-slate-500">Autorização</span><div className="text-slate-800 dark:text-slate-200">{formatToBRDate(getAuthorizedAt(fiscalDetails[doc.id].document?.xml_protocolo, fiscalDetails[doc.id].document?.created_at || doc.created_at))}</div></div>
                                  <div><span className="text-slate-500">Último retorno</span><div className="text-slate-800 dark:text-slate-200">{doc.motivo_status || 'Sem observação adicional.'}</div></div>
                                </div>
                              </details>
                              <details className="rounded border border-slate-200 bg-white px-2 py-1.5 dark:border-slate-800 dark:bg-slate-900">
                                <summary className="cursor-pointer font-semibold text-slate-700 dark:text-slate-200">Itens e tributos · {fiscalDetails[doc.id].parsedXml?.items.length || 0} item(ns)</summary>
                                <div className="mt-2 overflow-x-auto">
                                  <table className="min-w-full text-left text-[10px]"><thead className="text-slate-500"><tr><th className="px-1 py-1">Item</th><th className="px-1 py-1">NCM / CFOP</th><th className="px-1 py-1 text-right">Qtd.</th><th className="px-1 py-1 text-right">Total</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{(fiscalDetails[doc.id].parsedXml?.items || []).map((item: ParsedFiscalDetails['items'][number], index: number) => <tr key={`${doc.id}-item-${index}`}><td className="px-1 py-1"><span className="font-medium text-slate-800 dark:text-slate-100">{item.description || 'Item'}</span><span className="ml-1 text-slate-500">{item.code}</span></td><td className="px-1 py-1 font-mono text-slate-600 dark:text-slate-300">{item.ncm} / {item.cfop}</td><td className="px-1 py-1 text-right text-slate-600 dark:text-slate-300">{item.quantity} {item.unit}</td><td className="px-1 py-1 text-right font-medium text-slate-800 dark:text-slate-100">{formatCurrency(Number(item.total) || 0)}</td></tr>)}</tbody></table>
                                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">{(fiscalDetails[doc.id].parsedXml?.totals || []).map((total: ParsedFiscalDetails['totals'][number]) => <span key={`${doc.id}-${total.label}`}><span className="text-slate-500">{total.label}:</span> <strong className="text-slate-700 dark:text-slate-200">{formatCurrency(Number(total.value) || 0)}</strong></span>)}</div>
                                </div>
                              </details>
                              <details className="rounded border border-slate-200 bg-white px-2 py-1.5 dark:border-slate-800 dark:bg-slate-900">
                                <summary className="cursor-pointer font-semibold text-slate-700 dark:text-slate-200">Transporte e pagamentos</summary>
                                <div className="mt-2 grid gap-2 sm:grid-cols-2"><div><span className="text-slate-500">Transporte</span><div className="text-slate-700 dark:text-slate-200">{fiscalDetails[doc.id].parsedXml?.transport.join(' · ') || 'Não informado'}</div></div><div><span className="text-slate-500">Pagamentos</span><div className="text-slate-700 dark:text-slate-200">{fiscalDetails[doc.id].parsedXml?.payments.map((payment: ParsedFiscalDetails['payments'][number]) => `${payment.method}: ${formatCurrency(Number(payment.value) || 0)}`).join(' · ') || 'Não informado'}</div></div></div>
                              </details>
                              <details className="rounded border border-slate-200 bg-white px-2 py-1.5 dark:border-slate-800 dark:bg-slate-900">
                                <summary className="cursor-pointer font-semibold text-slate-700 dark:text-slate-200">Histórico de eventos · {fiscalDetails[doc.id].events?.length || 0}</summary>
                                <div className="mt-2 space-y-1">{fiscalDetails[doc.id].events?.length ? fiscalDetails[doc.id].events.map((event: any, index: number) => <div key={`${doc.id}-event-${index}`} className="grid gap-1 border-t border-slate-100 py-1 text-slate-600 dark:border-slate-800 dark:text-slate-300 sm:grid-cols-[130px_1fr]"><span>{formatToBRDate(event.requested_at)} · {event.event_type}</span><span><strong>{event.status}</strong>{event.cstat ? ` · cStat ${event.cstat}` : ''}{event.attempt_number ? ` · tentativa ${event.attempt_number}` : ''}{event.id ? ` · evento ${String(event.id).slice(0, 8)}` : ''}{event.requested_by ? ` · usuário ${String(event.requested_by).slice(0, 8)}` : ''}{event.protocol_number ? ` · prot. ${event.protocol_number}` : ''}{event.xmotivo ? ` · ${event.xmotivo}` : ''}{event.justification ? ` · ${event.justification}` : ''}</span></div>) : <span className="text-slate-500">Nenhum evento registrado.</span>}</div>
                              </details>
                            </div>
                          ) : <p className="text-[10px] text-slate-500">Detalhes indisponíveis.</p>}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filteredDocs.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500 dark:border-slate-800">
            <span>{documentCount.toLocaleString('pt-BR')} documento(s) · Página {pageIndex + 1} de {Math.max(1, Math.ceil(documentCount / FISCAL_DOCUMENTS_PAGE_SIZE))}</span>
            <div className="flex gap-1">
              <button type="button" onClick={() => setPageIndex((page) => Math.max(0, page - 1))} disabled={pageIndex === 0} className="rounded border border-slate-200 px-2 py-1 disabled:opacity-40 dark:border-slate-700">Anterior</button>
              <button type="button" onClick={() => setPageIndex((page) => page + 1)} disabled={(pageIndex + 1) * FISCAL_DOCUMENTS_PAGE_SIZE >= documentCount} className="rounded border border-slate-200 px-2 py-1 disabled:opacity-40 dark:border-slate-700">Próxima</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Carta de Correção (CC-e) - Exclusivo Mod. 55 */}
      {showCceModal && selectedDoc && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-[99999] animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 space-y-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400 border-b border-slate-100 dark:border-slate-800 pb-4">
              <i className="bi bi-file-earmark-text-fill text-2xl" />
              <div>
                <h3 className="text-base font-black uppercase tracking-tight">
                  Carta de Correção Eletrônica (CC-e)
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  NF-e #{selectedDoc.numero_nfe} (Modelo 55)
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                <p className="font-bold">
                  A nova CC-e substitui as anteriores. Inclua neste texto todas as correções que
                  ainda devem valer.
                </p>
                <p className="mt-2">
                  Não use para alterar valores da operação, base/alíquota/imposto, quantidade,
                  emitente ou destinatário, nem as datas de emissão ou saída. A CC-e só pode
                  corrigir informação permitida para NF-e modelo 55.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  {isLoadingCceInfo
                    ? 'Consultando histórico na SEFAZ…'
                    : cceNextSequence
                      ? `Próxima sequência: ${cceNextSequence} de 20`
                      : 'Não foi possível determinar a próxima sequência.'}
                </span>
                {ccePreviousCorrection && !isLoadingCceInfo && (
                  <span className="font-semibold">
                    Texto da última CC-e carregado para revisão.
                  </span>
                )}
              </div>
              {ccePending && (
                <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-xs leading-relaxed text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200">
                  Há uma tentativa sem resultado confirmado. Consulte a SEFAZ antes de iniciar outra
                  transmissão.
                </div>
              )}

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                  Texto da Correção (15 a 1000 caracteres)
                </label>
                <textarea
                  value={cceText}
                  onChange={(e) => setCceText(e.target.value)}
                  placeholder="Descreva a correção permitida pela SEFAZ."
                  rows={5}
                  maxLength={1000}
                  disabled={isLoadingCceInfo || ccePending || isSubmittingCce}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold outline-none focus:border-amber-500 transition-all resize-y disabled:opacity-60"
                />
                <div className="mt-2 text-right text-[11px] text-slate-400">
                  {cceText.trim().length}/1000
                </div>
              </div>
              {selectedDoc.ambiente === 1 && (
                <label className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs leading-relaxed text-red-900 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
                  <input
                    type="checkbox"
                    checked={productionCceConfirmed}
                    onChange={(event) => setProductionCceConfirmed(event.target.checked)}
                    disabled={isSubmittingCce || ccePending}
                    className="mt-0.5 accent-red-600"
                  />
                  <span>Confirmo a transmissão desta CC-e no ambiente de produção.</span>
                </label>
              )}
              {cceNextSequence !== null && cceNextSequence > 20 && (
                <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                  Esta NF-e já atingiu o limite de 20 Cartas de Correção.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setShowCceModal(false);
                  setSelectedDoc(null);
                  setCceText('');
                  setCcePreviousCorrection('');
                  setCceRequestId(null);
                  setCcePending(false);
                  setProductionCceConfirmed(false);
                }}
                disabled={isSubmittingCce}
                className="px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-black uppercase tracking-wider text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
              >
                Fechar
              </button>
              {ccePending ? (
                <button
                  onClick={() => void handleReconcileCce()}
                  disabled={isSubmittingCce || isLoadingCceInfo}
                  className="px-5 py-2.5 rounded-2xl bg-sky-600 text-white hover:bg-sky-700 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingCce ? (
                    <i className="bi bi-arrow-repeat animate-spin" />
                  ) : (
                    <i className="bi bi-arrow-clockwise" />
                  )}
                  Consultar resultado na SEFAZ
                </button>
              ) : (
                <button
                  onClick={() => void handleSubmitCce()}
                  disabled={
                    isLoadingCceInfo ||
                    isSubmittingCce ||
                    !cceNextSequence ||
                    cceNextSequence > 20 ||
                    Boolean(validateNfeCce(cceText)) ||
                    (selectedDoc.ambiente === 1 && !productionCceConfirmed)
                  }
                  className="px-5 py-2.5 rounded-2xl bg-amber-600 text-white hover:bg-amber-700 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingCce ? (
                    <i className="bi bi-arrow-repeat animate-spin" />
                  ) : (
                    <i className="bi bi-send-fill" />
                  )}
                  Transmitir CC-e à SEFAZ
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cancelamento Fiscal */}
      {showCancelModal && selectedDoc && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-[99999] animate-in fade-in duration-200">
          <div className="w-full max-w-xl space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2 text-red-600 dark:border-slate-800 dark:text-red-400">
              <i className="bi bi-exclamation-octagon-fill text-lg" />
              <div>
                <h3 className="text-sm font-bold tracking-tight">
                  {selectedTreatmentIsCancellation ? 'Cancelar NF-e' : 'Aplicar tratamento fiscal'}
                </h3>
                <p className="text-[10px] text-slate-500">
                  {selectedDoc.modelo === '65' ? 'NFC-e' : 'NF-e'} #{selectedDoc.numero_nfe} · Série {selectedDoc.serie} · {selectedDoc.ambiente === 1 ? 'Produção' : 'Homologação'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-lg bg-slate-50 p-2 text-[10px] dark:bg-slate-950 sm:grid-cols-3">
              <div><span className="text-slate-500">Destinatário</span><div className="truncate font-medium text-slate-800 dark:text-slate-200">{selectedDoc.destinatario_nome || 'Consumidor final'}</div></div>
              <div><span className="text-slate-500">Valor</span><div className="font-medium text-slate-800 dark:text-slate-200">{formatCurrency(selectedDoc.valor_total || 0)}</div></div>
              <div><span className="text-slate-500">Autorização</span><div className="font-medium text-slate-800 dark:text-slate-200">{selectedCancellationEligibility?.authorizedAt ? formatToBRDate(selectedCancellationEligibility.authorizedAt) : 'Indisponível'}</div></div>
              <div><span className="text-slate-500">Chave de acesso</span><div className="break-all font-mono text-[9px] text-slate-800 dark:text-slate-200">{formatAccessKey(selectedDoc.chave_acesso || '') || 'Indisponível'}</div></div>
              <div><span className="text-slate-500">Protocolo</span><div className="truncate font-mono text-slate-800 dark:text-slate-200">{selectedDoc.numero_protocolo || '—'}</div></div>
              <div><span className="text-slate-500">Pedido</span>{selectedDoc.order_id ? <button type="button" onClick={() => navigate(`/sales-order/edit/${selectedDoc.order_id}`)} className="block font-medium text-blue-700 hover:underline dark:text-blue-300">#{orderNumbers[selectedDoc.order_id] || 'Abrir'}</button> : <div className="text-slate-500">Sem vínculo</div>}</div>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                {selectedTreatmentIsCancellation
                  ? 'O mesmo fluxo comercial do pedido será aplicado e, após o commit do pedido e do estoque, o serviço fiscal central solicitará o evento à SEFAZ. A nota só muda para cancelada após confirmação válida.'
                  : 'A política central identificou que o prazo normal de cancelamento expirou. O pedido será cancelado pelo fluxo comercial e o sistema abrirá um rascunho de estorno para revisão fiscal; nenhum evento será transmitido nesta etapa.'}
              </p>

              {selectedTreatmentIsCancellation && <div>
                <label className="mb-1 block text-[10px] font-semibold text-slate-500">
                  Justificativa do cancelamento · 15–255 caracteres
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  placeholder="Informe por que a operação não ocorreu."
                  rows={3}
                  maxLength={255}
                  className="w-full resize-y rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs outline-none focus:border-red-500 dark:border-slate-800 dark:bg-slate-950"
                />
              </div>}
              {selectedTreatmentIsCancellation && selectedDoc.ambiente === 1 && (
                <label className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2 text-[10px] text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
                  <input type="checkbox" checked={productionCancelConfirmed} onChange={(event) => setProductionCancelConfirmed(event.target.checked)} className="mt-0.5 accent-red-600" />
                  Confirmo a transmissão em Produção e o possível cancelamento definitivo do documento.
                </label>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setSelectedDoc(null);
                  setCancelReason('');
                  setProductionCancelConfirmed(false);
                }}
                disabled={isCanceling || isConsulting}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Fechar
              </button>
              <button
                onClick={() => handleConsultSituation(selectedDoc)}
                disabled={isCanceling || isConsulting}
                className="rounded-lg border border-blue-200 px-3 py-1.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/40"
              >
                {isConsulting ? 'Consultando…' : 'Consultar SEFAZ'}
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={isCanceling}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isCanceling ? (
                  <i className="bi bi-arrow-repeat animate-spin" />
                ) : (
                  <i className="bi bi-x-circle-fill" />
                )}
                {selectedTreatmentIsCancellation ? 'Confirmar e solicitar cancelamento' : 'Confirmar e preparar estorno'}
              </button>
            </div>
          </div>
        </div>
      )}

      <NfeOperationDraftModal
        sourceDocument={operationSourceDoc}
        initialDraftId={automaticDraftId}
        onClose={() => {
          setOperationSourceDoc(null);
          setAutomaticDraftId(null);
        }}
        onAuthorized={() => {
          setOperationSourceDoc(null);
          setAutomaticDraftId(null);
          void loadDocuments();
        }}
      />
    </div>
  );
}
