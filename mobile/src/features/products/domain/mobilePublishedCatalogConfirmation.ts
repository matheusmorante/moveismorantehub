import { Alert } from 'react-native';
import { withTimeout } from '../../../../../shared-utils/withTimeout';
import { fetchMobileProductTechnicalFields } from '../services/mobileProductTechnicalService';
import { shouldValidatePublishedCatalogEdit } from './productSaveState';
import {
  getMobilePublishedCatalogEditLegibility,
  buildPublishedCatalogEditConfirmationMessage,
} from './productRegistrationRules';

export interface MobilePublishedCatalogConfirmationResult {
  readonly shouldContinue: boolean;
  readonly hideFromCatalog: boolean;
}

/**
 * Valida a elegibilidade de publicação ao editar produto publicado no app móvel.
 * Se houver perda de conformidade com o Catálogo Digital, exibe alerta nativo de confirmação
 * detalhando motivo, campos pendentes e instrução para ajustar a conformidade.
 */
export async function verifyAndConfirmMobilePublishedCatalogEdit(
  product: any,
  validatedData: any
): Promise<MobilePublishedCatalogConfirmationResult> {
  const needsValidation = shouldValidatePublishedCatalogEdit(
    product?.status || validatedData.status,
    product,
    validatedData
  );

  if (!needsValidation) {
    return { shouldContinue: true, hideFromCatalog: false };
  }

  let categoryRequirements: Awaited<
    ReturnType<typeof fetchMobileProductTechnicalFields>
  > | null = null;

  try {
    categoryRequirements = await withTimeout(
      fetchMobileProductTechnicalFields({ requireCategoryLinks: true }),
      15000,
      null,
      'produto:verificar-requisitos-do-catalogo'
    );
    if (!categoryRequirements) {
      throw new Error('Requisitos de categoria indisponíveis.');
    }
  } catch {
    Alert.alert(
      'Verificação indisponível',
      'Não foi possível verificar as características obrigatórias da categoria. O produto publicado não foi alterado.'
    );
    return { shouldContinue: false, hideFromCatalog: false };
  }

  const catalogEditLegibility = getMobilePublishedCatalogEditLegibility(
    product,
    validatedData,
    categoryRequirements
  );

  if (catalogEditLegibility && !catalogEditLegibility.isLegible) {
    const confirmationMessage =
      buildPublishedCatalogEditConfirmationMessage(catalogEditLegibility);

    const confirmed = await new Promise<boolean>((resolve) => {
      Alert.alert(
        'Ocultar produto do Catálogo Digital?',
        confirmationMessage,
        [
          { text: 'Continuar editando', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Salvar e ocultar', style: 'destructive', onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) }
      );
    });

    if (!confirmed) {
      return { shouldContinue: false, hideFromCatalog: false };
    }

    return { shouldContinue: true, hideFromCatalog: true };
  }

  return { shouldContinue: true, hideFromCatalog: false };
}
