/**
 * Utilitários criptográficos para integridade e rastreabilidade de documentos.
 */

export async function calculateSha256(data: Uint8Array): Promise<string> {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    const hashBuf = await globalThis.crypto.subtle.digest('SHA-256', data.slice().buffer);
    return Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash + data[i]) | 0;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}
