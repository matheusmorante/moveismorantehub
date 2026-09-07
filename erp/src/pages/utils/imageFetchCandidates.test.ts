import { describe, expect, it } from 'vitest';
import { buildImageFetchCandidates } from './imageFetchCandidates';

describe('buildImageFetchCandidates', () => {
    it('prioriza o proxy local para imagens R2', () => {
        expect(buildImageFetchCandidates('https://bucket.r2.dev/fotos/mesa.png')).toEqual([
            '/r2-proxy/fotos/mesa.png',
            'https://bucket.r2.dev/fotos/mesa.png',
            'https://images.weserv.nl/?url=https%3A%2F%2Fbucket.r2.dev%2Ffotos%2Fmesa.png',
            'https://api.allorigins.win/raw?url=https%3A%2F%2Fbucket.r2.dev%2Ffotos%2Fmesa.png',
        ]);
    });

    it('preserva a opção de não usar proxy público em origens não HTTP', () => {
        expect(buildImageFetchCandidates('blob:local-image')).toEqual(['blob:local-image']);
        expect(buildImageFetchCandidates('blob:local-image', true)).toHaveLength(3);
    });
});
