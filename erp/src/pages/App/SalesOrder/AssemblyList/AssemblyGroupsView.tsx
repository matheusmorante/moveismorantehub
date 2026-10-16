import React from 'react';
import { Assembly, groupAssembliesByDateLabel } from './assemblyTypes';

interface AssemblyGroupsViewProps {
  readonly loading: boolean;
  readonly assemblies: Assembly[];
  readonly onToggleStatus: (assembly: Assembly) => void;
  readonly onStartEdit: (assembly: Assembly) => void;
  readonly onDelete: (id: string) => void;
}

export const AssemblyGroupsView: React.FC<AssemblyGroupsViewProps> = ({
  loading,
  assemblies,
  onToggleStatus,
  onStartEdit,
  onDelete,
}) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
          Carregando montagens...
        </p>
      </div>
    );
  }

  if (assemblies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800 text-center">
        <div className="bg-slate-50 dark:bg-slate-800 p-8 rounded-full mb-6">
          <i className="bi bi-calendar-check text-5xl text-slate-200 dark:text-slate-700" />
        </div>
        <h4 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-2">
          Nenhuma montagem agendada
        </h4>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest max-w-xs mx-auto leading-relaxed">
          Clique no botão "Nova Montagem" para começar a gerenciar sua equipe.
        </p>
      </div>
    );
  }

  const groupedAssemblies = groupAssembliesByDateLabel(assemblies);

  return (
    <div className="flex flex-col gap-6">
      {groupedAssemblies.map(([dateLabel, groupAssemblies]) => (
        <div key={dateLabel} className="mb-2 animate-fade-in">
          <div className="flex items-center gap-2 mb-3 px-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <i className="bi bi-calendar3 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest flex-1">
              {dateLabel}
            </h3>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
              {groupAssemblies.length}{' '}
              {groupAssemblies.length === 1 ? 'montagem' : 'montagens'}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {groupAssemblies.map((as) => (
              <div
                key={as.id}
                className={`group relative p-4 rounded-xl border transition-all shadow-sm hover:shadow-md ${
                  as.type === 'delivery'
                    ? 'bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-900/60'
                    : 'bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900/60'
                } ${as.status === 'completed' ? 'opacity-60 grayscale' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug text-slate-900 dark:text-slate-100 font-extrabold line-clamp-2">
                      {as.item}
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span
                        className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                          as.type === 'delivery'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                        }`}
                      >
                        {as.type === 'delivery'
                          ? 'MONTAGEM FORA'
                          : 'MONTAGEM NO DEPÓSITO'}
                      </span>
                      {as.time && (
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          <i className="bi bi-clock mr-1" /> {as.time}
                        </span>
                      )}
                    </div>
                  </div>
                  <i className="bi bi-chevron-right text-slate-400 dark:text-slate-500 text-lg mt-1" />
                </div>

                {/* Ações (Hover) */}
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => onToggleStatus(as)}
                    title={
                      as.status === 'completed'
                        ? 'Marcar como pendente'
                        : 'Marcar como concluída'
                    }
                    className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                  >
                    <i
                      className={`bi ${
                        as.status === 'completed'
                          ? 'bi-arrow-counterclockwise'
                          : 'bi-check2-all'
                      }`}
                    />
                  </button>
                  <button
                    onClick={() => onStartEdit(as)}
                    className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400"
                  >
                    <i className="bi bi-pencil" />
                  </button>
                  <button
                    onClick={() => onDelete(as.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-red-600 dark:text-red-400"
                  >
                    <i className="bi bi-trash" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
