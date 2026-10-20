import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Clock3, MoreVertical } from 'lucide-react-native';
import { styles } from '../screens/suppliersScreen.styles';

interface SupplierColors {
  bg: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
}

interface SupplierCardProps {
  supplier: any;
  colors: SupplierColors;
  productCount?: number;
  hasProductCountError?: boolean;
  onEdit: (supplier: any) => void;
  onOpenHistory: (supplier: any) => void;
  onShowActions: (supplier: any) => void;
  onRetryProductCount: (supplierId: string) => void;
}

export const SupplierCard: React.FC<SupplierCardProps> = ({
  supplier: s,
  colors,
  productCount,
  hasProductCountError,
  onEdit,
  onOpenHistory,
  onShowActions,
  onRetryProductCount,
}) => {
  return (
    <View style={styles.cardContainer}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Editar ${s.name}`}
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
          !s.active && styles.inactiveCard,
        ]}
        onPress={() => onEdit(s)}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>{s.name}</Text>
            {s.personType === 'PF' && s.socialName ? (
              <Text style={[styles.subtitle, { color: colors.muted }]}>{s.socialName}</Text>
            ) : null}
            {s.personType === 'PJ' && s.tradeName ? (
              <Text style={[styles.subtitle, { color: colors.muted }]}>{s.tradeName}</Text>
            ) : null}
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity
              onPress={(event) => {
                event.stopPropagation();
                onOpenHistory(s);
              }}
              style={styles.historyButton}
              accessibilityRole="button"
              accessibilityLabel={`Histórico de pedidos de ${s.name}`}
            >
              <Clock3 size={17} color="#d97706" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={(event) => {
                event.stopPropagation();
                onShowActions(s);
              }}
              style={styles.historyButton}
              accessibilityRole="button"
              accessibilityLabel={`Mais ações para ${s.name}`}
            >
              <MoreVertical size={17} color={colors.muted} />
            </TouchableOpacity>
            <View
              style={[styles.badge, { backgroundColor: s.active ? '#dcfce7' : '#f1f5f9' }]}
            >
              <Text
                style={{
                  color: s.active ? '#15803d' : '#64748b',
                  fontSize: 9,
                  fontWeight: '900',
                }}
              >
                {s.active ? 'ATIVO' : 'INATIVO'}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.cardBottom}>
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '600', flex: 1 }}>
            {s.documentNumber || 'CPF/CNPJ não informado'}
          </Text>
          <TouchableOpacity
            onPress={(event) => {
              event.stopPropagation();
              if (hasProductCountError) onRetryProductCount(String(s.id));
            }}
            disabled={!hasProductCountError}
            style={styles.productCount}
            accessibilityRole="button"
            accessibilityLabel={
              hasProductCountError
                ? `Tentar carregar a contagem de produtos de ${s.name}`
                : `${productCount ?? 'Carregando'} produtos vinculados`
            }
          >
            <Text style={styles.productCountText}>
              {productCount === undefined
                ? hasProductCountError
                  ? 'Tentar contagem'
                  : '… produtos'
                : `${productCount} ${productCount === 1 ? 'produto' : 'produtos'}`}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );
};
