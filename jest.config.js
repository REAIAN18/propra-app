/** @type {import('ts-jest').JestConfigWithTsJest} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Only look for test files in the dealscope tests dir
  roots: [
    '<rootDir>/src/lib/dealscope/__tests__',
    '<rootDir>/src/lib/dealscope/exports/__tests__',
  ],
  testMatch: ['**/*.test.ts'],
  // Don't walk into node_modules
  watchPathIgnorePatterns: ['<rootDir>/node_modules/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json',
      // Disable type-checking for speed
      diagnostics: false,
    }],
  },
  // Force exit after tests to avoid hanging
  forceExit: true,
};

module.exports = config;
