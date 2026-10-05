import type React from 'react';
import { useEffect, useState } from 'react';
import type Order from '@/pages/types/order.type';
import {
  formatRecipientTaxId,
  isValidRecipientTaxId,
  recipientTaxIdKind,
} from '../../../../../../../shared-utils/recipientTaxId';

interface NfeCustomerTabProps {
  order: Order;
  customerPersonType?: 'PF' | 'PJ';
  isIdentityOptional: boolean;
  recipientTaxId: string;
  onRecipientTaxIdChange: (val: string) => void;
  onRecipientTaxIdBlur?: () => void;
  recipientTaxIdError: string | null;
  recipientTaxIdInputRef: React.RefObject<HTMLInputElement>;
  disabled?: boolean;
  documentType?: 'CPF' | 'CNPJ' | 'CPF/CNPJ';
  requirementMessage?: string | null;
}

const maskTaxId = (value: string, personType?: 'PF' | 'PJ') => {
  if (personType === 'PJ' || /[a-z]/i.test(value))
    return formatRecipientTaxId(value, 'PJ');
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length > 11) {
    if (digits.length > 12)
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
    if (digits.length > 8)
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    if (digits.length > 5) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    if (digits.length > 2) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    return digits;
  }
  if (digits.length > 9)
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  if (digits.length > 6) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  if (digits.length > 3) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  return digits;
};

export const NfeCustomerTab: React.FC<NfeCustomerTabProps> = ({
  order,
  customerPersonType,
  isIdentityOptional,
  recipientTaxId,
  onRecipientTaxIdChange,
  onRecipientTaxIdBlur,
  recipientTaxIdError,
  recipientTaxIdInputRef,
  disabled = false,
  documentType,
  requirementMessage,
}) => {
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const customer = order.customerData;
  const address = customer?.fullAddress;
  const hasAddress = Boolean(address?.street || address?.city);

  const hasValidDocument = isValidRecipientTaxId(recipientTaxId);
  const effectivePersonType =
    customerPersonType ||
    (customer?.personType === 'PF' || customer?.personType === 'PJ'
      ? customer.personType
      : undefined);
  const inferredDocumentType = recipientTaxIdKind(recipientTaxId);
  const isPJ = effectivePersonType === 'PJ' || inferredDocumentType === 'CNPJ';
  const isPF = effectivePersonType === 'PF' || inferredDocumentType === 'CPF';
  const docLabel =
    documentType || (isPJ ? 'CNPJ' : isPF ? 'CPF' : 'CPF/CNPJ');
  const personLabel = isPJ
    ? 'Pessoa Jurídica (PJ)'
    : isPF
      ? 'Pessoa Física (PF)'
      : 'Tipo de pessoa não determinado';

  // Lógica de status e explicação de identificação
  let identificationStatus: {
    label: string;
    variant: 'neutral' | 'required' | 'identified';
    explanation: string;
  };

  if (hasValidDocument) {
    identificationStatus = {
      label: 'Identificado',
      variant: 'identified',
      explanation: isIdentityOptional
        ? 'Documento opcional informado e validado para esta emissão.'
        : requirementMessage || 'Documento obrigatório preenchido para autorização da SEFAZ.',
    };
  } else if (!isIdentityOptional) {
    identificationStatus = {
      label: 'Identificação obrigatória',
      variant: 'required',
      explanation: requirementMessage || 'Informe o documento do destinatário para esta operação.',
    };
  } else {
    identificationStatus = {
      label: 'Identificação não exigida',
      variant: 'neutral',
      explanation: 'Documento opcional nesta NFC-e; se informado, será validado.',
    };
  }

  useEffect(() => {
    if (!isInfoModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsInfoModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInfoModalOpen]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Dados Cadastrais do Destinatário */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
              Destinatário da Nota Fiscal
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Dados identificadores do comprador registrados no pedido
            </p>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
            {personLabel}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Nome / Razão Social
            </span>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              {customer?.fullName || 'Não informado'}
            </p>
          </div>

          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Telefone de Contato
            </span>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-0.5">
              {customer?.phone || 'Não informado'}
            </p>
          </div>

          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              E-mail
            </span>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-0.5 truncate">
              {customer?.email || 'Não informado'}
            </p>
          </div>
        </div>

        {/* Endereço do Destinatário */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Endereço do Destinatário
          </span>
          {hasAddress ? (
            <div className="mt-1 text-xs text-slate-700 dark:text-slate-200 flex flex-wrap gap-x-2 gap-y-1">
              <span className="font-semibold">
                {address?.street}, {address?.number}
              </span>
              {address?.complement && <span>• {address.complement}</span>}
              {address?.neighborhood && <span>• Bairro {address.neighborhood}</span>}
              <span>
                • {address?.city} - {address?.state}
              </span>
              {address?.cep && (
                <span className="font-mono text-slate-500">• CEP {address.cep}</span>
              )}
            </div>
          ) : (
            <p className="mt-1 text-xs text-slate-500 italic">
              Nenhum endereço completo cadastrado no pedido (comum em retiradas no balcão).
            </p>
          )}
        </div>
      </section>

      {/* Edição / Confirmação do Documento Fiscal (CPF ou CNPJ) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <i className="bi bi-shield-check text-blue-600 dark:text-blue-400 text-base" />
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
              Documento Fiscal do Destinatário
            </h4>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${
                identificationStatus.variant === 'identified'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50'
                  : identificationStatus.variant === 'required'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50'
                    : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
              }`}
            >
              {identificationStatus.label}
            </span>
            <button
              type="button"
              onClick={() => setIsInfoModalOpen(true)}
              className="inline-flex items-center justify-center w-5 h-5 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 dark:hover:text-blue-400 transition-colors"
              title="Regras de obrigatoriedade de identificação do destinatário na NFC-e 65 e NF-e 55"
              aria-label="Informações sobre o documento fiscal do destinatário"
            >
              <i className="bi bi-info-circle text-xs" />
            </button>
          </div>
        </div>

        <div className="mt-4 max-w-md">
          <label
            htmlFor="nfe-recipient-tax-id"
            className={`block text-xs font-bold mb-1.5 ${
              recipientTaxIdError
                ? 'text-rose-700 dark:text-rose-300'
                : 'text-slate-700 dark:text-slate-200'
            }`}
          >
            {docLabel}
            {!isIdentityOptional && (
              <span
                className="text-rose-500 ml-1 font-bold"
                aria-hidden="true"
                title="Campo obrigatório"
              >
                *
              </span>
            )}
          </label>
          <input
            id="nfe-recipient-tax-id"
            ref={recipientTaxIdInputRef}
            aria-invalid={Boolean(recipientTaxIdError)}
            inputMode={docLabel === 'CNPJ' || docLabel === 'CPF/CNPJ' ? 'text' : 'numeric'}
            autoComplete="off"
            disabled={disabled}
            value={maskTaxId(recipientTaxId, effectivePersonType)}
            onChange={(event) =>
              onRecipientTaxIdChange(maskTaxId(event.target.value, effectivePersonType))
            }
            onBlur={onRecipientTaxIdBlur}
            placeholder={`Insira o ${docLabel}`}
            aria-describedby={recipientTaxIdError ? 'nfe-recipient-tax-id-error' : undefined}
            className={`w-full rounded-none border-0 border-b-2 bg-white px-3 py-2 font-mono text-sm outline-none transition-all dark:bg-slate-900 ${
              recipientTaxIdError
                ? 'border-rose-500 focus:border-rose-600'
                : 'border-slate-200 focus:border-blue-600 dark:border-slate-700 dark:focus:border-blue-500'
            }`}
          />
          {recipientTaxIdError ? (
            <p
              id="nfe-recipient-tax-id-error"
              role="alert"
              className="mt-1.5 text-xs font-medium text-rose-700 dark:text-rose-300 flex items-center gap-1.5"
            >
              <i className="bi bi-exclamation-circle-fill" />
              {recipientTaxIdError}
            </p>
          ) : (
            <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              {identificationStatus.explanation}
            </p>
          )}
        </div>
      </section>

      {/* Modal de Informações e Regras de Obrigatoriedade do Documento Fiscal */}
      {isInfoModalOpen && (
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={() => setIsInfoModalOpen(false)}
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
                onClick={() => setIsInfoModalOpen(false)}
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
                onClick={() => setIsInfoModalOpen(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
