import React from 'react';
import type { AiKnowledgeArticle } from '../../../../../../../../shared-utils/whatsappAiAgentSchemas';
import { CATEGORY_LABELS } from './knowledgeCategories';

interface KnowledgeArticleCardProps {
  article: AiKnowledgeArticle;
  isAdministrator: boolean;
  onToggleActive: (id: string) => void;
  onEdit: (article: AiKnowledgeArticle) => void;
  onDelete: (id: string) => void;
}

export const KnowledgeArticleCard: React.FC<KnowledgeArticleCardProps> = ({
  article,
  isAdministrator,
  onToggleActive,
  onEdit,
  onDelete,
}) => {
  const catMeta = CATEGORY_LABELS[article.category] || CATEGORY_LABELS.outros;

  return (
    <div
      className={`p-3.5 rounded-2xl border transition-all ${
        article.active
          ? 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 shadow-2xs'
          : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800 opacity-60'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${catMeta.color}`}
            >
              <i className={`bi ${catMeta.icon}`} aria-hidden="true" />
              {catMeta.label}
            </span>
            <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">{article.title}</h5>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md font-mono bg-slate-100 dark:bg-slate-800 text-slate-500">
              v{article.version || 1}
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
              P{article.priority || 5}
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
            {article.content}
          </p>

          {(article.keywords || []).length > 0 && (
            <div className="flex items-center gap-1 flex-wrap pt-1">
              <span className="text-[10px] text-slate-400">Palavras-chave:</span>
              {article.keywords.map((kw) => (
                <span
                  key={kw}
                  className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400"
                >
                  {kw}
                </span>
              ))}
            </div>
          )}
        </div>

        {isAdministrator && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onToggleActive(article.id)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold cursor-pointer ${
                article.active
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
              }`}
            >
              {article.active ? 'Ativo' : 'Inativo'}
            </button>
            <button
              type="button"
              onClick={() => onEdit(article)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              title="Editar artigo"
            >
              <i className="bi bi-pencil text-xs" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(article.id)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              title="Excluir artigo"
            >
              <i className="bi bi-trash text-xs" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
