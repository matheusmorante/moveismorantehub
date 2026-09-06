import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Tipo simplificado de produto para geração de slogan
export interface ProductInfo {
  name: string;
  // Lista de atributos relevantes (ex: cor, tamanho, material)
  attributes?: string[];
}

/**
 * Gera um slogan curto (até 6 palavras) a partir das características do produto.
 * Estratégia simples: combina o nome do produto com um benefício escolhido a partir dos atributos,
 * ou usa um fallback genérico.
 */
export const generateProductSlogan = (product: ProductInfo): string => {
  const fallback = `${product.name} merece qualidade`;
  if (!product.attributes || product.attributes.length === 0) return fallback;
  const benefits = [
    'conforto',
    'elegância',
    'durabilidade',
    'estilo',
    'praticidade',
    'versatilidade',
  ];
  const attr = product.attributes[0];
  const benefit = benefits[Math.floor(Math.random() * benefits.length)];
  const slogan = `${product.name} traz ${benefit} em ${attr}`;
  const words = slogan.split(' ');
  return words.length <= 6 ? slogan : words.slice(0, 6).join(' ');
};

/**
 * Componente visual que exibe o slogan do produto.
 * Estilo premium: fundo escuro, cantos arredondados, sombra suave e tipografia moderna.
 */
export const ProductSlogan: React.FC<{ product: ProductInfo }> = ({ product }) => {
  const slogan = generateProductSlogan(product);
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{slogan}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#1e293b', // dark slate background (fallback for dark mode)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    marginVertical: 8,
  },
  text: {
    color: '#f1f5f9',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});
