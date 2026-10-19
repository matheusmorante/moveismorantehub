import { Platform } from 'react-native';
import { CameraView } from 'expo-camera';
import { recognizeText } from 'expo-mlkit-ocr';
import { extractNfeAccessKey } from '../../../invoices/utils/accessKey';

export async function recognizeAccessKeyFromCamera(camera: CameraView): Promise<string | null> {
  const photo = await camera.takePictureAsync({
    quality: 1,
    base64: Platform.OS === 'web',
  });
  if (!photo?.uri) throw new Error('A câmera não retornou a imagem.');

  let text: string;
  if (Platform.OS === 'web') {
    if (!photo.base64) throw new Error('A câmera não retornou a imagem para leitura.');
    const { createWorker, PSM } = await import('tesseract.js');
    const worker = await createWorker('eng');
    try {
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789',
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      });
      ({
        data: { text },
      } = await worker.recognize(`data:image/jpeg;base64,${photo.base64}`));
    } finally {
      await worker.terminate();
    }
  } else {
    ({ text } = await recognizeText(photo.uri));
  }

  return extractNfeAccessKey(text);
}
