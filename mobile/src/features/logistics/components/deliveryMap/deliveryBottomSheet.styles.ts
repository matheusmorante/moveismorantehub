import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  sheetCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    maxHeight: '82%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 16,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
  },
  sheetCardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeProgress: {
    backgroundColor: '#eff6ff',
  },
  badgeNext: {
    backgroundColor: '#f0fdf4',
  },
  orderBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  badgeTextProgress: {
    color: '#2563eb',
  },
  badgeTextNext: {
    color: '#16a34a',
  },
  orderNumber: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnDark: {
    backgroundColor: '#334155',
  },
  contentScroll: {
    maxHeight: 220,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 4,
    flexShrink: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 8,
  },
  addressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    flex: 1,
    lineHeight: 16,
    flexShrink: 1,
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pillDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  pillPeriod: {
    backgroundColor: '#eff6ff',
    borderColor: '#dbeafe',
  },
  pillFixed: {
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
  },
  pillDistance: {
    backgroundColor: '#eff6ff',
    borderColor: '#dbeafe',
  },
  pillDistanceDark: {
    backgroundColor: '#1e293b',
    borderColor: '#3b82f6',
  },
  pillDuration: {
    backgroundColor: '#f0f9ff',
    borderColor: '#e0f2fe',
  },
  pillDurationDark: {
    backgroundColor: '#0c4a6e30',
    borderColor: '#0284c7',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  obsBox: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    padding: 10,
    borderRadius: 14,
    marginBottom: 8,
  },
  obsBoxDark: {
    backgroundColor: '#450a0a',
    borderColor: '#7f1d1d',
  },
  obsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  obsTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#dc2626',
    letterSpacing: 0.5,
  },
  obsTitleDark: {
    color: '#f87171',
  },
  obsTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  obsTag: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    maxWidth: '100%',
  },
  obsTagDark: {
    backgroundColor: '#7f1d1d',
    borderColor: '#991b1b',
  },
  obsTagText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#b91c1c',
    lineHeight: 16,
    flexShrink: 1,
  },
  obsTagTextDark: {
    color: '#fef2f2',
  },
  footerActions: {
    flexDirection: 'column',
    gap: 8,
    marginTop: 12,
  },
  secondaryActionBtn: {
    width: '100%',
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  secondaryActionBtnDark: {
    backgroundColor: '#1e3a5f',
    borderColor: '#2563eb',
  },
  secondaryActionText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '800',
  },
  secondaryActionTextDark: {
    color: '#93c5fd',
  },
  deliveryFlowActionBtn: {
    width: '100%',
    height: 44,
    borderRadius: 12,
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deliveryFlowActionBtnDark: {
    backgroundColor: '#059669',
  },
  deliveryFlowActionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  textLight: {
    color: '#f8fafc',
  },
  textMuted: {
    color: '#94a3b8',
  },
});
