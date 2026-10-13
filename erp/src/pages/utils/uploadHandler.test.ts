import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSignedUrl = vi.fn();

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: (...args: any[]) => mockGetSignedUrl(...args),
}));

vi.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: vi.fn().mockImplementation(() => ({})),
    PutObjectCommand: vi.fn().mockImplementation((params) => params),
  };
});

describe('upload serverless handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockReqRes = (options: {
    method?: string;
    body?: any;
  }) => {
    const headers: Record<string, string> = {};
    const req: any = {
      method: options.method || 'POST',
      body: options.body,
      headers: {},
      readableEnded: true,
    };

    const res: any = {
      statusCode: 200,
      headersSent: false,
      jsonBody: null,
      setHeader: vi.fn((key: string, value: string) => {
        headers[key] = value;
      }),
      status: vi.fn(function (code: number) {
        res.statusCode = code;
        return res;
      }),
      json: vi.fn(function (data: any) {
        res.jsonBody = data;
        return res;
      }),
      end: vi.fn(function () {
        return res;
      }),
    };

    return { req, res, headers };
  };

  it('handles CORS OPTIONS preflight request with 200', async () => {
    const { default: handler } = await import('../../../api/upload');
    const { req, res } = createMockReqRes({ method: 'OPTIONS' });

    await handler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.end).toHaveBeenCalled();
  });

  it('rejects unsupported HTTP methods with 405', async () => {
    const { default: handler } = await import('../../../api/upload');
    const { req, res } = createMockReqRes({ method: 'GET' });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.jsonBody).toEqual({ error: 'Método não permitido.' });
  });

  it('rejects POST request without fileName with 400', async () => {
    const { default: handler } = await import('../../../api/upload');
    const { req, res } = createMockReqRes({ method: 'POST', body: {} });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.jsonBody).toEqual({ error: 'fileName é obrigatório.' });
  });

  it('generates presigned upload URL and public URL on valid payload', async () => {
    const { default: handler } = await import('../../../api/upload');
    mockGetSignedUrl.mockResolvedValueOnce('https://r2.cloudflarestorage.com/mock-signed-url');

    const { req, res } = createMockReqRes({
      method: 'POST',
      body: {
        fileName: 'products/mesa-madeira.webp',
        contentType: 'image/webp',
      },
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.jsonBody).toEqual({
      uploadUrl: 'https://r2.cloudflarestorage.com/mock-signed-url',
      fileUrl: expect.stringContaining('/products/mesa-madeira.webp'),
    });
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
  });

  it('handles errors from presigner with 500', async () => {
    const { default: handler } = await import('../../../api/upload');
    mockGetSignedUrl.mockRejectedValueOnce(new Error('S3 error'));

    const { req, res } = createMockReqRes({
      method: 'POST',
      body: { fileName: 'products/error.jpg' },
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.jsonBody).toEqual({ error: 'S3 error' });
  });
});
