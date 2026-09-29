import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { formatCurrency, formatToBRDate } from '@/pages/utils/formatters';
import { formatAccessKey } from '@/pages/utils/nfe/nfeAccessKey';
import { openDanfePrintWindow } from '@/pages/utils/nfe/danfeGenerator';
import { canCancelFiscalDocument, canIssueCce } from '@/pages/utils/nfe/nfeService';
import { validateNfeCce } from '@/pages/utils/nfe/nfeCce';
import { getSettings } from '@/pages/utils/settingsService';
import { toast } from 'react-toastify';
import { mapOrderFromDatabase } from '@/pages/utils/orderMapper';
import { useAuth } from '@/context/AuthContext';
import { hasFiscalOperationRole } from '@/pages/utils/nfe/fiscalAuthorization';
import {
  formatCancellationTimeRemaining,
  getAuthorizedAt,
  getCancellationWindow,
} from '@/pages/utils/nfe/nfeEventRules';
import NfeOperationDraftModal from './NfeOperationDraftModal';

export interface NfeDocumentRecord {
  id: string;
  order_id: string;
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
}

export default function FiscalDocumentsPage() {
  const { profile } = useAuth();
  const canOperateFiscal = hasFiscalOperationRole(profile);
  const [documents, setDocuments] = useState<NfeDocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [selectedDoc, setSelectedDoc] = useState<NfeDocumentRecord | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isConsulting, setIsConsulting] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [productionCancelConfirmed, setProductionCancelConfirmed] = useState(false);
  const [operationSourceDoc, setOperationSourceDoc] = useState<NfeDocumentRecord | null>(null);

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
      const { data, error } = await supabase
        .from('nfe_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setDocuments(data);
      }
    } catch (err) {
      console.error('Erro ao carregar documentos fiscais:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canOperateFiscal) {
      setLoading(false);
      return;
    }
    loadDocuments();
  }, [canOperateFiscal, loadDocuments]);

  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
      const matchesModel = modelFilter === 'all' || doc.modelo === modelFilter;

      const term = search.toLowerCase().trim();
      const matchesSearch =
        !term ||
        String(doc.numero_nfe).includes(term) ||
        (doc.chave_acesso && doc.chave_acesso.toLowerCase().includes(term)) ||
        (doc.destinatario_nome && doc.destinatario_nome.toLowerCase().includes(term)) ||
        (doc.destinatario_documento && doc.destinatario_documento.includes(term));

      return matchesStatus && matchesModel && matchesSearch;
    });
  }, [documents, statusFilter, modelFilter, search]);

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
        shipping: {
          deliveryMethod: doc.modelo === '65' ? 'pickup' : 'delivery',
        },
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

  const handleDownloadXml = (doc: NfeDocumentRecord) => {
    if (!doc.xml_nfe) {
      toast.warn('XML não disponível para este documento.');
      return;
    }
    const blob = new Blob([doc.xml_nfe], { type: 'application/xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `NFe_${doc.chave_acesso || doc.numero_nfe}.xml`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('XML baixado com sucesso!');
  };

  const handleConfirmCancel = async () => {
    if (!selectedDoc) return;
    if (
      !cancelReason ||
      Array.from(cancelReason.trim()).length < 15 ||
      Array.from(cancelReason.trim()).length > 255
    ) {
      toast.error('A justificativa deve ter entre 15 e 255 caracteres.');
      return;
    }
    if (selectedDoc.ambiente === 1 && !productionCancelConfirmed) {
      toast.error('Confirme que deseja cancelar a nota no ambiente de Produção.');
      return;
    }

    setIsCanceling(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.access_token)
        throw new Error('Faça login novamente para solicitar o cancelamento.');
      const response = await fetch('/api/nfe/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          documentId: selectedDoc.id,
          reason: cancelReason,
          productionConfirmed: productionCancelConfirmed,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        if (result.pending)
          toast.warning(
            result.error ||
              'Resultado incerto. Consulte os eventos antes de qualquer nova tentativa.'
          );
        else
          throw new Error(
            result.error || result.xMotivo || 'A SEFAZ não confirmou o cancelamento.'
          );
      } else {
        toast.success(
          result.reconciliationRequired
            ? `SEFAZ confirmou o cancelamento da NF-e #${selectedDoc.numero_nfe}; reconciliação local necessária.`
            : `NF-e #${selectedDoc.numero_nfe} cancelada pela SEFAZ (protocolo ${result.protocolNumber || 'registrado'}).`
        );
      }
      setShowCancelModal(false);
      setCancelReason('');
      setProductionCancelConfirmed(false);
      setSelectedDoc(null);
      await loadDocuments();
    } catch (err: any) {
      toast.error(`Erro ao cancelar: ${err.message}`);
    } finally {
      setIsCanceling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'autorizada':
        return (
          <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider">
            Autorizada
          </span>
        );
      case 'cancelada':
        return (
          <span className="bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider">
            Cancelada
          </span>
        );
      case 'rejeitada':
        return (
          <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider">
            Rejeitada
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider">
            {status}
          </span>
        );
    }
  };

  const handleConsultSituation = async (document: NfeDocumentRecord) => {
    if (isConsulting) return;
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
      if (!response.ok || !result.success)
        throw new Error(result.error || result.xMotivo || 'Consulta SEFAZ inconclusiva.');
      toast.success(
        result.state === 'cancelled'
          ? 'SEFAZ confirmou o cancelamento; documento reconciliado.'
          : `Documento autorizado na SEFAZ${result.protocolNumber ? ` (protocolo ${result.protocolNumber})` : ''}.`
      );
      await loadDocuments();
      if (result.state === 'cancelled') {
        setShowCancelModal(false);
        setSelectedDoc(null);
      }
    } catch (error: any) {
      toast.error(error.message || 'Não foi possível consultar a situação fiscal.');
    } finally {
      setIsConsulting(false);
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
    const window = getCancellationWindow(
      String(doc.modelo),
      getAuthorizedAt(doc.xml_protocolo, doc.created_at)
    );
    if (!window.valid || !window.deadline) return 'Prazo de cancelamento indisponível';
    if (window.expired)
      return `Prazo normal expirado • limite ${window.deadline.toLocaleString('pt-BR')}`;
    return `Cancelamento até ${window.deadline.toLocaleString('pt-BR')} • restam ${formatCancellationTimeRemaining(window.remainingMs)}`;
  };

  if (!canOperateFiscal) {
    return (
      <div className="p-8 text-center text-sm font-semibold text-slate-600 dark:text-slate-300">
        Seu perfil não pode operar documentos fiscais.
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-reveal pb-32">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg">
              <i className="bi bi-file-earmark-spreadsheet-fill" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                Notas Fiscais (NF-e & NFC-e)
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                Gestão centralizada de documentos fiscais, cancelamentos, CC-e e DANFE SEFAZ-PR.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadDocuments}
            className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 transition-all flex items-center gap-2 cursor-pointer"
          >
            <i className="bi bi-arrow-clockwise" /> Atualizar
          </button>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900/70 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 w-full">
          <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por número, chave de acesso, cliente ou CPF/CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold outline-none focus:border-blue-500 transition-all"
          />
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <select
            value={modelFilter}
            onChange={(e) => setModelFilter(e.target.value)}
            className="px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold outline-none cursor-pointer"
          >
            <option value="all">Todos os Modelos</option>
            <option value="65">NFC-e (Mod. 65)</option>
            <option value="55">NF-e (Mod. 55)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold outline-none cursor-pointer"
          >
            <option value="all">Todos os Status</option>
            <option value="autorizada">Autorizadas</option>
            <option value="cancelada">Canceladas</option>
            <option value="rejeitada">Rejeitadas</option>
          </select>
        </div>
      </div>

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
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <th className="p-4 pl-6">Modelo / Número</th>
                  <th className="p-4">Chave de Acesso</th>
                  <th className="p-4">Destinatário</th>
                  <th className="p-4">Valor Total</th>
                  <th className="p-4">Emissão</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-bold">
                {filteredDocs.map((doc) => (
                  <tr
                    key={doc.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${doc.modelo === '65' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'}`}
                        >
                          {doc.modelo === '65' ? 'NFC-e' : 'NF-e'}
                        </span>
                        <span className="font-black text-slate-800 dark:text-slate-100">
                          #{String(doc.numero_nfe).padStart(6, '0')}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          Série {doc.serie}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      {formatAccessKey(doc.chave_acesso || '')}
                    </td>
                    <td className="p-4">
                      <div className="text-slate-800 dark:text-slate-200">
                        {doc.destinatario_nome || 'CONSUMIDOR FINAL'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium font-mono">
                        {doc.destinatario_documento || 'Não informado'}
                      </div>
                    </td>
                    <td className="p-4 font-black text-slate-800 dark:text-slate-100">
                      {formatCurrency(doc.valor_total || 0)}
                    </td>
                    <td className="p-4 text-[11px] text-slate-500 font-medium">
                      {formatToBRDate(doc.created_at)}
                    </td>
                    <td className="p-4">
                      {getStatusBadge(doc.status)}
                      {getCancellationDeadlineLabel(doc) && (
                        <div
                          className={`mt-1 max-w-64 text-[9px] font-semibold ${getCancellationDeadlineLabel(doc)?.startsWith('Prazo normal expirado') ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}
                        >
                          {getCancellationDeadlineLabel(doc)}
                        </div>
                      )}
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handlePrintDanfe(doc)}
                          title="Visualizar / Imprimir DANFE"
                          className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white dark:bg-blue-950/50 dark:text-blue-400 dark:hover:bg-blue-600 dark:hover:text-white transition-all cursor-pointer"
                        >
                          <i className="bi bi-printer-fill" />
                        </button>

                        <button
                          onClick={() => handleDownloadXml(doc)}
                          title="Baixar XML Autorizado"
                          className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white dark:bg-emerald-950/50 dark:text-emerald-400 dark:hover:bg-emerald-600 dark:hover:text-white transition-all cursor-pointer"
                        >
                          <i className="bi bi-filetype-xml" />
                        </button>

                        {doc.modelo === '55' &&
                          doc.document_type === 'outbound' &&
                          ['autorizada', 'homologada'].includes(doc.status) && (
                            <button
                              onClick={() => setOperationSourceDoc(doc)}
                              title="Preparar estorno ou devolução fiscal vinculada a esta NF-e"
                              aria-label={`Preparar estorno ou devolução da NF-e ${doc.numero_nfe}`}
                              className="p-2 rounded-xl bg-violet-50 text-violet-600 hover:bg-violet-600 hover:text-white dark:bg-violet-950/50 dark:text-violet-400 dark:hover:bg-violet-600 dark:hover:text-white transition-all cursor-pointer"
                            >
                              <i className="bi bi-arrow-return-left" />
                            </button>
                          )}

                        {doc.status !== 'cancelada' && (
                          <button
                            onClick={() => handleConsultSituation(doc)}
                            disabled={isConsulting}
                            title="Consultar e reconciliar situação na SEFAZ"
                            className="p-2 rounded-xl bg-sky-50 text-sky-600 hover:bg-sky-600 hover:text-white dark:bg-sky-950/50 dark:text-sky-400 dark:hover:bg-sky-600 dark:hover:text-white transition-all cursor-pointer disabled:opacity-50"
                          >
                            <i
                              className={`bi ${isConsulting ? 'bi-arrow-repeat animate-spin' : 'bi-cloud-check-fill'}`}
                            />
                          </button>
                        )}

                        {/* CC-e (Carta de Correção) - EXCLUSIVO PARA NF-e (Modelo 55) */}
                        {canIssueCce(doc).canIssue && (
                          <button
                            onClick={() => void handleOpenCce(doc)}
                            title="Emitir Carta de Correção (CC-e) - Exclusivo NF-e 55"
                            className="p-2 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white dark:bg-amber-950/50 dark:text-amber-400 dark:hover:bg-amber-600 dark:hover:text-white transition-all cursor-pointer"
                          >
                            <i className="bi bi-file-earmark-text-fill" />
                          </button>
                        )}

                        {canCancelFiscalDocument(doc).canCancel && (
                          <button
                            onClick={() => {
                              setSelectedDoc(doc);
                              setCancelReason('');
                              setProductionCancelConfirmed(false);
                              setShowCancelModal(true);
                            }}
                            title="Cancelar Documento Fiscal SEFAZ"
                            className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white dark:bg-red-950/50 dark:text-red-400 dark:hover:bg-red-600 dark:hover:text-white transition-all cursor-pointer"
                          >
                            <i className="bi bi-x-circle-fill" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                  A nova CC-e substitui as anteriores. Inclua neste texto todas as correções que ainda devem valer.
                </p>
                <p className="mt-2">
                  Não use para alterar valores da operação, base/alíquota/imposto, quantidade, emitente ou destinatário,
                  nem as datas de emissão ou saída. A CC-e só pode corrigir informação permitida para NF-e modelo 55.
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
                  <span className="font-semibold">Texto da última CC-e carregado para revisão.</span>
                )}
              </div>
              {ccePending && (
                <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-xs leading-relaxed text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200">
                  Há uma tentativa sem resultado confirmado. Consulte a SEFAZ antes de iniciar outra transmissão.
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
                <div className="mt-2 text-right text-[11px] text-slate-400">{cceText.trim().length}/1000</div>
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
                  {isSubmittingCce ? <i className="bi bi-arrow-repeat animate-spin" /> : <i className="bi bi-arrow-clockwise" />}
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
                  {isSubmittingCce ? <i className="bi bi-arrow-repeat animate-spin" /> : <i className="bi bi-send-fill" />}
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
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 space-y-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400 border-b border-slate-100 dark:border-slate-800 pb-4">
              <i className="bi bi-exclamation-octagon-fill text-2xl" />
              <div>
                <h3 className="text-base font-black uppercase tracking-tight">
                  Cancelar Documento Fiscal
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  Nota Fiscal #{selectedDoc.numero_nfe} (
                  {selectedDoc.modelo === '65' ? 'NFC-e' : 'NF-e'}) •{' '}
                  {selectedDoc.ambiente === 1 ? 'PRODUÇÃO' : 'HOMOLOGAÇÃO'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                Esta operação solicitará o cancelamento fiscal à SEFAZ-PR. A nota só será
                considerada cancelada após a confirmação do evento pela SEFAZ. Se a mercadoria já
                circulou, não cancele a nota original: registre uma devolução.
              </p>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                  Justificativa do Cancelamento (15 a 255 caracteres)
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Exemplo: Cancelamento por desacordo comercial e desistência da compra antes da saída."
                  rows={4}
                  maxLength={255}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold outline-none focus:border-red-500 transition-all resize-none"
                />
              </div>
              {selectedDoc.ambiente === 1 && (
                <label className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
                  <input
                    type="checkbox"
                    checked={productionCancelConfirmed}
                    onChange={(event) => setProductionCancelConfirmed(event.target.checked)}
                    className="mt-0.5 accent-red-600"
                  />
                  Confirmo que esta solicitação será transmitida em Produção e poderá cancelar
                  definitivamente o documento fiscal.
                </label>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setSelectedDoc(null);
                  setCancelReason('');
                  setProductionCancelConfirmed(false);
                }}
                disabled={isCanceling || isConsulting}
                className="px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-black uppercase tracking-wider text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                Voltar
              </button>
              <button
                onClick={() => handleConsultSituation(selectedDoc)}
                disabled={isCanceling || isConsulting}
                className="px-5 py-2.5 rounded-2xl border border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/40 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
              >
                {isConsulting ? 'Consultando…' : 'Consultar SEFAZ'}
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={isCanceling}
                className="px-5 py-2.5 rounded-2xl bg-red-600 text-white hover:bg-red-700 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-red-600/30"
              >
                {isCanceling ? (
                  <i className="bi bi-arrow-repeat animate-spin" />
                ) : (
                  <i className="bi bi-x-circle-fill" />
                )}
                Confirmar Cancelamento SEFAZ
              </button>
            </div>
          </div>
        </div>
      )}

      <NfeOperationDraftModal
        sourceDocument={operationSourceDoc}
        onClose={() => setOperationSourceDoc(null)}
        onAuthorized={() => {
          setOperationSourceDoc(null);
          void loadDocuments();
        }}
      />
    </div>
  );
}
