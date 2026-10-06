import { supabase } from '@/pages/utils/supabaseConfig';
import type { FiscalIssueResult } from '@/pages/utils/nfe/fiscalIssuePresentation';

export async function consultSefazSituation(documentId: string): Promise<FiscalIssueResult> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error('Faça login novamente para consultar a SEFAZ.');
  }

  const response = await fetch('/api/nfe/consult', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session.access_token}`,
    },
    body: JSON.stringify({ documentId }),
  });

  const result: FiscalIssueResult = await response.json();
  if (result.state === 'not_found' && result.pending === false) {
    return result;
  }
  if (!response.ok || !result.success) {
    return result;
  }
  return result;
}

export async function retryHmlDocument(documentId: string): Promise<FiscalIssueResult> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error('Faça login novamente para retomar a tentativa HML.');
  }

  const response = await fetch('/api/nfe/emit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session.access_token}`,
    },
    body: JSON.stringify({ retryDocumentId: documentId }),
  });

  const result: FiscalIssueResult = await response.json();
  return result;
}
