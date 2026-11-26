const SUPPORTED_AUDIO_EXTENSIONS: Record<string, string> = {
  'audio/aac': 'aac',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/amr': 'amr',
  'audio/ogg': 'ogg',
};

const normalizeMimeType = (mimeType: string) => mimeType.split(';')[0].trim().toLowerCase();

async function convertWebmRecordingToOgg(blob: Blob): Promise<File> {
  if (typeof BigInt !== 'function') {
    throw new Error('A conversão de áudio requer um navegador mais atualizado.');
  }
  const {
    ALL_FORMATS,
    BlobSource,
    BufferTarget,
    Conversion,
    Input,
    OggOutputFormat,
    Output,
  } = await import('mediabunny');
  const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(blob) });
  const target = new BufferTarget();

  try {
    const conversion = await Conversion.init({
      input,
      output: new Output({ format: new OggOutputFormat(), target }),
      tracks: 'primary',
      audio: { codec: 'opus' },
      showWarnings: false,
    });

    if (!conversion.isValid || !conversion.utilizedTracks.some((track) => track.type === 'audio')) {
      throw new Error('A gravação não contém uma faixa de áudio compatível.');
    }

    await conversion.execute();
    if (!target.buffer?.byteLength) throw new Error('A conversão não gerou um arquivo de áudio.');
    return new File([target.buffer], 'audio-atendimento.ogg', { type: 'audio/ogg' });
  } finally {
    input.dispose();
  }
}

export async function prepareRecordedAudioFile(blob: Blob, preferredMimeType: string): Promise<File> {
  const mimeType = normalizeMimeType(preferredMimeType || blob.type);

  if (mimeType === 'audio/webm' || mimeType === 'video/webm' || mimeType === 'audio/x-matroska') {
    return convertWebmRecordingToOgg(blob);
  }

  const extension = SUPPORTED_AUDIO_EXTENSIONS[mimeType];
  if (!extension) throw new Error('O navegador gerou um formato de áudio não aceito pelo WhatsApp.');

  return new File([blob], `audio-atendimento.${extension}`, { type: mimeType });
}
