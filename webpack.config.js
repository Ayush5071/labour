const path = require('path');
const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Ensure imports that reference 'app' (expo-router) can be resolved when app is nested
  config.resolve = config.resolve || {};
  config.resolve.alias = {
    ...(config.resolve.alias || {}),
    app: path.resolve(__dirname, 'app')
  };

  // Polyfill Node core modules that some packages may require during the static build
  config.resolve.fallback = {
    ...(config.resolve.fallback || {}),
    path: require.resolve('path-browserify'),
    fs: false,
  };

  return config;
};