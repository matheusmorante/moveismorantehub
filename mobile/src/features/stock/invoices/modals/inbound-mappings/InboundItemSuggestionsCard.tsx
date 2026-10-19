import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Link2 } from 'lucide-react-native';
import type { InboundScorerProduct, ProductSuggestion } from './types';
import { amount, formatMoney } from './inboundCostUtils';
import { styles } from './inboundMappings.styles';

interface Props {
  isComposition: boolean;
  itemSuggestions: ProductSuggestion[];
  isDismissedSuggestion: boolean;
  isDarkMode: boolean;
  saving: boolean;
  onLinkProduct: (product: InboundScorerProduct) => void;
  onDismissSuggestions: () => void;
}

export const InboundItemSuggestionsCard: React.FC<Props> = ({
  isComposition,
  itemSuggestions,
  isDismissedSuggestion,
  isDarkMode,
  saving,
  onLinkProduct,
  onDismissSuggestions,
}) => {
  if (isComposition || itemSuggestions.length === 0 || isDismissedSuggestion) {
    return null;
  }

  return (
    <View style={[styles.suggestionCard, isDarkMode && styles.suggestionCardDark]}>
      <Text style={styles.suggestionEyebrow}>
        Sugestão automática · confirme antes de vincular
      </Text>
      {itemSuggestions.map((candidate, index) => (
        <View
          key={`${candidate.productId}:${candidate.variationId || ''}`}
          style={styles.suggestionRow}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.itemName, isDarkMode && styles.textDark]}>
              {candidate.name}
            </Text>
            <Text style={styles.muted}>
              SKU: {candidate.sku || '—'} · Venda:{' '}
              {formatMoney(amount(candidate.sellingPrice))} · Confiança{' '}
              {candidate.confidence}%
              {index === 0 ? ' · Melhor correspondência' : ''}
            </Text>
            {candidate.divergences.length ? (
              <Text style={styles.error}>{candidate.divergences[0]}</Text>
            ) : null}
          </View>
          <TouchableOpacity
            disabled={saving}
            onPress={() => onLinkProduct(candidate)}
            style={styles.suggestionLinkButton}
          >
            <Link2 size={15} color="#fff" />
            <Text style={styles.suggestionLinkText}>Vincular</Text>
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity onPress={onDismissSuggestions} style={styles.ignoreButton}>
        <Text style={styles.muted}>Ignorar sugestões</Text>
      </TouchableOpacity>
    </View>
  );
};
