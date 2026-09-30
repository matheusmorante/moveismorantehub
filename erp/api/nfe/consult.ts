import handler from '../../server/nfe/consult.cjs';
export default (handler as unknown as { default?: typeof handler }).default || handler;
