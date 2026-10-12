import { timingSafeEqual } from 'node:crypto';

export const AUTOMATIC_RETURN_WORKER_SECRET_HEADER = 'x-nfe-return-worker-secret';

export function isAutomaticReturnWorkerAuthorized(
  header: unknown,
  expectedSecret = process.env.NFE_RETURN_AUTO_WORKER_SECRET
): boolean {
  const headerValue = Array.isArray(header) ? header[0] : header;
  const suppliedSecret = String(headerValue || '').trim();
  if (!expectedSecret || !suppliedSecret) return false;

  const supplied = Buffer.from(suppliedSecret);
  const expected = Buffer.from(expectedSecret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
