import React from 'react';
import {
  ChevronRight,
  FileText,
  Pencil,
  ShoppingCart,
} from 'lucide-react-native';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { styles } from './receiptSourcePicker.styles';

export interface ReceiptSourceColors {
  bg: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
}

type SourceKind = 'manual' | 'invoice' | 'purchase';

export const ReceiptSourceOptions: React.FC<{
  colors: ReceiptSourceColors;
  onSelect: (source: SourceKind) => void;
}> = ({ colors, onSelect }) => {
  const options = [
    {
      kind: 'manual' as const,
      title: 'Sem nota fiscal',
      description: 'Registrar recebimento sem nota fiscal',
      Icon: Pencil,
    },
    {
      kind: 'invoice' as const,
      title: 'Com nota fiscal de entrada',
      description: 'Preencher a partir da NF-e',
      Icon: FileText,
    },
    {
      kind: 'purchase' as const,
      title: 'Com pedido de compra',
      description: 'Receber itens de um pedido existente',
      Icon: ShoppingCart,
    },
  ];
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[styles.intro, { color: colors.muted }]}>
        Escolha como deseja iniciar o recebimento.
      </Text>
      {options.map(({ kind, title, description, Icon }) => (
        <TouchableOpacity
          key={kind}
          onPress={() => onSelect(kind)}
          disabled={kind === 'purchase'}
          accessibilityRole="button"
          accessibilityState={{ disabled: kind === 'purchase' }}
          style={[
            styles.option,
            { backgroundColor: colors.surface, borderColor: colors.border },
            kind === 'purchase' && styles.disabled,
          ]}
        >
          <View style={styles.optionIcon}>
            <Icon size={20} color="#059669" />
          </View>
          <View style={styles.grow}>
            <Text style={[styles.optionTitle, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.description, { color: colors.muted }]}>{description}</Text>
          </View>
          {kind === 'purchase' ? (
            <View style={styles.betaBadge}>
              <Text style={styles.betaBadgeText}>Beta</Text>
            </View>
          ) : (
            <ChevronRight size={18} color={colors.muted} />
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};
