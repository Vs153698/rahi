'use strict';

// ESLint config for the Expo/React Native app (apps/mobile).
module.exports = {
  extends: [require.resolve('./base.js')],
  env: {
    browser: true,
    es2022: true,
  },
  rules: {
    // Mobile bundles ship to users — keep console out of release paths.
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
};
