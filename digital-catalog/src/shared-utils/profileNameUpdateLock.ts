import { AUTH_OPERATION_TIMEOUT_MS } from '@/shared-utils/authOperationTimeout';

export type ProfileNameUpdateStatus = 'idle' | 'pending' | 'uncertain';

// shortcut: the lock is shared within this browser tab, not across tabs or devices.
let status: ProfileNameUpdateStatus = 'idle';
let noticeTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<(nextStatus: ProfileNameUpdateStatus) => void>();

function updateStatus(nextStatus: ProfileNameUpdateStatus): void {
  status = nextStatus;
  listeners.forEach((listener) => listener(status));
}

export function getProfileNameUpdateStatus(): ProfileNameUpdateStatus {
  return status;
}

export function subscribeProfileNameUpdateStatus(listener: (status: ProfileNameUpdateStatus) => void): () => void {
  listeners.add(listener);
  listener(status);
  return () => {
    listeners.delete(listener);
  };
}

export function tryStartProfileNameUpdate(): boolean {
  if (status !== 'idle') return false;

  updateStatus('pending');
  noticeTimer = setTimeout(() => {
    noticeTimer = null;
    if (status === 'pending') updateStatus('uncertain');
  }, AUTH_OPERATION_TIMEOUT_MS);

  return true;
}

export function finishProfileNameUpdate(): void {
  if (noticeTimer !== null) clearTimeout(noticeTimer);
  noticeTimer = null;
  if (status !== 'idle') updateStatus('idle');
}
