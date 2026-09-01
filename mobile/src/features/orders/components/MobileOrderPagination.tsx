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

export const MobileOrderPagination: React.FC<Props> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage = 30,
  dark = false,
  onPageChange,
}) => {
  if (totalItems <= itemsPerPage && totalPages <= 1) {
    return null;
  }

  const generatePageNumbers = () => {
    const pages: (number | string)[] = [];

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
      return pages;
    }

    pages.push(1);

    let start = Math.max(2, currentPage - 1);
    let end = Math.min(totalPages - 1, currentPage + 1);

    if (currentPage <= 2) {
      start = 2;
      end = 3;
    } else if (currentPage >= totalPages - 1) {
      start = totalPages - 2;
      end = totalPages - 1;
    }

    if (start > 2) {
      pages.push('...');
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages - 1) {
      pages.push('...');
    }

    pages.push(totalPages);
    return pages;
  };

  const pageNumbers = generatePageNumbers();
  const startIndex = Math.min((currentPage - 1) * itemsPerPage + 1, totalItems);
  const endIndex = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <View style={[styles.container, dark && styles.containerDark]}>
      {/* Contagem de Pedidos */}
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
          (30 por página)
        </Text>
      </View>

      {/* Controles de Navegação Centralizados e Responsivos */}
      <View style={styles.navigationRow}>
        {/* Botão Anterior */}
        <TouchableOpacity
          activeOpacity={0.7}
          disabled={currentPage <= 1}
          onPress={() => onPageChange(currentPage - 1)}
          style={[
            styles.navButton,
            dark && styles.navButtonDark,
            currentPage <= 1 && styles.navButtonDisabled,
          ]}
          accessibilityLabel="Página anterior"
        >
          <ChevronLeft
            size={18}
            color={
              currentPage <= 1
                ? dark
                  ? '#475569'
                  : '#cbd5e1'
                : dark
                ? '#cbd5e1'
                : '#334155'
            }
          />
        </TouchableOpacity>

        {/* Números das Páginas */}
        <View style={styles.pagesRow}>
          {pageNumbers.map((page, idx) => {
            if (typeof page === 'string') {
              return (
                <View key={`ellipsis-${idx}`} style={styles.ellipsisContainer}>
                  <Text style={[styles.ellipsisText, dark && styles.ellipsisTextDark]}>...</Text>
                </View>
              );
            }

            const isActive = page === currentPage;

            return (
              <TouchableOpacity
                key={`page-${page}`}
                activeOpacity={0.7}
                onPress={() => onPageChange(page)}
                style={[
                  styles.pageNumberButton,
                  dark && styles.pageNumberButtonDark,
                  isActive && styles.pageNumberButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.pageNumberText,
                    dark && styles.pageNumberTextDark,
                    isActive && styles.pageNumberTextActive,
                  ]}
                >
                  {page}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Botão Próxima */}
        <TouchableOpacity
          activeOpacity={0.7}
          disabled={currentPage >= totalPages}
          onPress={() => onPageChange(currentPage + 1)}
          style={[
            styles.navButton,
            dark && styles.navButtonDark,
            currentPage >= totalPages && styles.navButtonDisabled,
          ]}
          accessibilityLabel="Próxima página"
        >
          <ChevronRight
            size={18}
            color={
              currentPage >= totalPages
                ? dark
                  ? '#475569'
                  : '#cbd5e1'
                : dark
                ? '#cbd5e1'
                : '#334155'
            }
          />
        </TouchableOpacity>
      </View>
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
  containerDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  counterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textAlign: 'center',
  },
  counterTextDark: {
    color: '#94a3b8',
  },
  counterHighlight: {
    fontWeight: '900',
    color: '#0f172a',
  },
  counterHighlightDark: {
    color: '#f8fafc',
  },
  perPageText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
  perPageTextDark: {
    color: '#64748b',
  },
  navigationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flexWrap: 'nowrap',
    width: '100%',
    maxWidth: 340,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  navButtonDisabled: {
    opacity: 0.35,
    borderColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
  },
  pagesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    flexShrink: 1,
  },
  pageNumberButton: {
    minWidth: 34,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  pageNumberButtonDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  pageNumberButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#1d4ed8',
  },
  pageNumberText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  pageNumberTextDark: {
    color: '#cbd5e1',
  },
  pageNumberTextActive: {
    color: '#ffffff',
    fontWeight: '900',
  },
  ellipsisContainer: {
    paddingHorizontal: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ellipsisText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#94a3b8',
  },
  ellipsisTextDark: {
    color: '#64748b',
  },
});
