import type { z } from 'zod';
import { assemblyListFormSchema } from '../../../../../../shared-utils/operationsFormSchemas';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { toast } from 'react-toastify';
import { Drill } from '@/components/shared/DrillIcon';
import { getLocalISODate } from '@/pages/utils/formatters';
import { Assembly } from './assemblyTypes';
import { AssemblyFormCard } from './AssemblyFormCard';
import { AssemblyGroupsView } from './AssemblyGroupsView';

interface Props {
  onClose: () => void;
}

const AssemblyList = ({ onClose }: Props) => {
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAssembly, setEditingAssembly] = useState<Assembly | null>(null);

  // Form states
  const [item, setItem] = useState('');
  const [date, setDate] = useState(getLocalISODate(new Date()));
  const [time, setTime] = useState('08:00');
  const [type, setType] = useState<'delivery' | 'showroom'>('delivery');
  const [status, setStatus] = useState<'pending' | 'completed'>('pending');

  const fetchAssemblies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('assemblies')
        .select('*')
        .order('date', { ascending: true });

      if (error) {
        if (
          error.code === '42P01' ||
          error.message?.includes('does not exist') ||
          (error as any).details?.includes('does not exist')
        ) {
          console.warn("Tabela 'assemblies' não existe. Exibindo lista vazia.");
          setAssemblies([]);
        } else {
          console.error('Erro ao buscar montagens:', error);
          toast.error('Erro ao carregar lista de montagens');
        }
      } else {
        setAssemblies(data || []);
      }
    } catch (err: any) {
      console.error('Erro ao buscar montagens:', err);
      setAssemblies([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void fetchAssemblies();
  }, []);

  const resetForm = () => {
    setEditingAssembly(null);
    setItem('');
    setDate(getLocalISODate(new Date()));
    setTime('08:00');
    setType('delivery');
    setStatus('pending');
    setShowForm(false);
  };

  const handleSave = async (values: z.output<typeof assemblyListFormSchema>) => {
    const payload = values;

    let error;
    if (editingAssembly) {
      const { error: err } = await supabase
        .from('assemblies')
        .update(payload)
        .eq('id', editingAssembly.id);
      error = err;
    } else {
      const { error: err } = await supabase.from('assemblies').insert([payload]);
      error = err;
    }

    if (error) {
      toast.error('Erro ao salvar montagem');
    } else {
      toast.success(editingAssembly ? 'Montagem atualizada' : 'Montagem agendada');
      resetForm();
      void fetchAssemblies();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta montagem?')) return;

    const { error } = await supabase.from('assemblies').delete().eq('id', id);

    if (error) {
      toast.error('Erro ao excluir montagem');
    } else {
      toast.success('Montagem excluída');
      void fetchAssemblies();
    }
  };

  const toggleStatus = async (assembly: Assembly) => {
    const newStatus = assembly.status === 'pending' ? 'completed' : 'pending';
    const { error } = await supabase
      .from('assemblies')
      .update({ status: newStatus })
      .eq('id', assembly.id);

    if (error) {
      toast.error('Erro ao atualizar status');
    } else {
      void fetchAssemblies();
    }
  };

  const startEdit = (as: Assembly) => {
    setEditingAssembly(as);
    setItem(as.item);
    setDate(as.date);
    setTime(as.time || '08:00');
    setType(as.type);
    setStatus(as.status);
    setShowForm(true);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-0 md:p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-slate-950 w-full h-full md:w-[1000px] md:h-[85vh] rounded-none md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up border-0 md:border border-white/10 dark:border-slate-800/50">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 transition-colors">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-3 rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-indigo-900/20">
              <Drill className="text-white w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                Lista de Montagens
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="flex items-center gap-1 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                  <i className="bi bi-tools text-[10px]" /> DEPÓSITO
                </span>
                <span className="flex items-center gap-1 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                  <i className="bi bi-truck text-[10px]" /> FORA
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20 transition-all active:scale-95"
              >
                <i className="bi bi-plus-lg text-sm" />
                Nova Montagem
              </button>
            )}
            <button
              onClick={onClose}
              className="w-12 h-12 flex items-center justify-center bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 rounded-xl transition-all shadow-sm border border-slate-100 dark:border-slate-800 active:scale-95"
            >
              <i className="bi bi-x-lg text-xl" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 dark:bg-slate-950/50 custom-scrollbar">
          {showForm ? (
            <AssemblyFormCard
              editingAssembly={editingAssembly}
              item={item}
              setItem={setItem}
              date={date}
              setDate={setDate}
              time={time}
              setTime={setTime}
              type={type}
              setType={setType}
              status={status}
              setStatus={setStatus}
              onSave={handleSave}
              onCancel={resetForm}
            />
          ) : (
            <div className="space-y-4">
              <AssemblyGroupsView
                loading={loading}
                assemblies={assemblies}
                onToggleStatus={(as) => void toggleStatus(as)}
                onStartEdit={startEdit}
                onDelete={(id) => void handleDelete(id)}
              />
            </div>
          )}
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 20px; }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; }
            `,
        }}
      />
    </div>
  );
};

export default AssemblyList;
