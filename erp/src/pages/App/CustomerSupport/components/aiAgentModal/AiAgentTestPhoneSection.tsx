import React, { memo } from 'react';
import { formatPhoneDisplay } from './phoneFormatUtils';

export interface AiAgentTestPhoneSectionProps {
  phoneNumbers: string[];
  phoneInput: string;
  phoneError: string;
  isAdministrator: boolean;
  onPhoneInputChange: (value: string) => void;
  onAddPhone: () => void;
  onRemovePhone: (index: number) => void;
}

export const AiAgentTestPhoneSection: React.FC<AiAgentTestPhoneSectionProps> = memo(({
  phoneNumbers,
  phoneInput,
  phoneError,
  isAdministrator,
  onPhoneInputChange,
  onAddPhone,
  onRemovePhone,
}) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
        <i className="bi bi-telephone-plus text-sm text-blue-600 dark:text-blue-400" aria-hidden="true" />
        Números Autorizados para Teste
      </label>
      <span className="text-xs text-slate-500 dark:text-slate-400">
        {phoneNumbers.length} cadastrado{phoneNumbers.length === 1 ? '' : 's'}
      </span>
    </div>

    {/* Input para Adicionar Número */}
    <div className="flex gap-2">
      <div className="relative flex-1">
        <input
          type="text"
          placeholder="Ex: (41) 99999-9999 ou 5541999999999"
          value={phoneInput}
          onChange={(e) => onPhoneInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onAddPhone();
            }
          }}
          disabled={!isAdministrator}
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
        />
      </div>
      <button
        type="button"
        onClick={onAddPhone}
        disabled={!isAdministrator || !phoneInput.trim()}
        className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer"
      >
        <i className="bi bi-plus-lg" aria-hidden="true" />
        Adicionar
      </button>
    </div>

    {phoneError && (
      <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
        <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
        {phoneError}
      </p>
    )}

    {/* Lista de Chips dos Números */}
    {phoneNumbers.length > 0 ? (
      <div className="flex flex-wrap gap-2 pt-1 max-h-36 overflow-y-auto p-1">
        {phoneNumbers.map((phone, idx) => (
          <div
            key={`${phone}-${idx}`}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 shadow-xs"
          >
            <i className="bi bi-whatsapp text-emerald-600 dark:text-emerald-400 text-xs" aria-hidden="true" />
            <span>{formatPhoneDisplay(phone)}</span>
            {isAdministrator && (
              <button
                type="button"
                onClick={() => onRemovePhone(idx)}
                aria-label={`Remover número ${phone}`}
                className="w-4 h-4 rounded-full flex items-center justify-center text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
              >
                <i className="bi bi-x text-sm font-bold" aria-hidden="true" />
              </button>
            )}
          </div>
        ))}
      </div>
    ) : (
      <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-3 text-center text-xs text-slate-500 dark:text-slate-400">
        <i className="bi bi-phone text-slate-400 text-base mb-1 block" aria-hidden="true" />
        Nenhum número cadastrado. Adicione o seu número de WhatsApp para testar as respostas do assistente.
      </div>
    )}
  </div>
));

AiAgentTestPhoneSection.displayName = 'AiAgentTestPhoneSection';
