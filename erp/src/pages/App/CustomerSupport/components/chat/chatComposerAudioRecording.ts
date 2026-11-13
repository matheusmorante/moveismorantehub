import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { z } from 'zod';
import type { supportChatComposerDraftSchema } from '../../../../../../../shared-utils/customerSupportFormSchemas';
import { formatFileSize, MAX_FILE_SIZE } from './chatComposerAttachmentFiles';
import { prepareRecordedAudioFile } from './chatComposerAudioConversion';

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
  setIsPreparingAudio: Dispatch<SetStateAction<boolean>>;
  setRecordingSeconds: Dispatch<SetStateAction<number>>;
  setRecordingError: Dispatch<SetStateAction<string>>;
  setSendError: (error: string) => void;
  setAudioPreview: (preview: AudioPreview) => void;
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
  setIsPreparingAudio,
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
    setIsPreparingAudio(false);
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
      recordingStreamRef.current = stream;
      const supportedMime = typeof MediaRecorder.isTypeSupported === 'function'
        ? ['audio/ogg;codecs=opus', 'audio/webm;codecs=opus', 'audio/mp4', 'audio/aac']
          .find((mimeType) => MediaRecorder.isTypeSupported(mimeType))
        : undefined;
      const recorder = new MediaRecorder(stream, supportedMime ? { mimeType: supportedMime } : undefined);
      recordingRef.current = recorder;
      recordingChunksRef.current = [];
      setRecordingSeconds(0);
      setIsRecordingPaused(false);
      setIsRecording(true);
      recorder.ondataavailable = (event) => {
        if (event.data.size) recordingChunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        setRecordingError('A gravação foi interrompida. Confira a permissão do microfone e tente novamente.');
        stopRecordingStream();
        setIsRecording(false);
        setIsRecordingPaused(false);
        setIsPreparingAudio(false);
        recordingChunksRef.current = [];
      };
      recorder.onstop = async () => {
        const chunks = [...recordingChunksRef.current];
        recordingChunksRef.current = [];
        setIsRecording(false);
        setIsRecordingPaused(false);
        setIsPreparingAudio(true);
        stopRecordingStream();

        try {
          const blob = new Blob(chunks, { type: recorder.mimeType || chunks[0]?.type || 'audio/webm' });
          if (!blob.size) throw new Error('A gravação ficou vazia. Grave o áudio novamente.');
          const file = await prepareRecordedAudioFile(blob, recorder.mimeType || blob.type);
          if (file.size > MAX_FILE_SIZE) throw new Error('O áudio gravado ultrapassou o limite de 4 MB. Grave um trecho menor.');

          const id = makeId();
          const fileName = file.name;
          const url = URL.createObjectURL(file);
          objectUrlsRef.current.add(url);
          const addition: Attachment = {
            kind: 'audio', id, label: 'Áudio gravado',
            detail: `${formatDuration(recordingSeconds)} · ${formatFileSize(file.size)}`,
            fileName,
            mimeType: file.type,
            previewUrl: url,
          };

          if (!appendAttachments([addition], new Map([[id, file]]))) return;
          currentAudioAttachmentRef.current = id;
          setAudioPreview({ url, type: file.type, name: fileName });
          setRecordingError('');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '';
          const isKnownMessage = errorMessage.startsWith('A gravação') || errorMessage.startsWith('O áudio gravado');
          setRecordingError(isKnownMessage
            ? errorMessage
            : 'Não foi possível preparar o áudio para envio. Grave novamente ou anexe um arquivo OGG, MP3, M4A, AAC ou AMR.');
        } finally {
          setIsPreparingAudio(false);
        }
      };
      recorder.start(500);
    } catch (error) {
      const denied = error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError');
      setRecordingError(denied
        ? 'Permita o acesso ao microfone no navegador para gravar um áudio.'
        : 'Não foi possível iniciar a gravação. Confira o microfone e tente novamente.');
      stopRecordingStream();
      setIsRecording(false);
      setIsRecordingPaused(false);
      setIsPreparingAudio(false);
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
