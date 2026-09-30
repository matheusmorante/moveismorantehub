import handler from '../../server/nfe/item-defaults.cjs';
export default (handler as unknown as { default?: typeof handler }).default || handler;
