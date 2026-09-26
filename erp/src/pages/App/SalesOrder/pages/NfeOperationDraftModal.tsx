import { useEffect, useState } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { buildProportionalReturnTaxesXml, buildReturnProductXml, updateFiscalOperationTotalsXml } from '@/pages/utils/nfe/fiscalOperationReview';

type SourceDocument = {
    id: string; order_id: string; modelo: '55' | '65'; ambiente: 1 | 2;
    numero_nfe: number; serie: string; chave_acesso: string;
};
type ReturnOrderOption = { id: string; order_index: number | null; linked_order_id: string | null; order_data: Record<string, unknown> | null };
type DraftLine = {
    id: string; fiscal_item_number: number; originalItemNumber?: number; quantity: number; gross_value: number; discount_value: number;
    originalDescription: string; originalProductCode: string; originalQuantity: number;
    originalGrossValue: number; originalDiscountValue: number; originalProductXml: string;
    originalTaxesXml: string; suggestedCfop: string | null;
    reviewed_cfop?: string | null; reviewed_product_xml?: string | null; reviewed_taxes_xml?: string | null;
};
type ReviewedLine = { draft_line_id: string; cfop: string; product_xml: string; taxes_xml: string };
type ReviewData = {
    nature_of_operation: string; reason: string; recipient_xml: string; totals_xml: string;
    transport_xml: string; payment_xml: string; item_taxes_confirmed: boolean; totals_confirmed: boolean;
};
type DraftPayload = {
    draft: { id: string; operation_kind: 'estorno' | 'return'; status: string; environment: number; original_access_key: string;
        reason?: string | null; nature_of_operation?: string | null; review_data?: Partial<ReviewData> | null };
    lastSefazResult?: { cStat: string; xMotivo: string } | null;
    source: SourceDocument;
    lines: DraftLine[];
    reviewTemplate: Pick<ReviewData, 'recipient_xml' | 'totals_xml' | 'transport_xml' | 'payment_xml'>;
};

interface NfeOperationDraftModalProps {
    sourceDocument: SourceDocument | null;
    onClose: () => void;
    onAuthorized: () => void;
}

async function fiscalApi(path: string, method: string, body?: Record<string, unknown>) {
    const { data, error } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (error || !token) throw new Error('Faça login novamente para continuar a operação fiscal.');
    const response = await fetch(path, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const payload = await response.json();
    if (!response.ok && !payload.pending && !payload.retryAllowed) throw new Error(payload.error || 'Falha na operação fiscal.');
    return payload;
}

function xmlBlockLabel(label: string, value: string, onChange: (value: string) => void, rows = 4) {
    return (
        <label className="block space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</span>
            <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows}
                spellCheck={false} className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 font-mono text-[10px] text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200" />
        </label>
    );
}

export default function NfeOperationDraftModal({ sourceDocument, onClose, onAuthorized }: NfeOperationDraftModalProps) {
    const [kind, setKind] = useState<'return' | 'estorno'>('return');
    const [returnOrders, setReturnOrders] = useState<ReturnOrderOption[]>([]);
    const [returnOrderId, setReturnOrderId] = useState('');
    const [reason, setReason] = useState('');
    const [operationDidNotOccur, setOperationDidNotOccur] = useState(false);
    const [goodsDidNotCirculate, setGoodsDidNotCirculate] = useState(false);
    const [draftId, setDraftId] = useState('');
    const [payload, setPayload] = useState<DraftPayload | null>(null);
    const [review, setReview] = useState<ReviewData | null>(null);
    const [reviewedLines, setReviewedLines] = useState<ReviewedLine[]>([]);
    const [productionConfirmed, setProductionConfirmed] = useState(false);
    const [loadingReturns, setLoadingReturns] = useState(false);
    const [preparing, setPreparing] = useState(false);
    const [savingReview, setSavingReview] = useState(false);
    const [transmitting, setTransmitting] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [retryAllowed, setRetryAllowed] = useState(false);

    useEffect(() => {
        if (!sourceDocument) return;
        let active = true;
        const loadReturnOrders = async () => {
            setLoadingReturns(true);
            const { data, error: queryError } = await supabase.from('orders')
                .select('id,order_index,linked_order_id,order_data,status,order_type')
                .eq('order_type', 'return').eq('status', 'fulfilled').order('created_at', { ascending: false }).limit(200);
            if (!active) return;
            if (queryError) setError('Não foi possível carregar devoluções atendidas para esta venda.');
            const matching = (data || []).filter((row) => {
                const orderData = (row.order_data || {}) as Record<string, unknown>;
                return String(row.linked_order_id || orderData.linkedOrderId || '') === sourceDocument.order_id;
            });
            setReturnOrders(matching as ReturnOrderOption[]);
            setLoadingReturns(false);
        };
        void loadReturnOrders();
        return () => { active = false; };
    }, [sourceDocument]);

    if (!sourceDocument) return null;

    const applyDraft = (data: DraftPayload) => {
        setPayload(data);
        setDraftId(data.draft.id);
        const nextLines = data.lines.map((line) => {
            const cfop = line.reviewed_cfop || line.suggestedCfop || (data.draft.operation_kind === 'return' ? '1202' : '');
            let productXml = line.reviewed_product_xml || line.originalProductXml;
            if (cfop && !line.reviewed_product_xml) {
                try {
                    productXml = buildReturnProductXml({ originalProductXml: line.originalProductXml,
                        quantity: Number(line.quantity), originalQuantity: Number(line.originalQuantity),
                        grossValue: Number(line.gross_value), discountValue: Number(line.discount_value), cfop });
                } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível preparar o item fiscal.'); }
            }
            let taxesXml = line.reviewed_taxes_xml || line.originalTaxesXml;
            try {
                if (!line.reviewed_taxes_xml) taxesXml = buildProportionalReturnTaxesXml(line.originalTaxesXml, Number(line.quantity), Number(line.originalQuantity));
            }
            catch (cause) { setError(cause instanceof Error ? cause.message : 'Tributos do item requerem revisão manual.'); }
            return { draft_line_id: line.id, cfop, product_xml: productXml, taxes_xml: taxesXml };
        });
        setReviewedLines(nextLines);
        let totalsXml = data.reviewTemplate.totals_xml;
        try {
            totalsXml = updateFiscalOperationTotalsXml({ originalTotalsXml: totalsXml,
                grossTotal: data.lines.reduce((sum, line) => sum + Number(line.gross_value), 0),
                discountTotal: data.lines.reduce((sum, line) => sum + Number(line.discount_value), 0) });
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'Totais fiscais precisam de revisão manual.'); }
        const savedReview = data.draft.review_data || {};
        setReview({ nature_of_operation: data.draft.nature_of_operation || savedReview.nature_of_operation ||
                (data.draft.operation_kind === 'estorno' ? 'Nota Fiscal de Estorno' : 'Devolução de mercadoria'),
            reason: savedReview.reason || data.draft.reason || reason,
            recipient_xml: savedReview.recipient_xml || data.reviewTemplate.recipient_xml,
            totals_xml: savedReview.totals_xml || totalsXml,
            transport_xml: savedReview.transport_xml || data.reviewTemplate.transport_xml,
            payment_xml: savedReview.payment_xml || data.reviewTemplate.payment_xml,
            item_taxes_confirmed: savedReview.item_taxes_confirmed === true,
            totals_confirmed: savedReview.totals_confirmed === true });
        if (data.draft.status === 'rejected') {
            const sefazMessage = data.lastSefazResult?.xMotivo || 'Revise os dados e consulte a rejeição fiscal.';
            setError(`SEFAZ rejeitou esta tentativa${data.lastSefazResult?.cStat ? ` (cStat ${data.lastSefazResult.cStat})` : ''}: ${sefazMessage}`);
            setNotice('Esta tentativa rejeitada é somente leitura; é necessário criar uma nova tentativa fiscal após corrigir os dados.');
        } else if (['transmitting', 'unknown'].includes(data.draft.status)) {
            setNotice('Há uma transmissão sem confirmação final. Consulte a SEFAZ para reconciliar; o sistema não retransmitirá automaticamente.');
        } else {
            setNotice(data.draft.status === 'authorized' ? 'Esta operação já foi autorizada pela SEFAZ.' : 'Rascunho carregado. Revise CFOP, tributos e totais antes de salvar.');
        }
    };

    const prepareDraft = async () => {
        setPreparing(true); setError(''); setNotice('');
        try {
            const created = await fiscalApi('/api/nfe/operation-drafts', 'POST', {
                kind, originalDocumentId: sourceDocument.id,
                returnOrderId: kind === 'return' ? returnOrderId : null,
                environment: sourceDocument.ambiente, reason: review?.reason || reason,
                operationDidNotOccur, goodsDidNotCirculate,
            });
            const loaded = await fiscalApi(`/api/nfe/operation-drafts?id=${encodeURIComponent(created.draftId)}`, 'GET');
            applyDraft(loaded as DraftPayload);
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível preparar o rascunho.'); }
        finally { setPreparing(false); }
    };

    const updateLineCfop = (index: number, cfop: string) => {
        const line = payload?.lines[index];
        if (!line) return;
        setReviewedLines((current) => current.map((item, itemIndex) => {
            if (itemIndex !== index) return item;
            let productXml = item.product_xml;
            if (/^\d{4}$/.test(cfop)) {
                try { productXml = buildReturnProductXml({ originalProductXml: line.originalProductXml,
                    quantity: Number(line.quantity), originalQuantity: Number(line.originalQuantity),
                    grossValue: Number(line.gross_value), discountValue: Number(line.discount_value), cfop }); }
                catch (cause) { setError(cause instanceof Error ? cause.message : 'CFOP ou dados do item inválidos.'); }
            }
            return { ...item, cfop, product_xml: productXml };
        }));
    };

    const updateReview = (key: keyof ReviewData, value: string | boolean) => {
        setReview((current) => current ? { ...current, [key]: value } : current);
    };

    const saveFiscalReview = async () => {
        if (!review || !draftId) return;
        setSavingReview(true); setError(''); setNotice('');
        try {
            const result = await fiscalApi('/api/nfe/operation-drafts', 'PUT', { draftId, reviewData: review, lines: reviewedLines });
            setPayload((current) => current ? { ...current, draft: { ...current.draft, status: result.status } } : current);
            setNotice('Revisão fiscal registrada. O XML será gerado e validado novamente no servidor antes da transmissão.');
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível salvar a revisão.'); }
        finally { setSavingReview(false); }
    };

    const transmitOrReconcile = async () => {
        if (!draftId) return;
        setTransmitting(true); setError(''); setNotice('');
        try {
            const result = await fiscalApi('/api/nfe/transmit-operation-draft', 'POST', { draftId, productionConfirmed });
            if (result.retryAllowed) {
                setRetryAllowed(true);
                setNotice(result.error || 'A consulta confirmou que a chave não está localizada.');
            } else if (result.pending) {
                setRetryAllowed(false);
                setNotice(result.error || 'Situação pendente. Consulte novamente; não retransmita.');
            } else if (result.success) {
                setNotice(result.reconciliationRequired ? result.error : `Documento autorizado pela SEFAZ. Protocolo ${result.protocolNumber}.`);
                if (!result.reconciliationRequired) onAuthorized();
            } else {
                setError(result.xMotivo || result.error || 'A SEFAZ não autorizou o documento.');
            }
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha de rede. Consulte a situação antes de tentar novamente.'); }
        finally { setTransmitting(false); }
    };

    const canPrepare = kind === 'return'
        ? Boolean(returnOrderId)
        : operationDidNotOccur && goodsDidNotCirculate && reason.trim().length >= 15;
    const isProduction = sourceDocument.ambiente === 1;

    return (
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="nfe-operation-title">
            <div className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                <header className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
                    <div>
                        <h2 id="nfe-operation-title" className="text-base font-black text-slate-900 dark:text-white">Estorno ou devolução fiscal</h2>
                        <p className="mt-1 text-xs text-slate-500">NF-e #{sourceDocument.numero_nfe} · {sourceDocument.chave_acesso} · {isProduction ? 'Produção' : 'Homologação'}</p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Fechar">
                        <i className="bi bi-x-lg" />
                    </button>
                </header>

                <main className="space-y-5 overflow-y-auto p-5">
                    {!payload && (
                        <section className="space-y-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <button type="button" onClick={() => setKind('return')} aria-pressed={kind === 'return'}
                                    className={`rounded-2xl border p-4 text-left ${kind === 'return' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-slate-200 dark:border-slate-700'}`}>
                                    <span className="block text-sm font-black">Devolução de mercadoria</span>
                                    <span className="mt-1 block text-xs text-slate-500">Mercadoria retornou fisicamente; emite NF-e de entrada após atendimento.</span>
                                </button>
                                <button type="button" onClick={() => setKind('estorno')} aria-pressed={kind === 'estorno'}
                                    className={`rounded-2xl border p-4 text-left ${kind === 'estorno' ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' : 'border-slate-200 dark:border-slate-700'}`}>
                                    <span className="block text-sm font-black">Estorno fiscal</span>
                                    <span className="mt-1 block text-xs text-slate-500">Operação não realizada e sem circulação; não movimenta estoque.</span>
                                </button>
                            </div>
                            {kind === 'return' ? (
                                <label className="block space-y-2 text-xs font-bold">
                                    <span>Devolução comercial atendida</span>
                                    <select value={returnOrderId} onChange={(event) => setReturnOrderId(event.target.value)} disabled={loadingReturns}
                                        className="w-full rounded-xl border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
                                        <option value="">{loadingReturns ? 'Carregando devoluções…' : 'Selecione uma devolução atendida'}</option>
                                        {returnOrders.map((order) => <option key={order.id} value={order.id}>Devolução #{order.order_index || order.id.slice(0, 8)}</option>)}
                                    </select>
                                    {!loadingReturns && returnOrders.length === 0 && <span className="block text-amber-700">Não há devoluções atendidas vinculadas a esta venda.</span>}
                                </label>
                            ) : (
                                <div className="space-y-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs dark:border-amber-900 dark:bg-amber-950/20">
                                    <label className="flex items-start gap-2"><input type="checkbox" checked={operationDidNotOccur} onChange={(event) => setOperationDidNotOccur(event.target.checked)} />Confirmo que a operação não ocorreu.</label>
                                    <label className="flex items-start gap-2"><input type="checkbox" checked={goodsDidNotCirculate} onChange={(event) => setGoodsDidNotCirculate(event.target.checked)} />Confirmo que a mercadoria não circulou.</label>
                                    <label className="block space-y-1"><span>Justificativa do estorno (mínimo 15 caracteres)</span>
                                        <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} maxLength={255} className="w-full rounded-xl border border-amber-300 bg-white p-3 dark:bg-slate-950" /></label>
                                </div>
                            )}
                            <div className="rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-700">
                                Ambiente fixado ao da NF-e original. Estorno usa <code>finNFe=3</code>, <code>tpNF=0</code>; devolução usa <code>finNFe=4</code>, <code>tpNF=0</code>.
                            </div>
                            <button type="button" disabled={!canPrepare || preparing} onClick={prepareDraft}
                                className="rounded-xl bg-blue-600 px-5 py-3 text-xs font-black text-white disabled:opacity-50">
                                {preparing ? 'Preparando rascunho…' : 'Preparar rascunho fiscal'}
                            </button>
                        </section>
                    )}

                    {payload && review && (
                        <>
                            <section className="grid gap-3 sm:grid-cols-3">
                                <div className="rounded-xl bg-slate-100 p-3 text-xs dark:bg-slate-800"><b>Operação</b><p className="mt-1">{payload.draft.operation_kind === 'estorno' ? 'Estorno · finNFe 3 · tpNF entrada' : 'Devolução · finNFe 4 · tpNF entrada'}</p></div>
                                <div className="rounded-xl bg-slate-100 p-3 text-xs dark:bg-slate-800"><b>Documento original</b><p className="mt-1">Modelo {payload.source.modelo} · #{payload.source.numero_nfe} · {payload.source.chave_acesso}</p></div>
                                <div className={`rounded-xl p-3 text-xs ${payload.draft.operation_kind === 'return' ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                    <b>Efeito no estoque</b><p className="mt-1">{payload.draft.operation_kind === 'return' ? 'A entrada física ocorreu ao atender a devolução; esta emissão fiscal só vincula a NF-e e não cria outra movimentação.' : 'Nenhuma movimentação de estoque.'}</p>
                                </div>
                            </section>
                            <section className="space-y-3">
                                <h3 className="text-xs font-black uppercase tracking-wider">Itens e CFOP por item</h3>
                                {payload.lines.map((line, index) => (
                                    <article key={line.id} className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div><p className="text-xs font-black">Item {line.fiscal_item_number} · {line.originalDescription}</p>
                                                <p className="mt-1 text-[11px] text-slate-500">Item original {line.originalItemNumber ?? line.fiscal_item_number} · quantidade devolvida {line.quantity} de {line.originalQuantity} · bruto R$ {Number(line.gross_value).toFixed(2)} · desconto R$ {Number(line.discount_value).toFixed(2)}</p></div>
                                            <label className="flex items-center gap-2 text-[10px] font-black uppercase">CFOP
                                                <input value={reviewedLines[index]?.cfop || ''} onChange={(event) => updateLineCfop(index, event.target.value.replace(/\D/g, '').slice(0, 4))}
                                                    inputMode="numeric" placeholder="1xxx/2xxx" className="w-24 rounded-lg border border-slate-300 bg-white p-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-950" />
                                            </label>
                                        </div>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            <details><summary className="cursor-pointer text-[10px] font-bold text-slate-600">XML do produto gerado (NCM, descrição e preço preservados)</summary>
                                                <pre className="mt-2 max-h-36 overflow-auto rounded-lg bg-slate-950 p-2 text-[9px] text-slate-200">{reviewedLines[index]?.product_xml}</pre></details>
                                            <label className="block space-y-1 text-[10px] font-bold"><span>Tributos proporcionais — revise antes de confirmar</span>
                                                <textarea value={reviewedLines[index]?.taxes_xml || ''} onChange={(event) => setReviewedLines((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, taxes_xml: event.target.value } : item))}
                                                    rows={5} spellCheck={false} className="w-full rounded-lg border border-slate-300 bg-slate-50 p-2 font-mono text-[9px] dark:border-slate-700 dark:bg-slate-950" /></label>
                                        </div>
                                    </article>
                                ))}
                            </section>
                            <section className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                                <h3 className="text-xs font-black uppercase tracking-wider">Dados adicionais</h3>
                                <label className="block space-y-1 text-[10px] font-bold">Natureza da operação
                                    <input value={review.nature_of_operation} onChange={(event) => updateReview('nature_of_operation', event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-950" /></label>
                                {payload.draft.operation_kind === 'estorno' && <label className="block space-y-1 text-[10px] font-bold">Justificativa
                                    <textarea value={review.reason} onChange={(event) => updateReview('reason', event.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-950" /></label>}
                                <div className="grid gap-3 md:grid-cols-2">
                                    {xmlBlockLabel('Destinatário (XML revisável)', review.recipient_xml, (value) => updateReview('recipient_xml', value))}
                                    {xmlBlockLabel('Totais (revise tributos e valores)', review.totals_xml, (value) => updateReview('totals_xml', value))}
                                    {xmlBlockLabel('Transporte', review.transport_xml, (value) => updateReview('transport_xml', value), 3)}
                                    {xmlBlockLabel('Pagamento', review.payment_xml, (value) => updateReview('payment_xml', value), 3)}
                                </div>
                                <div className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs dark:border-amber-900 dark:bg-amber-950/20">
                                    <label className="flex items-start gap-2"><input type="checkbox" checked={review.item_taxes_confirmed} onChange={(event) => updateReview('item_taxes_confirmed', event.target.checked)} />Revisei os tributos proporcionais de todos os itens.</label>
                                    <label className="flex items-start gap-2"><input type="checkbox" checked={review.totals_confirmed} onChange={(event) => updateReview('totals_confirmed', event.target.checked)} />Revisei totais, valores e referências fiscais da operação.</label>
                                </div>
                            </section>
                            {isProduction && <label className="flex items-start gap-2 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100">
                                <input type="checkbox" checked={productionConfirmed} onChange={(event) => setProductionConfirmed(event.target.checked)} />Confirmo transmissão deste documento em Produção.
                            </label>}
                        </>
                    )}

                    {error && <div role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{error}</div>}
                    {notice && <div role="status" className="rounded-xl border border-sky-300 bg-sky-50 p-3 text-xs text-sky-800 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200">{notice}</div>}
                </main>

                {payload && review && (
                    <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                        {payload.draft.status === 'rejected' && <button type="button" onClick={() => void prepareDraft()} disabled={preparing || transmitting}
                            className="rounded-xl border border-amber-300 px-4 py-2.5 text-xs font-bold text-amber-800 disabled:opacity-40 dark:border-amber-800 dark:text-amber-200">
                            {preparing ? 'Preparando nova tentativa…' : 'Iniciar nova tentativa fiscal'}
                        </button>}
                        <button type="button" onClick={saveFiscalReview} disabled={savingReview || transmitting || payload.draft.status === 'transmitting' || payload.draft.status === 'unknown' || payload.draft.status === 'authorized'}
                            className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold disabled:opacity-40 dark:border-slate-700">{savingReview ? 'Salvando revisão…' : 'Salvar revisão fiscal'}</button>
                        <button type="button" onClick={transmitOrReconcile} disabled={transmitting || savingReview || (isProduction && !productionConfirmed) || ['draft', 'rejected', 'authorized'].includes(payload.draft.status)}
                            className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-black text-white disabled:opacity-40">
                            {transmitting ? 'Consultando/transmitindo…' : retryAllowed ? 'Reenviar a mesma chave e XML' : ['unknown', 'transmitting'].includes(payload.draft.status) ? 'Consultar situação na SEFAZ' : 'Transmitir NF-e revisada'}
                        </button>
                    </footer>
                )}
            </div>
        </div>
    );
}
