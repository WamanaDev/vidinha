module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["."],
          alias: {
            "@app": "./app",
            "@features": "./src/features",
            "@components": "./src/components",
            "@lib": "./src/lib",
            "@stores": "./src/stores",
            "@config": "./src/config",
            "@app-types": "./src/types",
            "@assets": "./assets",
          },
        },
      ],
      // Deve ser o último plugin (specs/mobile/00-overview.md §1.1)
      "react-native-reanimated/plugin",
    ],
  };
};
