import React from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Link2, Plus, Search, Trash2 } from 'lucide-react-native';
import type { CompositionLink, InboundScorerProduct, MappingItem, ProductSuggestion } from './types';
import { amount, formatMoney, landedUnitCost } from './inboundCostUtils';
import { styles } from './inboundMappings.styles';
import { InboundItemFiscalDetails } from './InboundItemFiscalDetails';
import { InboundItemSuggestionsCard } from './InboundItemSuggestionsCard';

export interface InboundMappingItemCardProps {
  item: MappingItem;
  supplierId: string;
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
  onToggleMode: (mode: 'single' | 'composition') => void;
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
  const isComposition = item.linkMode === 'composition';
  const hasItemLink = Boolean(item.matchedProductId || composition.length);
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
    <View style={[styles.section, isDarkMode && styles.sectionDark]}>
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
        <View style={styles.linkHeader}>
          <Text style={[styles.linkTitle, isDarkMode && styles.textDark]}>
            {isComposition ? 'Vincular produtos' : 'Vincular produto'}
          </Text>
          <View style={styles.modeSwitch}>
            <TouchableOpacity
              disabled={saving || (isComposition && composition.length > 1)}
              onPress={() => onToggleMode('single')}
              style={[styles.modeButton, !isComposition && styles.modeButtonActive]}
            >
              <Text style={[styles.modeText, !isComposition && styles.modeTextActive]}>
                Único
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={saving}
              onPress={() => onToggleMode('composition')}
              style={[styles.modeButton, isComposition && styles.modeButtonActive]}
            >
              <Text style={[styles.modeText, isComposition && styles.modeTextActive]}>
                Composição
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {!supplierId ? (
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

            {!hasItemLink || isComposition ? (
              <>
                {!isComposition ? (
                  <TouchableOpacity
                    style={styles.registerButton}
                    onPress={onOpenQuickRegister}
                    disabled={saving}
                  >
                    <Plus size={16} color="#2563eb" />
                    <Text style={styles.registerButtonText}>Cadastrar produto</Text>
                  </TouchableOpacity>
                ) : null}

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
