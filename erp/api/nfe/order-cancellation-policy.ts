import handler from '../../server/nfe/order-cancellation-policy.cjs';

export default (handler as unknown as { default?: typeof handler }).default || handler;
