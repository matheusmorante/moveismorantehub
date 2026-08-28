import React from 'react';
import { Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Download, Smartphone } from 'lucide-react-native';

export function MandatoryUpdateModal({ visible, url }: { visible: boolean; url: string }) {
  const openDownload = () => { void Linking.openURL(url); };
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
    <View style={styles.backdrop}><View style={styles.card}>
      <View style={styles.icon}><Smartphone size={30} color="#2563eb" /></View>
      <Text style={styles.title}>Atualize o aplicativo</Text>
      <Text style={styles.message}>Há uma nova versão obrigatória com melhorias e correções. Atualize para continuar usando o aplicativo.</Text>
      <TouchableOpacity style={styles.button} onPress={openDownload}><Download size={18} color="#fff" /><Text style={styles.buttonText}>ATUALIZAR AGORA</Text></TouchableOpacity>
    </View></View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(15,23,42,0.72)' },
  card: { alignItems: 'center', borderRadius: 28, padding: 28, backgroundColor: '#fff' },
  icon: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', borderRadius: 32, backgroundColor: '#eff6ff', marginBottom: 18 },
  title: { fontSize: 21, fontWeight: '900', color: '#0f172a' },
  message: { marginTop: 10, color: '#64748b', fontSize: 13, fontWeight: '600', lineHeight: 19, textAlign: 'center' },
  button: { width: '100%', height: 54, marginTop: 24, borderRadius: 16, backgroundColor: '#2563eb', flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 0.8 },
});
