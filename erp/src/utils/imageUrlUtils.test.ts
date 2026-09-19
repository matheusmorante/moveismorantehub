import { describe, it, expect } from 'vitest';
import { getDerivedImageUrl } from './imageUrlUtils';

describe('imageUrlUtils - getDerivedImageUrl', () => {
    it('should derive medium and thumbnail correctly for simple jpg', () => {
        const url = 'https://media.com/foo.jpg';
        expect(getDerivedImageUrl(url, 'medium')).toBe('https://media.com/foo_medium.webp');
        expect(getDerivedImageUrl(url, 'thumbnail')).toBe('https://media.com/foo_thumb.webp');
    });

    it('should handle query strings', () => {
        const url = 'https://media.com/foo.png?v=123&sig=abc';
        expect(getDerivedImageUrl(url, 'medium')).toBe('https://media.com/foo_medium.webp?v=123&sig=abc');
    });

    it('should handle filenames with multiple dots', () => {
        const url = 'https://media.com/product.version2.final.jpeg';
        expect(getDerivedImageUrl(url, 'thumbnail')).toBe('https://media.com/product.version2.final_thumb.webp');
    });

    it('should not alter original if requested', () => {
        const url = 'https://media.com/foo.jpg';
        expect(getDerivedImageUrl(url, 'original')).toBe('https://media.com/foo.jpg');
    });

    it('should handle webp format originals', () => {
        const url = 'https://media.com/foo.webp';
        expect(getDerivedImageUrl(url, 'medium')).toBe('https://media.com/foo_medium.webp');
    });

    it('should not double-suffix if already suffixed', () => {
        const url = 'https://media.com/foo_medium.webp';
        expect(getDerivedImageUrl(url, 'thumbnail')).toBe('https://media.com/foo_medium.webp');
    });
});
