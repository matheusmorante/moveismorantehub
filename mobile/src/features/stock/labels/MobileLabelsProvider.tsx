import React, { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import type { MobileLabelRequest } from './labelNavigation';
import { LabelSurface } from './MobileLabelsSurface';

type LabelsContextValue = { openLabels: (request: MobileLabelRequest) => void };
const LabelsContext = createContext<LabelsContextValue>({ openLabels: () => {} });

export function useMobileLabels() {
  return useContext(LabelsContext);
}

export function MobileLabelsProvider({ children, isDarkMode }: { children: ReactNode; isDarkMode: boolean }) {
  const [request, setRequest] = useState<MobileLabelRequest | null>(null);
  const pendingOpen = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openLabels = useCallback((next: MobileLabelRequest) => {
    if (pendingOpen.current) clearTimeout(pendingOpen.current);
    // No iOS, aguarda o fechamento do menu de ações antes de apresentar outro modal.
    if (Platform.OS === 'ios') {
      pendingOpen.current = setTimeout(() => { pendingOpen.current = null; setRequest(next); }, 350);
    } else setRequest(next);
  }, []);
  const close = useCallback(() => {
    if (pendingOpen.current) clearTimeout(pendingOpen.current);
    pendingOpen.current = null;
    setRequest(null);
  }, []);
  useEffect(() => () => { if (pendingOpen.current) clearTimeout(pendingOpen.current); }, []);
  return (
    <LabelsContext.Provider value={{ openLabels }}>
      {children}
      <Modal visible={request !== null} animationType="slide" onRequestClose={close}>
        <View style={[styles.container, isDarkMode && styles.dark]}>
          <View style={[styles.header, isDarkMode && styles.headerDark]}>
            <TouchableOpacity onPress={close} style={styles.back} accessibilityRole="button" accessibilityLabel="Voltar">
              <ArrowLeft size={20} color={isDarkMode ? '#f8fafc' : '#334155'} />
            </TouchableOpacity>
            <Text style={[styles.title, isDarkMode && styles.light]}>
              {request?.category === 'precos' ? 'Etiquetas de preço' : 'Etiquetas de identificação'}
            </Text>
          </View>
          {request && <LabelSurface request={request} />}
        </View>
      </Modal>
    </LabelsContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  dark: { backgroundColor: '#0f172a' },
  header: { minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerDark: { backgroundColor: '#0f172a', borderBottomColor: '#334155' },
  back: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#f1f5f9' },
  title: { flex: 1, fontSize: 17, fontWeight: '900', color: '#0f172a' },
  light: { color: '#f8fafc' },
});
