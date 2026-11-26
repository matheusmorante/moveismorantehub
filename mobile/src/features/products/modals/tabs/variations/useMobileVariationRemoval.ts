import type React from 'react';
import { Alert } from 'react-native';
import { flattenFormErrors, useZodForm } from '../../../../../hooks/useZodForm';
import { variationToSimpleConfirmationSchema } from '../../../../../../../shared-utils/productVariationOperationFormSchemas';
import { checkMobileProductVariationHasMoves } from '../../../services/products/mobileProductMutationService';
import { inheritMobileSimpleVariationFromParent } from '../../../domain/productVariationParentSync';

interface UseMobileVariationRemovalParams {
  variations: any[];
  formData: any;
  isExistingProduct: boolean;
  expanded: number | null;
  setExpanded: React.Dispatch<React.SetStateAction<number | null>>;
  setFormData: (fn: (prev: any) => any) => void;
}

/** Valida e executa a remoção segura de variações, incluindo confirmação RHF/Zod para produto simples. */
export function useMobileVariationRemoval(params: UseMobileVariationRemovalParams) {
  const { variations, formData, isExistingProduct, expanded, setExpanded, setFormData } = params;

  const simpleConversionForm = useZodForm(variationToSimpleConfirmationSchema, {
    variationId: '',
    acknowledged: true,
  });

  const handleRemove = async (index: number) => {
    if (variations.length <= 1) {
      Alert.alert(
        'Variação obrigatória',
        'O produto precisa manter pelo menos uma variação operacional.'
      );
      return;
    }

    const variation = variations[index];
    const isMerged = Boolean(
      variation?.is_merged ||
        variation?.isMerged ||
        variation?.merged_to_variation_id ||
        variation?.mergedToVariationId
    );
    if (isMerged) {
      Alert.alert(
        'Variação mesclada',
        'Esta variação está mesclada em outra e não pode ser removida.'
      );
      return;
    }
    if (formData.id && variation?.id) {
      try {
        const hasMoves = await checkMobileProductVariationHasMoves(formData.id, variation.id);
        if (hasMoves) {
          Alert.alert(
            'Variação com histórico',
            'Esta variação possui movimentações de estoque ou pedidos vinculados e não pode ser removida.'
          );
          return;
        }
      } catch {
        Alert.alert(
          'Não foi possível verificar o histórico',
          'A variação não foi removida. Tente novamente quando a conexão estiver disponível.'
        );
        return;
      }
    }

    const remainsSimple = variations.length === 2;
    const confirmRemoval = () => {
      setFormData((previous) => {
        const nextVariations = (previous.variations || []).filter(
          (_: any, currentIndex: number) => currentIndex !== index
        );
        const becomesSimple = nextVariations.length === 1;
        const remainingVariation = nextVariations[0];
        const updatedVariations = becomesSimple
          ? [
              isExistingProduct
                ? inheritMobileSimpleVariationFromParent(previous, remainingVariation, {
                    preserveVariationStock: true,
                    preserveVariationAttributes: true,
                  })
                : inheritMobileSimpleVariationFromParent(previous, remainingVariation),
            ]
          : nextVariations;
        return {
          ...previous,
          variations: updatedVariations,
          hasVariations: !becomesSimple,
        };
      });
      if (expanded === index) setExpanded(null);
      else if (expanded !== null && expanded > index) setExpanded(expanded - 1);
    };
    Alert.alert(
      remainsSimple ? 'O produto se tornará simples' : 'Remover variação?',
      remainsSimple
        ? 'Restará uma variação simples, que herdará nome, preços, descrição, dimensões e fotos do produto pai. UUID/SKU, características e saldo da variação restante serão mantidos. As fotos da variação removida não serão excluídas automaticamente da aba Galeria; revise ou remova-as por lá se necessário. Você poderá voltar a “Com variações” nas informações básicas.'
        : `A variação “${variation?.name || variation?.sku || 'Variação'}” será removida ao salvar o produto.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: remainsSimple ? 'Confirmar e tornar simples' : 'Remover',
          style: 'destructive',
          onPress: () => {
            if (!remainsSimple) {
              confirmRemoval();
              return;
            }

            const variationId = String(variation?.id || variation?.sku || `draft-${index}`);
            void simpleConversionForm.validateAndRun(
              { variationId, acknowledged: true },
              () => confirmRemoval(),
              (errors) => {
                Alert.alert(
                  'Não foi possível confirmar',
                  Object.values(flattenFormErrors(errors))[0] ||
                    'Revise a confirmação e tente novamente.'
                );
              }
            );
          },
        },
      ]
    );
  };

  return { handleRemove };
}
