import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  PanResponder,
  Platform,
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
  createProductImageCropSourceFormSchema,
  mobileProductPhotoUploadFormSchema,
  productImageReplacementFormSchema,
} from '../../../../../../shared-utils/productImageFormSchemas';
import {
  downloadProductCropImageSource,
  type PreparedProductCropImageSource,
} from '../domain/productCropImageSource';
import { ProductSquareCropControls } from './ProductSquareCropControls';
import { styles } from './productSquareImageCropModal.styles';

async function deleteTemporaryPhotoUri(uri: string) {
  if (uri.startsWith('blob:')) {
    URL.revokeObjectURL(uri);
    return;
  }
  await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined);
}

interface Props {
  visible: boolean;
  imageUrl: string;
  availableImageUrls?: readonly string[];
  dark: boolean;
  onCancel: () => void;
  onConfirm: (newUrl: string) => void | Promise<void>;
}

const getImageFetchCandidates = (url: string) => [
  url,
  `https://images.weserv.nl/?url=${encodeURIComponent(url)}`,
  `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

async function prepareImageSource(url: string, signal: AbortSignal): Promise<PreparedProductCropImageSource> {
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('file://')) {
    return { uri: url };
  }

  if (Platform.OS === 'web') {
    for (const candidate of getImageFetchCandidates(url)) {
      if (signal.aborted) throw Object.assign(new Error('O carregamento da foto foi cancelado.'), { name: 'AbortError' });
      const candidateController = new AbortController();
      const cancelCandidate = () => candidateController.abort();
      signal.addEventListener('abort', cancelCandidate, { once: true });
      try {
        const response = await withTimeout(
          fetch(candidate, { signal: candidateController.signal }),
          12_000,
          null,
          'Carregar foto para recorte'
        );
        if (!response?.ok) {
          candidateController.abort();
          continue;
        }
        const blob = await withTimeout(response.blob(), 12_000, null, 'Preparar foto para recorte');
        if (!blob || blob.size === 0) {
          candidateController.abort();
          continue;
        }
        const objectUrl = URL.createObjectURL(blob);
        return { uri: objectUrl, cleanup: () => URL.revokeObjectURL(objectUrl) };
      } catch {
        if (signal.aborted) throw Object.assign(new Error('O carregamento da foto foi cancelado.'), { name: 'AbortError' });
        // URLs públicas alternativas permitem contornar CORS do armazenamento original.
      } finally {
        signal.removeEventListener('abort', cancelCandidate);
      }
    }
    throw new Error('Não foi possível carregar a foto para recorte. Verifique sua conexão e tente novamente.');
  }

  return downloadProductCropImageSource(url, signal);
}

function readImageDimensions(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

export const ProductSquareImageCropModal: React.FC<Props> = ({
  visible,
  imageUrl,
  availableImageUrls,
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
  const sourceCleanupRef = useRef<PreparedProductCropImageSource['cleanup']>(undefined);

  const cropForm = useZodForm(squareImageCropFormSchema, {
    image: imageUrl,
    paddingPercent,
    displayWidth: 0,
    displayHeight: 0,
    sourceWidth: 0,
    sourceHeight: 0,
    selection: { x: 0, y: 0, size: 0 },
  });
  const sourceFormSchema = useMemo(
    () => createProductImageCropSourceFormSchema(availableImageUrls ?? []),
    [availableImageUrls]
  );
  const sourceForm = useZodForm(sourceFormSchema, { oldUrl: '' });
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
    const loadController = new AbortController();
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
      let prepared: PreparedProductCropImageSource | null = null;
      try {
        prepared = await prepareImageSource(imageUrl, loadController.signal);
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
      loadController.abort();
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
    let croppedSourceUri: string | undefined;
    try {
      if (availableImageUrls) {
        const sourceIsCurrent = await sourceForm.validateAndRun(
          { oldUrl: imageUrl },
          (values) => values.oldUrl,
          showValidationError
        );
        if (sourceIsCurrent === false) return;
      }

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
          const compressionQualities = [0.95, 0.85, 0.75, 0.65, 0.55];
          for (const [index, compress] of compressionQualities.entries()) {
            const result = await withTimeout(
              rendered.saveAsync({ format: SaveFormat.WEBP, compress }),
              15_000,
              null,
              'Salvar foto recortada'
            );
            if (!result?.uri) throw new Error('Não foi possível salvar a foto recortada.');
            let keepForDerivativeGeneration = false;
            try {
              const response = await withTimeout(fetch(result.uri), 12_000, null, 'Ler foto recortada');
              if (!response?.ok) throw new Error('Não foi possível preparar a foto recortada para envio.');
              file = await withTimeout(response.blob(), 12_000, null, 'Preparar foto recortada');
              if (!file || file.size === 0) throw new Error('A foto recortada ficou vazia. Tente novamente.');
              if (file.size <= 0.3 * 1024 * 1024 || index === compressionQualities.length - 1) {
                croppedSourceUri = result.uri;
                keepForDerivativeGeneration = true;
              }
            } finally {
              if (!keepForDerivativeGeneration) await deleteTemporaryPhotoUri(result.uri);
            }
            if (file.size <= 0.3 * 1024 * 1024) break;
          }
          if (!file) throw new Error('Não foi possível preparar a foto recortada para envio.');

          const uploadedUrl = await uploadForm.validateAndRun(
            {
              photos: [{
                file,
                name: `produto-recortado-${Date.now()}.webp`,
                contentType: 'image/webp',
                sourceUri: croppedSourceUri,
              }],
            },
            async ({ photos }) => {
              const photo = photos[0];
              return uploadMobileProductPhoto(photo.file, photo.name, photo.contentType, photo.sourceUri);
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

          if (availableImageUrls) {
            const sourceIsStillCurrent = await sourceForm.validateAndRun(
              { oldUrl: imageUrl },
              (values) => values.oldUrl,
              showValidationError
            );
            if (sourceIsStillCurrent === false) return false;
          }

          await onConfirm(validUrl);
          return true;
        },
        showValidationError
      );
      if (cropResult) onCancel();
    } catch (error) {
      Alert.alert('Erro ao recortar foto', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      if (croppedSourceUri) await deleteTemporaryPhotoUri(croppedSourceUri);
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
              <ProductSquareCropControls
                dark={dark}
                selectionSize={selection?.size ?? null}
                paddingPercent={paddingPercent}
                applying={applying}
                onResizeSelection={changeSelectionSize}
                onChangePadding={changePaddingPercent}
                onCenterSelection={resetSelection}
              />
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
