import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  StatusBar,
  type LayoutRectangle,
} from 'react-native';
import { CameraView, Camera, type BarcodeScanningResult } from 'expo-camera';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { playInventoryCountSound } from '../../../../services/inventoryCountSound';
import {
  frameSize as defaultFrameSize,
  styles,
} from './inventory-scanner/inventoryScanner.styles';
import { recognizeAccessKeyFromCamera } from './inventory-scanner/inventoryScannerOcr';
import { InventoryScannerFeedbackView } from './inventory-scanner/InventoryScannerFeedbackView';
import {
  getScannerFrameRect,
  isBarcodeWithinScannerFrame,
} from './inventory-scanner/scannerFrameGeometry';

const RECENT_SCAN_WINDOW_MS = 1500;
const MAX_RECENT_FEEDBACKS = 2;

interface Props {
  isDarkMode: boolean;
  onScan: (data: string) => void | Promise<void | InventoryScanFeedback>;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  description?: string;
  accessKeyMode?: boolean;
  continuous?: boolean;
  restrictToScannerFrame?: boolean;
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
  restrictToScannerFrame = false,
}) => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0
  );
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [isReadingText, setIsReadingText] = useState(false);
  const [recentFeedbacks, setRecentFeedbacks] = useState<InventoryScanFeedback[]>([]);
  const [unitsRead, setUnitsRead] = useState(0);
  const [productsRead, setProductsRead] = useState<Set<string>>(new Set());
  const [frameBorderState, setFrameBorderState] = useState<
    'idle' | 'success' | 'error' | 'warning'
  >('idle');
  const [scannerAreaLayout, setScannerAreaLayout] = useState<LayoutRectangle | null>(null);
  const processingRef = useRef(false);
  const scanQueueRef = useRef<string[]>([]);
  const pendingScansRef = useRef(new Set<string>());
  const recentScansRef = useRef(new Map<string, number>());
  const cameraRef = useRef<CameraView>(null);
  const frameBorderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scannerFrame = scannerAreaLayout ? getScannerFrameRect(scannerAreaLayout) : null;
  const frameSize = accessKeyMode
    ? undefined
    : restrictToScannerFrame
      ? scannerFrame?.width
      : defaultFrameSize;

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
    frameBorderTimerRef.current = setTimeout(
      () => {
        setFrameBorderState('idle');
      },
      kind === 'success' ? 1500 : 1200
    );
  };

  const processScannedData = async (data: string) => {
    setScanned(true);
    try {
      const result = await onScan(data);
      if (result) {
        setRecentFeedbacks((current) => [result, ...current].slice(0, MAX_RECENT_FEEDBACKS));
        if (result.kind === 'error') {
          triggerFrameBorder('error');
          setTimeout(
            () =>
              setRecentFeedbacks((current) =>
                current.filter((feedback) => feedback !== result)
              ),
            1800
          );
        }
        if (result.kind === 'warning') {
          triggerFrameBorder('warning');
          setTimeout(
            () =>
              setRecentFeedbacks((current) =>
                current.filter((feedback) => feedback !== result)
              ),
            1800
          );
        }
        // Em inventários, uma leitura só é contagem confirmada quando o fluxo
        // retorna o item e a quantidade já persistida.
        if (
          result.kind === 'success' &&
          typeof result.quantity === 'number' &&
          Boolean(result.itemId)
        ) {
          triggerFrameBorder('success');
          setUnitsRead((count) => count + 1);
          if (result.itemId) setProductsRead((previous) => new Set(previous).add(result.itemId!));
          await playInventoryCountSound();
        }
      }
    } catch (error) {
      console.error('[Scanner] Falha ao processar leitura:', error);
      triggerFrameBorder('error');
      const feedback = {
        kind: 'error' as const,
        title: 'Falha na leitura',
        message: 'Tente novamente.',
      };
      setRecentFeedbacks((current) => [feedback, ...current].slice(0, MAX_RECENT_FEEDBACKS));
    } finally {
      if (continuous) {
        recentScansRef.current.set(data, Date.now());
        pendingScansRef.current.delete(data);
        const nextScan = scanQueueRef.current.shift();
        if (nextScan !== undefined) {
          void processScannedData(nextScan);
        } else {
          processingRef.current = false;
          setScanned(false);
        }
      }
    }
  };

  const handleBarCodeScanned = (result: BarcodeScanningResult) => {
    const { data } = result;
    if (
      restrictToScannerFrame &&
      (!scannerFrame || !isBarcodeWithinScannerFrame(result, scannerFrame))
    ) {
      return;
    }
    if (!continuous) {
      if (processingRef.current || scanned) return;
      processingRef.current = true;
      void processScannedData(data);
      return;
    }

    const now = Date.now();
    for (const [recentData, scannedAt] of recentScansRef.current) {
      if (now - scannedAt >= RECENT_SCAN_WINDOW_MS) recentScansRef.current.delete(recentData);
    }
    const recentScanAt = recentScansRef.current.get(data);
    if (
      pendingScansRef.current.has(data) ||
      (recentScanAt !== undefined && now - recentScanAt < RECENT_SCAN_WINDOW_MS)
    ) {
      return;
    }

    pendingScansRef.current.add(data);
    if (processingRef.current) {
      scanQueueRef.current.push(data);
      return;
    }

    processingRef.current = true;
    void processScannedData(data);
  };

  const handleReadText = async () => {
    if (!cameraRef.current || isReadingText) return;
    setIsReadingText(true);
    try {
      const key = await recognizeAccessKeyFromCamera(cameraRef.current);
      if (!key) {
        Alert.alert(
          'Chave não reconhecida',
          'Enquadre os 44 caracteres impressos da chave e tente novamente.'
        );
        return;
      }
      setScanned(true);
      onScan(key);
    } catch (error) {
      console.error('[Invoice access-key OCR]', error);
      Alert.alert(
        'Falha na leitura',
        'Não foi possível reconhecer o texto. Tente novamente ou digite a chave.'
      );
    } finally {
      setIsReadingText(false);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={[styles.container, isDarkMode && styles.containerDark]}>
        <Text style={[styles.text, isDarkMode && styles.textDark]}>
          Solicitando permissão da câmera...
        </Text>
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
        onBarcodeScanned={
          continuous ? handleBarCodeScanned : scanned ? undefined : handleBarCodeScanned
        }
        barcodeScannerSettings={{
          barcodeTypes: accessKeyMode ? ['code128'] : ['qr'],
        }}
        style={StyleSheet.absoluteFill}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {restrictToScannerFrame ? (
          <View style={[styles.header, { paddingTop: topInset + 8 }]}>
            <View style={styles.headerContent}>
              {title ? <Text style={styles.headerTitle}>{title}</Text> : null}
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.iconButton, styles.closeButton, { top: topInset + 8 }]}
              disabled={continuous && scanned}
              accessibilityRole="button"
              accessibilityLabel="Fechar scanner"
            >
              <X size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.legacyHeader}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.iconButton}
              disabled={continuous && scanned}
            >
              <X size={24} color="#ffffff" />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.headerTitle}>{title}</Text>
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
            <View style={{ width: 40 }} />
          </View>
        )}

        <View
          style={styles.scannerArea}
          onLayout={
            restrictToScannerFrame
              ? ({ nativeEvent }) => setScannerAreaLayout(nativeEvent.layout)
              : undefined
          }
        >
          <View
            style={[
              styles.scannerFrame,
              frameSize !== undefined && { width: frameSize, height: frameSize },
              accessKeyMode && styles.scannerFrameAccessKey,
              restrictToScannerFrame && styles.scannerFrameSquare,
              frameBorderState === 'success' && styles.scannerFrameSuccess,
              frameBorderState === 'error' && styles.scannerFrameError,
              frameBorderState === 'warning' && styles.scannerFrameWarning,
            ]}
          />
        </View>

        <View
          style={
            restrictToScannerFrame
              ? [styles.footer, { paddingBottom: bottomInset + 12 }]
              : styles.legacyFooter
          }
        >
          {continuous && (
            <InventoryScannerFeedbackView
              description={description}
              feedbacks={recentFeedbacks}
              unitsRead={unitsRead}
              productsReadCount={productsRead.size}
              scanned={scanned}
              onClose={onClose}
            />
          )}
          {!continuous && (
            <Text
              style={[styles.footerText, restrictToScannerFrame && styles.footerTextInventory]}
            >
              {description}
            </Text>
          )}
          {accessKeyMode && (
            <TouchableOpacity
              style={styles.captureButton}
              onPress={handleReadText}
              disabled={isReadingText}
              accessibilityRole="button"
              accessibilityLabel="Ler chave de acesso impressa"
            >
              <Text style={styles.captureButtonText}>
                {isReadingText ? 'Lendo chave…' : 'Ler chave impressa'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};
