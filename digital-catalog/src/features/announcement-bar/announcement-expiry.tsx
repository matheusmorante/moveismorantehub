'use client';

import { useEffect, useState, type ReactNode } from 'react';

const MAX_TIMEOUT_MS = 2_147_483_647;

export function AnnouncementExpiry({ endsAt, children }: { endsAt: string; children: ReactNode }) {
  const [expiredAt, setExpiredAt] = useState<string>();

  useEffect(() => {
    const deadline = Date.parse(endsAt);
    if (!Number.isFinite(deadline)) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    function checkDeadline() {
      clearTimeout(timer);
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        setExpiredAt(endsAt);
        return;
      }
      timer = setTimeout(checkDeadline, Math.min(remaining, MAX_TIMEOUT_MS));
    }

    checkDeadline();
    document.addEventListener('visibilitychange', checkDeadline);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', checkDeadline);
    };
  }, [endsAt]);

  return expiredAt === endsAt ? null : children;
}
