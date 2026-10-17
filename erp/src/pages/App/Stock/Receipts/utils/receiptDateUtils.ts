export function getSafeReceivedAt(receiptDate?: string): string {
  if (!receiptDate) return new Date().toISOString();
  const d = new Date(receiptDate.includes('T') ? receiptDate : `${receiptDate}T12:00:00`);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}
