import { forwardReconciliation } from '@/services/meta-catalog/forwardReconciliation';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (typeof body?.productId !== 'string' || !body.productId.trim()) {
    return Response.json({ error: 'Identificador do produto inválido.' }, { status: 400 });
  }
  return forwardReconciliation(request.headers.get('authorization'), body.productId);
}
