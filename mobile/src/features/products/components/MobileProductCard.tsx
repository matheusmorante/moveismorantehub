import {
  ChevronDown,
  ChevronRight,
  Eye,
  Flame,
  MoreVertical,
  Package,
  Pencil,
  Truck,
} from 'lucide-react-native';
import type React from 'react';
import { useState } from 'react';
import { Alert, Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { toTitleCase } from '../../../../../shared-utils/productText';
import { WEB_URL } from '../../../services/supabaseClient';
import {
  getMobileProductCardActionAvailability,
  isMobileProductStockLow,
  isSalvadoProduct,
  resolveCanonicalOpportunityBadge,
} from '../domain/mobileProductCardRules';
import { containsProductVariationNamePhrase } from '../domain/productVariationName';
import { useMobileProductMetadata } from '../hooks/useMobileProductMetadata';
import { toMobileVariationAttributes } from '../services/mobileProductVariationActionsService';
import { MobileChannelBadges } from './MobileChannelBadges';
import { MobileProductActionsMenu } from './MobileProductActionsMenu';
import { MobileProductVariationActionsMenu } from './MobileProductVariationActionsMenu';
import { MobileProductVariationList } from './MobileProductVariationList';

const normalizeVariationNamePart = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const getTechnicalColor = (technicalValues: any): string | undefined => {
  if (!technicalValues || typeof technicalValues !== 'object') return undefined;
  const values =
    technicalValues.technicalValues || technicalValues.technical_values || technicalValues;
  const entries = Array.isArray(values)
    ? values.map((entry: any) => [entry?.name || entry?.key, entry])
    : Object.entries(values);
  const colorEntry = entries.find(
    ([name]) => normalizeVariationNamePart(String(name || '')) === 'cor'
  );
  if (!colorEntry) return undefined;
  const rawValue = colorEntry[1];
  const structuredValue =
    rawValue && typeof rawValue === 'object' ? (rawValue as Record<string, any>) : null;
  const color = structuredValue ? (structuredValue.value ?? structuredValue.val) : rawValue;
  return color === null || color === undefined || String(color).trim() === ''
    ? undefined
    : String(color).trim();
};

const getVariationAttributeValues = (product: any, variation: any): string[] => {
  let attributes = variation?.attributes;
  if (typeof attributes === 'string') {
    try {
      attributes = JSON.parse(attributes);
    } catch {
      return [];
    }
  }

  const pairs: { name: any; value: any; showName: boolean }[] = Array.isArray(attributes)
    ? attributes.map((attribute: any) => ({
        name: attribute?.name || attribute?.attribute || attribute?.key,
        value: attribute?.value || attribute?.val,
        showName: attribute?.showName !== false,
      }))
    : attributes && typeof attributes === 'object'
      ? Object.entries(attributes).map(([name, rawValue]) => {
          const structured =
            rawValue && typeof rawValue === 'object' ? (rawValue as Record<string, any>) : null;
          return {
            name,
            value: structured?.value ?? structured?.val ?? rawValue,
            showName: structured?.showName !== false,
          };
        })
      : [];

  const hasVariationColor = pairs.some(
    ({ name }) => normalizeVariationNamePart(String(name || '')) === 'cor'
  );
  if (!hasVariationColor) {
    const color =
      getTechnicalColor(variation?.technicalValues || variation?.technical_values) ||
      getTechnicalColor(
        product?.technicalValues ||
          product?.technical_values ||
          product?.technicalSpecs ||
          product?.technical_specs
      );
    if (color) pairs.push({ name: 'Cor', value: color, showName: true });
  }

  return pairs
    .filter(({ name, value, showName }) => showName && name && value)
    .map(({ value }) => String(value).trim())
    .filter(Boolean);
};

const getSingleVariationDisplayName = (product: any, variation: any): string => {
  const parentName = String(product?.name || product?.title || product?.description || '').trim();
  const variationName = String(variation?.displayName || variation?.name || '').trim();
  const attributeValues = getVariationAttributeValues(product, variation);

  if (attributeValues.length === 0) return toTitleCase(variationName || parentName);

  const includesParent =
    !parentName || containsProductVariationNamePhrase(variationName, parentName);
  const includesAttributes = attributeValues.every((value) =>
    containsProductVariationNamePhrase(variationName, value)
  );
  if (variationName && includesParent && includesAttributes) return toTitleCase(variationName);

  return toTitleCase([parentName, attributeValues.join(' ')].filter(Boolean).join(' - '));
};

interface Props {
  product: any;
  dark: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canChangeCatalog?: boolean;
  showCatalogStatus?: boolean;
  canPrintLabels?: boolean;
  canViewDetails?: boolean;
  isLabelOnlyProfile?: boolean;
  onEdit: (product: any) => void;
  onViewDetails?: (product: any) => void;
  onToggleCatalog: (
    productId: string,
    currentStatus: string,
    isVariation?: boolean,
    varId?: string
  ) => void;
  onToggleActive: (productId: string, currentActive: boolean) => void;
  onDelete: (productId: string, isDraft?: boolean) => void;
  onDuplicate?: (product: any) => void;
  onLaunchStock?: (product: any) => void;
  onShowHistory?: (product: any) => void;
  onShowOrders?: (product: any) => void;
  onMoveVariation?: (variation: any, parentProduct: any) => void;
  onMergeVariation?: (variation: any, parentProduct: any) => void;
}

export const MobileProductCard: React.FC<Props> = ({
  product,
  dark,
  canEdit = false,
  canDelete = false,
  canChangeCatalog = false,
  showCatalogStatus = true,
  canPrintLabels = false,
  canViewDetails = false,
  isLabelOnlyProfile = false,
  onEdit,
  onViewDetails,
  onToggleCatalog,
  onToggleActive,
  onDelete,
  onDuplicate,
  onLaunchStock,
  onShowHistory,
  onShowOrders,
  onMoveVariation,
  onMergeVariation,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [variationMenuVisible, setVariationMenuVisible] = useState(false);

  const variations = product.allVariations || [];
  const hasVars = variations.length > 0;
  const isParent = Boolean(product.isParent || hasVars);
  const singleVariation = isParent && variations.length === 1 ? variations[0] : null;
  const isSingleVariationCard = Boolean(singleVariation);
  const hasExpandableVars = isParent && variations.length > 1;
  const isSingleVariationMerged = Boolean(
    singleVariation?.merged_to_variation_id || singleVariation?.mergedToVariationId
  );
  const isDraft = Boolean(product.isDraft || product.is_draft || product.status === 'draft');
  const cardActionAvailability = getMobileProductCardActionAvailability(product);
  const cardStatus = singleVariation?.status || product.status || 'hidden';
  const isPublished = !isDraft && cardStatus === 'published';
  const isActive =
    !isDraft &&
    (singleVariation ? singleVariation.active !== false : product.active !== false) &&
    !product.deleted;
  const displayTitle = singleVariation
    ? getSingleVariationDisplayName(product, singleVariation)
    : product.name || product.description || 'Produto sem título';
  const variationProductImage = Array.isArray(singleVariation?.images)
    ? singleVariation.images[0]
    : typeof singleVariation?.images === 'string'
      ? singleVariation.images.split(',').find(Boolean)
      : singleVariation?.image_url || singleVariation?.imageUrl;
  const parentProductImage = Array.isArray(product.images)
    ? product.images[0]
    : typeof product.images === 'string'
      ? product.images.split(',').find(Boolean)
      : null;
  const cardImage = variationProductImage || parentProductImage;
  const cardUnitPrice = Number(
    singleVariation?.unitPrice ?? singleVariation?.price ?? product.unitPrice ?? 0
  );
  const cardPromoPrice = Number(
    singleVariation?.promoPrice ?? singleVariation?.promo_price ?? product.promoPrice ?? 0
  );
  const hasCardPromo = cardPromoPrice > 0 && cardPromoPrice < cardUnitPrice;
  const cardPrice = hasCardPromo ? cardPromoPrice : cardUnitPrice;
  const cardStock = Number(singleVariation?.stock ?? product.stock ?? 0);
  const cardMinStock = Number(
    singleVariation?.minStock ??
      singleVariation?.min_stock ??
      product.minStock ??
      product.min_stock ??
      0
  );
  const isLowStock = isMobileProductStockLow(cardStock, cardMinStock);
  const cardUnit = singleVariation?.unit || product.unit || 'UN';
  const canShowVariationMenu = isLabelOnlyProfile ? canPrintLabels : canEdit;
  const { oppName, supplierNames } = useMobileProductMetadata(product);
  const isSalvado = isSalvadoProduct(product) || isSalvadoProduct(singleVariation);
  const oppBadgeInfo = resolveCanonicalOpportunityBadge(
    { ...product, ...(isSalvado ? { productKind: 'salvado' } : {}) },
    oppName
  );

  const parentCode = product.code || product.sku || '-';

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => hasExpandableVars && setExpanded((prev) => !prev)}
      style={[
        styles.card,
        dark && styles.darkCard,
        isParent && !isSingleVariationCard && (dark ? styles.darkParentCard : styles.parentCard),
        !isActive && !isDraft && styles.deactivatedCard,
      ]}
    >
      {/* Linha Superior: Botão Variações + Código + Atalhos de Ação */}
      <View style={styles.topRow}>
        <View style={styles.codeRow}>
          {hasExpandableVars && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setExpanded((prev) => !prev)}
              style={[styles.varToggleBtn, dark && styles.darkVarToggleBtn]}
            >
              {expanded ? (
                <ChevronDown size={14} color={dark ? '#93c5fd' : '#2563eb'} />
              ) : (
                <ChevronRight size={14} color={dark ? '#93c5fd' : '#2563eb'} />
              )}
              <Text style={[styles.varToggleText, dark && styles.darkVarToggleText]}>
                Variações ({variations.length})
              </Text>
            </TouchableOpacity>
          )}

          <Text style={[styles.codeBadge, dark && styles.darkCodeBadge]}>{parentCode}</Text>

          {isDraft && (
            <View style={styles.draftBadge}>
              <Text style={styles.draftBadgeText}>Rascunho</Text>
            </View>
          )}

          {!isActive && !isDraft && (
            <View style={styles.deactivatedBadge}>
              <Text style={styles.deactivatedBadgeText}>Desativado</Text>
            </View>
          )}
        </View>

        {/* Atalhos: Editar Rápido e Menu de 3 Pontinhos */}
        <View style={styles.headerActions}>
          {canEdit && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={(e) => {
                e.stopPropagation();
                onEdit(product);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Editar ${product.name || 'produto'}`}
              style={[styles.actionIconBtn, dark && styles.darkBtn]}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Pencil size={14} color={dark ? '#cbd5e1' : '#64748b'} />
            </TouchableOpacity>
          )}

          {!canEdit && !isLabelOnlyProfile && canViewDetails && onViewDetails && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={(e) => {
                e.stopPropagation();
                onViewDetails(product);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Ver detalhes de ${product.name || 'produto'}`}
              style={[styles.actionIconBtn, dark && styles.darkBtn]}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Eye size={15} color={dark ? '#93c5fd' : '#2563eb'} />
            </TouchableOpacity>
          )}

          {isSingleVariationCard ? (
            canShowVariationMenu ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={(e) => {
                  e.stopPropagation();
                  setVariationMenuVisible(true);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Ações da variação ${displayTitle}`}
                style={[styles.actionIconBtn, dark && styles.darkBtn]}
                hitSlop={{ top: 2, bottom: 2, left: 2, right: 2 }}
              >
                <MoreVertical size={15} color={dark ? '#cbd5e1' : '#64748b'} />
              </TouchableOpacity>
            ) : null
          ) : (
            !isLabelOnlyProfile &&
            (canEdit || canDelete || onLaunchStock || onShowHistory || onShowOrders) && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={(e) => {
                  e.stopPropagation();
                  setMenuVisible(true);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Opções de ${product.name || 'produto'}`}
                style={[styles.actionIconBtn, dark && styles.darkBtn]}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <MoreVertical size={15} color={dark ? '#cbd5e1' : '#64748b'} />
              </TouchableOpacity>
            )
          )}
        </View>
      </View>

      {/* Título do Produto Pai / Simples */}
      <View style={styles.productInfoRow}>
        {(!isParent || isSingleVariationCard) &&
          (cardImage ? (
            <Image source={{ uri: cardImage }} style={styles.productImage} resizeMode="cover" />
          ) : (
            <View
              style={[styles.productImagePlaceholder, dark && styles.darkProductImagePlaceholder]}
            >
              <Package size={17} color="#94a3b8" />
            </View>
          ))}
        <View style={styles.titleCol}>
          <Text
            style={[styles.title, dark && styles.lightText, isParent && styles.parentTitle]}
            numberOfLines={isSingleVariationCard ? 3 : 2}
          >
            {displayTitle}
          </Text>

          <View style={styles.tagsRow}>
            {product.itemType === 'composition' ? (
              <View
                style={[styles.oppBadge, { backgroundColor: '#f3e8ff', borderColor: '#d8b4fe' }]}
              >
                <Text style={[styles.oppText, { color: '#7e22ce' }]}>Composição</Text>
              </View>
            ) : null}
            {product.itemType === 'service' ? (
              <View
                style={[styles.oppBadge, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}
              >
                <Text style={[styles.oppText, { color: '#b45309' }]}>Serviço</Text>
              </View>
            ) : null}
            {oppBadgeInfo ? (
              <View
                style={[
                  styles.oppBadge,
                  dark && styles.darkOppBadge,
                  oppBadgeInfo.isSalvado && (dark ? styles.darkSalvadoBadge : styles.salvadoBadge),
                ]}
              >
                <Flame size={10} color="#d97706" />
                <Text
                  style={[
                    styles.oppText,
                    dark && styles.darkOppText,
                    oppBadgeInfo.isSalvado && (dark ? styles.darkSalvadoText : styles.salvadoText),
                  ]}
                >
                  {oppBadgeInfo.label}
                </Text>
              </View>
            ) : null}
            {supplierNames.map((sName) => (
              <View key={sName} style={[styles.supplierBadge, dark && styles.darkBadge]}>
                <Truck size={10} color="#64748b" />
                <Text style={styles.supplierText}>{sName}</Text>
              </View>
            ))}
            {product.category ? (
              <Text style={[styles.categoryBadge, dark && styles.darkCategory]}>
                {product.category}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* Linha Inferior: Preço/Estoque e Status de Canais Bipartido */}
      <View style={styles.bottomRow}>
        {(!isParent || isSingleVariationCard) && (
          <View style={styles.priceCol}>
            {hasCardPromo && (
              <Text style={styles.oldPrice}>R$ {cardUnitPrice.toFixed(2).replace('.', ',')}</Text>
            )}
            <Text style={[styles.price, dark && styles.priceDark]}>
              R$ {cardPrice.toFixed(2).replace('.', ',')}
            </Text>
            {product.itemType !== 'service' && (
              <Text style={styles.stockText}>
                Estoque:{' '}
                <Text
                  style={[
                    styles.stockVal,
                    isLowStock && (dark ? styles.stockValLowDark : styles.stockValLow),
                  ]}
                >
                  {cardStock} {cardUnit}
                </Text>
              </Text>
            )}
          </View>
        )}

        {/* Status de Canais Bipartido */}
        <MobileChannelBadges
          dark={dark}
          isParent={isParent && !isSingleVariationCard}
          isSalvado={product.productKind === 'salvado' || product.product_kind === 'salvado'}
          isActive={isActive}
          isPublished={isPublished}
          isDraft={isDraft}
          showCatalog={(!isParent || isSingleVariationCard) && showCatalogStatus}
          canToggleActive={canDelete}
          canToggleCatalog={canChangeCatalog}
          disabled={isSingleVariationMerged}
          onToggleActive={() =>
            onToggleActive(
              singleVariation && !singleVariation.isVirtual ? singleVariation.id : product.id,
              isActive
            )
          }
          onToggleCatalog={() =>
            singleVariation && !singleVariation.isVirtual
              ? onToggleCatalog(product.id, cardStatus, true, singleVariation.id)
              : onToggleCatalog(product.id, cardStatus)
          }
        />
      </View>

      {/* Variações Filhas Expandidas */}
      {hasExpandableVars && expanded && (
        <MobileProductVariationList
          variations={variations}
          dark={dark}
          parentImage={
            Array.isArray(product.images)
              ? product.images[0]
              : typeof product.images === 'string'
                ? product.images
                : null
          }
          isParentDraft={isDraft}
          onToggleCatalog={(varId, st) => onToggleCatalog(product.id, st, true, varId)}
          onToggleActive={canDelete ? (varId, act) => onToggleActive(varId, act) : undefined}
          parentProduct={product}
          onEdit={canEdit && !isLabelOnlyProfile ? onEdit : undefined}
          onMoveVariation={canEdit && !isLabelOnlyProfile ? onMoveVariation : undefined}
          onMergeVariation={canEdit && !isLabelOnlyProfile ? onMergeVariation : undefined}
          onShowHistory={onShowHistory}
          onLaunchStock={onLaunchStock}
          canChangeCatalog={canChangeCatalog}
          showCatalogStatus={showCatalogStatus}
          canPrintLabel={canPrintLabels}
        />
      )}

      {/* Modal de Ações dos 3 Pontinhos */}
      <MobileProductActionsMenu
        visible={menuVisible && !isSingleVariationCard}
        dark={dark}
        product={product}
        isDraft={isDraft}
        isActive={isActive}
        canEdit={canEdit && !isLabelOnlyProfile}
        canDelete={canDelete && !isLabelOnlyProfile}
        onClose={() => setMenuVisible(false)}
        onEdit={onEdit}
        onToggleActive={onToggleActive}
        onDelete={onDelete}
        onDuplicate={
          canEdit && !isLabelOnlyProfile && cardActionAvailability.canDuplicate
            ? onDuplicate
            : undefined
        }
        onLaunchStock={onLaunchStock}
        onShowHistory={onShowHistory}
        onShowOrders={cardActionAvailability.canShowLinkedOrders ? onShowOrders : undefined}
      />
      {singleVariation && (
        <MobileProductVariationActionsMenu
          visible={variationMenuVisible}
          dark={dark}
          variationName={displayTitle}
          isMerged={isSingleVariationMerged}
          onClose={() => setVariationMenuVisible(false)}
          onPrintLabel={
            canPrintLabels && !isSingleVariationMerged
              ? () => {
                  const parentId = product.id || singleVariation.productId || singleVariation.id;
                  const variationQuery =
                    !singleVariation.isVirtual && singleVariation.id
                      ? `&variationId=${encodeURIComponent(singleVariation.id)}`
                      : '';
                  const url = `${WEB_URL}/estoque/etiquetas?cat=identificacao&productId=${encodeURIComponent(parentId)}${variationQuery}&fillSheet=1`;
                  Linking.openURL(url).catch((error) => {
                    console.warn('Falha ao abrir tela de etiquetas:', error);
                    Alert.alert('Erro', 'Não foi possível abrir a tela de etiquetas.');
                  });
                }
              : undefined
          }
          onEdit={
            canEdit && !isLabelOnlyProfile && !isSingleVariationMerged
              ? () => onEdit(product)
              : undefined
          }
          onMoveToAnotherFamily={
            canEdit &&
            !isLabelOnlyProfile &&
            !isSingleVariationMerged &&
            !singleVariation.isVirtual &&
            onMoveVariation
              ? () => onMoveVariation(singleVariation, product)
              : undefined
          }
          onMergeWithAnotherVariation={
            canEdit &&
            !isLabelOnlyProfile &&
            !isSingleVariationMerged &&
            !singleVariation.isVirtual &&
            onMergeVariation
              ? () => onMergeVariation(singleVariation, product)
              : undefined
          }
          hasSupplier={Boolean(
            product.supplierId || product.supplier_id || product.main_supplier_id
          )}
          hasValidAttributes={toMobileVariationAttributes(singleVariation.attributes).some(
            (attribute) => attribute.name.trim() && attribute.value.trim()
          )}
          onLaunchStock={
            onLaunchStock && !isSingleVariationMerged && !isLabelOnlyProfile
              ? () => onLaunchStock(product)
              : undefined
          }
          onShowHistory={
            onShowHistory && !isSingleVariationMerged && !isLabelOnlyProfile
              ? () => onShowHistory(product)
              : undefined
          }
        />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  darkCard: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  parentCard: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },
  darkParentCard: {
    backgroundColor: '#1e293b',
    borderColor: '#475569',
  },
  deactivatedCard: {
    opacity: 0.75,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  varToggleBtn: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  darkVarToggleBtn: {
    backgroundColor: '#1e3a8a30',
    borderColor: '#1e3a8a60',
  },
  varToggleText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563eb',
    textTransform: 'uppercase',
  },
  darkVarToggleText: {
    color: '#93c5fd',
  },
  codeBadge: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  darkCodeBadge: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
    color: '#94a3b8',
  },
  draftBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  draftBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#b45309',
    textTransform: 'uppercase',
  },
  deactivatedBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  deactivatedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#b91c1c',
    textTransform: 'uppercase',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    pointerEvents: 'box-none',
  },
  actionIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkBtn: {
    backgroundColor: '#334155',
    borderColor: '#475569',
  },
  titleCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  productInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  productImage: {
    width: 46,
    height: 46,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  productImagePlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkProductImagePlaceholder: {
    backgroundColor: '#334155',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 18,
  },
  parentTitle: {
    fontWeight: '800',
    color: '#0f172a',
  },
  lightText: {
    color: '#f8fafc',
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  oppBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  darkOppBadge: {
    backgroundColor: '#78350f25',
    borderColor: '#b4530960',
  },
  oppText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#b45309',
    textTransform: 'uppercase',
  },
  darkOppText: {
    color: '#fde68a',
  },
  salvadoBadge: {
    backgroundColor: '#fffbeb',
    borderColor: '#fcd34d',
  },
  darkSalvadoBadge: {
    backgroundColor: '#451a0340',
    borderColor: '#b45309',
  },
  salvadoText: {
    color: '#b45309',
    fontWeight: '900',
  },
  darkSalvadoText: {
    color: '#fcd34d',
  },
  supplierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  darkBadge: {
    backgroundColor: '#334155',
    borderColor: '#475569',
  },
  supplierText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
  },
  categoryBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    textTransform: 'uppercase',
  },
  darkCategory: {
    backgroundColor: '#0f172a',
    color: '#94a3b8',
  },
  bottomRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  priceCol: {
    justifyContent: 'center',
  },
  oldPrice: {
    fontSize: 10,
    color: '#ef4444',
    textDecorationLine: 'line-through',
    fontWeight: '700',
  },
  price: {
    fontSize: 14,
    fontWeight: '900',
    color: '#2563eb',
  },
  priceDark: {
    color: '#60a5fa',
  },
  stockText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  stockVal: {
    fontWeight: '800',
    color: '#0f172a',
  },
  stockValLow: {
    color: '#ef4444',
  },
  stockValLowDark: {
    color: '#f87171',
  },
});
