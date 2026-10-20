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
import {
  styles,
  InboundSupplierSection,
  InboundQuickProductModal,
  InboundMappingItemCard,
  useInboundInvoiceMappings,
} from '.';

interface Props {
  invoice: Invoice | null;
  visible: boolean;
  isDarkMode: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const InboundInvoiceMappingsModalContent: React.FC<Props> = ({
  invoice,
  visible,
  isDarkMode,
  onClose,
  onSaved,
}) => {
  const insets = useSafeAreaInsets();
  const {
    details,
    items,
    supplierId,
    setSupplierId,
    supplierSearch,
    setSupplierSearch,
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
    saving,
    errorMessage,
    expandedItems,
    setExpandedItems,
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
    parentSearch,
    setParentSearch,
    parentResults,
    parentSearchError,
    parentSearchLoading,
    chooseSupplier,
    createSupplier,
    linkProduct,
    openQuickRegister,
    startNewProductRegistration,
    startVariationRegistration,
    saveQuickRegisteredProduct,
    toggleLinkMode,
    removeCompositionLink,
    saveCompositionMultiplier,
    removeLink,
    handleRetrySuggestions,
  } = useInboundInvoiceMappings({ invoice, visible, onSaved });

  if (!invoice) return null;
  const linkedCount = items.filter((item) =>
    Boolean(item.matchedProductId || item.compositionLinks?.length)
  ).length;
  const hasMatches = linkedCount > 0;
  const currentSupplier = suppliers.find((supplier) => supplier.id === supplierId);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
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
            onPress={onClose}
            accessibilityLabel="Fechar vínculos"
            style={styles.closeButton}
          >
            <X size={22} color={isDarkMode ? '#cbd5e1' : '#475569'} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator style={styles.loader} size="large" color="#2563eb" />
        ) : (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <InboundSupplierSection
              supplierId={supplierId}
              currentSupplier={currentSupplier}
              details={details}
              hasMatches={hasMatches}
              isDarkMode={isDarkMode}
              supplierSearch={supplierSearch}
              supplierSearchLoading={supplierSearchLoading}
              supplierSearchError={supplierSearchError}
              suppliers={suppliers}
              onSearchChange={setSupplierSearch}
              onClearSupplier={() => setSupplierId('')}
              onSelectSupplier={(supplier) => void chooseSupplier(supplier)}
              onOpenNewSupplier={() => setSupplierFormVisible(true)}
            />

            <View style={[styles.section, isDarkMode && styles.sectionDark]}>
              <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
                Itens da NF ({items.length})
              </Text>
              <Text style={styles.muted}>
                {linkedCount} vinculados · {items.length - linkedCount} sem vínculo
              </Text>
            </View>

            {items.map((item) => (
              <InboundMappingItemCard
                key={item.itemNumber}
                item={item}
                supplierId={supplierId}
                isDarkMode={isDarkMode}
                isExpanded={Boolean(expandedItems[item.itemNumber])}
                saving={saving}
                query={queries[item.itemNumber] || ''}
                searchProducts={products[item.itemNumber] || []}
                searchLoading={Boolean(productSearchLoading[item.itemNumber])}
                searchError={productSearchErrors[item.itemNumber] || ''}
                itemSuggestions={suggestions[item.itemNumber] || []}
                isDismissedSuggestion={Boolean(dismissedSuggestions[item.itemNumber])}
                onToggleExpand={() =>
                  setExpandedItems((current) => ({
                    ...current,
                    [item.itemNumber]: !current[item.itemNumber],
                  }))
                }
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
                  setQueries((current) => ({
                    ...current,
                    [item.itemNumber]: value,
                  }))
                }
                onLinkProduct={(product) => void linkProduct(item, product)}
              />
            ))}

            {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
            {suggestionsLoading ? (
              <Text style={[styles.muted, { textAlign: 'center' }]}>Analisando sugestões de vínculo...</Text>
            ) : null}
            {suggestionsError ? (
              <TouchableOpacity onPress={handleRetrySuggestions} style={styles.retrySuggestion}>
                <Text style={styles.changeText}>Não foi possível analisar sugestões · Tentar novamente</Text>
                <Text style={styles.muted}>{suggestionsError}</Text>
              </TouchableOpacity>
            ) : null}
            {saving ? <ActivityIndicator style={{ margin: 12 }} color="#2563eb" /> : null}
            <TouchableOpacity style={styles.doneButton} onPress={onClose}>
              <Check size={18} color="#fff" />
              <Text style={styles.doneText}>Concluir</Text>
            </TouchableOpacity>
          </ScrollView>
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
          registrationParent={registrationParent}
          registrationDefaults={registrationDefaults}
          parentSearch={parentSearch}
          parentSearchLoading={parentSearchLoading}
          parentSearchError={parentSearchError}
          parentResults={parentResults}
          isDarkMode={isDarkMode}
          insets={insets}
          onCloseOptions={() => {
            setRegistrationOptionsVisible(false);
            setRegistrationItem(null);
          }}
          onParentSearchChange={setParentSearch}
          onStartNewProduct={startNewProductRegistration}
          onStartVariation={startVariationRegistration}
          onCloseForm={() => {
            setRegistrationItem(null);
            setRegistrationDefaults(undefined);
            setRegistrationParent(null);
            setRegistrationFormVisible(false);
          }}
          onSaveProduct={saveQuickRegisteredProduct}
        />
      </View>
    </Modal>
  );
};
