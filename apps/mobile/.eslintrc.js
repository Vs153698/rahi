'use strict';

module.exports = {
  root: true,
  extends: [require.resolve('@rahi/config/eslint/react-native')],
  parserOptions: {
    project: false,
  },
  ignorePatterns: ['.expo/', 'expo-env.d.ts'],
};
