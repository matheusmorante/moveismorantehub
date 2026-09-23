const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// expo-sqlite loads this asset from its web worker; Metro must serve WASM as an asset.
config.resolver.assetExts = [...new Set([...config.resolver.assetExts, 'wasm'])];

// Ignora pastas de cache do kotlin/gradle geradas durante builds nativos
config.resolver.blockList = [
  /node_modules\/.*\/build\/kotlin\/.*/,
  /node_modules\/.*\/build\/tmp\/.*/,
  /node_modules\/expo-updates\/expo-updates-gradle-plugin\/.*/,
];

module.exports = config;
