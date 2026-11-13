import { useState, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { createChatAudioRecordingActions } from './chatComposerAudioRecording';
import type { ChatComposerAttachment } from './chatComposerAttachmentFiles';

export type ChatAudioPreview = { url: string; type: string; name: string } | null;

interface UseChatComposerAudioRecordingParams {
  objectUrlsRef: MutableRefObject<Set<string>>;
  audioPreviewRef: MutableRefObject<ChatAudioPreview>;
  currentAudioAttachmentRef: MutableRefObject<string | null>;
  setSendError: (error: string) => void;
  makeId: () => string;
  formatDuration: (seconds: number) => string;
  removeAttachment: (id: string) => void;
  appendAttachments: (items: ChatComposerAttachment[], files?: Map<string, File>) => boolean;
}

export function useChatComposerAudioRecording({
  objectUrlsRef,
  audioPreviewRef,
  currentAudioAttachmentRef,
  setSendError,
  makeId,
  formatDuration,
  removeAttachment,
  appendAttachments,
}: UseChatComposerAudioRecordingParams) {
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [isPreparingAudio, setIsPreparingAudio] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingError, setRecordingError] = useState('');
  const [audioPreview, setAudioPreviewState] = useState<ChatAudioPreview>(null);

  const setAudioPreview = (preview: ChatAudioPreview) => {
    audioPreviewRef.current = preview;
    setAudioPreviewState(preview);
  };

  const recordingRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const { cancelRecording, startRecording, stopRecording, toggleRecordingPause } =
    createChatAudioRecordingActions({
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
    });

  const clearAudioPreview = () => {
    if (currentAudioAttachmentRef.current) {
      removeAttachment(currentAudioAttachmentRef.current);
    }
    currentAudioAttachmentRef.current = null;
    setAudioPreview(null);
  };

  const recordingDurationLabel = `${Math.floor(recordingSeconds / 60)
    .toString()
    .padStart(2, '0')}:${(recordingSeconds % 60).toString().padStart(2, '0')}`;

  return {
    isRecording,
    isRecordingPaused,
    isPreparingAudio,
    recordingSeconds,
    recordingDurationLabel,
    recordingError,
    audioPreview,
    setAudioPreview,
    currentAudioAttachmentRef,
    recordingStreamRef,
    setRecordingSeconds,
    cancelRecording,
    startRecording,
    stopRecording,
    toggleRecordingPause,
    clearAudioPreview,
  };
}
