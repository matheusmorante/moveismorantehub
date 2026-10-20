import { supabase } from '@/pages/utils/supabaseConfig';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
import type { FiscalPendencyItem } from '../types/fiscalPendencies.types';

const API_ENDPOINT = '/api/nfe/fiscal-pendencies';
const REQUEST_TIMEOUT_MS = 15_000;

export async function fetchFiscalPendencies(token?: string | null): Promise<FiscalPendencyItem[]> {
  let currentToken = token?.trim() || '';
  if (!currentToken) {
    const sessionResult = await withTimeout(
      supabase.auth.getSession(),
      REQUEST_TIMEOUT_MS,
      null,
      'fiscal-pendencies-session'
    );
    if (!sessionResult) throw new Error('A sessão expirou ao carregar as pendências fiscais.');
    currentToken = sessionResult.data.session?.access_token || '';
  }

  if (!currentToken) throw new Error('A sessão expirou ao carregar as pendências fiscais.');

  const response = await withTimeout(
    fetch(API_ENDPOINT, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentToken}`,
      },
    }),
    REQUEST_TIMEOUT_MS,
    null,
    'fiscal-pendencies-api'
  );
  if (!response) throw new Error('A consulta de pendências fiscais excedeu o tempo limite.');
  if (!response.ok) throw new Error('Não foi possível carregar as pendências fiscais.');

  const payload = await withTimeout(
    response.json() as Promise<{ success?: boolean; pendencies?: FiscalPendencyItem[] }>,
    REQUEST_TIMEOUT_MS,
    null,
    'fiscal-pendencies-response'
  );
  if (!payload) throw new Error('A resposta das pendências fiscais excedeu o tempo limite.');
  if (payload.success !== true || !Array.isArray(payload.pendencies)) {
    throw new Error('A resposta da consulta de pendências fiscais é inválida.');
  }
  return payload.pendencies;
}
