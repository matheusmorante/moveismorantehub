import React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Download, Smartphone } from 'lucide-react-native';

type Props = {
  visible: boolean;
  required: boolean;
  version: string;
  buildNumber: number;
  releaseNotes: string | null;
  downloading: boolean;
  downloadProgress: number | null;
  error: string | null;
  onDownload: () => void;
  onDismiss: () => void;
};

export function MandatoryUpdateModal({
  visible,
  required,
  version,
  buildNumber,
  releaseNotes,
  downloading,
  downloadProgress,
  error,
  onDownload,
  onDismiss,
}: Props) {
  if (!visible) return null;

  return <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
    <View style={styles.backdrop}><View style={styles.card}>
      <View style={styles.icon}><Smartphone size={30} color="#2563eb" /></View>
      <Text style={styles.title}>{required ? 'Atualização obrigatória' : 'Nova versão disponível'}</Text>
      <Text style={styles.version}>Versão {version} · build {buildNumber}</Text>
      <Text style={styles.message}>
        {required
          ? 'Esta versão é necessária para continuar usando o aplicativo.'
          : 'Atualize o aplicativo para receber as melhorias e correções mais recentes.'}
      </Text>
      {releaseNotes ? <Text style={styles.notes}>{releaseNotes}</Text> : null}
      {downloading ? <View style={styles.progress}>
        <ActivityIndicator size="small" color="#2563eb" />
        <Text style={styles.progressText}>{downloadProgress === null ? 'Preparando download…' : `Baixando atualização… ${downloadProgress}%`}</Text>
      </View> : null}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <Pressable style={[styles.button, downloading && styles.disabled]} disabled={downloading} onPress={onDownload}>
        <Download size={18} color="#fff" />
        <Text style={styles.buttonText}>{downloading ? 'BAIXANDO…' : 'BAIXAR ATUALIZAÇÃO'}</Text>
      </Pressable>
      {!required ? <Pressable accessibilityRole="button" style={styles.laterButton} onPress={onDismiss}>
        <Text style={styles.laterText}>Agora não</Text>
      </Pressable> : null}
    </View></View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(15,23,42,0.72)' },
  card: { alignItems: 'center', borderRadius: 28, padding: 28, backgroundColor: '#fff' },
  icon: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', borderRadius: 32, backgroundColor: '#eff6ff', marginBottom: 18 },
  title: { fontSize: 21, fontWeight: '900', color: '#0f172a' },
  version: { marginTop: 7, color: '#2563eb', fontSize: 13, fontWeight: '800' },
  message: { marginTop: 10, color: '#64748b', fontSize: 13, fontWeight: '600', lineHeight: 19, textAlign: 'center' },
  notes: { width: '100%', marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: '#f8fafc', color: '#475569', fontSize: 12, lineHeight: 18 },
  progress: { width: '100%', marginTop: 18, flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center' },
  progressText: { color: '#334155', fontSize: 12, fontWeight: '700' },
  error: { marginTop: 12, color: '#b91c1c', fontSize: 12, lineHeight: 17, textAlign: 'center' },
  button: { width: '100%', minHeight: 54, marginTop: 24, borderRadius: 16, backgroundColor: '#2563eb', flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.65 },
  buttonText: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 0.8 },
  laterButton: { minHeight: 44, marginTop: 8, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  laterText: { color: '#475569', fontSize: 13, fontWeight: '700' },
});
