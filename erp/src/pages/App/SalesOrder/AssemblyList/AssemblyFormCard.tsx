import React from 'react';
import type { z } from 'zod';
import { ZodForm } from '@/components/forms/ZodForm';
import { assemblyListFormSchema } from '../../../../../../shared-utils/operationsFormSchemas';
import { Assembly } from './assemblyTypes';

interface AssemblyFormCardProps {
  readonly editingAssembly: Assembly | null;
  readonly item: string;
  readonly setItem: (val: string) => void;
  readonly date: string;
  readonly setDate: (val: string) => void;
  readonly time: string;
  readonly setTime: (val: string) => void;
  readonly type: 'delivery' | 'showroom';
  readonly setType: (val: 'delivery' | 'showroom') => void;
  readonly status: 'pending' | 'completed';
  readonly setStatus: (val: 'pending' | 'completed') => void;
  readonly onSave: (values: z.output<typeof assemblyListFormSchema>) => void | Promise<void>;
  readonly onCancel: () => void;
}

export const AssemblyFormCard: React.FC<AssemblyFormCardProps> = ({
  editingAssembly,
  item,
  setItem,
  date,
  setDate,
  time,
  setTime,
  type,
  setType,
  status,
  setStatus,
  onSave,
  onCancel,
}) => {
  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8 animate-slide-up">
      <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-3">
        <i
          className={`bi ${editingAssembly ? 'bi-pencil' : 'bi-plus-circle'} text-indigo-500`}
        />
        {editingAssembly ? 'Editar Montagem' : 'Nova Montagem'}
      </h3>

      <ZodForm
        schema={assemblyListFormSchema}
        values={{ item, date, time, type, status }}
        onValid={onSave}
        className="space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">
              Produto / Item <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={item}
              onChange={(e) => setItem(e.target.value)}
              placeholder="Ex: Guarda-roupa 6 portas, Cozinha Modulada..."
              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 px-5 py-4 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:border-indigo-500 dark:focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">
              Data de Prazo <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 px-5 py-4 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:border-indigo-500 dark:focus:border-indigo-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">
              Horário (Opcional)
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 px-5 py-4 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:border-indigo-500 dark:focus:border-indigo-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">
              Tipo de Local <span className="text-red-500">*</span>
            </label>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setType('delivery')}
                className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  type === 'delivery'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm'
                    : 'text-slate-400'
                }`}
              >
                Entrega (Casa)
              </button>
              <button
                type="button"
                onClick={() => setType('showroom')}
                className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  type === 'showroom'
                    ? 'bg-white dark:bg-slate-700 text-red-600 shadow-sm'
                    : 'text-slate-400'
                }`}
              >
                Mostruário
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">
              Situação Inicial
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'pending' | 'completed')}
              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 px-5 py-4 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:border-indigo-500 dark:focus:border-indigo-500 outline-none transition-all appearance-none"
            >
              <option value="pending">Pendente</option>
              <option value="completed">Concluída</option>
            </select>
          </div>
        </div>

        <div className="pt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl transition-all active:scale-95"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-indigo-900/20 transition-all active:scale-95"
          >
            {editingAssembly ? 'Salvar Alterações' : 'Confirmar Agendamento'}
          </button>
        </div>
      </ZodForm>
    </div>
  );
};
