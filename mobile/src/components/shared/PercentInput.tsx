import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaskedNumericInput, MaskedNumericInputProps } from './MaskedNumericInput';

export type PercentInputProps = Omit<
  MaskedNumericInputProps,
  'fractionDigits' | 'prefix' | 'suffix'
>;

export function PercentInput({ style, color, ...props }: PercentInputProps) {
  return (
    <View style={styles.container}>
      <MaskedNumericInput
        {...props}
        color={color}
        fractionDigits={2}
        style={[style, styles.input]}
      />
      <View pointerEvents="none" style={styles.suffix}>
        <Text accessible={false} style={{ color: color || '#64748b', fontWeight: '800' }}>%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative', width: '100%' },
  input: { paddingRight: 32 },
  suffix: { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' },
});
