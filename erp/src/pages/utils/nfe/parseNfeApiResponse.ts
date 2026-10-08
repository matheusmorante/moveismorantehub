export async function parseNfeApiResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const contentType = response.headers.get('content-type')?.toLowerCase() || '';
  if (!contentType.includes('json')) {
    if (!response.ok) throw new Error(`${fallbackMessage} (HTTP ${response.status}).`);
    throw new Error(
      'A API fiscal retornou uma página HTML em vez de dados. Verifique a disponibilidade da rota fiscal.'
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new Error('A API fiscal retornou uma resposta JSON inválida.');
  }
}
