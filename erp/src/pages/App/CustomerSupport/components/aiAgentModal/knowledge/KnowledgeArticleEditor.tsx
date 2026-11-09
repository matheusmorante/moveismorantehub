import React from 'react';
import type { AiKnowledgeCategory } from '../../../../../../../../shared-utils/whatsappAiAgentSchemas';
import { CATEGORY_LABELS } from './knowledgeCategories';

interface KnowledgeArticleEditorProps {
  isCreatingNew: boolean;
  draftTitle: string;
  setDraftTitle: (val: string) => void;
  draftCategory: AiKnowledgeCategory;
  setDraftCategory: (val: AiKnowledgeCategory) => void;
  draftContent: string;
  setDraftContent: (val: string) => void;
  draftKeywords: string;
  setDraftKeywords: (val: string) => void;
  draftPriority: number;
  setDraftPriority: (val: number) => void;
  onCancel: () => void;
  onSave: () => void;
}

export const KnowledgeArticleEditor: React.FC<KnowledgeArticleEditorProps> = ({
  isCreatingNew,
  draftTitle,
  setDraftTitle,
  draftCategory,
  setDraftCategory,
  draftContent,
  setDraftContent,
  draftKeywords,
  setDraftKeywords,
  draftPriority,
  setDraftPriority,
  onCancel,
  onSave,
}) => {
  return (
    <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/60 space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
          {isCreatingNew ? 'Adicionar Novo Artigo de Conhecimento' : 'Editar Artigo de Conhecimento'}
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
        >
          <i className="bi bi-x-lg text-xs" aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 space-y-1">
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            Título do Artigo
          </label>
          <input
            type="text"
            placeholder="Ex: Política de Frete e Prazos"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            Categoria
          </label>
          <select
            value={draftCategory}
            onChange={(e) => setDraftCategory(e.target.value as AiKnowledgeCategory)}
            className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          >
            {Object.entries(CATEGORY_LABELS).map(([key, item]) => (
              <option key={key} value={key}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
          Conteúdo Confiável do Artigo
        </label>
        <textarea
          rows={4}
          placeholder="Descreva de forma clara e detalhada a política, prazos, regras ou respostas..."
          value={draftContent}
          onChange={(e) => setDraftContent(e.target.value)}
          className="w-full p-3 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 space-y-1">
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            Palavras-chave (separadas por vírgula)
          </label>
          <input
            type="text"
            placeholder="frete, entrega, prazo, colombo, curitiba"
            value={draftKeywords}
            onChange={(e) => setDraftKeywords(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            Prioridade (1 a 10)
          </label>
          <input
            type="number"
            min={1}
            max={10}
            value={draftPriority}
            onChange={(e) => setDraftPriority(Number(e.target.value))}
            className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-indigo-200/60 dark:border-indigo-800/40">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onSave}
          className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          Salvar Artigo
        </button>
      </div>
    </div>
  );
};
