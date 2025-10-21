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

// Custom resolver to handle problematic modules
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Handle @radix-ui/react-slot
  if (moduleName === '@radix-ui/react-slot') {
    const possiblePaths = [
      path.resolve(__dirname, 'node_modules/@radix-ui/react-slot/dist/index.js'),
      path.resolve(__dirname, 'node_modules/expo-router/node_modules/@radix-ui/react-slot/dist/index.js'),
      path.resolve(__dirname, 'node_modules/expo-router/node_modules/@radix-ui/react-slot/dist/index.mjs'),
    ];
    
    for (const filePath of possiblePaths) {
      try {
        if (require('fs').existsSync(filePath)) {
          return {
            type: 'sourceFile',
            filePath: filePath,
          };
        }
      } catch (e) {
        // Continue to next path
      }
    }
  }
  
  // Handle @supabase/postgrest-js
  if (moduleName === '@supabase/postgrest-js') {
    const possiblePaths = [
      path.resolve(__dirname, 'node_modules/@supabase/postgrest-js/dist/esm/wrapper.mjs'),
      path.resolve(__dirname, 'node_modules/@supabase/postgrest-js/dist/cjs/index.js'),
    ];
    
    for (const filePath of possiblePaths) {
      try {
        if (require('fs').existsSync(filePath)) {
          return {
            type: 'sourceFile',
            filePath: filePath,
          };
        }
      } catch (e) {
        // Continue to next path
      }
    }
  }
  
  // Continue with the default resolver for other modules
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;