import secureIntegrations from '../server/secure-api/secure-integrations.cjs';

// The build bundles shared workspace modules in CJS before Vercel loads this route.
export default secureIntegrations.default;
