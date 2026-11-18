type SessionCacheInvalidator = () => void;

const sessionCacheInvalidators = new Set<SessionCacheInvalidator>();

export const registerSessionCacheInvalidator = (
  invalidate: SessionCacheInvalidator,
) => {
  sessionCacheInvalidators.add(invalidate);
};

export const invalidateSessionScopedCaches = () => {
  sessionCacheInvalidators.forEach((invalidate) => invalidate());
};
