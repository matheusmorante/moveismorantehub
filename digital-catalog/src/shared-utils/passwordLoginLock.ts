export type PasswordLoginStatus = 'idle' | 'pending' | 'uncertain';

let status: PasswordLoginStatus = 'idle';
let noticeTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<(status: PasswordLoginStatus) => void>();

function updateStatus(nextStatus: PasswordLoginStatus): void {
  status = nextStatus;
  listeners.forEach((listener) => listener(status));
}

export function getPasswordLoginStatus(): PasswordLoginStatus {
  return status;
}

export function subscribePasswordLoginStatus(listener: (status: PasswordLoginStatus) => void): () => void {
  listeners.add(listener);
  listener(status);
  return () => {
    listeners.delete(listener);
  };
}

export function tryStartPasswordLogin(): boolean {
  if (status !== 'idle') return false;
  updateStatus('pending');
  noticeTimer = setTimeout(() => {
    noticeTimer = null;
    if (status === 'pending') updateStatus('uncertain');
  }, 20_000);
  return true;
}

export function finishPasswordLogin(): void {
  if (noticeTimer !== null) clearTimeout(noticeTimer);
  noticeTimer = null;
  if (status !== 'idle') updateStatus('idle');
}
