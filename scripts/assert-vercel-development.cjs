function assertVercelDevelopment(env = process.env) {
  if (env.MORANTE_ENV_SOURCE !== 'vercel-development' || env.VERCEL_ENV !== 'development') {
    throw new Error('Start Development with `npm run dev` to load Vercel variables.');
  }
}
module.exports = {assertVercelDevelopment};
if (require.main === module) {
  try {assertVercelDevelopment();} catch (error) {console.error(error.message);process.exitCode=1;}
}
