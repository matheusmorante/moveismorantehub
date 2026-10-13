import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '57223c6866eff074ea23c53713031e60';
const accessKeyId = process.env.R2_ACCESS_KEY_ID || '294ae2d9aec3c5aef4dec5e72ea83816';
const secretAccessKey =
  process.env.R2_SECRET_ACCESS_KEY ||
  'f1960234d719d18a5f1acefc4b11dc63056ba0cacc3be4593c0d455f562c87a7';
const bucketName = process.env.R2_BUCKET_NAME || 'productsimages';
const publicUrlBase =
  process.env.R2_PUBLIC_URL ||
  process.env.NEXT_PUBLIC_R2_PUBLIC_URL ||
  'https://pub-389127050a434f568c29dc66bdce2567.r2.dev';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  forcePathStyle: true,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    } else if (!body && !req.readableEnded) {
      body = await new Promise((resolve) => {
        let raw = '';
        req.on('data', (chunk: any) => {
          raw += chunk;
        });
        req.on('end', () => {
          try {
            resolve(JSON.parse(raw));
          } catch {
            resolve({});
          }
        });
        req.on('error', () => resolve({}));
      });
    }

    const fileName = (body?.fileName || '').replace(/^\/+/, '');
    const contentType = body?.contentType || 'image/jpeg';

    if (!fileName) {
      return res.status(400).json({ error: 'fileName é obrigatório.' });
    }

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
    const fileUrl = `${publicUrlBase.replace(/\/$/, '')}/${fileName}`;

    return res.status(200).json({ uploadUrl, fileUrl });
  } catch (error: any) {
    console.error('Erro ao gerar presigned URL R2:', error);
    return res.status(500).json({ error: error.message || 'Erro interno ao preparar upload.' });
  }
}
