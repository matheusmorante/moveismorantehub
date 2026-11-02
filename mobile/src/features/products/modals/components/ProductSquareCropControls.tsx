import React from 'react';
import { Minus, Plus } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from './productSquareImageCropModal.styles';

interface Props {
  dark: boolean;
  selectionSize: number | null;
  paddingPercent: number;
  applying: boolean;
  onResizeSelection: (delta: number) => void;
  onChangePadding: (delta: number) => void;
  onCenterSelection: () => void;
}

export const ProductSquareCropControls: React.FC<Props> = ({
  dark,
  selectionSize,
  paddingPercent,
  applying,
  onResizeSelection,
  onChangePadding,
  onCenterSelection,
}) => (
  <>
    <View style={styles.resizeControls}>
      <TouchableOpacity
        onPress={() => onResizeSelection(-Math.max(12, (selectionSize || 0) * 0.08))}
        disabled={selectionSize === null || applying}
        accessibilityRole="button"
        accessibilityLabel="Diminuir área do recorte"
        style={[styles.resizeButton, dark && styles.darkResizeButton]}
      >
        <Minus size={17} color={dark ? '#e2e8f0' : '#334155'} />
      </TouchableOpacity>
      <Text style={[styles.helper, dark && styles.dimText]}>Tamanho do recorte</Text>
      <TouchableOpacity
        onPress={() => onResizeSelection(Math.max(12, (selectionSize || 0) * 0.08))}
        disabled={selectionSize === null || applying}
        accessibilityRole="button"
        accessibilityLabel="Aumentar área do recorte"
        style={[styles.resizeButton, dark && styles.darkResizeButton]}
      >
        <Plus size={17} color={dark ? '#e2e8f0' : '#334155'} />
      </TouchableOpacity>
    </View>
    <View style={styles.paddingControls}>
      <TouchableOpacity
        onPress={() => onChangePadding(-5)}
        disabled={paddingPercent === 0 || applying}
        accessibilityRole="button"
        accessibilityLabel="Diminuir moldura branca"
        style={[styles.resizeButton, dark && styles.darkResizeButton]}
      >
        <Minus size={17} color={dark ? '#e2e8f0' : '#334155'} />
      </TouchableOpacity>
      <Text style={[styles.helper, dark && styles.dimText]}>Moldura branca: {paddingPercent}%</Text>
      <TouchableOpacity
        onPress={() => onChangePadding(5)}
        disabled={paddingPercent === 35 || applying}
        accessibilityRole="button"
        accessibilityLabel="Aumentar moldura branca"
        style={[styles.resizeButton, dark && styles.darkResizeButton]}
      >
        <Plus size={17} color={dark ? '#e2e8f0' : '#334155'} />
      </TouchableOpacity>
      {paddingPercent > 0 ? (
        <TouchableOpacity
          onPress={() => onChangePadding(-paddingPercent)}
          disabled={applying}
          accessibilityRole="button"
          accessibilityLabel="Zerar moldura branca"
          style={styles.resetPaddingButton}
        >
          <Text style={styles.resetPaddingText}>Zerar</Text>
        </TouchableOpacity>
      ) : null}
    </View>
    <TouchableOpacity
      onPress={onCenterSelection}
      disabled={applying}
      accessibilityRole="button"
      accessibilityLabel="Centralizar recorte quadrado"
      style={styles.centerSelectionButton}
    >
      <Text style={[styles.helper, dark && styles.dimText]}>Centralizar 1:1</Text>
    </TouchableOpacity>
  </>
);
