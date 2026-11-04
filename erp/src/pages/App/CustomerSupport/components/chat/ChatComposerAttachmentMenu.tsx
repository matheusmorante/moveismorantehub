import type React from 'react';

interface ChatComposerAttachmentMenuProps {
  menuRef: React.RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  canShareCommercialInfo: boolean;
  hasCustomer: boolean;
  onToggle: () => void;
  onOpenCatalog: () => void;
  onChooseMedia: () => void;
  onChooseDocument: () => void;
  onOpenOrderPicker: () => void;
  onAddStoreContact: () => void;
  onOpenSnippets: () => void;
}

export const ChatComposerAttachmentMenu: React.FC<ChatComposerAttachmentMenuProps> = ({
  menuRef,
  isOpen,
  canShareCommercialInfo,
  hasCustomer,
  onToggle,
  onOpenCatalog,
  onChooseMedia,
  onChooseDocument,
  onOpenOrderPicker,
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
        className="absolute bottom-12 left-0 z-40 w-64 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
      >
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
    )}
  </div>
);
