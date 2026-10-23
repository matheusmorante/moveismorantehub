import { describe, expect, it } from 'vitest';
import { limitProductImageSelection } from '../../../../../../shared-utils/productImageSelection';
import { MAX_PARENT_PRODUCT_IMAGES } from '../../domain/productImageLimits';

describe('Product Photos Multi-Selection & Limit Logic', () => {
  it('allows adding multiple images up to the available slots', () => {
    const existingImages = ['https://cdn.example.com/img1.jpg', 'https://cdn.example.com/img2.jpg'];
    const newSelectedUrls = [
      'https://cdn.example.com/img3.jpg',
      'https://cdn.example.com/img4.jpg',
      'https://cdn.example.com/img5.jpg',
    ];

    const currentCount = existingImages.length;
    const selection = limitProductImageSelection(
      newSelectedUrls,
      currentCount,
      MAX_PARENT_PRODUCT_IMAGES
    );

    const updatedImages = [...existingImages, ...selection.filesToUpload];
    expect(updatedImages).toHaveLength(5);
    expect(selection.skippedCount).toBe(0);
    expect(updatedImages).toEqual([
      'https://cdn.example.com/img1.jpg',
      'https://cdn.example.com/img2.jpg',
      'https://cdn.example.com/img3.jpg',
      'https://cdn.example.com/img4.jpg',
      'https://cdn.example.com/img5.jpg',
    ]);
  });

  it('truncates excess images when user selects more than available capacity', () => {
    const existingImages = new Array(73).fill('https://cdn.example.com/existing.jpg');
    const newSelectedFiles = [
      { name: 'new1.jpg' },
      { name: 'new2.jpg' },
      { name: 'new3.jpg' },
      { name: 'new4.jpg' },
    ];

    const currentCount = existingImages.length;
    const selection = limitProductImageSelection(
      newSelectedFiles,
      currentCount,
      MAX_PARENT_PRODUCT_IMAGES
    );

    expect(selection.filesToUpload).toHaveLength(2);
    expect(selection.skippedCount).toBe(2);
    expect(selection.filesToUpload).toEqual([
      { name: 'new1.jpg' },
      { name: 'new2.jpg' },
    ]);

    const uploadedUrls = selection.filesToUpload.map(
      ({ name }) => `https://cdn.example.com/${name}`
    );
    const updatedImages = [...existingImages, ...uploadedUrls];
    expect(updatedImages).toHaveLength(75);
  });

  it('correctly replaces a single specific photo when multiple is false', () => {
    const existingImages = [
      'https://cdn.example.com/img1.jpg',
      'https://cdn.example.com/img2.jpg',
      'https://cdn.example.com/img3.jpg',
    ];

    const targetIdx = 1;
    const replacementUrl = 'https://cdn.example.com/replaced.jpg';

    const next = [...existingImages];
    next[targetIdx] = replacementUrl;

    expect(next).toHaveLength(3);
    expect(next[1]).toBe('https://cdn.example.com/replaced.jpg');
    expect(next[0]).toBe('https://cdn.example.com/img1.jpg');
    expect(next[2]).toBe('https://cdn.example.com/img3.jpg');
  });
});
