import { Dimensions, StyleSheet } from 'react-native';

const { width } = Dimensions.get('window');
export const frameSize = width * 0.7;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  containerDark: {
    backgroundColor: '#0f172a',
  },
  text: {
    textAlign: 'center',
    color: '#0f172a',
    fontSize: 16,
  },
  textDark: {
    color: '#f8fafc',
  },
  button: {
    marginTop: 16,
    alignSelf: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 48,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: { color: '#cbd5e1', fontSize: 12, marginTop: 2, textAlign: 'center' },
  scannerArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerFrame: {
    width: frameSize,
    height: frameSize,
    borderWidth: 2,
    borderColor: '#ffffff',
    borderRadius: 16,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  scannerFrameSuccess: {
    borderColor: '#22c55e',
    borderWidth: 3,
    shadowColor: '#22c55e',
    shadowOpacity: 0.6,
  },
  scannerFrameError: {
    borderColor: '#f87171',
    borderWidth: 3,
    shadowColor: '#f87171',
    shadowOpacity: 0.5,
  },
  scannerFrameWarning: {
    borderColor: '#facc15',
    borderWidth: 3,
    shadowColor: '#facc15',
    shadowOpacity: 0.5,
  },
  footer: {
    padding: 24,
    paddingBottom: 80,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
  },
  footerText: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
  },
  feedback: { width: '100%', borderRadius: 12, padding: 12, marginTop: 14 },
  feedbackError: { backgroundColor: '#7f1d1d' },
  feedbackWarning: { backgroundColor: '#78350f' },
  feedbackSuccess: { backgroundColor: '#064e3b' },
  feedbackTitle: { color: '#fff', fontSize: 11, fontWeight: '800' },
  feedbackText: { color: '#fff', fontSize: 13, marginTop: 3 },
  sessionText: { color: '#fff', fontSize: 12, marginTop: 12, fontWeight: '700' },
  finishButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 24,
    marginTop: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  finishButtonText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  captureButton: {
    marginTop: 16,
    backgroundColor: '#2563eb',
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  captureButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
