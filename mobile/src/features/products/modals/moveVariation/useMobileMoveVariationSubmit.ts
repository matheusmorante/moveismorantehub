import type React from 'react';
import { Alert } from 'react-native';
import { flattenFormErrors } from '../../../../hooks/useZodForm';
import {
  variationFamilyAckSchema,
  VariationFamilyUnconfirmedError,
  type VariationFamilyOperationGuard,
} from '../../../../../../shared-utils/variationFamilyFormSchemas';
import { withTimeout } from '../../../../../../shared-utils/core/withTimeout';
import { getMobileVariationFamilyName } from './mobileMoveVariationFamilySuggestions';
import {
  ensureMobileAttributeValues,
  moveMobileVariationToFamily,
  verifyMobileVariationParent,
  type MobileVariationAttribute,
  type MobileVariationFamily,
} from '../../services/variations/mobileProductVariationActionsService';

interface UseMobileMoveVariationSubmitParams {
  targetFamily?: MobileVariationFamily;
  variationId: string;
  sourceParentId: string;
  saving: boolean;
  setSaving: React.Dispatch<React.SetStateAction<boolean>>;
  setOperationError: React.Dispatch<React.SetStateAction<string>>;
  formValues: any;
  validateAndRun: (
    values: any,
    onValid: (values: any) => Promise<boolean> | boolean,
    onInvalid?: (errors: any) => void
  ) => Promise<boolean>;
  operationGuard: VariationFamilyOperationGuard;
  operationToken: React.MutableRefObject<symbol>;
  active: React.MutableRefObject<boolean>;
  lock: React.MutableRefObject<boolean>;
  completed: React.MutableRefObject<boolean>;
  onClose: () => void;
  onMoved: () => void | Promise<void>;
}

/** Executa a validação final e submissão segura da movimentação de variação entre famílias. */
export function useMobileMoveVariationSubmit(params: UseMobileMoveVariationSubmitParams) {
  const {
    targetFamily,
    variationId,
    sourceParentId,
    saving,
    setSaving,
    setOperationError,
    formValues,
    validateAndRun,
    operationGuard,
    operationToken,
    active,
    lock,
    completed,
    onClose,
    onMoved,
  } = params;

  const handleMove = async () => {
    if (
      !targetFamily ||
      !variationId ||
      !sourceParentId ||
      saving ||
      lock.current ||
      operationGuard.active ||
      operationGuard.error
    ) {
      return;
    }
    lock.current = true;
    const token = operationToken.current;
    let accepting = true;
    const stillCurrent = () =>
      active.current &&
      operationToken.current === token &&
      accepting &&
      !operationGuard.error &&
      (!operationGuard.active || operationGuard.active === token);
    setSaving(true);
    try {
      await validateAndRun(
        formValues,
        async (values) => {
          if (!stillCurrent()) return false;
          operationGuard.active = token;
          try {
            const operation = async () => {
              await verifyMobileVariationParent(
                values.sourceId,
                values.sourceParentId,
                stillCurrent
              );
              const storedAttributes = await ensureMobileAttributeValues(
                values.attributes,
                stillCurrent
              );
              const canonicalAttributes: MobileVariationAttribute[] = values.attributes.map(
                (attribute: MobileVariationAttribute, index: number) => ({
                  ...attribute,
                  ...storedAttributes[index],
                })
              );
              if (!stillCurrent()) throw new VariationFamilyUnconfirmedError();
              const newName = [
                getMobileVariationFamilyName(targetFamily),
                ...canonicalAttributes.map(({ value }) => value),
              ]
                .filter(Boolean)
                .join(' ');
              return moveMobileVariationToFamily(
                values.sourceId,
                values.familyId,
                canonicalAttributes,
                newName,
                values.images,
                values.sourceParentId,
                stillCurrent
              );
            };
            const result = await withTimeout(
              operation(),
              60_000,
              null,
              'mover-variacao:confirmar-formulario'
            );
            const acknowledgement = variationFamilyAckSchema.safeParse(result);
            if (!acknowledgement.success) throw new VariationFamilyUnconfirmedError();
            if (!stillCurrent()) throw new VariationFamilyUnconfirmedError();

            completed.current = true;
            operationGuard.active = null;
            onClose();
            let refreshed = true;
            try {
              await onMoved();
            } catch {
              refreshed = false;
            }
            const successText = acknowledgement.data.sourceParentRemoved
              ? `A variação manteve o mesmo ID e histórico. O produto pai de origem, que ficou sem variações, foi removido. Novo SKU: ${acknowledgement.data.newSku}.`
              : `A variação manteve o mesmo ID e histórico. Novo SKU: ${acknowledgement.data.newSku}.`;
            Alert.alert(
              'Variação movida',
              refreshed
                ? successText
                : `${successText} A lista não foi atualizada; recarregue antes de continuar.`
            );
            return true;
          } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Tente novamente.';
            if ((error as { uncertain?: boolean })?.uncertain) {
              operationGuard.error = message;
              setOperationError(message);
            }
            if (active.current) {
              Alert.alert(
                operationGuard.error
                  ? 'Confirme o estado antes de continuar'
                  : 'Não foi possível mover a variação',
                message
              );
            }
            return false;
          } finally {
            accepting = false;
            if (operationGuard.active === token) operationGuard.active = null;
          }
        },
        (errors) => Alert.alert('Revise a mudança', Object.values(flattenFormErrors(errors))[0])
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Não foi possível validar a mudança.';
      Alert.alert('Revise a mudança', message);
    } finally {
      accepting = false;
      lock.current = false;
      setSaving(false);
    }
  };

  return { handleMove };
}
