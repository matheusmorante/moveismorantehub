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
