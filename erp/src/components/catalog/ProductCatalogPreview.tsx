import React from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import type { ProductCatalogPrepareInput } from '../../../../shared-utils/productCatalogFormSchemas';
import { catalogItemUrl, formatPrice } from './productCatalogPresentation';
import { itemKey } from './productCatalogItems';

export type ProductCatalogPreviewTab = 'cards' | 'link' | 'pdf';

interface ProductCatalogPreviewProps {
  activeTab: ProductCatalogPreviewTab;
  onActiveTabChange: (tab: ProductCatalogPreviewTab) => void;
  preparedSelection: ProductCatalogPrepareInput;
  onHidePricesChange: (hidePrices: boolean) => void;
  onSelectionPrepared?: (selection: ProductCatalogPrepareInput, catalogUrl: string | null) => void;
  registerDeliveryMode: () => UseFormRegisterReturn<'deliveryMode'>;
  canUseNativeDelivery: boolean;
  nativeProductCount: number;
  nativeDisabledReason: string;
  canAddSelectionToConversation: boolean;
  activeLink: string | null;
  onCopy: (value: string, successText: string) => Promise<void>;
  onGeneratePdf: () => Promise<void>;
  isGeneratingPdf: boolean;
  pdfProgress: number;
  previewFeedback: string;
  hasPdfDestination: boolean;
  selectionActionLabel: string;
  onClose: () => void;
}

export const ProductCatalogPreview: React.FC<ProductCatalogPreviewProps> = ({
  activeTab,
  onActiveTabChange,
  preparedSelection,
  onHidePricesChange,
  onSelectionPrepared,
  registerDeliveryMode,
  canUseNativeDelivery,
  nativeProductCount,
  nativeDisabledReason,
  canAddSelectionToConversation,
  activeLink,
  onCopy,
  onGeneratePdf,
  isGeneratingPdf,
  pdfProgress,
  previewFeedback,
  hasPdfDestination,
  selectionActionLabel,
  onClose,
}) => (
  <>
    <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
      {(['cards', 'link', 'pdf'] as ProductCatalogPreviewTab[]).map((tab) => (
        <button key={tab} type="button" onClick={() => onActiveTabChange(tab)} className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold ${activeTab === tab ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
          {tab === 'cards' ? 'Produtos' : tab === 'link' ? 'Link do catálogo' : 'PDF'}
        </button>
      ))}
    </div>
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
      <label className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3 text-sm dark:border-slate-800">
        <span className="font-medium">Ocultar preços na prévia e no PDF</span>
        <input type="checkbox" checked={preparedSelection.hidePrices} onChange={(event) => onHidePricesChange(event.target.checked)} className="h-4 w-4 accent-emerald-600" />
      </label>

      {activeTab === 'cards' && (
        <>
          {onSelectionPrepared && (
            <fieldset className="space-y-2 rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
              <legend className="px-1 text-sm font-bold">Como enviar pelo WhatsApp</legend>
              <label className="flex cursor-pointer items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900">
                <input
                  type="radio"
                  value="link"
                  {...registerDeliveryMode()}
                  className="mt-0.5 accent-emerald-600"
                />
                <span><strong>Link do catálogo</strong><span className="mt-0.5 block text-xs text-slate-500">Mantém a seleção completa, inclusive listas grandes.</span></span>
              </label>
              <label className={`flex items-start gap-2 rounded-xl p-3 text-sm ${canUseNativeDelivery ? 'cursor-pointer bg-slate-50 dark:bg-slate-900' : 'cursor-not-allowed bg-slate-100 opacity-60 dark:bg-slate-900/60'}`}>
                <input
                  type="radio"
                  value="native"
                  disabled={!canUseNativeDelivery}
                  {...registerDeliveryMode()}
                  className="mt-0.5 accent-emerald-600"
                />
                <span><strong>{nativeProductCount === 1 ? 'Card de produto nativo' : 'Lista nativa de produtos'}</strong><span className="mt-0.5 block text-xs text-slate-500">Exibe foto, nome e preço do catálogo conectado à conta do WhatsApp.</span></span>
              </label>
              {nativeDisabledReason && <p className="text-xs text-amber-700 dark:text-amber-300">{nativeDisabledReason}</p>}
              <p className="text-xs text-slate-500">Os produtos precisam estar sincronizados e publicados no catálogo da Meta. O envio nativo exige a janela de atendimento aberta.</p>
            </fieldset>
          )}
          {preparedSelection.bulkScope && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
              <p className="text-sm font-bold">Seleção dinâmica da lista</p>
              <p className="mt-1 text-sm">Até {Math.max(0, preparedSelection.bulkScope.total - preparedSelection.bulkScope.excludedProductIds.length)} produtos {preparedSelection.bulkScope.filters.categoryId ? `de ${preparedSelection.bulkScope.categoryName}` : 'com os filtros escolhidos'}.</p>
              <p className="mt-2 text-xs text-blue-800 dark:text-blue-200">No envio, serão considerados os produtos que corresponderem a estes filtros naquele momento. O servidor revalidará os preços e a disponibilidade.</p>
            </div>
          )}
          {preparedSelection.items.map((item) => (
            <article key={itemKey(item)} className="flex gap-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
              {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-16 w-16 rounded-xl bg-slate-100 object-cover dark:bg-slate-800" /> : <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800"><i className="bi bi-image" /></div>}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{item.name}</p>
                {item.variationName && <p className="text-xs text-slate-500">{item.variationName}</p>}
                {!preparedSelection.hidePrices && <p className="mt-1 text-sm font-bold text-emerald-700 dark:text-emerald-300">{formatPrice(item.price)}</p>}
                <a href={catalogItemUrl(item)} target="_blank" rel="noreferrer" className="mt-1 inline-block truncate text-xs text-blue-700 underline dark:text-blue-300">Abrir produto no catálogo</a>
              </div>
            </article>
          ))}
          {(!preparedSelection.items.length && !preparedSelection.bulkScope) && <p className="text-sm text-slate-500">Nenhum produto nesta seleção.</p>}
          {onSelectionPrepared && <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">Os produtos serão adicionados como anexos pendentes no compositor. Nenhuma mensagem será enviada nesta etapa.</p>}
          {onSelectionPrepared && !canAddSelectionToConversation && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">Esta seleção é grande demais para gerar um link do catálogo. Divida em grupos menores ou selecione uma categoria para compartilhar a lista completa.</p>}
        </>
      )}

      {activeTab === 'link' && (
        <div className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"><i className="bi bi-link-45deg text-2xl" aria-hidden="true" /></div>
          <h3 className="text-base font-bold">Link da seleção no catálogo</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">O cliente poderá navegar pelos produtos selecionados. A lista de categoria é preservada no link, mesmo quando há mais itens do que os carregados na tela.</p>
          {activeLink ? (
            <>
              <input readOnly value={activeLink} aria-label="Link da seleção do catálogo" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900" />
              <button type="button" onClick={() => void onCopy(activeLink, 'Link do catálogo copiado.')} className="w-full rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800">Copiar link</button>
            </>
          ) : (
            <p role="status" className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">A seleção é grande demais para um link confiável. Selecione uma categoria inteira ou divida os produtos em grupos menores.</p>
          )}
          {preparedSelection.hidePrices && <p className="text-xs text-amber-700 dark:text-amber-300">O preço fica oculto nesta lista; o catálogo público pode exibir o preço atual nas páginas individuais.</p>}
        </div>
      )}

      {activeTab === 'pdf' && (
        <div className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"><i className="bi bi-file-earmark-pdf text-2xl" aria-hidden="true" /></div>
          <h3 className="text-base font-bold">Catálogo em PDF</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Gera páginas com foto, nome, descrição e preço público vigente dos produtos selecionados.</p>
          {preparedSelection.bulkScope ? (
            <p className="rounded-xl bg-blue-50 p-3 text-xs text-blue-900 dark:bg-blue-950/40 dark:text-blue-200">Uma seleção de lista completa pode conter centenas de itens. Use o link do catálogo para manter o escopo completo; o PDF está disponível para itens escolhidos individualmente.</p>
          ) : (
            <button type="button" onClick={() => void onGeneratePdf()} disabled={!preparedSelection.items.length || isGeneratingPdf} className="w-full rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-50">
              {isGeneratingPdf ? `Gerando PDF… ${pdfProgress}%` : hasPdfDestination ? 'Adicionar PDF à conversa' : 'Gerar e baixar PDF'}
            </button>
          )}
          {previewFeedback && <p role="status" className="text-xs text-emerald-700 dark:text-emerald-300">{previewFeedback}</p>}
        </div>
      )}
      {previewFeedback && activeTab !== 'pdf' && <p role="status" className="text-xs text-emerald-700 dark:text-emerald-300">{previewFeedback}</p>}
    </div>
    <footer className="flex shrink-0 items-center justify-between border-t border-slate-200 p-4 dark:border-slate-800">
      <span className="text-xs text-slate-500">A seleção só será aplicada ao confirmar abaixo.</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Fechar</button>
        {onSelectionPrepared && <button type="button" disabled={!canAddSelectionToConversation} onClick={() => { onSelectionPrepared(preparedSelection, activeLink); onClose(); }} className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">{selectionActionLabel}</button>}
      </div>
    </footer>
  </>
);
