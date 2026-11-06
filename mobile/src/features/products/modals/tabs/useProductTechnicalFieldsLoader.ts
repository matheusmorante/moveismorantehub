import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
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
  const requestRef = useRef<{
    isVariationEditing: boolean;
    refreshKey: number;
    promise: Promise<MobileProductTechnicalField[] | null>;
    confirmed: boolean;
  } | null>(null);
  const categoryKey = [...categoryIds].sort().join(',');

  useEffect(() => {
    let request = requestRef.current;
    if (!request || request.isVariationEditing !== isVariationEditing || request.refreshKey !== refreshKey) {
      request = {
        isVariationEditing,
        refreshKey,
        promise: isVariationEditing
          ? withTimeout(fetchMobileProductTechnicalFields(), 15_000, null, 'variacao:caracteristicas')
          : fetchMobileProductTechnicalFields(),
        confirmed: false,
      };
      requestRef.current = request;
    }
    if (request.confirmed) return;
    const currentRequest = request;
    let mounted = true;
    const load = async () => {
      setLoadingFields(true);
      setTechnicalFieldsError(null);
      try {
        const fields = await currentRequest.promise;
        if (!mounted) return;
        if (!fields) throw new Error('Consulta de características não confirmada.');
        currentRequest.confirmed = true;
        setTechnicalFields(fields);
      } catch (error) {
        if (requestRef.current === currentRequest) requestRef.current = null;
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
    categoryKey,
    isVariationEditing,
    refreshKey,
    setTechnicalFields,
    setLoadingFields,
    setTechnicalFieldsError,
  ]);
}
