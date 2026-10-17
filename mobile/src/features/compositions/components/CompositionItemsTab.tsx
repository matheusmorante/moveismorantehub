import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Search, Package, Minus, Plus, Trash2 } from 'lucide-react-native';
import type { CompositionVariationItem } from '../types/composition.type';

interface ThemeColors {
  bg: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  danger: string;
}

interface CompositionItemsTabProps {
  items: CompositionVariationItem[];
  onAddItem: (product: any, variation?: any) => void;
  onRemoveItem: (index: number) => void;
  onUpdateQuantity: (index: number, quantity: number) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  results: any[];
  searching: boolean;
  searchError: boolean;
  themeColors: ThemeColors;
}

export const CompositionItemsTab: React.FC<CompositionItemsTabProps> = ({
  items,
  onAddItem,
  onRemoveItem,
  onUpdateQuantity,
  searchTerm,
  setSearchTerm,
  results,
  searching,
  searchError,
  themeColors,
}) => {
  return (
    <View style={{ padding: 16, flex: 1 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <View>
          <Text style={{ color: themeColors.text, fontWeight: 'bold', fontSize: 16 }}>
            Itens da Composição
          </Text>
          <Text style={{ color: themeColors.textMuted, fontSize: 12 }}>
            A disponibilidade é limitada pelo menor estoque.
          </Text>
        </View>
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text
          style={{ color: themeColors.text, fontWeight: 'bold', fontSize: 14, marginBottom: 8 }}
        >
          + Adicionar Produto
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: themeColors.surface,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: themeColors.border,
            paddingHorizontal: 12,
          }}
        >
          <Search size={16} color={themeColors.textMuted} />
          <TextInput
            style={{ flex: 1, padding: 12, color: themeColors.text }}
            placeholder="Buscar por nome ou código..."
            placeholderTextColor={themeColors.textMuted}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>

        {searching && (
          <Text style={{ fontSize: 12, color: themeColors.textMuted, marginTop: 4 }}>
            Buscando...
          </Text>
        )}
        {!searching && searchError && (
          <Text style={{ fontSize: 12, color: themeColors.danger, marginTop: 4 }}>
            Erro ao buscar produtos.
          </Text>
        )}
        {!searching && !searchError && searchTerm.length >= 2 && results.length === 0 && (
          <Text style={{ fontSize: 12, color: themeColors.textMuted, marginTop: 4 }}>
            Nenhum produto encontrado.
          </Text>
        )}

        {results.length > 0 && (
          <View
            style={{
              borderWidth: 1,
              borderColor: themeColors.border,
              borderRadius: 8,
              backgroundColor: themeColors.surface,
              marginTop: 4,
              overflow: 'hidden',
            }}
          >
            {results.map((r, i) => (
              <TouchableOpacity
                key={i}
                style={{
                  padding: 12,
                  borderBottomWidth: i < results.length - 1 ? 1 : 0,
                  borderBottomColor: themeColors.border,
                }}
                onPress={() => onAddItem(r, r.variation)}
              >
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: themeColors.text }}>
                  {r.name}
                  {r.variationName ? ' - ' + r.variationName : ''}
                </Text>
                <Text style={{ fontSize: 11, color: themeColors.textMuted }}>
                  {r.variationSku || r.code} • R${' '}
                  {Number(r.variationPrice ?? r.price ?? r.unit_price ?? 0).toFixed(2)} • Estoque:{' '}
                  {Number(r.variationStock ?? r.stock ?? 0)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {items.length === 0 ? (
        <View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
            backgroundColor: themeColors.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: themeColors.border,
            borderStyle: 'dashed',
          }}
        >
          <Package size={48} color={themeColors.textMuted} />
          <Text style={{ color: themeColors.text, fontWeight: 'bold', marginTop: 16 }}>
            Composição vazia
          </Text>
          <Text
            style={{
              color: themeColors.textMuted,
              textAlign: 'center',
              marginTop: 8,
              fontSize: 12,
            }}
          >
            Adicione produtos reais para que o estoque possa ser deduzido nas vendas.
          </Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }}>
          {items.map((item, index) => (
            <View
              key={index}
              style={{
                backgroundColor: themeColors.surface,
                padding: 16,
                borderRadius: 12,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: themeColors.border,
              }}
            >
              <Text
                style={{ color: themeColors.text, fontWeight: 'bold', marginBottom: 8 }}
                numberOfLines={1}
              >
                {item.productName}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <Text style={{ color: themeColors.textMuted, fontSize: 12 }}>
                  SKU: {item.productSku || 'S/N'}
                </Text>
                <Text style={{ color: '#059669', fontSize: 12, fontWeight: 'bold' }}>
                  Saldo: {item.currentStock || 0}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: themeColors.bg,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: themeColors.border,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => onUpdateQuantity(index, Math.max(1, item.quantity - 1))}
                    style={{ padding: 8 }}
                  >
                    <Minus size={16} color={themeColors.text} />
                  </TouchableOpacity>
                  <Text
                    style={{
                      color: themeColors.text,
                      fontWeight: 'bold',
                      width: 32,
                      textAlign: 'center',
                    }}
                  >
                    {item.quantity}
                  </Text>
                  <TouchableOpacity
                    onPress={() => onUpdateQuantity(index, item.quantity + 1)}
                    style={{ padding: 8 }}
                  >
                    <Plus size={16} color={themeColors.text} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  onPress={() => onRemoveItem(index)}
                  style={{ padding: 8, backgroundColor: '#fee2e2', borderRadius: 8 }}
                >
                  <Trash2 size={16} color={themeColors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};
