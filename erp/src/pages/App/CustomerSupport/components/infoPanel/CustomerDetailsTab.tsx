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
  displayName: string;
  onOpenLinkModal: () => void;
  onUnlink: () => void;
}

export const CustomerDetailsTab: React.FC<CustomerDetailsTabProps> = ({
  conversation,
  customer,
  isLinked,
  canViewCommercial,
  displayName,
  onOpenLinkModal,
  onUnlink,
}) => {
  if (!canViewCommercial) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200">
          <strong className="block font-bold">Dados comerciais restritos</strong>
          <p className="mt-1 text-[11px] leading-relaxed">É necessária a permissão de informações comerciais para consultar o cadastro ou alterar o vínculo deste cliente.</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Metadados do WhatsApp</span>
          <div className="flex justify-between"><span className="text-slate-400">Nome de Perfil:</span><span className="font-semibold text-slate-800 dark:text-slate-200">{conversation.contactName || 'Não informado'}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Telefone:</span><span className="font-mono text-[11px] text-slate-800 dark:text-slate-200">{formatPhoneForDisplay(conversation.contactPhone)}</span></div>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-4 animate-fade-in">
      {isLinked && customer ? (
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
              Cadastro
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
              className="px-3 py-1.5 rounded-xl text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
            >
              Desvincular
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-center">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-2 text-lg">
            <i className="bi bi-person-x"></i>
          </div>
          <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
            {conversation.customerLinkStatus === 'ambiguous'
              ? 'Telefone associado a múltiplos clientes'
              : 'Contato não identificado no ERP'}
          </h4>
          <p className="text-[11px] text-amber-700/90 dark:text-amber-300/80 mt-1 mb-3 leading-relaxed">
            {conversation.customerLinkStatus === 'ambiguous'
              ? 'Existem dois ou mais cadastros com este telefone. Selecione manualmente o cliente correto.'
              : 'Nenhum cadastro de cliente foi localizado com este número de telefone.'}
          </p>
          <button
            type="button"
            onClick={onOpenLinkModal}
            className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            Pesquisar e Vincular Cliente
          </button>
        </div>
      )}

      {/* Informações da Linha WhatsApp */}
      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
          Metadados do WhatsApp
        </span>
        <div className="flex justify-between">
          <span className="text-slate-400">Nome de Perfil:</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {conversation.contactName || 'Não informado'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">WhatsApp ID:</span>
          <span className="font-mono text-[11px] text-slate-800 dark:text-slate-200">
            {conversation.contactWaId}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Telefone Formatado:</span>
          <span className="font-mono text-[11px] text-slate-800 dark:text-slate-200">
            {formatPhoneForDisplay(conversation.contactPhone)}
          </span>
        </div>
      </div>
    </div>
  );
};
