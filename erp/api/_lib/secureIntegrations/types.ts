import type { VercelRequest } from '@vercel/node';

export type SecureOperation = 'meta-graph' | 'gemini-proxy' | 'google-routes' | 'openai-proxy';

export const MAX_META_REQUEST_BYTES = 1_000_000;
export const MAX_GEMINI_REQUEST_BYTES = 1_000_000;
export const MAX_OPENAI_REQUEST_BYTES = 4_000_000;
export const MAX_ROUTE_REQUEST_BYTES = 16_000;

export const MODEL_PATTERN = /^gemini-[a-z0-9][a-z0-9.-]{0,100}$/i;
export const OPENAI_MODEL_PATTERN = /^(gpt-6-luna|gpt-5\.6-luna|gpt-6-sol|gpt-6-astra|gpt-5\.2-pro|gpt-5(-mini|-nano|-pro)?|gpt-4o(-mini)?)$/i;
export const OPENAI_EMBEDDING_MODEL_PATTERN = /^text-embedding-3-(small|large)$/i;
export const ALLOWED_GEMINI_FIELDS = new Set(['content', 'contents', 'generationConfig', 'tools', 'toolConfig', 'systemInstruction']);
export const ROUTES_FIELD_MASK = 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline';
export const GRAPH_VERSION = 'v26.0';

export function bodySize(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value ?? {}), 'utf8');
}

export function getOperation(req: VercelRequest): string {
  const value = req.query?.operation;
  return Array.isArray(value) ? String(value[0] || '') : String(value || '');
}
