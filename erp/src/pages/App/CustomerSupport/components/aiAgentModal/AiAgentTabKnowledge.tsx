import React, { memo } from 'react';
import type { UseFormSetValue } from 'react-hook-form';
import type {
  WhatsAppAiAgentFormData,
  AiKnowledgeArticle,
} from '../../../../../../../shared-utils/whatsappAiAgentSchemas';
import {
  KnowledgeArticleEditor,
  KnowledgeArticleCard,
  KnowledgeFilterBar,
  useKnowledgeTabState,
} from './knowledge';

export interface AiAgentTabKnowledgeProps {
  articles: AiKnowledgeArticle[];
  setValue: UseFormSetValue<WhatsAppAiAgentFormData>;
  isAdministrator: boolean;
}

export const AiAgentTabKnowledge: React.FC<AiAgentTabKnowledgeProps> = memo(
  ({ articles, setValue, isAdministrator }) => {
    const {
      searchTerm,
      setSearchTerm,
      selectedCategory,
      setSelectedCategory,
      editingArticleId,
      isCreatingNew,
      draftTitle,
      setDraftTitle,
      draftCategory,
      setDraftCategory,
      draftContent,
      setDraftContent,
      draftPriority,
      setDraftPriority,
      draftKeywords,
      setDraftKeywords,
      filteredArticles,
      handleStartCreate,
      handleStartEdit,
      handleCancelEditor,
      handleSaveEditor,
      handleToggleActive,
      handleDeleteArticle,
    } = useKnowledgeTabState({
      articles,
      setValue,
      isAdministrator,
    });

    return (
      <div className="space-y-4">
        {/* Header com ações */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Base de Conhecimento Confiável e Versionada
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Artigos e políticas da loja que servem como fonte oficial e estável para as respostas da IA.
            </p>
          </div>

          {isAdministrator && !isCreatingNew && !editingArticleId && (
            <button
              type="button"
              onClick={handleStartCreate}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
            >
              <i className="bi bi-plus-lg text-xs" aria-hidden="true" />
              Novo Artigo
            </button>
          )}
        </div>

        {/* Editor Inline de Criação/Edição */}
        {(isCreatingNew || editingArticleId) && (
          <KnowledgeArticleEditor
            isCreatingNew={isCreatingNew}
            draftTitle={draftTitle}
            setDraftTitle={setDraftTitle}
            draftCategory={draftCategory}
            setDraftCategory={setDraftCategory}
            draftContent={draftContent}
            setDraftContent={setDraftContent}
            draftKeywords={draftKeywords}
            setDraftKeywords={setDraftKeywords}
            draftPriority={draftPriority}
            setDraftPriority={setDraftPriority}
            onCancel={handleCancelEditor}
            onSave={handleSaveEditor}
          />
        )}

        {/* Barra de Filtros e Busca */}
        <KnowledgeFilterBar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
        />

        {/* Lista de Artigos */}
        <div className="space-y-3">
          {filteredArticles.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              Nenhum artigo encontrado para o filtro selecionado.
            </div>
          ) : (
            filteredArticles.map((article) => (
              <KnowledgeArticleCard
                key={article.id}
                article={article}
                isAdministrator={isAdministrator}
                onToggleActive={handleToggleActive}
                onEdit={handleStartEdit}
                onDelete={handleDeleteArticle}
              />
            ))
          )}
        </div>
      </div>
    );
  }
);

AiAgentTabKnowledge.displayName = 'AiAgentTabKnowledge';
