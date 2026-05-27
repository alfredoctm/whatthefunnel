/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jsdom',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '\\.css$': '<rootDir>/test/__mocks__/styleMock.cjs',
  },
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: './tsconfig.json',
      },
    ],
  },
  testMatch: ['<rootDir>/test/**/*.test.{ts,tsx}'],
  clearMocks: true,
  restoreMocks: true,
};
