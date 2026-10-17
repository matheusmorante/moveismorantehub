import React from 'react';
import Order from '../../../../types/order.type';
import {
  PostOrderButtonConfig,
  resolvePostOrderButtonColorClass,
} from '../postOrderActionsHelpers';

interface PostOrderActionGridButtonProps {
  readonly btn: PostOrderButtonConfig;
  readonly order: Order;
  readonly isClicked: boolean;
  readonly isNfeIssued: boolean;
  readonly isAdministrator: boolean;
  readonly onIssueNfeClick: () => void;
  readonly onOpenWarrantyTerm: () => void;
  readonly onOpenPromissoryNote?: () => void;
  readonly onExecuteAction: (
    key: string,
    action: PostOrderButtonConfig['action']
  ) => void | Promise<void>;
}

export const PostOrderActionGridButton: React.FC<PostOrderActionGridButtonProps> = ({
  btn,
  order,
  isClicked,
  isNfeIssued,
  isAdministrator,
  onIssueNfeClick,
  onOpenWarrantyTerm,
  onOpenPromissoryNote,
  onExecuteAction,
}) => {
  const baseColor = resolvePostOrderButtonColorClass(btn.color);
  const isIssueNfeBtn = btn.key === 'issueNfe';
  const isAdminOnlyBtn = Boolean(
    (btn as { adminOnly?: boolean }).adminOnly || btn.key === 'sendCustomerOrderDirectApi'
  );
  const isMissingAdmin = isAdminOnlyBtn && !isAdministrator;
  const isButtonDisabled = (isIssueNfeBtn && isNfeIssued) || isMissingAdmin;

  const tooltipText = isMissingAdmin
    ? 'Disponível apenas para administradores (Beta)'
    : isButtonDisabled
      ? 'Nota fiscal já emitida para este pedido.'
      : btn.tooltip || undefined;

  const isBeta = Boolean(
    (btn as { isBeta?: boolean }).isBeta || btn.key === 'sendCustomerOrderDirectApi'
  );

  return (
    <button
      type="button"
      disabled={isButtonDisabled}
      title={tooltipText}
      onClick={async () => {
        if (isButtonDisabled) return;
        if (btn.key === 'issueNfe') {
          onIssueNfeClick();
          return;
        }
        if (btn.key === 'printWarrantyTerm') {
          onOpenWarrantyTerm();
          return;
        }
        if (btn.key === 'printPromissoryNote') {
          if (onOpenPromissoryNote) {
            onOpenPromissoryNote();
          }
          await onExecuteAction(btn.key, btn.action);
          return;
        }
        await onExecuteAction(btn.key, btn.action);
      }}
      className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all relative min-h-[100px] ${
        isButtonDisabled
          ? 'opacity-40 cursor-not-allowed text-slate-400 bg-slate-100 dark:bg-slate-800/40 dark:text-slate-500 border-slate-200 dark:border-slate-800 pointer-events-auto'
          : `${baseColor} hover:-translate-y-1 hover:shadow-lg border-slate-100 dark:border-slate-800`
      } ${isClicked ? 'ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-slate-900' : ''}`}
    >
      <i className={`bi ${btn.icon} text-2xl mb-2`}></i>
      <div className="flex flex-col items-center gap-1">
        <span className="text-[10px] font-black uppercase tracking-widest text-center">
          {typeof btn.label === 'function' ? btn.label(order) : btn.label}
        </span>
        {isBeta && (
          <span className="px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest rounded bg-amber-200 text-[#3b1900] border border-amber-400 dark:bg-amber-800 dark:text-amber-100 dark:border-amber-600 shadow-xs">
            BETA
          </span>
        )}
      </div>

      {isClicked && (
        <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-lg animate-in zoom-in duration-300">
          <i className="bi bi-check text-sm font-black"></i>
        </div>
      )}
    </button>
  );
};
