import React, { useMemo, useState } from 'react';
import type {
  DraftPayload,
  ReviewData,
  ReviewedLine,
} from '../types/fiscalOperationDraft.types';
import {
  getFiscalFormRules,
} from '../../../../../../shared-utils/fiscalOperationContext';
import {
  IssuedFiscalDocumentDetailsTabList,
  IssuedFiscalDocumentCustomerTab,
  IssuedFiscalDocumentItemsTab,
  IssuedFiscalDocumentTransportTab,
  IssuedFiscalDocumentPaymentTab,
  type DetailTab,
} from './IssuedFiscalDocumentDetailsTabs';
import { parseFiscalOperationReview } from '../utils/parseFiscalOperationReview';

interface NfeOperationDraftReviewProps {
  payload: DraftPayload;
  review: ReviewData;
  reviewedLines: ReviewedLine[];
  isProduction: boolean;
  productionConfirmed: boolean;
  onProductionConfirmedChange: (confirmed: boolean) => void;
  onLineCfopChange: (index: number, cfop: string) => void;
  onLineTaxesChange: (index: number, taxesXml: string) => void;
  onReviewChange: (key: keyof ReviewData, value: string | boolean) => void;
}

interface XmlReviewFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  readOnly?: boolean;
}

function XmlReviewField({ label, value, onChange, rows = 4, readOnly = false }: XmlReviewFieldProps) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <textarea
        readOnly={readOnly}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        spellCheck={false}
        className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 font-mono text-[10px] text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
      />
    </label>
  );
}

export function NfeOperationDraftReview({
  payload,
  review,
  reviewedLines,
  isProduction,
  productionConfirmed,
  onProductionConfirmedChange,
  onLineCfopChange,
  onLineTaxesChange,
  onReviewChange,
}: NfeOperationDraftReviewProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('general');
  const [showXml, setShowXml] = useState(false);
  const parsed = useMemo(() => parseFiscalOperationReview(review, reviewedLines), [review, reviewedLines]);
  const isReturn = payload.draft.operation_kind === 'return';
  const formRules = getFiscalFormRules(isReturn ? 'return' : 'estorno', {
    ...(payload.returnOrder?.operationContext || {
      returnMethod: payload.returnOrder?.returnMethod || undefined,
    }),
  });
  const isFieldVisible = (field: string) =>
    formRules.visibleFields.includes('all') || formRules.visibleFields.includes(field);
  const isFieldReadOnly = (field: string) => formRules.readOnlyFields.includes(field);
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-500">Rascunho de {isReturn ? 'devolução fiscal' : 'estorno fiscal'} · NF-e modelo 55 · Entrada</p>
        <button type="button" onClick={() => setShowXml(value => !value)} aria-expanded={showXml} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold dark:border-slate-700">
          {showXml ? 'Ocultar XML da revisão' : 'Ver XML da revisão'}
        </button>
      </div>
      <IssuedFiscalDocumentDetailsTabList activeTab={activeTab} onChange={setActiveTab} />
      <section role="tabpanel" id={`issued-fiscal-panel-${activeTab}`} aria-labelledby={`issued-fiscal-tab-${activeTab}`} className="space-y-4">
      {isReturn && formRules.availability !== 'READY' && (
        <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <b>{formRules.blockCategory}</b>: {formRules.blockReason}
        </div>
      )}
      {activeTab === 'general' && <section className="grid gap-3 sm:grid-cols-3">
        {isFieldVisible('operation') && (
        <div className="rounded-xl bg-slate-100 p-3 text-xs dark:bg-slate-800">
          <b>Operação</b>
          <p className="mt-1">
            {payload.draft.operation_kind === 'estorno'
              ? 'Estorno fiscal · Nota de ajuste · Entrada'
              : 'Devolução fiscal de mercadoria · Entrada'}
            {' '}· modelo {formRules.allowedModels.join(', ')}
          </p>
        </div>
        )}
        {isFieldVisible('originalDocumentReference') && (
        <div className="rounded-xl bg-slate-100 p-3 text-xs dark:bg-slate-800">
          <b>Documento original</b>
          <p className="mt-1">
            Modelo {payload.source.modelo} · série {payload.source.serie} · #{payload.source.numero_nfe} ·{' '}
            {payload.source.chave_acesso}
          </p>
        </div>
        )}
        {isFieldVisible('stockEffect') && <div
          className={
            payload.draft.operation_kind === 'return'
              ? 'rounded-xl bg-emerald-50 p-3 text-xs text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200'
              : 'rounded-xl bg-slate-100 p-3 text-xs dark:bg-slate-800'
          }
        >
          <b>Efeito no estoque</b>
          <p className="mt-1">
            {payload.draft.operation_kind === 'return'
              ? 'A entrada física ocorreu ao atender a devolução; esta emissão fiscal só vincula a NF-e e não cria outra movimentação.'
              : 'Nenhuma movimentação de estoque.'}
          </p>
        </div>}
      </section>}

      {activeTab === 'customer' && <IssuedFiscalDocumentCustomerTab parsed={parsed} />}
      {activeTab === 'transport' && <IssuedFiscalDocumentTransportTab parsed={parsed} />}
      {activeTab === 'payment' && <IssuedFiscalDocumentPaymentTab parsed={parsed} />}
      {activeTab === 'events' && <div role="status" className="rounded-2xl border border-slate-200 p-4 text-sm dark:border-slate-700">{({ draft: 'Rascunho em elaboração.', ready: 'Revisão salva. Aguardando transmissão.', authorized: 'Operação autorizada pela SEFAZ.', cancelled: 'Rascunho cancelado.', rejected: 'Tentativa rejeitada. Confira o retorno fiscal.', unknown: 'Resultado sem confirmação. Consulte a mesma tentativa.', transmitting: 'Transmissão em andamento ou aguardando confirmação.' } as Record<string, string>)[payload.draft.status] || 'Consulte a situação da operação fiscal.'}</div>}
      {activeTab === 'items' && isFieldVisible('items') && <section className="space-y-3">
        <IssuedFiscalDocumentItemsTab parsed={parsed} />
        <h3 className="text-xs font-black uppercase tracking-wider">Itens e CFOP por item</h3>
        {payload.lines.map((line, index) => (
          <article
            key={line.id}
            className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black">
                  Item {line.fiscal_item_number} · {line.originalDescription}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Item original {line.originalItemNumber ?? line.fiscal_item_number} · quantidade
                  devolvida {line.quantity} de {line.originalQuantity} · bruto R$
                  {Number(line.gross_value).toFixed(2)} · desconto R$ {Number(line.discount_value).toFixed(2)}
                </p>
              </div>
          {formRules.context === 'return' || line.allowedCfops?.length ? (
            <label className="flex items-center gap-2 text-[10px] font-black uppercase">
                  {isReturn ? 'CFOP de devolução' : 'CFOP do estorno'}
                  <select
                    value={reviewedLines[index]?.cfop || ''}
                    required={formRules.requiredFields.includes('cfop')}
                    aria-required={formRules.requiredFields.includes('cfop')}
                    onChange={(event) => onLineCfopChange(index, event.target.value)}
                    disabled={!line.allowedCfops?.length}
                    className="max-w-64 rounded-lg border border-slate-300 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                  >
                    <option value="">
                      {isReturn ? 'Selecione CFOP permitido' : 'Selecione o inverso ou CFOP alternativo'}
                    </option>
                    {(line.allowedCfops || []).map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="flex items-center gap-2 text-[10px] font-black uppercase">
                  CFOP
                  <input
                    value={reviewedLines[index]?.cfop || ''}
                    onChange={(event) =>
                      onLineCfopChange(index, event.target.value.replace(/\D/g, '').slice(0, 4))
                    }
                    inputMode="numeric"
                    placeholder="CFOP de entrada"
                    className="w-32 rounded-lg border border-slate-300 bg-white p-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-950"
                  />
                </label>
              )}
            </div>
            {!isReturn && (
              <p className="text-[10px] text-slate-500">
                  CFOP original {line.originalCfop || 'não identificado'} · use o inverso configurado;
                sem mapeamento, escolha 5.949, 6.949 ou 7.949 conforme o cenário e confirme com a revisão fiscal.
              </p>
            )}
          </article>
        ))}
      </section>}

      {activeTab === 'general' && <section className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
        <h3 className="text-xs font-black uppercase tracking-wider">Dados adicionais</h3>
        {isFieldVisible('natureOfOperation') && <label className="block space-y-1 text-[10px] font-bold">
          Natureza da operação
          {isFieldReadOnly('natureOfOperation') || formRules.context === 'return' ? (
            <select
              value={review.nature_of_operation}
              disabled
              required={formRules.requiredFields.includes('natureOfOperation')}
              aria-required={formRules.requiredFields.includes('natureOfOperation')}
              className="w-full rounded-lg border border-slate-300 bg-slate-100 p-2 text-xs dark:border-slate-700 dark:bg-slate-800"
            >
              {formRules.natureOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          ) : (
            <input
              value={review.nature_of_operation}
              onChange={(event) => onReviewChange('nature_of_operation', event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-950"
            />
          )}
        </label>}
        {isFieldVisible('reason') && (
          <label className="block space-y-1 text-[10px] font-bold">
            Justificativa
            <textarea
              value={review.reason}
              onChange={(event) => onReviewChange('reason', event.target.value)}
              rows={2}
              className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
        )}
        {isFieldVisible('additionalInformation') && isFieldReadOnly('additionalInformation') && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[10px] dark:border-slate-700 dark:bg-slate-950">
            <b>Observação fiscal fixa da devolução</b>
            <p className="mt-1">Devolução referente à NF-e {payload.source.chave_acesso}; itens e quantidades identificados por item.</p>
          </div>
        )}
        {isFieldVisible('reviewConfirmations') && <div className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs dark:border-amber-900 dark:bg-amber-950/20">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={review.item_taxes_confirmed}
              onChange={(event) => onReviewChange('item_taxes_confirmed', event.target.checked)}
            />
            {formRules.taxReviewMode === 'source_zero_only_until_matrix'
              ? 'Revisei os dados tributários originais; esta matriz do ERP cobre somente cenários sem bases ou valores tributários e nenhum valor foi zerado para emitir.'
              : 'Revisei a classificação fiscal e os tributos proporcionais da operação.'}
          </label>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={review.totals_confirmed}
              onChange={(event) => onReviewChange('totals_confirmed', event.target.checked)}
            />
            Revisei totais, valores e referências fiscais da operação.
          </label>
          {!isReturn && (
            <>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={review.apportionment_review_confirmed}
                  onChange={(event) =>
                    onReviewChange('apportionment_review_confirmed', event.target.checked)
                  }
                />
                Conferi o período de apuração e avaliei diferenças e acréscimos do art. 298, §2º, quando aplicáveis.
              </label>
              <label className="block space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                  Diferenças/acréscimos do art. 298, §2º (ou justificativa de não aplicação)
                </span>
                <textarea
                  value={review.period_adjustment_text}
                  onChange={(event) => onReviewChange('period_adjustment_text', event.target.value)}
                  rows={2}
                  maxLength={1200}
                  placeholder="Preencha quando o estorno for emitido em período posterior e houver diferenças ou acréscimos a informar."
                  className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
            </>
          )}
        </div>}
      </section>}
      </section>

      {showXml && <section className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700" aria-label="XML da revisão fiscal">
        <p className="text-xs text-slate-500">Blocos técnicos do rascunho em revisão. O XML completo assinado fica disponível nos detalhes do documento emitido.</p>
        {reviewedLines.map((line, index) => <div key={line.draft_line_id} className="space-y-2">
          <XmlReviewField label={`Produto ${index + 1} (XML somente leitura)`} value={line.product_xml} readOnly onChange={() => undefined} />
          <XmlReviewField label={`Tributos do item ${index + 1} (XML)`} value={line.taxes_xml} readOnly={formRules.taxReviewMode === 'source_zero_only_until_matrix'} onChange={value => onLineTaxesChange(index, value)} />
        </div>)}
        {isFieldVisible('recipient') && <XmlReviewField label="Destinatário (XML)" value={review.recipient_xml} readOnly={isFieldReadOnly('recipient')} onChange={value => onReviewChange('recipient_xml', value)} />}
        {isFieldVisible('totals') && <XmlReviewField label="Totais (XML)" value={review.totals_xml} readOnly={isFieldReadOnly('totals')} onChange={value => onReviewChange('totals_xml', value)} />}
        {isFieldVisible('transport') && <XmlReviewField label="Transporte (XML)" value={review.transport_xml} readOnly={isFieldReadOnly('transport')} onChange={value => onReviewChange('transport_xml', value)} />}
        {isFieldVisible('payment') && <XmlReviewField label="Pagamento (XML)" value={review.payment_xml} readOnly={isFieldReadOnly('payment')} onChange={value => onReviewChange('payment_xml', value)} />}
      </section>}

      {isProduction && isFieldVisible('productionConfirmation') && (
        <label className="flex items-start gap-2 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100">
          <input
            type="checkbox"
            checked={productionConfirmed}
            onChange={(event) => onProductionConfirmedChange(event.target.checked)}
          />
          Confirmo transmissão deste documento em Produção.
        </label>
      )}
    </>
  );
}
