import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { canIssueCce } from '@/pages/utils/nfe/nfeService';
import type {
  CancellationEligibility,
  NfeDocumentRecord,
} from '../types/fiscalDocuments.types';

interface FiscalDocumentRowActionsProps {
  document: NfeDocumentRecord;
  isDetailsOpen: boolean;
  canOperateFiscal: boolean;
  cancellationEligibility?: CancellationEligibility;
  retryingHmlDocumentId?: string | null;
  onViewDetails: () => void;
  onToggleDetails: () => void;
  onPrintDanfe: () => void;
  onDownloadXml: () => void;
  onConsultSituation: () => void;
  onOpenCce: () => void;
  onOpenFiscalTreatment: () => void;
  onPrepareLinkedOperation: () => void;
  onRetryHml: () => void;
}

interface MenuPosition {
  top: number;
  left: number;
  ready: boolean;
}

export const FiscalDocumentRowActions: React.FC<FiscalDocumentRowActionsProps> = ({
  document: fiscalDocument,
  isDetailsOpen,
  canOperateFiscal,
  cancellationEligibility,
  retryingHmlDocumentId,
  onViewDetails,
  onToggleDetails,
  onPrintDanfe,
  onDownloadXml,
  onConsultSituation,
  onOpenCce,
  onOpenFiscalTreatment,
  onPrepareLinkedOperation,
  onRetryHml,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({
    top: 0,
    left: 0,
    ready: false,
  });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;

      const triggerRect = trigger.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const margin = 8;
      const viewportWidth = globalThis.window.innerWidth;
      const viewportHeight = globalThis.window.innerHeight;
      const left = Math.max(
        margin,
        Math.min(triggerRect.right - menuRect.width, viewportWidth - menuRect.width - margin)
      );
      const fitsBelow = triggerRect.bottom + menuRect.height + margin <= viewportHeight;
      const top = fitsBelow
        ? triggerRect.bottom + 4
        : Math.max(margin, triggerRect.top - menuRect.height - 4);

      setMenuPosition({ top, left, ready: true });
    };

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        (triggerRef.current?.contains(target) || menuRef.current?.contains(target))
      ) {
        return;
      }
      setIsOpen(false);
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsOpen(false);
      triggerRef.current?.focus();
    };

    updatePosition();
    globalThis.window.addEventListener('resize', updatePosition);
    globalThis.window.addEventListener('scroll', updatePosition, true);
    globalThis.document.addEventListener('pointerdown', closeOnOutsidePointer);
    globalThis.document.addEventListener('keydown', closeOnEscape);

    return () => {
      globalThis.window.removeEventListener('resize', updatePosition);
      globalThis.window.removeEventListener('scroll', updatePosition, true);
      globalThis.document.removeEventListener('pointerdown', closeOnOutsidePointer);
      globalThis.document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  const runAction = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  const menu = isOpen ? (
    <div
      ref={menuRef}
      role="menu"
      aria-label={`Ações da NF-e ${fiscalDocument.numero_nfe}`}
      className="fixed z-[1000010] grid max-h-[calc(100vh-1rem)] min-w-48 gap-0.5 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900"
      style={{
        top: `${menuPosition.top}px`,
        left: `${menuPosition.left}px`,
        visibility: menuPosition.ready ? 'visible' : 'hidden',
      }}
    >
      <button
        type="button"
        role="menuitem"
        onClick={() => runAction(onViewDetails)}
        className="rounded px-2 py-1.5 text-left text-[11px] hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        Ver detalhes
      </button>

      <button
        type="button"
        role="menuitem"
        onClick={() => runAction(onToggleDetails)}
        className="rounded px-2 py-1.5 text-left text-[11px] hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        {isDetailsOpen ? 'Fechar detalhes' : 'Detalhes fiscais'}
      </button>

      <button
        type="button"
        role="menuitem"
        onClick={() => runAction(onPrintDanfe)}
        className="rounded px-2 py-1.5 text-left text-[11px] hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        Visualizar / imprimir DANFE
      </button>

      <button
        type="button"
        role="menuitem"
        onClick={() => runAction(onDownloadXml)}
        className="rounded px-2 py-1.5 text-left text-[11px] hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        Baixar XML autorizado
      </button>

      {fiscalDocument.status !== 'cancelada' && (
        <button
          type="button"
          role="menuitem"
          onClick={() => runAction(onConsultSituation)}
          className="rounded px-2 py-1.5 text-left text-[11px] hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          Consultar situação na SEFAZ
        </button>
      )}

      {canIssueCce(fiscalDocument).canIssue && (
        <button
          type="button"
          role="menuitem"
          onClick={() => runAction(onOpenCce)}
          className="rounded px-2 py-1.5 text-left text-[11px] hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          Carta de Correção (CC-e)
        </button>
      )}

      {fiscalDocument.order_id &&
        fiscalDocument.document_type === 'outbound' &&
        cancellationEligibility?.canProceed && (
          <button
            type="button"
            role="menuitem"
            onClick={() => runAction(onOpenFiscalTreatment)}
            className={`rounded px-2 py-1.5 text-left text-[11px] font-semibold ${
              cancellationEligibility.action === 'cancel'
                ? 'text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40'
                : 'text-violet-700 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-950/40'
            }`}
          >
            {cancellationEligibility.action === 'cancel'
              ? 'Cancelar NF-e'
              : 'Aplicar política fiscal (estorno)'}
          </button>
        )}

      {!fiscalDocument.order_id &&
        fiscalDocument.modelo === '55' &&
        fiscalDocument.document_type === 'outbound' &&
        ['autorizada', 'homologada'].includes(fiscalDocument.status) && (
          <button
            type="button"
            role="menuitem"
            onClick={() => runAction(onPrepareLinkedOperation)}
            className="rounded px-2 py-1.5 text-left text-[11px] hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Preparar operação fiscal vinculada
          </button>
        )}

      {canOperateFiscal &&
        fiscalDocument.ambiente === 2 &&
        fiscalDocument.fiscal_ruleset_version?.startsWith('HML_') &&
        ['pendente', 'erro'].includes(fiscalDocument.status) && (
          <button
            type="button"
            role="menuitem"
            onClick={() => runAction(onRetryHml)}
            disabled={Boolean(retryingHmlDocumentId)}
            className="rounded px-2 py-1.5 text-left text-[11px] text-amber-700 hover:bg-amber-50 disabled:opacity-50 dark:text-amber-300 dark:hover:bg-amber-950/40"
          >
            {retryingHmlDocumentId === fiscalDocument.id
              ? 'Verificando…'
              : 'Verificar e retomar HML'}
          </button>
        )}
    </div>
  ) : null;

  const portalTarget = typeof globalThis.document === 'undefined' ? null : globalThis.document.body;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Ações da NF-e ${fiscalDocument.numero_nfe}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="rounded px-2 py-1 text-lg leading-none text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        ⋯
      </button>
      {portalTarget && menu ? createPortal(menu, portalTarget) : null}
    </>
  );
};
