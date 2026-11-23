/** As rotas do Catálogo Digital compartilham a autorização e a trava do ERP. */
export async function forwardReconciliation(authorization: string | null, productId?: string) {
  if (!authorization || !/^Bearer\s+\S+$/i.test(authorization)) {
    return Response.json({ error: 'Sessão inválida. Entre novamente.' }, { status: 401 });
  }
  const apiBase = process.env.ERP_API_URL?.trim()
    || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://morantehub.vercel.app');
  try {
    const response = await fetch(apiBase.replace(/\/+$/, '') + '/api/meta-graph', {
      method: 'POST',
      headers: { Authorization: authorization, 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation: 'reconcile_catalog', productId }),
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(productId ? 55_000 : 280_000),
    });
    return Response.json(await response.json(), { status: response.status });
  } catch {
    return Response.json({ error: 'Reconciliação do Catálogo Meta indisponível.' }, { status: 503 });
  }
}
