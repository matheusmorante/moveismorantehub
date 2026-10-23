import { GitMerge } from 'lucide-react-native';
import type React from 'react';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../../services/supabaseClient';
import { normalizeVariationSku } from '../domain/productSku';

export interface MergedBadgeProps {
  targetVariationId?: string;
  dark?: boolean;
  size?: 'sm' | 'xs';
}

export const MergedBadge: React.FC<MergedBadgeProps> = ({
  targetVariationId,
  dark = false,
  size = 'xs',
}) => {
  const [targetSku, setTargetSku] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (targetVariationId && typeof supabase?.from === 'function') {
      Promise.resolve(
        supabase
          .from('product_variations')
          .select('sku')
          .eq('id', targetVariationId)
          .single()
      )
        .then(({ data }: any) => {
          if (active && data?.sku) {
            setTargetSku(data.sku);
          }
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [targetVariationId]);

  const iconSize = size === 'xs' ? 9 : 11;

  return (
    <View
      testID="merged-badge"
      style={[
        styles.badge,
        size === 'xs' ? styles.badgeXs : styles.badgeSm,
        dark ? styles.badgeDark : styles.badgeLight,
      ]}
    >
      <GitMerge size={iconSize} color={dark ? '#f87171' : '#dc2626'} />
      <Text
        style={[
          styles.text,
          size === 'xs' ? styles.textXs : styles.textSm,
          dark ? styles.textDark : styles.textLight,
        ]}
      >
        Mesclado
      </Text>
      {Boolean(targetVariationId) && (
        <View style={styles.targetContainer}>
          <Text
            style={[
              styles.targetPrefix,
              size === 'xs' ? styles.textXs : styles.textSm,
              dark ? styles.targetDark : styles.targetLight,
            ]}
          >
            em → {targetSku ? normalizeVariationSku(targetSku) : '...'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 9999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeXs: {
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeLight: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  badgeDark: {
    backgroundColor: 'rgba(127, 29, 29, 0.3)',
    borderColor: 'rgba(185, 28, 28, 0.4)',
  },
  text: {
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  textSm: {
    fontSize: 9,
  },
  textXs: {
    fontSize: 8,
  },
  textLight: {
    color: '#b91c1c',
  },
  textDark: {
    color: '#f87171',
  },
  targetContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  targetPrefix: {
    fontWeight: '700',
  },
  targetLight: {
    color: '#991b1b',
  },
  targetDark: {
    color: '#fca5a5',
  },
});

export default MergedBadge;
