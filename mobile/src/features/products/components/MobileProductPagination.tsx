import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

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
  if (totalItems <= itemsPerPage && totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <View style={[styles.container, dark && styles.darkCard]}>
      <Text style={[styles.infoText, dark && styles.lightText]}>
        Exibindo <Text style={styles.bold}>{startItem}-{endItem}</Text> de <Text style={styles.bold}>{totalItems}</Text> produtos
      </Text>

      <View style={styles.buttonsRow}>
        <TouchableOpacity
          disabled={currentPage <= 1}
          onPress={() => onPageChange(currentPage - 1)}
          style={[styles.arrowButton, currentPage <= 1 && styles.disabledButton, dark && styles.darkButton]}
        >
          <ChevronLeft size={18} color={currentPage <= 1 ? '#94a3b8' : dark ? '#f8fafc' : '#0f172a'} />
        </TouchableOpacity>

        <View style={[styles.pageIndicator, dark && styles.darkIndicator]}>
          <Text style={[styles.pageText, dark && styles.lightText]}>
            Página <Text style={styles.bold}>{currentPage}</Text> de <Text style={styles.bold}>{totalPages}</Text>
          </Text>
        </View>

        <TouchableOpacity
          disabled={currentPage >= totalPages}
          onPress={() => onPageChange(currentPage + 1)}
          style={[styles.arrowButton, currentPage >= totalPages && styles.disabledButton, dark && styles.darkButton]}
        >
          <ChevronRight size={18} color={currentPage >= totalPages ? '#94a3b8' : dark ? '#f8fafc' : '#0f172a'} />
        </TouchableOpacity>
      </View>
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
  darkCard: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  infoText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  lightText: {
    color: '#94a3b8',
  },
  bold: {
    fontWeight: '800',
    color: '#0f172a',
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkButton: {
    backgroundColor: '#334155',
  },
  disabledButton: {
    opacity: 0.4,
  },
  pageIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
  },
  darkIndicator: {
    backgroundColor: '#0f172a',
  },
  pageText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '700',
  },
});
