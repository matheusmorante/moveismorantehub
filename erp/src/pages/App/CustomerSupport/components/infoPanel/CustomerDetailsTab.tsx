import React from 'react';
import { Link } from 'react-router-dom';
import { WhatsAppConversation } from '../../types';
import { formatPhoneForDisplay } from '@/pages/utils/customerSupport/phoneUtils';
import { CustomerSummary } from '@/pages/utils/customerSupport/customerMatchingService';

interface CustomerDetailsTabProps {
  conversation: WhatsAppConversation;
  customer: CustomerSummary | null | undefined;
  isLinked: boolean;
  canViewCommercial: boolean;
  onOpenLinkModal: () => void;
  onUnlink: () => void;
  isUnlinking?: boolean;
}

export const CustomerDetailsTab: React.FC<CustomerDetailsTabProps> = ({
  conversation,
  customer,
  isLinked,
  canViewCommercial,
  onOpenLinkModal,
  onUnlink,
  isUnlinking = false,
}) => {
  const contactSummary = (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900" aria-label="Contato da conversa">
      <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Contato da conversa</h4>
      <dl className="mt-3 space-y-2 text-xs">
        <div className="flex justify-between gap-3">
          <dt className="text-slate-400">Nome:</dt>
          <dd className="truncate text-right font-semibold text-slate-800 dark:text-slate-200">{conversation.contactName?.trim() || 'Não informado'}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-400">Telefone:</dt>
          <dd className="text-right font-mono text-slate-800 dark:text-slate-200">{conversation.contactPhone ? formatPhoneForDisplay(conversation.contactPhone) : 'Não informado'}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-400">Vínculo:</dt>
          <dd className="text-right font-semibold text-slate-800 dark:text-slate-200">{isLinked ? 'Cliente ERP' : 'Não vinculado'}</dd>
        </div>
      </dl>
    </section>
  );

  if (!canViewCommercial) {
    return (
      <div className="space-y-4 animate-fade-in">
        {contactSummary}
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200">
          <strong className="block font-bold">Dados comerciais restritos</strong>
          <p className="mt-1 text-[11px] leading-relaxed">É necessária a permissão de informações comerciais para consultar o cadastro ou alterar o vínculo deste cliente.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-4 animate-fade-in">
      {contactSummary}
      {isLinked && customer && (
        <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[9px] font-bold uppercase tracking-wider">
              {conversation.customerLinkStatus === 'auto_matched'
                ? 'Identificado Automaticamente'
                : 'Vinculado Manualmente'}
            </span>
            <Link
              to="/registrations/customers"
              className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              Ver cadastro completo
              <i className="bi bi-box-arrow-up-right text-[10px]"></i>
            </Link>
          </div>

          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {customer.fullName}
          </h4>

          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Código ERP:</span>
              <span className="font-mono font-medium">#{customer.id.slice(0, 8)}</span>
            </div>
            {customer.phone && (
              <div className="flex justify-between">
                <span className="text-slate-400">Telefone ERP:</span>
                <span className="font-medium">{formatPhoneForDisplay(customer.phone)}</span>
              </div>
            )}
            {customer.cpfCnpj && (
              <div className="flex justify-between">
                <span className="text-slate-400">CPF/CNPJ:</span>
                <span className="font-mono">{customer.cpfCnpj}</span>
              </div>
            )}
            {customer.email && (
              <div className="flex justify-between truncate">
                <span className="text-slate-400">E-mail:</span>
                <span className="truncate max-w-[190px]">{customer.email}</span>
              </div>
            )}
            {customer.address && (
              <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] mb-0.5">Endereço:</span>
                <span className="text-[11px] leading-tight block">{customer.address}</span>
              </div>
            )}
          </div>

          {/* Ações de Vínculo */}
          <div className="flex items-center gap-2 pt-3 border-t border-slate-200/50 dark:border-slate-800">
            <button
              type="button"
              onClick={onOpenLinkModal}
              className="flex-1 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Alterar vínculo
            </button>
            <button
              type="button"
              onClick={onUnlink}
              disabled={isUnlinking}
              className="px-3 py-1.5 rounded-xl text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
            >
              Desvincular
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
