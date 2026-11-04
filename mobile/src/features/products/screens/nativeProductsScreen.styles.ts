import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  dark: { backgroundColor: '#0f172a' },
  content: { paddingHorizontal: 16, paddingBottom: 36, gap: 10 },
  loadingContent: {
    minHeight: 240,
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loading: { fontSize: 12, fontWeight: '700', color: '#64748b', marginTop: 10 },
  editLoadingOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(248,250,252,0.9)',
  },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14, fontWeight: '800', color: '#64748b', marginTop: 12 },
  emptyHint: { fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 6, paddingHorizontal: 24 },
  emptyHintDark: { color: '#94a3b8' },
  retryButton: {
    marginTop: 12,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#2563eb',
  },
  retryButtonText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
