import { createHash } from 'node:crypto';
import { canonicalFiscalCommand } from './normal-sale/attemptPolicy';
import type { FiscalDocument, FiscalSnapshotCandidate } from './fiscalSnapshot';

export function fiscalPreviewFingerprint(
  snapshot: FiscalSnapshotCandidate,
  document: FiscalDocument,
  identity: { series: string; number: number; accessKey: string; issuedAt: string },
  signedXml: string
): string {
  const frozenFacts = { ...snapshot } as Record<string, unknown>;
  delete frozenFacts.capturedAt;
  delete frozenFacts.persistedHash;
  // The database stores this duplicate trace beside resolvedDocument.decisions.
  // It is added only after preview, so it cannot participate in the preview fingerprint.
  delete frozenFacts.decisionTrace;
  const { snapshotHash: _snapshotHash, ...frozenDocument } = document;
  return createHash('sha256')
    .update(
      canonicalFiscalCommand({
        snapshot: frozenFacts,
        document: frozenDocument,
        identity,
        signedXmlSha256: createHash('sha256').update(signedXml).digest('hex'),
      })
    )
    .digest('hex');
}
