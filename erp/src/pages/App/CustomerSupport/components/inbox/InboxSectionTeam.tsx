import React from 'react';

interface InboxSectionTeamProps {
  teams: string[];
  activeTeam: string | null;
  onSelectTeam?: (team: string | null) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onResetCustomInbox: () => void;
}

export const InboxSectionTeam: React.FC<InboxSectionTeamProps> = ({
  teams,
  activeTeam,
  onSelectTeam,
  isExpanded,
  onToggleExpand,
  onResetCustomInbox,
}) => {
  return (
    <div className="p-3">
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors mb-2 cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <i className="bi bi-people text-sm"></i>
          <span>Team (Equipes)</span>
        </div>
        <i
          className={`bi bi-chevron-down text-[10px] transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
        ></i>
      </button>

      {isExpanded && (
        <div className="space-y-1 pl-2 animate-fade-in text-xs">
          {teams.length === 0 ? (
            <p className="text-[11px] text-slate-400 italic px-2 py-1">Sem equipe cadastrada</p>
          ) : (
            teams.map((teamName) => (
              <button
                key={teamName}
                type="button"
                onClick={() => {
                  onSelectTeam?.(teamName);
                  onResetCustomInbox();
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer text-left ${
                  activeTeam === teamName
                    ? 'bg-blue-100/70 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                }`}
              >
                <span className="truncate">{teamName}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
