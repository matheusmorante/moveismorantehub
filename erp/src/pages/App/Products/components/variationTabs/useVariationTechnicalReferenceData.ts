import { useEffect } from 'react';
import type React from 'react';
import type { CharacteristicGroup } from '@/pages/types/variation.type';
import type { TechnicalFieldDefinition } from '@/pages/utils/technicalValuesService';
import { fetchTechnicalFieldDefinitions } from '../../services/technicalFieldService';
import { fetchCharacteristicGroups } from '@/pages/utils/characteristicGroupService';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';

interface UseVariationTechnicalReferenceDataOptions {
  initialTechnicalFields?: TechnicalFieldDefinition[];
  parentCategoryIdsKey: string;
  refreshKey: number;
  setAllTechnicalFields: React.Dispatch<React.SetStateAction<TechnicalFieldDefinition[]>>;
  setCharacteristicGroups: React.Dispatch<React.SetStateAction<CharacteristicGroup[]>>;
  setFieldsError: React.Dispatch<React.SetStateAction<string>>;
  setGroupsError: React.Dispatch<React.SetStateAction<string>>;
  setLoadingFields: React.Dispatch<React.SetStateAction<boolean>>;
  setLoadingGroups: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useVariationTechnicalReferenceData({
  initialTechnicalFields,
  parentCategoryIdsKey,
  refreshKey,
  setAllTechnicalFields,
  setCharacteristicGroups,
  setFieldsError,
  setGroupsError,
  setLoadingFields,
  setLoadingGroups,
}: UseVariationTechnicalReferenceDataOptions) {
  // Carregar Informações Técnicas cadastradas e vínculos
  useEffect(() => {
    let isMounted = true;

    // Se já foi fornecido inicialmente e não houve refresh forçado, usa o estado inicial
    if (initialTechnicalFields && initialTechnicalFields.length > 0 && refreshKey === 0) {
      return;
    }

    const loadFields = async () => {
      setLoadingFields(true);
      setFieldsError('');
      try {
        const categoryIds: string[] = JSON.parse(parentCategoryIdsKey);
        const mapped = await withTimeout(fetchTechnicalFieldDefinitions('variation-form', { categoryIds, forceRefresh: refreshKey > 0 }), 15000, null, 'variacao:caracteristicas');
        if (!isMounted) return;
        if (!mapped) throw new Error('Consulta de características não confirmada.');
        setAllTechnicalFields(mapped);
      } catch {
        if (isMounted) setFieldsError('Não foi possível carregar as características. Consulte novamente.');
      } finally {
        if (isMounted) setLoadingFields(false);
      }
    };

    loadFields();

    return () => {
      isMounted = false;
    };
  }, [refreshKey, initialTechnicalFields, parentCategoryIdsKey]);

  useEffect(() => {
    let isMounted = true;
    setLoadingGroups(true);
    setGroupsError('');

    const loadGroups = async () => {
      try {
        const result = await withTimeout(
          fetchCharacteristicGroups(),
          15000,
          null,
          'variacao:aplicacoes-dos-grupos-de-caracteristicas'
        );
        if (!result) throw new Error('Consulta de grupos não confirmada.');
        if (isMounted) setCharacteristicGroups(result.groups);
      } catch {
        if (isMounted) {
          setCharacteristicGroups([]);
          setGroupsError('Não foi possível verificar os grupos de características. Consulte novamente.');
        }
      } finally {
        if (isMounted) setLoadingGroups(false);
      }
    };

    void loadGroups();
    return () => {
      isMounted = false;
    };
  }, [refreshKey]);
}