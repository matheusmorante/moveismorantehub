import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    paddingTop: 6,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    elevation: 8,
  },
  bottomNavDark: {
    backgroundColor: '#0f172a',
    borderTopColor: '#1e293b',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  agentAvatarFrame: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: '#2563eb',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 17,
  },
  agentAvatarPrimaryFrame: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2.5,
    borderColor: '#2563eb',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentAvatarPrimary: {
    width: '100%',
    height: '100%',
    borderRadius: 19,
  },
  agentPrimaryContent: {
    alignItems: 'center',
    gap: 1,
  },
  agentBetaLabel: {
    fontSize: 8,
    lineHeight: 9,
    fontWeight: '900',
    letterSpacing: 0.4,
    color: '#eab308',
  },
  agentBetaBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  agentBetaBadgeText: {
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '900',
    color: '#92400e',
  },
  sheetItemTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  disabledItem: {
    opacity: 0.45,
  },
  navItemActive: {},
  navText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
  },
  navTextActive: {
    color: '#2563eb',
    fontWeight: '900',
  },
  navTextAgentActive: {
    color: '#7c3aed',
    fontWeight: '900',
  },
  navTextAgentInactive: {
    color: '#8b5cf6',
    fontWeight: '800',
  },

  /* Estilos do Bottom Sheet */
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 20,
  },
  sheetContentDark: {
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  sheetHandleWrapper: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
  },
  sheetHandleDark: {
    backgroundColor: '#334155',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  sheetSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },
  sheetSubtitleDark: {
    color: '#94a3b8',
  },
  sheetTextDark: {
    color: '#f8fafc',
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonDark: {
    backgroundColor: '#1e293b',
  },
  sheetScroll: {
    flexGrow: 0,
  },
  sheetItemsContainer: {
    gap: 10,
    paddingVertical: 4,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sheetItemDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  sheetItemActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  sheetItemActiveDark: {
    backgroundColor: '#1e3a8a30',
    borderColor: '#1e40af',
  },
  sheetIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetIconWrapperLight: {
    backgroundColor: '#e2e8f0',
  },
  sheetIconWrapperDark: {
    backgroundColor: '#334155',
  },
  sheetIconWrapperActive: {
    backgroundColor: '#dbeafe',
  },
  sheetItemLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  sheetItemLabelActive: {
    color: '#2563eb',
    fontWeight: '900',
  },
});
