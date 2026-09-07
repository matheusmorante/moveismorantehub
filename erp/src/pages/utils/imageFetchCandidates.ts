export function buildImageFetchCandidates(
    rawUrl: string,
    includePublicProxiesForNonHttp = false,
): string[] {
    const candidates: string[] = [];

    if (rawUrl.includes('.r2.dev')) {
        try {
            candidates.push(`/r2-proxy${new URL(rawUrl).pathname}`);
        } catch {
            const r2Index = rawUrl.indexOf('.r2.dev');
            if (r2Index !== -1) candidates.push(`/r2-proxy${rawUrl.substring(r2Index + 7)}`);
        }
    }

    candidates.push(rawUrl);

    if (includePublicProxiesForNonHttp || rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
        candidates.push(`https://images.weserv.nl/?url=${encodeURIComponent(rawUrl)}`);
        candidates.push(`https://api.allorigins.win/raw?url=${encodeURIComponent(rawUrl)}`);
    }

    return candidates;
}
