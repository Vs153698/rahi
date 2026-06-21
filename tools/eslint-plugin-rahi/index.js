'use strict';

// eslint-plugin-rahi — Rahi's local lint rules, exposed as the `rahi` plugin.
module.exports = {
  rules: {
    'no-direct-db-write-outside-repo': require('./rules/no-direct-db-write-outside-repo'),
  },
};
