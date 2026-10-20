import type { VercelRequest, VercelResponse } from '@vercel/node';
declare const handler: (req: VercelRequest, res: VercelResponse) => Promise<unknown>;
export default handler;
