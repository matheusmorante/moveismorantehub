import { describe, expect, it } from 'vitest';
import { resolveAndroidReleaseUpdateState } from './androidReleaseRules';
import type { AndroidReleaseRecord } from './androidReleaseRules';

const release: AndroidReleaseRecord = {
  platform: 'android',
  version: '1.6.1',
  build_number: 24,
  min_supported_build: 23,
  storage_path: 'android/latest/morantehub.apk',
  file_size: 120_000_000,
  sha256: 'a'.repeat(64),
  is_mandatory: false,
  release_notes: 'Atualização de teste',
  updated_at: '2026-09-25T00:00:00.000Z',
};

describe('android release update policy', () => {
  it('does not offer an update when the installed build is current or newer', () => {
    expect(resolveAndroidReleaseUpdateState(24, release)).toMatchObject({ available: false, required: false });
    expect(resolveAndroidReleaseUpdateState(25, release)).toMatchObject({ available: false, required: false });
  });

  it('offers an optional update when the installed build still meets the minimum', () => {
    expect(resolveAndroidReleaseUpdateState(23, release)).toMatchObject({ available: true, required: false });
  });

  it('requires an update below the minimum supported build', () => {
    expect(resolveAndroidReleaseUpdateState(22, release)).toMatchObject({ available: true, required: true });
  });

  it('requires an update when the release is explicitly mandatory', () => {
    expect(resolveAndroidReleaseUpdateState(23, { ...release, is_mandatory: true }))
      .toMatchObject({ available: true, required: true });
  });

  it('ignores malformed metadata and paths outside the fixed Android release path', () => {
    expect(resolveAndroidReleaseUpdateState(1, { ...release, storage_path: 'android/v24/app.apk' }))
      .toMatchObject({ available: false, required: false, release: null });
    expect(resolveAndroidReleaseUpdateState(1, { ...release, sha256: 'invalid' }))
      .toMatchObject({ available: false, required: false, release: null });
  });
});
