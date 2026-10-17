'use client';

import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { toast } from 'sonner';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import {
  catalogSelectionFormSchema,
  categoryEnvironmentFormSchema,
} from '@/shared-utils/catalogFormSchemas';
import { withTimeout } from '../../../../../shared-utils/withTimeout';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { CategoryFormData, CategoryItem, CategoryLink } from '../types/categoryManager.types';
import { generateSlug } from '../utils/slugUtils';

export interface UseCategoriesManagerProps {
  readonly isOpen: boolean;
  readonly onSuccess?: () => void | Promise<void>;
}

export function useCategoriesManager({ isOpen, onSuccess }: UseCategoriesManagerProps) {
  const [categories, setCategories] = useState<readonly CategoryItem[]>([]);
  const [relationships, setRelationships] = useState<readonly CategoryLink[]>([]);
  const [loading, setLoading] = useState(true);

  const [isEditingDialogOpen, setIsEditingDialogOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<CategoryItem | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    slug: '',
    type: 'category',
    linkedIds: [],
  });

  const form = useZodForm(categoryEnvironmentFormSchema, formData);
  const deleteForm = useZodForm(catalogSelectionFormSchema, { id: '' });
  const [isAutoSlug, setIsAutoSlug] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [dataReady, setDataReady] = useState(false);
  const busy = useRef(false);
  const uncertain = useRef(false);
  const mounted = useRef(true);
  const querySequence = useRef(0);
  const { user, loading: authLoading } = useAuth();
  const context = useRef({ isOpen, userId: user?.id, generation: 0 });

  useLayoutEffect(() => {
    if (context.current.isOpen !== isOpen || context.current.userId !== user?.id) {
      context.current = { isOpen, userId: user?.id, generation: context.current.generation + 1 };
    }
  }, [isOpen, user?.id]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const isCurrent = (generation: number) =>
    mounted.current && context.current.isOpen && context.current.generation === generation;

  const showError = (error: unknown, generation = context.current.generation) => {
    if (!isCurrent(generation)) return;
    const message =
      error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
        ? error.message
        : 'Não foi possível confirmar a operação.';
    setErrorMessage(message);
    toast.error(message);
  };

  const request = async <T,>(
    query: PromiseLike<T>,
    generation: number,
    mutation = false
  ): Promise<T> => {
    if (!isCurrent(generation)) {
      throw new Error('A sessão ou o catálogo mudou. Reabra o gerenciamento.');
    }
    let result: T | null;
    try {
      result = await withTimeout(query, 20_000, null, 'Gerenciamento de categorias');
    } catch (error) {
      if (mutation) uncertain.current = true;
      throw error;
    }
    if (result === null) {
      if (mutation) uncertain.current = true;
      throw new Error(
        mutation
          ? 'A gravação não foi confirmada. Confira os cadastros e recarregue a página antes de repetir.'
          : 'O carregamento demorou demais. Tente novamente.'
      );
    }
    if (!isCurrent(generation)) {
      throw new Error('A sessão ou o catálogo mudou. Reabra o gerenciamento.');
    }
    return result;
  };

  async function fetchData(generation = context.current.generation) {
    const sequence = ++querySequence.current;
    setLoading(true);
    setDataReady(false);
    try {
      const [catRes, relRes] = await Promise.all([
        request(supabase.from('categories').select('*').order('name'), generation),
        request(supabase.from('category_relationships').select('*'), generation),
      ]);
      if (!isCurrent(generation) || querySequence.current !== sequence) return false;
      if (catRes.error) throw catRes.error;
      if (relRes.error) throw relRes.error;
      if (!Array.isArray(catRes.data) || !Array.isArray(relRes.data)) {
        throw new Error('O carregamento das categorias não foi confirmado.');
      }
      setCategories(catRes.data || []);
      setRelationships(relRes.data || []);
      setDataReady(true);
      return true;
    } catch (error) {
      if (querySequence.current === sequence) showError(error, generation);
      return false;
    } finally {
      if (isCurrent(generation) && querySequence.current === sequence) setLoading(false);
    }
  }

  useEffect(() => {
    if (isOpen && !authLoading && user) void fetchData();
    // Reload belongs to the modal/account; local edits do not replace its draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, authLoading, user?.id]);

  const startOperation = () => {
    if (busy.current) return false;
    if (uncertain.current) {
      showError(
        new Error(
          'Há uma gravação sem confirmação. Confira os cadastros e recarregue a página.'
        )
      );
      return false;
    }
    if (!dataReady || authLoading || !user) {
      showError(new Error('Aguarde o carregamento das categorias e da sessão.'));
      return false;
    }
    busy.current = true;
    setIsSaving(true);
    setErrorMessage('');
    return true;
  };

  const finishOperation = () => {
    busy.current = false;
    if (mounted.current) setIsSaving(false);
  };

  const refreshOwner = async (generation: number) => {
    await fetchData(generation);
    if (isCurrent(generation) && onSuccess) {
      const notified = await withTimeout(
        Promise.resolve(onSuccess()).then(() => true),
        20_000,
        false,
        'Atualização das categorias no produto'
      );
      if (!notified) {
        showError(
          new Error('Cadastro salvo, mas a atualização do produto demorou demais. Reabra o produto.'),
          generation
        );
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startOperation()) return;
    const generation = context.current.generation;
    try {
      await form.validateAndRun(
        formData,
        async (validated) => {
          if (!isCurrent(generation)) return;
          let itemId = currentCategory?.id;
          const itemData = { name: validated.name, slug: validated.slug, type: validated.type };
          const saved = itemId
            ? await request(
                supabase
                  .from('categories')
                  .update(itemData)
                  .eq('id', itemId)
                  .select(),
                generation,
                true
              )
            : await request(
                supabase.from('categories').insert([itemData]).select(),
                generation,
                true
              );
          if (saved.error) throw saved.error;
          if (
            saved.data?.length !== 1 ||
            !saved.data[0].id ||
            (itemId && saved.data[0].id !== itemId) ||
            saved.data[0].name !== itemData.name ||
            saved.data[0].slug !== itemData.slug ||
            saved.data[0].type !== itemData.type
          ) {
            uncertain.current = true;
            throw new Error(
              'O cadastro não devolveu confirmação dos dados. Confira e recarregue a página antes de repetir.'
            );
          }
          itemId = saved.data[0].id;
          setCurrentCategory(saved.data[0]); // A confirmed create must not be inserted again after a link failure.
          for (const key of ['child_id', 'parent_id'] as const) {
            const removed = await request(
              supabase
                .from('category_relationships')
                .delete()
                .eq(key, itemId)
                .select('parent_id,child_id'),
              generation,
              true
            );
            if (removed.error) throw removed.error;
            if (!Array.isArray(removed.data) || removed.data.some((row) => row[key] !== itemId)) {
              throw new Error('A remoção dos vínculos anteriores não foi confirmada.');
            }
          }
          const newRels = [...new Set(validated.linkedIds)].map((id) =>
            validated.type === 'category'
              ? { parent_id: id, child_id: itemId! }
              : { parent_id: itemId!, child_id: id }
          );
          if (newRels.length) {
            const linked = await request(
              supabase
                .from('category_relationships')
                .insert(newRels)
                .select('parent_id,child_id'),
              generation,
              true
            );
            if (linked.error) throw linked.error;
            if (
              linked.data?.length !== newRels.length ||
              newRels.some(
                (expected) =>
                  !linked.data.some(
                    (row) => row.parent_id === expected.parent_id && row.child_id === expected.child_id
                  )
              )
            ) {
              throw new Error('Os vínculos selecionados não foram confirmados.');
            }
          }
          await refreshOwner(generation);
          if (!isCurrent(generation)) return;
          setIsEditingDialogOpen(false);
          toast.success('Salvo com sucesso!');
        },
        (errors) => showError(new Error(Object.values(flattenFormErrors(errors))[0]), generation)
      );
    } catch (error) {
      showError(error, generation);
    } finally {
      finishOperation();
    }
  };

  const handleDelete = async (id: string) => {
    if (!startOperation()) return;
    const generation = context.current.generation;
    try {
      await deleteForm.validateAndRun(
        { id },
        async (values) => {
          if (!isCurrent(generation) || !categories.some((category) => category.id === values.id)) {
            throw new Error('O item selecionado não está mais disponível. Atualize a lista.');
          }
          if (!confirm('Excluir este item?')) return;
          const { data, error } = await request(
            supabase.from('categories').delete().eq('id', values.id).select('id'),
            generation,
            true
          );
          if (error) throw error;
          if (data?.length !== 1 || data[0].id !== values.id) {
            throw new Error('A exclusão do item não foi confirmada.');
          }
          await refreshOwner(generation);
          if (isCurrent(generation)) toast.success('Excluído!');
        },
        (errors) => showError(new Error(Object.values(flattenFormErrors(errors))[0]), generation)
      );
    } catch (error) {
      showError(error, generation);
    } finally {
      finishOperation();
    }
  };

  const openEditDialog = (
    category: CategoryItem | null = null,
    defaultType: string = 'category'
  ) => {
    if (busy.current || !dataReady || uncertain.current) return;
    setCurrentCategory(category);
    const type = category?.type || defaultType;
    setIsAutoSlug(!category); // Auto slug ativo apenas para novos por padrão

    const linkedIds = category
      ? relationships
          .filter((r) =>
            type === 'category' ? r.child_id === category.id : r.parent_id === category.id
          )
          .map((r) => (type === 'category' ? r.parent_id : r.child_id))
      : [];

    setFormData({
      name: category?.name || '',
      slug: category?.slug || '',
      type,
      linkedIds,
    });
    setIsEditingDialogOpen(true);
  };

  const handleNameChange = (name: string) => {
    const newSlug = isAutoSlug ? generateSlug(name) : formData.slug;
    setFormData((prev) => ({ ...prev, name, slug: newSlug }));
  };

  const environments = categories.filter((c) => c.type === 'environment');
  const productCategories = categories.filter((c) => c.type === 'category');

  return {
    categories,
    relationships,
    environments,
    productCategories,
    loading,
    dataReady,
    isSaving,
    errorMessage,
    isEditingDialogOpen,
    setIsEditingDialogOpen,
    currentCategory,
    formData,
    setFormData,
    isAutoSlug,
    setIsAutoSlug,
    busy: busy.current,
    fetchData,
    openEditDialog,
    handleNameChange,
    handleSave,
    handleDelete,
  };
}
