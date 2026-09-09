export type GeminiFileState = 'PROCESSING' | 'ACTIVE' | 'FAILED' | 'EXPIRED';

export type GeminiFileReference = {
  provider: 'gemini';
  name: string;
  fileUri: string;
  mimeType: string;
  state: GeminiFileState;
  uploadedAt: string;
  expiresAt?: string;
  sha256: string;
};

type GeminiFileReferenceRow = {
  gemini_file_name?: string | null;
  gemini_file_uri?: string | null;
  mime_type: string;
  state: GeminiFileState;
  uploaded_at: string;
  expires_at?: string | null;
  source_sha256: string;
  updated_at?: string;
};

type SupabaseLike = { from: (table: string) => any };

const API_BASE = 'https://generativelanguage.googleapis.com';
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

const readJson = async (response: Response) => {
  const text = await response.text();
  try { return text ? JSON.parse(text) : {}; } catch { return { error: text }; }
};

export async function uploadGeminiFile(
  bytes: Uint8Array,
  mimeType: string,
  displayName: string,
  apiKey: string,
  sha256: string,
): Promise<GeminiFileReference> {
  const start = await fetch(`${API_BASE}/upload/v1beta/files?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(bytes.byteLength),
      'X-Goog-Upload-Header-Content-Type': mimeType,
    },
    body: JSON.stringify({ file: { displayName } }),
  });
  if (!start.ok) throw new Error(`Gemini Files upload start failed (${start.status}).`);
  const uploadUrl = start.headers.get('x-goog-upload-url');
  if (!uploadUrl) throw new Error('Gemini Files upload URL was not returned.');

  const upload = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Length': String(bytes.byteLength),
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
      'Content-Type': mimeType,
    },
    body: bytes,
  });
  if (!upload.ok) throw new Error(`Gemini Files upload failed (${upload.status}).`);
  const payload = await readJson(upload);
  const file = payload.file || payload;
  if (!file.name || !file.uri) throw new Error('Gemini Files response did not contain a file reference.');

  return {
    provider: 'gemini',
    name: String(file.name),
    fileUri: String(file.uri),
    mimeType,
    state: String(file.state || 'PROCESSING') as GeminiFileState,
    uploadedAt: new Date().toISOString(),
    expiresAt: file.expirationTime,
    sha256,
  };
}

export async function waitForGeminiFile(
  reference: GeminiFileReference,
  apiKey: string,
  options: { maxAttempts?: number; intervalMs?: number } = {},
): Promise<GeminiFileReference> {
  const maxAttempts = options.maxAttempts ?? 30;
  const intervalMs = options.intervalMs ?? 1000;
  let current = reference;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (current.state === 'ACTIVE') return current;
    if (current.state === 'FAILED' || current.state === 'EXPIRED') throw new Error(`Gemini file is ${current.state.toLowerCase()}.`);
    await sleep(intervalMs);
    const response = await fetch(`${API_BASE}/v1beta/${encodeURIComponent(current.name)}?key=${encodeURIComponent(apiKey)}`);
    if (!response.ok) throw new Error(`Gemini Files status failed (${response.status}).`);
    const file = await readJson(response);
    current = { ...current, fileUri: String(file.uri || current.fileUri), state: String(file.state || current.state) as GeminiFileState, expiresAt: file.expirationTime || current.expiresAt };
  }
  throw new Error('Timeout while waiting for Gemini file processing.');
}

const referenceFromRow = (row: GeminiFileReferenceRow): GeminiFileReference | null => {
  if (!row.gemini_file_name || !row.gemini_file_uri) return null;
  return {
    provider: 'gemini', name: row.gemini_file_name, fileUri: row.gemini_file_uri,
    mimeType: row.mime_type, state: row.state, uploadedAt: row.uploaded_at,
    expiresAt: row.expires_at || undefined, sha256: row.source_sha256,
  };
};

const isReusable = (row: GeminiFileReferenceRow) => row.state === 'ACTIVE'
  && Boolean(row.gemini_file_name && row.gemini_file_uri)
  && Boolean(row.expires_at && Date.parse(row.expires_at) > Date.now());

/**
 * Reutiliza o file URI enquanto estiver válido. A linha PROCESSING funciona
 * como um lock persistente para impedir uploads duplicados pelo mesmo usuário.
 */
export async function ensureGeminiFile(options: {
  supabase: SupabaseLike;
  ownerId: string;
  sourcePath: string;
  bytes: Uint8Array;
  mimeType: string;
  displayName: string;
  apiKey: string;
  sha256: string;
}): Promise<{ reference: GeminiFileReference; reused: boolean; retryCount: number; uploadMs: number; processingMs: number }> {
  const { supabase, ownerId, sourcePath, bytes, mimeType, displayName, apiKey, sha256 } = options;
  const lookup = async () => {
    const { data } = await supabase.from('gemini_file_references').select('*')
      .eq('owner_id', ownerId).eq('source_sha256', sha256).maybeSingle();
    return data as GeminiFileReferenceRow | null;
  };
  const existing = await lookup();
  if (existing && isReusable(existing)) {
    return { reference: referenceFromRow(existing)!, reused: true, retryCount: 0, uploadMs: 0, processingMs: 0 };
  }

  if (existing) {
    if (existing.state === 'PROCESSING') {
      for (let attempt = 0; attempt < 15; attempt += 1) {
        await sleep(1000);
        const pending = await lookup();
        if (pending && isReusable(pending)) return { reference: referenceFromRow(pending)!, reused: true, retryCount: attempt + 1, uploadMs: 0, processingMs: 0 };
        if (!pending || pending.state === 'FAILED' || pending.state === 'EXPIRED') break;
      }
    }
    await supabase.from('gemini_file_references').delete().eq('owner_id', ownerId).eq('source_sha256', sha256);
  }

  const lockToken = crypto.randomUUID();
  const claim = await supabase.from('gemini_file_references').insert({
    owner_id: ownerId, source_sha256: sha256, source_path: sourcePath, mime_type: mimeType,
    state: 'PROCESSING', lock_token: lockToken, uploaded_at: new Date().toISOString(),
    expires_at: null, retry_count: 0, last_error_code: null, updated_at: new Date().toISOString(),
  });
  if (claim.error) {
    // A função continua disponível durante a janela entre o deploy do código e
    // a aplicação da migration do cache. Não grava referência nessa condição.
    if (/gemini_file_references|relation .* does not exist/i.test(String(claim.error.message || ''))) {
      const uploadStartedAt = Date.now();
      const uploaded = await uploadGeminiFile(bytes, mimeType, displayName, apiKey, sha256);
      const uploadMs = Date.now() - uploadStartedAt;
      const processingStartedAt = Date.now();
      const reference = await waitForGeminiFile(uploaded, apiKey);
      return { reference, reused: false, retryCount: 0, uploadMs, processingMs: Date.now() - processingStartedAt };
    }
    const concurrent = await lookup();
    if (concurrent && isReusable(concurrent)) return { reference: referenceFromRow(concurrent)!, reused: true, retryCount: 1, uploadMs: 0, processingMs: 0 };
    throw new Error('Outro processamento deste documento está em andamento. Tente novamente em instantes.');
  }

  try {
    const uploadStartedAt = Date.now();
    const uploaded = await uploadGeminiFile(bytes, mimeType, displayName, apiKey, sha256);
    const uploadMs = Date.now() - uploadStartedAt;
    const processingStartedAt = Date.now();
    const ready = await waitForGeminiFile(uploaded, apiKey);
    const processingMs = Date.now() - processingStartedAt;
    const { error } = await supabase.from('gemini_file_references').update({
      gemini_file_name: ready.name, gemini_file_uri: ready.fileUri, state: ready.state,
      expires_at: ready.expiresAt || null, updated_at: new Date().toISOString(), lock_token: null,
    }).eq('owner_id', ownerId).eq('source_sha256', sha256).eq('lock_token', lockToken);
    if (error) throw new Error('Não foi possível salvar a referência temporária do documento.');
    return { reference: ready, reused: false, retryCount: 0, uploadMs, processingMs };
  } catch (error: any) {
    await supabase.from('gemini_file_references').update({
      state: 'FAILED', last_error_code: String(error?.message || 'gemini_files_failed').slice(0, 500),
      updated_at: new Date().toISOString(), lock_token: null,
    }).eq('owner_id', ownerId).eq('source_sha256', sha256).eq('lock_token', lockToken);
    throw error;
  }
}
