import handler from '../../server/nfe/document-details.cjs';

export default (handler as unknown as { default?: typeof handler }).default || handler;
