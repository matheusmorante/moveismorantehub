function assertVercelDevelopment(env = process.env) {
  if (env.MORANTE_ENV_SOURCE !== 'vercel-development') {
    throw new Error('Start Development with `npm run dev` to load Vercel variables.');
  }
  if (env.NFE_ENVIRONMENT && env.NFE_ENVIRONMENT !== '2') {
    throw new Error('Development requires NFE_ENVIRONMENT=2 (Homologacao).');
  }
}
module.exports = {assertVercelDevelopment};
if (require.main === module) {
  try {assertVercelDevelopment();} catch (error) {console.error(error.message);process.exitCode=1;}
}
