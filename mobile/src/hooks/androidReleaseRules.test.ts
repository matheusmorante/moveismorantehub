import { describe, expect, it } from 'vitest';
import { resolveAndroidReleaseUpdateState } from './androidReleaseRules';
import type { AndroidReleaseRecord } from './androidReleaseRules';

const DRIVE_URL = 'https://drive.usercontent.google.com/download?id=abc123&export=download&confirm=t';

const release: AndroidReleaseRecord = {
  platform: 'android',
  version: '1.6.0',
  build_number: 23,
  min_supported_build: 19,
  storage_path: 'drive',
  file_size: 109983744,
  sha256: 'a'.repeat(64),
  is_mandatory: false,
  release_notes: 'Atualização de teste',
  download_url: DRIVE_URL,
  updated_at: '2026-09-25T00:00:00.000Z',
};

describe('android release update policy', () => {
  it('does not offer an update when the installed build is current or newer', () => {
    expect(resolveAndroidReleaseUpdateState(23, release)).toMatchObject({ available: false, required: false });
    expect(resolveAndroidReleaseUpdateState(25, release)).toMatchObject({ available: false, required: false });
  });

  it('offers an optional update when the installed build still meets the minimum', () => {
    expect(resolveAndroidReleaseUpdateState(20, release)).toMatchObject({ available: true, required: false });
  });

  it('requires an update below the minimum supported build', () => {
    expect(resolveAndroidReleaseUpdateState(18, release)).toMatchObject({ available: true, required: true });
  });

  it('requires an update when the release is explicitly mandatory', () => {
    expect(resolveAndroidReleaseUpdateState(20, { ...release, is_mandatory: true }))
      .toMatchObject({ available: true, required: true });
  });

  it('ignores records without download_url', () => {
    expect(resolveAndroidReleaseUpdateState(1, { ...release, download_url: null }))
      .toMatchObject({ available: false, required: false, release: null });
    expect(resolveAndroidReleaseUpdateState(1, { ...release, download_url: '' }))
      .toMatchObject({ available: false, required: false, release: null });
  });
});
