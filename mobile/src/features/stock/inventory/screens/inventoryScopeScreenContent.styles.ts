import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  syncStatus: { fontSize: 11, marginTop: 5 },
  closeBtn: { padding: 4 },
  errorBox: { borderWidth: 1, borderRadius: 16, padding: 20, alignItems: 'center', gap: 12 },
  retryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: { color: '#fff', fontWeight: '700' },
  productSearchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 0, borderBottomWidth: 1, borderRadius: 0, paddingHorizontal: 14, minHeight: 50 },
  productSearchInput: { flex: 1, paddingVertical: 12, fontSize: 15 },
  productCatalogLoading: { paddingVertical: 40, alignItems: 'center' },
  selectedProductCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 14 },
  selectedProductIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' },
  clearSelectedProductButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  productStepFooter: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1 },
  productBackButton: { minHeight: 48, flex: 1, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  productNextButton: { minHeight: 48, flex: 1.4, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7c3aed' },
  productNextButtonText: { color: '#ffffff', fontWeight: '800', fontSize: 15 },
});
