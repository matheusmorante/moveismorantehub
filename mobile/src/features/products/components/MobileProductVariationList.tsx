import type React from 'react';
import { StyleSheet, View } from 'react-native';
import { MobileProductVariationCard } from './MobileProductVariationCard';

interface Props {
  variations: any[];
  exitedVariationIds?: ReadonlySet<string>;
  opportunityName?: string;
  dark: boolean;
  parentImage?: string | null;
  isParentDraft?: boolean;
  onToggleCatalog: (varId: string, currentStatus: string) => void;
  onToggleActive?: (varId: string, currentActive: boolean) => void;
  canViewDetails?: boolean;
  onViewDetails?: (product: any) => void;
  onEdit?: (product: any) => void;
  onMoveVariation?: (variation: any, parentProduct: any) => void;
  onMergeVariation?: (variation: any, parentProduct: any) => void;
  onShowOrders?: (product: any) => void;
  canShowLinkedOrders?: boolean;
  parentProduct?: any;
  canChangeCatalog?: boolean;
  showCatalogStatus?: boolean;
  canPrintLabel?: boolean;
  isLabelOnlyProfile?: boolean;
}

export const MobileProductVariationList: React.FC<Props> = ({
  variations,
  exitedVariationIds,
  opportunityName,
  dark,
  parentImage,
  isParentDraft = false,
  onToggleCatalog,
  onToggleActive,
  canViewDetails = false,
  onViewDetails,
  onEdit,
  onMoveVariation,
  onMergeVariation,
  onShowOrders,
  canShowLinkedOrders = false,
  parentProduct,
  canChangeCatalog = false,
  showCatalogStatus = true,
  canPrintLabel = false,
  isLabelOnlyProfile = false,
}) => {
  if (!variations || variations.length === 0) return null;

  return (
    <View style={[styles.container, dark && styles.darkContainer]}>
      {variations.map((v: any, index: number) => (
        <MobileProductVariationCard
          key={v.id || index}
          variation={v}
          exitedVariationIds={exitedVariationIds}
          opportunityName={opportunityName}
          index={index}
          dark={dark}
          parentImage={parentImage}
          isParentDraft={isParentDraft}
          onToggleActive={onToggleActive}
          onToggleCatalog={onToggleCatalog}
          canViewDetails={canViewDetails}
          onViewDetails={onViewDetails}
          parentProduct={parentProduct}
          onEdit={onEdit}
          onMoveVariation={onMoveVariation}
          onMergeVariation={onMergeVariation}
          onShowOrders={onShowOrders}
          canShowLinkedOrders={canShowLinkedOrders}
          canChangeCatalog={canChangeCatalog}
          showCatalogStatus={showCatalogStatus}
          canPrintLabel={canPrintLabel}
          isLabelOnlyProfile={isLabelOnlyProfile}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    marginHorizontal: -12,
    marginBottom: -12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 8,
  },
  darkContainer: {
    backgroundColor: '#090d16',
    borderTopColor: '#1e293b',
  },
});
