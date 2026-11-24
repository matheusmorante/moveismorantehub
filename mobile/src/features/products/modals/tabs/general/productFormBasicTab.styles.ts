import { Platform, StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  field: {
    gap: 6,
  },
  categorySuggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  categorySuggestionLabel: {
    width: '100%',
    fontSize: 12,
    color: '#64748b',
  },
  categorySuggestionButton: {
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  darkCategorySuggestionButton: {
    borderColor: '#1d4ed8',
  },
  categorySuggestionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1d4ed8',
  },
  darkCategorySuggestionText: {
    color: '#93c5fd',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectedCategoryCount: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563eb',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  manageCategoriesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 3,
    paddingVertical: 2,
  },
  manageCategoriesText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.3,
    color: '#64748b',
  },
  label: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  lightLabel: {
    color: '#94a3b8',
  },
  errorLabel: {
    color: '#ef4444',
  },
  required: {
    color: '#ef4444',
  },
  catalogBadge: {
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  catalogBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#9333ea',
    letterSpacing: 0.5,
  },
  diferenciarBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  lightDiferenciarBtn: {
    backgroundColor: '#f1f5f9',
  },
  darkDiferenciarBtn: {
    backgroundColor: '#1e293b',
  },
  diferenciarBtnActive: {
    backgroundColor: '#f3e8ff',
  },
  diferenciarBtnText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  diferenciarBtnTextActive: {
    color: '#7e22ce',
  },
  dimText: {
    color: '#64748b',
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  darkInput: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  lightText: {
    color: '#f8fafc',
  },
  errorInput: {
    borderColor: '#ef4444',
    color: '#ef4444',
  },
  slugBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 4,
  },
  darkSlugBox: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  slugPrefix: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94a3b8',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  slugText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    flex: 1,
  },
  selectBox: {
    height: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
  },
  selectBoxText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  textarea: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  originRow: {
    flexDirection: 'row',
    gap: 8,
  },
  originBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  originBtnActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  originBtnActiveSalvado: {
    backgroundColor: '#fff7ed',
    borderColor: '#f97316',
  },
  originBtnActiveUsado: {
    backgroundColor: '#faf5ff',
    borderColor: '#a855f7',
  },
  originBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  originBtnTextActive: {
    color: '#1d4ed8',
  },
  originBtnTextActiveSalvado: {
    color: '#ea580c',
  },
  originBtnTextActiveUsado: {
    color: '#9333ea',
  },
  salvadoWarning: {
    fontSize: 11,
    color: '#ea580c',
    marginTop: 4,
    fontWeight: '600',
  },
});
