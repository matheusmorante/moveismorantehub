import React from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, X } from 'lucide-react-native';
import { SupplierFormModal } from '../../../suppliers/SupplierFormModal';
import type { Invoice } from '../../../types/stock.types';
import { getInboundReceiptBlockedReason } from '../../../../../../../shared-utils/inboundReceiptEligibility';
import { styles } from './inboundMappings.styles';
import { InboundSupplierSection } from './InboundSupplierSection';
import { InboundQuickProductModal } from './InboundQuickProductModal';
import { InboundMappingItemCard } from './InboundMappingItemCard';
import { useInboundInvoiceMappings } from './hooks/useInboundInvoiceMappings';

interface Props {
  invoice: Invoice | null;
  visible: boolean;
  isDarkMode: boolean;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  canAccessReceipts: boolean;
  onGenerateReceipt?: (invoice: Invoice) => void;
}

export const InboundInvoiceMappingsModalContent: React.FC<Props> = ({
  invoice,
  visible,
  isDarkMode,
  onClose,
  onSaved,
  canAccessReceipts,
  onGenerateReceipt,
}) => {
  const insets = useSafeAreaInsets();
  const {
    details,
    items,
    supplierId,
    isSalvadosSupplier,
    setSupplierId,
    supplierSearch,
    setSupplierSearch,
    searchSuppliers,
    suppliers,
    supplierSearchError,
    supplierSearchLoading,
    queries,
    setQueries,
    products,
    productSearchLoading,
    productSearchErrors,
    suggestions,
    dismissedSuggestions,
    setDismissedSuggestions,
    suggestionsLoading,
    suggestionsError,
    loading,
    loadError,
    retryLoad,
    saving,
    hasUncertainWrite,
    errorMessage,
    supplierFormVisible,
    setSupplierFormVisible,
    registrationItem,
    setRegistrationItem,
    registrationDefaults,
    setRegistrationDefaults,
    registrationParent,
    setRegistrationParent,
    registrationFormVisible,
    setRegistrationFormVisible,
    registrationOptionsVisible,
    setRegistrationOptionsVisible,
    editingProduct,
    parentSearch,
    setParentSearch,
    searchParentProducts,
    parentResults,
    parentSearchError,
    parentSearchLoading,
    chooseSupplier,
    clearSupplier,
    createSupplier,
    linkProduct,
    openQuickRegister,
    startNewProductRegistration,
    startVariationRegistration,
    saveEditedProduct,
    closeProductForm,
    saveQuickRegisteredProduct,
    toggleLinkMode,
    removeCompositionLink,
    saveCompositionMultiplier,
    removeLink,
    handleRetrySuggestions,
    retrySupplierSearch,
    retryProductSearch,
    retryParentSearch,
  } = useInboundInvoiceMappings({ invoice, visible, onSaved });

  if (!invoice) return null;
  const linkedCount = items.filter((item) =>
    Boolean(item.matchedProductId || item.compositionLinks?.length)
  ).length;
  const hasMatches = linkedCount > 0;
  const currentSupplier = suppliers.find((supplier) => supplier.id === supplierId);
  const interactionsLocked = saving || hasUncertainWrite;
  const receiptDisabledReason = !onGenerateReceipt
    ? null
    : saving || loading
      ? 'Aguarde a consulta ou a gravação dos vínculos terminar.'
      : hasUncertainWrite
        ? 'Há uma alteração sem confirmação. Consulte novamente os vínculos antes de gerar o recebimento.'
        : details
          ? getInboundReceiptBlockedReason(
              {
                ...details,
                supplierId,
                supplierStockOrigins: details.supplierStockOrigins ?? invoice.supplierStockOrigins,
                nfeKey: details.nfeKey ?? details.chave_acesso ?? invoice.accessKey,
                status: details.status ?? details.status_recebimento ?? invoice.status,
                receiptId: details.receiptId ?? details.receipt_id,
                itemsCount: items.length,
                items,
              },
              canAccessReceipts,
            )
          : 'Carregue os dados da NF-e antes de gerar o recebimento.';
  const close = () => {
    if (!saving) onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={close}
    >
      <View
        style={[
          styles.container,
          isDarkMode && styles.containerDark,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <View style={[styles.header, isDarkMode && styles.headerDark]}>
          <View style={styles.headerText}>
            <Text style={[styles.title, isDarkMode && styles.textDark]}>Gerenciar vínculos</Text>
            <Text style={[styles.subtitle, isDarkMode && styles.muted]}>
              NF-e #{details?.numero_nfe || invoice.number}
            </Text>
          </View>
          <TouchableOpacity
            disabled={saving}
            onPress={close}
            accessibilityLabel="Fechar vínculos"
            accessibilityState={{ disabled: saving }}
            style={styles.closeButton}
          >
            <X size={22} color={isDarkMode ? '#cbd5e1' : '#475569'} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator style={styles.loader} size="large" color="#2563eb" />
        ) : loadError ? (
          <View style={styles.loadErrorContainer}>
            <Text style={styles.loadErrorText}>
              {loadError}
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={retryLoad}
              accessibilityRole="button"
              accessibilityLabel="Tentar carregar os vínculos novamente"
            >
              <Text style={styles.retryButtonText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <InboundSupplierSection
              supplierId={supplierId}
              currentSupplier={currentSupplier}
              details={details}
              hasMatches={hasMatches}
              saving={interactionsLocked}
              supplierLocked={isSalvadosSupplier}
              isDarkMode={isDarkMode}
              supplierSearch={supplierSearch}
              supplierSearchLoading={supplierSearchLoading}
              supplierSearchError={supplierSearchError}
              suppliers={suppliers}
              onRetrySupplierSearch={retrySupplierSearch}
              onSearchChange={searchSuppliers}
              onClearSupplier={() => void clearSupplier()}
              onSelectSupplier={(supplier) => void chooseSupplier(supplier)}
              onOpenNewSupplier={() => setSupplierFormVisible(true)}
            />

            <View style={[styles.section, isDarkMode && styles.sectionDark]}>
              <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
                Itens da NF ({items.length})
              </Text>
              <Text style={styles.muted}>
                {isSalvadosSupplier
                  ? `${items.length} itens em “Não se aplica” · sem movimentação de estoque`
                  : `${linkedCount} vinculados · ${items.length - linkedCount} sem vínculo`}
              </Text>
            </View>

            {items.map((item) => (
              <InboundMappingItemCard
                key={item.itemNumber}
                item={item}
                supplierId={supplierId}
                lockToNotApplicable={isSalvadosSupplier}
                isDarkMode={isDarkMode}
                saving={interactionsLocked}
                query={queries[item.itemNumber] || ''}
                searchProducts={products[item.itemNumber] || []}
                searchLoading={Boolean(productSearchLoading[item.itemNumber])}
                searchError={productSearchErrors[item.itemNumber] || ''}
                onRetrySearch={() => retryProductSearch(item.itemNumber)}
                itemSuggestions={suggestions[item.itemNumber] || []}
                isDismissedSuggestion={Boolean(dismissedSuggestions[item.itemNumber])}
                onToggleMode={(mode) => void toggleLinkMode(item, mode)}
                onRemoveLink={() => void removeLink(item)}
                onRemoveCompositionLink={(linkId) =>
                  void removeCompositionLink(item, linkId)
                }
                onSaveMultiplier={(linkId, value) =>
                  void saveCompositionMultiplier(item, linkId, value)
                }
                onOpenQuickRegister={() => void openQuickRegister(item)}
                onDismissSuggestions={() =>
                  setDismissedSuggestions((current) => ({
                    ...current,
                    [item.itemNumber]: true,
                  }))
                }
                onSearchChange={(value) =>
                  setQueries(item.itemNumber, value)
                }
                onLinkProduct={(product) => void linkProduct(item, product)}
              />
            ))}

            {suggestionsLoading ? (
              <Text style={[styles.muted, { textAlign: 'center' }]}>Analisando sugestões de vínculo...</Text>
            ) : null}
            {!isSalvadosSupplier && suggestionsError ? (
              <TouchableOpacity onPress={handleRetrySuggestions} style={styles.retrySuggestion}>
                <Text style={styles.changeText}>Não foi possível analisar sugestões · Tentar novamente</Text>
                <Text style={styles.muted}>{suggestionsError}</Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>
          <View style={[styles.footer, isDarkMode && styles.footerDark]}>
            {errorMessage ? <Text style={styles.footerError}>{errorMessage}</Text> : null}
            {saving ? (
              <View style={styles.footerSaving}>
                <ActivityIndicator color="#2563eb" />
                <Text style={[styles.footerSavingText, isDarkMode && styles.textDark]}>
                  Salvando e confirmando vínculos...
                </Text>
              </View>
            ) : null}
            <View style={styles.footerActions}>
              {onGenerateReceipt ? <TouchableOpacity
                style={[
                  styles.generateReceiptButton,
                  isDarkMode && styles.generateReceiptButtonDark,
                  Boolean(receiptDisabledReason) && styles.generateReceiptButtonDisabled,
                ]}
                disabled={Boolean(receiptDisabledReason)}
                onPress={() => {
                  if (receiptDisabledReason || !onGenerateReceipt) return;
                  onClose();
                  onGenerateReceipt({
                    ...invoice,
                    supplierStockOrigins: details?.supplierStockOrigins ?? invoice.supplierStockOrigins,
                  });
                }}
                accessibilityRole="button"
                accessibilityLabel="Gerar recebimento"
                accessibilityHint={receiptDisabledReason || 'Abre Recebimentos com esta NF-e selecionada.'}
                accessibilityState={{ disabled: Boolean(receiptDisabledReason) }}
              >
                <Text
                  style={[
                    styles.generateReceiptText,
                    Boolean(receiptDisabledReason) && styles.generateReceiptTextDisabled,
                  ]}
                >
                  Gerar recebimento
                </Text>
              </TouchableOpacity> : null}
              {hasUncertainWrite ? (
                <TouchableOpacity
                  style={[styles.retryButton, { backgroundColor: '#475569' }]}
                  onPress={retryLoad}
                  accessibilityRole="button"
                  accessibilityLabel="Consultar novamente a nota antes de continuar"
                  accessibilityHint="Reabre os dados atuais da nota para confirmar o resultado da última gravação."
                >
                  <Text style={styles.retryButtonText}>Consultar novamente</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[styles.doneButton, saving && styles.doneButtonDisabled]}
                disabled={saving || hasUncertainWrite}
                onPress={close}
                accessibilityRole="button"
                accessibilityState={{ disabled: saving || hasUncertainWrite }}
              >
                <Check size={18} color="#fff" />
                <Text style={styles.doneText}>Concluir</Text>
              </TouchableOpacity>
            </View>
          </View>
          </>
        )}

        <SupplierFormModal
          visible={supplierFormVisible}
          isDarkMode={isDarkMode}
          onClose={() => setSupplierFormVisible(false)}
          onSave={createSupplier}
        />
        <InboundQuickProductModal
          registrationItem={registrationItem}
          registrationOptionsVisible={registrationOptionsVisible}
          registrationFormVisible={registrationFormVisible}
          editingProduct={editingProduct}
          registrationParent={registrationParent}
          registrationDefaults={registrationDefaults}
          parentSearch={parentSearch}
          parentSearchLoading={parentSearchLoading}
          parentSearchError={parentSearchError}
          parentResults={parentResults}
          onRetryParentSearch={retryParentSearch}
          isDarkMode={isDarkMode}
          insets={insets}
          onCloseOptions={() => {
            setRegistrationOptionsVisible(false);
            setRegistrationItem(null);
          }}
          onParentSearchChange={searchParentProducts}
          onStartNewProduct={startNewProductRegistration}
          onStartVariation={startVariationRegistration}
          onCloseForm={() => {
            closeProductForm();
          }}
          onSaveProduct={saveQuickRegisteredProduct}
          onSaveEditedProduct={saveEditedProduct}
        />
      </View>
    </Modal>
  );
};
