import { useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { z } from 'zod';
import { useZodForm, flattenFormErrors } from '../../../../hooks/useZodForm';
import { catalogNameFormSchema } from '../../../../../../shared-utils/catalogFormSchemas';
import {
  categoryAttributeSelectionsSchema,
  resolveCategoryAttributeIsRequired,
  type CategoryAttributeSelection,
} from '../../../../../../shared-utils/categoryAttributeSelection';
import {
  fetchMobileCategoryAttributes,
  saveMobileEnvironment,
  saveMobileCategory,
} from '../../services/categories/mobileCategoryService';
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

const areIdsEqual = (left: readonly string[], right: readonly string[]) => {
  if (left.length !== right.length) return false;
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.every((id, index) => id === sortedRight[index]);
};

const getPersistedAttributeSelection = (attributes: readonly CategoryAttributeSelection[]) =>
  [...new Map(
    attributes.map((attribute) => [
      attribute.id,
      resolveCategoryAttributeIsRequired(attribute),
    ] as const),
  )]
    .sort(([leftId], [rightId]) => leftId.localeCompare(rightId));

const areCategoryAttributesEqual = (
  left: readonly CategoryAttributeSelection[],
  right: readonly CategoryAttributeSelection[],
) => {
  const persistedLeft = getPersistedAttributeSelection(left);
  const persistedRight = getPersistedAttributeSelection(right);
  return persistedLeft.length === persistedRight.length && persistedLeft.every(
    ([id, isRequired], index) =>
      id === persistedRight[index]?.[0] && isRequired === persistedRight[index]?.[1],
  );
};

export function useCategoryFormModal({ environments, categories, onSuccess }: Props) {
  const [showModal, setShowModal] = useState<ModalType | null>(null);
  const [editingNode, setEditingNode] = useState<EditingNode | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [selectedLinks, setSelectedLinks] = useState<string[]>([]);
  const [selectedAttributes, setSelectedAttributes] = useState<CategoryAttributeSelection[]>([]);
  const initialSelectedLinksRef = useRef<string[]>([]);
  const initialAttributesRef = useRef<CategoryAttributeSelection[]>([]);
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
          message: 'Aguarde o carregamento das características ou feche e reabra a categoria para tentar novamente.',
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
    initialSelectedLinksRef.current = [];
    initialAttributesRef.current = [];
    setIsLoadingAttributes(false);
    setAttributeLoadFailed(false);
  }, []);

  const openNewEnvironment = useCallback(() => {
    setEditingNode(null);
    setNameInput('');
    setSelectedLinks([]);
    initialSelectedLinksRef.current = [];
    setSelectedAttributes([]);
    initialAttributesRef.current = [];
    setIsLoadingAttributes(false);
    setAttributeLoadFailed(false);
    setShowModal('ambiente');
  }, []);

  const openNewCategory = useCallback((preSelectedEnvId?: string) => {
    setEditingNode(null);
    setNameInput('');
    setSelectedLinks(preSelectedEnvId ? [preSelectedEnvId] : []);
    initialSelectedLinksRef.current = preSelectedEnvId ? [preSelectedEnvId] : [];
    setSelectedAttributes([]);
    initialAttributesRef.current = [];
    setIsLoadingAttributes(false);
    setAttributeLoadFailed(false);
    setShowModal('categoria');
  }, []);

  const openEditEnvironment = useCallback((env: EnvironmentNode) => {
    setEditingNode({ id: env.id, type: 'ambiente' });
    setNameInput(env.name);
    setSelectedLinks(env.categories || []);
    initialSelectedLinksRef.current = [...(env.categories || [])];
    setIsLoadingAttributes(false);
    setAttributeLoadFailed(false);
    setShowModal('ambiente');
  }, []);

  const openEditCategory = useCallback(async (cat: CategoryNode) => {
    setEditingNode({ id: cat.id, type: 'categoria' });
    setNameInput(cat.name);
    setSelectedLinks(cat.parents || []);
    initialSelectedLinksRef.current = [...(cat.parents || [])];
    setSelectedAttributes([]);
    initialAttributesRef.current = [];
    setAttributeLoadFailed(false);
    setIsLoadingAttributes(true);
    setShowModal('categoria');

    try {
      const attrs = await fetchMobileCategoryAttributes(cat.id);
      initialAttributesRef.current = attrs.map((attribute) => ({ ...attribute }));
      setSelectedAttributes(attrs);
    } catch (err) {
      console.warn('Erro ao carregar características da categoria:', err);
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
            const linksUnchanged = editingNode?.type === 'ambiente' && areIdsEqual(
              values.linkedIds,
              initialSelectedLinksRef.current,
            );
            await saveMobileEnvironment(
              values.name,
              linksUnchanged ? undefined : values.linkedIds,
              editingNode?.id,
            );
          } else {
            const linksUnchanged = editingNode?.type === 'categoria' && areIdsEqual(
              values.linkedIds,
              initialSelectedLinksRef.current,
            );
            const attributesUnchanged = editingNode?.type === 'categoria' && areCategoryAttributesEqual(
              values.attributes,
              initialAttributesRef.current,
            );
            await saveMobileCategory(
              values.name,
              linksUnchanged ? undefined : values.linkedIds,
              attributesUnchanged ? undefined : values.attributes,
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
