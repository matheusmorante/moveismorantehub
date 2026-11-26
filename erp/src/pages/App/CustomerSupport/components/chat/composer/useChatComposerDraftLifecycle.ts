import { useEffect } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

interface ChatComposerDraftLifecycleOptions {
  objectUrlsRef: MutableRefObject<Set<string>>;
  fileByAttachmentIdRef: MutableRefObject<Map<string, File>>;
  recordingStreamRef: MutableRefObject<MediaStream | null>;
  isRecording: boolean;
  isRecordingPaused: boolean;
  setRecordingSeconds: Dispatch<SetStateAction<number>>;
  audioPreview: { url: string; type: string; name: string } | null;
}

export function useChatComposerDraftLifecycle({
  objectUrlsRef,
  fileByAttachmentIdRef,
  recordingStreamRef,
  isRecording,
  isRecordingPaused,
  setRecordingSeconds,
  audioPreview,
}: ChatComposerDraftLifecycleOptions) {
  useEffect(() => () => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();
    fileByAttachmentIdRef.current.clear();
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    if (!isRecording || isRecordingPaused) return;
    const timer = window.setInterval(() => setRecordingSeconds((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(timer);
  }, [isRecording, isRecordingPaused]);

  useEffect(() => {
    if (!isRecording && !audioPreview) return;
    const protectDraft = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', protectDraft);
    return () => window.removeEventListener('beforeunload', protectDraft);
  }, [isRecording, audioPreview]);
}
