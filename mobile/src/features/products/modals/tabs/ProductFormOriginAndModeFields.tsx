import type React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from './productFormBasicTab.styles';

interface Props {
  itemType: string;
  dark: boolean;
  nameError: boolean;
  isNormal: boolean;
  isSalvado: boolean;
  isUsado: boolean;
  isMultiVariationMode: boolean;
  onSelectOrigin: (origin: 'normal' | 'salvado' | 'usado') => void;
  onSelectProductMode: (hasVariations: boolean) => void;
}

export const ProductFormOriginAndModeFields: React.FC<Props> = ({
  itemType,
  dark,
  nameError,
  isNormal,
  isSalvado,
  isUsado,
  isMultiVariationMode,
  onSelectOrigin,
  onSelectProductMode,
}) => (
  <>
    {/* ORIGEM DO ESTOQUE */}
    {itemType !== 'service' && (
      <View style={styles.field}>
        <Text style={[styles.label, dark && styles.lightLabel, nameError && styles.errorLabel]}>
          ORIGEM DO ESTOQUE <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.originRow}>
          <TouchableOpacity
            onPress={() => onSelectOrigin('normal')}
            style={[
              styles.originBtn,
              isNormal
                ? styles.originBtnActive
                : dark
                  ? styles.darkInput
                  : styles.lightDiferenciarBtn,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Origem do estoque Convencional"
          >
            <Text
              style={[
                styles.originBtnText,
                isNormal ? styles.originBtnTextActive : dark ? styles.lightText : styles.dimText,
              ]}
            >
              Convencional
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onSelectOrigin('salvado')}
            style={[
              styles.originBtn,
              isSalvado
                ? styles.originBtnActiveSalvado
                : dark
                  ? styles.darkInput
                  : styles.lightDiferenciarBtn,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Origem do estoque Salvados"
          >
            <Text
              style={[
                styles.originBtnText,
                isSalvado
                  ? styles.originBtnTextActiveSalvado
                  : dark
                    ? styles.lightText
                    : styles.dimText,
              ]}
            >
              Salvados
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onSelectOrigin('usado')}
            style={[
              styles.originBtn,
              isUsado
                ? styles.originBtnActiveUsado
                : dark
                  ? styles.darkInput
                  : styles.lightDiferenciarBtn,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Origem do estoque Usados"
          >
            <Text
              style={[
                styles.originBtnText,
                isUsado
                  ? styles.originBtnTextActiveUsado
                  : dark
                    ? styles.lightText
                    : styles.dimText,
              ]}
            >
              Usados
            </Text>
          </TouchableOpacity>
        </View>
        {isSalvado && (
          <Text style={styles.salvadoWarning}>
            O produto e suas variações serão desativados no ERP.
          </Text>
        )}
      </View>
    )}

    {itemType !== 'service' && (
      <View style={styles.field}>
        <Text style={[styles.label, dark && styles.lightLabel]}>TIPO DE PRODUTO</Text>
        <View style={styles.originRow}>
          {[false, true].map((hasVariations) => {
            const selected = isMultiVariationMode === hasVariations;
            return (
              <TouchableOpacity
                key={String(hasVariations)}
                onPress={() => onSelectProductMode(hasVariations)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[
                  styles.originBtn,
                  selected && styles.originBtnActive,
                  dark && !selected && styles.darkInput,
                ]}
              >
                <Text
                  style={[
                    styles.originBtnText,
                    selected
                      ? styles.originBtnTextActive
                      : dark
                        ? styles.lightText
                        : styles.dimText,
                  ]}
                >
                  {hasVariations ? 'Com variações' : 'Simples'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={[styles.dimText, { fontSize: 11, lineHeight: 16 }]}>
          Produtos simples mantêm uma variação padrão. Para usar opções diferentes de cor,
          tamanho ou modelo, escolha “Com variações”.
        </Text>
      </View>
    )}

  </>
);
