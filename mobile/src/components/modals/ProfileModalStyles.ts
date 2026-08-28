import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  profileModalContent: { backgroundColor: '#ffffff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 0, maxHeight: '88%', overflow: 'hidden' },
  profileScrollContent: { flexGrow: 1 },
  modalContentDark: { backgroundColor: '#0f172a' },
  profileModalTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  profileModalTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  textPrimaryDark: { color: '#f8fafc' },
  closeModalButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  iconButtonDark: { backgroundColor: '#1e293b' },
  profileUserCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, backgroundColor: '#f8fafc', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 20 },
  profileUserCardDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  profileBigAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  profileBigAvatarText: { fontSize: 22, fontWeight: '900', color: '#ffffff' },
  profileUserName: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  profileUserEmail: { fontSize: 12, fontWeight: '600', color: '#64748b', marginTop: 2 },
  roleBadgeContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  roleBadgeText: { fontSize: 11, fontWeight: '800', color: '#10b981' },
  profileMenuItems: { gap: 12 },
  profileMenuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 18, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9' },
  profileMenuItemDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  profileLogoutItem: { backgroundColor: '#fef2f2', borderColor: '#fee2e2' },
  profileMenuIconWrapper: { width: 38, height: 38, borderRadius: 14, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  profileMenuLabel: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  profileMenuSubtext: { fontSize: 11, fontWeight: '600', color: '#64748b', marginTop: 2 },
  versionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbeafe'
  },
  versionBadgeDark: {
    backgroundColor: '#1e3a8a30',
    borderColor: '#1e40af'
  },
  versionBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#2563eb',
    letterSpacing: 0.5
  }
});
