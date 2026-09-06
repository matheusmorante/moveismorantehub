import React from 'react';
import { PostTemplate } from '../types/postTemplate';

interface TemplateGridProps {
  templates: PostTemplate[];
  onEdit: (template: PostTemplate) => void;
  onDuplicate: (template: PostTemplate) => Promise<void> | void;
  onDeleteRequest: (template: PostTemplate) => void;
}

export const TemplateGrid: React.FC<TemplateGridProps> = ({
  templates,
  onEdit,
  onDuplicate,
  onDeleteRequest,
}) => {
  if (!templates.length) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-12 text-center">
        <p className="text-sm text-slate-400">Nenhum modelo cadastrado.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {templates.map((template) => (
        <article
          key={template.id}
          className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900 p-5 transition-all hover:border-slate-700"
        >
          <div>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-white text-base">{template.name}</h3>
              <span
                className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-medium ${
                  template.status === 'ACTIVE'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {template.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
              </span>
            </div>

            <p className="mt-1.5 text-xs text-slate-400 line-clamp-2">
              {template.description || 'Sem descrição'}
            </p>

            <p className="mt-3 text-[11px] font-medium text-slate-500">
              {template.formats?.join(' · ') || template.aspectRatio} · {template.assets?.length || 0} arquivos
            </p>
          </div>

          <div className="mt-5 flex items-center gap-3 border-t border-slate-800/80 pt-3">
            <button
              type="button"
              onClick={() => onEdit(template)}
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => void onDuplicate(template)}
              className="text-xs font-medium text-slate-300 hover:text-white transition-colors"
            >
              Duplicar
            </button>
            <button
              type="button"
              onClick={() => onDeleteRequest(template)}
              className="text-xs font-medium text-rose-400 hover:text-rose-300 transition-colors ml-auto"
            >
              Excluir
            </button>
          </div>
        </article>
      ))}
    </div>
  );
};
