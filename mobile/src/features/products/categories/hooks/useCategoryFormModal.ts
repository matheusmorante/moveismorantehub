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
    setSelectedLinks(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  }, []);

  const handleSave = useCallback(async () => {
    const formattedName = nameInput.trim().toUpperCase();
    if (!formattedName) {
      Alert.alert('Nome obrigatório', 'O nome não pode estar vazio.');
      return;
    }

    const isEnv = showModal === 'ambiente';
    const duplicate = isEnv
      ? environments.find(
          e => e.name.trim().toUpperCase() === formattedName && e.id !== editingNode?.id
        )
      : categories.find(
          c => c.name.trim().toUpperCase() === formattedName && c.id !== editingNode?.id
        );

    if (duplicate) {
      Alert.alert(
        'Nome duplicado',
        `Já existe um ${isEnv ? 'Ambiente' : 'Categoria'} com o nome "${formattedName}".`
      );
      return;
    }

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
