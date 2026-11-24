import { ERPListPagination } from '@/components/shared/ERPListPagination';
import type { NcmSearchResult } from '@/services/fiscal/ncmService';
import {
  formatNcmDate,
  type NcmChangeEvent,
  type NcmCorrelationRecord,
  type NcmProduct,
  type NcmRelationType,
} from '@/services/fiscal/ncmAdminService';
import type { NcmRow } from './NcmCatalogResults';
import { NcmCorrelationRecords } from './NcmCorrelationRecords';
import { StatusPill } from './NcmManagementPanelIndicators';

interface NcmDetailsModalProps {
  selectedRow: NcmRow;
  detailStatus: string;
  canManage: boolean;
  products: NcmProduct[];
  productsTotal: number;
  productPage: number;
  productPageSize: number;
  pageSizeOptions: readonly number[];
  selectedProducts: string[];
  destinationQuery: string;
  destinationResults: NcmSearchResult[];
  destination: NcmSearchResult | null;
  isReviewing: boolean;
  isAddingCorrelation: boolean;
  correlationType: NcmRelationType;
  correlationVersion: string;
  isSavingCorrelation: boolean;
  correlations: NcmCorrelationRecord[];
  events: NcmChangeEvent[];
  onClose: () => void;
  onToggleProduct: (productId: string, checked: boolean) => void;
  onChangeProductPage: (nextPage: number, size?: number) => void;
  onChangeProductPageSize: (size: number) => void;
  onDestinationQueryChange: (value: string) => void;
  onSelectDestinationResult: (result: NcmSearchResult) => void;
  onApplyProductReview: () => void;
  onToggleAddingCorrelation: () => void;
  onCorrelationTypeChange: (type: NcmRelationType) => void;
  onCorrelationVersionChange: (version: string) => void;
  onSaveCorrelation: () => void;
  onSelectSuccessor: (code: string) => void;
}

export function NcmDetailsModal({
  selectedRow,
  detailStatus,
  canManage,
  products,
  productsTotal,
  productPage,
  productPageSize,
  pageSizeOptions,
  selectedProducts,
  destinationQuery,
  destinationResults,
  destination,
  isReviewing,
  isAddingCorrelation,
  correlationType,
  correlationVersion,
  isSavingCorrelation,
  correlations,
  events,
  onClose,
  onToggleProduct,
  onChangeProductPage,
  onChangeProductPageSize,
  onDestinationQueryChange,
  onSelectDestinationResult,
  onApplyProductReview,
  onToggleAddingCorrelation,
  onCorrelationTypeChange,
  onCorrelationVersionChange,
  onSaveCorrelation,
  onSelectSuccessor,
}: NcmDetailsModalProps) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900"
      >
        <div className="flex items-start justify-between border-b border-slate-200 p-5 dark:border-slate-800 md:p-6">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h4 className="font-mono text-xl font-black text-slate-900 dark:text-white">
                {selectedRow.code}
              </h4>
              <StatusPill status={detailStatus} />
            </div>
            <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
              {selectedRow.official_description}
            </p>
            <p className="mt-2 text-[11px] text-slate-500">
              Vigência: {formatNcmDate(selectedRow.start_date)} a{' '}
              {selectedRow.end_date === '9999-12-31'
                ? 'sem encerramento previsto'
                : formatNcmDate(selectedRow.end_date)}{' '}
              · Ato: {selectedRow.legal_act || '—'}
            </p>
          </div>
          <button
            type="button"
            aria-label="Fechar detalhes"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 md:p-6">
          {detailStatus === 'Encerrado' && productsTotal > 0 && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
              Este código está encerrado e há produtos vinculados. Escolha uma correlação
              documentada ou classifique os produtos com o responsável fiscal.
            </div>
          )}
          {detailStatus === 'Não verificado' && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              Este código aparece em produtos, mas não consta na base oficial vigente local.
              Isso não confirma que ele foi encerrado. Consulte o histórico do Classif e
              confirme a classificação antes de alterar os produtos.
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
            <div className="min-w-0">
              <div className="mb-2 flex items-center justify-between">
                <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Produtos vinculados ({productsTotal})
                </h5>
                <span className="text-[10px] text-slate-400">
                  A página mostra até {productPageSize} produtos
                </span>
              </div>
              {products.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-5 text-center text-xs text-slate-400 dark:bg-slate-800">
                  Nenhum produto vinculado.
                </p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                  {products.map((product) => (
                    <label
                      key={product.id}
                      className={`flex items-start gap-3 border-b border-slate-100 p-3 last:border-b-0 dark:border-slate-800 ${canManage ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40' : ''}`}
                    >
                      {canManage && (
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product.id)}
                          onChange={(event) => onToggleProduct(product.id, event.target.checked)}
                          className="mt-0.5 accent-blue-600"
                        />
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-bold text-slate-800 dark:text-slate-100">
                          {product.name || 'Produto sem nome'}
                        </span>
                        <span className="mt-0.5 block font-mono text-[10px] text-slate-500">
                          Código {product.code || '—'} · NCM {product.ncm_code}
                        </span>
                      </span>
                    </label>
                  ))}
                  <div className="flex flex-col gap-2 border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500 dark:border-slate-800">
                    <ERPListPagination
                      ariaLabel="Paginação de produtos vinculados ao NCM"
                      page={productPage + 1}
                      pageSize={productPageSize}
                      totalItems={productsTotal}
                      onPageChange={(nextPage) => onChangeProductPage(nextPage - 1)}
                      onPageSizeChange={onChangeProductPageSize}
                      pageSizeOptions={pageSizeOptions}
                      preferenceKey="ncm-products"
                      itemLabel="produtos"
                    />
                  </div>
                </div>
              )}

              {canManage && detailStatus !== 'Vigente' && productsTotal > 0 && (
                <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/60 p-3 dark:border-blue-900 dark:bg-blue-950/20">
                  <label className="block text-xs font-bold text-blue-900 dark:text-blue-200">
                    Novo NCM para os produtos selecionados
                  </label>
                  <div className="relative mt-2">
                    <input
                      value={destinationQuery}
                      onChange={(event) => onDestinationQueryChange(event.target.value)}
                      placeholder="Pesquise por código ou descrição oficial"
                      className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500 dark:border-blue-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                    {destinationResults.length > 0 && (
                      <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                        {destinationResults.map((result) => (
                          <button
                            type="button"
                            key={result.code}
                            onClick={() => onSelectDestinationResult(result)}
                            className="block w-full border-b border-slate-100 px-3 py-2 text-left last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                          >
                            <span className="font-mono font-bold">{result.code}</span>
                            <span className="ml-2 text-slate-500">
                              {result.official_description}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedProducts.length > 0 && (
                    <button
                      type="button"
                      disabled={!destination || isReviewing}
                      onClick={onApplyProductReview}
                      className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isReviewing
                        ? 'Aplicando revisão...'
                        : `Confirmar NCM em ${selectedProducts.length} produto(s)`}
                    </button>
                  )}
                  <p className="mt-2 text-[10px] leading-relaxed text-blue-800 dark:text-blue-300">
                    A sugestão por correlação ajuda na análise; valide a classificação fiscal
                    antes de confirmar. O sistema não escolhe automaticamente entre vários
                    sucessores.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-5">
              <section>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Correlações registradas
                  </h5>
                  {canManage && (
                    <button
                      type="button"
                      onClick={onToggleAddingCorrelation}
                      className="text-[10px] font-bold text-blue-600"
                    >
                      {isAddingCorrelation ? 'Cancelar' : 'Registrar correlação verificada'}
                    </button>
                  )}
                </div>
                {isAddingCorrelation && canManage && (
                  <div className="mb-3 space-y-2 rounded-xl border border-blue-200 bg-blue-50/60 p-3 dark:border-blue-900 dark:bg-blue-950/20">
                    <p className="text-[10px] text-slate-600 dark:text-slate-300">
                      Informe o código sucessor e a revisão consultada no Rastreador. O sistema
                      registra a fonte como apoio; a relação não altera produtos
                      automaticamente.
                    </p>
                    <input
                      value={destinationQuery}
                      onChange={(event) => onDestinationQueryChange(event.target.value)}
                      placeholder="Pesquisar NCM sucessor vigente"
                      className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500 dark:border-blue-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                    {destinationResults.length > 0 && (
                      <div className="max-h-36 overflow-y-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                        {destinationResults.map((result) => (
                          <button
                            type="button"
                            key={result.code}
                            onClick={() => onSelectDestinationResult(result)}
                            className="block w-full border-b border-slate-100 px-3 py-2 text-left text-[10px] last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                          >
                            <span className="font-mono font-bold">{result.code}</span>
                            <span className="ml-2 text-slate-500">
                              {result.official_description}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                    {destination && (
                      <p className="text-[10px] font-bold text-blue-800 dark:text-blue-200">
                        Destino selecionado: {destination.code} ·{' '}
                        {destination.official_description}
                      </p>
                    )}
                    <select
                      value={correlationType}
                      onChange={(event) =>
                        onCorrelationTypeChange(event.target.value as NcmRelationType)
                      }
                      className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs dark:border-blue-800 dark:bg-slate-950 dark:text-slate-100"
                    >
                      <option value="one_to_one">Um para um</option>
                      <option value="one_to_many">Um para vários</option>
                      <option value="many_to_one">Vários para um</option>
                    </select>
                    <input
                      value={correlationVersion}
                      onChange={(event) => onCorrelationVersionChange(event.target.value)}
                      placeholder="Versão/período consultado (ex.: SH 2022)"
                      className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500 dark:border-blue-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={onSaveCorrelation}
                      disabled={
                        !destination || !correlationVersion.trim() || isSavingCorrelation
                      }
                      className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                    >
                      {isSavingCorrelation ? 'Salvando...' : 'Registrar relação consultada'}
                    </button>
                  </div>
                )}
                <NcmCorrelationRecords
                  correlations={correlations}
                  selectedCode={selectedRow.code}
                  canManage={canManage}
                  detailStatus={detailStatus}
                  hasProducts={products.length > 0}
                  onSelectSuccessor={onSelectSuccessor}
                />
              </section>
              <section>
                <h5 className="mb-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                  Histórico do código
                </h5>
                {events.length === 0 ? (
                  <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800">
                    Sem eventos registrados desde a implantação do histórico.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {events.map((event) => (
                      <div
                        key={event.id}
                        className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"
                      >
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          {event.event_type.replaceAll('_', ' ')}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-500">
                          {new Date(event.occurred_at).toLocaleString('pt-BR')}
                        </p>
                        {event.old_data?.description &&
                          event.old_data.description !== event.new_data?.description && (
                            <p className="mt-1 text-[10px] text-slate-500">
                              Descrição anterior: {event.old_data.description}
                            </p>
                          )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
