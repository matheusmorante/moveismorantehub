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

export const MobileProductPagination: React.FC<Props> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage = 30,
  dark = false,
  onPageChange,
}) => {
  const safeTotalPages = Math.max(1, totalPages);
  const safeCurrentPage = normalizePageNumber(currentPage, safeTotalPages);
  const startItem =
    totalItems > 0 ? Math.min((safeCurrentPage - 1) * itemsPerPage + 1, totalItems) : 0;
  const endItem = Math.min(safeCurrentPage * itemsPerPage, totalItems);

  return (
    <View style={[styles.container, dark && styles.darkCard]}>
      <Text style={[styles.infoText, dark && styles.lightText]}>
        Exibindo{' '}
        <Text style={[styles.bold, dark && styles.boldDark]}>
          {startItem}-{endItem}
        </Text>{' '}
        de <Text style={[styles.bold, dark && styles.boldDark]}>{totalItems}</Text> produtos
      </Text>
      <FixedPageSlots
        label="Paginação de produtos"
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
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  darkCard: { backgroundColor: '#1e293b', borderColor: '#334155' },
  infoText: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  lightText: { color: '#94a3b8' },
  bold: { fontWeight: '800', color: '#0f172a' },
  boldDark: { color: '#f8fafc' },
});
