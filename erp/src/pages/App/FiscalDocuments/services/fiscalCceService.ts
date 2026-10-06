import { supabase } from '@/pages/utils/supabaseConfig';

export interface CceHistoryResult {
  previousCorrection?: string;
  nextSequence?: number | null;
  pending?: boolean;
}

export interface CceSubmitParams {
  documentId: string;
  correction: string;
  requestId: string;
  productionConfirmed: boolean;
}

export async function fetchCceHistory(documentId: string): Promise<CceHistoryResult> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error('Faça login novamente para consultar o histórico de CC-e.');
  }

  const response = await fetch(`/api/nfe/cce?documentId=${encodeURIComponent(documentId)}`, {
    headers: { Authorization: `Bearer ${data.session.access_token}` },
  });

  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Não foi possível consultar o histórico de CC-e.');
  }

  return {
    previousCorrection: String(result.previousCorrection || ''),
    nextSequence: typeof result.nextSequence === 'number' ? result.nextSequence : null,
    pending: Boolean(result.pending),
  };
}

export async function submitCce({
  documentId,
  correction,
  requestId,
  productionConfirmed,
}: CceSubmitParams) {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error('Faça login novamente para transmitir a CC-e.');
  }

  const response = await fetch('/api/nfe/cce', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session.access_token}`,
    },
    body: JSON.stringify({
      action: 'transmit',
      documentId,
      correction,
      requestId,
      productionConfirmed,
    }),
  });

  return response.json();
}

export async function reconcileCce(documentId: string) {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error('Faça login novamente para consultar a tentativa.');
  }

  const response = await fetch('/api/nfe/cce', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session.access_token}`,
    },
    body: JSON.stringify({ action: 'reconcile', documentId }),
  });

  return response.json();
}
