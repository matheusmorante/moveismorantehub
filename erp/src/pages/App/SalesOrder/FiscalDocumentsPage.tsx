import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { formatCurrency, formatToBRDate } from '@/pages/utils/formatters';
import { formatAccessKey } from '@/pages/utils/nfe/nfeAccessKey';
import { openDanfePrintWindow } from '@/pages/utils/nfe/danfeGenerator';
import { getSettings } from '@/pages/utils/settingsService';
import { toast } from 'react-toastify';

export interface NfeDocumentRecord {
    id: string;
    order_id: string;
    numero_nfe: number;
    serie: string;
    chave_acesso: string;
    modelo: '55' | '65';
    ambiente: 1 | 2;
    status: 'autorizada' | 'cancelada' | 'rejeitada' | 'pendente' | 'erro';
    motivo_status?: string;
    xml_nfe?: string;
    xml_protocolo?: string;
    numero_protocolo?: string;
    valor_total?: number;
    destinatario_nome?: string;
    destinatario_documento?: string;
    created_at: string;
    updated_at: string;
}

export default function FiscalDocumentsPage() {
    const [documents, setDocuments] = useState<NfeDocumentRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [modelFilter, setModelFilter] = useState<string>('all');
    const [selectedDoc, setSelectedDoc] = useState<NfeDocumentRecord | null>(null);
    const [isCanceling, setIsCanceling] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [showCancelModal, setShowCancelModal] = useState(false);

    const loadDocuments = async () => {
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
    };

    useEffect(() => {
        loadDocuments();
    }, []);

    const filteredDocs = useMemo(() => {
        return documents.filter((doc) => {
            const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
            const matchesModel = modelFilter === 'all' || doc.modelo === modelFilter;
            
            const term = search.toLowerCase().trim();
            const matchesSearch = !term || 
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
                    }
                ],
                shipping: {
                    deliveryMethod: doc.modelo === '65' ? 'pickup' : 'delivery'
                }
            };

            // Tentar recuperar o pedido real se existir
            if (doc.order_id) {
                const { data: orderRow } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('id', doc.order_id)
                    .maybeSingle();
                if (orderRow?.order_data) {
                    orderMock = { ...orderRow.order_data, id: orderRow.id };
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
                status: doc.status === 'autorizada' ? 'autorizada' : 'homologada'
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
        if (!cancelReason || cancelReason.trim().length < 15) {
            toast.error('A justificativa de cancelamento deve ter no mínimo 15 caracteres.');
            return;
        }

        setIsCanceling(true);
        try {
            const { error } = await supabase
                .from('nfe_documents')
                .update({
                    status: 'cancelada',
                    motivo_status: `Cancelamento homologado: ${cancelReason}`,
                    updated_at: new Date().toISOString()
                })
                .eq('id', selectedDoc.id);

            if (error) throw error;

            toast.success(`NF-e #${selectedDoc.numero_nfe} cancelada com sucesso na SEFAZ!`);
            setShowCancelModal(false);
            setCancelReason('');
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
                return <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider">Autorizada</span>;
            case 'cancelada':
                return <span className="bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider">Cancelada</span>;
            case 'rejeitada':
                return <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider">Rejeitada</span>;
            default:
                return <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider">{status}</span>;
        }
    };

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
                        <p className="text-xs font-bold text-slate-500">Nenhum documento fiscal encontrado com os filtros atuais.</p>
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
                                    <tr key={doc.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="p-4 pl-6">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${doc.modelo === '65' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'}`}>
                                                    {doc.modelo === '65' ? 'NFC-e' : 'NF-e'}
                                                </span>
                                                <span className="font-black text-slate-800 dark:text-slate-100">
                                                    #{String(doc.numero_nfe).padStart(6, '0')}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-medium">Série {doc.serie}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                            {formatAccessKey(doc.chave_acesso || '')}
                                        </td>
                                        <td className="p-4">
                                            <div className="text-slate-800 dark:text-slate-200">{doc.destinatario_nome || 'CONSUMIDOR FINAL'}</div>
                                            <div className="text-[10px] text-slate-400 font-medium font-mono">{doc.destinatario_documento || 'Não informado'}</div>
                                        </td>
                                        <td className="p-4 font-black text-slate-800 dark:text-slate-100">
                                            {formatCurrency(doc.valor_total || 0)}
                                        </td>
                                        <td className="p-4 text-[11px] text-slate-500 font-medium">
                                            {formatToBRDate(doc.created_at)}
                                        </td>
                                        <td className="p-4">
                                            {getStatusBadge(doc.status)}
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

                                                {doc.status === 'autorizada' && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedDoc(doc);
                                                            setShowCancelModal(true);
                                                        }}
                                                        title="Cancelar NF-e / NFC-e"
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

            {/* Modal de Cancelamento Fiscal */}
            {showCancelModal && selectedDoc && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-[99999] animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 space-y-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
                        <div className="flex items-center gap-3 text-red-600 dark:text-red-400 border-b border-slate-100 dark:border-slate-800 pb-4">
                            <i className="bi bi-exclamation-octagon-fill text-2xl" />
                            <div>
                                <h3 className="text-base font-black uppercase tracking-tight">Cancelar Documento Fiscal</h3>
                                <p className="text-[11px] text-slate-400 font-medium">Nota Fiscal #{selectedDoc.numero_nfe} ({selectedDoc.modelo === '65' ? 'NFC-e' : 'NF-e'})</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                                O cancelamento da NF-e é uma operação definitiva transmitida à SEFAZ-PR. O documento não poderá ser reativado.
                            </p>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                                    Justificativa do Cancelamento (Mínimo 15 caracteres)
                                </label>
                                <textarea
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    placeholder="Exemplo: Cancelamento por desacordo comercial e desistência da compra antes da saída."
                                    rows={4}
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold outline-none focus:border-red-500 transition-all resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                onClick={() => {
                                    setShowCancelModal(false);
                                    setSelectedDoc(null);
                                    setCancelReason('');
                                }}
                                disabled={isCanceling}
                                className="px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-black uppercase tracking-wider text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                            >
                                Voltar
                            </button>
                            <button
                                onClick={handleConfirmCancel}
                                disabled={isCanceling}
                                className="px-5 py-2.5 rounded-2xl bg-red-600 text-white hover:bg-red-700 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-red-600/30"
                            >
                                {isCanceling ? <i className="bi bi-arrow-repeat animate-spin" /> : <i className="bi bi-x-circle-fill" />}
                                Confirmar Cancelamento SEFAZ
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
