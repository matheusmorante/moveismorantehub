import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  containerDark: { backgroundColor: '#0f172a' },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 40 },
  cardHeader: { alignItems: 'center', marginBottom: 36 },
  logoCircle: {
    width: 68, height: 68, borderRadius: 34, backgroundColor: '#2563eb', alignItems: 'center',
    justifyContent: 'center', marginBottom: 20, shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  title: { fontSize: 24, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  textLight: { color: '#f8fafc' },
  subtitle: { fontSize: 13, fontWeight: '600', color: '#64748b', marginTop: 6 },
  errorAlert: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef2f2', borderWidth: 1,
    borderColor: '#fca5a5', padding: 14, borderRadius: 16, marginBottom: 24,
  },
  errorText: { fontSize: 12, fontWeight: '700', color: '#ef4444', flex: 1 },
  form: { gap: 20 },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff',
    borderWidth: 1.5, borderColor: '#e2e8f0', height: 56, borderRadius: 20, position: 'relative',
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 1,
  },
  googleBtnDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  googleIconWrapper: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center',
    justifyContent: 'center', position: 'absolute', left: 20,
  },
  googleBtnText: { fontSize: 12, fontWeight: '900', color: '#475569', letterSpacing: 1.2 },
  googleBtnTextDark: { color: '#f8fafc' },
});
