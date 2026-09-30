import handler from '../../server/nfe/emit.cjs';
export default (handler as unknown as { default?: typeof handler }).default || handler;
