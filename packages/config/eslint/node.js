'use strict';

// ESLint config for Node/NestJS code (apps/api, packages/*).
module.exports = {
  extends: [require.resolve('./base.js')],
  env: {
    node: true,
    es2022: true,
  },
};
