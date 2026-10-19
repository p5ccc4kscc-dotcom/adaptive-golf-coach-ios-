/** Two Jest projects:
 *  - unit: pure domain + data tests in Node (real SQLite via sql.js)
 *  - ui:   React Native component tests with the jest-expo iOS preset
 */
const moduleNameMapper = { '^@/(.*)$': '<rootDir>/src/$1' };

module.exports = {
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/unit/**/*.test.ts', '<rootDir>/tests/data/**/*.test.ts'],
      transform: { '^.+\\.[jt]sx?$': 'babel-jest' },
      moduleNameMapper,
    },
    {
      displayName: 'ui',
      preset: 'jest-expo/ios',
      testMatch: ['<rootDir>/tests/ui/**/*.test.tsx'],
      moduleNameMapper,
    },
  ],
};
