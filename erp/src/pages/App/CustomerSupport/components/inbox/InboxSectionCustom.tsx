import React from 'react';

export interface CustomInboxItem {
  id: string;
  name: string;
  isLocked: boolean;
}

interface InboxSectionCustomProps {
  customInboxList: CustomInboxItem[];
  activeCustomInbox: string | null;
  onSelectCustomInbox: (id: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  customInboxTab: 'all' | 'by_me' | 'by_others';
  onTabChange: (tab: 'all' | 'by_me' | 'by_others') => void;
  onOpenAddModal: () => void;
  onResetTeam: () => void;
}

export const InboxSectionCustom: React.FC<InboxSectionCustomProps> = ({
  customInboxList,
  activeCustomInbox,
  onSelectCustomInbox,
  isExpanded,
  onToggleExpand,
  customInboxTab,
  onTabChange,
  onOpenAddModal,
  onResetTeam,
}) => {
  return (
    <div className="p-3 flex-1">
      <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
        >
          <i className="bi bi-folder2 text-sm"></i>
          <span>Custom Inbox</span>
          <i
            className={`bi bi-chevron-down text-[10px] transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
          ></i>
        </button>

        <button
          type="button"
          onClick={onOpenAddModal}
          title="Criar nova pasta / fila personalizada"
          className="w-5 h-5 rounded flex items-center justify-center hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
        >
          <i className="bi bi-plus text-base leading-none"></i>
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-2 animate-fade-in">
          {/* Abas: All | By Me | By Others */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-200/60 dark:bg-slate-800/80 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            <button
              type="button"
              onClick={() => onTabChange('all')}
              className={`flex-1 py-1 rounded-md text-center transition-all cursor-pointer ${
                customInboxTab === 'all'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 font-bold shadow-xs'
                  : 'hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => onTabChange('by_me')}
              className={`flex-1 py-1 rounded-md text-center transition-all cursor-pointer ${
                customInboxTab === 'by_me'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 font-bold shadow-xs'
                  : 'hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              Por mim
            </button>
            <button
              type="button"
              onClick={() => onTabChange('by_others')}
              className={`flex-1 py-1 rounded-md text-center transition-all cursor-pointer ${
                customInboxTab === 'by_others'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 font-bold shadow-xs'
                  : 'hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              Outras
            </button>
          </div>

          {/* Lista de Pastas Customizadas */}
          <div className="space-y-1">
            {customInboxList.map((folder) => {
              const isActive = activeCustomInbox === folder.id;
              return (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => {
                    onSelectCustomInbox(folder.id);
                    onResetTeam();
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                    isActive
                      ? 'bg-blue-100/70 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <i
                    className={`bi ${folder.isLocked ? 'bi-lock' : 'bi-folder'} text-xs text-slate-400`}
                  ></i>
                  <span className="truncate flex-1">{folder.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
