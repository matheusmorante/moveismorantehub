import type React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { normalizePageNumber } from '../../../../../shared-utils/fixedPagination';
import { FixedPageSlots } from '../../../components/shared/FixedPageSlots';

interface Props {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage?: number;
  dark?: boolean;
  onPageChange: (page: number) => void;
}

export const MobileOrderPagination: React.FC<Props> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage = 30,
  dark = false,
  onPageChange,
}) => {
  const safeTotalPages = Math.max(1, totalPages);
  const safeCurrentPage = normalizePageNumber(currentPage, safeTotalPages);
  const startIndex =
    totalItems > 0 ? Math.min((safeCurrentPage - 1) * itemsPerPage + 1, totalItems) : 0;
  const endIndex = Math.min(safeCurrentPage * itemsPerPage, totalItems);

  return (
    <View style={[styles.container, dark && styles.containerDark]}>
      <View style={styles.counterRow}>
        <Text style={[styles.counterText, dark && styles.counterTextDark]}>
          Exibindo{' '}
          <Text style={[styles.counterHighlight, dark && styles.counterHighlightDark]}>
            {startIndex}-{endIndex}
          </Text>{' '}
          de{' '}
          <Text style={[styles.counterHighlight, dark && styles.counterHighlightDark]}>
            {totalItems}
          </Text>{' '}
          pedidos
        </Text>
        <Text style={[styles.perPageText, dark && styles.perPageTextDark]}>
          ({itemsPerPage} por página)
        </Text>
      </View>
      <FixedPageSlots
        label="Paginação de pedidos"
        currentPage={currentPage}
        totalPages={safeTotalPages}
        onPageChange={onPageChange}
        dark={dark}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginVertical: 12,
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  containerDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  counterText: { fontSize: 12, fontWeight: '700', color: '#64748b', textAlign: 'center' },
  counterTextDark: { color: '#94a3b8' },
  counterHighlight: { fontWeight: '900', color: '#0f172a' },
  counterHighlightDark: { color: '#f8fafc' },
  perPageText: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  perPageTextDark: { color: '#64748b' },
});
