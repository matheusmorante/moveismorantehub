import handler from '../../server/nfe/order-fiscal-badges.cjs';

export default (handler as unknown as { default?: typeof handler }).default || handler;
