import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import {
  fetchMobileCategoryRequiredAttributes,
  saveMobileEnvironment,
  saveMobileCategory,
} from '../../services/mobileCategoryService';
import {
  EnvironmentNode,
  CategoryNode,
  ModalType,
  EditingNode,
} from '../types/mobileCategory.types';
import { validateNodeName, toggleNodeLink } from '../domain/categoryEnvironmentRules';

interface Props {
  environments: EnvironmentNode[];
  categories: CategoryNode[];
  onSuccess: () => Promise<void>;
}

export function useCategoryFormModal({ environments, categories, onSuccess }: Props) {
  const [showModal, setShowModal] = useState<ModalType | null>(null);
  const [editingNode, setEditingNode] = useState<EditingNode | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [selectedLinks, setSelectedLinks] = useState<string[]>([]);
  const [selectedAttributes, setSelectedAttributes] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingAttributes, setIsLoadingAttributes] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const closeForm = useCallback(() => {
    setShowModal(null);
    setEditingNode(null);
    setNameInput('');
    setSelectedLinks([]);
    setSelectedAttributes([]);
    setIsLoadingAttributes(false);
  }, []);

  const openNewEnvironment = useCallback(() => {
    setEditingNode(null);
    setNameInput('');
    setSelectedLinks([]);
    setShowModal('ambiente');
  }, []);

  const openNewCategory = useCallback((preSelectedEnvId?: string) => {
    setEditingNode(null);
    setNameInput('');
    setSelectedLinks(preSelectedEnvId ? [preSelectedEnvId] : []);
    setSelectedAttributes([]);
    setIsLoadingAttributes(false);
    setShowModal('categoria');
  }, []);

  const openEditEnvironment = useCallback((env: EnvironmentNode) => {
    setEditingNode({ id: env.id, type: 'ambiente' });
    setNameInput(env.name);
    setSelectedLinks(env.categories || []);
    setShowModal('ambiente');
  }, []);

  const openEditCategory = useCallback(async (cat: CategoryNode) => {
    setEditingNode({ id: cat.id, type: 'categoria' });
    setNameInput(cat.name);
    setSelectedLinks(cat.parents || []);
    setSelectedAttributes([]);
    setIsLoadingAttributes(true);
    setShowModal('categoria');

    try {
      const attrs = await fetchMobileCategoryRequiredAttributes(cat.id);
      setSelectedAttributes(attrs);
    } catch (err) {
      console.warn('Erro ao carregar atributos da categoria:', err);
    } finally {
      setIsLoadingAttributes(false);
    }
  }, []);

  const toggleLink = useCallback((id: string) => {
    setSelectedLinks(prev => toggleNodeLink(prev, id));
  }, []);

  const handleSave = useCallback(async () => {
    const isEnv = showModal === 'ambiente';
    const validation = validateNodeName(
      nameInput,
      isEnv ? environments : categories,
      editingNode?.id,
      isEnv ? 'Ambiente' : 'Categoria'
    );

    if (!validation.valid) {
      Alert.alert(
        validation.error?.includes('vazio') ? 'Nome obrigatório' : 'Nome duplicado',
        validation.error || 'Nome inválido.'
      );
      return;
    }

    const formattedName = validation.formattedName!;

    setIsSubmitting(true);
    try {
      if (isEnv) {
        await saveMobileEnvironment(formattedName, selectedLinks, editingNode?.id);
      } else {
        const attributeIds = selectedAttributes.map(a => a.id);
        await saveMobileCategory(formattedName, selectedLinks, attributeIds, editingNode?.id);
      }
      closeForm();
      await onSuccess();
    } catch (err: any) {
      Alert.alert('Erro ao salvar', err?.message || 'Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    nameInput,
    showModal,
    environments,
    categories,
    editingNode,
    selectedLinks,
    selectedAttributes,
    closeForm,
    onSuccess,
  ]);

  return {
    showModal,
    editingNode,
    nameInput,
    setNameInput,
    selectedLinks,
    selectedAttributes,
    setSelectedAttributes,
    isLoadingAttributes,
    isSubmitting,
    closeForm,
    openNewEnvironment,
    openNewCategory,
    openEditEnvironment,
    openEditCategory,
    toggleLink,
    handleSave,
  };
}
