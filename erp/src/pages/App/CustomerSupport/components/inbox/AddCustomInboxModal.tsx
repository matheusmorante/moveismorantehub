import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const customInboxSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'O nome da pasta deve ter pelo menos 2 caracteres')
    .max(50, 'O nome da pasta não pode exceder 50 caracteres'),
});

type CustomInboxFormData = z.infer<typeof customInboxSchema>;

interface AddCustomInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string) => void;
}

export const AddCustomInboxModal: React.FC<AddCustomInboxModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomInboxFormData>({
    resolver: zodResolver(customInboxSchema),
    defaultValues: { name: '' },
  });

  if (!isOpen) return null;

  const onSubmit = (data: CustomInboxFormData) => {
    onAdd(data.name);
    reset();
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-custom-inbox-title"
      className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 animate-slide-up"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm">
              <i className="bi bi-folder-plus"></i>
            </div>
            <h3
              id="add-custom-inbox-title"
              className="text-sm font-bold text-slate-800 dark:text-slate-100"
            >
              Nova Caixa / Pasta
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <i className="bi bi-x-lg text-xs"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3">
          <div>
            <label
              htmlFor="inbox-name"
              className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider"
            >
              Nome da pasta personalizada
            </label>
            <input
              id="inbox-name"
              type="text"
              {...register('name')}
              placeholder="Ex: Clientes VIP, Retornos Prioritários..."
              autoFocus
              className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {errors.name && (
              <p className="mt-1 text-[11px] text-red-500 font-medium">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
            >
              Criar Pasta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
