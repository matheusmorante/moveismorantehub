import { useState } from 'react';
import type { UseFormSetValue } from 'react-hook-form';
import type {
  WhatsAppAiAgentFormData,
  AiKnowledgeArticle,
  AiKnowledgeCategory,
} from '../../../../../../../shared-utils/whatsappAiAgentSchemas';

interface UseKnowledgeTabStateParams {
  articles: AiKnowledgeArticle[];
  setValue: UseFormSetValue<WhatsAppAiAgentFormData>;
  isAdministrator: boolean;
}

export function useKnowledgeTabState({
  articles,
  setValue,
  isAdministrator,
}: UseKnowledgeTabStateParams) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Form local para criação/edição
  const [draftTitle, setDraftTitle] = useState('');
  const [draftCategory, setDraftCategory] = useState<AiKnowledgeCategory>('faq');
  const [draftContent, setDraftContent] = useState('');
  const [draftPriority, setDraftPriority] = useState<number>(5);
  const [draftKeywords, setDraftKeywords] = useState('');

  const filteredArticles = articles.filter((art) => {
    const matchesCategory = selectedCategory === 'todos' || art.category === selectedCategory;
    if (!matchesCategory) return false;

    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      art.title.toLowerCase().includes(term) ||
      art.content.toLowerCase().includes(term) ||
      (art.keywords || []).some((k) => k.toLowerCase().includes(term))
    );
  });

  const handleStartCreate = () => {
    setDraftTitle('');
    setDraftCategory('faq');
    setDraftContent('');
    setDraftPriority(5);
    setDraftKeywords('');
    setEditingArticleId(null);
    setIsCreatingNew(true);
  };

  const handleStartEdit = (article: AiKnowledgeArticle) => {
    setDraftTitle(article.title);
    setDraftCategory(article.category);
    setDraftContent(article.content);
    setDraftPriority(article.priority || 5);
    setDraftKeywords((article.keywords || []).join(', '));
    setEditingArticleId(article.id);
    setIsCreatingNew(false);
  };

  const handleCancelEditor = () => {
    setIsCreatingNew(false);
    setEditingArticleId(null);
  };

  const handleSaveEditor = () => {
    if (!draftTitle.trim() || !draftContent.trim()) return;

    const keywordsArray = draftKeywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    if (isCreatingNew) {
      const newArticle: AiKnowledgeArticle = {
        id: `kb_${Date.now()}`,
        title: draftTitle.trim(),
        category: draftCategory,
        content: draftContent.trim(),
        priority: draftPriority,
        version: 1,
        active: true,
        keywords: keywordsArray,
        updatedAt: new Date().toISOString(),
      };
      setValue('knowledgeBase', [...articles, newArticle], {
        shouldDirty: true,
        shouldValidate: true,
      });
    } else if (editingArticleId) {
      const updated = articles.map((art) => {
        if (art.id === editingArticleId) {
          return {
            ...art,
            title: draftTitle.trim(),
            category: draftCategory,
            content: draftContent.trim(),
            priority: draftPriority,
            version: (art.version || 1) + 1,
            keywords: keywordsArray,
            updatedAt: new Date().toISOString(),
          };
        }
        return art;
      });
      setValue('knowledgeBase', updated, { shouldDirty: true, shouldValidate: true });
    }

    handleCancelEditor();
  };

  const handleToggleActive = (articleId: string) => {
    if (!isAdministrator) return;
    const updated = articles.map((a) => (a.id === articleId ? { ...a, active: !a.active } : a));
    setValue('knowledgeBase', updated, { shouldDirty: true, shouldValidate: true });
  };

  const handleDeleteArticle = (articleId: string) => {
    if (!isAdministrator) return;
    const updated = articles.filter((a) => a.id !== articleId);
    setValue('knowledgeBase', updated, { shouldDirty: true, shouldValidate: true });
  };

  return {
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
  };
}
