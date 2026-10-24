import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { Minus, Plus, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Image as SvgImage, Rect } from 'react-native-svg';
import { flattenFormErrors, useZodForm } from '../../../../hooks/useZodForm';
import {
  createCenteredMobileSquareSelection,
  getPaddedImageRect,
  mapMobileSquareSelectionToRasterCrop,
  moveMobileSquareSelection,
  resizeMobileSquareSelection,
  type MobileCropRect,
  type MobileSquareSelection,
} from '../../domain/mobileProductImageCrop';
import { uploadMobileProductPhoto } from '../../services/mobileProductPhotoService';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
import { squareImageCropFormSchema } from '../../../../../../shared-utils/fileFormSchemas';
import {
  mobileProductPhotoUploadFormSchema,
  productImageReplacementFormSchema,
} from '../../../../../../shared-utils/productImageFormSchemas';

interface Props {
  visible: boolean;
  imageUrl: string;
  dark: boolean;
  onCancel: () => void;
  onConfirm: (newUrl: string) => void | Promise<void>;
}

interface PreparedImage {
  uri: string;
  cleanup?: () => void | Promise<void>;
}

const getImageFetchCandidates = (url: string) => [
  url,
  `https://images.weserv.nl/?url=${encodeURIComponent(url)}`,
  `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

async function prepareImageSource(url: string): Promise<PreparedImage> {
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('file://')) {
    return { uri: url };
  }

  if (Platform.OS === 'web') {
    for (const candidate of getImageFetchCandidates(url)) {
      try {
        const response = await withTimeout(fetch(candidate), 12_000, null, 'Carregar foto para recorte');
        if (!response?.ok) continue;
        const blob = await withTimeout(response.blob(), 12_000, null, 'Preparar foto para recorte');
        if (!blob || blob.size === 0) continue;
        const objectUrl = URL.createObjectURL(blob);
        return { uri: objectUrl, cleanup: () => URL.revokeObjectURL(objectUrl) };
      } catch {
        // URLs públicas alternativas permitem contornar CORS do armazenamento original.
      }
    }
    throw new Error('Não foi possível carregar a foto para recorte. Verifique sua conexão e tente novamente.');
  }

  const cacheDirectory = FileSystem.cacheDirectory;
  if (!cacheDirectory) throw new Error('O armazenamento temporário do dispositivo não está disponível.');
  const fileUri = `${cacheDirectory}produto-recorte-${Date.now()}.image`;
  const downloaded = await withTimeout(
    FileSystem.downloadAsync(url, fileUri),
    20_000,
    null,
    'Baixar foto para recorte'
  );
  if (!downloaded?.uri) throw new Error('O download da foto demorou demais. Tente novamente.');
  return {
    uri: downloaded.uri,
    cleanup: () => FileSystem.deleteAsync(downloaded.uri, { idempotent: true }),
  };
}

function readImageDimensions(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

export const ProductSquareImageCropModal: React.FC<Props> = ({
  visible,
  imageUrl,
  dark,
  onCancel,
  onConfirm,
}) => {
  const insets = useSafeAreaInsets();
  const [sourceUri, setSourceUri] = useState('');
  const [sourceDimensions, setSourceDimensions] = useState({ width: 0, height: 0 });
  const [frame, setFrame] = useState({ width: 0, height: 0 });
  const [selection, setSelection] = useState<MobileSquareSelection | null>(null);
  const [paddingPercent, setPaddingPercent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [rendererReady, setRendererReady] = useState(false);
  const [applying, setApplying] = useState(false);
  const [loadError, setLoadError] = useState('');
  const rendererRef = useRef<Svg>(null);
  const selectionRef = useRef<MobileSquareSelection | null>(null);
  const dragOriginRef = useRef<MobileSquareSelection | null>(null);
  const sourceCleanupRef = useRef<PreparedImage['cleanup']>(undefined);

  const cropForm = useZodForm(squareImageCropFormSchema, {
    image: imageUrl,
    paddingPercent,
    displayWidth: 0,
    displayHeight: 0,
    sourceWidth: 0,
    sourceHeight: 0,
    selection: { x: 0, y: 0, size: 0 },
  });
  const uploadForm = useZodForm(mobileProductPhotoUploadFormSchema, { photos: [] });
  const replacementForm = useZodForm(productImageReplacementFormSchema, { oldUrl: '', newUrl: '' });

  const stageRect = useMemo<MobileCropRect>(
    () => ({ x: 0, y: 0, width: frame.width, height: frame.height }),
    [frame.width, frame.height]
  );
  const imageRect = useMemo<MobileCropRect>(
    () => getPaddedImageRect(frame.width, frame.height, sourceDimensions.width, sourceDimensions.height, paddingPercent),
    [frame.width, frame.height, sourceDimensions.width, sourceDimensions.height, paddingPercent]
  );

  useEffect(() => {
    if (!visible) return;
    let active = true;
    setLoading(true);
    setLoadError('');
    setSourceUri('');
    setSourceDimensions({ width: 0, height: 0 });
    setSelection(null);
    setPaddingPercent(0);
    setRendererReady(false);
    selectionRef.current = null;
    setFrame({ width: 0, height: 0 });

    void (async () => {
      let prepared: PreparedImage | null = null;
      try {
        prepared = await prepareImageSource(imageUrl);
        if (!active) {
          await prepared.cleanup?.();
          return;
        }
        sourceCleanupRef.current = prepared.cleanup;
        setSourceUri(prepared.uri);
        const dimensions = await withTimeout(
          readImageDimensions(prepared.uri),
          12_000,
          null,
          'Ler dimensões da foto'
        );
        if (!dimensions?.width || !dimensions.height) {
          throw new Error('Não foi possível ler as dimensões desta foto.');
        }
        if (active) setSourceDimensions(dimensions);
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : 'Não foi possível abrir a foto.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
      const cleanup = sourceCleanupRef.current;
      sourceCleanupRef.current = undefined;
      void Promise.resolve(cleanup?.()).catch(() => undefined);
    };
  }, [imageUrl, visible]);

  useEffect(() => {
    if (!stageRect.width || !stageRect.height) return;
    const centered = createCenteredMobileSquareSelection(stageRect);
    selectionRef.current = centered;
    setSelection(centered);
  }, [stageRect.width, stageRect.height, paddingPercent]);

  useEffect(() => {
    if (!visible || loading || !sourceUri || !sourceDimensions.width || rendererReady || loadError) return;
    const timeout = setTimeout(() => {
      setLoadError('Não foi possível renderizar a foto para o recorte. Tente abrir a imagem novamente.');
    }, 12_000);
    return () => clearTimeout(timeout);
  }, [visible, loading, sourceUri, sourceDimensions.width, rendererReady, loadError]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => Boolean(selectionRef.current),
        onMoveShouldSetPanResponder: (_, gesture) =>
          Boolean(selectionRef.current && (Math.abs(gesture.dx) > 2 || Math.abs(gesture.dy) > 2)),
        onPanResponderGrant: () => {
          dragOriginRef.current = selectionRef.current;
        },
        onPanResponderMove: (_, gesture) => {
          const origin = dragOriginRef.current;
          if (!origin || applying) return;
          const next = moveMobileSquareSelection(origin, gesture.dx, gesture.dy, stageRect);
          selectionRef.current = next;
          setSelection(next);
        },
        onPanResponderRelease: () => {
          dragOriginRef.current = null;
        },
        onPanResponderTerminate: () => {
          dragOriginRef.current = null;
        },
      }),
    [applying, stageRect.x, stageRect.y, stageRect.width, stageRect.height]
  );

  const changeSelectionSize = (delta: number) => {
    const current = selectionRef.current;
    if (!current || applying) return;
    const next = resizeMobileSquareSelection(current, delta, stageRect);
    selectionRef.current = next;
    setSelection(next);
  };

  const changePaddingPercent = (delta: number) => {
    setPaddingPercent((current) => Math.max(0, Math.min(35, current + delta)));
  };

  const resetSelection = () => {
    if (!stageRect.width || !stageRect.height || applying) return;
    const centered = createCenteredMobileSquareSelection(stageRect);
    selectionRef.current = centered;
    setSelection(centered);
  };

  const close = () => {
    if (applying) return;
    onCancel();
  };

  const showValidationError = (errors: unknown) => {
    const messages = flattenFormErrors(errors as never);
    Alert.alert('Recorte inválido', Object.values(messages)[0] || 'Revise a área selecionada.');
  };

  const applyCrop = async () => {
    if (!sourceUri || !selection || !rendererReady || applying || loadError) return;
    setApplying(true);
    try {
      const cropResult = await cropForm.validateAndRun(
        {
          image: sourceUri,
          paddingPercent,
          displayWidth: frame.width,
          displayHeight: frame.height,
          sourceWidth: sourceDimensions.width,
          sourceHeight: sourceDimensions.height,
          selection,
        },
        async (values) => {
          const renderer = rendererRef.current;
          if (!renderer) throw new Error('A prévia do recorte ainda não está pronta.');
          const capturedImage = await withTimeout(
            new Promise<string>((resolve, reject) => {
              renderer.toDataURL((base64) => {
                if (!base64) {
                  reject(new Error('Não foi possível gerar o palco do recorte.'));
                  return;
                }
                resolve(`data:image/png;base64,${base64.replace(/\s/g, '')}`);
              });
            }),
            15_000,
            null,
            'Gerar palco do recorte'
          );
          if (!capturedImage) throw new Error('A geração do palco do recorte demorou demais. Tente novamente.');
          const capturedDimensions = await withTimeout(
            readImageDimensions(capturedImage),
            12_000,
            null,
            'Ler dimensões do palco'
          );
          if (!capturedDimensions?.width || !capturedDimensions.height) {
            throw new Error('Não foi possível ler a imagem preparada para o recorte.');
          }
          const crop = mapMobileSquareSelectionToRasterCrop(
            values.selection,
            { x: 0, y: 0, width: values.displayWidth, height: values.displayHeight },
            capturedDimensions.width,
            capturedDimensions.height
          );
          const rendered = await withTimeout(
            ImageManipulator.manipulate(capturedImage)
              .crop({ originX: crop.x, originY: crop.y, width: crop.width, height: crop.height })
              .resize({ width: 1080, height: 1080 })
              .renderAsync(),
            20_000,
            null,
            'Preparar imagem quadrada'
          );
          if (!rendered) throw new Error('A preparação da imagem demorou demais. Tente novamente.');
          if (rendered.width !== 1080 || rendered.height !== 1080) {
            throw new Error('A imagem preparada não ficou no formato quadrado esperado.');
          }
          let file: Blob | null = null;
          for (const compress of [0.95, 0.85, 0.75, 0.65, 0.55]) {
            const result = await withTimeout(
              rendered.saveAsync({ format: SaveFormat.WEBP, compress }),
              15_000,
              null,
              'Salvar foto recortada'
            );
            if (!result?.uri) throw new Error('Não foi possível salvar a foto recortada.');
            try {
              const response = await withTimeout(fetch(result.uri), 12_000, null, 'Ler foto recortada');
              if (!response?.ok) throw new Error('Não foi possível preparar a foto recortada para envio.');
              file = await withTimeout(response.blob(), 12_000, null, 'Preparar foto recortada');
              if (!file || file.size === 0) throw new Error('A foto recortada ficou vazia. Tente novamente.');
            } finally {
              await FileSystem.deleteAsync(result.uri, { idempotent: true }).catch(() => undefined);
            }
            if (file.size <= 0.3 * 1024 * 1024) break;
          }
          if (!file) throw new Error('Não foi possível preparar a foto recortada para envio.');

          const uploadedUrl = await uploadForm.validateAndRun(
            {
              photos: [{ file, name: `produto-recortado-${Date.now()}.webp`, contentType: 'image/webp' }],
            },
            async ({ photos }) => {
              const photo = photos[0];
              return uploadMobileProductPhoto(photo.file, photo.name, photo.contentType);
            },
            showValidationError
          );
          if (uploadedUrl === false) return false;

          const validUrl = await replacementForm.validateAndRun(
            { oldUrl: imageUrl, newUrl: uploadedUrl },
            ({ newUrl }) => newUrl,
            showValidationError
          );
          if (validUrl === false) return false;
          await onConfirm(validUrl);
          return true;
        },
        showValidationError
      );
      if (cropResult) onCancel();
    } catch (error) {
      Alert.alert('Erro ao recortar foto', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View
        style={[
          styles.overlay,
          { paddingTop: Math.max(insets.top, 24), paddingBottom: Math.max(insets.bottom, 24) },
        ]}
      >
        <View style={[styles.card, dark && styles.darkCard]}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={[styles.title, dark && styles.lightText]}>Recortar foto (1:1)</Text>
              <Text style={[styles.helper, dark && styles.dimText]}>
                Arraste o quadrado e ajuste o tamanho antes de salvar.
              </Text>
            </View>
            <TouchableOpacity
              onPress={close}
              disabled={applying}
              accessibilityRole="button"
              accessibilityLabel="Fechar recorte"
              style={styles.closeButton}
            >
              <X size={20} color={dark ? '#cbd5e1' : '#475569'} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#2563eb" />
              <Text style={[styles.helper, dark && styles.dimText]}>Carregando foto…</Text>
            </View>
          ) : loadError ? (
            <View style={styles.loadingBox}>
              <Text style={[styles.errorText, dark && styles.errorTextDark]}>{loadError}</Text>
            </View>
          ) : (
            <>
              <View
                onLayout={(event) =>
                  setFrame({
                    width: event.nativeEvent.layout.width,
                    height: event.nativeEvent.layout.height,
                  })
                }
                style={styles.preview}
              >
                {sourceUri && imageRect.width > 0 && imageRect.height > 0 ? (
                  <Svg
                    ref={rendererRef}
                    width={frame.width}
                    height={frame.height}
                    viewBox={`0 0 ${frame.width} ${frame.height}`}
                    style={styles.stage}
                  >
                    <Rect x={0} y={0} width={frame.width} height={frame.height} fill="#ffffff" />
                    <SvgImage
                      href={sourceUri}
                      x={imageRect.x}
                      y={imageRect.y}
                      width={imageRect.width}
                      height={imageRect.height}
                      preserveAspectRatio="xMidYMid meet"
                      onLoad={() => setRendererReady(true)}
                    />
                  </Svg>
                ) : null}
                {selection ? (
                  <View
                    {...panResponder.panHandlers}
                    style={[
                      styles.selection,
                      {
                        left: selection.x,
                        top: selection.y,
                        width: selection.size,
                        height: selection.size,
                      },
                    ]}
                  >
                    <View style={styles.ruleVertical} pointerEvents="none" />
                    <View style={styles.ruleHorizontal} pointerEvents="none" />
                    <Text style={styles.selectionHint} pointerEvents="none">MOVER</Text>
                  </View>
                ) : null}
                {!rendererReady ? (
                  <View pointerEvents="none" style={styles.rendererLoading}>
                    <ActivityIndicator color="#2563eb" />
                    <Text style={styles.helper}>Preparando prévia…</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.resizeControls}>
                <TouchableOpacity
                  onPress={() => changeSelectionSize(-Math.max(12, (selection?.size || 0) * 0.08))}
                  disabled={!selection || applying}
                  accessibilityRole="button"
                  accessibilityLabel="Diminuir área do recorte"
                  style={[styles.resizeButton, dark && styles.darkResizeButton]}
                >
                  <Minus size={17} color={dark ? '#e2e8f0' : '#334155'} />
                </TouchableOpacity>
                <Text style={[styles.helper, dark && styles.dimText]}>Tamanho do recorte</Text>
                <TouchableOpacity
                  onPress={() => changeSelectionSize(Math.max(12, (selection?.size || 0) * 0.08))}
                  disabled={!selection || applying}
                  accessibilityRole="button"
                  accessibilityLabel="Aumentar área do recorte"
                  style={[styles.resizeButton, dark && styles.darkResizeButton]}
                >
                  <Plus size={17} color={dark ? '#e2e8f0' : '#334155'} />
                </TouchableOpacity>
              </View>
              <View style={styles.paddingControls}>
                <TouchableOpacity
                  onPress={() => changePaddingPercent(-5)}
                  disabled={paddingPercent === 0 || applying}
                  accessibilityRole="button"
                  accessibilityLabel="Diminuir moldura branca"
                  style={[styles.resizeButton, dark && styles.darkResizeButton]}
                >
                  <Minus size={17} color={dark ? '#e2e8f0' : '#334155'} />
                </TouchableOpacity>
                <Text style={[styles.helper, dark && styles.dimText]}>Moldura branca: {paddingPercent}%</Text>
                <TouchableOpacity
                  onPress={() => changePaddingPercent(5)}
                  disabled={paddingPercent === 35 || applying}
                  accessibilityRole="button"
                  accessibilityLabel="Aumentar moldura branca"
                  style={[styles.resizeButton, dark && styles.darkResizeButton]}
                >
                  <Plus size={17} color={dark ? '#e2e8f0' : '#334155'} />
                </TouchableOpacity>
                {paddingPercent > 0 ? (
                  <TouchableOpacity
                    onPress={() => changePaddingPercent(-paddingPercent)}
                    disabled={applying}
                    accessibilityRole="button"
                    accessibilityLabel="Zerar moldura branca"
                    style={styles.resetPaddingButton}
                  >
                    <Text style={styles.resetPaddingText}>Zerar</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <TouchableOpacity
                onPress={resetSelection}
                disabled={applying}
                accessibilityRole="button"
                accessibilityLabel="Centralizar recorte quadrado"
                style={styles.centerSelectionButton}
              >
                <Text style={[styles.helper, dark && styles.dimText]}>Centralizar 1:1</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={styles.footer}>
            <TouchableOpacity
              onPress={close}
              disabled={applying}
              style={[styles.footerButton, styles.cancelButton, dark && styles.darkCancelButton]}
            >
              <Text style={[styles.cancelText, dark && styles.lightText]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => void applyCrop()}
              disabled={loading || !rendererReady || Boolean(loadError) || !selection || applying}
              accessibilityRole="button"
              accessibilityLabel="Aplicar recorte da foto"
              style={[styles.footerButton, styles.applyButton, (loading || !rendererReady || Boolean(loadError) || !selection || applying) && styles.disabledButton]}
            >
              {applying ? <ActivityIndicator size="small" color="#ffffff" /> : null}
              <Text style={styles.applyText}>{applying ? 'Salvando…' : 'Aplicar recorte'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', padding: 16, backgroundColor: 'rgba(15,23,42,0.82)' },
  card: { width: '100%', maxWidth: 440, alignSelf: 'center', padding: 16, gap: 14, borderRadius: 22, backgroundColor: '#ffffff' },
  darkCard: { backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  headerCopy: { flex: 1, gap: 4 },
  title: { color: '#0f172a', fontSize: 16, fontWeight: '900' },
  helper: { color: '#64748b', fontSize: 11, lineHeight: 16, textAlign: 'center' },
  lightText: { color: '#f8fafc' },
  dimText: { color: '#94a3b8' },
  closeButton: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' },
  loadingBox: { minHeight: 280, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 },
  errorText: { color: '#b91c1c', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  errorTextDark: { color: '#fca5a5' },
  preview: { width: '100%', maxWidth: 360, aspectRatio: 1, alignSelf: 'center', overflow: 'hidden', backgroundColor: '#ffffff' },
  stage: { position: 'absolute', left: 0, top: 0 },
  rendererLoading: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.72)' },
  selection: { position: 'absolute', borderWidth: 2, borderColor: '#ffffff', backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  ruleVertical: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.55)' },
  ruleHorizontal: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.55)' },
  selectionHint: { position: 'absolute', bottom: 5, right: 5, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, overflow: 'hidden', color: '#ffffff', backgroundColor: 'rgba(15,23,42,0.75)', fontSize: 8, fontWeight: '900' },
  resizeControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
  paddingControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 8 },
  resetPaddingButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 8 },
  resetPaddingText: { color: '#64748b', fontSize: 10, fontWeight: '800', textDecorationLine: 'underline' },
  centerSelectionButton: { minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  resizeButton: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eff6ff' },
  darkResizeButton: { backgroundColor: '#1e293b' },
  footer: { flexDirection: 'row', gap: 8 },
  footerButton: { minHeight: 44, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 11 },
  cancelButton: { backgroundColor: '#f1f5f9' },
  darkCancelButton: { backgroundColor: '#1e293b' },
  cancelText: { color: '#475569', fontSize: 12, fontWeight: '800' },
  applyButton: { backgroundColor: '#2563eb' },
  applyText: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
  disabledButton: { opacity: 0.5 },
});
