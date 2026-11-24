import PersonFormModal from '@/pages/App/Registrations/shared/modals/PersonFormModal';
import SupplierAutocomplete from '@/components/SupplierAutocomplete';
import { InboundInvoiceItemsReview } from '../components/InboundInvoiceItemsReview';
import {
  useInboundInvoiceMappingsModal,
  type ManageInboundInvoiceMappingsProps,
} from './useInboundInvoiceMappingsModal';

export function ManageInboundInvoiceMappingsModal(props: ManageInboundInvoiceMappingsProps) {
  const { isOpen, onGenerateReceipt } = props;
  const {
    invoice,
    suppliers,
    newSupplier,
    setNewSupplier,
    setReviewBusy,
    reviewBusy,
    saving,
    loading,
    errorMessage,
    initialDataReady,
    isSalvadosSupplier,
    hasMatchedProducts,
    hasUncertainSave,
    receiptDisabledReason,
    canGenerateReceipt,
    retryInitialLoad,
    close,
    setSupplier,
    handleItemChange,
    handleSupplierCreated,
  } = useInboundInvoiceMappingsModal(props);

  if (!isOpen || !invoice) return null;

  if (!initialDataReady) {
    return (
      <div className="fixed inset-0 z-[1000003] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
        <section
          role="dialog"
          aria-modal="true"
          aria-label={loading ? 'Carregando dados da nota fiscal' : 'Falha ao carregar dados da nota fiscal'}
          className="flex max-w-sm flex-col items-center gap-4 rounded-2xl border border-white/10 bg-slate-900/90 px-8 py-7 text-center text-white shadow-2xl"
        >
          {loading ? (
            <span aria-hidden="true" className="h-12 w-12 animate-spin rounded-full border-4 border-white/25 border-t-white" />
          ) : (
            <i aria-hidden="true" className="bi bi-exclamation-triangle-fill text-3xl text-amber-400" />
          )}
          <p role={loading ? 'status' : 'alert'} aria-live="polite" className="text-sm font-semibold">
            {loading
              ? 'Carregando a nota fiscal, fornecedores e vínculos...'
              : errorMessage || 'Não foi possível carregar os dados da nota fiscal.'}
          </p>
          {!loading && (
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={retryInitialLoad}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white hover:bg-blue-500"
              >
                Tentar novamente
              </button>
              <button
                type="button"
                onClick={close}
                className="rounded-xl border border-white/20 px-4 py-2 text-xs font-bold text-white hover:bg-white/10"
              >
                Fechar
              </button>
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-[1000002] flex items-center justify-center p-3">
        <button
          type="button"
          aria-label="Fechar vínculos"
          disabled={saving || reviewBusy}
          className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
          onClick={close}
        />
        <section
          role="dialog"
          aria-modal="true"
          aria-label="Gerenciar vínculos da nota"
          className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900 animate-in fade-in zoom-in-95"
        >
          <header className="flex items-center justify-between border-b p-5 dark:border-slate-800">
            <div>
              <h2 className="flex items-center gap-2 text-base font-black text-slate-800 dark:text-slate-100">
                <i className="bi bi-link-45deg text-lg text-blue-600" />
                Gerenciar Vínculos - NF-e #{invoice.nfeNumber}
              </h2>
            </div>
            <button
              type="button"
              aria-label="Fechar janela"
              disabled={saving || reviewBusy}
              onClick={close}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <i className="bi bi-x-lg" />
            </button>
          </header>

          <main className="space-y-5 overflow-y-auto p-5">
            {errorMessage && (
              <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">
                {errorMessage}
              </p>
            )}
            {(loading || saving) && (
              <p role="status" className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                <i className="bi bi-arrow-repeat animate-spin" aria-hidden="true" />
                {saving ? 'Salvando e confirmando vínculos...' : 'Consultando fornecedores e vínculos...'}
              </p>
            )}
            {errorMessage && !saving && (
              <button type="button" onClick={retryInitialLoad}>
                Consultar novamente
              </button>
            )}
            <fieldset disabled={saving || loading || reviewBusy || hasUncertainSave} className="space-y-5">
              <section className="rounded-2xl border p-4 dark:border-slate-800">
                <h3 className="text-xs font-black uppercase text-slate-500">Fornecedor</h3>
                <p className="mt-2 font-bold text-slate-800 dark:text-slate-100">
                  {invoice.emitterName || 'Emitente não identificado'}
                </p>
                <p className="text-xs text-slate-500">
                  {invoice.emitterCnpj || 'CNPJ/CPF não encontrado'}
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <SupplierAutocomplete
                      suppliers={suppliers}
                      selectedSupplierId={invoice.supplierId || ''}
                      onSelect={(id) => setSupplier(id)}
                      disabled={hasMatchedProducts || isSalvadosSupplier}
                      disabledReason={
                        isSalvadosSupplier
                          ? 'Fornecedor de Salvados: os itens permanecem em “Não se aplica” e não geram movimentação de estoque.'
                          : hasMatchedProducts
                            ? 'Para alterar o fornecedor da NF, desvincule primeiro todos os produtos da nota.'
                            : undefined
                      }
                      showDisabledReasonOnClick={true}
                      hideLabel={true}
                      inputClassName="w-full rounded-xl border border-slate-200 bg-white p-2 text-sm text-slate-800 outline-none transition-colors focus:border-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      placeholder="Digite pelo menos 3 caracteres para buscar fornecedor..."
                      minChars={3}
                    />
                  </div>
                  <button
                    disabled={hasMatchedProducts || isSalvadosSupplier}
                    className="shrink-0 cursor-pointer rounded-xl border border-emerald-200 px-3 py-2 text-xs font-black text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
                    onClick={() => setNewSupplier(true)}
                  >
                    + Novo fornecedor
                  </button>
                </div>

                {!isSalvadosSupplier && !hasMatchedProducts && invoice.supplierId ? (
                  <p className="mt-2 text-xs font-bold text-emerald-700">
                    Fornecedor vinculado. Os produtos estão liberados.
                  </p>
                ) : !isSalvadosSupplier && !hasMatchedProducts ? (
                  <p className="mt-2 text-xs text-amber-700">
                    Selecione o fornecedor para habilitar a vinculação de produtos.
                  </p>
                ) : null}
              </section>

              <InboundInvoiceItemsReview
                key={invoice.id}
                contextKey={invoice.id}
                onProcessingSuggestionsChange={setReviewBusy}
                suggestionsEnabled={false}
                items={invoice.items}
                supplierId={invoice.supplierId}
                suppliers={suppliers}
                onChange={handleItemChange}
                lockToNotApplicable={isSalvadosSupplier}
              />
            </fieldset>
          </main>

          <footer className="flex shrink-0 justify-end border-t border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/30">
            <div
              className={`group relative ${canGenerateReceipt ? '' : 'cursor-help'}`}
              role="group"
              tabIndex={canGenerateReceipt ? undefined : 0}
              aria-label={canGenerateReceipt ? undefined : 'Por que gerar recebimento está desativado?'}
              aria-describedby={receiptDisabledReason ? 'inbound-receipt-disabled-reason' : undefined}
            >
              <button
                type="button"
                disabled={!canGenerateReceipt}
                onClick={() => onGenerateReceipt?.(invoice)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-colors ${
                  canGenerateReceipt
                    ? 'cursor-pointer bg-emerald-600 text-white shadow-sm hover:bg-emerald-700'
                    : 'cursor-not-allowed bg-slate-200 text-slate-500 opacity-60 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                <i className="bi bi-clipboard-check" aria-hidden="true" />
                Gerar recebimento
              </button>
              {receiptDisabledReason && (
                <span
                  id="inbound-receipt-disabled-reason"
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full right-0 z-20 mb-2 hidden w-72 rounded-xl border border-slate-200 bg-slate-900 px-3 py-2 text-left text-xs font-medium leading-relaxed text-white shadow-xl group-hover:block group-focus:block dark:border-slate-700"
                >
                  {receiptDisabledReason}
                </span>
              )}
            </div>
          </footer>
        </section>
      </div>

      <PersonFormModal
        isOpen={newSupplier}
        onClose={() => setNewSupplier(false)}
        collectionName="suppliers"
        title="Novo Fornecedor"
        onSuccess={handleSupplierCreated}
      />
    </>
  );
}
