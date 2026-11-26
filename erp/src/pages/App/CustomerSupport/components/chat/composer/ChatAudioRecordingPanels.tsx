import React from 'react';

interface RecordedAudioPreviewProps {
  audioUrl: string;
  onDiscard: () => void;
}

export const RecordedAudioPreview: React.FC<RecordedAudioPreviewProps> = ({ audioUrl, onDiscard }) => (
  <div className="mb-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/70">
    <i className="bi bi-soundwave text-emerald-600" />
    <audio controls preload="metadata" src={audioUrl} className="h-8 min-w-0 flex-1" aria-label="Ouvir áudio gravado" />
    <button type="button" onClick={onDiscard} aria-label="Descartar áudio gravado" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-white hover:text-red-600 dark:hover:bg-slate-700"><i className="bi bi-trash3" /></button>
  </div>
);

interface ChatAudioRecordingControlsProps {
  isRecording: boolean;
  isRecordingPaused: boolean;
  isPreparingAudio: boolean;
  durationLabel: string;
  onCancel: () => void;
  onTogglePause: () => void;
  onStop: () => void;
}

export const ChatAudioRecordingControls: React.FC<ChatAudioRecordingControlsProps> = ({
  isRecording,
  isRecordingPaused,
  isPreparingAudio,
  durationLabel,
  onCancel,
  onTogglePause,
  onStop,
}) => (
  <>
    {(isRecording || isPreparingAudio) && (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs dark:border-rose-900/70 dark:bg-rose-950/30">
        {isPreparingAudio ? (
          <span role="status" className="inline-flex items-center gap-2 font-semibold text-rose-700 dark:text-rose-300">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-rose-300 border-t-rose-700" />
            Preparando áudio para envio…
          </span>
        ) : (
          <>
            <span className="inline-flex items-center gap-2 font-semibold text-rose-700 dark:text-rose-300"><span className={`h-2 w-2 rounded-full bg-rose-500 ${isRecordingPaused ? '' : 'animate-pulse'}`} />{isRecordingPaused ? 'Gravação pausada' : 'Gravando'} · {durationLabel}</span>
            <span aria-hidden="true" className="flex h-6 items-center gap-0.5">
              {Array.from({ length: 18 }, (_, index) => (
                <span key={index} className={`w-0.5 rounded-full bg-rose-400 ${isRecordingPaused ? '' : 'animate-pulse'}`} style={{ height: `${6 + ((index * 7) % 15)}px`, animationDelay: `${index * 35}ms` }} />
              ))}
            </span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={onCancel} className="rounded-lg px-2 py-1.5 text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800">Cancelar</button>
              <button type="button" onClick={onTogglePause} className="rounded-lg px-2 py-1.5 font-semibold text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-800">{isRecordingPaused ? 'Continuar' : 'Pausar'}</button>
              <button type="button" onClick={onStop} className="rounded-lg bg-rose-600 px-3 py-1.5 font-bold text-white hover:bg-rose-700">Finalizar e ouvir</button>
            </div>
          </>
        )}
      </div>
    )}

  </>
);
