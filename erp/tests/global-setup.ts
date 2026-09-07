/**
 * globalSetup — Autentica no Supabase e salva a sessão para os testes E2E do Mobile
 *
 * Estratégia: usa email/senha (caso o projeto tenha um usuário de teste configurado)
 * ou injeta diretamente um token de serviço no localStorage do browser.
 *
 * Como o app mobile usa Google OAuth (sem senha), a estratégia correta é:
 * injetar a sessão diretamente no localStorage do Expo Web antes de cada teste.
 */

import { chromium } from '@playwright/test';

// Credenciais do usuário master (obtidas do supabaseClient)
const SUPABASE_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';

/**
 * Tenta fazer login com email+senha no Supabase Auth.
 * Retorna a session ou null se não conseguir.
 */
async function signInWithEmailPassword(email: string, password: string) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('[globalSetup] Erro ao autenticar:', err);
    return null;
  }

  return response.json();
}

export default async function globalSetup() {
  // Tenta autenticar com usuário master de teste
  // Ajuste o email/senha conforme o usuário de teste do seu Supabase
  const email = process.env.E2E_TEST_EMAIL || 'rosilene@moveismorante.com.br';
  const password = process.env.E2E_TEST_PASSWORD || '';

  if (!password) {
    console.warn('[globalSetup] ⚠️  E2E_TEST_PASSWORD não definido — testes vão usar sessão mockada');
    // Salva um marcador para que os testes usem modo mock
    process.env.E2E_USE_MOCK_SESSION = 'true';
    return;
  }

  const session = await signInWithEmailPassword(email, password);

  if (session?.access_token) {
    process.env.E2E_ACCESS_TOKEN = session.access_token;
    process.env.E2E_REFRESH_TOKEN = session.refresh_token;
    process.env.E2E_USER_ID = session.user?.id;
    console.log('[globalSetup] ✅ Sessão obtida para:', email);
  } else {
    console.warn('[globalSetup] ⚠️  Não foi possível obter sessão — continuando sem autenticação');
    process.env.E2E_USE_MOCK_SESSION = 'true';
  }
}
