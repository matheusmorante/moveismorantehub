import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert, Platform } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { X } from 'lucide-react-native';
import { recognizeText } from 'expo-mlkit-ocr';
import { extractNfeAccessKey } from '../../invoices/utils/accessKey';

interface Props {
  isDarkMode: boolean;
  onScan: (data: string) => void | Promise<void | InventoryScanFeedback>;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  description?: string;
  accessKeyMode?: boolean;
  continuous?: boolean;
}

export interface InventoryScanFeedback {
  kind: 'success' | 'error' | 'warning';
  title: string;
  message?: string;
  sku?: string;
  supplier?: string;
  quantity?: number;
  itemId?: string;
}

export const InventoryScannerScreen: React.FC<Props> = ({
  isDarkMode,
  onScan,
  onClose,
  title = 'Scanear Produto',
  subtitle,
  description = 'Aponte a câmera para o QR Code ou Código de Barras do produto.',
  accessKeyMode = false,
  continuous = false,
}) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [isReadingText, setIsReadingText] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<InventoryScanFeedback | null>(null);
  const [unitsRead, setUnitsRead] = useState(0);
  const [productsRead, setProductsRead] = useState<Set<string>>(new Set());
  const [frameBorderState, setFrameBorderState] = useState<'idle' | 'success' | 'error' | 'warning'>('idle');
  const processingRef = useRef(false);
  const recentScanRef = useRef<{ data: string; at: number }>({ data: '', at: 0 });
  const cameraRef = useRef<CameraView>(null);
  const frameBorderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };
    void getCameraPermissions();
  }, []);

  const triggerFrameBorder = (kind: 'success' | 'error' | 'warning') => {
    if (frameBorderTimerRef.current) clearTimeout(frameBorderTimerRef.current);
    setFrameBorderState(kind);
    frameBorderTimerRef.current = setTimeout(() => {
      setFrameBorderState('idle');
    }, kind === 'success' ? 1500 : 1200);
  };

  const handleBarCodeScanned = async ({ data }: { type: string; data: string }) => {
    if (processingRef.current || (!continuous && scanned)) return;
    if (continuous && data === recentScanRef.current.data && Date.now() - recentScanRef.current.at < 1500) return;
    processingRef.current = true;
    setScanned(true);
    try {
      const result = await onScan(data);
      if (result) {
        setLastFeedback(result);
        if (result.kind === 'error') {
          triggerFrameBorder('error');
          setTimeout(() => setLastFeedback(current => current === result ? null : current), 1800);
        }
        if (result.kind === 'warning') {
          triggerFrameBorder('warning');
          setTimeout(() => setLastFeedback(current => current === result ? null : current), 1800);
        }
        if (result.kind === 'success') {
          triggerFrameBorder('success');
          setUnitsRead(count => count + 1);
          if (result.itemId) setProductsRead(previous => new Set(previous).add(result.itemId!));
        }
      }
    } catch (error) {
      console.error('[Scanner] Falha ao processar leitura:', error);
      triggerFrameBorder('error');
      setLastFeedback({ kind: 'error', title: 'Falha na leitura', message: 'Tente novamente.' });
    } finally {
      if (continuous) {
        recentScanRef.current = { data, at: Date.now() };
        processingRef.current = false;
        setScanned(false);
      }
    }
  };

  const handleReadText = async () => {
    if (!cameraRef.current || isReadingText) return;
    setIsReadingText(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 1, base64: Platform.OS === 'web' });
      if (!photo?.uri) throw new Error('A câmera não retornou a imagem.');
      let text: string;
      if (Platform.OS === 'web') {
        if (!photo.base64) throw new Error('A câmera não retornou a imagem para leitura.');
        const { createWorker, PSM } = await import('tesseract.js');
        const worker = await createWorker('eng');
        try {
          await worker.setParameters({ tessedit_char_whitelist: '0123456789', tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
          ({ data: { text } } = await worker.recognize(`data:image/jpeg;base64,${photo.base64}`));
        } finally {
          await worker.terminate();
        }
      } else {
        ({ text } = await recognizeText(photo.uri));
      }
      const key = extractNfeAccessKey(text);
      if (!key) {
        Alert.alert('Chave não reconhecida', 'Enquadre os 44 dígitos impressos e tente novamente.');
        return;
      }
      setScanned(true);
      onScan(key);
    } catch (error) {
      console.error('[Invoice access-key OCR]', error);
      Alert.alert('Falha na leitura', 'Não foi possível reconhecer o texto. Tente novamente ou digite a chave.');
    } finally {
      setIsReadingText(false);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={[styles.container, isDarkMode && styles.containerDark]}>
        <Text style={[styles.text, isDarkMode && styles.textDark]}>Solicitando permissão da câmera...</Text>
      </View>
    );
  }
  
  if (hasPermission === false) {
    return (
      <View style={[styles.container, isDarkMode && styles.containerDark]}>
        <Text style={[styles.text, isDarkMode && styles.textDark]}>Acesso à câmera negado.</Text>
        <TouchableOpacity style={styles.button} onPress={onClose}>
          <Text style={styles.buttonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        onBarcodeScanned={continuous ? handleBarCodeScanned : scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Overlay */}
      <View style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.iconButton} disabled={continuous && scanned}>
            <X size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.headerTitle}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.scannerArea}>
          <View
            style={[
              styles.scannerFrame,
              frameBorderState === 'success' && styles.scannerFrameSuccess,
              frameBorderState === 'error' && styles.scannerFrameError,
              frameBorderState === 'warning' && styles.scannerFrameWarning,
            ]}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{description}</Text>
          {continuous && (
            <>
              {lastFeedback && (
                <View style={[
                  styles.feedback,
                  lastFeedback.kind === 'error' ? styles.feedbackError
                  : lastFeedback.kind === 'warning' ? styles.feedbackWarning
                  : styles.feedbackSuccess,
                ]}>
                  <Text style={styles.feedbackTitle}>{lastFeedback.kind === 'success' ? 'ÚLTIMA LEITURA' : lastFeedback.title}</Text>
                  {lastFeedback.kind === 'success' && <Text style={styles.feedbackText}>{lastFeedback.title}</Text>}
                  {lastFeedback.sku && <Text style={styles.feedbackText}>SKU: {lastFeedback.sku}</Text>}
                  {lastFeedback.supplier && <Text style={styles.feedbackText}>Fornecedor: {lastFeedback.supplier}</Text>}
                  {lastFeedback.quantity !== undefined && <Text style={styles.feedbackText}>Quantidade contada: {lastFeedback.quantity}</Text>}
                  {lastFeedback.message && <Text style={styles.feedbackText}>{lastFeedback.message}</Text>}
                </View>
              )}
              <Text style={styles.sessionText}>{unitsRead} {unitsRead === 1 ? 'unidade lida' : 'unidades lidas'} · {productsRead.size} {productsRead.size === 1 ? 'produto' : 'produtos'}</Text>
              <TouchableOpacity style={styles.finishButton} onPress={onClose} disabled={scanned}>
                <Text style={styles.finishButtonText}>FINALIZAR LEITURA</Text>
              </TouchableOpacity>
            </>
          )}
          {accessKeyMode && (
            <TouchableOpacity style={styles.captureButton} onPress={handleReadText} disabled={isReadingText}>
              <Text style={styles.captureButtonText}>{isReadingText ? 'Lendo texto…' : 'Capturar chave impressa'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const { width } = Dimensions.get('window');
const frameSize = width * 0.7;

const styles = StyleSheet.create({
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
    ...StyleSheet.absoluteFill,
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
    paddingBottom: 48,
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
  finishButton: { backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 13, paddingHorizontal: 24, marginTop: 12, width: '100%', alignItems: 'center', transform: [{ translateY: -10 }] },
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
