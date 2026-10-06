import React from 'react';
import type {
  DraftPayload,
  ReviewData,
  ReviewedLine,
} from '../types/fiscalOperationDraft.types';
import {
  getFiscalFormRules,
  getFiscalFormXmlDefaults,
} from '../../../../../../shared-utils/fiscalOperationContext';

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
}

function XmlReviewField({ label, value, onChange, rows = 4 }: XmlReviewFieldProps) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <textarea
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
  const isReturn = payload.draft.operation_kind === 'return';
  const formRules = getFiscalFormRules(isReturn ? 'return' : 'estorno', {
    ...(payload.returnOrder?.operationContext || {
      returnMethod: payload.returnOrder?.returnMethod || undefined,
    }),
  });
  const formXmlDefaults = getFiscalFormXmlDefaults(formRules);
  const isFieldVisible = (field: string) =>
    formRules.visibleFields.includes('all') || formRules.visibleFields.includes(field);
  const isFieldReadOnly = (field: string) => formRules.readOnlyFields.includes(field);
  return (
    <>
      {isReturn && formRules.availability !== 'READY' && (
        <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <b>{formRules.blockCategory}</b>: {formRules.blockReason}
        </div>
      )}
      <section className="grid gap-3 sm:grid-cols-3">
        {isFieldVisible('operation') && (
        <div className="rounded-xl bg-slate-100 p-3 text-xs dark:bg-slate-800">
          <b>Operação</b>
          <p className="mt-1">
            {payload.draft.operation_kind === 'estorno'
              ? 'Estorno · finNFe 3 · tpNF entrada'
              : 'Devolução · finNFe 4 · tpNF entrada'}
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
      </section>

      {isFieldVisible('items') && <section className="space-y-3">
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
          {formRules.context === 'return' ? (
                <label className="flex items-center gap-2 text-[10px] font-black uppercase">
                  CFOP de devolução
                  <select
                    value={reviewedLines[index]?.cfop || ''}
                    required={formRules.requiredFields.includes('cfop')}
                    aria-required={formRules.requiredFields.includes('cfop')}
                    onChange={(event) => onLineCfopChange(index, event.target.value)}
                    disabled={!line.allowedCfops?.length}
                    className="max-w-64 rounded-lg border border-slate-300 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                  >
                    <option value="">Selecione CFOP permitido</option>
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
            <div className="grid gap-2 sm:grid-cols-2">
              <details>
                <summary className="cursor-pointer text-[10px] font-bold text-slate-600">
                  XML do produto gerado (NCM, descrição e preço preservados)
                </summary>
                <pre className="mt-2 max-h-36 overflow-auto rounded-lg bg-slate-950 p-2 text-[9px] text-slate-200">
                  {reviewedLines[index]?.product_xml}
                </pre>
              </details>
              {formRules.taxReviewMode === 'source_zero_only_until_matrix' ? (
                <div className="space-y-1 text-[10px] font-bold">
                  <span>Classificação tributária original (somente leitura; a matriz atual do ERP cobre apenas cenários sem bases/valores tributários)</span>
                  <pre className="max-h-36 overflow-auto rounded-lg border border-slate-300 bg-slate-50 p-2 font-mono text-[9px] dark:border-slate-700 dark:bg-slate-950">
                    {reviewedLines[index]?.taxes_xml}
                  </pre>
                </div>
              ) : (
                <label className="block space-y-1 text-[10px] font-bold">
                  <span>Tributos proporcionais — revise antes de confirmar</span>
                  <textarea
                    value={reviewedLines[index]?.taxes_xml || ''}
                    onChange={(event) => onLineTaxesChange(index, event.target.value)}
                    rows={5}
                    spellCheck={false}
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 p-2 font-mono text-[9px] dark:border-slate-700 dark:bg-slate-950"
                  />
                </label>
              )}
            </div>
          </article>
        ))}
      </section>}

      <section className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
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
        <div className="grid gap-3 md:grid-cols-2">
          {isFieldVisible('recipient') && isFieldReadOnly('recipient') ? (
            <div className="block space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Destinatário vinculado à NF-e original (somente leitura)</span>
              <pre className="max-h-36 overflow-auto rounded-xl border border-slate-300 bg-slate-100 p-3 font-mono text-[10px] text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">{review.recipient_xml}</pre>
            </div>
          ) : isFieldVisible('recipient') ? (
            <XmlReviewField
              label="Destinatário (XML revisável)"
              value={review.recipient_xml}
              onChange={(value) => onReviewChange('recipient_xml', value)}
            />
          ) : null}
          {isFieldVisible('totals') && isFieldReadOnly('totals') ? (
            <div className="block space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Totais fiscais recalculados (somente leitura)</span>
              <pre className="max-h-36 overflow-auto rounded-xl border border-slate-300 bg-slate-100 p-3 font-mono text-[10px] text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">{review.totals_xml}</pre>
            </div>
          ) : isFieldVisible('totals') ? (
            <XmlReviewField
              label="Totais (revise tributos e valores)"
              value={review.totals_xml}
              onChange={(value) => onReviewChange('totals_xml', value)}
            />
          ) : null}
          {isFieldVisible('transport') && isFieldReadOnly('transport') ? (
            <div className="space-y-2">
              <div className="block space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Transporte do retorno físico confirmado</span>
                <div className="rounded-xl border border-slate-300 bg-slate-100 p-3 text-xs dark:border-slate-700 dark:bg-slate-950">
                  {formRules.allowedTransportModes.map((option) => option.label).join(', ')} · <code>{formXmlDefaults?.transportXml || 'bloqueado'}</code>
                </div>
              </div>
              <div className="block space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Pagamento fiscal</span>
                <div className="rounded-xl border border-slate-300 bg-slate-100 p-3 text-xs dark:border-slate-700 dark:bg-slate-950">
                  {formRules.allowedPaymentOptions.map((option) => option.label).join(', ')} · <code>{formXmlDefaults?.paymentXml || 'bloqueado'}</code>
                </div>
              </div>
            </div>
          ) : isFieldVisible('transport') && isFieldVisible('payment') ? (
            <>
              <XmlReviewField
                label="Transporte"
                value={review.transport_xml}
                onChange={(value) => onReviewChange('transport_xml', value)}
                rows={3}
              />
              <XmlReviewField
                label="Pagamento"
                value={review.payment_xml}
                onChange={(value) => onReviewChange('payment_xml', value)}
                rows={3}
              />
            </>
          ) : null}
        </div>
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
        </div>}
      </section>

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
