export function buildIdentificationOnlyLabelSearch(search: string): string {
  const params = new URLSearchParams(search);
  params.set('cat', 'identificacao');
  params.delete('category');
  return `?${params.toString()}`;
}
