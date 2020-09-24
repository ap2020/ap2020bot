const ignorePatterns = [
    '/node_modules/',
    '<rootDir>/.webpack/',
    '<rootDir>/.dynamodb/',
    '<rootDir>/.vscode/',
    '/coverage/',
    '<rootDir>/lib/envvar/test.ts',
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
        '<rootDir>/.env.js',
    ],
    setupFiles: [
        './test-utils/setup.ts',
    ],
    moduleNameMapper: {
        "^@/(.+)": "<rootDir>/$1"
    },
};
