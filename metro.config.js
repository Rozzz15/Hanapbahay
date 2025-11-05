const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Basic configuration
config.resolver.platforms = ['ios', 'android', 'native', 'web'];
config.resolver.sourceExts = ['js', 'jsx', 'json', 'ts', 'tsx', 'cjs', 'css', 'mjs'];

// Fix Metro watcher ENOENT error
config.watchFolders = [
  path.resolve(__dirname, 'node_modules/@supabase/postgrest-js/dist/esm'),
];
config.resolver.blockList = [
  /node_modules\/@tybys\/wasm-util\/dist/,
];

// Simple resolver configuration
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.unstable_enablePackageExports = false;
config.resolver.unstable_enableSymlinks = false;

// Add transformer to handle require.context
config.transformer = {
  ...config.transformer,
  unstable_allowRequireContext: true,
};

// Custom resolver removed - using default Metro resolver
// The previous custom resolver was using Node.js fs which can cause issues in Expo Go
// Metro's default resolver should handle module resolution correctly

module.exports = config;