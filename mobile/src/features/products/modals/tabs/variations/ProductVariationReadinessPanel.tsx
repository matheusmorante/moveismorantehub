import type React from 'react';
import { Check, X } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { styles } from './productFormVariationsTab.styles';

type ReadinessMode = 'erp' | 'catalog';

interface ReadinessItem {
  label: string;
  complete: boolean;
}

interface Props {
  mode: ReadinessMode;
  readinessItems: ReadonlyArray<ReadinessItem>;
  dark: boolean;
}

export const ProductVariationReadinessPanel: React.FC<Props> = ({
  mode,
  readinessItems,
  dark,
}) => (
  <View style={[styles.readinessPanel, dark && styles.darkReadinessPanel]}>
    <Text style={[styles.readinessPanelTitle, dark && styles.lightText]}>
      {mode === 'erp'
        ? 'Requisitos do ERP (Variação / Ativação)'
        : 'Requisitos para o Catálogo'}
    </Text>
    {readinessItems.map((item) => (
      <View
        key={item.label}
        accessible
        accessibilityLabel={`${item.label}: ${item.complete ? 'atendido' : 'pendente'}`}
        style={styles.readinessItem}
      >
        {item.complete ? (
          <Check size={14} color={mode === 'erp' ? '#3b82f6' : '#10b981'} />
        ) : (
          <X size={14} color={mode === 'erp' ? '#f59e0b' : '#94a3b8'} />
        )}
        <Text
          style={[
            styles.readinessItemText,
            dark && styles.dimText,
            item.complete && (mode === 'erp'
              ? styles.erpReadinessComplete
              : styles.catalogReadinessComplete),
            !item.complete && styles.readinessItemPending,
          ]}
        >
          {item.label}
        </Text>
      </View>
    ))}
  </View>
);
