const staticConfig = require('./app.json').expo;

module.exports = ({ config }) => ({
  ...config,
  runtimeVersion:
    process.env.EXPO_PUBLIC_APP_BETA === 'true'
      ? staticConfig.version
      : staticConfig.runtimeVersion,
});
