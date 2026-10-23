import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  containerDark: {
    backgroundColor: '#0f172a',
  },
  menuContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  menuTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#0f172a',
  },
  menuSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginTop: -6,
    marginBottom: 4,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  menuCardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
  },
  iconBoxDark: {
    backgroundColor: 'rgba(30, 58, 138, 0.35)',
  },
  menuCardText: {
    flex: 1,
    gap: 3,
  },
  menuCardTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  menuCardDescription: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  moduleHeader: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  moduleHeaderDark: {
    backgroundColor: '#0f172a',
    borderBottomColor: '#1e293b',
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  backButtonDark: {
    backgroundColor: '#1e293b',
  },
  moduleTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
  },
  textLight: {
    color: '#f8fafc',
  },
  textMutedDark: {
    color: '#94a3b8',
  },
});
