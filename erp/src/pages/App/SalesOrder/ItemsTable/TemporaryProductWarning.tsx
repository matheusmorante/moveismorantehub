import React from 'react';
import DropdownPortal from '@/components/shared/DropdownPortal';

export default function TemporaryProductWarning() {
  const anchorRef = React.useRef<HTMLButtonElement>(null);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout>>();
  const [isOpen, setIsOpen] = React.useState(false);
  const tooltipId = React.useId();
  const keepOpen = () => {
    clearTimeout(closeTimer.current);
    setIsOpen(true);
  };
  const closeSoon = () => {
    closeTimer.current = setTimeout(() => setIsOpen(false), 150);
  };
  React.useEffect(() => () => clearTimeout(closeTimer.current), []);

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        aria-label="Aviso: produto sem cadastro"
        aria-describedby={isOpen ? tooltipId : undefined}
        onMouseEnter={keepOpen}
        onMouseLeave={closeSoon}
        onFocus={keepOpen}
        onBlur={closeSoon}
        onClick={() => setIsOpen(true)}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-amber-500 hover:bg-amber-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500 dark:hover:bg-amber-950/40"
      >
        <i className="bi bi-exclamation-triangle-fill text-base" aria-hidden="true" />
      </button>
      <DropdownPortal anchorRef={anchorRef} isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <div
          id={tooltipId}
          role="tooltip"
          onMouseEnter={keepOpen}
          onMouseLeave={closeSoon}
          className="space-y-2 rounded-2xl border border-amber-200 bg-white p-4 text-xs leading-relaxed text-slate-600 shadow-xl dark:border-amber-800 dark:bg-slate-900 dark:text-slate-300"
        >
          <p className="font-bold text-amber-700 dark:text-amber-400">Produto sem cadastro</p>
          <p>Este item foi informado sem vínculo com um produto cadastrado. Enquanto estiver assim, ele não gerará movimentação de estoque ao atender a venda.</p>
          <p><strong>Antes de atender a venda:</strong> edite o item e selecione o produto correto no catálogo.</p>
          <p><strong>Se a venda já estiver atendida:</strong> use o botão de conciliação para vincular o item a um produto cadastrado. Essa conciliação atualiza o vínculo comercial nos relatórios de vendas, mas não gera movimentação retroativa de estoque.</p>
        </div>
      </DropdownPortal>
    </>
  );
}
