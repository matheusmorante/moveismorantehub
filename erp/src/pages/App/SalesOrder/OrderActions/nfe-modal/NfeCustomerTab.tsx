import type React from 'react';
import { useEffect, useState } from 'react';
import type Order from '@/pages/types/order.type';
import { NfeRecipientDocumentInfoModal } from './components/NfeRecipientDocumentInfoModal';
import {
  formatRecipientTaxId,
  isValidRecipientTaxId,
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
  recipientIe?: string;
  onRecipientIeChange?: (val: string) => void;
  recipientIeIndicator?: '1' | '2' | '9';
  onRecipientIeIndicatorChange?: (val: '1' | '2' | '9') => void;
  recipientIeError?: string | null;
  recipientIeIndicatorError?: string | null;
  fiscalModel?: '55' | '65';
}

const maskTaxId = (value: string, personType?: 'PF' | 'PJ') => {
  if (personType === 'PJ' || (personType !== 'PF' && /[a-z]/i.test(value)))
    return formatRecipientTaxId(value, 'PJ');
  const digits = value.replace(/\D/g, '').slice(0, personType === 'PF' ? 11 : 14);
  if (personType !== 'PF' && digits.length > 11) {
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
  recipientIe = '',
  onRecipientIeChange,
  recipientIeIndicator = '9',
  onRecipientIeIndicatorChange,
  recipientIeError,
  recipientIeIndicatorError,
  fiscalModel = '55',
}) => {
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const customer = order.customerData;
  const address = customer?.fullAddress;
  const hasAddress = Boolean(address?.street || address?.city);

  const fallbackIe = customer?.ie || (customer as any)?.rgIe || '';
  const effectiveIe = recipientIe || fallbackIe;
  const effectiveIeIndicator: '1' | '2' | '9' =
    fiscalModel === '65'
      ? '9'
      : recipientIeIndicator ||
        order.fiscalContext?.recipientIeIndicator ||
        customer?.ieIndicator ||
        (fallbackIe.trim() ? '1' : '9');

  const hasValidDocument = isValidRecipientTaxId(recipientTaxId);
  const effectivePersonType =
    customerPersonType ||
    (customer?.personType === 'PF' || customer?.personType === 'PJ'
      ? customer.personType
      : undefined);
  const isPJ = effectivePersonType === 'PJ';
  const isPF = effectivePersonType === 'PF';
  const docLabel = effectivePersonType === 'PJ'
    ? 'CNPJ'
    : effectivePersonType === 'PF'
      ? 'CPF'
      : documentType || 'CPF/CNPJ';
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

      {/* Dados Fiscais do Destinatário (Situação ICMS & Inscrição Estadual) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <i className="bi bi-bank text-blue-600 dark:text-blue-400 text-base" />
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
              Dados Fiscais do Destinatário (ICMS / Inscrição Estadual)
            </h4>
          </div>
          {fiscalModel === '65' ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              NFC-e: sempre Não Contribuinte
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
              {effectiveIeIndicator === '1'
                ? 'Contribuinte ICMS'
                : effectiveIeIndicator === '2'
                  ? 'Contribuinte Isento'
                  : 'Não Contribuinte'}
            </span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
          <div>
            <label
              htmlFor="nfe-recipient-ie-indicator"
              className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5"
            >
              Situação perante o ICMS (indIEDest)
              <span className="text-rose-500 ml-1 font-bold" aria-hidden="true">*</span>
            </label>
            <select
              id="nfe-recipient-ie-indicator"
              disabled={disabled || fiscalModel === '65'}
              value={effectiveIeIndicator}
              aria-invalid={recipientIeIndicatorError ? true : undefined}
              aria-describedby={recipientIeIndicatorError ? 'nfe-recipient-ie-indicator-error' : undefined}
              onChange={(e) => onRecipientIeIndicatorChange?.(e.target.value as '1' | '2' | '9')}
              className="w-full rounded-none border-0 border-b-2 bg-white px-3 py-2 text-xs font-bold outline-none transition-all border-slate-200 focus:border-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-500"
            >
              <option value="9">9 - Não Contribuinte (Consumidor Final / sem IE)</option>
              <option value="1">1 - Contribuinte do ICMS (Possui IE obrigatória)</option>
              <option value="2">2 - Contribuinte Isento de Inscrição Estadual</option>
            </select>
            {recipientIeIndicatorError && (
              <p id="nfe-recipient-ie-indicator-error" role="alert" className="mt-1 text-xs font-bold text-rose-700 dark:text-rose-300">
                {recipientIeIndicatorError}
              </p>
            )}
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {effectiveIeIndicator === '1'
                ? 'Destinatário contribuinte: a SEFAZ exige Inscrição Estadual ativa e válida.'
                : effectiveIeIndicator === '2'
                  ? 'Contribuinte isento: a tag <IE> não é gerada no XML da NF-e 4.00.'
                  : 'Pessoa física ou jurídica não contribuinte do ICMS.'}
            </p>
          </div>

          <div>
            <label
              htmlFor="nfe-recipient-ie"
              className={`block text-xs font-bold mb-1.5 ${
                recipientIeError ? 'text-rose-700 dark:text-rose-300' : 'text-slate-700 dark:text-slate-200'
              }`}
            >
              Inscrição Estadual (IE)
              {effectiveIeIndicator === '1' && (
                <span className="text-rose-500 ml-1 font-bold" aria-hidden="true">*</span>
              )}
            </label>
            <input
              id="nfe-recipient-ie"
              type="text"
              autoComplete="off"
              disabled={disabled || effectiveIeIndicator === '2' || fiscalModel === '65'}
              value={effectiveIeIndicator === '2' ? '' : effectiveIe}
              onChange={(e) => onRecipientIeChange?.(e.target.value)}
              placeholder={
                effectiveIeIndicator === '2'
                  ? 'Dispensada para Isento'
                  : effectiveIeIndicator === '1'
                    ? 'Informe a IE obrigatória'
                    : 'Opcional (se possuir IE)'
              }
              className={`w-full rounded-none border-0 border-b-2 px-3 py-2 font-mono text-sm outline-none transition-all ${
                effectiveIeIndicator === '2' || fiscalModel === '65'
                  ? 'bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-950 dark:border-slate-800 cursor-not-allowed'
                  : recipientIeError
                    ? 'border-rose-500 bg-white dark:bg-slate-900 focus:border-rose-600'
                    : 'border-slate-200 bg-white dark:bg-slate-900 focus:border-blue-600 dark:border-slate-700 dark:focus:border-blue-500'
              }`}
            />
            {recipientIeError ? (
              <p className="mt-1.5 text-xs font-medium text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                <i className="bi bi-exclamation-circle-fill" />
                {recipientIeError}
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                {effectiveIeIndicator === '1'
                  ? 'Obrigatório para contribuinte do ICMS.'
                  : effectiveIeIndicator === '2'
                    ? 'Dispensada no XML oficial da SEFAZ para indIEDest=2.'
                    : 'Não contribuinte: informe apenas se a PJ possuir IE cadastrada.'}
              </p>
            )}
          </div>
        </div>
      </section>

      {isInfoModalOpen && (
        <NfeRecipientDocumentInfoModal onClose={() => setIsInfoModalOpen(false)} />
      )}
    </div>
  );
};
