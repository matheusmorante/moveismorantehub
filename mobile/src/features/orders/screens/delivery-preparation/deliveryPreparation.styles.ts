import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  dark: {
    backgroundColor: '#0f172a',
  },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 36,
  },
  arrivalContent: {
    flexGrow: 1,
  },
  gpsWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  gpsWarningDark: {
    backgroundColor: '#422006',
    borderColor: '#92400e',
  },
  gpsWarningText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#78350f',
  },
  gpsWarningTextDark: {
    color: '#fde68a',
  },
  gpsWarningAction: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  gpsWarningActionText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#2563eb',
  },
});
