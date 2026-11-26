import type React from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { canAddVariationFamilyAttribute } from '../../../../../../shared-utils/variationFamilyFormSchemas';
import { MobileMoveVariationHeader } from './MobileMoveVariationHeader';
import { MobileMoveVariationAttributesEditor } from './MobileMoveVariationAttributesEditor';
import { MobileMoveVariationValidationNotice } from './MobileMoveVariationValidationNotice';
import { MobileMoveVariationFamilySelector } from './MobileMoveVariationFamilySelector';
import { MobileMoveVariationFooter } from './MobileMoveVariationFooter';
import { MobileMoveVariationStatusNotices } from './MobileMoveVariationStatusNotices';
import { getMobileVariationFamilyName } from './mobileMoveVariationFamilySuggestions';
import { useMobileMoveVariationState } from './useMobileMoveVariationState';
import { styles } from './mobileMoveVariationModal.styles';

interface Props {
  visible: boolean;
  dark: boolean;
  variation: any | null;
  parentProduct: any | null;
  onClose: () => void;
  onMoved: () => void | Promise<void>;
}

export const MobileMoveVariationModal: React.FC<Props> = ({
  visible,
  dark,
  variation,
  parentProduct,
  onClose,
  onMoved,
}) => {
  const insets = useSafeAreaInsets();
  const state = useMobileMoveVariationState({
    visible,
    variation,
    parentProduct,
    onClose,
    onMoved,
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={state.closeDisabled ? undefined : onClose}
    >
      <KeyboardAvoidingView
        style={[
          styles.overlay,
          { paddingTop: Math.max(insets.top, 24), paddingBottom: Math.max(insets.bottom, 24) },
        ]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.sheet, dark && styles.sheetDark]}>
          <MobileMoveVariationHeader
            dark={dark}
            closeDisabled={state.closeDisabled}
            onClose={onClose}
          />

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <MobileMoveVariationStatusNotices
              mutationBlocked={state.mutationBlocked}
              blockedMessage={state.blockedMessage}
              queryReady={state.queryReady}
              queryError={state.queryError}
              isOnlyVariation={state.isOnlyVariation}
            />

            <MobileMoveVariationFamilySelector
              dark={dark}
              familyQuery={state.familyQuery}
              familiesLoading={state.familiesLoading}
              queryError={state.queryError}
              suggestionsLoading={state.suggestionsLoading}
              suggestionsError={state.suggestionsError}
              saving={state.saving}
              mutationBlocked={state.mutationBlocked}
              targetFamilyId={state.targetFamilyId}
              showSuggestions={state.showSuggestions}
              suggestions={state.suggestions}
              familyName={getMobileVariationFamilyName}
              onQueryChange={state.handleQueryChange}
              onFocus={() => state.setShowSuggestions(true)}
              onRetry={state.retryQuery}
              onRetrySuggestions={state.retrySuggestions}
              onSelectFamily={state.handleSelectFamily}
            />

            <MobileMoveVariationAttributesEditor
              dark={dark}
              disabled={state.saving || state.mutationBlocked}
              attributes={state.attributes}
              canAddAttribute={canAddVariationFamilyAttribute(state.attributes)}
              onAddAttribute={state.addAttribute}
              onUpdateAttribute={state.updateAttribute}
            />

            <MobileMoveVariationValidationNotice
              hasConflict={state.conflictState === 'conflict'}
              hasValidationError={state.conflictState === 'error'}
              errorMessage={state.conflictError}
              disabled={state.saving || state.mutationBlocked}
              onRetry={state.retryConflict}
            />
          </ScrollView>

          <MobileMoveVariationFooter
            dark={dark}
            closeDisabled={state.closeDisabled}
            confirmDisabled={!state.canConfirm}
            mutationBlocked={state.mutationBlocked}
            buttonLabel={state.buttonLabel}
            onClose={onClose}
            onConfirm={() => void state.handleMove()}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
