import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AssignedProfileSummary,
  CustomerSupportFolder,
  CustomerSupportFolderCriteria,
} from '../../types';
import { DEFAULT_SUPPORT_FOLDER_CRITERIA } from '@/pages/utils/customerSupport/customerSupportInboxService';

const folderSchema = z.object({
  name: z.string().trim().min(2, 'O nome deve ter pelo menos 2 caracteres.').max(50, 'O nome deve ter no máximo 50 caracteres.'),
  status: z.enum(['all', 'open', 'closed', 'snoozed']),
  assigneeId: z.string(),
  unread: z.boolean(),
  customerLink: z.enum(['all', 'linked', 'unlinked']),
  orders: z.enum(['all', 'with_orders', 'without_orders']),
  search: z.string().trim().max(100, 'A busca deve ter no máximo 100 caracteres.'),
});

type FolderFormData = z.infer<typeof folderSchema>;

interface AddCustomInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  agents: AssignedProfileSummary[];
  canViewCommercialInfo: boolean;
  folder?: CustomerSupportFolder | null;
  onSave: (name: string, criteria: CustomerSupportFolderCriteria, folderId?: string) => Promise<string | null>;
}

function getDefaults(folder?: CustomerSupportFolder | null): FolderFormData {
  const criteria = folder?.criteria || DEFAULT_SUPPORT_FOLDER_CRITERIA;
  return {
    name: folder?.name || '',
    status: criteria.status,
    assigneeId: criteria.assigneeId,
    unread: criteria.unread,
    customerLink: criteria.customerLink,
    orders: criteria.orders,
    search: criteria.search,
  };
}

export const AddCustomInboxModal: React.FC<AddCustomInboxModalProps> = ({
  isOpen,
  onClose,
  agents,
  canViewCommercialInfo,
  folder,
  onSave,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<FolderFormData>({ resolver: zodResolver(folderSchema), defaultValues: getDefaults(folder) });

  useEffect(() => {
    if (isOpen) {
      reset(getDefaults(folder));
      clearErrors();
    }
  }, [isOpen, folder, reset, clearErrors]);

  if (!isOpen) return null;

  const submit = async (data: FolderFormData) => {
    setIsSaving(true);
    try {
      const criteria: CustomerSupportFolderCriteria = {
        status: data.status,
        assigneeId: data.assigneeId,
        unread: data.unread,
        customerLink: data.customerLink,
        orders: data.orders,
        search: data.search,
      };
      const error = await onSave(data.name, criteria, folder?.id);
      if (error) {
        setError('root.server', { message: error });
        return;
      }
      reset(getDefaults(null));
      onClose();
    } catch {
      setError('root.server', { message: 'Não foi possível salvar a pasta. Tente novamente.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="add-custom-inbox-title" className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in select-none">
      <div onClick={(event) => event.stopPropagation()} className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm"><i className="bi bi-folder-plus" /></div>
            <h3 id="add-custom-inbox-title" className="text-sm font-bold text-slate-800 dark:text-slate-100">{folder ? 'Editar pasta compartilhada' : 'Nova pasta compartilhada'}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><i className="bi bi-x-lg text-xs" /></button>
        </div>

        <form onSubmit={handleSubmit(submit)} className="mt-4 space-y-3">
          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            Nome da pasta
            <input {...register('name')} placeholder="Ex.: Retornos prioritários" className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs normal-case tracking-normal font-normal focus:outline-none focus:ring-1 focus:ring-blue-500" />
            {errors.name && <span className="mt-1 block text-[11px] normal-case tracking-normal text-red-500">{errors.name.message}</span>}
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Status
              <select {...register('status')} className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2.5 py-2 text-xs font-normal text-slate-800 dark:text-slate-100">
                <option value="all">Todos</option><option value="open">Abertos</option><option value="closed">Fechados</option><option value="snoozed">Adiados</option>
              </select>
            </label>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Atendente
              <select {...register('assigneeId')} className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2.5 py-2 text-xs font-normal text-slate-800 dark:text-slate-100">
                <option value="all">Todos</option><option value="mine">Por mim</option><option value="unassigned">Sem atendente</option>
                {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.fullName}</option>)}
              </select>
            </label>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Vínculo com cliente
              <select {...register('customerLink')} className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2.5 py-2 text-xs font-normal text-slate-800 dark:text-slate-100">
                <option value="all">Todos</option><option value="linked">Vinculados</option><option value="unlinked">Não vinculados</option>
              </select>
            </label>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Pedidos
              <select {...register('orders')} className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2.5 py-2 text-xs font-normal text-slate-800 dark:text-slate-100">
                <option value="all">Todos</option>
                {canViewCommercialInfo && <><option value="with_orders">Com pedidos</option><option value="without_orders">Sem pedidos</option></>}
                {!canViewCommercialInfo && folder && folder.criteria.orders !== 'all' && <option value={folder.criteria.orders}>Critério atual indisponível</option>}
              </select>
            </label>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
            <input type="checkbox" {...register('unread')} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
            Somente conversas não lidas
          </label>
          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">Busca textual
            <input {...register('search')} placeholder="Nome, telefone ou trecho da mensagem" className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-normal focus:outline-none focus:ring-1 focus:ring-blue-500" />
            {errors.search && <span className="mt-1 block text-[11px] text-red-500">{errors.search.message}</span>}
          </label>

          {errors.root?.server && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{errors.root.server.message}</p>}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">Cancelar</button>
            <button type="submit" disabled={isSaving} className="px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">{isSaving ? 'Salvando…' : folder ? 'Salvar alterações' : 'Criar pasta'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
