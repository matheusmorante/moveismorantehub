import type React from 'react';

interface ChatComposerAttachmentMenuProps {
  menuRef: React.RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  canShareCommercialInfo: boolean;
  canCreateOrders: boolean;
  hasCustomer: boolean;
  onToggle: () => void;
  onOpenCatalog: () => void;
  onChooseMedia: () => void;
  onChooseDocument: () => void;
  onOpenOrderPicker: () => void;
  onNewSalesOrder: () => void;
  onNewBudget: () => void;
  onAddStoreContact: () => void;
  onOpenSnippets: () => void;
}

export const ChatComposerAttachmentMenu: React.FC<ChatComposerAttachmentMenuProps> = ({
  menuRef,
  isOpen,
  canShareCommercialInfo,
  canCreateOrders,
  hasCustomer,
  onToggle,
  onOpenCatalog,
  onChooseMedia,
  onChooseDocument,
  onOpenOrderPicker,
  onNewSalesOrder,
  onNewBudget,
  onAddStoreContact,
  onOpenSnippets,
}) => (
  <div ref={menuRef} className="relative shrink-0 self-end">
    <button
      type="button"
      onClick={onToggle}
      aria-label="Abrir menu de anexos"
      aria-expanded={isOpen}
      title="Anexar conteúdo"
      className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      <i className={`bi ${isOpen ? 'bi-x-lg' : 'bi-plus-lg'} text-xl`} />
    </button>
    {isOpen && (
      <div
        role="menu"
        aria-label="Anexos e catálogo"
        className={`absolute bottom-12 left-0 z-40 rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900 ${canCreateOrders
          ? 'grid w-[36rem] max-w-[calc(100vw-4.5rem)] grid-cols-1 gap-2 p-2 sm:grid-cols-2'
          : 'w-64 p-1.5'}`}
      >
        <div role="group" aria-label="Anexar conteúdo" className={canCreateOrders ? 'min-w-0 sm:border-r sm:border-slate-100 sm:pr-2 dark:border-slate-800' : ''}>
        <button
          type="button"
          role="menuitem"
          onClick={onOpenCatalog}
          className="flex w-full items-center gap-3 rounded-xl bg-emerald-50 px-3 py-2.5 text-left text-sm font-semibold text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-950/70"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm dark:bg-slate-800 dark:text-emerald-300">
            <i className="bi bi-box-seam text-lg" />
          </span>
          <span>
            Catálogo de produtos
            <small className="block text-xs font-normal opacity-75">Selecionar um ou vários produtos</small>
          </span>
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={onChooseMedia}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <i className="bi bi-images w-9 text-center text-lg text-blue-600" />
          <span>
            Fotos e vídeos<small className="block text-xs text-slate-400">JPG, PNG ou MP4 · até 4 MB cada</small>
          </span>
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={onChooseDocument}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <i className="bi bi-file-earmark-text w-9 text-center text-lg text-rose-600" />
          <span>
            Documentos e áudio<small className="block text-xs text-slate-400">PDF, planilhas, OGG, MP3 e outros</small>
          </span>
        </button>
        <button
          type="button"
          role="menuitem"
          disabled={!canShareCommercialInfo || !hasCustomer}
          onClick={onOpenOrderPicker}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <i className="bi bi-receipt w-9 text-center text-lg text-amber-600" />
          <span>
            Pedidos e orçamentos<small className="block text-xs text-slate-400">Preparar resumo em PDF</small>
          </span>
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={onAddStoreContact}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <i className="bi bi-person-vcard w-9 text-center text-lg text-violet-600" />
          <span>
            Contato da loja<small className="block text-xs text-slate-400">Compartilhar telefone comercial</small>
          </span>
        </button>
        <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
        <button
          type="button"
          role="menuitem"
          onClick={onOpenSnippets}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <i className="bi bi-lightning-charge w-9 text-center text-amber-500" />
          Respostas rápidas
        </button>
        </div>
        {canCreateOrders && (
          <div role="group" aria-label="Criar pedido ou orçamento" className="flex min-w-0 flex-col gap-1 border-t border-slate-100 pt-2 dark:border-slate-800 sm:border-t-0 sm:pl-2 sm:pt-0">
            <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Criar novo</p>
            <button
              type="button"
              role="menuitem"
              onClick={onNewSalesOrder}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-slate-200 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-200"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"><i className="bi bi-cart-plus text-lg" aria-hidden="true" /></span>
              <span>Novo pedido de venda<small className="block text-xs font-normal text-slate-400">Abrir formulário de venda</small></span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={onNewBudget}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-800 dark:text-slate-200 dark:hover:bg-blue-950/40 dark:hover:text-blue-200"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"><i className="bi bi-file-earmark-plus text-lg" aria-hidden="true" /></span>
              <span>Novo orçamento<small className="block text-xs font-normal text-slate-400">Abrir formulário de orçamento</small></span>
            </button>
          </div>
        )}
      </div>
    )}
  </div>
);
