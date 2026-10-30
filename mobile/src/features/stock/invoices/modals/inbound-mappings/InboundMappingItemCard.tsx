import React, { useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Check, ChevronDown, Link2, Lock, Plus, Search, Trash2 } from 'lucide-react-native';
import type { CompositionLink, InboundScorerProduct, MappingItem, ProductSuggestion } from './types';
import { amount, formatMoney, landedUnitCost } from './inboundCostUtils';
import { styles } from './inboundMappings.styles';
import { InboundItemFiscalDetails } from './InboundItemFiscalDetails';
import { InboundItemSuggestionsCard } from './InboundItemSuggestionsCard';

export interface InboundMappingItemCardProps {
  item: MappingItem;
  supplierId: string;
  lockToNotApplicable?: boolean;
  isDarkMode: boolean;
  isExpanded: boolean;
  saving: boolean;
  query: string;
  searchProducts: InboundScorerProduct[];
  searchLoading: boolean;
  searchError: string;
  itemSuggestions: ProductSuggestion[];
  isDismissedSuggestion: boolean;
  onToggleExpand: () => void;
  onToggleMode: (mode: 'single' | 'composition' | 'not_applicable') => void;
  onRemoveLink: () => void;
  onRemoveCompositionLink: (linkId: string) => void;
  onSaveMultiplier: (linkId: string, value: string) => void;
  onOpenQuickRegister: () => void;
  onDismissSuggestions: () => void;
  onSearchChange: (query: string) => void;
  onLinkProduct: (product: InboundScorerProduct) => void;
}

export const InboundMappingItemCard: React.FC<InboundMappingItemCardProps> = ({
  item,
  supplierId,
  lockToNotApplicable = false,
  isDarkMode,
  isExpanded,
  saving,
  query,
  searchProducts,
  searchLoading,
  searchError,
  itemSuggestions,
  isDismissedSuggestion,
  onToggleExpand,
  onToggleMode,
  onRemoveLink,
  onRemoveCompositionLink,
  onSaveMultiplier,
  onOpenQuickRegister,
  onDismissSuggestions,
  onSearchChange,
  onLinkProduct,
}) => {
  const composition: CompositionLink[] = item.compositionLinks || [];
  const isComposition = !lockToNotApplicable && item.linkMode === 'composition';
  const isNotApplicable = lockToNotApplicable || item.linkMode === 'not_applicable';
  const isSingle = !isComposition && !isNotApplicable;
  const quickRegisterDisabled =
    saving ||
    !supplierId.trim() ||
    isNotApplicable ||
    (!isComposition && Boolean(item.matchedProductId || item.matchedVariationId));
  const selectedModeLabel = isNotApplicable ? 'Não se aplica' : isComposition ? 'Composto' : 'Único';
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const quantity = Math.max(1, amount(item.quantity));
  const totalLandedCost = landedUnitCost(item) * quantity;
  const totalBaseCost = amount(item.unitCost) * quantity;
  const compositionWeight = composition.reduce(
    (total, link) =>
      total + amount(link.sellingPrice) * Math.max(1, amount(link.quantityMultiplier)),
    0
  );
  let apportionedBeforeLast = 0;

  return (
    <View
      style={[
        styles.section,
        isDarkMode && styles.sectionDark,
        isModeMenuOpen && styles.sectionMenuOpen,
      ]}
    >
      <Text style={[styles.itemTitle, isDarkMode && styles.textDark]}>
        {item.itemNumber}. {item.productDescription}
      </Text>
      {item.additionalDescription ? (
        <Text style={[styles.muted, styles.description]}>
          {item.additionalDescription}
        </Text>
      ) : null}
      <Text style={[styles.muted, styles.description]}>
        {quantity} {item.unit || 'UN'} · Cód. forn.: {item.productCode || '—'}
      </Text>
      <View style={styles.costRow}>
        <View style={styles.costCell}>
          <Text style={styles.costLabel}>Unitário</Text>
          <Text style={styles.costValue}>
            {formatMoney(amount(item.unitCost))} →{' '}
            <Text style={styles.costLanded}>{formatMoney(landedUnitCost(item))}</Text>
          </Text>
        </View>
        <View style={styles.costCell}>
          <Text style={styles.costLabel}>Total</Text>
          <Text style={styles.costValue}>
            {formatMoney(amount(item.totalCost))} →{' '}
            <Text style={styles.costLanded}>{formatMoney(totalLandedCost)}</Text>
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.detailsToggle}
        onPress={onToggleExpand}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
      >
        <Text style={styles.detailsToggleText}>
          {isExpanded ? 'Ocultar detalhes da NF' : 'Ver detalhes da NF'}
        </Text>
      </TouchableOpacity>

      <InboundItemFiscalDetails
        item={item}
        quantity={quantity}
        totalLandedCost={totalLandedCost}
        isDarkMode={isDarkMode}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
      />

      <View style={[styles.linkSection, isDarkMode && styles.linkSectionDark]}>
        {isModeMenuOpen ? (
          <TouchableOpacity
            style={styles.modeMenuDismissOverlay}
            activeOpacity={1}
            onPress={() => setIsModeMenuOpen(false)}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
          />
        ) : null}
        <View style={[styles.linkHeader, isModeMenuOpen && styles.linkHeaderMenuOpen]}>
          <Text style={[styles.linkTitle, isDarkMode && styles.textDark]}>
            {isComposition ? 'Vincular produtos' : 'Vincular produto'}
          </Text>
          <View style={styles.linkHeaderActions}>
            <View style={[styles.modePicker, isModeMenuOpen && styles.modePickerOpen]}>
              <TouchableOpacity
                style={[styles.modePickerTrigger, isDarkMode && styles.modePickerTriggerDark]}
                accessibilityRole="button"
                accessibilityLabel={`Modo de vínculo: ${selectedModeLabel}`}
                accessibilityState={{ expanded: isModeMenuOpen, disabled: saving || lockToNotApplicable }}
                disabled={saving || lockToNotApplicable}
                onPress={() => setIsModeMenuOpen((open) => !open)}
              >
                <Text style={[styles.modePickerText, isDarkMode && styles.modePickerTextDark]}>{selectedModeLabel}</Text>
                {lockToNotApplicable ? <Lock size={14} color={isDarkMode ? '#fcd34d' : '#92400e'} /> : <ChevronDown size={14} color={isDarkMode ? '#cbd5e1' : '#475569'} />}
              </TouchableOpacity>
              {isModeMenuOpen && !lockToNotApplicable ? (
                <View style={[styles.modeMenu, isDarkMode && styles.modeMenuDark]}>
                  <TouchableOpacity
                    style={[styles.modeMenuItem, isSingle && styles.modeMenuItemSelected]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSingle, disabled: isComposition && composition.length > 1 }}
                    disabled={saving || (isComposition && composition.length > 1)}
                    onPress={() => {
                      onToggleMode('single');
                      setIsModeMenuOpen(false);
                    }}
                  >
                    <Text style={[styles.modeMenuItemText, isDarkMode && styles.modeMenuItemTextDark]}>Único</Text>
                    {isSingle ? <Check size={15} color="#2563eb" /> : null}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modeMenuItem, isComposition && styles.modeMenuItemSelected]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isComposition }}
                    disabled={saving}
                    onPress={() => {
                      onToggleMode('composition');
                      setIsModeMenuOpen(false);
                    }}
                  >
                    <Text style={[styles.modeMenuItemText, isDarkMode && styles.modeMenuItemTextDark]}>Composto</Text>
                    {isComposition ? <Check size={15} color="#2563eb" /> : null}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modeMenuItem, isNotApplicable && styles.modeMenuItemSelected]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isNotApplicable }}
                    disabled={saving}
                    onPress={() => {
                      onToggleMode('not_applicable');
                      setIsModeMenuOpen(false);
                    }}
                  >
                    <Text style={[styles.modeMenuItemText, isDarkMode && styles.modeMenuItemTextDark]}>
                      Não se aplica
                    </Text>
                    {isNotApplicable ? <Check size={15} color="#d97706" /> : null}
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
            <TouchableOpacity
              style={[
                styles.quickRegisterHeader,
                quickRegisterDisabled && styles.quickRegisterHeaderDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Cadastro rápido"
              accessibilityState={{ disabled: quickRegisterDisabled }}
              accessibilityHint={
                isNotApplicable
                  ? 'Disponível nos modos Único ou Composto.'
                  : !supplierId.trim()
                    ? 'Vincule o fornecedor para usar esta ação.'
                    : !isComposition && Boolean(item.matchedProductId || item.matchedVariationId)
                      ? 'Este item já tem um produto vinculado.'
                      : undefined
              }
              disabled={quickRegisterDisabled}
              onPress={onOpenQuickRegister}
            >
              <Plus size={15} color={isDarkMode ? '#bfdbfe' : '#1d4ed8'} />
              <Text style={[styles.quickRegisterHeaderText, isDarkMode && styles.quickRegisterHeaderTextDark]}>
                Cadastro rápido
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {isNotApplicable ? (
          <Text style={[styles.lockedText, { color: isDarkMode ? '#fcd34d' : '#92400e' }]}>
            Este item continuará na NF-e, mas será ignorado no recebimento e não movimentará o estoque.
          </Text>
        ) : !supplierId ? (
          <Text style={styles.lockedText}>
            Vincule o fornecedor antes de identificar ou cadastrar produtos.
          </Text>
        ) : (
          <>
            {isComposition ? (
              composition.map((link, index) => {
                const share =
                  compositionWeight > 0
                    ? (amount(link.sellingPrice) *
                        Math.max(1, amount(link.quantityMultiplier))) /
                      compositionWeight
                    : 0;
                const allocated =
                  index === composition.length - 1
                    ? Math.max(0, totalBaseCost - apportionedBeforeLast)
                    : Math.round(totalBaseCost * share * 100) / 100;
                if (index < composition.length - 1) apportionedBeforeLast += allocated;
                return (
                  <View key={link.id} style={styles.linkedRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.linkedName}>{link.productErpName}</Text>
                      <Text style={styles.linkedCode}>
                        SKU: {link.linkedProductCode || '—'} · Venda{' '}
                        {formatMoney(amount(link.sellingPrice))} · Custo rateado{' '}
                        {formatMoney(allocated)}
                      </Text>
                    </View>
                    <TextInput
                      key={`${item.itemNumber}:${link.id}:${link.quantityMultiplier}`}
                      defaultValue={String(link.quantityMultiplier || 1)}
                      keyboardType="decimal-pad"
                      accessibilityLabel={`Quantidade de ${link.productErpName} na composição`}
                      style={[
                        styles.multiplierInput,
                        isDarkMode && styles.multiplierInputDark,
                      ]}
                      onEndEditing={(event) =>
                        onSaveMultiplier(link.id, event.nativeEvent.text)
                      }
                    />
                    <TouchableOpacity
                      disabled={saving}
                      onPress={() => onRemoveCompositionLink(link.id)}
                      style={styles.removeButton}
                      accessibilityLabel={`Remover ${link.productErpName} da composição`}
                    >
                      <Trash2 size={18} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                );
              })
            ) : item.matchedProductId ? (
              <View style={styles.linkedRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.linkedName}>
                    {item.productErpName || 'Produto vinculado'}
                  </Text>
                  <Text style={styles.linkedCode}>
                    SKU: {item.linkedProductCode || '—'} · Venda:{' '}
                    {formatMoney(amount(item.sellingPrice))} · Custo:{' '}
                    {formatMoney(totalBaseCost)}
                  </Text>
                </View>
                <TouchableOpacity
                  disabled={saving}
                  onPress={onRemoveLink}
                  style={styles.removeButton}
                  accessibilityLabel={`Remover vínculo do item ${item.itemNumber}`}
                >
                  <Trash2 size={18} color="#dc2626" />
                </TouchableOpacity>
              </View>
            ) : null}

            {!item.matchedProductId || isComposition ? (
              <>
                <InboundItemSuggestionsCard
                  isComposition={isComposition}
                  itemSuggestions={itemSuggestions}
                  isDismissedSuggestion={isDismissedSuggestion}
                  isDarkMode={isDarkMode}
                  saving={saving}
                  onLinkProduct={onLinkProduct}
                  onDismissSuggestions={onDismissSuggestions}
                />

                <View style={[styles.searchBox, isDarkMode && styles.searchBoxDark]}>
                  <Search size={17} color="#94a3b8" />
                  <TextInput
                    value={query}
                    onChangeText={onSearchChange}
                    placeholder={
                      isComposition
                        ? 'Adicionar produto à composição...'
                        : 'Buscar produto por nome ou SKU'
                    }
                    placeholderTextColor="#94a3b8"
                    style={[styles.input, isDarkMode && styles.textDark]}
                  />
                </View>
                {searchError ? (
                  <Text style={[styles.error, { marginTop: 8 }]}>
                    {searchError}
                  </Text>
                ) : null}
                {searchLoading ? (
                  <ActivityIndicator style={{ margin: 12 }} color="#2563eb" />
                ) : null}
                {searchProducts.map((product) => (
                  <TouchableOpacity
                    key={`${product.productId}:${product.variationId || 'product'}`}
                    disabled={saving}
                    style={styles.resultRow}
                    onPress={() => onLinkProduct(product)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemName, isDarkMode && styles.textDark]}>
                        {product.name}
                      </Text>
                      <Text style={styles.muted}>
                        SKU: {product.sku || '—'} · Venda:{' '}
                        {formatMoney(amount(product.sellingPrice))}
                      </Text>
                    </View>
                    <Link2 size={18} color="#2563eb" />
                  </TouchableOpacity>
                ))}
                {query.trim().length >= 2 &&
                !searchLoading &&
                !searchError &&
                searchProducts.length === 0 &&
                !saving ? (
                  <Text style={[styles.muted, { marginTop: 10 }]}>
                    Nenhum produto encontrado.
                  </Text>
                ) : null}
                {isComposition && composition.length === 0 ? (
                  <Text style={styles.lockedText}>
                    Adicione ao menos um produto para formar a composição.
                  </Text>
                ) : null}
              </>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
};
