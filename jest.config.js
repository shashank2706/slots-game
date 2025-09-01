const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '\\.(png|jpg|jpeg|gif|webm|mp3|ogg|atlas)$': '<rootDir>/__tests__/stubs/fileStub.js',
    '^src/assets/.*\\.json$': '<rootDir>/__tests__/stubs/fileStub.js', // narrow JSON stub
  },
};