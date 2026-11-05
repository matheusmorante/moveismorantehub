import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { z } from 'zod';
import type { supportChatComposerDraftSchema } from '../../../../../../../shared-utils/customerSupportFormSchemas';
import { formatFileSize, normalizedFileType } from './chatComposerAttachmentFiles';

type Attachment = z.input<typeof supportChatComposerDraftSchema>['attachments'][number];
type AudioPreview = { url: string; type: string; name: string } | null;

interface ChatAudioRecordingActionsInput {
  recordingRef: MutableRefObject<MediaRecorder | null>;
  recordingStreamRef: MutableRefObject<MediaStream | null>;
  recordingChunksRef: MutableRefObject<Blob[]>;
  currentAudioAttachmentRef: MutableRefObject<string | null>;
  objectUrlsRef: MutableRefObject<Set<string>>;
  recordingSeconds: number;
  setIsRecording: Dispatch<SetStateAction<boolean>>;
  setIsRecordingPaused: Dispatch<SetStateAction<boolean>>;
  setRecordingSeconds: Dispatch<SetStateAction<number>>;
  setRecordingError: Dispatch<SetStateAction<string>>;
  setSendError: Dispatch<SetStateAction<string>>;
  setAudioPreview: Dispatch<SetStateAction<AudioPreview>>;
  makeId: () => string;
  formatDuration: (seconds: number) => string;
  removeAttachment: (attachmentId: string) => void;
  appendAttachments: (attachments: Attachment[], files?: Map<string, File>) => boolean;
}

export function createChatAudioRecordingActions({
  recordingRef,
  recordingStreamRef,
  recordingChunksRef,
  currentAudioAttachmentRef,
  objectUrlsRef,
  recordingSeconds,
  setIsRecording,
  setIsRecordingPaused,
  setRecordingSeconds,
  setRecordingError,
  setSendError,
  setAudioPreview,
  makeId,
  formatDuration,
  removeAttachment,
  appendAttachments,
}: ChatAudioRecordingActionsInput) {
  const stopRecordingStream = () => {
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
    recordingRef.current = null;
  };

  const cancelRecording = () => {
    const recorder = recordingRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.stop();
    }
    stopRecordingStream();
    recordingChunksRef.current = [];
    setIsRecording(false);
    setIsRecordingPaused(false);
    setRecordingSeconds(0);
    setRecordingError('');
    const existing = currentAudioAttachmentRef.current;
    if (existing) removeAttachment(existing);
    setAudioPreview(null);
  };

  const startRecording = async () => {
    setRecordingError('');
    setSendError('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setRecordingError('Este navegador não oferece gravação de áudio. Anexe um arquivo OGG, MP3 ou M4A.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const supportedMime = ['audio/ogg;codecs=opus', 'audio/mp4', 'audio/aac']
        .find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
      const recorder = new MediaRecorder(stream, supportedMime ? { mimeType: supportedMime } : undefined);
      recordingStreamRef.current = stream;
      recordingRef.current = recorder;
      recordingChunksRef.current = [];
      setRecordingSeconds(0);
      setIsRecordingPaused(false);
      setIsRecording(true);
      recorder.ondataavailable = (event) => {
        if (event.data.size) recordingChunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setRecordingError('A gravação foi interrompida. Confira a permissão do microfone e tente novamente.');
        stopRecordingStream();
        setIsRecording(false);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const fileType = normalizedFileType(new File([blob], 'gravacao', { type: blob.type }));
        const fileName = `audio-atendimento.${blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') ? 'm4a' : blob.type.includes('mpeg') ? 'mp3' : 'webm'}`;
        const id = makeId();
        const url = URL.createObjectURL(blob);
        objectUrlsRef.current.add(url);
        const file = new File([blob], fileName, { type: blob.type || 'audio/webm' });
        const addition: Attachment = {
          kind: 'audio', id, label: 'Áudio gravado',
          detail: `${formatDuration(recordingSeconds)} · ${formatFileSize(file.size)}`,
          fileName,
          mimeType: file.type,
          previewUrl: url,
        };
        currentAudioAttachmentRef.current = id;
        setAudioPreview({ url, type: file.type, name: fileName });
        setIsRecording(false);
        setIsRecordingPaused(false);
        stopRecordingStream();
        recordingChunksRef.current = [];
        if (fileType?.label !== 'Áudio') {
          setRecordingError('A gravação deste navegador está em WebM, formato não aceito pela API do WhatsApp. Você pode anexar áudio OGG, MP3 ou M4A.');
        }
        appendAttachments([addition], new Map([[id, file]]));
      };
      recorder.start(500);
    } catch (error) {
      const denied = error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError');
      setRecordingError(denied
        ? 'Permita o acesso ao microfone no navegador para gravar um áudio.'
        : 'Não foi possível iniciar a gravação. Confira o microfone e tente novamente.');
      stopRecordingStream();
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recordingRef.current?.state !== 'inactive') recordingRef.current?.stop();
  };

  const toggleRecordingPause = () => {
    const recorder = recordingRef.current;
    if (!recorder) return;
    if (recorder.state === 'recording') {
      recorder.pause();
      setIsRecordingPaused(true);
    } else if (recorder.state === 'paused') {
      recorder.resume();
      setIsRecordingPaused(false);
    }
  };

  return { cancelRecording, startRecording, stopRecording, toggleRecordingPause };
}
