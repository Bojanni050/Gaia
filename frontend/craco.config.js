// craco.config.js
const path = require("path");
require("dotenv").config();

// Check if we're in development/preview mode (not production build)
// Craco sets NODE_ENV=development for start, NODE_ENV=production for build
const isDevServer = process.env.NODE_ENV !== "production";

// Environment variable overrides
const config = {
  enableHealthCheck: process.env.ENABLE_HEALTH_CHECK === "true",
};

function makeDevServerV5Compatible(devServerConfig) {
  const {
    https,
    onAfterSetupMiddleware,
    onBeforeSetupMiddleware,
    onListening,
    setupMiddlewares,
    ...compatibleConfig
  } = devServerConfig;

  compatibleConfig.server =
    typeof https === "object"
      ? { type: "https", options: https }
      : https
        ? "https"
        : "http";
  compatibleConfig.headers = {
    ...compatibleConfig.headers,
    "Cross-Origin-Resource-Policy": "same-origin",
  };

  if (onBeforeSetupMiddleware || setupMiddlewares) {
    compatibleConfig.setupMiddlewares = (middlewares, devServer) => {
      if (onBeforeSetupMiddleware) {
        onBeforeSetupMiddleware(devServer);
      }

      return setupMiddlewares
        ? setupMiddlewares(middlewares, devServer)
        : middlewares;
    };
  }

  compatibleConfig.onListening = (devServer) => {
    devServer.close ??= (callback) => devServer.stopCallback(callback);

    if (onListening) {
      onListening(devServer);
    }
    if (onAfterSetupMiddleware) {
      onAfterSetupMiddleware(devServer);
    }
  };

  return compatibleConfig;
}

// Conditionally load health check modules only if enabled
let WebpackHealthPlugin;
let setupHealthEndpoints;
let healthPluginInstance;

if (config.enableHealthCheck) {
  WebpackHealthPlugin = require("./plugins/health-check/webpack-health-plugin");
  setupHealthEndpoints = require("./plugins/health-check/health-endpoints");
  healthPluginInstance = new WebpackHealthPlugin();
}

let webpackConfig = {
  eslint: {
    configure: {
      extends: ["plugin:react-hooks/recommended"],
      rules: {
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
      },
    },
  },
  jest: {
    configure: (jestConfig) => {
      jestConfig.moduleNameMapper = {
        ...jestConfig.moduleNameMapper,
        "\\.md$": "<rootDir>/src/__mocks__/mdMock.js",
        // Kept in lockstep with the webpack alias below — see
        // packages/gaia-contracts/README.md for why this is an alias
        // and not a real dependency yet.
        "^@gaia/contracts$": "<rootDir>/../packages/gaia-contracts/src/index.js",
        "^@gaia/contracts/(.*)$": "<rootDir>/../packages/gaia-contracts/src/$1",
      };
      return jestConfig;
    },
  },
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      // Phase 0 of docs/split-plan.md: contracts live in their own
      // package (packages/gaia-contracts) so they're importable as a
      // unit ahead of the eventual Gaia-Cloud repo split. Aliased
      // straight to source (no symlink) so CRA's ModuleScopePlugin
      // never sees a resolved path outside frontend/src.
      '@gaia/contracts': path.resolve(__dirname, '../packages/gaia-contracts/src'),
    },
    configure: (webpackConfig) => {

      // CRA's ModuleScopePlugin blocks any resolved path outside
      // frontend/src, even when webpack reached it via the alias above
      // rather than a relative import. Extend its allow-list with
      // packages/gaia-contracts rather than disabling the guard.
      const moduleScopePlugin = webpackConfig.resolve.plugins?.find(
        (plugin) => plugin.constructor && plugin.constructor.name === 'ModuleScopePlugin'
      );
      if (moduleScopePlugin && Array.isArray(moduleScopePlugin.appSrcs)) {
        moduleScopePlugin.appSrcs.push(path.resolve(__dirname, '../packages/gaia-contracts/src'));
      }

      // Allow .md files to be imported as raw text strings.
      // Gaia loads her SOUL document (docs/soul.md) as the system prompt.
      webpackConfig.module.rules.push({
        test: /\.md$/i,
        type: 'asset/source',
      });

      // Add ignored patterns to reduce watched directories
        webpackConfig.watchOptions = {
          ...webpackConfig.watchOptions,
          ignored: [
            '**/node_modules/**',
            '**/.git/**',
            '**/build/**',
            '**/dist/**',
            '**/coverage/**',
            '**/public/**',
        ],
      };

      // Add health check plugin to webpack if enabled
      if (config.enableHealthCheck && healthPluginInstance) {
        webpackConfig.plugins.push(healthPluginInstance);
      }
      return webpackConfig;
    },
  },
};

webpackConfig.devServer = (devServerConfig) => {
  // Hindsight and services/cognition send no CORS headers at all (an
  // OPTIONS preflight against Hindsight 405s), so the browser blocks any
  // direct cross-origin call to them. HindsightProvider defaults to
  // relative paths (/api/hindsight, /api/cognition) for exactly this
  // reason; this proxies those paths to the real Tailscale addresses in
  // dev, same as nginx.conf does in production. Reachability still
  // requires this machine to be on the tailnet.
  devServerConfig.proxy = [
    ...(devServerConfig.proxy || []),
    {
      context: ['/api/hindsight'],
      target: process.env.HINDSIGHT_PROXY_TARGET || 'http://100.64.144.93:8888',
      changeOrigin: true,
      pathRewrite: { '^/api/hindsight': '' },
    },
    {
      context: ['/api/cognition'],
      target: process.env.COGNITION_PROXY_TARGET || 'http://100.64.144.93:8890',
      changeOrigin: true,
      pathRewrite: { '^/api/cognition': '' },
    },
  ];

  // Add health check endpoints if enabled
  if (config.enableHealthCheck && setupHealthEndpoints && healthPluginInstance) {
    const originalSetupMiddlewares = devServerConfig.setupMiddlewares;

    devServerConfig.setupMiddlewares = (middlewares, devServer) => {
      // Call original setup if exists
      if (originalSetupMiddlewares) {
        middlewares = originalSetupMiddlewares(middlewares, devServer);
      }

      // Setup health endpoints
      setupHealthEndpoints(devServer, healthPluginInstance);

      return middlewares;
    };
  }

  return devServerConfig;
};

// Wrap with visual edits (automatically adds babel plugin, dev server, and overlay in dev mode)
if (isDevServer) {
  try {
    const { withVisualEdits } = require("@emergentbase/visual-edits/craco");
    webpackConfig = withVisualEdits(webpackConfig);
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND' && err.message.includes('@emergentbase/visual-edits/craco')) {
      console.warn(
        "[visual-edits] @emergentbase/visual-edits not installed — visual editing disabled."
      );
    } else {
      throw err;
    }
  }
}

const configureDevServer = webpackConfig.devServer;
webpackConfig.devServer = (devServerConfig) =>
  makeDevServerV5Compatible(configureDevServer(devServerConfig));

module.exports = webpackConfig;
