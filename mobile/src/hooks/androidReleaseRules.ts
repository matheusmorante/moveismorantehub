export const ANDROID_RELEASE_STORAGE_PATH = 'android/latest/morantehub.apk';

export type AndroidReleaseRecord = {
  platform: 'android';
  version: string;
  build_number: number;
  min_supported_build: number;
  storage_path: string;
  file_size: number;
  sha256: string;
  is_mandatory: boolean;
  release_notes: string | null;
  updated_at: string;
};

export type AndroidReleaseUpdateState = {
  available: boolean;
  required: boolean;
  release: AndroidReleaseRecord | null;
};

export function resolveAndroidReleaseUpdateState(
  installedBuild: number,
  candidate: AndroidReleaseRecord | null | undefined,
): AndroidReleaseUpdateState {
  if (
    !candidate
    || candidate.platform !== 'android'
    || !candidate.version
    || !Number.isSafeInteger(candidate.build_number)
    || candidate.build_number <= 0
    || !Number.isSafeInteger(candidate.min_supported_build)
    || candidate.min_supported_build <= 0
    || candidate.min_supported_build > candidate.build_number
    || candidate.storage_path !== ANDROID_RELEASE_STORAGE_PATH
    || !Number.isSafeInteger(candidate.file_size)
    || candidate.file_size <= 0
    || !/^[a-f0-9]{64}$/i.test(candidate.sha256)
  ) {
    return { available: false, required: false, release: null };
  }

  const available = installedBuild < candidate.build_number;
  return {
    available,
    required: available && (candidate.is_mandatory || installedBuild < candidate.min_supported_build),
    release: candidate,
  };
}
