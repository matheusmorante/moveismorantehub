import type React from 'react';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  FIXED_PAGE_OFFSETS,
  getFixedPageSlots,
  normalizePageNumber,
} from '../../../../shared-utils/fixedPagination';

interface FixedPageSlotsProps {
  readonly currentPage: number;
  readonly totalPages: number;
  readonly onPageChange: (page: number) => void;
  readonly loading?: boolean;
  readonly dark?: boolean;
  readonly label: string;
}

export const FixedPageSlots: React.FC<FixedPageSlotsProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  loading = false,
  dark = false,
  label,
}) => {
  const safeCurrentPage = normalizePageNumber(currentPage, totalPages);
  const pages = getFixedPageSlots(safeCurrentPage, totalPages);
  const onPageChangeRef = useRef(onPageChange);

  useEffect(() => {
    onPageChangeRef.current = onPageChange;
  }, [onPageChange]);

  useEffect(() => {
    if (currentPage !== safeCurrentPage) onPageChangeRef.current(safeCurrentPage);
  }, [currentPage, safeCurrentPage]);

  return (
    <View accessibilityRole="toolbar" accessibilityLabel={label} style={styles.row}>
      {FIXED_PAGE_OFFSETS.map((offset, index) => {
        const page = pages[index];
        const isCurrent = offset === 0;

        return (
          <View key={`page-slot-${offset}`} style={styles.slot}>
            {page !== null && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Página ${page}${isCurrent ? ', atual' : ''}`}
                accessibilityState={{ selected: isCurrent, disabled: isCurrent || loading }}
                disabled={isCurrent || loading}
                onPress={() => onPageChange(page)}
                style={[
                  styles.button,
                  dark && styles.buttonDark,
                  isCurrent && styles.buttonCurrent,
                  isCurrent && dark && styles.buttonCurrentDark,
                  loading && !isCurrent && styles.buttonLoading,
                ]}
              >
                <Text
                  style={[
                    styles.buttonText,
                    dark && styles.buttonTextDark,
                    isCurrent && styles.buttonTextCurrent,
                  ]}
                >
                  {page}
                </Text>
              </Pressable>
            )}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  slot: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  button: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 11,
    backgroundColor: '#ffffff',
  },
  buttonDark: { borderColor: '#334155', backgroundColor: '#1e293b' },
  buttonCurrent: { borderColor: '#2563eb', backgroundColor: '#2563eb' },
  buttonCurrentDark: { borderColor: '#3b82f6', backgroundColor: '#3b82f6' },
  buttonLoading: { opacity: 0.5 },
  buttonText: { color: '#334155', fontSize: 14, fontWeight: '800' },
  buttonTextDark: { color: '#e2e8f0' },
  buttonTextCurrent: { color: '#ffffff', fontWeight: '900' },
});
