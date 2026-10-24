const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
config.watchFolders = [
  ...(config.watchFolders || []),
  path.resolve(__dirname, '../shared-utils'),
  path.resolve(__dirname, '../erp/src/pages/utils'),
];
// Shared schemas outside the app resolve dependencies from the mobile installation.
config.resolver.nodeModulesPaths = [...new Set([
  path.resolve(__dirname, 'node_modules'),
  ...(config.resolver.nodeModulesPaths || []),
])];
// expo-sqlite loads this asset from its web worker; Metro must serve WASM as an asset.
config.resolver.assetExts = [...new Set([...config.resolver.assetExts, 'wasm'])];

// Ignora pastas de cache do kotlin/gradle geradas durante builds nativos
config.resolver.blockList = [
  /node_modules\/.*\/build\/kotlin\/.*/,
  /node_modules\/.*\/build\/tmp\/.*/,
  /node_modules\/expo-updates\/expo-updates-gradle-plugin\/.*/,
];

module.exports = config;
