import { describe, expect, it } from 'vitest';
import { extractNfeAccessKey } from './accessKey';

const key = '41260912345678000195550010000012341000012345';

describe('extractNfeAccessKey', () => {
  it('extracts the 44-digit key from a barcode or spaced QR payload', () => {
    expect(extractNfeAccessKey(key)).toBe(key);
    expect(extractNfeAccessKey(key.match(/.{1,4}/g)!.join(' '))).toBe(key);
  });

  it('extracts a standalone key embedded in a QR URL', () => {
    expect(extractNfeAccessKey(`https://sefaz.example/nfe?chNFe=${key}&version=2`)).toBe(key);
  });
  it('preserves the alphanumeric CNPJ segment in barcode and QR payloads', () => {
    const alphaKey = key.slice(0, 10) + 'A' + key.slice(11);
    expect(extractNfeAccessKey(alphaKey.toLowerCase())).toBe(alphaKey);
    expect(extractNfeAccessKey(`https://sefaz.example/nfe?chNFe=${alphaKey}&version=2`)).toBe(alphaKey);
  });

  it('rejects payloads without exactly one standalone 44-digit key', () => {
    expect(extractNfeAccessKey('123456789')).toBeNull();
    expect(extractNfeAccessKey(`${key}7`)).toBeNull();
  });
});
