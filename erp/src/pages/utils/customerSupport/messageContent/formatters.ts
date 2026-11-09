export function formatReceivedValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(formatReceivedValue).filter(Boolean).join(', ');
  if (value && typeof value === 'object') {
    return Object.entries(value)
      .map(([key, item]) => key.replace(/[_-]+/g, ' ') + ': ' + formatReceivedValue(item))
      .join('; ');
  }
  return String(value ?? '');
}

export function removeFlowToken(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(removeFlowToken);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key.toLowerCase() !== 'flow_token')
        .map(([key, item]) => [key, removeFlowToken(item)])
    );
  }
  return value;
}
