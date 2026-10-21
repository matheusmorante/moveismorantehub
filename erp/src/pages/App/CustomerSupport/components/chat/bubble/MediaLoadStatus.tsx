import React from 'react';

export function MediaLoadStatus({ loading, error, onRetry }: {
  loading: boolean;
  error: string;
  onRetry: () => void;
}) {
  if (loading) return <p role="status" className="p-2 text-xs text-slate-500 animate-pulse">Carregando mídia…</p>;
  if (!error) return null;
  return (
    <div role="alert" className="p-2 text-xs text-amber-700 dark:text-amber-400">
      <p>{error}</p>
      <button type="button" onClick={onRetry} className="mt-1 underline font-semibold">Tentar novamente</button>
    </div>
  );
}
