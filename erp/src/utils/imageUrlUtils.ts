export type ImageSize = 'thumbnail' | 'medium' | 'original';

export const getDerivedImageUrl = (originalUrl: string, targetSize: ImageSize): string => {
    if (!originalUrl || targetSize === 'original') return originalUrl;
    
    // Prevent double processing
    if (originalUrl.includes('_medium.webp') || originalUrl.includes('_thumb.webp')) {
        return originalUrl;
    }

    try {
        const urlObj = new URL(originalUrl);
        const pathParts = urlObj.pathname.split('/');
        const filename = pathParts.pop();

        if (!filename) return originalUrl;

        // Strip extension robustly
        const lastDotIndex = filename.lastIndexOf('.');
        let baseName = filename;
        if (lastDotIndex > 0) { // must be > 0 so .hidden files aren't stripped of their only name
            baseName = filename.substring(0, lastDotIndex);
        }

        const ext = targetSize === 'thumbnail' ? '_thumb.webp' : '_medium.webp';
        pathParts.push(`${baseName}${ext}`);
        urlObj.pathname = pathParts.join('/');
        
        return urlObj.toString();
    } catch (e) {
        // Fallback for relative paths or invalid URLs
        const lastDotIndex = originalUrl.lastIndexOf('.');
        if (lastDotIndex > 0) {
            const baseUrl = originalUrl.substring(0, lastDotIndex);
            const ext = targetSize === 'thumbnail' ? '_thumb.webp' : '_medium.webp';
            return `${baseUrl}${ext}`;
        }
        return originalUrl;
    }
};
