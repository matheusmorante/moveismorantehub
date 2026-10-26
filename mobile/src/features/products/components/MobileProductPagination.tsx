import type React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { normalizePageNumber } from '../../../../../shared-utils/fixedPagination';
import {
  PRODUCT_LIST_PAGE_SIZES,
  type ProductListPageSize,
} from '../../../../../shared-utils/listingFormSchemas';
import { FixedPageSlots } from '../../../components/shared/FixedPageSlots';

interface Props {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: ProductListPageSize;
  dark?: boolean;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: ProductListPageSize) => void | Promise<void>;
}

export const MobileProductPagination: React.FC<Props> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  dark = false,
  onPageChange,
  onItemsPerPageChange,
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
      <View style={styles.pageSizeRow} accessibilityLabel="Itens por página">
        <Text style={[styles.pageSizeLabel, dark && styles.lightText]}>Itens por página</Text>
        <View style={styles.pageSizeOptions}>
          {PRODUCT_LIST_PAGE_SIZES.map((size) => {
            const selected = itemsPerPage === size;
            return (
              <Pressable
                key={size}
                accessibilityRole="button"
                accessibilityLabel={`${size} itens por página`}
                accessibilityState={{ selected }}
                onPress={() => void onItemsPerPageChange(size)}
                style={[
                  styles.pageSizeButton,
                  dark && styles.pageSizeButtonDark,
                  selected && styles.pageSizeButtonSelected,
                ]}
              >
                <Text
                  style={[
                    styles.pageSizeButtonText,
                    dark && styles.lightText,
                    selected && styles.pageSizeButtonTextSelected,
                  ]}
                >
                  {size}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
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
  pageSizeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  pageSizeLabel: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  pageSizeOptions: { flexDirection: 'row', gap: 6 },
  pageSizeButton: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  pageSizeButtonDark: { backgroundColor: '#0f172a', borderColor: '#475569' },
  pageSizeButtonSelected: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  pageSizeButtonText: { fontSize: 12, color: '#334155', fontWeight: '700' },
  pageSizeButtonTextSelected: { color: '#ffffff' },
  lightText: { color: '#94a3b8' },
  bold: { fontWeight: '800', color: '#0f172a' },
  boldDark: { color: '#f8fafc' },
});
