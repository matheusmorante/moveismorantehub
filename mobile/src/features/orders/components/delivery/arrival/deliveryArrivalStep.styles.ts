import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 16,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  unattendedButton: {
    alignSelf: 'center',
    width: '88%',
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 10,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  unattendedButtonDark: {
    backgroundColor: '#450a0a',
    borderColor: '#991b1b',
    shadowOpacity: 0.2,
  },
  unattendedButtonText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#dc2626',
    letterSpacing: 0.2,
  },
  unattendedButtonTextDark: {
    color: '#fca5a5',
  },
});
