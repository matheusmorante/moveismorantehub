import handler from '../../server/nfe/inbound-manifestation.cjs';
export default (handler as unknown as { default?: typeof handler }).default || handler;
