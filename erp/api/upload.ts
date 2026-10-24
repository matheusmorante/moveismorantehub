import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';

// shortcut: 75 photos, update when the product gallery limit changes.
const MAX_PRODUCT_IMAGES_TO_COPY = 75;

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

const isMissingObject = (error: any) =>
  error?.name === 'NotFound' ||
  error?.name === 'NoSuchKey' ||
  error?.$metadata?.httpStatusCode === 404;

const copyProductImages = async (images: unknown[]): Promise<string[]> => {
  const publicBase = new URL(publicUrlBase);
  const basePath = publicBase.pathname.replace(/\/+$/, '');
  const plans = await Promise.all(
    images.map(async (image) => {
      if (typeof image !== 'string') throw new Error('Endereço de foto inválido para cópia.');
      let sourceUrl: URL;
      try {
        sourceUrl = new URL(image);
      } catch {
        throw new Error('Endereço de foto inválido para cópia.');
      }
      if (
        sourceUrl.origin !== publicBase.origin ||
        sourceUrl.username ||
        sourceUrl.password ||
        sourceUrl.search ||
        sourceUrl.hash ||
        !sourceUrl.pathname.startsWith(`${basePath}/`)
      ) {
        throw new Error('A foto não pertence ao armazenamento de imagens do catálogo.');
      }

      let sourceKey: string;
      try {
        sourceKey = decodeURIComponent(sourceUrl.pathname.slice(basePath.length + 1));
      } catch {
        throw new Error('Endereço de foto inválido para cópia.');
      }
      const keyParts = sourceKey.split('/');
      if (
        !sourceKey.startsWith('products/') ||
        keyParts.some((part) => !part || part === '.' || part === '..')
      ) {
        throw new Error('A foto não pertence ao armazenamento de produtos.');
      }

      const fileName = keyParts[keyParts.length - 1];
      const extension = fileName.match(/\.[a-z0-9]+$/i)?.[0] || '';
      const stem = extension ? fileName.slice(0, -extension.length) : fileName;
      const lowerStem = stem.toLowerCase();
      const derivedSuffix = lowerStem.endsWith('_medium')
        ? '_medium'
        : lowerStem.endsWith('_thumb')
          ? '_thumb'
          : '';
      const newBase = `products/${randomUUID()}`;
      const destinationKey = `${newBase}${derivedSuffix}${extension}`;
      const copies = [{ sourceKey, destinationKey }];

      if (!derivedSuffix) {
        const sourceDirectory = keyParts.slice(0, -1).join('/');
        const sourceStem = sourceDirectory ? `${sourceDirectory}/${stem}` : stem;
        for (const suffix of ['_medium.webp', '_thumb.webp']) {
          const derivedSourceKey = `${sourceStem}${suffix}`;
          try {
            await s3Client.send(
              new HeadObjectCommand({ Bucket: bucketName, Key: derivedSourceKey })
            );
            copies.push({
              sourceKey: derivedSourceKey,
              destinationKey: `${newBase}${suffix}`,
            });
          } catch (error) {
            if (!isMissingObject(error)) throw error;
          }
        }
      }

      try {
        await s3Client.send(new HeadObjectCommand({ Bucket: bucketName, Key: sourceKey }));
      } catch (error) {
        if (isMissingObject(error)) throw new Error('Uma das fotos originais não foi encontrada no armazenamento.');
        throw error;
      }

      return {
        url: `${publicUrlBase.replace(/\/$/, '')}/${destinationKey}`,
        copies,
      };
    })
  );

  const allCopies = plans.flatMap((plan) => plan.copies);
  try {
    for (let index = 0; index < allCopies.length; index += 10) {
      await Promise.all(
        allCopies.slice(index, index + 10).map(({ sourceKey, destinationKey }) =>
          s3Client.send(
            new CopyObjectCommand({
              Bucket: bucketName,
              Key: destinationKey,
              CopySource: `${bucketName}/${sourceKey.split('/').map(encodeURIComponent).join('/')}`,
            })
          )
        )
      );
    }
  } catch (error) {
    await Promise.all(
      allCopies.map(({ destinationKey }) =>
        s3Client
          .send(new DeleteObjectCommand({ Bucket: bucketName, Key: destinationKey }))
          .catch(() => undefined)
      )
    );
    throw error;
  }

  return plans.map((plan) => plan.url);
};

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

    if (body?.action === 'copy-product-images') {
      if (!Array.isArray(body.images) || body.images.length > MAX_PRODUCT_IMAGES_TO_COPY) {
        return res
          .status(400)
          .json({ error: `Informe até ${MAX_PRODUCT_IMAGES_TO_COPY} fotos para copiar.` });
      }
      const images = await copyProductImages(body.images);
      return res.status(200).json({ images });
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
    console.error('Erro na operação de imagens R2:', error);
    return res.status(500).json({ error: error.message || 'Erro interno ao preparar upload.' });
  }
}
