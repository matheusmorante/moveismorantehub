import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { z } from 'zod';
import { useZodForm, flattenFormErrors } from '../../../../hooks/useZodForm';
import { catalogNameFormSchema } from '../../../../../../shared-utils/catalogFormSchemas';
import {
  categoryAttributeSelectionsSchema,
  type CategoryAttributeSelection,
} from '../../../../../../shared-utils/categoryAttributeSelection';
import {
  fetchMobileCategoryAttributes,
  saveMobileEnvironment,
  saveMobileCategory,
} from '../../services/mobileCategoryService';
import type {
  EnvironmentNode,
  CategoryNode,
  ModalType,
  EditingNode,
} from '../types/mobileCategory.types';
import {
  canSaveCategoryAttributes,
  validateNodeName,
  toggleNodeLink,
} from '../domain/categoryEnvironmentRules';

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
  const [selectedAttributes, setSelectedAttributes] = useState<CategoryAttributeSelection[]>([]);
  const [isLoadingAttributes, setIsLoadingAttributes] = useState(false);
  const [attributeLoadFailed, setAttributeLoadFailed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formSchema = catalogNameFormSchema
    .extend({
      name: catalogNameFormSchema.shape.name.transform((value) => value.trim().toUpperCase()),
      type: z.enum(['ambiente', 'categoria']),
      linkedIds: z.array(z.string().min(1, 'Selecione um vínculo válido.')),
      attributes: categoryAttributeSelectionsSchema,
    })
    .superRefine((values, ctx) => {
      const isEnv = values.type === 'ambiente';
      if (!canSaveCategoryAttributes(!isEnv, isLoadingAttributes, attributeLoadFailed)) {
        ctx.addIssue({
          code: 'custom',
          path: ['attributes'],
          message: 'Aguarde o carregamento dos atributos ou feche e reabra a categoria para tentar novamente.',
        });
      }
      const validation = validateNodeName(
        values.name,
        isEnv ? environments : categories,
        editingNode?.id,
        isEnv ? 'Ambiente' : 'Categoria',
      );
      if (!validation.valid) {
        ctx.addIssue({
          code: 'custom',
          path: ['name'],
          message: validation.error || 'Nome inválido.',
        });
      }
    });
  const formValues = {
    name: nameInput,
    type: showModal || 'categoria',
    linkedIds: selectedLinks,
    attributes: selectedAttributes,
  };
  const { validateAndRun } = useZodForm(formSchema, formValues);

  const closeForm = useCallback(() => {
    setShowModal(null);
    setEditingNode(null);
    setNameInput('');
    setSelectedLinks([]);
    setSelectedAttributes([]);
    setIsLoadingAttributes(false);
    setAttributeLoadFailed(false);
  }, []);

  const openNewEnvironment = useCallback(() => {
    setEditingNode(null);
    setNameInput('');
    setSelectedLinks([]);
    setIsLoadingAttributes(false);
    setAttributeLoadFailed(false);
    setShowModal('ambiente');
  }, []);

  const openNewCategory = useCallback((preSelectedEnvId?: string) => {
    setEditingNode(null);
    setNameInput('');
    setSelectedLinks(preSelectedEnvId ? [preSelectedEnvId] : []);
    setSelectedAttributes([]);
    setIsLoadingAttributes(false);
    setAttributeLoadFailed(false);
    setShowModal('categoria');
  }, []);

  const openEditEnvironment = useCallback((env: EnvironmentNode) => {
    setEditingNode({ id: env.id, type: 'ambiente' });
    setNameInput(env.name);
    setSelectedLinks(env.categories || []);
    setIsLoadingAttributes(false);
    setAttributeLoadFailed(false);
    setShowModal('ambiente');
  }, []);

  const openEditCategory = useCallback(async (cat: CategoryNode) => {
    setEditingNode({ id: cat.id, type: 'categoria' });
    setNameInput(cat.name);
    setSelectedLinks(cat.parents || []);
    setSelectedAttributes([]);
    setAttributeLoadFailed(false);
    setIsLoadingAttributes(true);
    setShowModal('categoria');

    try {
      const attrs = await fetchMobileCategoryAttributes(cat.id);
      setSelectedAttributes(attrs);
    } catch (err) {
      console.warn('Erro ao carregar atributos da categoria:', err);
      setAttributeLoadFailed(true);
      Alert.alert(
        'Não foi possível carregar',
        'A configuração atual da categoria não foi carregada. Feche e reabra antes de editar.'
      );
    } finally {
      setIsLoadingAttributes(false);
    }
  }, []);

  const toggleLink = useCallback((id: string) => {
    setSelectedLinks((prev) => toggleNodeLink(prev, id));
  }, []);

  const handleSave = useCallback(async () => {
    if (!showModal || isSubmitting) return;
    await validateAndRun(
      {
        name: nameInput,
        type: showModal,
        linkedIds: selectedLinks,
        attributes: selectedAttributes,
      },
      async (values) => {
        setIsSubmitting(true);
        try {
          if (values.type === 'ambiente') {
            await saveMobileEnvironment(values.name, values.linkedIds, editingNode?.id);
          } else {
            await saveMobileCategory(
              values.name,
              values.linkedIds,
              values.attributes,
              editingNode?.id,
            );
          }
          closeForm();
          await onSuccess();
        } catch (err: unknown) {
          Alert.alert('Erro ao salvar', err instanceof Error ? err.message : 'Tente novamente.');
        } finally {
          setIsSubmitting(false);
        }
      },
      (errors) => {
        Alert.alert(
          'Revise o cadastro',
          Object.values(flattenFormErrors(errors))[0] || 'Revise os campos informados.',
        );
      },
    );
  }, [
    nameInput,
    showModal,
    editingNode,
    selectedLinks,
    selectedAttributes,
    isSubmitting,
    validateAndRun,
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
    attributeLoadFailed,
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
