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
  download_url: string | null;
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
    || !candidate.download_url
    || !/^https?:\/\/.+/i.test(candidate.download_url)
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
