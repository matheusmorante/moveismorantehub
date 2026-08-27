const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ignora pastas de cache do kotlin/gradle geradas durante builds nativos
config.resolver.blockList = [
  /node_modules\/.*\/build\/kotlin\/.*/,
  /node_modules\/.*\/build\/tmp\/.*/,
  /node_modules\/expo-updates\/expo-updates-gradle-plugin\/.*/,
];

module.exports = config;
