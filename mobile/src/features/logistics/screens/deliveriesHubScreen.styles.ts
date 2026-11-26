import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  containerDark: {
    backgroundColor: '#0f172a',
  },
  headerContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerContainerDark: {
    backgroundColor: '#1e293b',
    borderBottomColor: '#334155',
  },
  titleRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 0,
  },
  dateScopeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 4,
    gap: 3,
  },
  dateScopeContainerDark: {
    backgroundColor: '#020617',
    borderColor: '#334155',
  },
  dateScopeBtn: {
    flex: 1,
    minWidth: 0,
    minHeight: 34,
    paddingHorizontal: 2,
    paddingVertical: 0,
    borderRadius: 11,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateScopeBtnActive: {
    backgroundColor: '#2563eb',
  },
  dateScopeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center',
    includeFontPadding: false,
  },
  dateScopeBtnTextDark: {
    color: '#cbd5e1',
  },
  dateScopeBtnTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  textLight: {
    color: '#f8fafc',
  },
  textMuted: {
    color: '#94a3b8',
  },
  tabsViewport: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
    minHeight: 60,
    marginTop: 8,
    padding: 4,
    borderRadius: 13,
    backgroundColor: '#f1f5f9',
  },
  tabsViewportDark: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  tabBtn: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 1,
    borderRadius: 10,
  },
  tabBtnDark: {
    backgroundColor: 'transparent',
  },
  tabBtnActive: {
    backgroundColor: '#dbeafe',
  },
  tabBtnActiveDark: {
    backgroundColor: '#0f172a',
  },
  tabBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    textAlign: 'center',
    includeFontPadding: false,
  },
  tabBtnTextDark: {
    color: '#cbd5e1',
  },
  tabBtnTextActive: {
    color: '#2563eb',
  },
  tabBtnTextActiveDark: { color: '#60a5fa' },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  floatingCardContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
});
