interface NfeRecipientDocumentInfoModalProps {
  onClose: () => void;
}

export const NfeRecipientDocumentInfoModal = ({
  onClose,
}: NfeRecipientDocumentInfoModalProps) => (
  <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4">
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
      aria-hidden="true"
    />
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="nfe-doc-info-modal-title"
      className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:border dark:border-slate-800 animate-in zoom-in-95 duration-150"
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <i className="bi bi-info-circle-fill text-sm" />
          </div>
          <h3
            id="nfe-doc-info-modal-title"
            className="text-sm font-bold text-slate-800 dark:text-slate-100"
          >
            Documento Fiscal do Destinatário
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          aria-label="Fechar informações"
        >
          <i className="bi bi-x-lg text-sm" />
        </button>
      </div>

      <div className="mt-4 space-y-3.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
          <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-1">
            <i className="bi bi-pencil-square text-blue-500" />
            Emissão Pontual
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            O CPF ou CNPJ informado ou editado neste campo será transmitido exclusivamente
            nesta nota fiscal e não altera o cadastro principal do cliente no ERP.
          </p>
        </div>

        <div className="space-y-2">
          <h5 className="font-bold text-slate-700 dark:text-slate-200 text-xs">
            Regras de obrigatoriedade de identificação do destinatário na NFC-e 65 e NF-e 55:
          </h5>
          <ul className="space-y-2 text-[11px] list-disc list-inside pl-1 text-slate-600 dark:text-slate-300">
            <li>
              <strong className="text-slate-700 dark:text-slate-200">
                NF-e (modelo 55):
              </strong>{' '}
              Nesta emissão de venda doméstica normal, PF usa CPF e PJ usa CNPJ. Operações
              especiais ou com destinatário estrangeiro seguem uma matriz fiscal própria.
            </li>
            <li>
              <strong className="text-slate-700 dark:text-slate-200">
                NFC-e (modelo 65) - Valor igual ou superior a R$ 10.000,00:
              </strong>{' '}
              Identificação obrigatória, inclusive exatamente em R$ 10.000,00.
            </li>
            <li>
              <strong className="text-slate-700 dark:text-slate-200">
                NFC-e presencial (indPres 1 ou 5) abaixo de R$ 10.000,00:
              </strong>{' '}
              CPF/CNPJ pode ficar vazio se o comprador não solicitar identificação. Se for
              informado, continua sujeito à validação.
            </li>
            <li>
              <strong className="text-slate-700 dark:text-slate-200">
                NFC-e não presencial, inclusive entrega em domicílio:
              </strong>{' '}
              CPF/CNPJ e endereço do destinatário são obrigatórios em qualquer valor. Para
              entrega em domicílio, o XML usa indPres=4. Desde 03/08/2026, a regra inclui
              também as demais operações não presenciais.
            </li>
            <li>
              <strong className="text-slate-700 dark:text-slate-200">
                Entrega pela própria loja:
              </strong>{' '}
              O frete é modFrete=3. Isso não exige cadastrar transportadora terceirizada.
            </li>
            <li>
              <strong className="text-slate-700 dark:text-slate-200">
                Indicador de Obrigatoriedade:
              </strong>{' '}
              O asterisco vermelho (<span className="text-rose-500 font-bold">*</span>)
              sinaliza que o documento é indispensável para autorização da operação fiscal
              atual.
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 transition-colors"
        >
          Entendido
        </button>
      </div>
    </div>
  </div>
);
