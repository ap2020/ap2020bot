const ignorePatterns = [
    '/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/tmp/',
    '/coverage/',
    '<rootDir>/aws/',
  ];

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.[jt]sx?$',
  testPathIgnorePatterns: [
    ...ignorePatterns,
  ],
  collectCoverageFrom: [
    '**/*.{js,ts}',
    '!**/*.test.{js,ts}'
  ],
  coveragePathIgnorePatterns: [
    ...ignorePatterns,
    '<rootDir>/jest.config.js',
  ],
};