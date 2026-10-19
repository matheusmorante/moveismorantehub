import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type Order from '@/pages/types/order.type';
import { formatOrderCode } from '@/pages/utils/orderCode';
import { useAuth } from '@/context/AuthContext';
import { useWarrantyModalState } from './warranty-modal/hooks/useWarrantyModalState';
import { isSamePhoneNumber } from '@/pages/utils/textUtils';

export interface WarrantyTermModalProps {
  order: Order;
  isOpen?: boolean;
  onClose: () => void;
  onActionComplete?: () => void | Promise<void>;
  isAdministrator?: boolean;
}

export const warrantyActionSchema = z.object({
  action: z.enum(['print', 'send_whatsapp', 'send_direct_cloud_api']),
  orderId: z.string().min(1, 'ID do pedido é obrigatório'),
});

export type WarrantyActionFormData = z.infer<typeof warrantyActionSchema>;

export const WarrantyTermModal: React.FC<WarrantyTermModalProps> = ({
  order,
  isOpen = true,
  onClose,
  onActionComplete,
  isAdministrator: propIsAdmin,
}) => {
  const auth = useAuth();
  const isAdministrator =
    propIsAdmin ?? Boolean(auth?.isAdministrator || auth?.isRealAdministrator);

  const {
    actionLoading,
    currentRecord,
    handlePrint,
    handleSendWhatsApp,
    handleSendDirectCloudApi,
  } = useWarrantyModalState({ order, isOpen, onClose });

  const {
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<WarrantyActionFormData>({
    resolver: zodResolver(warrantyActionSchema),
    defaultValues: {
      orderId: order?.id || '',
      action: 'print',
    },
  });

  if (!isOpen) return null;

  const customer = order.customerData;
  const orderCode = formatOrderCode(order);
  const customerName = customer?.fullName || 'Consumidor';
  const customerPhone = customer?.phone || '';
  const version = currentRecord?.document_version || 1;

  const onValidSubmit = async (data: WarrantyActionFormData) => {
    let actionCompleted = false;
    if (data.action === 'print') {
      actionCompleted = await handlePrint();
    } else if (data.action === 'send_whatsapp') {
      actionCompleted = await handleSendWhatsApp();
    } else if (data.action === 'send_direct_cloud_api') {
      actionCompleted = await handleSendDirectCloudApi();
    }
    if (actionCompleted) await onActionComplete?.();
  };

  return (
    <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 overscroll-contain animate-in fade-in duration-200">
      <button
        type="button"
        aria-label="Fechar modal do Termo de Garantia"
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="warranty-modal-title"
        className="relative z-10 bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200"
      >
        {/* Cabeçalho */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm text-xl">
              <i className="bi bi-shield-check" />
            </div>
            <div>
              <h3
                id="warranty-modal-title"
                className="text-base font-black text-slate-800 dark:text-slate-100"
              >
                Termo de Garantia
              </h3>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Pedido #{orderCode} • {customerName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
            title="Fechar"
            aria-label="Fechar"
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>

        {/* Alerta de carregamento */}
        {actionLoading && (
          <div className="bg-[#032354] text-amber-300 border-b border-amber-500/40 text-xs font-bold py-2 px-4 text-center shadow-lg flex items-center justify-center gap-2 animate-pulse shrink-0">
            <i className="bi bi-arrow-repeat animate-spin text-sm" />
            <span>{actionLoading}</span>
          </div>
        )}

        {/* Formulário com botões de ação */}
        <form onSubmit={handleSubmit(onValidSubmit)} className="p-6 flex flex-col gap-3">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            Escolha uma ação para o Termo de Garantia deste pedido:
          </p>

          {/* Erro de validação do formulário, se houver */}
          {errors.orderId && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-xs text-rose-700 dark:text-rose-300">
              {errors.orderId.message}
            </div>
          )}

          {/* 1. Imprimir Termo de Garantia */}
          <button
            type="button"
            disabled={Boolean(actionLoading)}
            onClick={() => {
              setValue('action', 'print');
              void handleSubmit(onValidSubmit)();
            }}
            title="Gerar e imprimir o documento oficial do Termo de Garantia em formato A4"
            className="flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all text-left relative text-emerald-700 bg-emerald-50/70 dark:bg-emerald-950/20 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/30 hover:-translate-y-0.5 hover:shadow-md cursor-pointer disabled:opacity-50 border-slate-100 dark:border-slate-800"
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-sm text-2xl">
              <i className="bi bi-printer-fill" />
            </div>
            <div className="flex-1 min-w-0 pr-6">
              <span className="text-xs font-black uppercase tracking-wider block text-slate-800 dark:text-slate-100">
                Imprimir Termo de Garantia
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mt-0.5 truncate">
                Gerar e imprimir o documento oficial em formato A4
              </span>
            </div>
          </button>

          {/* 2. Enviar para o Cliente */}
          <button
            type="button"
            disabled={Boolean(actionLoading)}
            onClick={() => {
              setValue('action', 'send_whatsapp');
              void handleSubmit(onValidSubmit)();
            }}
            title="Enviar o Termo de Garantia em PDF pelo WhatsApp do cliente"
            className="flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all text-left relative text-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/20 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/30 hover:-translate-y-0.5 hover:shadow-md cursor-pointer disabled:opacity-50 border-slate-100 dark:border-slate-800"
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-sm text-2xl">
              <i className="bi bi-whatsapp" />
            </div>
            <div className="flex-1 min-w-0 pr-6">
              <span className="text-xs font-black uppercase tracking-wider block text-slate-800 dark:text-slate-100">
                Enviar para o Cliente
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mt-0.5 truncate">
                {customerPhone
                  ? `Enviar termo via WhatsApp para ${customerPhone}`
                  : 'Enviar termo pelo WhatsApp do cliente'}
              </span>
            </div>
          </button>

          {/* 3. Enviar para o cliente diretamente (Cloud WhatsApp) - Beta */}
          <div className="relative">
            <button
              type="button"
              disabled={Boolean(actionLoading) || !isAdministrator}
              onClick={() => {
                setValue('action', 'send_direct_cloud_api');
                void handleSubmit(onValidSubmit)();
              }}
              title={
                !isAdministrator
                  ? 'Disponível apenas para administradores (Beta)'
                  : 'Enviar PDF do Termo de Garantia diretamente para o cliente via Cloud WhatsApp API'
              }
              className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all text-left relative ${
                !isAdministrator
                  ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800/40 dark:border-slate-800'
                  : 'text-[#3b1900] bg-amber-400 hover:bg-amber-300 border-amber-500 shadow-sm dark:bg-amber-500/20 dark:text-amber-200 dark:border-amber-500/40 hover:-translate-y-0.5 hover:shadow-md cursor-pointer'
              } disabled:opacity-50`}
            >
              <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-[#3b1900] dark:text-amber-300 flex items-center justify-center shrink-0 shadow-sm text-2xl">
                <i className="bi bi-whatsapp" />
              </div>
              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider block text-slate-900 dark:text-slate-100">
                    Enviar para o cliente diretamente (Cloud WhatsApp)
                  </span>
                  <span className="px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest rounded bg-amber-200 text-[#3b1900] border border-amber-400 dark:bg-amber-800 dark:text-amber-100">
                    BETA
                  </span>
                </div>
                <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mt-0.5 truncate">
                  Enviar PDF via API Oficial da Meta
                  {!isAdministrator && ' (Apenas Administrador)'}
                </span>
              </div>
            </button>

            {customerPhone && isSamePhoneNumber(customerPhone, '(41) 99749-3547') && (
              <div className="mt-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-[10px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5 font-medium">
                <i className="bi bi-info-circle-fill text-amber-500 shrink-0" />
                <span>
                  O telefone deste pedido é o mesmo WhatsApp da loja. Para testar o envio direto pela Meta API, altere o telefone do cliente no pedido.
                </span>
              </div>
            )}
          </div>
        </form>

        {/* Rodapé */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono">v{version}</span>
            {currentRecord?.file_hash_sha256 && (
              <span
                className="font-mono text-[10px] hidden sm:inline"
                title={`Hash SHA-256 de autenticidade: ${currentRecord.file_hash_sha256}`}
              >
                • SHA-256: {currentRecord.file_hash_sha256.substring(0, 10)}...
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default WarrantyTermModal;
