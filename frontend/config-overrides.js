const { override, addWebpackModuleRule } = require('customize-cra');

module.exports = override(
  (config) => {
    // Resolver el problema de allowedHosts
    if (config.devServer) {
      config.devServer.allowedHosts = 'all';
    }
    return config;
  }
);
