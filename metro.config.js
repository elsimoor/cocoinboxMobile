const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('cjs');
// Enable support for package.json "exports" (required by @noble/* ESM)
config.resolver.unstable_enablePackageExports = true;

module.exports = config;