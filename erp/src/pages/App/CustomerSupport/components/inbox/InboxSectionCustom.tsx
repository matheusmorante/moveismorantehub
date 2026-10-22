import React from 'react';
import { CustomerSupportFolder } from '../../types';

interface InboxSectionCustomProps {
  folders: CustomerSupportFolder[];
  activeFolderId: string | null;
  currentUserId?: string;
  onSelectFolder: (folder: CustomerSupportFolder) => void;
  onEditFolder: (folder: CustomerSupportFolder) => void;
  onDeleteFolder: (folder: CustomerSupportFolder) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  customInboxTab: 'all' | 'by_me' | 'by_others';
  onTabChange: (tab: 'all' | 'by_me' | 'by_others') => void;
  onOpenAddModal: () => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export const InboxSectionCustom: React.FC<InboxSectionCustomProps> = ({
  folders,
  activeFolderId,
  currentUserId,
  onSelectFolder,
  onEditFolder,
  onDeleteFolder,
  isExpanded,
  onToggleExpand,
  customInboxTab,
  onTabChange,
  onOpenAddModal,
  isLoading = false,
  error = null,
  onRetry,
}) => {
  const visibleFolders = folders.filter((folder) => {
    if (customInboxTab === 'by_me') return folder.createdBy === currentUserId;
    if (customInboxTab === 'by_others') return folder.createdBy !== currentUserId;
    return true;
  });

  return (
    <div className="p-3 flex-1">
      <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">
        <button type="button" onClick={onToggleExpand} className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-slate-100">
          <i className="bi bi-folder2 text-sm" /><span>Pastas compartilhadas</span>
          <i className={`bi bi-chevron-down text-[10px] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
        <button type="button" onClick={onOpenAddModal} title="Criar pasta compartilhada" aria-label="Criar pasta compartilhada" className="w-5 h-5 rounded flex items-center justify-center hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100">
          <i className="bi bi-plus text-base leading-none" />
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-2 animate-fade-in">
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-200/60 dark:bg-slate-800/80 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            {([
              ['all', 'Todas'], ['by_me', 'Por mim'], ['by_others', 'Outras'],
            ] as const).map(([tab, label]) => (
              <button key={tab} type="button" onClick={() => onTabChange(tab)} className={`flex-1 py-1 rounded-md text-center ${customInboxTab === tab ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 font-bold shadow-xs' : 'hover:text-slate-700 dark:hover:text-slate-200'}`}>
                {label}
              </button>
            ))}
          </div>

          {isLoading && <p role="status" className="flex items-center gap-2 px-2 py-2 text-xs text-slate-500 dark:text-slate-400"><i aria-hidden="true" className="bi bi-arrow-repeat animate-spin" />Carregando pastas...</p>}
          {error && <div role="alert" className="px-2 py-2 text-xs text-red-600 dark:text-red-300">
            <p>{error}</p>
            {onRetry && <button type="button" disabled={isLoading} onClick={onRetry} aria-label="Tentar carregar pastas novamente" className="mt-1 underline disabled:opacity-50">Tentar novamente</button>}
          </div>}
          <div className="space-y-1" aria-busy={isLoading}>
            {visibleFolders.length === 0 ? (
              !isLoading && !error && <p className="text-[11px] text-slate-400 italic px-2 py-2">Nenhuma pasta nesta aba.</p>
            ) : visibleFolders.map((folder) => {
              const isActive = activeFolderId === folder.id;
              return (
                <div key={folder.id} className={`group w-full flex items-center gap-1 px-2 rounded-lg ${isActive ? 'bg-blue-100/70 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'}`}>
                  <button type="button" onClick={() => onSelectFolder(folder)} title={`Pasta compartilhada: ${folder.name}`} className={`min-w-0 flex-1 flex items-center gap-2 py-1.5 text-xs text-left ${isActive ? 'font-bold' : ''}`}>
                    <i className="bi bi-folder text-xs text-slate-400" />
                    <span className="truncate">{folder.name}</span>
                  </button>
                  <div className="flex items-center gap-0.5">
                    <button type="button" aria-label={`Editar pasta ${folder.name}`} title="Editar pasta" onClick={() => onEditFolder(folder)} className="w-6 h-6 rounded hover:bg-white/70 dark:hover:bg-slate-700"><i className="bi bi-pencil text-[10px]" /></button>
                    <button type="button" aria-label={`Excluir pasta ${folder.name}`} title="Excluir pasta" onClick={() => onDeleteFolder(folder)} className="w-6 h-6 rounded hover:bg-red-100 text-red-500"><i className="bi bi-trash text-[10px]" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
