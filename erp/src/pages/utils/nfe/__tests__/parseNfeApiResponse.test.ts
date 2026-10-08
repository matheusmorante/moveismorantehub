import { describe, expect, it } from 'vitest';
import { parseNfeApiResponse } from '../parseNfeApiResponse';

describe('parseNfeApiResponse', () => {
  it('lê uma resposta JSON da API fiscal', async () => {
    const response = new Response(JSON.stringify({ action: 'cancel' }), {
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });

    await expect(parseNfeApiResponse(response, 'Falha fiscal')).resolves.toEqual({
      action: 'cancel',
    });
  });

  it('substitui o erro de parse por mensagem útil quando a rota retorna HTML', async () => {
    const response = new Response('<!DOCTYPE html><html></html>', {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });

    await expect(parseNfeApiResponse(response, 'Falha fiscal')).rejects.toThrow(
      'A API fiscal retornou uma página HTML'
    );
  });

  it('informa o status HTTP quando uma rota indisponível retorna HTML com erro', async () => {
    const response = new Response('<!DOCTYPE html><html></html>', {
      status: 404,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });

    await expect(parseNfeApiResponse(response, 'Falha fiscal')).rejects.toThrow(
      'Falha fiscal (HTTP 404)'
    );
  });
});
