import {
  ChevronDown,
  ChevronRight,
  Eye,
  MoreVertical,
  Package,
  Pencil,
  RotateCcw,
  Truck,
} from 'lucide-react-native';
import type React from 'react';
import { useState } from 'react';
import { Alert, Image, Linking, Text, TouchableOpacity, View } from 'react-native';
import { WEB_URL } from '../../../services/supabaseClient';
import { useMobileProductCardState } from '../hooks/useMobileProductCardState';
import { MobileChannelBadges } from './MobileChannelBadges';
import { MobileProductActionsMenu } from './MobileProductActionsMenu';
import { MobileProductVariationActionsMenu } from './MobileProductVariationActionsMenu';
import { MobileProductVariationList } from './MobileProductVariationList';
import { StockOriginBadge } from './StockOriginBadge';
import { MergedBadge } from './MergedBadge';
import { styles } from './MobileProductCard.styles';
import { buildProductPriceLabelUrl } from '../domain/productLabelLinks';

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
  showTrash?: boolean;
  onRestore?: (id: string) => void;
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
  onMoveToTrash?: (productId: string) => void;
  onDuplicate?: (product: any) => void;
  onLaunchStock?: (product: any) => void;
  onShowHistory?: (product: any) => void;
  onShowOrders?: (product: any) => void;
  onMoveVariation?: (variation: any, parentProduct: any) => void;
  onMergeVariation?: (variation: any, parentProduct: any) => void;
}

/**
 * Card de produto do aplicativo mobile.
 * Apresenta dados consolidados do produto pai ou variação única, atalhos de edição,
 * badges de canais/estoque e lista de variações expansível.
 */
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
  showTrash = false,
  onRestore,
  onEdit,
  onViewDetails,
  onToggleCatalog,
  onToggleActive,
  onDelete,
  onMoveToTrash,
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

  const {
    variations,
    isParent,
    singleVariation,
    isSingleVariationCard,
    hasExpandableVars,
    isSingleVariationMerged,
    isMerged,
    isDraft,
    cardActionAvailability,
    cardStatus,
    isPublished,
    isActive,
    displayTitle,
    cardImage,
    cardUnitPrice,
    cardPromoPrice,
    hasCardPromo,
    cardPrice,
    cardStock,
    isLowStock,
    cardUnit,
    canShowVariationMenu,
    oppName,
    supplierNames,
    isSalvado,
    oppBadgeInfo,
    displaySku,
  } = useMobileProductCardState({
    product,
    isLabelOnlyProfile,
    canPrintLabels,
    canEdit,
  });

  const handlePrintLabel = () => {
    const parentId = product.id || singleVariation?.productId || singleVariation?.id;
    const variationQuery =
      singleVariation && !singleVariation.isVirtual && singleVariation.id
        ? `&variationId=${encodeURIComponent(singleVariation.id)}`
        : '';
    const url = `${WEB_URL}/estoque/etiquetas?cat=identificacao&productId=${encodeURIComponent(parentId)}${variationQuery}&fillSheet=1`;
    Linking.openURL(url).catch((error) => {
      console.warn('Falha ao abrir tela de etiquetas:', error);
      Alert.alert('Erro', 'Não foi possível abrir a tela de etiquetas.');
    });
  };

  const handlePrintPriceLabel = (targetProduct: any) => {
    const productId = typeof targetProduct?.id === 'string' ? targetProduct.id.trim() : '';
    if (!productId) {
      Alert.alert('Produto indisponível', 'Não foi possível identificar o produto para a etiqueta.');
      return;
    }

    Linking.openURL(buildProductPriceLabelUrl(WEB_URL, productId)).catch((error) => {
      console.warn('Falha ao abrir etiqueta de preço:', error);
      Alert.alert('Erro', 'Não foi possível abrir a tela de etiquetas de preço.');
    });
  };

  const singleVariationTarget =
    singleVariation && !singleVariation.isVirtual
      ? {
          ...product,
          ...singleVariation,
          id: singleVariation.id,
          parentId: product.id,
          variationId: singleVariation.id,
          isVariation: true,
          name: displayTitle,
        }
      : product;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => hasExpandableVars && setExpanded((prev) => !prev)}
      style={[
        styles.card,
        dark && styles.darkCard,
        isParent && !isSingleVariationCard && (dark ? styles.darkParentCard : styles.parentCard),
        !isActive && !isDraft && !isSalvado && styles.deactivatedCard,
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

          <Text style={[styles.codeBadge, dark && styles.darkCodeBadge]}>{displaySku}</Text>

          {isDraft && (
            <View style={styles.draftBadge}>
              <Text style={styles.draftBadgeText}>Rascunho</Text>
            </View>
          )}

          {isMerged && (
            <MergedBadge
              targetVariationId={
                singleVariation?.merged_to_variation_id || singleVariation?.mergedToVariationId
              }
              dark={dark}
              size="xs"
            />
          )}
        </View>

        {/* Atalhos: Editar Rápido e Menu de 3 Pontinhos */}
        <View style={styles.headerActions}>
          {showTrash && onRestore && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={(e) => {
                e.stopPropagation();
                onRestore(product.id);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Restaurar ${product.name || 'produto'}`}
              style={[styles.actionIconBtn, dark && styles.darkBtn]}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <RotateCcw size={15} color={dark ? '#86efac' : '#16a34a'} />
            </TouchableOpacity>
          )}
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
            {product.itemType !== 'service' && (
              <StockOriginBadge
                product={product}
                singleVariation={singleVariation}
                oppName={oppName}
                dark={dark}
                size="sm"
              />
            )}
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
            {oppBadgeInfo && !oppBadgeInfo.isSalvado ? (
              <View
                style={[
                  styles.oppBadge,
                  dark && styles.darkOppBadge,
                ]}
              >
                <Text
                  style={[
                    styles.oppText,
                    dark && styles.darkOppText,
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
          disabled={isMerged}
          disabledReason={
            isMerged
              ? 'Esta variação foi mesclada e seu status não pode ser alterado diretamente.'
              : undefined
          }
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
          onShowOrders={onShowOrders}
          onLaunchStock={onLaunchStock}
          canShowLinkedOrders={cardActionAvailability.canShowLinkedOrders}
          canChangeCatalog={canChangeCatalog}
          showCatalogStatus={showCatalogStatus}
          canPrintLabel={canPrintLabels}
        />
      )}

      {/* Modal de Ações dos 3 Pontinhos (Produto Pai / Geral) */}
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
        onMoveToTrash={onMoveToTrash}
        onDuplicate={
          canEdit && !isLabelOnlyProfile && cardActionAvailability.canDuplicate
            ? onDuplicate
            : undefined
        }
        onLaunchStock={onLaunchStock}
        onShowHistory={onShowHistory}
        onShowOrders={cardActionAvailability.canShowLinkedOrders ? onShowOrders : undefined}
        onPrintPriceLabel={!isLabelOnlyProfile && !showTrash ? handlePrintPriceLabel : undefined}
      />

      {/* Modal de Ações da Variação Única */}
      {singleVariation && (
        <MobileProductVariationActionsMenu
          visible={variationMenuVisible}
          dark={dark}
          variationName={displayTitle}
          isMerged={isSingleVariationMerged}
          onClose={() => setVariationMenuVisible(false)}
          onPrintLabel={
            canPrintLabels && !isSingleVariationMerged ? handlePrintLabel : undefined
          }
          onPrintPriceLabel={
            !isLabelOnlyProfile && !showTrash && !isSingleVariationMerged
              ? () => handlePrintPriceLabel(product)
              : undefined
          }
          onEdit={
            canEdit && !isLabelOnlyProfile && !isSingleVariationMerged
              ? () => onEdit(product)
              : undefined
          }
          onShowOrders={
            (cardActionAvailability.canShowLinkedOrders || isSingleVariationCard) &&
            onShowOrders &&
            !isSingleVariationMerged &&
            singleVariation.id
              ? () => onShowOrders(product)
              : undefined
          }
          onLaunchStock={
            onLaunchStock && !isSingleVariationMerged
              ? () => onLaunchStock(singleVariationTarget)
              : undefined
          }
          onShowHistory={
            onShowHistory && !isSingleVariationMerged
              ? () => onShowHistory(singleVariationTarget)
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
          onMoveProductToTrash={
            canDelete && !showTrash && !isDraft && onMoveToTrash
              ? () => onMoveToTrash(product.id)
              : undefined
          }
          canMoveProductToTrash={product.can_trash === true}
          trashBlockReason={product.trash_block_reason}
        />
      )}
    </TouchableOpacity>
  );
};
