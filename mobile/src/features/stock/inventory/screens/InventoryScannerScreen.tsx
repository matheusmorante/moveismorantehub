import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert, Platform } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { X } from 'lucide-react-native';
import { recognizeText } from 'expo-mlkit-ocr';

interface Props {
  isDarkMode: boolean;
  onScan: (data: string) => void;
  onClose: () => void;
  title?: string;
  description?: string;
  accessKeyMode?: boolean;
}

export const InventoryScannerScreen: React.FC<Props> = ({
  isDarkMode,
  onScan,
  onClose,
  title = 'Scanear Produto',
  description = 'Aponte a câmera para o QR Code ou Código de Barras do produto.',
  accessKeyMode = false,
}) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [isReadingText, setIsReadingText] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };
    void getCameraPermissions();
  }, []);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);
    onScan(data);
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
      const digits = text.replace(/\D/g, '');
      const key = digits.length === 44 ? digits : text.match(/(?:^|\D)(\d{44})(?:\D|$)/)?.[1];
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
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr", "ean13", "ean8", "code128", "code39", "upc_e", "upc_a"],
        }}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Overlay */}
      <View style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.iconButton}>
            <X size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.scannerArea}>
          <View style={styles.scannerFrame} />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{description}</Text>
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
  captureButton: {
    marginTop: 16,
    backgroundColor: '#2563eb',
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  captureButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
