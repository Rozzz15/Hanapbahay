module.exports = function(api) {
    api.cache(true);

    return {
        presets: [
            "babel-preset-expo"
        ],
        plugins: [
            "react-native-reanimated/plugin",
            ["module-resolver", {
                root: ["./"],
                extensions: [
                    '.web.ts',
                    '.web.tsx',
                    '.ios.ts',
                    '.android.ts',
                    '.ts',
                    '.ios.tsx',
                    '.android.tsx',
                    '.tsx',
                    '.jsx',
                    '.js',
                    '.json',
                ],
                alias: {
                    "@": "./",
                    "tailwind.config": "./tailwind.config.js"
                }
            }]
        ]
    };
};