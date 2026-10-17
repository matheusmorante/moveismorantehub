import { Platform, StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  modalContentDark: {
    backgroundColor: '#1e293b',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalHeaderDark: {
    borderBottomColor: '#334155',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalTitleDark: {
    color: '#f8fafc',
  },
  formScroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  requiredMark: {
    color: '#dc2626',
  },
  labelDark: {
    color: '#cbd5e1',
  },
  textLight: {
    color: '#e2e8f0',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: '#0f172a',
  },
  inputDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
    color: '#f8fafc',
  },
  inputDisabled: {
    backgroundColor: '#f1f5f9',
    color: '#94a3b8',
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 10,
    gap: 8,
  },
  searchBoxDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 14,
    color: '#0f172a',
  },
  searchInputDark: {
    color: '#f8fafc',
  },
  suggestionsList: {
    marginTop: 4,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    maxHeight: 180,
  },
  suggestionsListDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  suggestionItemDark: {
    borderBottomColor: '#1e293b',
  },
  suggestionName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  suggestionDetails: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    padding: 10,
  },
  selectedCardDark: {
    backgroundColor: '#064e3b22',
    borderColor: '#065f46',
  },
  selectedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
  },
  selectedTitleDark: {
    color: '#4ade80',
  },
  selectedSku: {
    fontSize: 11,
    color: '#15803d',
    marginTop: 2,
  },
  clearSelectedBtn: {
    padding: 6,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  wrapPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  pillDark: {
    backgroundColor: '#0f172a',
  },
  pillActive: {
    backgroundColor: '#dc2626',
  },
  pillDisabled: {
    opacity: 0.6,
  },
  pillText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  pillTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  disabledGroup: {
    opacity: 0.55,
  },
  emptySupplierText: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  modalFooterDark: {
    borderTopColor: '#334155',
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  cancelBtnText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dc2626',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '700',
  },
});
