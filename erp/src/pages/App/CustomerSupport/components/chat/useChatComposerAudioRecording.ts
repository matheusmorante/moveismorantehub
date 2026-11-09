import { useState, useRef } from 'react';
import { createChatAudioRecordingActions } from './chatComposerAudioRecording';

interface UseChatComposerAudioRecordingParams {
  objectUrlsRef: React.MutableRefObject<string[]>;
  setSendError: (error: string) => void;
  makeId: () => string;
  formatDuration: (seconds: number) => string;
  removeAttachment: (id: string) => void;
  appendAttachments: (items: any[]) => void;
}

export function useChatComposerAudioRecording({
  objectUrlsRef,
  setSendError,
  makeId,
  formatDuration,
  removeAttachment,
  appendAttachments,
}: UseChatComposerAudioRecordingParams) {
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingError, setRecordingError] = useState('');
  const [audioPreview, setAudioPreview] = useState<{ url: string; type: string; name: string } | null>(null);

  const recordingRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const currentAudioAttachmentRef = useRef<string | null>(null);

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
    setAudioPreview(null);
  };

  return {
    isRecording,
    isRecordingPaused,
    recordingSeconds,
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
