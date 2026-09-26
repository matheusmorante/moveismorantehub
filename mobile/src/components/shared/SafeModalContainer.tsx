import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props extends ViewProps {
  mode?: 'fullscreen' | 'bottomSheet';
  children: React.ReactNode;
}

export const SafeModalContainer: React.FC<Props> = ({ mode = 'fullscreen', children, style, ...rest }) => {
  const insets = useSafeAreaInsets();
  
  // No fullscreen, injeta safe area no topo e na base.
  // No bottomSheet, apenas garante que o final não encoste na gesture bar,
  // somando o padding bottom original do estilo (se houver) ao inset.bottom.
  
  const flattenedStyle = StyleSheet.flatten(style) || {};
  const originalPaddingBottom = typeof flattenedStyle.paddingBottom === 'number' ? flattenedStyle.paddingBottom : 
                               (typeof flattenedStyle.padding === 'number' ? flattenedStyle.padding : 0);
  
  const safeStyle = mode === 'fullscreen'
    ? { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, originalPaddingBottom) }
    : { paddingBottom: Math.max(insets.bottom, originalPaddingBottom) };
    
  return (
    <View style={[mode === 'fullscreen' && styles.fullscreen, style, safeStyle]} {...rest}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  fullscreen: {
    flex: 1,
  },
});
