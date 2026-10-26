import type React from 'react';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
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
  const safeTotalPages = Number.isFinite(totalPages) ? Math.max(1, Math.floor(totalPages)) : 1;
  const safeCurrentPage = normalizePageNumber(currentPage, safeTotalPages);
  const pages = getFixedPageSlots(safeCurrentPage, safeTotalPages);
  const onPageChangeRef = useRef(onPageChange);

  useEffect(() => {
    onPageChangeRef.current = onPageChange;
  }, [onPageChange]);

  useEffect(() => {
    if (currentPage !== safeCurrentPage) onPageChangeRef.current(safeCurrentPage);
  }, [currentPage, safeCurrentPage]);

  return (
    <View style={styles.container}>
      <View
        accessibilityRole="toolbar"
        accessibilityLabel={label}
        style={[styles.row, dark && styles.rowDark]}
      >
        {pages.map((page) => {
          const isCurrent = page === safeCurrentPage;

          return (
            <Pressable
              key={page}
              accessibilityRole="button"
              accessibilityLabel={`Página ${page}${isCurrent ? ', atual' : ''}`}
              accessibilityState={{ selected: isCurrent, disabled: isCurrent || loading }}
              disabled={isCurrent || loading}
              onPress={() => onPageChange(page)}
              style={[
                styles.button,
                isCurrent && styles.buttonCurrent,
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
          );
        })}
      </View>
      <Text style={[styles.pageIndicator, dark && styles.pageIndicatorDark]}>
        Página
        <Text style={[styles.pageIndicatorCurrent, dark && styles.pageIndicatorCurrentDark]}>
          {' '}{safeCurrentPage}
        </Text>{' '}
        de {safeTotalPages}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%', alignItems: 'stretch', gap: 4 },
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  rowDark: { backgroundColor: '#1e293b' },
  button: {
    flex: 1,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  buttonCurrent: { backgroundColor: '#2563eb' },
  buttonLoading: { opacity: 0.5 },
  buttonText: { color: '#334155', fontSize: 14, fontWeight: '800' },
  buttonTextDark: { color: '#e2e8f0' },
  buttonTextCurrent: { color: '#ffffff', fontWeight: '900' },
  pageIndicator: { fontSize: 11, fontWeight: '600', color: '#64748b', textAlign: 'center' },
  pageIndicatorDark: { color: '#94a3b8' },
  pageIndicatorCurrent: { fontWeight: '800', color: '#2563eb' },
  pageIndicatorCurrentDark: { color: '#60a5fa' },
});
