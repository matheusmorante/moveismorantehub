import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import { flattenFormErrors, useZodForm } from '../../../hooks/useZodForm';
import {
  canAddVariationFamilyAttribute,
  variationFamilyCommandSchema,
  variationFamilyAckSchema,
  variationFamilyConflictSchema,
  variationFamilyQuerySchema,
  variationFamilyUuidSchema,
  VariationFamilyUnconfirmedError,
  type VariationFamilyOperationGuard,
} from '../../../../../shared-utils/variationFamilyFormSchemas';
import { parseVariationImages } from '../../../../../shared-utils/productVariationImages';
import { withTimeout } from '../../../../../shared-utils/withTimeout';

const moveVariationFormSchema = variationFamilyCommandSchema.safeExtend({
  ready: z.boolean().refine(Boolean, 'Aguarde a validação da combinação antes de mover a variação.'),
});
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { FormTextInput } from '../../../components/shared/FormTextInput';
import { MobileMoveVariationAttributesEditor } from './MobileMoveVariationAttributesEditor';
import {
  prepareMobileMoveVariationAttributes,
  type MobileMoveVariationAttributeRow,
} from './mobileMoveVariationAttributes';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  checkMobileVariationAttributeConflict,
  countMobileParentVariations,
  ensureMobileAttributeValue,
  fetchMobileVariationFamilies,
  type MobileVariationAttribute,
  type MobileVariationFamily,
  moveMobileVariationToFamily,
  toMobileVariationAttributes,
  verifyMobileVariationParent,
} from '../services/mobileProductVariationActionsService';
import { styles } from './mobileMoveVariationModal.styles';

interface Props {
  visible: boolean;
  dark: boolean;
  variation: any | null;
  parentProduct: any | null;
  onClose: () => void;
  onMoved: () => void | Promise<void>;
}

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');

const familyName = (family: MobileVariationFamily) => family.name || family.description || '';
type AttributeRow = MobileMoveVariationAttributeRow;

export const MobileMoveVariationModal: React.FC<Props> = ({
  visible,
  dark,
  variation,
  parentProduct,
  onClose,
  onMoved,
}) => {
  const insets = useSafeAreaInsets();
  const variationId = String(variation?.variationId || variation?.id || '');
  const sourceParentId = String(parentProduct?.id || variation?.parentId || '');
  const [families, setFamilies] = useState<MobileVariationFamily[]>([]);
  const [familiesLoading, setFamiliesLoading] = useState(false);
  const [queryReady, setQueryReady] = useState(false);
  const [familyQuery, setFamilyQuery] = useState('');
  const [targetFamilyId, setTargetFamilyId] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [attributes, setAttributes] = useState<AttributeRow[]>([]);
  const [queryError, setQueryError] = useState('');
  const [queryRevision, setQueryRevision] = useState(0);
  const [conflictState, setConflictState] = useState<
    'idle' | 'checking' | 'clear' | 'conflict' | 'error'
  >('idle');
  const [conflictError, setConflictError] = useState('');
  const [conflictRevision, setConflictRevision] = useState(0);
  const [countdown, setCountdown] = useState(5);
  const [isOnlyVariation, setIsOnlyVariation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [operationError, setOperationError] = useState('');
  const attributeRowId = useRef(0);
  const operationGuards = useRef(new Map<string, VariationFamilyOperationGuard>());
  const sourceGuardKey = variationId.trim().toLowerCase();
  if (!operationGuards.current.has(sourceGuardKey)) {
    operationGuards.current.set(sourceGuardKey, { active: null, error: '' });
  }
  const operationGuard = operationGuards.current.get(sourceGuardKey)!;
  const mutationBlocked = Boolean(operationError || operationGuard.error);
  const operationToken = useRef(Symbol('move-family'));
  const active = useRef(false);
  const lock = useRef(false);
  const completed = useRef(false);

  const { validAttributes, formAttributes } = useMemo(
    () => prepareMobileMoveVariationAttributes(attributes),
    [attributes]
  );
  const targetFamily = families.find((family) => family.id === targetFamilyId);
  const images = useMemo(() => {
    const variationImages = parseVariationImages(variation?.image_url, variation?.images);
    return variationImages.length > 0 ? variationImages : parseVariationImages(undefined, parentProduct?.images);
  }, [variation?.images, variation?.image_url, parentProduct?.images]);
  const variationName = targetFamily
    ? [familyName(targetFamily), ...validAttributes.map((attribute) => attribute.value)]
        .filter(Boolean)
        .join(' ')
    : '';
  const formValues = {
    sourceId: variationId,
    familyId: targetFamilyId,
    sourceParentId,
    attributes: formAttributes,
    name: variationName,
    images,
    ready: conflictState === 'clear' && countdown === 0 && queryReady && !familiesLoading && !queryError,
  };
  const familyQueryForm = useZodForm(variationFamilyQuerySchema, { sourceId: variationId });
  const conflictQueryForm = useZodForm(variationFamilyConflictSchema, {
    sourceId: variationId,
    familyId: targetFamilyId,
    attributes: formAttributes,
  });
  const form = useZodForm(moveVariationFormSchema, formValues);
  const suggestions = useMemo(() => {
    const term = normalize(familyQuery.trim());
    if (term.length < 2 || targetFamilyId) return [];
    return families
      .filter((family) => normalize(`${familyName(family)} ${family.code || ''}`).includes(term))
      .slice(0, 8);
  }, [families, familyQuery, targetFamilyId]);

  useEffect(() => {
    const currentToken = Symbol('move-family');
    operationToken.current = currentToken;
    active.current = Boolean(visible && variation);
    lock.current = false;
    completed.current = false;
    setOperationError(operationGuard.error);
    if (operationGuard.active && operationGuard.active !== currentToken) {
      operationGuard.error ||= new VariationFamilyUnconfirmedError().message;
      setOperationError(operationGuard.error);
    }
    return () => {
      active.current = false;
      if (!completed.current && operationGuard.active === currentToken) {
        operationGuard.error ||= new VariationFamilyUnconfirmedError().message;
      }
    };
  }, [visible, variationId, sourceParentId, operationGuard]);

  useEffect(() => {
    if (!visible || !variation) return;
    setFamilies([]);
    setQueryReady(false);
    setTargetFamilyId('');
    setFamilyQuery('');
    setShowSuggestions(false);
    setAttributes(
      toMobileVariationAttributes(variation.attributes).map((attribute) => ({
        ...attribute,
        rowId: `attribute-${attributeRowId.current++}`,
      }))
    );
    setQueryError('');
    setConflictState('idle');
    setConflictError('');
    setConflictRevision(0);
    setCountdown(5);
    setIsOnlyVariation(false);
  }, [visible, variationId, sourceParentId]);

  useEffect(() => {
    if (!visible || !variation) return;
    let current = true;
    let accepting = true;
    setFamiliesLoading(true);
    setQueryReady(false);
    setQueryError('');
    void (async () => {
      try {
        const input = await familyQueryForm.validateValues({ sourceId: variationId }, (errors) => {
          if (current && accepting) {
            setQueryError(
              Object.values(flattenFormErrors(errors))[0] ||
                'A variação de origem não pôde ser validada.'
            );
          }
        });
        if (!current || !accepting) return;
        if (!input) throw new Error('A variação de origem não pôde ser validada. Reabra a operação.');
        const validatedParentId = variationFamilyUuidSchema.parse(sourceParentId);
        const result = await withTimeout(
          Promise.all([
            fetchMobileVariationFamilies(validatedParentId, () => current && accepting),
            countMobileParentVariations(validatedParentId, () => current && accepting),
          ]),
          32_000,
          null,
          'mover-variacao:consultas'
        );
        if (!current || !accepting) return;
        if (!result) {
          throw new Error('A consulta da mudança de família excedeu o prazo. Consulte novamente.');
        }
        setFamilies(result[0].filter((family) => family.id !== validatedParentId));
        setIsOnlyVariation(result[1] === 1);
        setQueryReady(true);
      } catch (error: unknown) {
        if (current && accepting) {
          setQueryReady(false);
          setQueryError(
            error instanceof Error
              ? error.message
              : 'Não foi possível consultar a mudança de família. Consulte novamente.'
          );
        }
      } finally {
        accepting = false;
        if (current) setFamiliesLoading(false);
      }
    })();
    return () => {
      current = false;
      accepting = false;
    };
  }, [visible, variationId, sourceParentId, queryRevision, familyQueryForm.validateValues]);

  useEffect(() => {
    if (!visible || !queryReady || !targetFamilyId || validAttributes.length === 0) {
      setConflictState('idle');
      setConflictError('');
      return;
    }
    let current = true;
    let accepting = true;
    setConflictState('checking');
    setConflictError('');
    const timeout = setTimeout(() => {
      void (async () => {
        try {
          const input = await conflictQueryForm.validateValues(
            { sourceId: variationId, familyId: targetFamilyId, attributes: formAttributes },
            (errors) => {
              if (current && accepting) {
                setConflictError(
                  Object.values(flattenFormErrors(errors))[0] ||
                    'Confira as características antes de validar o destino.'
                );
              }
            }
          );
          if (!current || !accepting) return;
          if (!input) throw new Error('Os dados da combinação não puderam ser validados.');
          const result = await withTimeout(
            checkMobileVariationAttributeConflict(
              input.sourceId,
              input.familyId,
              input.attributes,
              () => current && accepting
            ),
            11_000,
            null,
            'mover-variacao:validar-destino'
          );
          if (!current || !accepting) return;
          if (result === null) {
            throw new Error('A validação do destino excedeu o prazo. Consulte novamente.');
          }
          setConflictState(result ? 'conflict' : 'clear');
        } catch (error: unknown) {
          if (current && accepting) {
            setConflictState('error');
            setConflictError(
              error instanceof Error
                ? error.message
                : 'Não foi possível validar o destino. Consulte novamente.'
            );
          }
        } finally {
          accepting = false;
        }
      })();
    }, 250);
    return () => {
      current = false;
      accepting = false;
      clearTimeout(timeout);
    };
  }, [visible, queryReady, variationId, targetFamilyId, validAttributes, formAttributes, conflictRevision, conflictQueryForm.validateValues]);

  useEffect(() => {
    if (!visible || !targetFamilyId || conflictState !== 'clear' || saving) {
      setCountdown(5);
      return;
    }
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((current) => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [visible, targetFamilyId, conflictState, saving, countdown]);

  const updateAttribute = (index: number, field: 'name' | 'value', value: string) => {
    if (mutationBlocked || saving) return;
    setAttributes((current) =>
      current.map((attribute, attributeIndex) =>
        attributeIndex === index ? { ...attribute, [field]: value } : attribute
      )
    );
    setCountdown(5);
  };

  const handleMove = async () => {
    if (!targetFamily || !variationId || !sourceParentId || saving || lock.current || operationGuard.active || operationGuard.error) return;
    lock.current = true;
    const token = operationToken.current;
    let accepting = true;
    const stillCurrent = () => active.current && operationToken.current === token && accepting
      && !operationGuard.error && (!operationGuard.active || operationGuard.active === token);
    setSaving(true);
    try {
      await form.validateAndRun(formValues, async (values) => {
        if (!stillCurrent()) return false;
        operationGuard.active = token;
        try {
          const operation = async () => {
            await verifyMobileVariationParent(values.sourceId, values.sourceParentId, stillCurrent);
            const canonicalAttributes: MobileVariationAttribute[] = [];
            for (const attribute of values.attributes) {
              if (!stillCurrent()) throw new VariationFamilyUnconfirmedError();
              const stored = await ensureMobileAttributeValue(attribute.name, attribute.value, stillCurrent);
              canonicalAttributes.push({ ...attribute, ...stored });
            }
            if (!stillCurrent()) throw new VariationFamilyUnconfirmedError();
            const newName = [familyName(targetFamily), ...canonicalAttributes.map(({ value }) => value)]
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
          const result = await withTimeout(operation(), 60_000, null, 'mover-variacao:confirmar-formulario');
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
            refreshed ? successText : `${successText} A lista não foi atualizada; recarregue antes de continuar.`
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
              operationGuard.error ? 'Confirme o estado antes de continuar' : 'Não foi possível mover a variação',
              message
            );
          }
          return false;
        } finally {
          accepting = false;
          if (operationGuard.active === token) operationGuard.active = null;
        }
      }, (errors) => Alert.alert('Revise a mudança', Object.values(flattenFormErrors(errors))[0]));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Não foi possível validar a mudança.';
      Alert.alert('Revise a mudança', message);
    } finally {
      accepting = false;
      lock.current = false;
      setSaving(false);
    }
  };

  const canConfirm =
    Boolean(targetFamilyId) &&
    validAttributes.length > 0 &&
    conflictState === 'clear' &&
    countdown === 0 &&
    !saving &&
    queryReady &&
    !familiesLoading &&
    !queryError &&
    !mutationBlocked &&
    !operationGuard.active &&
    !operationGuard.error &&
    !completed.current;
  const buttonLabel = !validAttributes.length
    ? 'Característica obrigatória'
    : saving
      ? 'Movendo…'
      : conflictState === 'checking'
        ? 'Validando combinação…'
        : conflictState === 'conflict'
          ? 'Resolva o conflito'
          : conflictState === 'error'
            ? 'Falha na validação'
            : targetFamilyId && countdown > 0
              ? `Confirmar em ${countdown}s`
              : isOnlyVariation
                ? 'Mover e remover produto'
                : 'Confirmar mudança';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={saving || operationGuard.active ? undefined : onClose}
    >
      <KeyboardAvoidingView
        style={[
          styles.overlay,
          { paddingTop: Math.max(insets.top, 24), paddingBottom: Math.max(insets.bottom, 24) },
        ]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.sheet, dark && styles.sheetDark]}>
          <View style={[styles.header, dark && styles.borderDark]}>
            <View style={styles.headerText}>
              <Text style={[styles.title, dark && styles.textDark]}>
                Mover para outro produto pai
              </Text>
              <Text style={[styles.subtitle, dark && styles.subtitleDark]}>
                O ID e o histórico da variação serão preservados.
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              disabled={saving || Boolean(operationGuard.active)}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Fechar movimento de variação"
            >
              <Text style={[styles.closeText, dark && styles.textDark]}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            {mutationBlocked ? (
              <View style={styles.conflict}>
                <Text style={styles.conflictTitle}>Confirme o cadastro antes de continuar</Text>
                <Text style={styles.conflictText}>
                  {operationError || operationGuard.error} Feche esta janela, atualize a lista e confira a variação antes de tentar novamente. O movimento seguirá bloqueado nesta sessão.
                </Text>
              </View>
            ) : null}
            {queryReady && !queryError ? (
              isOnlyVariation ? (
                <View style={styles.warning}>
                  <Text style={styles.warningTitle}>Esta é a única variação deste produto.</Text>
                  <Text style={styles.warningText}>
                    Ao movê-la, o produto pai de origem ficará sem variações e será removido. A
                    variação e seu histórico permanecerão.
                  </Text>
                </View>
              ) : (
                <View style={styles.info}>
                  <Text style={styles.infoText}>
                    O nome passará a usar o novo produto pai e os valores das características. As fotos
                    vinculadas à variação acompanham a mudança.
                  </Text>
                </View>
              )
            ) : null}

            <View>
              <Text style={[styles.label, dark && styles.textDark]}>Novo produto pai</Text>
              <FormTextInput
                value={familyQuery}
                onChangeText={(value) => {
                  setFamilyQuery(value);
                  setTargetFamilyId('');
                  setShowSuggestions(true);
                  setConflictState('idle');
                  setCountdown(5);
                }}
                onFocus={() => setShowSuggestions(true)}
                editable={!familiesLoading && !queryError && !saving && !mutationBlocked}
                placeholder="Nome ou código (mín. 2 caracteres)"
                placeholderTextColor={dark ? '#94a3b8' : '#94a3b8'}
                style={[
                  styles.input,
                  dark && styles.inputDark,
                  targetFamilyId && styles.inputSelected,
                ]}
                autoCorrect={false}
                accessibilityLabel="Pesquisar produto pai de destino"
              />
              {familiesLoading ? (
                <View style={styles.queryStatus}>
                  <ActivityIndicator color="#4f46e5" />
                  <Text style={[styles.hint, dark && styles.subtitleDark]}>
                    Carregando produtos de destino e confirmando o produto de origem…
                  </Text>
                </View>
              ) : null}
              {queryError ? (
                <View style={styles.conflict}>
                  <Text style={styles.conflictTitle}>Não foi possível preparar a mudança</Text>
                  <Text style={styles.conflictText}>{queryError}</Text>
                  <TouchableOpacity
                    onPress={() => setQueryRevision((revision) => revision + 1)}
                    disabled={familiesLoading || saving}
                    style={styles.retryButton}
                    accessibilityRole="button"
                    accessibilityLabel="Consultar novamente os produtos de destino e a origem"
                  >
                    <Text style={styles.retryText}>Consultar novamente</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              {showSuggestions && !targetFamilyId && familyQuery.trim().length >= 2 ? (
                <View style={[styles.suggestions, dark && styles.suggestionsDark]}>
                  {suggestions.length ? (
                    suggestions.map((family) => (
                      <TouchableOpacity
                        key={family.id}
                        style={[styles.suggestion, dark && styles.borderDark]}
                        disabled={mutationBlocked}
                        onPress={() => {
                          setTargetFamilyId(family.id);
                          setFamilyQuery(
                            `${familyName(family)}${family.code ? ` — ${family.code}` : ''}`
                          );
                          setShowSuggestions(false);
                          setCountdown(5);
                        }}
                        accessibilityRole="button"
                      >
                        <Text
                          style={[styles.suggestionName, dark && styles.textDark]}
                          numberOfLines={2}
                        >
                          {familyName(family) || 'Produto sem nome'}
                        </Text>
                        <Text style={styles.suggestionCode}>
                          Código: {family.code || 'não informado'}
                        </Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={styles.emptySuggestion}>Nenhum produto pai encontrado.</Text>
                  )}
                </View>
              ) : null}
            </View>

            <MobileMoveVariationAttributesEditor
              dark={dark}
              disabled={saving || mutationBlocked}
              attributes={attributes}
              canAddAttribute={canAddVariationFamilyAttribute(attributes)}
              onAddAttribute={() => {
                if (saving || mutationBlocked) return;
                setAttributes((current) =>
                  canAddVariationFamilyAttribute(current)
                    ? [
                        ...current,
                        { name: '', value: '', rowId: `attribute-${attributeRowId.current++}` },
                      ]
                    : current
                );
                setCountdown(5);
              }}
              onUpdateAttribute={updateAttribute}
            />

            {conflictState === 'conflict' ? (
              <View style={styles.conflict}>
                <Text style={styles.conflictTitle}>Combinação já existente</Text>
                <Text style={styles.conflictText}>
                  Este produto pai já tem uma variação com estas mesmas características. Altere um valor
                  antes de continuar.
                </Text>
              </View>
            ) : null}
            {conflictState === 'error' ? (
              <View style={styles.conflict}>
                <Text style={styles.conflictTitle}>Não foi possível validar a combinação</Text>
                <Text style={styles.conflictText}>
                  {conflictError || 'Confira a conexão e tente novamente.'}
                </Text>
                <TouchableOpacity
                  onPress={() => setConflictRevision((revision) => revision + 1)}
                  disabled={saving || mutationBlocked}
                  style={styles.retryButton}
                  accessibilityRole="button"
                  accessibilityLabel="Validar destino novamente"
                >
                  <Text style={styles.retryText}>Validar destino novamente</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </ScrollView>

          <View style={[styles.footer, dark && styles.borderDark]}>
            <TouchableOpacity
              onPress={onClose}
              disabled={saving || Boolean(operationGuard.active)}
              style={[styles.footerButton, styles.cancelButton]}
              accessibilityRole="button"
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => void handleMove()}
              disabled={!canConfirm}
              style={[
                styles.footerButton,
                styles.confirmButton,
                !canConfirm && styles.disabledButton,
              ]}
              accessibilityRole="button"
            >
              <Text style={styles.confirmText}>{mutationBlocked ? 'Movimento sem confirmação' : buttonLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
