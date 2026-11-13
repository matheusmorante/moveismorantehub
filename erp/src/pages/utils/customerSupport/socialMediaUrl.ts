const META_MEDIA_HOSTS = ['fbcdn.net', 'fbsbx.com', 'cdninstagram.com'];

export function normalizeMetaSocialMediaUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const isMetaHost = META_MEDIA_HOSTS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
    if (url.protocol !== 'https:' || !isMetaHost || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function isMetaSocialMediaUrl(value: unknown): value is string {
  return normalizeMetaSocialMediaUrl(value) !== null;
}
