import { describe, expect, it } from 'vitest';

const MAX_PRODUCT_IMAGES = 75;

describe('Product Photos Multi-Selection & Limit Logic', () => {
  it('allows adding multiple images up to the available slots', () => {
    const existingImages = ['https://cdn.example.com/img1.jpg', 'https://cdn.example.com/img2.jpg'];
    const newSelectedUrls = [
      'https://cdn.example.com/img3.jpg',
      'https://cdn.example.com/img4.jpg',
      'https://cdn.example.com/img5.jpg',
    ];

    const currentCount = existingImages.length;
    const availableSlots = MAX_PRODUCT_IMAGES - currentCount;
    const urlsToAdd = newSelectedUrls.slice(0, availableSlots);

    const updatedImages = [...existingImages, ...urlsToAdd];
    expect(updatedImages).toHaveLength(5);
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
    const newSelectedUrls = [
      'https://cdn.example.com/new1.jpg',
      'https://cdn.example.com/new2.jpg',
      'https://cdn.example.com/new3.jpg',
      'https://cdn.example.com/new4.jpg',
    ];

    const currentCount = existingImages.length;
    const availableSlots = MAX_PRODUCT_IMAGES - currentCount; // 75 - 73 = 2
    const urlsToAdd = newSelectedUrls.slice(0, availableSlots);

    expect(urlsToAdd).toHaveLength(2);
    expect(urlsToAdd).toEqual([
      'https://cdn.example.com/new1.jpg',
      'https://cdn.example.com/new2.jpg',
    ]);

    const updatedImages = [...existingImages, ...urlsToAdd];
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
