import { useEffect, type Dispatch, type SetStateAction } from 'react';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
import {
  fetchMobileProductTechnicalFields,
  type MobileProductTechnicalField,
} from '../../services/mobileProductTechnicalService';

interface Args {
  categoryIds: string[];
  isVariationEditing: boolean;
  refreshKey: number;
  setTechnicalFields: Dispatch<SetStateAction<MobileProductTechnicalField[]>>;
  setLoadingFields: Dispatch<SetStateAction<boolean>>;
  setTechnicalFieldsError: Dispatch<SetStateAction<string | null>>;
}

export function useProductTechnicalFieldsLoader({
  categoryIds,
  isVariationEditing,
  refreshKey,
  setTechnicalFields,
  setLoadingFields,
  setTechnicalFieldsError,
}: Args) {
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoadingFields(true);
      setTechnicalFieldsError(null);
      try {
        const fields = isVariationEditing
          ? await withTimeout(
              fetchMobileProductTechnicalFields(),
              15_000,
              null,
              'variacao:caracteristicas'
            )
          : await fetchMobileProductTechnicalFields();
        if (!mounted) return;
        if (!fields) throw new Error('Consulta de características não confirmada.');
        setTechnicalFields(fields);
      } catch (error) {
        if (!mounted) return;
        console.warn('[ProductFormTechnicalTab] Falha ao carregar características do ERP:', error);
        setTechnicalFieldsError(
          'Não foi possível carregar as características. Consulte novamente.'
        );
      } finally {
        if (mounted) setLoadingFields(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [
    categoryIds,
    isVariationEditing,
    refreshKey,
    setTechnicalFields,
    setLoadingFields,
    setTechnicalFieldsError,
  ]);
}
