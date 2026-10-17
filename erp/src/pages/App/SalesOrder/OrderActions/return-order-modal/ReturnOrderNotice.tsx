import React from 'react';

interface ReturnOrderNoticeProps {
  fiscalCapacityLoaded: boolean;
  returnDataError: string | null;
  fiscalCapacityError: string | null;
  hasAuthorizedInvoice: boolean;
  collectAtAddress: boolean | null;
}

export const ReturnOrderNotice: React.FC<ReturnOrderNoticeProps> = ({
  fiscalCapacityLoaded,
  returnDataError,
  fiscalCapacityError,
  hasAuthorizedInvoice,
  collectAtAddress,
}) => {
  if (returnDataError) {
    return (
      <p
        role="alert"
        className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
      >
        {returnDataError}
      </p>
    );
  }

  if (!fiscalCapacityLoaded) return null;

  return (
    <aside
      role="status"
      aria-live="polite"
      className={`rounded-xl border p-4 text-sm leading-relaxed ${
        fiscalCapacityError && hasAuthorizedInvoice
          ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-200'
          : hasAuthorizedInvoice
          ? 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/20 dark:text-sky-200'
          : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300'
      }`}
    >
      {fiscalCapacityError && hasAuthorizedInvoice ? (
        <>
          <strong>Não foi possível confirmar o saldo da NF-e original autorizada.</strong> A
          conferência fiscal permanece pendente; nenhuma nota de devolução será emitida nesta etapa.
        </>
      ) : hasAuthorizedInvoice ? (
        <>
          <strong>Pedido de devolução e NF-e são etapas separadas.</strong>{' '}
          {collectAtAddress === true
            ? 'O agendamento da coleta aparecerá na agenda e no cronograma operacional. Ele não registra retorno físico nem entrada de estoque. Depois que a equipe confirmar a coleta, a entrada será registrada e, se houver NF-e autorizada na venda, a NF-e de devolução será transmitida automaticamente.'
            : collectAtAddress === false
            ? 'Esta opção confirma que o cliente já entregou os itens na loja. A entrada de estoque será registrada junto com o pedido de devolução e, se houver NF-e autorizada na venda, a NF-e de devolução será transmitida automaticamente após a gravação.'
            : 'A entrada de estoque acontece quando o cliente entrega os itens na loja ou quando a equipe confirma a coleta. Se houver NF-e autorizada na venda, a NF-e de devolução será transmitida automaticamente após o retorno físico.'}{' '}
          O protocolo da SEFAZ confirma a autorização.
        </>
      ) : (
        <div className="flex items-center gap-2">
          <i className="bi bi-info-circle text-slate-400 shrink-0 text-base" />
          <span>
            Esta venda não possui documento fiscal emitido. A devolução será registrada sem emissão
            de nota fiscal de devolução.
          </span>
        </div>
      )}
    </aside>
  );
};
