import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MobileProductVariationCard } from './MobileProductVariationCard';

interface Props {
  variations: any[];
  dark: boolean;
  isParentDraft?: boolean;
  onToggleCatalog: (varId: string, currentStatus: string) => void;
  onToggleActive?: (varId: string, currentActive: boolean) => void;
}

export const MobileProductVariationList: React.FC<Props> = ({
  variations,
  dark,
  isParentDraft = false,
  onToggleCatalog,
  onToggleActive,
}) => {
  if (!variations || variations.length === 0) return null;

  return (
    <View style={[styles.container, dark && styles.darkContainer]}>
      <Text style={[styles.headerText, dark && styles.lightHeaderText]}>
        Variações ({variations.length})
      </Text>

      {variations.map((v: any, index: number) => (
        <MobileProductVariationCard
          key={v.id || index}
          variation={v}
          index={index}
          dark={dark}
          isParentDraft={isParentDraft}
          onToggleActive={onToggleActive}
          onToggleCatalog={onToggleCatalog}
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
  headerText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  lightHeaderText: {
    color: '#94a3b8',
  },
});
