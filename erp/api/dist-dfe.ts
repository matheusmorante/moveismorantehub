import type { VercelRequest, VercelResponse } from '@vercel/node';
import bridge from '../server/nfe/dist-dfe-bridge.cjs';

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<unknown>;
const compiledBridge = bridge as unknown as { default?: Handler } & Handler;

export default compiledBridge.default || compiledBridge;
